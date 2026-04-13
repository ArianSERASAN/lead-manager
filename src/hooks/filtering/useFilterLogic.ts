import { useState, useMemo, useEffect } from 'react';
import { FilterState, Lead, LeadSource, LeadStatus } from '../../types/domain';
import { applyFilters, LeadFilters } from '../../stores/useLeadStore';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export function useFilterLogic(leads: Lead[], pendingDeleteLeadKeys: string[] = []) {
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
  const [filledFieldsMin, setFilledFieldsMin] = useState(0);

  const debouncedSearch = useDebouncedValue(searchQuery, 200);

  const filteredLeads = useMemo(() => {
    const filters: LeadFilters = {
      searchQuery,
      statusFilter,
      sourceFilter,
      dateFilter,
      activeTab,
      tags,
      assignedTo,
      scoreMin,
      scoreMax,
      staleDays,
      filledFieldsMin,
    };

    return applyFilters(leads, filters, debouncedSearch, pendingDeleteLeadKeys);
  }, [
    activeTab,
    assignedTo,
    dateFilter,
    debouncedSearch,
    filledFieldsMin,
    leads,
    pendingDeleteLeadKeys,
    scoreMax,
    scoreMin,
    searchQuery,
    sourceFilter,
    staleDays,
    statusFilter,
    tags,
  ]);

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
    if (filledFieldsMin > 0) count++;
    return count;
  }, [assignedTo, dateFilter, filledFieldsMin, scoreMax, scoreMin, searchQuery, sourceFilter, staleDays, statusFilter, tags]);

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
    setFilledFieldsMin(0);
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
    filledFieldsMin, setFilledFieldsMin,
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
      staleDays: staleDays !== null ? staleDays : undefined,
    }),
  };
}
