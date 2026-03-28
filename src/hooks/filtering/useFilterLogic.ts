import { useState, useMemo, useEffect } from 'react';
import { Lead, FilterState, LeadStatus, LeadSource, toJSDate } from '../../types/domain';
import { daysSince } from '../../utils/format';

// Debounce hook for search
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function useFilterLogic(leads: Lead[], pendingDeleteIds: string[] = []) {
  const [activeTab, setActiveTab] = useState<'all' | 'descargas' | 'contactos' | 'landing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [scoreMin, setScoreMin] = useState(0);
  const [scoreMax, setScoreMax] = useState(100);
  const [staleDays, setStaleDays] = useState<number | null>(null);

  // Debounce search query to avoid filtering on every keystroke
  const debouncedSearch = useDebouncedValue(searchQuery, 200);

  // Pre-compute searchable text for each lead
  const searchIndex = useMemo(() => {
    return new Map(leads.map(lead => [
      lead.id,
      [
        lead.name,
        lead.email,
        lead.phone || '',
        lead.company || '',
        lead.message || '',
        lead.notes || '',
        lead.resource || '',
      ].join(' ').toLowerCase()
    ]));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Hide if marked for deletion
      if (pendingDeleteIds.includes(lead.id)) return false;

      // Tab filter
      if (activeTab === 'descargas' && lead.source !== 'web-download') return false;
      if (activeTab === 'contactos' && lead.source !== 'web-contact') return false;
      if (activeTab === 'landing' && lead.source !== 'landing') return false;

      // Search query using pre-computed index
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const indexed = searchIndex.get(lead.id) || '';
        if (!indexed.includes(searchLower)) return false;
      }

      // Status filter
      if (statusFilter && lead.status !== statusFilter) return false;

      // Source filter
      if (activeTab === 'all' && sourceFilter && lead.source !== sourceFilter) return false;

      // Date filter
      if (dateFilter) {
        const leadDate = toJSDate(lead.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          if (leadDate < today) return false;
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (leadDate < yesterday || leadDate >= today) return false;
        } else if (dateFilter === 'week') {
          const aWeekAgo = new Date(today);
          aWeekAgo.setDate(aWeekAgo.getDate() - 7);
          if (leadDate < aWeekAgo) return false;
        } else if (dateFilter === 'month') {
          const aMonthAgo = new Date(today);
          aMonthAgo.setMonth(aMonthAgo.getMonth() - 1);
          if (leadDate < aMonthAgo) return false;
        }
      }

      // Tags filter (match any selected tag)
      if (tags.length > 0) {
        const hasAnyTag = tags.some(tag => lead.tags?.includes(tag));
        if (!hasAnyTag) return false;
      }

      // Assigned to filter
      if (assignedTo.length > 0) {
        if (assignedTo.includes('unassigned')) {
          const hasAssignment = assignedTo.filter(id => id !== 'unassigned').length > 0;
          if (hasAssignment && !assignedTo.filter(id => id !== 'unassigned').includes(lead.assignedTo || '')) {
            if (lead.assignedTo) return false;
          }
        } else if (!assignedTo.includes(lead.assignedTo || '')) {
          return false;
        }
      }

      // Score range filter
      if (lead.score < scoreMin || lead.score > scoreMax) return false;

      // Stale days filter
      if (staleDays !== null) {
        const days = daysSince(lead.updatedAt || lead.createdAt);
        if (days < staleDays) return false;
      }

      return true;
    });
  }, [leads, activeTab, debouncedSearch, statusFilter, sourceFilter, dateFilter, tags, assignedTo, scoreMin, scoreMax, staleDays, pendingDeleteIds, searchIndex]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilter) count++;
    if (sourceFilter) count++;
    if (dateFilter) count++;
    if (tags.length > 0) count++;
    if (assignedTo.length > 0) count++;
    if (scoreMin > 0 || scoreMax < 100) count++;
    if (staleDays !== null) count++;
    return count;
  }, [searchQuery, statusFilter, sourceFilter, dateFilter, tags, assignedTo, scoreMin, scoreMax, staleDays]);

  // Apply filter state from saved filters
  const applyFilterState = (filterState: FilterState) => {
    if (filterState.search !== undefined) setSearchQuery(filterState.search);
    if (filterState.status) setStatusFilter(filterState.status[0] || '');
    if (filterState.source) setSourceFilter(filterState.source[0] || '');
    if (filterState.tags) setTags(filterState.tags);
    if (filterState.assignedTo) setAssignedTo(filterState.assignedTo);
    if (filterState.scoreMin !== undefined) setScoreMin(filterState.scoreMin);
    if (filterState.scoreMax !== undefined) setScoreMax(filterState.scoreMax);
    if (filterState.staleDays !== undefined) setStaleDays(filterState.staleDays);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setSourceFilter('');
    setDateFilter('');
    setTags([]);
    setAssignedTo([]);
    setScoreMin(0);
    setScoreMax(100);
    setStaleDays(null);
  };

  return {
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    sourceFilter, setSourceFilter,
    dateFilter, setDateFilter,
    tags, setTags,
    assignedTo, setAssignedTo,
    scoreMin, setScoreMin,
    scoreMax, setScoreMax,
    staleDays, setStaleDays,
    filteredLeads,
    activeFilterCount,
    applyFilterState,
    clearAllFilters,
    getCurrentFilterState: (): FilterState => ({
      search: searchQuery,
      status: statusFilter ? [statusFilter as LeadStatus] : undefined,
      source: sourceFilter ? [sourceFilter as LeadSource] : undefined,
      tags: tags.length > 0 ? tags : undefined,
      assignedTo: assignedTo.length > 0 ? assignedTo : undefined,
      scoreMin: scoreMin > 0 ? scoreMin : undefined,
      scoreMax: scoreMax < 100 ? scoreMax : undefined,
      staleDays: staleDays !== null ? staleDays : undefined
    })
  };
}
