import { XCircle, X, CheckCircle2 } from 'lucide-react';
import { LeadStatus } from '../../types/domain';

interface SelectionHUDProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: LeadStatus) => void;
  onBulkCancel: () => void;
}

export function SelectionHUD({ selectedCount, onClearSelection, onBulkStatusUpdate, onBulkCancel }: SelectionHUDProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] max-w-4xl hud-enter">
      <div className="bg-gray-900/80 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[28px] sm:rounded-[40px] p-3 sm:p-4 md:p-5 flex items-center justify-between gap-2">

        {/* Selection Info */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 pl-1 sm:pl-2 min-w-0 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-sm sm:text-base font-black shadow-lg shadow-blue-500/30">
            {selectedCount}
          </div>
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm">Leads seleccionados</p>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Gestión Masiva</p>
          </div>
        </div>

        {/* Actions Group */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          {/* Status Dropdown */}
          <div className="relative group min-w-0">
            <select
              onChange={(e) => onBulkStatusUpdate(e.target.value as LeadStatus)}
              className="appearance-none bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-bold py-2 sm:py-2.5 pl-2.5 sm:pl-4 pr-7 sm:pr-10 rounded-xl sm:rounded-2xl border border-white/5 outline-none transition-colors duration-150 cursor-pointer max-w-[130px] sm:max-w-none truncate"
            >
              <option value="" className="bg-gray-900">Cambiar Estado...</option>
              <option value="nuevo" className="bg-gray-900">Marcar Nuevo</option>
              <option value="contactado" className="bg-gray-900">Marcar Contactado</option>
              <option value="en-progreso" className="bg-gray-900">En Progreso</option>
              <option value="cerrado" className="bg-gray-900">Cerrar (ganado)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
              <CheckCircle2 size={14} />
            </div>
          </div>

          <button
            onClick={onBulkCancel}
            className="p-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded-2xl transition-colors duration-150 border border-orange-500/20 btn-press"
            title="Cancelar leads seleccionados"
          >
            <XCircle size={20} />
          </button>

          <div className="w-px h-8 bg-white/10 mx-1 hidden xs:block" />

          <button
            onClick={onClearSelection}
            className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-colors duration-150"
            title="Cancelar selección"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
