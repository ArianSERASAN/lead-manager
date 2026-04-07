import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FilterState, SavedFilter } from '../types/domain';

const STORAGE_KEY = 'serasan_saved_filters';
const MIGRATED_KEY = 'serasan_filters_migrated';

function userFiltersCollection(userId: string) {
  return collection(db, 'users', userId, 'saved_filters');
}

/**
 * Subscribe to saved filters for a user. Returns unsubscribe function.
 */
export function subscribeSavedFilters(
  userId: string,
  callback: (filters: SavedFilter[]) => void
): () => void {
  const q = query(userFiltersCollection(userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const filters: SavedFilter[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as SavedFilter[];
      callback(filters);
    },
    (err) => {
      console.error('Error al suscribir filtros guardados:', err);
    }
  );
}

/**
 * Create a new saved filter for a user.
 */
export async function createSavedFilter(
  userId: string,
  name: string,
  filters: FilterState
): Promise<string> {
  const docRef = await addDoc(userFiltersCollection(userId), {
    name,
    createdBy: userId,
    createdAt: serverTimestamp(),
    filters,
  });
  return docRef.id;
}

/**
 * Delete a saved filter.
 */
export async function deleteSavedFilter(
  userId: string,
  filterId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'saved_filters', filterId));
}

/**
 * Migrate saved filters from localStorage to Firestore (one-time).
 * Idempotent: checks a flag in localStorage first.
 */
export async function migrateFromLocalStorage(userId: string): Promise<void> {
  if (localStorage.getItem(MIGRATED_KEY)) return;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(MIGRATED_KEY, '1');
    return;
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(MIGRATED_KEY, '1');
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const batch = writeBatch(db);
    for (const filter of parsed) {
      if (!filter.name || !filter.filters) continue;
      const ref = doc(userFiltersCollection(userId));
      batch.set(ref, {
        name: filter.name,
        createdBy: userId,
        createdAt: serverTimestamp(),
        filters: filter.filters,
      });
    }
    await batch.commit();

    localStorage.setItem(MIGRATED_KEY, '1');
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error al migrar filtros a Firestore:', err);
    // Don't set migrated flag — retry next time
  }
}
