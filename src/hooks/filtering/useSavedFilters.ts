import { useState, useEffect } from 'react';
import { SavedFilter, FilterState } from '../../types/domain';

const STORAGE_KEY = 'serasan_saved_filters';

function isValidFilterState(f: unknown): f is FilterState {
  if (!f || typeof f !== 'object') return false;
  return true;
}

function isValidSavedFilter(item: unknown): item is SavedFilter {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.createdBy === 'string' &&
    isValidFilterState(obj.filters)
  );
}

function validateSavedFilters(data: unknown): SavedFilter[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isValidSavedFilter);
}

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const validated = validateSavedFilters(parsed);
        setSavedFilters(validated);

        // If validation stripped some items, update storage
        if (validated.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
        }
      } catch (err) {
        console.error('Error loading saved filters:', err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const saveFilter = (name: string, filters: FilterState, userId: string) => {
    const newFilter: SavedFilter = {
      id: `filter_${Date.now()}`,
      name,
      createdBy: userId,
      createdAt: new Date(),
      filters
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newFilter;
  };

  const deleteFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const loadFilter = (id: string): FilterState | null => {
    const filter = savedFilters.find(f => f.id === id);
    return filter?.filters || null;
  };

  return { savedFilters, saveFilter, deleteFilter, loadFilter };
}
