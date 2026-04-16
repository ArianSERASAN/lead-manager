import { create } from 'zustand';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDoc,
  doc,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, FilterState, LeadStatus, LeadSource, LeadCollection, toJSDate } from '../types/domain';
import { ScoringWeights } from '../lib/scoring-engine';
import { daysSince } from '../utils/format';
import { useMemo, useState, useEffect } from 'react';
import { LEAD_COLLECTIONS, getLeadKey, normalizeLeadSnapshot } from '../lib/leads';

const PAGE_SIZE = 50;

export interface LeadFilters {
  searchQuery: string;
  statusFilter: string;
  sourceFilter: string;
  dateFilter: string;
  activeTab: 'all' | 'descargas' | 'contactos' | 'landing';
  tags: string[];
  assignedTo: string[];
  scoreMin: number;
  scoreMax: number;
  staleDays: number | null;
}

const DEFAULT_FILTERS: LeadFilters = {
  searchQuery: '',
  statusFilter: '',
  sourceFilter: '',
  dateFilter: '',
  activeTab: 'all',
  tags: [],
  assignedTo: [],
  scoreMin: 0,
  scoreMax: 100,
  staleDays: null,
};

const EMPTY_COLLECTION_STATE: Record<LeadCollection, Lead[]> = {
  leads: [],
  leads_descargas: [],
  solicitudes_contacto: [],
};

interface LeadStore {
  leads: Lead[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  filters: LeadFilters;

  _cursor: QueryDocumentSnapshot | null;
  _unsub: (() => void) | null;
  _scoringWeights: ScoringWeights | null;

  subscribe: () => () => void;
  loadMore: () => Promise<void>;
  setFilter: <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => void;
  clearFilters: () => void;
  applyFilterState: (filterState: FilterState) => void;
  getCurrentFilterState: () => FilterState;
}

function mergeCollectionLeads(leadsByCollection: Record<LeadCollection, Lead[]>): Lead[] {
  const merged = LEAD_COLLECTIONS
    .flatMap((name) => leadsByCollection[name])
    .sort((a, b) => toJSDate(b.createdAt).getTime() - toJSDate(a.createdAt).getTime());

  const seen = new Set<string>();
  return merged.filter((lead) => {
    const key = getLeadKey(lead);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [],
  loading: true,
  hasMore: false,
  loadingMore: false,
  filters: { ...DEFAULT_FILTERS },
  _cursor: null,
  _unsub: null,
  _scoringWeights: null,

  subscribe: () => {
    const existing = get()._unsub;
    if (existing) return existing;

    getDoc(doc(db, 'settings', 'scoring')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.weights) set({ _scoringWeights: data.weights as ScoringWeights });
      }
    }).catch(() => {});

    const leadsByCollection: Record<LeadCollection, Lead[]> = { ...EMPTY_COLLECTION_STATE };
    const hasMoreByCollection: Record<LeadCollection, boolean> = {
      leads: false,
      leads_descargas: false,
      solicitudes_contacto: false,
    };
    const pendingCollections = new Set<LeadCollection>(LEAD_COLLECTIONS);
    let initialLoad = true;

    const recomputeState = () => {
      set({
        leads: mergeCollectionLeads(leadsByCollection),
        hasMore: LEAD_COLLECTIONS.some((name) => hasMoreByCollection[name]),
      });
    };

    const unsubscribers = LEAD_COLLECTIONS.map((collectionName) => {
      const q = query(
        collection(db, collectionName),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const weights = get()._scoringWeights;
          leadsByCollection[collectionName] = snapshot.docs.map((d) => (
            normalizeLeadSnapshot(
              {
                id: d.id,
                data: () => d.data(),
              },
              collectionName,
              weights || undefined
            )
          ));
          hasMoreByCollection[collectionName] = snapshot.docs.length >= PAGE_SIZE;

          pendingCollections.delete(collectionName);
          recomputeState();

          if (initialLoad && pendingCollections.size === 0) {
            set({ loading: false });
            initialLoad = false;
          }
        },
        (err) => {
          console.error(`[LeadStore] Subscription error (${collectionName}):`, err);
          pendingCollections.delete(collectionName);
          if (initialLoad && pendingCollections.size === 0) {
            set({ loading: false });
            initialLoad = false;
          }
        }
      );
    });

    const unsub = () => {
      unsubscribers.forEach((fn) => fn());
    };

