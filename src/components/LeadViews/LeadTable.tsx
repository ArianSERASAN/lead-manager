import { memo } from 'react';
import { Lead } from '../../types/domain';
import { Download, MessageSquare, Users, Eye, ChevronRight, CheckSquare, Square, Inbox } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ScoreBadge } from '../Scoring/ScoreBadge';
import { formatTimestamp } from '../../utils/format';
import { getLeadKey } from '../../lib/leads';

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
  loading?: boolean;
  hasActiveFilters?: boolean;
  onNewLead?: () => void;
}

const SourceIcon = memo(({ source }: { source: Lead['source'] }) => {
  switch (source) {
    case 'landing': return <Users size={14} className="text-primary-500" />;
    case 'web-download': return <Download size={14} className="text-emerald-500" />;
    case 'web-contact': return <MessageSquare size={14} className="text-purple-500" />;
    case 'manual': return <Eye size={14} className="text-gray-400" />;
    case 'csv-import': return <Eye size={14} className="text-orange-400" />;
    default: return <Eye size={14} className="text-gray-300" />;
  }
});

const sourceLabel = (source: Lead['source']) => {
  switch (source) {
    case 'landing': return 'Landing';
    case 'web-download': return 'PDF';
    case 'web-contact': return 'Web';
    case 'manual': return 'Manual';
    case 'csv-import': return 'Importado';
    default: return source || '—';
  }
};

const statusConfig = (status: Lead['status']) => {
  switch (status) {
    case 'nuevo': return { label: 'Nuevo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'contactado': return { label: 'Contactado', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'en-progreso': return { label: 'En Progreso', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'cerrado': return { label: 'Cerrado', cls: 'bg-primary-50 text-primary-700 border-primary-200' };
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
        isSelected ? "bg-primary-50/60" : "hover:bg-gray-50/80",
        lead.isStale && "bg-orange-50/30"
      )}
      onClick={onSelect}
    >
      <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={onToggle} aria-label={isSelected ? 'Deseleccionar lead' : 'Seleccionar lead'} className="text-gray-300 hover:text-gray-500">
          {isSelected ? <CheckSquare size={16} className="text-primary-600" /> : <Square size={16} className="group-hover:text-gray-400" />}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
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
        <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors duration-300", status.cls)}>
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
        <span className="text-xs text-gray-400">{formatTimestamp(lead.createdAt)}</span>
      </td>
      <td className="pr-4 py-3">
        <ChevronRight size={14} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
      </td>
    </tr>
  );
});

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="pl-4 pr-2 py-3"><div className="w-4 h-4 bg-gray-100 rounded" /></td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-100 shrink-0" />
          <div className="space-y-1.5">
            <div className="w-28 h-3 bg-gray-100 rounded" />
            <div className="w-20 h-2.5 bg-gray-100 rounded" />
          </div>
        </div>
      </td>
      <td className="px-3 py-3 hidden xl:table-cell"><div className="w-20 h-3 bg-gray-100 rounded" /></td>
      <td className="px-3 py-3"><div className="w-16 h-5 bg-gray-100 rounded-md" /></td>
      <td className="px-3 py-3 hidden lg:table-cell"><div className="w-12 h-3 bg-gray-100 rounded" /></td>
      <td className="px-3 py-3"><div className="w-8 h-5 bg-gray-100 rounded-md" /></td>
      <td className="px-3 py-3 hidden lg:table-cell"><div className="w-16 h-3 bg-gray-100 rounded" /></td>
      <td className="pr-4 py-3"><div className="w-3 h-3 bg-gray-100 rounded" /></td>
    </tr>
  );
}

export const LeadTable = memo(function LeadTable({ leads, selectedIds, onSelect, onToggleSelection, onToggleAll, onDelete, loading = false, hasActiveFilters = false, onNewLead }: LeadTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="pl-4 pr-2 py-3 w-10"><div className="w-4 h-4 bg-gray-100 rounded animate-pulse" /></th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contacto</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Empresa</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Origen</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                <th className="pr-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-gray-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3.5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="w-24 h-3 bg-gray-100 rounded" />
                    <div className="w-8 h-5 bg-gray-100 rounded-md" />
                  </div>
                  <div className="w-32 h-2.5 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card">
        {hasActiveFilters ? (
          <EmptyState
            icon={<Inbox size={26} />}
            title="Sin resultados"
            subtitle="No hay leads que coincidan con los filtros activos. Prueba a ampliar los criterios de búsqueda."
          />
        ) : (
          <EmptyState
            icon={<Inbox size={26} />}
            title="Aún no hay leads"
            subtitle="Los leads de los formularios web aparecerán aquí automáticamente. También puedes crear uno manualmente."
            action={onNewLead ? { label: 'Crear lead', onClick: onNewLead } : undefined}
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-auto max-h-[calc(100vh-300px)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-white sticky top-0 z-10">
              <th className="pl-4 pr-2 py-3 w-10">
                <button
                  onClick={() => {
                    if (selectedIds.length === leads.length) onToggleAll([]);
                    else onToggleAll(leads.map((lead) => getLeadKey(lead)));
                  }}
                  aria-label={selectedIds.length === leads.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  className="text-gray-300 hover:text-gray-500"
                >
                  {selectedIds.length === leads.length && leads.length > 0
                    ? <CheckSquare size={16} className="text-primary-600" />
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
          <tbody className="divide-y divide-gray-50 stagger-children">
            {leads.map((lead) => (
              <LeadRow
                key={getLeadKey(lead)}
                lead={lead}
                isSelected={selectedIds.includes(getLeadKey(lead))}
                onSelect={() => onSelect(lead)}
                onToggle={() => onToggleSelection(getLeadKey(lead))}
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
              key={getLeadKey(lead)}
              className="p-3.5 hover:bg-gray-50/50 active:bg-gray-100/50 cursor-pointer"
              onClick={() => onSelect(lead)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
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
                  <p className="text-[10px] text-gray-300 mt-0.5">{formatTimestamp(lead.createdAt)}</p>
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
