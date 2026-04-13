import { create } from 'zustand';
import { collection, getDoc, onSnapshot, doc } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { Lead, FilterState, LeadStatus, LeadSource } from '../types/domain';
import {
  LEAD_COLLECTIONS,
  getLeadKey,
  normalizeLeadSnapshot,
  sortLeadsByCreatedAtDesc,
  withComputedLeadFields,
} from '../lib/leads';
import { ScoringWeights } from '../lib/scoring-engine';
import { daysSince } from '../utils/format';
import { countFilledFields } from '../lib/scoring-engine';
import { toJSDate } from '../types/domain';

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
  filledFieldsMin: number;
}

export const DEFAULT_FILTERS: LeadFilters = {
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
  filledFieldsMin: 0,
};

interface LeadStore {
  leads: Lead[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  filters: LeadFilters;
  _unsub: (() => void) | null;
  _scoringWeights: ScoringWeights | null;
  subscribe: () => () => void;
  loadMore: () => Promise<void>;
  setFilter: <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => void;
  clearFilters: () => void;
  applyFilterState: (filterState: FilterState) => void;
  getCurrentFilterState: () => FilterState;
}

export function applyFilters(
  leads: Lead[],
  filters: LeadFilters,
  debouncedSearch: string,
  pendingDeleteLeadKeys: string[] = []
): Lead[] {
  const pendingDeleteSet = new Set(pendingDeleteLeadKeys);
  const searchIndex = new Map(
    leads.map((lead) => [
      getLeadKey(lead),
      [
        lead.name,
        lead.email,
        lead.phone || '',
        lead.company || '',
        lead.message || '',
        lead.notes || '',
        lead.resource || '',
      ].join(' ').toLowerCase(),
    ])
  );

  return leads.filter((lead) => {
    if (pendingDeleteSet.has(lead.id) || pendingDeleteSet.has(getLeadKey(lead))) return false;
    if (lead.status === 'cancelado') return false;

    if (filters.activeTab === 'descargas' && lead.source !== 'web-download') return false;
    if (filters.activeTab === 'contactos' && lead.source !== 'web-contact') return false;
    if (filters.activeTab === 'landing' && lead.source !== 'landing') return false;

    if (debouncedSearch) {
      const indexed = searchIndex.get(getLeadKey(lead)) || '';
      if (!indexed.includes(debouncedSearch.toLowerCase())) return false;
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
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (leadDate < weekAgo) return false;
      } else if (filters.dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (leadDate < monthAgo) return false;
      }
    }

    if (filters.tags.length > 0 && !filters.tags.some((tag) => lead.tags?.includes(tag))) return false;

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

    if (filters.filledFieldsMin > 0 && countFilledFields(lead) < filters.filledFieldsMin) return false;

    return true;
  });
}

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [],
  loading: true,
  hasMore: false,
  loadingMore: false,
  filters: { ...DEFAULT_FILTERS },
  _unsub: null,
  _scoringWeights: null,

  subscribe: () => {
    const existing = get()._unsub;
    if (existing) return existing;

    set({ loading: true, hasMore: false });

    const leadsByCollection = new Map<typeof LEAD_COLLECTIONS[number], Lead[]>();
    const initializedCollections = new Set<typeof LEAD_COLLECTIONS[number]>();

    const publishMergedLeads = () => {
      const mergedLeads = sortLeadsByCreatedAtDesc(
        LEAD_COLLECTIONS.flatMap((collectionName) => leadsByCollection.get(collectionName) || [])
      );

      set({
        leads: mergedLeads,
        loading: initializedCollections.size < LEAD_COLLECTIONS.length,
        hasMore: false,
      });
    };

    getDoc(doc(db, 'settings', 'scoring'))
      .then((snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        if (!data.weights) return;

        const weights = data.weights as ScoringWeights;
        set((state) => ({
          _scoringWeights: weights,
          leads: sortLeadsByCreatedAtDesc(state.leads.map((lead) => withComputedLeadFields(lead, weights))),
        }));
      })
      .catch(() => {});

    const unsubs = LEAD_COLLECTIONS.map((collectionName) =>
      onSnapshot(
        collection(db, collectionName),
        (snapshot) => {
          const weights = get()._scoringWeights;
          leadsByCollection.set(
            collectionName,
            snapshot.docs.map((leadSnapshot) => normalizeLeadSnapshot(leadSnapshot, collectionName, weights))
          );
          initializedCollections.add(collectionName);
          publishMergedLeads();
        },
        (error) => {
          console.error(`[LeadStore] Subscription error for ${collectionName}:`, error);
          leadsByCollection.set(collectionName, []);
          initializedCollections.add(collectionName);
          publishMergedLeads();
        }
      )
    );

    const unsubscribe = () => {
      for (const stop of unsubs) stop();
    };

    set({ _unsub: unsubscribe });
    return unsubscribe;
  },

  loadMore: async () => {},

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
      const filters = { ...state.filters };
      if (filterState.search !== undefined) filters.searchQuery = filterState.search;
      if (filterState.status) filters.statusFilter = filterState.status[0] || '';
      if (filterState.source) filters.sourceFilter = filterState.source[0] || '';
      if (filterState.tags) filters.tags = filterState.tags;
      if (filterState.assignedTo) filters.assignedTo = filterState.assignedTo;
      if (filterState.scoreMin !== undefined) filters.scoreMin = filterState.scoreMin;
      if (filterState.scoreMax !== undefined) filters.scoreMax = filterState.scoreMax;
      if (filterState.staleDays !== undefined) filters.staleDays = filterState.staleDays;
      return { filters };
    });
  },

  getCurrentFilterState: (): FilterState => {
    const filters = get().filters;
    return {
      search: filters.searchQuery,
      status: filters.statusFilter ? [filters.statusFilter as LeadStatus] : undefined,
      source: filters.sourceFilter ? [filters.sourceFilter as LeadSource] : undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      assignedTo: filters.assignedTo.length > 0 ? filters.assignedTo : undefined,
      scoreMin: filters.scoreMin > 0 ? filters.scoreMin : undefined,
      scoreMax: filters.scoreMax < 100 ? filters.scoreMax : undefined,
      staleDays: filters.staleDays !== null ? filters.staleDays : undefined,
    };
  },
}));

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useFilteredLeads(): Lead[] {
  const leads = useLeadStore((state) => state.leads);
  const filters = useLeadStore((state) => state.filters);
  const debouncedSearch = useDebouncedValue(filters.searchQuery, 200);

  return useMemo(() => applyFilters(leads, filters, debouncedSearch), [leads, filters, debouncedSearch]);
}

export function useActiveFilterCount(): number {
  const filters = useLeadStore((state) => state.filters);

  return useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.statusFilter) count++;
    if (filters.sourceFilter) count++;
    if (filters.dateFilter) count++;
    if (filters.tags.length > 0) count++;
    if (filters.assignedTo.length > 0) count++;
    if (filters.scoreMin > 0 || filters.scoreMax < 100) count++;
    if (filters.staleDays !== null) count++;
    if (filters.filledFieldsMin > 0) count++;
    return count;
  }, [filters]);
}

export function useLeadSubscription(enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      useLeadStore.getState()._unsub?.();
      useLeadStore.setState({ _unsub: null, leads: [], loading: false, hasMore: false });
      return;
    }

    const unsubscribe = useLeadStore.getState().subscribe();
    return () => {
      unsubscribe();
      useLeadStore.setState({ _unsub: null });
    };
  }, [enabled]);
}
