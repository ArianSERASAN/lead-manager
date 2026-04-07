import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  writeBatch,
  doc,
  collection as firestoreCollection,
  serverTimestamp,
  query as firestoreQuery,
  where as firestoreWhere,
  getDocs as firestoreGetDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { FieldDefinition } from '../types/domain';

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
  columnSections: Record<string, string>; // header → Excel section name
}

export interface MappedLead {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  notes?: string;
  apellidos?: string;
  sector?: string;
  cargo?: string;
  localidad?: string;
  direccion?: string;
  tipoInmueble?: string;
  superficie?: string;
  referenciaCatastral?: string;
  message?: string;
  customFields?: Record<string, string>;
}

// ─── Normalization helpers ────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_\-]+/g, ' ')
    .trim();
}

export function generateSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function generateFieldId(): string {
  return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Auto-mapping table ───────────────────────────────────────────────────────
// key = normalized header (lowercase, no accents, spaces normalized)
// value = lead field name (empty string = custom field)

const HEADER_MAP: Record<string, string> = {
  // ── Name ──
  nombre: 'name', 'nombre 1': 'name', nombre1: 'name', 'primer nombre': 'name',
  'nombre completo': 'name', 'full name': 'name', 'first name': 'name',
  name: 'name', contacto: 'name', 'nombre contacto': 'name',

  // ── Apellidos ──
  apellidos: 'apellidos', apellido: 'apellidos', 'last name': 'apellidos',
  surname: 'apellidos', 'segundo nombre': 'apellidos',

  // ── Email ──
  email: 'email', 'email inferido': 'email', 'correo': 'email',
  'correo electronico': 'email', 'e-mail': 'email', mail: 'email',
  'email 1': 'email', email1: 'email', 'correo 1': 'email',

  // ── Phone ──
  telefono: 'phone', 'telefono 1': 'phone', telefono1: 'phone',
  teléfono: 'phone', phone: 'phone', tel: 'phone', movil: 'phone',
  móvil: 'phone', mobile: 'phone', 'tel 1': 'phone',
  celular: 'phone', 'contacto telefono': 'phone',

  // ── Company ──
  empresa: 'company', company: 'company', organizacion: 'company',
  organization: 'company', 'razon social': 'company', 'nombre empresa': 'company',
  'nombre compania': 'company', compania: 'company', marca: 'company',

  // ── Cargo ──
  cargo: 'cargo', 'cargo 1': 'cargo', cargo1: 'cargo', puesto: 'cargo',
  position: 'cargo', title: 'cargo', 'job title': 'cargo',
  'titulo profesional': 'cargo', ocupacion: 'cargo',

  // ── Sector ──
  sector: 'sector', industry: 'sector', industria: 'sector',
  'actividad': 'sector', cnae: 'sector',

  // ── Localidad ──
  localidad: 'localidad', ciudad: 'localidad', city: 'localidad',
  sede: 'localidad', municipio: 'localidad', poblacion: 'localidad',
  location: 'localidad',

  // ── Dirección ──
  direccion: 'direccion', dirección: 'direccion', address: 'direccion',
  'otras sedes': 'direccion', domicilio: 'direccion',

  // ── Tipo inmueble ──
  'tipo inmueble': 'tipoInmueble', 'tipo_inmueble': 'tipoInmueble',
  'building type': 'tipoInmueble', 'tipo activo': 'tipoInmueble',
  'tipo de activo': 'tipoInmueble',

  // ── Superficie ──
  superficie: 'superficie', 'superficie aprox': 'superficie',
  surface: 'superficie', area: 'superficie', 'm2': 'superficie',

  // ── Ref. catastral ──
  'referencia catastral': 'referenciaCatastral', catastro: 'referenciaCatastral',
  'ref catastral': 'referenciaCatastral', 'referencia catastral 1': 'referenciaCatastral',

  // ── Notas / Mensaje ──
  mensaje: 'message', message: 'message',
  notas: 'notes', notes: 'notes', observaciones: 'notes',
  comentarios: 'notes', descripcion: 'notes',
};

// Labels for display in the review step
export const STANDARD_FIELD_LABELS: Record<string, string> = {
  name: 'Nombre del lead',
  email: 'Email',
  phone: 'Teléfono',
  company: 'Empresa',
  apellidos: 'Apellidos',
  cargo: 'Cargo',
  sector: 'Sector',
  localidad: 'Localidad',
  direccion: 'Dirección',
  tipoInmueble: 'Tipo inmueble',
  superficie: 'Superficie',
  referenciaCatastral: 'Ref. catastral',
  message: 'Mensaje',
  notes: 'Notas',
};

// ─── Auto-mapping ─────────────────────────────────────────────────────────────

export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const n = normalize(header);
    mapping[header] = HEADER_MAP[n] ?? '';
  }
  return mapping;
}

