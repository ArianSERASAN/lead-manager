import { Bell, BellOff, Check, Loader2, AlertTriangle } from 'lucide-react';
import { useFCM } from '../../hooks/useFCM';
import { useAuth } from '../../contexts/AuthContext';

export function NotificationSettings() {
  const { appUser } = useAuth();
  const { supported, permissionStatus, loading, requestPermission } = useFCM(appUser?.uid);

  if (!supported) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
        <BellOff size={18} className="text-gray-400" />
        <div>
          <p className="text-sm font-semibold text-gray-600">Notificaciones push no disponibles</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Tu navegador no soporta notificaciones push. Prueba con Chrome o Edge.
          </p>
        </div>
      </div>
    );
  }

  if (permissionStatus === 'granted') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Check size={18} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Notificaciones push activadas</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Recibirás notificaciones cuando lleguen nuevos leads o leads calientes.
          </p>
        </div>
      </div>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle size={18} className="text-orange-500" />
        <div>
          <p className="text-sm font-semibold text-orange-800">Notificaciones bloqueadas</p>
          <p className="text-xs text-orange-600 mt-0.5">
            Has bloqueado las notificaciones. Para activarlas, haz clic en el icono del candado en la barra de direcciones y permite las notificaciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
          <Bell size={18} className="text-primary-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Notificaciones push</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Recibe alertas instantáneas de nuevos leads y leads calientes.
          </p>
        </div>
      </div>
      <button
        onClick={requestPermission}
        disabled={loading}
        className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2 shrink-0"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
        Activar
      </button>
    </div>
  );
}
