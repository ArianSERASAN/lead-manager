import * as XLSX from 'xlsx';
import { Lead } from '../types/domain';
import { buildLeadExportRow } from './LeadExportUtils';

/**
 * Exports the given leads as an .xlsx file and triggers a browser download.
 */
export function exportLeadsToExcel(leads: Lead[], filename?: string): void {
  if (leads.length === 0) return;

  const rows = leads.map(buildLeadExportRow);
  const headers = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row)))
  );
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });

  const colWidths = headers.map((key) => {
    const maxCellLength = rows.reduce((max, row) => {
      const value = row[key];
      const currentLength = value === undefined || value === null ? 0 : String(value).length;
      return Math.max(max, currentLength);
    }, 0);

    return { wch: Math.min(70, Math.max(16, key.length, maxCellLength)) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  const name = filename || `leads_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
}
