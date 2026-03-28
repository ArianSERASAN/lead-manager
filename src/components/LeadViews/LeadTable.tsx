import { memo } from 'react';
import { Lead } from '../../types/domain';
import { Download, MessageSquare, Users, Eye, ChevronRight, CheckSquare, Square, Inbox } from 'lucide-react';
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

const SourceIcon = memo(({ source }: { source: Lead['source'] }) => {
  switch (source) {
    case 'landing': return <Users size={14} className="text-blue-500" />;
    case 'web-download': return <Download size={14} className="text-emerald-500" />;
    case 'web-contact': return <MessageSquare size={14} className="text-purple-500" />;
    case 'manual': return <Eye size={14} className="text-gray-400" />;
  }
});

const sourceLabel = (source: Lead['source']) => {
  switch (source) {
    case 'landing': return 'Landing';
    case 'web-download': return 'PDF';
    case 'web-contact': return 'Web';
    case 'manual': return 'Manual';
  }
};

const statusConfig = (status: Lead['status']) => {
  switch (status) {
    case 'nuevo': return { label: 'Nuevo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'contactado': return { label: 'Contactado', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'en-progreso': return { label: 'En Progreso', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'cerrado': return { label: 'Cerrado', cls: 'bg-red-50 text-red-700 border-red-200' };
    default: return { label: status, cls: 'bg-gray-50 text-gray-700 border-gray-200' };
  }
};

const LeadRow = memo(({ lead, isSelected, onSelect, onToggle }: {
  lead: Lead; isSelected: boolean; onSelect: () => void; onToggle: () => void;
}) => {
  const status = statusConfig(lead.status);
  return (
    <tr
      className={cn(
        "group cursor-pointer transition-colors duration-100",
        isSelected ? "bg-blue-50/60" : "hover:bg-gray-50/80",
        lead.isStale && "bg-orange-50/30"
      )}
      onClick={onSelect}
    >
      <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={onToggle} aria-label={isSelected ? 'Deseleccionar lead' : 'Seleccionar lead'} className="text-gray-300 hover:text-gray-500">
          {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="group-hover:text-gray-400" />}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {lead.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate leading-tight">{lead.name}</p>
            <p className="text-[11px] text-gray-400 truncate leading-tight">{lead.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-gray-500 hidden xl:table-cell">
        {lead.company || <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-3">
        <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-bold border", status.cls)}>
          {status.label}
        </span>
      </td>
      <td className="px-3 py-3 hidden lg:table-cell">
        <div className="flex items-center gap-1.5">
          <SourceIcon source={lead.source} />
          <span className="text-xs text-gray-500">{sourceLabel(lead.source)}</span>
        </div>
      </td>
      <td className="px-3 py-3">
        <ScoreBadge score={lead.score} size="sm" />
      </td>
      <td className="px-3 py-3 hidden lg:table-cell">
        <span className="text-xs text-gray-400">{formatRelativeTime(lead.createdAt)}</span>
      </td>
      <td className="pr-4 py-3">
        <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
      </td>
    </tr>
  );
});

export const LeadTable = memo(function LeadTable({ leads, selectedIds, onSelect, onToggleSelection, onToggleAll, onDelete }: LeadTableProps) {
  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-12 animate-fade-in">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
            <Inbox className="text-gray-400" size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Sin resultados</h3>
          <p className="text-sm text-gray-400 max-w-xs">No hay leads que coincidan con los filtros.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="pl-4 pr-2 py-3 w-10">
                <button
                  onClick={() => {
                    if (selectedIds.length === leads.length) onToggleAll([]);
                    else onToggleAll(leads.map(l => l.id));
                  }}
                  aria-label={selectedIds.length === leads.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  className="text-gray-300 hover:text-gray-500"
                >
                  {selectedIds.length === leads.length && leads.length > 0
                    ? <CheckSquare size={16} className="text-blue-600" />
                    : <Square size={16} />}
                </button>
              </th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contacto</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Empresa</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Origen</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Score</th>
              <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
              <th className="pr-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                isSelected={selectedIds.includes(lead.id)}
                onSelect={() => onSelect(lead)}
                onToggle={() => onToggleSelection(lead.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-50">
        {leads.map((lead) => {
          const status = statusConfig(lead.status);
          return (
            <div
              key={lead.id}
              className="p-3.5 hover:bg-gray-50/50 active:bg-gray-100/50 cursor-pointer"
              onClick={() => onSelect(lead)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-sm truncate">{lead.name}</p>
                    <ScoreBadge score={lead.score} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold border", status.cls)}>
                      {status.label}
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-300 shrink-0" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
