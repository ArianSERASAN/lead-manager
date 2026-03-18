import { Download } from 'lucide-react';
import { Lead } from '../types';

interface ExportButtonProps {
  selectedLeads: Lead[];
  onExported?: () => void;
  variant?: 'light' | 'dark';
}

export function ExportButton({ selectedLeads, onExported, variant = 'light' }: ExportButtonProps) {
  const downloadCSV = () => {
    if (selectedLeads.length === 0) return;

    // Define CSV headers
    const headers = ['Nombre', 'Email', 'Teléfono', 'Origen', 'Estado', 'Fecha', 'Notas', 'Datos Adicionales'];
    
    // Map leads to rows
    const rows = selectedLeads.map(lead => [
      lead.name,
      lead.email,
      lead.phone || '',
      lead.source,
      lead.status,
      lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleString('es-ES') : '',
      `"${(lead.notes || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(lead.data || {}).replace(/"/g, '""')}"`
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create a blob and download (with BOM for Excel UTF-8)
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

  const buttonStyles = variant === 'dark' 
    ? "p-2.5 bg-white/10 hover:bg-white text-white hover:text-gray-900 rounded-2xl transition-all border border-white/5 flex items-center space-x-2"
    : "p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all border border-blue-100 flex items-center space-x-2";

  return (
    <button
      onClick={downloadCSV}
      className={buttonStyles}
      title="Exportar seleccionados a CSV"
    >
      <Download size={20} />
      <span className="text-xs font-bold hidden md:inline">Exportar</span>
    </button>
  );
}
