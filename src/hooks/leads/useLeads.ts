import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, Timestamp, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead } from '../../types/domain';
import { calculateLeadScore, isLeadStale } from '../../lib/scoring-engine';
import { getTimestampSeconds } from '../../utils/format';

const PAGE_SIZE = 50;

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Store cursors for pagination per collection
  const [cursors, setCursors] = useState<Record<string, QueryDocumentSnapshot | null>>({});

  useEffect(() => {
    const collections = [
      { name: 'leads', source: 'landing' as const },
      { name: 'leads_descargas', source: 'web-download' as const },
      { name: 'solicitudes_contacto', source: 'web-contact' as const }
    ];

    const unsubscribers: (() => void)[] = [];
    const allLeadsMap: Record<string, Lead[]> = {};

    collections.forEach((colInfo) => {
      // Use limit for initial load to avoid downloading entire collections
      const q = query(
        collection(db, colInfo.name),
        limit(PAGE_SIZE)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const colLeads: Lead[] = snapshot.docs.map(doc => mapDocToLead(doc, colInfo));

        // Store last doc for pagination cursor
        if (snapshot.docs.length > 0) {
          setCursors(prev => ({
            ...prev,
            [colInfo.name]: snapshot.docs[snapshot.docs.length - 1]
          }));
        }

        allLeadsMap[colInfo.name] = colLeads;

        // Merge and sort
        const merged = Object.values(allLeadsMap).flat().sort((a, b) => {
          return getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt);
        });

        setLeads(merged);
        setLoading(false);

        // Check if there might be more data
        const totalFromSnapshot = Object.values(allLeadsMap).reduce((sum, arr) => sum + arr.length, 0);
        setHasMore(snapshot.docs.length >= PAGE_SIZE);
      }, (err) => {
        console.error(`Error in collection ${colInfo.name}:`, err);
      });

      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  // Load more leads (pagination)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const collections = [
      { name: 'leads', source: 'landing' as const },
      { name: 'leads_descargas', source: 'web-download' as const },
      { name: 'solicitudes_contacto', source: 'web-contact' as const }
    ];

    let newLeads: Lead[] = [];
    let anyHasMore = false;

    for (const colInfo of collections) {
      const cursor = cursors[colInfo.name];
      if (!cursor) continue;

      const q = query(
        collection(db, colInfo.name),
        startAfter(cursor),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const colLeads = snapshot.docs.map(doc => mapDocToLead(doc, colInfo));
      newLeads = [...newLeads, ...colLeads];

      if (snapshot.docs.length > 0) {
        setCursors(prev => ({
          ...prev,
          [colInfo.name]: snapshot.docs[snapshot.docs.length - 1]
        }));
      }

      if (snapshot.docs.length >= PAGE_SIZE) {
        anyHasMore = true;
      }
    }

    if (newLeads.length > 0) {
      setLeads(prev => {
        const existingIds = new Set(prev.map(l => l.id));
        const unique = newLeads.filter(l => !existingIds.has(l.id));
        const merged = [...prev, ...unique].sort((a, b) => {
          return getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt);
        });
        return merged;
      });
    }

    setHasMore(anyHasMore);
    setLoadingMore(false);
  }, [cursors, loadingMore, hasMore]);

  return { leads, loading, hasMore, loadMore, loadingMore };
}

// Helper to map Firestore doc to Lead
function mapDocToLead(
  doc: QueryDocumentSnapshot,
  colInfo: { name: string; source: 'landing' | 'web-download' | 'web-contact' }
): Lead {
  const data = doc.data();
  const rawDate = data.createdAt || data.fecha || Timestamp.now();

  let unified: Lead = {
    id: doc.id,
    name: data.name || data.nombre || '—',
    email: data.email || '—',
    phone: data.phone || data.telefono || '',
    company: data.company || '',
    source: colInfo.source,
    status: data.status || 'nuevo',
    createdAt: data.createdAt || data.fecha || Timestamp.now(),
    updatedAt: data.updatedAt || rawDate,
    notes: data.notes || data.notas || '',
    tags: data.tags || [],
    score: 0,
    resource: data.recurso || '',
    message: data.mensaje || data.message || '',
    customFields: data.customFields || {},
    data: data,
    _collection: colInfo.name
  };

  const { score, breakdown } = calculateLeadScore(unified);
  unified.score = score;
  unified.scoreBreakdown = breakdown;
  unified.isStale = isLeadStale(unified);

  return unified;
}
