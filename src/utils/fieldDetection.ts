import { FieldDefinition, FieldType, DetectedUnknownField } from '../types/domain';

/**
 * All static field names in the Lead type plus their common aliases.
 * These are "known" and should never be offered as "new" custom fields.
 */
const KNOWN_STATIC_FIELDS = new Set([
  'id', 'name', 'nombre', 'email', 'correo', 'phone', 'telefono', 'tel',
  'mobile', 'celular', 'movil', 'company', 'empresa', 'compañia', 'organizacion',
  'organization', 'source', 'status', 'estado', 'createdAt', 'fecha',
  'updatedAt', 'notes', 'notas', 'tags', 'etiquetas', 'score', 'scoreBreakdown',
  'isStale', 'assignedTo', 'assignedAt', 'pipelinePosition', 'type', 'resource',
  'recurso', 'message', 'mensaje', 'apellidos', 'sector', 'cargo', 'servicios',
  'tipoInmueble', 'tipo_inmueble', 'buildingType', 'superficie', 'surface',
  'referenciaCatastral', 'referencia_catastral', 'catastro', 'localidad',
  'locality', 'direccion', 'dirección', 'address', 'customFields', 'data',
  '_collection', 'enrichment', 'enrichedAt', 'cancellationReason', 'closedAt',
  'closedBy', 'closedByName', 'stateHistory', 'movedToStatusAt',
]);

/** Known aliases that map to an existing static field */
const KNOWN_ALIASES: Record<string, string> = {
  telefono: 'phone',
  tel: 'phone',
  mobile: 'phone',
  celular: 'phone',
  movil: 'phone',
  nombre: 'name',
  correo: 'email',
  empresa: 'company',
  compañia: 'company',
  organizacion: 'company',
  organization: 'company',
  estado: 'status',
  fecha: 'createdAt',
  notas: 'notes',
  etiquetas: 'tags',
  recurso: 'resource',
  mensaje: 'message',
  dirección: 'direccion',
  address: 'direccion',
  locality: 'localidad',
  tipo_inmueble: 'tipoInmueble',
  buildingType: 'tipoInmueble',
  surface: 'superficie',
  referencia_catastral: 'referenciaCatastral',
  catastro: 'referenciaCatastral',
};

/** Guess a FieldType from the value at runtime */
function guessFieldType(value: unknown): FieldType {
  if (typeof value === 'boolean') return 'checkbox';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'multi-select';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    if (/^https?:\/\//.test(value)) return 'url';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
    if (/^[+\d\s\-().]{7,20}$/.test(value)) return 'phone';
    if (value.length > 120) return 'textarea';
  }
  return 'text';
}

/** Convert a camelCase / snake_case key to a readable Title Case label */
export function keyToLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Scan raw lead data and return fields that are truly new:
 * - not a known static field / alias
 * - not already in the custom field schema
 */
export function detectUnknownFields(
  rawData: Record<string, unknown>,
  customSchema: FieldDefinition[]
): DetectedUnknownField[] {
  const schemaNames = new Set(customSchema.map((f) => f.name));
  const results: DetectedUnknownField[] = [];

  for (const [key, value] of Object.entries(rawData)) {
    // Skip empty / null / system values
    if (value === null || value === undefined || value === '') continue;
    if (key.startsWith('_')) continue;

    const isStatic = KNOWN_STATIC_FIELDS.has(key);
    const aliasTarget = KNOWN_ALIASES[key];
    const inSchema = schemaNames.has(key);

    if (isStatic || inSchema) continue;

    results.push({
      key,
      sampleValue: value,
      suggestedLabel: keyToLabel(key),
      suggestedType: guessFieldType(value),
      isKnownAlias: !!aliasTarget,
      aliasMapsTo: aliasTarget,
    });
  }

  return results;
}
