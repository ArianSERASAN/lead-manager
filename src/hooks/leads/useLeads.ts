import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead, LeadCollection, toJSDate } from '../../types/domain';
import { LEAD_COLLECTIONS, getLeadKey, normalizeLeadSnapshot } from '../../lib/leads';

const PAGE_SIZE = 50;

const EMPTY_COLLECTION_STATE: Record<LeadCollection, Lead[]> = {
  leads: [],
  leads_descargas: [],
  solicitudes_contacto: [],
};

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

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const cursorsRef = useRef<Record<LeadCollection, QueryDocumentSnapshot | null>>({
    leads: null,
    leads_descargas: null,
    solicitudes_contacto: null,
  });
  const hasMoreByCollectionRef = useRef<Record<LeadCollection, boolean>>({
    leads: false,
    leads_descargas: false,
    solicitudes_contacto: false,
  });
  const leadsByCollectionRef = useRef<Record<LeadCollection, Lead[]>>({ ...EMPTY_COLLECTION_STATE });
  const initialLoad = useRef(true);

  useEffect(() => {
    const pendingCollections = new Set<LeadCollection>(LEAD_COLLECTIONS);

    const recomputeState = () => {
      setLeads(mergeCollectionLeads(leadsByCollectionRef.current));
      setHasMore(LEAD_COLLECTIONS.some((name) => hasMoreByCollectionRef.current[name]));
    };

    const unsubscribers = LEAD_COLLECTIONS.map((collectionName) => {
      const q = query(
        collection(db, collectionName),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      return onSnapshot(q, (snapshot) => {
        leadsByCollectionRef.current[collectionName] = snapshot.docs.map((doc) => (
          normalizeLeadSnapshot(
            { id: doc.id, data: () => doc.data() },
            collectionName
          )
        ));
        cursorsRef.current[collectionName] = snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1]
          : null;
        hasMoreByCollectionRef.current[collectionName] = snapshot.docs.length >= PAGE_SIZE;

        pendingCollections.delete(collectionName);
        recomputeState();

        if (initialLoad.current && pendingCollections.size === 0) {
          setLoading(false);
          initialLoad.current = false;
        }
      }, (err) => {
        console.error(`[useLeads] Error (${collectionName}):`, err);
        pendingCollections.delete(collectionName);
        if (initialLoad.current && pendingCollections.size === 0) {
          setLoading(false);
          initialLoad.current = false;
        }
      });
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      await Promise.all(LEAD_COLLECTIONS.map(async (collectionName) => {
        const cursor = cursorsRef.current[collectionName];
        const collectionHasMore = hasMoreByCollectionRef.current[collectionName];
        if (!cursor || !collectionHasMore) return;

        const q = query(
          collection(db, collectionName),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(PAGE_SIZE)
        );

        const snapshot = await getDocs(q);
        const nextPage = snapshot.docs.map((doc) => (
          normalizeLeadSnapshot(
            { id: doc.id, data: () => doc.data() },
            collectionName
          )
        ));

        const existing = leadsByCollectionRef.current[collectionName];
        const seen = new Set(existing.map((lead) => getLeadKey(lead)));
        const uniqueNext = nextPage.filter((lead) => !seen.has(getLeadKey(lead)));
        leadsByCollectionRef.current[collectionName] = [...existing, ...uniqueNext];

        cursorsRef.current[collectionName] = snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1]
          : null;
        hasMoreByCollectionRef.current[collectionName] = snapshot.docs.length >= PAGE_SIZE;
      }));

      setLeads(mergeCollectionLeads(leadsByCollectionRef.current));
      setHasMore(LEAD_COLLECTIONS.some((name) => hasMoreByCollectionRef.current[name]));
    } catch (err) {
      console.error('[useLeads] Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore]);

  return { leads, loading, hasMore, loadMore, loadingMore };
}