// ─── Build missing FieldDefinitions ──────────────────────────────────────────

export function buildMissingFieldDefinitions(
  headers: string[],
  headerMapping: Record<string, string>,
  columnSections: Record<string, string>,
  existingSchema: FieldDefinition[],
  userId: string
): FieldDefinition[] {
  const existingNames = new Set(existingSchema.map((f) => f.name));
  const maxOrder = existingSchema.reduce((max, f) => Math.max(max, f.order), -1);

  const newFields: FieldDefinition[] = [];
  let orderCounter = maxOrder + 1;

  for (const header of headers) {
    const leadField = headerMapping[header];
    if (leadField) continue; // already mapped to standard field

    const slug = generateSlug(header);
    if (!slug) continue;
    if (existingNames.has(slug)) continue; // schema already has this field

    existingNames.add(slug); // avoid duplicates within this batch

    // Clean up Excel section name (remove leading "A. ", "B. " prefixes)
    const rawSection = columnSections[header] || '';
    const section = rawSection.replace(/^[A-Z]\.\s+/, '').trim() || 'Datos importados';

    newFields.push({
      id: generateFieldId(),
      name: slug,
      label: header,
      type: 'text',
      visible: true,
      required: false,
      section,
      order: orderCounter++,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    });
  }

  return newFields;
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

export function parseCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        resolve({
          headers,
          rows: results.data as Record<string, string>[],
          errors: results.errors.map((e) => `Fila ${e.row}: ${e.message}`),
          columnSections: {},
        });
      },
    });
  });
}

