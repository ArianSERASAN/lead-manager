import { useState } from 'react';
import { XCircle, X, CheckCircle2, UserPlus, Tag, Download, Loader2 } from 'lucide-react';
import { LeadStatus } from '../../types/domain';

interface SelectionHUDProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: LeadStatus) => void;
  onBulkCancel: () => void;
  onBulkAssign?: (userId: string) => void;
  onBulkAddTag?: (tag: string) => void;
  onExportSelected?: () => void;
  users?: { uid: string; name: string }[];
  allTags?: string[];
  disabled?: boolean;
}

export function SelectionHUD({
  selectedCount,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkCancel,
  onBulkAssign,
  onBulkAddTag,
  onExportSelected,
  users = [],
  allTags = [],
  disabled = false,
}: SelectionHUDProps) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagValue, setTagValue] = useState('');

  if (selectedCount === 0) return null;

  const handleTagSubmit = () => {
    const trimmed = tagValue.trim();
    if (trimmed && onBulkAddTag) {
      onBulkAddTag(trimmed);
      setTagValue('');
      setShowTagInput(false);
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] max-w-4xl hud-enter">
      <div className="bg-gray-900/80 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-[28px] sm:rounded-[40px] p-3 sm:p-4 md:p-5 flex items-center justify-between gap-2">

        {/* Selection Info */}
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 pl-1 sm:pl-2 min-w-0 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-sm sm:text-base font-black shadow-lg shadow-primary-500/30">
            {selectedCount}
          </div>
          <div className="hidden sm:block">
            <p className="text-white font-bold text-sm">Leads seleccionados</p>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Gesti&oacute;n Masiva</p>
          </div>
        </div>

        {/* Actions Group */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
          {disabled && <Loader2 size={16} className="animate-spin text-white/60 shrink-0" />}
          {/* Status Dropdown */}
          <div className="relative group min-w-0">
            <select
              onChange={(e) => onBulkStatusUpdate(e.target.value as LeadStatus)}
              disabled={disabled}
              aria-label="Cambiar estado de leads seleccionados"
              className="appearance-none bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-bold py-2 sm:py-2.5 pl-2.5 sm:pl-4 pr-7 sm:pr-10 rounded-xl sm:rounded-2xl border border-white/5 outline-none transition-colors duration-150 cursor-pointer max-w-[130px] sm:max-w-none truncate disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* Assign Dropdown */}
          {onBulkAssign && users.length > 0 && (
            <div className="relative group min-w-0">
              <select
                onChange={(e) => {
                  if (e.target.value) onBulkAssign(e.target.value);
                  e.target.value = '';
                }}
                disabled={disabled}
                aria-label="Asignar leads seleccionados"
                className="appearance-none bg-white/10 hover:bg-white/20 text-white text-[11px] sm:text-xs font-bold py-2 sm:py-2.5 pl-2.5 sm:pl-4 pr-7 sm:pr-10 rounded-xl sm:rounded-2xl border border-white/5 outline-none transition-colors duration-150 cursor-pointer max-w-[120px] sm:max-w-none truncate disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="" className="bg-gray-900">Asignar...</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid} className="bg-gray-900">
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                <UserPlus size={14} />
              </div>
            </div>
          )}

          {/* Tag input */}
          {onBulkAddTag && (
            <>
              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tagValue}
                    onChange={(e) => setTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTagSubmit();
                      if (e.key === 'Escape') { setShowTagInput(false); setTagValue(''); }
                    }}
                    placeholder="Etiqueta..."
                    autoFocus
                    list="bulk-tag-suggestions"
                    className="bg-white/10 text-white text-[11px] sm:text-xs font-bold py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl border border-white/5 outline-none w-24 sm:w-32 placeholder-white/30"
                  />
                  <datalist id="bulk-tag-suggestions">
                    {allTags.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  disabled={disabled}
                  className="p-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-2xl transition-colors duration-150 border border-blue-500/20 btn-press disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Etiquetar leads seleccionados"
                  aria-label="Etiquetar leads seleccionados"
                >
                  <Tag size={20} />
                </button>
              )}
            </>
          )}

          {onExportSelected && (
            <button
              onClick={onExportSelected}
              disabled={disabled}
              className="p-2.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white rounded-2xl transition-colors duration-150 border border-green-500/20 btn-press disabled:opacity-40 disabled:cursor-not-allowed"
              title="Exportar seleccionados a Excel"
              aria-label="Exportar seleccionados a Excel"
            >
              <Download size={20} />
            </button>
          )}

          <button
            onClick={onBulkCancel}
            disabled={disabled}
            className="p-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded-2xl transition-colors duration-150 border border-orange-500/20 btn-press disabled:opacity-40 disabled:cursor-not-allowed"
            title="Cancelar leads seleccionados"
            aria-label="Cancelar leads seleccionados"
          >
            <XCircle size={20} />
          </button>

          <div className="w-px h-8 bg-white/10 mx-1 hidden xs:block" />

          <button
            onClick={onClearSelection}
            className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-colors duration-150"
            title="Deseleccionar todos"
            aria-label="Deseleccionar todos"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
