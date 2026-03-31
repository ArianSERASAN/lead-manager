import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead } from '../../types/domain';
import { calculateLeadScore, isLeadStale } from '../../lib/scoring-engine';
import { getTimestampSeconds } from '../../utils/format';

const PAGE_SIZE = 50;
const COLLECTION_NAME = 'leads';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map(doc => mapDocToLead(doc));
      setLeads(mapped);
      setHasMore(snapshot.docs.length >= PAGE_SIZE);

      if (snapshot.docs.length > 0) {
        setCursor(snapshot.docs[snapshot.docs.length - 1]);
      }

      if (initialLoad.current) {
        setLoading(false);
        initialLoad.current = false;
      }
    }, (err) => {
      console.error('[useLeads] Error:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(PAGE_SIZE)
      );

      const snapshot = await getDocs(q);
      const newLeads = snapshot.docs.map(doc => mapDocToLead(doc));

      if (newLeads.length > 0) {
        setLeads(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const unique = newLeads.filter(l => !existingIds.has(l.id));
          return [...prev, ...unique];
        });
        setCursor(snapshot.docs[snapshot.docs.length - 1]);
      }

      setHasMore(snapshot.docs.length >= PAGE_SIZE);
    } catch (err) {
      console.error('[useLeads] Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, hasMore]);

  return { leads, loading, hasMore, loadMore, loadingMore };
}

function mapDocToLead(doc: QueryDocumentSnapshot): Lead {
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
    superficie: data.superficie !== undefined ? String(data.superficie) : (data.surface !== undefined ? String(data.surface) : ''),
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
  };

  const { score, breakdown } = calculateLeadScore(lead);
  lead.score = score;
  lead.scoreBreakdown = breakdown;
  lead.isStale = isLeadStale(lead);

  return lead;
}
