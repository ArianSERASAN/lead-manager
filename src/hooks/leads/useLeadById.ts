import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Lead } from '../../types/domain';
import { calculateLeadScore, isLeadStale } from '../../lib/scoring-engine';

const SOURCE_MAP: Record<string, Lead['source']> = {
  leads: 'landing',
  leads_descargas: 'web-download',
  solicitudes_contacto: 'web-contact',
};

export function useLeadById(collectionName: string, id: string) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionName || !id) return;

    const unsub = onSnapshot(
      doc(db, collectionName, id),
      (snap) => {
        if (!snap.exists()) {
          setError('Lead no encontrado');
          setLead(null);
          setLoading(false);
          return;
        }

        const data = snap.data();
        const createdAt = data.createdAt || data.fecha || Timestamp.now();

        const unified: Lead = {
          id: snap.id,
          name: data.name || data.nombre || '—',
          email: data.email || '—',
          phone: data.phone || data.telefono || '',
          company: data.company || data.empresa || '',
          source: data.source || SOURCE_MAP[collectionName] || 'manual',
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
          superficie:
            data.superficie !== undefined
              ? String(data.superficie)
              : data.surface !== undefined
              ? String(data.surface)
              : '',
          referenciaCatastral:
            data.referenciaCatastral || data.referencia_catastral || data.catastro || '',
          localidad: data.localidad || data.locality || '',
          direccion: data.direccion || data['dirección'] || data.address || '',
          customFields: data.customFields || {},
          data,
          _collection: collectionName,
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

        setLead(unified);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [collectionName, id]);

  return { lead, loading, error };
}
