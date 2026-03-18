import { Trash2, FileOutput, X, CheckSquare, MoreVertical, CheckCircle2, Clock, Loader2, Users } from 'lucide-react';
import { ExportButton } from './ExportButton';
import { Lead } from '../types';

interface SelectionHUDProps {
  selectedLeads: Lead[];
  onClear: () => void;
  onBulkStatusUpdate: (status: Lead['status']) => void;
  onBulkDelete: () => void;
}

export function SelectionHUD({ selectedLeads, onClear, onBulkStatusUpdate, onBulkDelete }: SelectionHUDProps) {
  if (selectedLeads.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-2xl animate-in slide-in-from-bottom-12 duration-300">
      <div className="bg-gray-900 border border-white/10 shadow-2xl rounded-3xl p-3 md:p-4 flex items-center justify-between backdrop-blur-md">
        
        {/* Selection Info */}
        <div className="flex items-center space-x-3 md:space-x-4 pl-2">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30">
            {selectedLeads.length}
          </div>
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm">Leads seleccionados</p>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Gestión Masiva</p>
          </div>
        </div>

        {/* Actions Group */}
        <div className="flex items-center space-x-2">
          {/* Status Dropdown */}
          <div className="relative group">
            <select 
              onChange={(e) => onBulkStatusUpdate(e.target.value as any)}
              className="appearance-none bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 pl-4 pr-10 rounded-2xl border border-white/5 outline-none transition-all cursor-pointer"
            >
              <option value="" className="bg-gray-900">Cambiar Estado...</option>
              <option value="nuevo" className="bg-gray-900">Marcar Nuevo</option>
              <option value="contactado" className="bg-gray-900">Marcar Contactado</option>
              <option value="en-progreso" className="bg-gray-900">En Progreso</option>
              <option value="cerrado" className="bg-gray-900">Cerrar Leads</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
               <CheckCircle2 size={14} />
            </div>
          </div>

          <ExportButton 
            selectedLeads={selectedLeads} 
            onExported={onClear} 
            variant="dark"
          />

          <button 
            onClick={onBulkDelete}
            className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20"
            title="Eliminar permanentemente"
          >
            <Trash2 size={20} />
          </button>

          <div className="w-px h-8 bg-white/10 mx-1 hidden xs:block" />

          <button 
            onClick={onClear}
            className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
            title="Cancelar selección"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
