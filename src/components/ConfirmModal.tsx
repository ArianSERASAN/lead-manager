import { X, AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: 'red' | 'blue' | 'orange';
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar',
  confirmColor = 'red'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = {
    red: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    blue: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    orange: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/90 backdrop-blur-2xl w-full max-w-md rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] border border-white overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-lg shadow-red-500/10">
             <AlertTriangle size={32} />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 mb-8 px-2">{message}</p>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`w-full py-3 rounded-2xl text-white font-bold transition-all shadow-lg active:scale-95 ${colors[confirmColor]}`}
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 bg-gray-50 text-gray-400 font-bold rounded-2xl hover:bg-gray-100 transition-all border border-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
