import { Download } from 'lucide-react';
import { Lead } from '../types';

interface ExportButtonProps {
  selectedLeads: Lead[];
  onExported?: () => void;
}

export function ExportButton({ selectedLeads, onExported }: ExportButtonProps) {
  const downloadCSV = () => {
    if (selectedLeads.length === 0) return;

    // Define CSV headers
    const headers = ['Nombre', 'Email', 'Teléfono', 'Origen', 'Estado', 'Fecha', 'Mensaje', 'Notas'];
    
    // Map leads to rows
    const rows = selectedLeads.map(lead => [
      lead.name,
      lead.email,
      lead.phone,
      lead.source,
      lead.status,
      lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleString('es-ES') : '',
      `"${(lead.message || '').replace(/"/g, '""')}"`,
      `"${(lead.notes || '').replace(/"/g, '""')}"`
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create a blob and download
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_serasan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (onExported) onExported();
  };

  return (
    <button
      onClick={downloadCSV}
      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm"
    >
      <Download size={18} />
      <span>Exportar CSV</span>
    </button>
  );
}
