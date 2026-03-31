import { create } from 'zustand';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Lead, FilterState, LeadStatus, LeadSource, toJSDate } from '../types/domain';
import { calculateLeadScore, isLeadStale, ScoringWeights } from '../lib/scoring-engine';
import { daysSince } from '../utils/format';
import { useMemo, useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;
const COLLECTION_NAME = 'leads';

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface LeadStore {
  // Data
  leads: Lead[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;

  // Filters
  filters: LeadFilters;

  // Internal (not for direct use by components)
  _cursor: QueryDocumentSnapshot | null;
  _unsub: (() => void) | null;
  _scoringWeights: ScoringWeights | null;

  // Actions
  subscribe: () => () => void;
  loadMore: () => Promise<void>;
  setFilter: <K extends keyof LeadFilters>(key: K, value: LeadFilters[K]) => void;
  clearFilters: () => void;
  applyFilterState: (filterState: FilterState) => void;
  getCurrentFilterState: () => FilterState;
}

// ---------------------------------------------------------------------------
// Map Firestore doc → Lead (ported from useLeads.ts)
// ---------------------------------------------------------------------------

function mapDocToLead(doc: QueryDocumentSnapshot, weights?: ScoringWeights | null): Lead {
  const data = doc.data();

  const lead: Lead = {
    id: doc.id,
    name: data.name || data.nombre || '—',
    email: data.email || '—',
    phone: data.phone || data.telefono || '',
    company: data.company || data.empresa || '',
    source: data.source || 'landing',
    status: data.status || 'nuevo',
    createdAt: data.createdAt || data.fecha || new Date(),
    updatedAt: data.updatedAt || data.createdAt || new Date(),
    notes: data.notes || data.notas || '',
    tags: data.tags || [],
    score: 0,
    resource: data.recurso || data.resource || '',
    message: data.mensaje || data.message || '',
    apellidos: data.apellidos || '',
    sector: data.sector || '',
    cargo: data.cargo || '',
    servicios: data.servicios || [],
    tipoInmueble: data.tipoInmueble || data.tipo_inmueble || data.buildingType || '',
    superficie:
      data.superficie !== undefined
        ? String(data.superficie)
        : data.surface !== undefined
          ? String(data.surface)
          : '',
    referenciaCatastral: data.referenciaCatastral || data.referencia_catastral || data.catastro || '',
    localidad: data.localidad || data.locality || '',
    direccion: data.direccion || data['dirección'] || data.address || '',
    customFields: data.customFields || {},
    data: data,
    _collection: COLLECTION_NAME,
    enrichment: data.enrichment,
    enrichedAt: data.enrichedAt,
    assignedTo: data.assignedTo,
    assignedAt: data.assignedAt,
    movedToStatusAt: data.movedToStatusAt,
    cancellationReason: data.cancellationReason,
    closedAt: data.closedAt,
    closedBy: data.closedBy,
    closedByName: data.closedByName,
    stateHistory: data.stateHistory,
    attachments: data.attachments || [],
  };

  const { score, breakdown } = calculateLeadScore(lead, weights || undefined);
  lead.score = score;
  lead.scoreBreakdown = breakdown;
  lead.isStale = isLeadStale(lead);

  return lead;
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

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
    // If already subscribed, return existing unsub
    const existing = get()._unsub;
    if (existing) return existing;

    // Fetch scoring config (non-blocking)
    getDoc(doc(db, 'settings', 'scoring')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.weights) set({ _scoringWeights: data.weights as ScoringWeights });
      }
    }).catch(() => {});

    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    let initialLoad = true;

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const weights = get()._scoringWeights;
        const mapped = snapshot.docs.map((d) => mapDocToLead(d, weights));
        const newCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        set({
          leads: mapped,
          hasMore: snapshot.docs.length >= PAGE_SIZE,
          _cursor: newCursor,
          ...(initialLoad ? { loading: false } : {}),
        });

        initialLoad = false;
      },
      (err) => {
        console.error('[LeadStore] Subscription error:', err);
        set({ loading: false });
      }
    );

    set({ _unsub: unsub });
    return unsub;
  },

  loadMore: async () => {
    const { loadingMore, hasMore, _cursor } = get();
    if (loadingMore || !hasMore || !_cursor) return;

    set({ loadingMore: true });

    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        startAfter(_cursor),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const weights = get()._scoringWeights;
      const newLeads = snapshot.docs.map((d) => mapDocToLead(d, weights));

      if (newLeads.length > 0) {
        set((state) => {
          const existingIds = new Set(state.leads.map((l) => l.id));
          const unique = newLeads.filter((l) => !existingIds.has(l.id));
          return {
            leads: [...state.leads, ...unique],
            _cursor: snapshot.docs[snapshot.docs.length - 1],
          };
        });
      }

      set({ hasMore: snapshot.docs.length >= PAGE_SIZE });
    } catch (err) {
      console.error('[LeadStore] Error loading more:', err);
    } finally {
      set({ loadingMore: false });
    }
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

