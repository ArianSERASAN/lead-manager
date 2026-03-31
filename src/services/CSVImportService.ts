import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
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

// Spanish/English header auto-mapping
const HEADER_MAP: Record<string, string> = {
  nombre: 'name', name: 'name', 'first name': 'name', 'primer nombre': 'name',
  apellidos: 'apellidos', apellido: 'apellidos', 'last name': 'apellidos', surname: 'apellidos',
  email: 'email', correo: 'email', 'correo electrónico': 'email', 'e-mail': 'email',
  telefono: 'phone', teléfono: 'phone', phone: 'phone', tel: 'phone', móvil: 'phone', movil: 'phone',
  empresa: 'company', company: 'company', organización: 'company', organization: 'company',
  cargo: 'cargo', puesto: 'cargo', position: 'cargo', title: 'cargo', 'job title': 'cargo',
  sector: 'sector', industry: 'sector', industria: 'sector',
  localidad: 'localidad', ciudad: 'localidad', city: 'localidad',
  direccion: 'direccion', dirección: 'direccion', address: 'direccion',
  'tipo inmueble': 'tipoInmueble', 'building type': 'tipoInmueble',
  superficie: 'superficie', surface: 'superficie', area: 'superficie',
  'referencia catastral': 'referenciaCatastral', catastro: 'referenciaCatastral',
  mensaje: 'message', message: 'message', notas: 'notes', notes: 'notes',
};

export function parseCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve({
          headers: results.meta.fields || [],
          rows: results.data as Record<string, string>[],
          errors: results.errors.map(e => `Fila ${e.row}: ${e.message}`),
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
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { defval: '' });
        const headers = json.length > 0 ? Object.keys(json[0]) : [];
        resolve({ headers, rows: json, errors: [] });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseFile(file: File): Promise<CSVParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXLSX(file);
  return parseCSV(file);
}

export function autoMapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    mapping[header] = HEADER_MAP[normalized] || '';
  }
  return mapping;
}

export function mapRow(row: Record<string, string>, headerMapping: Record<string, string>): MappedLead {
  const lead: Record<string, string> = {};
  const custom: Record<string, string> = {};

  for (const [csvHeader, leadField] of Object.entries(headerMapping)) {
    if (row[csvHeader] === undefined || row[csvHeader] === '') continue;
    if (leadField) {
      lead[leadField] = row[csvHeader].trim();
    } else {
      // Unmapped column -> custom field
      custom[csvHeader] = row[csvHeader].trim();
    }
  }

  return {
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone,
    company: lead.company,
    source: 'manual',
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

export function validateRow(mapped: MappedLead): string[] {
  const errors: string[] = [];
  if (!mapped.name) errors.push('Nombre requerido');
  if (!mapped.email) {
    errors.push('Email requerido');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
    errors.push('Email inválido');
  }
  return errors;
}

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
      const ref = doc(collection(db, 'leads'));
      const cleanLead: Record<string, unknown> = {
        ...lead,
        tags: [],
        score: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        createdByName: userName,
      };
      // Remove undefined/empty fields
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
