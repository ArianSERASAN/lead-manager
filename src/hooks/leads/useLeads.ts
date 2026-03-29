import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, Timestamp, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead } from '../../types/domain';
import { calculateLeadScore, isLeadStale } from '../../lib/scoring-engine';
import { getTimestampSeconds } from '../../utils/format';

const PAGE_SIZE = 50;

const COLLECTIONS = [
  { name: 'leads', source: 'landing' as const },
  { name: 'leads_descargas', source: 'web-download' as const },
  { name: 'solicitudes_contacto', source: 'web-contact' as const },
];

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Store cursors for pagination per collection
  const [cursors, setCursors] = useState<Record<string, QueryDocumentSnapshot | null>>({});

  // Track how many collections have responded at least once to avoid premature loading=false
  const loadedCount = useRef(0);
  const expectedCount = useRef(0);

  useEffect(() => {
    // Each collection has 2 queries: orderBy('createdAt') + orderBy('fecha')
    // so we wait for all 6 snapshots before clearing the loading state.
    expectedCount.current = COLLECTIONS.length * 2;
    loadedCount.current = 0;

    const unsubscribers: (() => void)[] = [];

    // Per-collection maps: keyed by doc.id to deduplicate across both queries
    const colMaps: Record<string, Map<string, Lead>> = {};
    COLLECTIONS.forEach(c => { colMaps[c.name] = new Map(); });

    function rebuildLeads() {
      const all: Lead[] = [];
      COLLECTIONS.forEach(c => {
        colMaps[c.name].forEach(lead => all.push(lead));
      });
      all.sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt));
      setLeads(all);
    }

    COLLECTIONS.forEach((colInfo) => {
      // ─ Primary query: orderBy('createdAt') — covers app-created docs + normalized web-form docs
      const qCreatedAt = query(
        collection(db, colInfo.name),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      const unsubCreatedAt = onSnapshot(qCreatedAt, (snapshot) => {
        snapshot.docs.forEach(doc => {
          colMaps[colInfo.name].set(doc.id, mapDocToLead(doc, colInfo));
        });

        if (snapshot.docs.length > 0) {
          setCursors(prev => ({
            ...prev,
            [colInfo.name]: snapshot.docs[snapshot.docs.length - 1],
          }));
        }

        setHasMore(prev => prev || snapshot.docs.length >= PAGE_SIZE);

        loadedCount.current++;
        rebuildLeads();
        if (loadedCount.current >= expectedCount.current) {
          setLoading(false);
        }
      }, (err) => {
        console.error(`[useLeads] Error in ${colInfo.name} (createdAt):`, err);
        loadedCount.current++;
        if (loadedCount.current >= expectedCount.current) setLoading(false);
      });

      // ─ Fallback query: orderBy('fecha') — catches legacy web-form docs that use 'fecha'
      // instead of 'createdAt' and were submitted before the Cloud Function normalization.
      const qFecha = query(
        collection(db, colInfo.name),
        orderBy('fecha', 'desc'),
        limit(20)
      );

      const unsubFecha = onSnapshot(qFecha, (snapshot) => {
        snapshot.docs.forEach(doc => {
          // Only add if not already present (deduplication)
          if (!colMaps[colInfo.name].has(doc.id)) {
            colMaps[colInfo.name].set(doc.id, mapDocToLead(doc, colInfo));
          }
        });

        loadedCount.current++;
        rebuildLeads();
        if (loadedCount.current >= expectedCount.current) {
          setLoading(false);
        }
      }, (err) => {
        // The 'fecha' field may not exist in any doc — this query will silently return 0 results.
        // Only log if it's not a missing-index error (which is expected on fresh collections).
        if (!err.message?.includes('index')) {
          console.warn(`[useLeads] ${colInfo.name} has no 'fecha' docs (expected):`, err.code);
        }
        loadedCount.current++;
        if (loadedCount.current >= expectedCount.current) setLoading(false);
      });

      unsubscribers.push(unsubCreatedAt, unsubFecha);
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  // Load more leads (pagination)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    let newLeads: Lead[] = [];
    let anyHasMore = false;

    for (const colInfo of COLLECTIONS) {
      const cursor = cursors[colInfo.name];
      if (!cursor) continue;

      const q = query(
        collection(db, colInfo.name),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const colLeads = snapshot.docs.map(doc => mapDocToLead(doc, colInfo));
      newLeads = [...newLeads, ...colLeads];

      if (snapshot.docs.length > 0) {
        setCursors(prev => ({
          ...prev,
          [colInfo.name]: snapshot.docs[snapshot.docs.length - 1],
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
        return [...prev, ...unique].sort((a, b) =>
          getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt)
        );
      });
    }

    setHasMore(anyHasMore);
    setLoadingMore(false);
  }, [cursors, loadingMore, hasMore]);

  return { leads, loading, hasMore, loadMore, loadingMore };
}

// ─── Helper: map Firestore doc to Lead ───────────────────────────
function mapDocToLead(
  doc: QueryDocumentSnapshot,
  colInfo: { name: string; source: 'landing' | 'web-download' | 'web-contact' }
): Lead {
  const data = doc.data();

  // createdAt: prefer field named 'createdAt', then 'fecha', then current time.
  // NOTE: Timestamp.now() is a fallback only — means the date will show as "Hoy"
  // for legacy docs. The Cloud Function now backfills createdAt going forward.
  const createdAt = data.createdAt || data.fecha || Timestamp.now();

  const unified: Lead = {
    id: doc.id,
    name: data.name || data.nombre || '—',
    email: data.email || '—',
    phone: data.phone || data.telefono || '',
    company: data.company || data.empresa || '',
    source: colInfo.source,
    status: data.status || 'nuevo',
    createdAt,
    updatedAt: data.updatedAt || createdAt,
    notes: data.notes || data.notas || '',
    tags: data.tags || [],
    score: 0,
    resource: data.recurso || '',
    message: data.mensaje || data.message || '',
    apellidos: data.apellidos || '',
    sector: data.sector || '',
    cargo: data.cargo || '',
    servicios: data.servicios || [],
    tipoInmueble: data.tipoInmueble || data.tipo_inmueble || data.buildingType || '',
    superficie: data.superficie !== undefined ? String(data.superficie) : (data.surface !== undefined ? String(data.surface) : ''),
    referenciaCatastral: data.referenciaCatastral || data.referencia_catastral || data.catastro || '',
    localidad: data.localidad || data.locality || '',
    direccion: data.direccion || data['dirección'] || data.address || '',
    customFields: data.customFields || {},
    data: data,
    _collection: colInfo.name,
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
  };

  const { score, breakdown } = calculateLeadScore(unified);
  unified.score = score;
  unified.scoreBreakdown = breakdown;
  unified.isStale = isLeadStale(unified);

  return unified;
}