// ---------------------------------------------------------------------------
// Pure filter function (ported from useFilterLogic.ts)
// ---------------------------------------------------------------------------

function applyFilters(leads: Lead[], filters: LeadFilters, debouncedSearch: string): Lead[] {
  // Pre-compute searchable text
  const searchIndex = new Map(
    leads.map((lead) => [
      lead.id,
      [lead.name, lead.email, lead.phone || '', lead.company || '', lead.message || '', lead.notes || '', lead.resource || '']
        .join(' ')
        .toLowerCase(),
    ])
  );

  return leads.filter((lead) => {
    // Exclude cancelled leads from main view (they go to history)
    if (lead.status === 'cancelado') return false;

    // Tab filter
    if (filters.activeTab === 'descargas' && lead.source !== 'web-download') return false;
    if (filters.activeTab === 'contactos' && lead.source !== 'web-contact') return false;
    if (filters.activeTab === 'landing' && lead.source !== 'landing') return false;

    // Search using pre-computed index
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const indexed = searchIndex.get(lead.id) || '';
      if (!indexed.includes(searchLower)) return false;
    }

    // Status filter
    if (filters.statusFilter && lead.status !== filters.statusFilter) return false;

    // Source filter
    if (filters.activeTab === 'all' && filters.sourceFilter && lead.source !== filters.sourceFilter) return false;

    // Date filter
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

    // Tags filter (match any)
    if (filters.tags.length > 0) {
      if (!filters.tags.some((tag) => lead.tags?.includes(tag))) return false;
    }

    // Assigned to filter
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

    // Score range
    if (lead.score < filters.scoreMin || lead.score > filters.scoreMax) return false;

    // Stale days
    if (filters.staleDays !== null) {
      const days = daysSince(lead.updatedAt || lead.createdAt);
      if (days < filters.staleDays) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Derived hooks (used by components)
// ---------------------------------------------------------------------------

/** Debounce helper hook */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/** Returns filtered leads based on current store filters. */
export function useFilteredLeads(): Lead[] {
  const leads = useLeadStore((s) => s.leads);
  const filters = useLeadStore((s) => s.filters);
  const debouncedSearch = useDebouncedValue(filters.searchQuery, 200);

  return useMemo(() => applyFilters(leads, filters, debouncedSearch), [leads, filters, debouncedSearch]);
}

/** Returns the count of active filters. */
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

/**
 * Bootstraps the Zustand lead store's Firestore subscription.
 * Must be called once from a top-level authenticated component (e.g. AppContent).
 * Cleans up the subscription on unmount.
 */
export function useLeadSubscription(): void {
  useEffect(() => {
    const unsub = useLeadStore.getState().subscribe();
    return () => {
      unsub();
      // Clear _unsub so that a subsequent subscribe() call (e.g. React StrictMode
      // double-invokes effects in dev) creates a fresh Firestore subscription
      // instead of returning the now-dead unsub and leaving loading=true forever.
      useLeadStore.setState({ _unsub: null });
    };
  }, []);
}
