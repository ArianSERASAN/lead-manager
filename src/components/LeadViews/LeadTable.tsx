import { Lead } from '../../types/domain';
import { Download, MessageSquare, Users, Eye, Phone, Mail, ChevronRight, Trash2, CheckCircle, Square, CheckSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ScoreBadge } from '../Scoring/ScoreBadge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LeadTableProps {
  leads: Lead[];
  selectedIds: string[];
  onSelect: (lead: Lead) => void;
  onToggleSelection: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  onDelete: (id: string) => void;
}

export function LeadTable({ leads, selectedIds, onSelect, onToggleSelection, onToggleAll, onDelete }: LeadTableProps) {
  const getSourceIcon = (source: Lead['source']) => {
    switch (source) {
      case 'landing': return <Users size={16} className="text-blue-500" />;
      case 'web-download': return <Download size={16} className="text-green-500" />;
      case 'web-contact': return <MessageSquare size={16} className="text-purple-500" />;
      case 'manual': return <Eye size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'nuevo': return 'bg-emerald-100 text-emerald-700';
      case 'contactado': return 'bg-amber-100 text-amber-700';
      case 'en-progreso': return 'bg-purple-100 text-purple-700';
      case 'cerrado': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Table for Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 w-10">
                <button
                  onClick={() => {
                    if (selectedIds.length === leads.length) onToggleAll([])
                    else onToggleAll(leads.map(l => l.id))
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {selectedIds.length === leads.length && leads.length > 0 ? (
                    <CheckSquare size={20} className="text-blue-600" />
                  ) : (
                    <Square size={20} />
                  )}
                </button>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Empresa</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Origen</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Asignado</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Puntuación</th>
              <th className="px-6 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <button
                    onClick={() => onToggleSelection(lead.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {selectedIds.includes(lead.id) ? (
                      <CheckSquare size={20} className="text-blue-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900">{lead.name}</p>
                </td>
                <td className="px-6 py-4">
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline text-sm">
                    {lead.email}
                  </a>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {lead.company || '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={cn("px-3 py-1 rounded-full text-xs font-bold", getStatusColor(lead.status))}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {getSourceIcon(lead.source)}
                </td>
                <td className="px-6 py-4 text-sm">
                  {lead.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                        {lead.assignedTo.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-gray-700">Asignado</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <ScoreBadge score={lead.score} size="sm" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onSelect(lead)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {leads.map((lead) => (
          <div key={lead.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="font-bold text-gray-900">{lead.name}</p>
                <p className="text-xs text-gray-500">{lead.email}</p>
              </div>
              <button
                onClick={() => onToggleSelection(lead.id)}
                className="text-gray-400"
              >
                {selectedIds.includes(lead.id) ? (
                  <CheckSquare size={20} className="text-blue-600" />
                ) : (
                  <Square size={20} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getSourceIcon(lead.source)}
                <span className={cn("px-2 py-1 rounded text-xs font-bold", getStatusColor(lead.status))}>
                  {lead.status}
                </span>
              </div>
              <button
                onClick={() => onSelect(lead)}
                className="text-blue-600 hover:text-blue-700"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
