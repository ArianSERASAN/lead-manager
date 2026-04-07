import { useMemo, useState } from 'react';
import { Lead, LeadStatus, toJSDate } from '../types/domain';
import { useLeadStore } from '../stores/useLeadStore';
import { formatTimestamp } from '../utils/format';
import { STATUS_CONFIG } from '../utils/constants';
import { Archive, CheckCircle2, XCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';

/** Etiqueta del stage del pipeline en el que estaba el lead antes del cierre/cancelación */
function PipelineStageBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${cfg.bgColor} ${cfg.color} ${cfg.borderColor}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'cerrado' | 'cancelado' }) {
  if (status === 'cerrado') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-200">
        <CheckCircle2 size={12} />
        Cerrado (ganado)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
      <XCircle size={12} />
      Cancelado
    </span>
  );
}

type SortField = 'closedAt' | 'name' | 'status';
type SortDir = 'asc' | 'desc';

export function HistorialPage() {
  const leads = useLeadStore((s) => s.leads);
  const loading = useLeadStore((s) => s.loading);
  const [filterStatus, setFilterStatus] = useState<'all' | 'cerrado' | 'cancelado'>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('closedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const historialLeads = useMemo(() => {
    return leads.filter(l => l.status === 'cerrado' || l.status === 'cancelado');
  }, [leads]);

  const filtered = useMemo(() => {
    let result = historialLeads;

    if (filterStatus !== 'all') {
      result = result.filter(l => l.status === filterStatus);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.company?.toLowerCase().includes(q) ?? false) ||
        (l.cancellationReason?.toLowerCase().includes(q) ?? false) ||
        (l.closedByName?.toLowerCase().includes(q) ?? false)
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'closedAt') {
        const da = toJSDate(a.closedAt || a.updatedAt || a.createdAt);
        const db = toJSDate(b.closedAt || b.updatedAt || b.createdAt);
        cmp = da.getTime() - db.getTime();
      } else if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [historialLeads, filterStatus, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="text-primary-500" />
      : <ChevronUp size={12} className="text-primary-500" />;
  };

  /** Determina el stage en el que estaba cuando fue cerrado/cancelado */
  const getPreviousStage = (lead: Lead): LeadStatus | null => {
    if (!lead.stateHistory || lead.stateHistory.length === 0) return null;
    const lastChange = [...lead.stateHistory]
      .filter(e => e.toStatus === lead.status)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    return lastChange?.fromStatus ?? null;
  };

  const totals = useMemo(() => ({
    cerrado: historialLeads.filter(l => l.status === 'cerrado').length,
    cancelado: historialLeads.filter(l => l.status === 'cancelado').length,
  }), [historialLeads]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-2">
            <div className="skeleton w-28 h-5" />
            <div className="skeleton w-40 h-3" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton w-28 h-7 rounded-xl" />
            <div className="skeleton w-28 h-7 rounded-xl" />
          </div>
        </div>
        {/* Filters skeleton */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="skeleton flex-1 h-9 rounded-xl" />
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton w-20 h-9 rounded-xl" />)}
          </div>
        </div>
        {/* Table skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3 flex gap-6">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-3 w-16" />)}
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-gray-50 last:border-0">
              <div className="skeleton w-7 h-7 rounded-lg shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="skeleton w-32 h-3" />
                <div className="skeleton w-44 h-2.5" />
              </div>
              <div className="skeleton w-20 h-5 rounded-lg" />
              <div className="skeleton w-16 h-5 rounded-lg hidden lg:block" />
              <div className="skeleton w-24 h-2.5 hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Archive size={20} className="text-gray-400" />
            Historial
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Leads cerrados y cancelados</p>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 rounded-xl border border-primary-100">
            <CheckCircle2 size={14} className="text-primary-600" />
            <span className="text-xs font-bold text-primary-700">{totals.cerrado} cerrados</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl border border-gray-200">
            <XCircle size={14} className="text-gray-500" />
            <span className="text-xs font-bold text-gray-600">{totals.cancelado} cancelados</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, motivo..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'cerrado', 'cancelado'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors duration-100 border ${
                filterStatus === s
                  ? s === 'cerrado'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : s === 'cancelado'
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {s === 'all' ? 'Todos' : s === 'cerrado' ? 'Cerrados' : 'Cancelados'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Archive size={24} className="text-gray-300" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Sin registros</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">
              Aquí aparecerán los leads cerrados (ganados) y los cancelados.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3">
                      <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600">
                        Contacto <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-3 py-3">
                      <button onClick={() => toggleSort('status')} className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600">
                        Estado <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Etapa anterior
                    </th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-3 py-3">
                      <button onClick={() => toggleSort('closedAt')} className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600">
                        Fecha <SortIcon field="closedAt" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Responsable
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((lead) => {
                    const prevStage = getPreviousStage(lead);
                    const isExpanded = selectedLead?.id === lead.id;
                    return (
                      <>
                        <tr
                          key={lead.id}
                          className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                          onClick={() => setSelectedLead(isExpanded ? null : lead)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${
                                lead.status === 'cerrado'
                                  ? 'bg-gradient-to-br from-primary-500 to-indigo-600'
                                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
                              }`}>
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 text-sm">{lead.name}</p>
                                <p className="text-[11px] text-gray-400">{lead.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={lead.status as 'cerrado' | 'cancelado'} />
                          </td>
                          <td className="px-3 py-3">
                            {prevStage ? (
                              <PipelineStageBadge status={prevStage} />
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 max-w-[200px]">
                            {lead.cancellationReason ? (
                              <span className="text-xs text-gray-600 truncate block">{lead.cancellationReason}</span>
                            ) : lead.status === 'cerrado' ? (
                              <span className="text-xs text-primary-400 font-medium">Deal ganado</span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-xs text-gray-500">
                              {lead.closedAt
                                ? formatTimestamp(lead.closedAt)
                                : formatTimestamp(lead.updatedAt || lead.createdAt)}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-xs text-gray-500">
                              {lead.closedByName || lead.closedBy || <span className="text-gray-300">—</span>}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded state history */}
                        {isExpanded && lead.stateHistory && lead.stateHistory.length > 0 && (
                          <tr key={`${lead.id}-history`} className="bg-primary-50/30">
                            <td colSpan={6} className="px-6 py-4">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Historial de cambios de estado
                              </p>
                              <div className="space-y-2">
                                {[...lead.stateHistory]
                                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                  .map((change, i) => (
                                    <div key={i} className="flex items-center gap-3 text-xs text-gray-600">
                                      <span className="text-gray-400 shrink-0 font-mono text-[10px]">
                                        {new Date(change.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      <PipelineStageBadge status={change.fromStatus} />
                                      <span className="text-gray-300">→</span>
                                      <PipelineStageBadge status={change.toStatus} />
                                      {change.reason && (
                                        <span className="text-gray-500 italic">· {change.reason}</span>
                                      )}
                                      {change.actorName && (
                                        <span className="text-gray-400 ml-auto shrink-0">por {change.actorName}</span>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map((lead) => {
                const prevStage = getPreviousStage(lead);
                const isExpanded = selectedLead?.id === lead.id;
                return (
                  <div key={lead.id}>
                    <div
                      className="p-3.5 cursor-pointer active:bg-gray-50"
                      onClick={() => setSelectedLead(isExpanded ? null : lead)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 ${
                          lead.status === 'cerrado'
                            ? 'bg-gradient-to-br from-primary-500 to-indigo-600'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="font-semibold text-gray-900 text-sm truncate">{lead.name}</p>
                            <StatusBadge status={lead.status as 'cerrado' | 'cancelado'} />
                          </div>
                          <p className="text-xs text-gray-400 truncate mb-1.5">{lead.email}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            {prevStage && <PipelineStageBadge status={prevStage} />}
                            {lead.cancellationReason && (
                              <span className="text-xs text-gray-500 italic truncate max-w-[150px]">
                                {lead.cancellationReason}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-gray-300">
                              {lead.closedAt
                                ? formatTimestamp(lead.closedAt)
                                : formatTimestamp(lead.updatedAt || lead.createdAt)}
                            </span>
                            {lead.closedByName && (
                              <span className="text-[10px] text-gray-400">
                                por {lead.closedByName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile expanded history */}
                    {isExpanded && lead.stateHistory && lead.stateHistory.length > 0 && (
                      <div className="bg-primary-50/30 px-4 py-3 border-t border-primary-100/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Historial de estados
                        </p>
                        <div className="space-y-2">
                          {[...lead.stateHistory]
                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                            .map((change, i) => (
                              <div key={i} className="space-y-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <PipelineStageBadge status={change.fromStatus} />
                                  <span className="text-gray-300 text-xs">→</span>
                                  <PipelineStageBadge status={change.toStatus} />
                                </div>
                                <p className="text-[10px] text-gray-400">
                                  {new Date(change.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {change.actorName && ` · ${change.actorName}`}
                                  {change.reason && ` · ${change.reason}`}
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'} en el historial
        {search && ` · filtrando por "${search}"`}
      </p>
    </div>
  );
}
