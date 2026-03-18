import { Lead } from '../types';
import { Download, MessageSquare, Users, Eye, Phone, Mail, ChevronRight, Trash2, CheckCircle, Square, CheckSquare } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    }
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'nuevo': return 'bg-blue-100 text-blue-700';
      case 'contactado': return 'bg-yellow-100 text-yellow-700';
      case 'en-progreso': return 'bg-purple-100 text-purple-700';
      case 'cerrado': return 'bg-gray-100 text-gray-700';
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
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                 >
                    {selectedIds.length === leads.length && leads.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                 </button>
              </th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Lead</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Origen</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Estado</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider">Fecha</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase text-gray-500 tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => {
              const isSelected = selectedIds.includes(lead.id);
              return (
                <tr 
                  key={lead.id} 
                  className={cn(
                    "hover:bg-gray-50 transition-all group border-l-4", 
                    isSelected ? "bg-blue-50/50 border-blue-500 shadow-sm" : "border-transparent"
                  )}
                >
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => onToggleSelection(lead.id)}
                      className={cn("transition-all duration-200 transform", isSelected ? "text-blue-600 scale-110" : "text-gray-300 group-hover:text-gray-400")}
                    >
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{lead.name}</div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-2">
                      {getSourceIcon(lead.source)}
                      <span className="capitalize text-gray-600">{lead.source.replace('-', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium capitalize", getStatusColor(lead.status))}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => onSelect(lead)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Ver Detalles"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(lead.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Eliminar Lead"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card List for Mobile */}
      <div className="md:hidden divide-y divide-gray-100">
        {leads.map((lead) => {
          const isSelected = selectedIds.includes(lead.id);
          return (
            <div 
              key={lead.id} 
              className={cn("p-4 flex items-center space-x-4", isSelected && "bg-blue-50/50")}
            >
              <button 
                onClick={() => onToggleSelection(lead.id)}
                className={cn("transition-colors", isSelected ? "text-blue-600" : "text-gray-300")}
              >
                {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
              </button>
              
              <div className="flex-1 min-w-0" onClick={() => onSelect(lead)}>
                <div className="flex items-center space-x-2 mb-1">
                  {getSourceIcon(lead.source)}
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusColor(lead.status))}>
                    {lead.status}
                  </span>
                </div>
                <div className="font-bold text-gray-900 truncate">{lead.name}</div>
                <div className="text-xs text-gray-500 truncate">{lead.email}</div>
              </div>

              <div className="flex flex-col space-y-2">
                 <button onClick={() => onDelete(lead.id)} className="p-2 text-gray-300 hover:text-red-500 active:scale-90 transition-all">
                    <Trash2 size={18} />
                 </button>
                 <div className="text-gray-300 p-2">
                    <ChevronRight size={20} />
                 </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {leads.length === 0 && (
        <div className="py-20 text-center text-gray-500">
           No hay leads que mostrar.
        </div>
      )}
    </div>
  );
}
