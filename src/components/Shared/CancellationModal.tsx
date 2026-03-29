import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { CANCELLATION_REASONS } from '../../utils/constants';

interface CancellationModalProps {
  isOpen: boolean;
  leadName?: string;
  isBulk?: boolean;
  bulkCount?: number;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function CancellationModal({
  isOpen,
  leadName,
  isBulk = false,
  bulkCount = 0,
  onConfirm,
  onClose,
}: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const isOtro = selectedReason === 'Otro';
  const finalReason = isOtro ? customReason.trim() : selectedReason;
  const canConfirm = selectedReason && (!isOtro || customReason.trim().length > 0);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(finalReason);
    setSelectedReason('');
    setCustomReason('');
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const title = isBulk
    ? `Cancelar ${bulkCount} lead${bulkCount !== 1 ? 's' : ''}`
    : `Cancelar lead${leadName ? `: ${leadName}` : ''}`;

  const description = isBulk
    ? `Los ${bulkCount} leads seleccionados pasarán a estado "Cancelado" y se moverán al historial. Esta acción es reversible desde el historial.`
    : 'Este lead pasará a estado "Cancelado" y se moverá al historial. Esta acción es reversible desde el historial.';

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-md">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] border border-white overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm shadow-orange-500/10 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Selecciona un motivo para continuar</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-5">{description}</p>

          {/* Reason selection */}
          <div className="space-y-2 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Motivo de cancelación
            </p>
            {CANCELLATION_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-100 active:scale-[0.98] ${
                  selectedReason === reason
                    ? 'border-orange-400 bg-orange-50 text-orange-700 shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-white'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>

          {/* Custom reason field */}
          {isOtro && (
            <div className="mb-4">
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe el motivo..."
                autoFocus
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none resize-none h-20 transition-shadow"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5 mt-2">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-lg bg-orange-500 hover:bg-orange-600 active:scale-[0.98] transition-all duration-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              Cancelar lead{isBulk && bulkCount > 1 ? `s (${bulkCount})` : ''}
            </button>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gray-50 text-gray-400 font-bold rounded-2xl hover:bg-gray-100 transition-colors duration-100 border border-gray-100 text-sm active:scale-[0.98]"
            >
              Mantener lead activo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