    set({ _unsub: unsub });
    return unsub;
  },

  // Store pagination is currently handled by useLeads (list page).
  // Dashboard/Kanban/Historial consume the live subscribed store snapshot.
  loadMore: async () => {
    return;
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  clearFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  applyFilterState: (filterState: FilterState) => {
    set((state) => {
      const f = { ...state.filters };
      if (filterState.search !== undefined) f.searchQuery = filterState.search;
      if (filterState.status) f.statusFilter = filterState.status[0] || '';
      if (filterState.source) f.sourceFilter = filterState.source[0] || '';
      if (filterState.tags) f.tags = filterState.tags;
      if (filterState.assignedTo) f.assignedTo = filterState.assignedTo;
      if (filterState.scoreMin !== undefined) f.scoreMin = filterState.scoreMin;
      if (filterState.scoreMax !== undefined) f.scoreMax = filterState.scoreMax;
      if (filterState.staleDays !== undefined) f.staleDays = filterState.staleDays;
      return { filters: f };
    });
  },

  getCurrentFilterState: (): FilterState => {
    const f = get().filters;
    return {
      search: f.searchQuery,
      status: f.statusFilter ? [f.statusFilter as LeadStatus] : undefined,
      source: f.sourceFilter ? [f.sourceFilter as LeadSource] : undefined,
      tags: f.tags.length > 0 ? f.tags : undefined,
      assignedTo: f.assignedTo.length > 0 ? f.assignedTo : undefined,
      scoreMin: f.scoreMin > 0 ? f.scoreMin : undefined,
      scoreMax: f.scoreMax < 100 ? f.scoreMax : undefined,
      staleDays: f.staleDays !== null ? f.staleDays : undefined,
    };
  },
}));

export function applyFilters(leads: Lead[], filters: LeadFilters, debouncedSearch: string): Lead[] {
  const searchIndex = new Map(
    leads.map((lead) => [
      getLeadKey(lead),
      [lead.name, lead.email, lead.phone || '', lead.company || '', lead.message || '', lead.notes || '', lead.resource || '']
        .join(' ')
        .toLowerCase(),
    ])
  );

  return leads.filter((lead) => {
    if (lead.status === 'cancelado') return false;

    if (filters.activeTab === 'descargas' && lead.source !== 'web-download') return false;
    if (filters.activeTab === 'contactos' && lead.source !== 'web-contact') return false;
    if (filters.activeTab === 'landing' && lead.source !== 'landing') return false;

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const indexed = searchIndex.get(getLeadKey(lead)) || '';
      if (!indexed.includes(searchLower)) return false;
    }

    if (filters.statusFilter && lead.status !== filters.statusFilter) return false;
    if (filters.activeTab === 'all' && filters.sourceFilter && lead.source !== filters.sourceFilter) return false;

    if (filters.dateFilter) {
      const leadDate = toJSDate(lead.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filters.dateFilter === 'today') {
        if (leadDate < today) return false;
      } else if (filters.dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (leadDate < yesterday || leadDate >= today) return false;
      } else if (filters.dateFilter === 'week') {
        const aWeekAgo = new Date(today);
        aWeekAgo.setDate(aWeekAgo.getDate() - 7);
        if (leadDate < aWeekAgo) return false;
      } else if (filters.dateFilter === 'month') {
        const aMonthAgo = new Date(today);
        aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);
        if (leadDate < aMonthAgo) return false;
      }
    }

    if (filters.tags.length > 0) {
      if (!filters.tags.some((tag) => lead.tags?.includes(tag))) return false;
    }

    if (filters.assignedTo.length > 0) {
      if (filters.assignedTo.includes('unassigned')) {
        const specificUsers = filters.assignedTo.filter((id) => id !== 'unassigned');
        if (specificUsers.length > 0 && !specificUsers.includes(lead.assignedTo || '')) {
          if (lead.assignedTo) return false;
        }
      } else if (!filters.assignedTo.includes(lead.assignedTo || '')) {
        return false;
      }
    }

    if (lead.score < filters.scoreMin || lead.score > filters.scoreMax) return false;

    if (filters.staleDays !== null) {
      const days = daysSince(lead.updatedAt || lead.createdAt);
      if (days < filters.staleDays) return false;
    }

    return true;
  });
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function useFilteredLeads(): Lead[] {
  const leads = useLeadStore((s) => s.leads);
  const filters = useLeadStore((s) => s.filters);
  const debouncedSearch = useDebouncedValue(filters.searchQuery, 200);

  return useMemo(() => applyFilters(leads, filters, debouncedSearch), [leads, filters, debouncedSearch]);
}

export function useActiveFilterCount(): number {
  const f = useLeadStore((s) => s.filters);
  return useMemo(() => {
    let count = 0;
    if (f.searchQuery) count++;
    if (f.statusFilter) count++;
    if (f.sourceFilter) count++;
    if (f.dateFilter) count++;
    if (f.tags.length > 0) count++;
    if (f.assignedTo.length > 0) count++;
    if (f.scoreMin > 0 || f.scoreMax < 100) count++;
    if (f.staleDays !== null) count++;
    return count;
  }, [f]);
}

export function useLeadSubscription(): void {
  useEffect(() => {
    const unsub = useLeadStore.getState().subscribe();
    return () => {
      unsub();
      useLeadStore.setState({ _unsub: null });
    };
  }, []);
}
