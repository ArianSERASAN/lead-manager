import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AppUser } from '../../types/domain';
import { Loader2, Save, RotateCcw, Check } from 'lucide-react';

interface AutoAssignConfig {
  enabled: boolean;
  userIds: string[];
  currentIndex: number;
}

export function AutoAssignSettings() {
  const [config, setConfig] = useState<AutoAssignConfig>({ enabled: false, userIds: [], currentIndex: 0 });
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Fetch config
        const snap = await getDoc(doc(db, 'settings', 'autoAssign'));
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
            enabled: data.enabled ?? false,
            userIds: data.userIds ?? [],
            currentIndex: data.currentIndex ?? 0,
          });
        }
        // Fetch active users
        const usersSnap = await getDocs(query(collection(db, 'users'), where('active', '==', true)));
        const users = usersSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as AppUser));
        setAllUsers(users.filter((u) => u.role === 'admin' || u.role === 'comercial'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleUser = (uid: string) => {
    setConfig((prev) => ({
      ...prev,
      userIds: prev.userIds.includes(uid)
        ? prev.userIds.filter((id) => id !== uid)
        : [...prev.userIds, uid],
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'autoAssign'), {
        ...config,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 animate-pulse">
        <div className="skeleton w-48 h-5 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton w-full h-10" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <RotateCcw size={18} className="text-primary-600" />
        <h3 className="text-base font-bold text-gray-900">Asignación automática</h3>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Los nuevos leads se asignan automáticamente al siguiente comercial en la rotación.
      </p>

      {/* Enable toggle */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-700">Round-robin activo</p>
          <p className="text-xs text-gray-400">
            {config.enabled ? 'Los leads nuevos se asignan automáticamente' : 'Desactivado'}
          </p>
        </div>
        <button
          onClick={() => { setConfig((prev) => ({ ...prev, enabled: !prev.enabled })); setSaved(false); }}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            config.enabled ? 'bg-primary-600' : 'bg-gray-200'
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            config.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* User list */}
      {config.enabled && (
        <div className="space-y-2 mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Usuarios en la rotación
          </p>
          {allUsers.length === 0 ? (
            <p className="text-xs text-gray-400">No hay usuarios activos con rol admin o comercial.</p>
          ) : (
            allUsers.map((user) => {
              const isSelected = config.userIds.includes(user.uid);
              const isNext = config.userIds.indexOf(user.uid) === config.currentIndex % config.userIds.length;
              return (
                <button
                  key={user.uid}
                  onClick={() => toggleUser(user.uid)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-colors text-left ${
                    isSelected
                      ? 'bg-primary-50 border-primary-200'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 ${
                    isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 truncate">{user.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                  </div>
                  {isSelected && isNext && (
                    <span className="text-[10px] font-bold text-primary-600 bg-primary-100 px-2 py-0.5 rounded-lg shrink-0">
                      Siguiente
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saved ? 'Guardado' : 'Guardar'}
      </button>
    </div>
  );
}
