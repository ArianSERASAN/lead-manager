import { Lead } from '../types';
import { useState, useEffect } from 'react';
import { X, Phone, Mail, Building, Clock, MapPin, Globe, CreditCard, Download, Trash2, Save, Loader2, Copy } from 'lucide-react';

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onUpdateStatus: (id: string, status: Lead['status']) => void;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onDelete: (id: string) => void;
}

export function LeadDetail({ lead, onClose, onUpdateStatus, onUpdateNotes, onDelete }: LeadDetailProps) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setNotes(lead.notes || '');
  }, [lead.id]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    await onUpdateNotes(lead.id, notes);
    setSavingNotes(false);
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('es-ES', { 
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md overflow-y-auto">
      <div className="bg-white/90 backdrop-blur-2xl w-full max-w-2xl rounded-[40px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-white overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-10 pb-8 flex justify-between items-start">
          <div className="flex-1 min-w-0">
             <div className="flex items-center space-x-3 mb-1">
                <h3 className="text-3xl font-black text-gray-900 tracking-tight truncate">{lead.name}</h3>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(lead.name);
                    // could show a mini-toast or change icon
                  }}
                  className="p-1.5 text-gray-300 hover:text-blue-500 transition-colors"
                  title="Copiar nombre"
                >
                  <Copy size={16} />
                </button>
             </div>
             <div className="flex items-center space-x-2">
                <p className="text-blue-500 font-bold text-sm truncate">{lead.email}</p>
                <button 
                  onClick={() => navigator.clipboard.writeText(lead.email)}
                  className="p-1 text-gray-300 hover:text-blue-500 transition-colors"
                >
                  <Copy size={12} />
                </button>
             </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => {
                if (window.confirm('¿Estás seguro de que quieres eliminar este lead?')) {
                  onDelete(lead.id);
                }
              }}
              className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
              title="Eliminar Lead"
            >
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Buttons (Mobile Optimized) */}
        <div className="grid grid-cols-2 gap-4 p-6 bg-gray-50/50">
          <a
            href={`tel:${lead.phone}`}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm"
          >
            <Phone size={18} />
            <span>Llamar</span>
          </a>
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center justify-center space-x-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 py-3 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-sm"
          >
            <Mail size={18} />
            <span>Email</span>
          </a>
        </div>

        {/* Info Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Status Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 px-0.5">Estado</label>
              <select
                value={lead.status}
                onChange={(e) => onUpdateStatus(lead.id, e.target.value as any)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="nuevo">Nuevo</option>
                <option value="contactado">Contactado</option>
                <option value="en-progreso">En Progreso</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100">
             <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block px-0.5">Notas de Seguimiento</label>
                <button 
                  onClick={handleSaveNotes}
                  disabled={savingNotes || notes === (lead.notes || '')}
                  className="flex items-center space-x-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-30 disabled:cursor-not-allowed uppercase transition-all"
                >
                  {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  <span>{savingNotes ? 'Guardando...' : 'Guardar Notas'}</span>
                </button>
             </div>
             <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Escribe aquí notas sobre llamadas, reuniones..."
                className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-700 placeholder:text-gray-400 min-h-[80px] p-0 resize-none outline-none"
             />
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 border-t border-gray-100 pt-6">
            <DetailItem label="Origen" value={lead.source.replace('-', ' ')} icon={Globe} />
            <DetailItem label="Fecha" value={formatDate(lead.createdAt)} icon={Clock} />
            
            {/* Dynamic Metadata from lead.data */}
            {Object.entries(lead.data || {}).map(([key, value]) => {
              // Skip fields already shown or internal ID
              const skipFields = [
                'id', 'name', 'nombre', 'email', 'phone', 'telefono', 
                'status', 'status_lead', 'createdAt', 'fecha', 'notes', 'notas',
                'source', 'source_lead', 'recurso', 'mensaje', 'message', 'company', 'empresa'
              ];
              if (skipFields.includes(key) || typeof value === 'object') return null;
              
              return (
                <DetailItem 
                  key={key} 
                  label={key.replace(/_/g, ' ')} 
                  value={String(value)} 
                  icon={Building} 
                />
              );
            })}
          </div>

          {/* Message / Resource section */}
          {(lead.message || lead.resource) && (
            <div className="border-t border-gray-100 pt-6 space-y-4">
              {lead.resource && (
                <div className="bg-blue-50/50 rounded-xl p-3 flex items-center space-x-3 text-blue-700">
                  <Download size={18} />
                  <span className="text-sm font-bold">Recurso: {lead.resource}</span>
                </div>
              )}
              {lead.message && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 px-0.5">Mensaje del cliente</label>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 italic border border-gray-100">
                    "{lead.message}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  if (!value || value === '—') return null;
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-0.5 truncate">{label}</label>
      <div className="flex items-center space-x-2 text-gray-700">
        <Icon size={14} className="text-gray-300 shrink-0" />
        <span className="text-sm font-medium truncate capitalize">{value}</span>
      </div>
    </div>
  );
}
