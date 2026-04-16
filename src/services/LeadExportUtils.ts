import { Lead } from '../types/domain';
import { getLeadCollection } from '../lib/leads';
import { formatTimestamp } from '../utils/format';

const sourceLabels: Record<string, string> = {
  landing: 'Landing',
  'web-download': 'PDF Descarga',
  'web-contact': 'Web Contacto',
  manual: 'Manual',
  'csv-import': 'Importado',
};

const statusLabels: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  'en-progreso': 'En Progreso',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

const RAW_DATA_OMIT_KEYS = new Set([
  'id',
  'name',
  'nombre',
  'email',
  'phone',
  'telefono',
  'company',
  'empresa',
  'source',
  'status',
  'createdAt',
  'updatedAt',
  'notes',
  'notas',
  'tags',
  'score',
  'scoreBreakdown',
  'resource',
  'recurso',
  'message',
  'mensaje',
  'apellidos',
  'sector',
  'cargo',
  'servicios',
  'tipoInmueble',
  'tipo_inmueble',
  'buildingType',
  'superficie',
  'surface',
  'referenciaCatastral',
  'referencia_catastral',
  'catastro',
  'localidad',
  'locality',
  'direccion',
  'dirección',
  'address',
  'customFields',
  'enrichment',
  '_collection',
  'assignedTo',
  'assignedAt',
  'pipelinePosition',
  'movedToStatusAt',
  'cancellationReason',
  'closedAt',
  'closedBy',
  'closedByName',
  'stateHistory',
  'attachments',
]);

type ExportScalar = string | number | boolean | null | undefined | Date;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function toExportValue(value: ExportScalar): string | number {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return value;
}

function setRowValue(row: Record<string, string | number>, key: string, value: unknown): void {
  if (value === null || value === undefined || value === '') return;

  if (Array.isArray(value)) {
    const mapped = value
      .map((item) => (isRecord(item) ? JSON.stringify(item) : String(toExportValue(item as ExportScalar))))
      .filter(Boolean);
    if (mapped.length === 0) return;
    row[key] = mapped.join(', ');
    return;
  }

  if (isRecord(value)) {
    const serialized = JSON.stringify(value);
    if (serialized && serialized !== '{}') row[key] = serialized;
    return;
  }

  row[key] = toExportValue(value as ExportScalar);
}

function flattenUnknownData(
  value: unknown,
  prefix: string,
  row: Record<string, string | number>,
  seen: WeakSet<object>,
  depth = 0
): void {
  if (depth > 6) return;
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    if (value.length === 0) return;
    const allScalars = value.every((item) => !isRecord(item) && !Array.isArray(item));
    if (allScalars) {
      setRowValue(row, `Data: ${prefix}`, value);
      return;
    }
    value.forEach((item, index) => flattenUnknownData(item, `${prefix}[${index}]`, row, seen, depth + 1));
    return;
  }

  if (!isRecord(value)) {
    setRowValue(row, `Data: ${prefix}`, value);
    return;
  }

  if (seen.has(value)) return;
  seen.add(value);

  for (const [k, v] of Object.entries(value)) {
    if (v === null || v === undefined || v === '') continue;
    flattenUnknownData(v, prefix ? `${prefix}.${k}` : k, row, seen, depth + 1);
  }
}

export function buildLeadExportRow(lead: Lead): Record<string, string | number> {
  const row: Record<string, string | number> = {};

  setRowValue(row, 'ID', lead.id);
  setRowValue(row, 'Coleccion', getLeadCollection(lead));
  setRowValue(row, 'Nombre', lead.name);
  setRowValue(row, 'Apellidos', lead.apellidos);
  setRowValue(row, 'Email', lead.email);
  setRowValue(row, 'Telefono', lead.phone);
  setRowValue(row, 'Empresa', lead.company);
  setRowValue(row, 'Cargo', lead.cargo);
  setRowValue(row, 'Sector', lead.sector);
  setRowValue(row, 'Fuente', sourceLabels[lead.source] || lead.source);
  setRowValue(row, 'Estado', statusLabels[lead.status] || lead.status);
  setRowValue(row, 'Puntuacion', lead.score ?? 0);
  setRowValue(row, 'Etiquetas', lead.tags || []);
  setRowValue(row, 'Notas', lead.notes);
  setRowValue(row, 'Mensaje', lead.message);
  setRowValue(row, 'Recurso', lead.resource);
  setRowValue(row, 'Servicios', lead.servicios || []);
  setRowValue(row, 'Tipo Inmueble', lead.tipoInmueble);
  setRowValue(row, 'Superficie', lead.superficie);
  setRowValue(row, 'Localidad', lead.localidad);
  setRowValue(row, 'Direccion', lead.direccion);
  setRowValue(row, 'Ref. Catastral', lead.referenciaCatastral);
  setRowValue(row, 'Asignado a', lead.assignedTo);
  setRowValue(row, 'Creado', lead.createdAt ? formatTimestamp(lead.createdAt) : '');
  setRowValue(row, 'Actualizado', lead.updatedAt ? formatTimestamp(lead.updatedAt) : '');
  setRowValue(row, 'Motivo cancelacion', lead.cancellationReason);
  setRowValue(row, 'Cerrado por', lead.closedByName);

  if (lead.scoreBreakdown) {
    setRowValue(row, 'Score: Fuente', lead.scoreBreakdown.sourceWeight);
    setRowValue(row, 'Score: Completitud', lead.scoreBreakdown.completeness);
    setRowValue(row, 'Score: Recencia', lead.scoreBreakdown.recency);
    setRowValue(row, 'Score: Calidad Respuesta', lead.scoreBreakdown.responseQuality);
  }

  if (lead.enrichment) {
    const e = lead.enrichment;
    setRowValue(row, 'Enrich: Cargo', e.title);
    setRowValue(row, 'Enrich: LinkedIn', e.linkedinUrl);
    setRowValue(row, 'Enrich: Empresa', e.organizationName);
    setRowValue(row, 'Enrich: Sector', e.organizationIndustry);
    setRowValue(row, 'Enrich: Empleados', e.organizationSize);
    setRowValue(row, 'Enrich: Web', e.organizationWebsite);
    setRowValue(row, 'Enrich: Ciudad', e.city);
  }

  if (lead.customFields) {
    const customKeys = Object.keys(lead.customFields).sort();
    for (const key of customKeys) {
      setRowValue(row, `Custom: ${key}`, lead.customFields[key]);
    }
  }

  if (isRecord(lead.data)) {
    const seen = new WeakSet<object>();
    for (const [k, v] of Object.entries(lead.data)) {
      if (RAW_DATA_OMIT_KEYS.has(k)) continue;
      flattenUnknownData(v, k, row, seen);
    }
  }

  return row;
}

export function buildLeadExportEntries(lead: Lead): Array<{ label: string; value: string }> {
  return Object.entries(buildLeadExportRow(lead)).map(([label, raw]) => ({
    label,
    value: String(raw),
  }));
}
