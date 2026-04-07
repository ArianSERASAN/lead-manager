import { useState, useEffect, useCallback } from 'react';
import { SavedFilter, FilterState } from '../../types/domain';
import {
  subscribeSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
  migrateFromLocalStorage,
} from '../../services/SavedFilterService';

export function useSavedFilters(userId?: string) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  useEffect(() => {
    if (!userId) return;

    // One-time migration from localStorage → Firestore
    migrateFromLocalStorage(userId);

    // Real-time subscription to user's saved filters in Firestore
    const unsub = subscribeSavedFilters(userId, setSavedFilters);
    return unsub;
  }, [userId]);

  const saveFilter = useCallback(
    async (name: string, filters: FilterState) => {
      if (!userId) return;
      await createSavedFilter(userId, name, filters);
    },
    [userId]
  );

  const deleteFilter = useCallback(
    async (id: string) => {
      if (!userId) return;
      await deleteSavedFilter(userId, id);
    },
    [userId]
  );

  const loadFilter = useCallback(
    (id: string): FilterState | null => {
      const filter = savedFilters.find((f) => f.id === id);
      return filter?.filters || null;
    },
    [savedFilters]
  );

  return { savedFilters, saveFilter, deleteFilter, loadFilter };
}
