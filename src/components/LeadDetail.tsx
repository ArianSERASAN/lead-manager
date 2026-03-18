import { Lead } from '../types';
import { useState, useEffect } from 'react';
import { X, Phone, Mail, Building, Clock, MapPin, Globe, CreditCard, Download, Trash2, Save, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div>
             <h3 className="text-xl font-bold text-gray-900">{lead.name}</h3>
             <p className="text-gray-500 text-sm mt-0.5">{lead.email}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoItem icon={Clock} label="Capturado el" value={formatDate(lead.createdAt)} />
            <InfoItem icon={Globe} label="Origen" value={lead.source.replace('-', ' ')} className="capitalize" />
            
            {lead.phone && <InfoItem icon={Phone} label="Teléfono" value={lead.phone} />}
            {lead.company && <InfoItem icon={Building} label="Empresa" value={lead.company} />}
            {lead.resource && <InfoItem icon={Download} label="Recurso solicitado" value={lead.resource} />}
            {lead.data?.surface && <InfoItem icon={CreditCard} label="Superficie" value={`${lead.data.surface} m²`} />}
            {lead.data?.locality && <InfoItem icon={MapPin} label="Localidad" value={lead.data.locality} />}
          </div>

          {/* Message/Comments */}
          {(lead.message || lead.data?.mensaje) && (
            <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
               <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Mensaje del cliente</label>
               <p className="text-gray-700 text-sm whitespace-pre-wrap">{lead.message || lead.data?.mensaje}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, className = "" }: { icon: any, label: string, value: string, className?: string }) {
  return (
    <div className="flex space-x-3">
      <div className="text-gray-300">
         <Icon size={18} />
      </div>
      <div>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</div>
        <div className={`text-sm text-gray-700 font-medium ${className}`}>{value}</div>
      </div>
    </div>
  );
}
