import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UnattendedWidgetProps {
  count: number;
}

export function UnattendedWidget({ count }: UnattendedWidgetProps) {
  const navigate = useNavigate();

  return (
    <div className={`rounded-2xl border p-5 shadow-card ${
      count > 0
        ? 'bg-orange-50 border-orange-200'
        : 'bg-white border-gray-200/80'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            count > 0 ? 'bg-orange-100' : 'bg-gray-100'
          }`}>
            <AlertTriangle size={18} className={count > 0 ? 'text-orange-500' : 'text-gray-400'} />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{count}</p>
            <p className="text-xs text-gray-500">Leads sin atender ({'>'}24h)</p>
          </div>
        </div>
        {count > 0 && (
          <button
            onClick={() => navigate('/')}
            className="text-xs font-semibold text-orange-600 bg-orange-100 hover:bg-orange-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Ver leads
          </button>
        )}
      </div>
      {count === 0 && (
        <p className="text-[11px] text-gray-400 mt-2">Todos los leads nuevos han sido atendidos.</p>
      )}
    </div>
  );
}
