import { Lead } from '../../types/domain';
import { Download, MessageSquare, Users, Eye, ChevronRight, Trash2, CheckSquare, Square, Search, Inbox } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ScoreBadge } from '../Scoring/ScoreBadge';
import { formatRelativeTime } from '../../utils/format';

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
      case 'web-download': return <Download size={16} className="text-emerald-500" />;
      case 'web-contact': return <MessageSquare size={16} className="text-purple-500" />;
      case 'manual': return <Eye size={16} className="text-gray-400" />;
    }
  };

  const getSourceLabel = (source: Lead['source']) => {
    switch (source) {
      case 'landing': return 'Landing';
      case 'web-download': return 'PDF';
      case 'web-contact': return 'Web';
      case 'manual': return 'Manual';
    }
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'nuevo': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'contactado': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'en-progreso': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'cerrado': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getStatusLabel = (status: Lead['status']) => {
    switch (status) {
      case 'nuevo': return 'Nuevo';
      case 'contactado': return 'Contactado';
      case 'en-progreso': return 'En Progreso';
      case 'cerrado': return 'Cerrado';
      default: return status;
    }
  };

  // Empty state
  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-12 animate-fade-in">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Inbox className="text-gray-400" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            No hay leads que coincidan con los filtros actuales. Prueba a ajustar los criterios de búsqueda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white rounded-2xl border border-gray-200/80 shadow-card animate-fade-in">
      {/* Table for Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="px-5 py-4 w-10">
                <button
                  onClick={() => {
                    if (selectedIds.length === leads.length) onToggleAll([])
                    else onToggleAll(leads.map(l => l.id))
                  }}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                >
                  {selectedIds.length === leads.length && leads.length > 0 ? (
                    <CheckSquare size={18} className="text-blue-600" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Empresa</th>
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Origen</th>
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Score</th>
              <th className="px-5 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
              <th className="px-5 py-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead, index) => (
              <tr
                key={lead.id}
                className={cn(
                  "row-interactive cursor-pointer group",
                  selectedIds.includes(lead.id) && "bg-blue-50/50",
                  lead.isStale && "bg-orange-50/30"
                )}
                style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                onClick={() => onSelect(lead)}
              >
                <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleSelection(lead.id)}
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                  >
                    {selectedIds.includes(lead.id) ? (
                      <CheckSquare size={18} className="text-blue-600" />
                    ) : (
                      <Square size={18} className="group-hover:text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{lead.name}</p>
                      {lead.phone && <p className="text-[11px] text-gray-400 truncate">{lead.phone}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-gray-600 truncate block max-w-[200px]">
                    {lead.email}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-500">
                  {lead.company || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-bold", getStatusColor(lead.status))}>
                    {getStatusLabel(lead.status)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    {getSourceIcon(lead.source)}
                    <span className="text-xs text-gray-500 font-medium">{getSourceLabel(lead.source)}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <ScoreBadge score={lead.score} size="sm" />
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs text-gray-400">{formatRelativeTime(lead.createdAt)}</span>
                </td>
                <td className="px-5 py-3.5">
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-100">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="p-4 hover:bg-gray-50/50 transition-colors active:bg-gray-100/50 cursor-pointer"
            onClick={() => onSelect(lead)}
          >
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{lead.name}</p>
                  <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelection(lead.id); }}
                className="text-gray-300 ml-2"
              >
                {selectedIds.includes(lead.id) ? (
                  <CheckSquare size={18} className="text-blue-600" />
                ) : (
                  <Square size={18} />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between pl-12">
              <div className="flex items-center gap-2">
                {getSourceIcon(lead.source)}
                <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-bold", getStatusColor(lead.status))}>
                  {getStatusLabel(lead.status)}
                </span>
                <ScoreBadge score={lead.score} size="sm" />
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
