import { useState, useEffect } from 'react';
import { SavedFilter, FilterState } from '../../types/domain';

const STORAGE_KEY = 'serasan_saved_filters';

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored));
      } catch (err) {
        console.error('Error loading saved filters:', err);
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
