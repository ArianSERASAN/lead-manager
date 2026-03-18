import { X, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'undo';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  onUndo?: () => void;
  duration?: number;
}

export function Toast({ id, message, type, onClose, onUndo, duration = 5000 }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        onClose(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [id, duration, onClose]);

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    undo: 'bg-gray-900'
  };

  const Icon = type === 'success' ? CheckCircle2 : type === 'error' ? AlertCircle : RotateCcw;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-3rem)] max-w-sm animate-in slide-in-from-bottom-10">
      <div className={`${colors[type]} rounded-2xl shadow-2xl p-4 flex items-center justify-between text-white border border-white/10`}>
        <div className="flex items-center space-x-3">
          <Icon size={20} className={type === 'undo' ? 'animate-spin-once' : ''} />
          <span className="text-sm font-bold">{message}</span>
        </div>

        <div className="flex items-center space-x-3">
          {type === 'undo' && onUndo && (
            <button 
              onClick={() => {
                onUndo();
                onClose(id);
              }}
              className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Deshacer
            </button>
          )}
          <button onClick={() => onClose(id)} className="text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-4 right-4 h-1 bg-white/20 rounded-full overflow-hidden mb-1">
          <div 
            className="h-full bg-white/60 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Container for managing multiple toasts
export function ToastContainer({ toasts, onClose, onUndo }: { 
    toasts: any[], 
    onClose: (id: string) => void,
    onUndo: (id: string) => void
}) {
  return (
    <div className="pointer-events-none">
       {toasts.map(t => (
         <div key={t.id} className="pointer-events-auto">
           <Toast 
             key={t.id}
             {...t} 
             onClose={onClose} 
             onUndo={() => onUndo(t.id)} 
           />
         </div>
       ))}
    </div>
  );
}
