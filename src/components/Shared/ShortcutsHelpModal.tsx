import { X, Keyboard } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'J', description: 'Siguiente lead' },
  { key: 'K', description: 'Lead anterior' },
  { key: 'Enter', description: 'Abrir detalle' },
  { key: 'Esc', description: 'Cerrar detalle' },
  { key: 'N', description: 'Nuevo lead' },
  { key: '?', description: 'Mostrar atajos' },
];

export function ShortcutsHelpModal({ isOpen, onClose }: ShortcutsHelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-gray-900/40 backdrop-blur-md">
      <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] border border-white overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center border border-gray-200 shadow-sm shrink-0">
                <Keyboard size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">Atajos de teclado</h3>
                <p className="text-xs text-gray-400 mt-0.5">Navega sin usar el mouse</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Shortcuts grid */}
          <div className="space-y-2">
            {SHORTCUTS.map(({ key, description }) => (
              <div
                key={key}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <span className="text-sm text-gray-700 font-medium">{description}</span>
                <kbd className="min-w-[40px] text-center px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 shadow-sm">
                  {key}
                </kbd>
              </div>
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full mt-5 py-3 bg-gray-50 text-gray-400 font-bold rounded-2xl hover:bg-gray-100 transition-colors duration-100 border border-gray-100 text-sm active:scale-[0.98]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
