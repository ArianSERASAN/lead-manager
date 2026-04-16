import { Lead } from '../types/domain';
import { buildLeadExportEntries } from './LeadExportUtils';

const MARGIN = 40;
const TITLE_SIZE = 16;
const BODY_SIZE = 10;
const LINE_HEIGHT = 12;
const BLOCK_GAP = 4;

type JsPdfInstance = import('jspdf').jsPDF;

function ensureSpace(doc: JsPdfInstance, y: number, linesNeeded = 1): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const required = linesNeeded * LINE_HEIGHT + BLOCK_GAP;
  if (y + required <= pageHeight - MARGIN) return y;
  doc.addPage();
  return MARGIN;
}

export async function exportLeadsToPDF(leads: Lead[], filename?: string): Promise<void> {
  if (leads.length === 0) return;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;

  leads.forEach((lead, leadIndex) => {
    if (leadIndex > 0) doc.addPage();

    let y = MARGIN;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(TITLE_SIZE);
    const title = `Lead ${leadIndex + 1}/${leads.length}: ${lead.name || lead.id}`;
    const titleLines = doc.splitTextToSize(title, contentWidth);
    y = ensureSpace(doc, y, titleLines.length);
    doc.text(titleLines, MARGIN, y);
    y += titleLines.length * LINE_HEIGHT + 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(BODY_SIZE);

    const entries = buildLeadExportEntries(lead);
    for (const { label, value } of entries) {
      const line = `${label}: ${value}`;
      const wrapped = doc.splitTextToSize(line, contentWidth);
      y = ensureSpace(doc, y, wrapped.length);
      doc.text(wrapped, MARGIN, y);
      y += wrapped.length * LINE_HEIGHT + BLOCK_GAP;
    }
  });

  const exportName = filename || `leads_export_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(exportName);
}
