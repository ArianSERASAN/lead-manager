import * as XLSX from 'xlsx';
import { Lead } from '../types/domain';
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

function flattenLead(lead: Lead): Record<string, string | number> {
  const row: Record<string, string | number> = {};

  // Core fields
  row['Nombre'] = lead.name || '';
  row['Apellidos'] = lead.apellidos || '';
  row['Email'] = lead.email || '';
  row['Telefono'] = lead.phone || '';
  row['Empresa'] = lead.company || '';
  row['Cargo'] = lead.cargo || '';
  row['Sector'] = lead.sector || '';
  row['Fuente'] = sourceLabels[lead.source] || lead.source;
  row['Estado'] = statusLabels[lead.status] || lead.status;
  row['Puntuacion'] = lead.score ?? 0;
  row['Etiquetas'] = (lead.tags || []).join(', ');
  row['Notas'] = lead.notes || '';
  row['Mensaje'] = lead.message || '';

  // Property fields
  row['Tipo Inmueble'] = lead.tipoInmueble || '';
  row['Superficie'] = lead.superficie || '';
  row['Localidad'] = lead.localidad || '';
  row['Direccion'] = lead.direccion || '';
  row['Ref. Catastral'] = lead.referenciaCatastral || '';

  // Assignment
  row['Asignado a'] = lead.assignedTo || '';

  // Dates
  row['Creado'] = lead.createdAt ? formatTimestamp(lead.createdAt) : '';
  row['Actualizado'] = lead.updatedAt ? formatTimestamp(lead.updatedAt) : '';

  // Cancellation
  if (lead.cancellationReason) row['Motivo cancelacion'] = lead.cancellationReason;
  if (lead.closedByName) row['Cerrado por'] = lead.closedByName;

  // Apollo enrichment — prefix with "Enrich:"
  if (lead.enrichment) {
    const e = lead.enrichment;
    if (e.title) row['Enrich: Cargo'] = e.title;
    if (e.linkedinUrl) row['Enrich: LinkedIn'] = e.linkedinUrl;
    if (e.organizationName) row['Enrich: Empresa'] = e.organizationName;
    if (e.organizationIndustry) row['Enrich: Sector'] = e.organizationIndustry;
    if (e.organizationSize) row['Enrich: Empleados'] = e.organizationSize;
    if (e.organizationWebsite) row['Enrich: Web'] = e.organizationWebsite;
    if (e.city) row['Enrich: Ciudad'] = e.city;
  }

  // Custom fields — prefix with "Custom:"
  if (lead.customFields) {
    for (const [k, v] of Object.entries(lead.customFields)) {
      if (v !== null && v !== undefined && v !== '') {
        row[`Custom: ${k}`] = String(v);
      }
    }
  }

  return row;
}

/**
 * Exports the given leads as an .xlsx file and triggers a browser download.
 */
export function exportLeadsToExcel(leads: Lead[], filename?: string): void {
  if (leads.length === 0) return;

  const rows = leads.map(flattenLead);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns (approximate)
  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(key.length, 14),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  const name = filename || `leads_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
}