export function parseXLSX(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        // Read all rows as plain arrays
        const allRows = XLSX.utils.sheet_to_json<string[]>(firstSheet, {
          header: 1,
          defval: '',
        });

        // Find the header row: the one (within first 5) with the most non-empty cells
        let headerRowIdx = 0;
        let maxNonEmpty = 0;
        for (let i = 0; i < Math.min(5, allRows.length); i++) {
          const nonEmpty = allRows[i].filter(
            (v) => v !== '' && v !== null && v !== undefined
          ).length;
          if (nonEmpty > maxNonEmpty) {
            maxNonEmpty = nonEmpty;
            headerRowIdx = i;
          }
        }

        const rawHeaders = allRows[headerRowIdx].map((h) => String(h ?? '').trim());
        const dataRows = allRows.slice(headerRowIdx + 1);

        // Detect section row: the row just before the header row (if it exists)
        // Sections are forward-filled (merged cells appear as empty strings)
        const sectionByIdx: string[] = new Array(rawHeaders.length).fill('');
        if (headerRowIdx > 0) {
          const sectionRow = allRows[headerRowIdx - 1];
          let currentSection = '';
          for (let i = 0; i < sectionRow.length; i++) {
            const val = String(sectionRow[i] ?? '').trim();
            if (val) currentSection = val;
            sectionByIdx[i] = currentSection;
          }
        }

        // Deduplicate headers (e.g. two "Telefono" columns → "Telefono", "Telefono_2")
        // and filter out empty / all-blank columns
        const headerCounts: Record<string, number> = {};
        const usefulIdx: { h: string; i: number }[] = [];

        for (let i = 0; i < rawHeaders.length; i++) {
          const raw = rawHeaders[i];
          if (!raw) continue;

          // Check column has at least one non-empty value in data rows
          const hasValue = dataRows.some(
            (row) => row[i] !== '' && row[i] !== null && row[i] !== undefined
          );
          if (!hasValue) continue;

          headerCounts[raw] = (headerCounts[raw] || 0) + 1;
          const finalH =
            headerCounts[raw] > 1 ? `${raw}_${headerCounts[raw]}` : raw;
          usefulIdx.push({ h: finalH, i });
        }

        const headers = usefulIdx.map(({ h }) => h);

        // Build section map using final (deduplicated) header names
        const columnSections: Record<string, string> = {};
        for (const { h, i } of usefulIdx) {
          if (sectionByIdx[i]) columnSections[h] = sectionByIdx[i];
        }

        // Build row objects indexed by final header name
        const rows = dataRows
          .map((row) => {
            const obj: Record<string, string> = {};
            for (const { h, i } of usefulIdx) {
              obj[h] = String(row[i] ?? '');
            }
            return obj;
          })
          .filter((row) => Object.values(row).some((v) => v !== ''));

        resolve({ headers, rows, errors: [], columnSections });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function parseFile(file: File): Promise<CSVParseResult> {
  if (file.size > MAX_FILE_SIZE) {
    return Promise.reject(new Error(`El archivo supera el límite de ${MAX_FILE_SIZE / (1024 * 1024)} MB. Por favor, divide el archivo e inténtalo de nuevo.`));
  }
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXLSX(file);
  return parseCSV(file);
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

export function mapRow(
  row: Record<string, string>,
  headerMapping: Record<string, string>
): MappedLead {
  const lead: Record<string, string> = {};
  const custom: Record<string, string> = {};

  for (const [csvHeader, leadField] of Object.entries(headerMapping)) {
    const val = row[csvHeader];
    if (val === undefined || val === '') continue;
    const trimmed = String(val).trim();
    if (!trimmed) continue;

    if (leadField) {
      lead[leadField] = trimmed;
    } else {
      // Unmapped column → custom field (slug as key)
      const slug = generateSlug(csvHeader);
      if (slug) custom[slug] = trimmed;
    }
  }

  return {
    name: lead.name || lead.company || 'Sin nombre',
    email: lead.email || '',
    phone: lead.phone,
    company: lead.company,
    source: 'csv-import',
    status: 'nuevo',
    notes: lead.notes,
    apellidos: lead.apellidos,
    sector: lead.sector,
    cargo: lead.cargo,
    localidad: lead.localidad,
    direccion: lead.direccion,
    tipoInmueble: lead.tipoInmueble,
    superficie: lead.superficie,
    referenciaCatastral: lead.referenciaCatastral,
    message: lead.message,
    customFields: Object.keys(custom).length > 0 ? custom : undefined,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateRow(mapped: MappedLead): string[] {
  const errors: string[] = [];
  // Only reject rows that are completely empty
  const hasAnyData =
    mapped.name || mapped.email || mapped.company || mapped.phone ||
    mapped.localidad || mapped.sector || mapped.cargo ||
    Object.keys(mapped.customFields || {}).length > 0;
  if (!hasAnyData) errors.push('Fila vacía');
  // Soft-validate email format only if provided
  if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
    mapped.email = ''; // clear invalid email instead of rejecting the row
  }
  return errors;
}

// ─── Batch Duplicate Check ───────────────────────────────────────────────────

export interface DuplicateMatch {
  id: string;
  name: string;
  status: string;
}

/**
 * Check multiple emails against existing leads in batch.
 * Returns a Map of lowercase email → existing lead info.
 * Uses Firestore 'in' queries with chunks of 30 (limit).
 */
export async function checkDuplicatesInBatch(
  emails: string[]
): Promise<Map<string, DuplicateMatch>> {
  const result = new Map<string, DuplicateMatch>();
  const uniqueEmails = [...new Set(
    emails.map(e => e.toLowerCase().trim()).filter(e => e && e.includes('@'))
  )];

  if (uniqueEmails.length === 0) return result;

  const CHUNK_SIZE = 30; // Firestore 'in' query limit
  for (let i = 0; i < uniqueEmails.length; i += CHUNK_SIZE) {
    const chunk = uniqueEmails.slice(i, i + CHUNK_SIZE);
    const q = firestoreQuery(
      firestoreCollection(db, 'leads'),
      firestoreWhere('email', 'in', chunk)
    );
    const snapshot = await firestoreGetDocs(q);
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const email = (data.email || '').toLowerCase().trim();
      if (email) {
        result.set(email, {
          id: doc.id,
          name: data.name || data.nombre || '—',
          status: data.status || 'nuevo',
        });
      }
    }
  }

  return result;
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importLeads(
  leads: MappedLead[],
  userId: string,
  userName: string
): Promise<{ imported: number; errors: number }> {
  let imported = 0;
  let errors = 0;
  const BATCH_SIZE = 499;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const chunk = leads.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const lead of chunk) {
      const ref = doc(firestoreCollection(db, 'leads'));
      const cleanLead: Record<string, unknown> = {
        ...lead,
        tags: [],
        score: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        createdByName: userName,
      };
      for (const [k, v] of Object.entries(cleanLead)) {
        if (v === undefined || v === '') delete cleanLead[k];
      }
      batch.set(ref, cleanLead);
    }

    try {
      await batch.commit();
      imported += chunk.length;
    } catch {
      errors += chunk.length;
    }
  }

  return { imported, errors };
}
