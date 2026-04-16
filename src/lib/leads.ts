import type { DocumentData } from 'firebase/firestore';
import { Lead, LeadCollection } from '../types/domain';
import { toJSDate } from '../types/domain';
import { calculateLeadScore, isLeadStale, ScoringWeights } from './scoring-engine';

type FirestoreLeadLike = {
  id: string;
  data: () => DocumentData;
};

export const DEFAULT_LEAD_COLLECTION: LeadCollection = 'leads';
export const LEAD_COLLECTIONS: LeadCollection[] = [
  'leads',
  'leads_descargas',
  'solicitudes_contacto',
];

export const LEAD_SOURCE_BY_COLLECTION: Record<LeadCollection, Lead['source']> = {
  leads: 'landing',
  leads_descargas: 'web-download',
  solicitudes_contacto: 'web-contact',
};

export function getLeadCollection(lead?: Partial<Lead> | null): LeadCollection {
  if (lead?._collection) return lead._collection;

  if (lead?.source === 'web-download') return 'leads_descargas';
  if (lead?.source === 'web-contact') return 'solicitudes_contacto';

  return DEFAULT_LEAD_COLLECTION;
}

export function getLeadKey(lead: Pick<Lead, 'id' | '_collection'>): string {
  return `${getLeadCollection(lead)}:${lead.id}`;
}

export function isSameLead(a: Pick<Lead, 'id' | '_collection'>, b: Pick<Lead, 'id' | '_collection'>): boolean {
  return getLeadKey(a) === getLeadKey(b);
}

export function withComputedLeadFields(lead: Lead, weights?: ScoringWeights | null): Lead {
  const { score, breakdown } = calculateLeadScore(lead, weights || undefined);

  return {
    ...lead,
    score,
    scoreBreakdown: breakdown,
    isStale: isLeadStale(lead),
  };
}

export function normalizeLeadSnapshot(
  snapshot: FirestoreLeadLike,
  collectionName: LeadCollection,
  weights?: ScoringWeights | null
): Lead {
  const data = snapshot.data();

  const lead: Lead = {
    id: snapshot.id,
    name: data.name || data.nombre || '-',
    email: data.email || '-',
    phone: data.phone || data.telefono || '',
    company: data.company || data.empresa || '',
    source: data.source || LEAD_SOURCE_BY_COLLECTION[collectionName] || 'manual',
    status: data.status || 'nuevo',
    createdAt: data.createdAt || data.fecha || new Date(),
    updatedAt: data.updatedAt || data.createdAt || data.fecha || new Date(),
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
    superficie:
      data.superficie !== undefined
        ? String(data.superficie)
        : data.surface !== undefined
          ? String(data.surface)
          : '',
    referenciaCatastral: data.referenciaCatastral || data.referencia_catastral || data.catastro || '',
    localidad: data.localidad || data.locality || '',
    direccion: data.direccion || data['dirección'] || data.address || '',
    customFields: data.customFields || {},
    data,
    _collection: collectionName,
    enrichment: data.enrichment,
    enrichedAt: data.enrichedAt,
    assignedTo: data.assignedTo,
    assignedAt: data.assignedAt,
    pipelinePosition: data.pipelinePosition,
    movedToStatusAt: data.movedToStatusAt,
    cancellationReason: data.cancellationReason,
    closedAt: data.closedAt,
    closedBy: data.closedBy,
    closedByName: data.closedByName,
    stateHistory: data.stateHistory,
    attachments: data.attachments || [],
  };

  return withComputedLeadFields(lead, weights);
}

export function sortLeadsByCreatedAtDesc(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => toJSDate(b.createdAt).getTime() - toJSDate(a.createdAt).getTime());
}
