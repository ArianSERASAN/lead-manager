import { AlertCircle } from 'lucide-react';
import { Lead } from '../../types/domain';
import { daysSince, formatTimestamp } from '../../utils/format';
import { getLeadKey } from '../../lib/leads';

interface StaleLeadsWidgetProps {
  leads: Lead[];
  onViewAll: () => void;
}

export function StaleLeadsWidget({ leads, onViewAll }: StaleLeadsWidgetProps) {
  const staleLeads = leads
    .filter(l => l.isStale)
    .sort((a, b) => daysSince(a.updatedAt || a.createdAt) - daysSince(b.updatedAt || b.createdAt))
    .slice(0, 5);

  if (staleLeads.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="text-emerald-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Leads Estancados</h3>
        </div>
        <p className="text-sm text-gray-500">¡Bien! No hay leads estancados por el momento.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        <AlertCircle className="text-orange-600" size={24} />
        <h3 className="text-lg font-semibold text-gray-900">Leads Estancados</h3>
        <span className="ml-auto text-sm font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
          {leads.filter(l => l.isStale).length} total
        </span>
      </div>

      <div className="space-y-3 mb-4">
        {staleLeads.map(lead => {
          const days = daysSince(lead.updatedAt || lead.createdAt);
          return (
            <div key={getLeadKey(lead)} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{lead.name}</p>
                <p className="text-sm text-gray-600">{lead.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Última actividad: {formatTimestamp(lead.updatedAt || lead.createdAt)}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-bold text-orange-600">{days} días</p>
                <p className="text-xs text-orange-500">Sin actividad</p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onViewAll}
        className="w-full py-2 px-4 text-sm font-semibold text-orange-600 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors"
      >
        Ver todos los {leads.filter(l => l.isStale).length} leads estancados
      </button>
    </div>
  );
}
