import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, Save, Sliders } from 'lucide-react';

const DEFAULT_WEIGHTS = { source: 20, completeness: 50, recency: 20, responseQuality: 10 };

const LABELS: Record<string, string> = {
  source: 'Fuente del lead',
  completeness: 'Completitud de datos',
  recency: 'Antigüedad / Frescura',
  responseQuality: 'Calidad de respuesta',
};

const DESCRIPTIONS: Record<string, string> = {
  source: 'Peso de la fuente de origen (web, landing, manual)',
  completeness: 'Cuántos campos del lead están rellenos',
  recency: 'Cuántos días han pasado desde la última actividad',
  responseQuality: 'Notas, etiquetas, progresión en el pipeline',
};

export function ScoringSettings() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'scoring'));
        if (snap.exists() && snap.data().weights) {
          setWeights(snap.data().weights);
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = total === 100;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'scoring'), {
        weights,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6 animate-pulse">
        <div className="skeleton w-40 h-5 mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton w-full h-12" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <Sliders size={18} className="text-primary-600" />
        <h3 className="text-base font-bold text-gray-900">Configuración de Scoring</h3>
      </div>
      <p className="text-xs text-gray-400 mb-6">
        Ajusta el peso de cada componente. El total debe sumar exactamente 100.
      </p>

      <div className="space-y-5">
        {Object.entries(weights).map(([key, value]) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <p className="text-sm font-semibold text-gray-700">{LABELS[key]}</p>
                <p className="text-[11px] text-gray-400">{DESCRIPTIONS[key]}</p>
              </div>
              <span className={`text-sm font-black tabular-nums px-2.5 py-0.5 rounded-lg ${
                value > 0 ? 'text-primary-700 bg-primary-50' : 'text-gray-400 bg-gray-50'
              }`}>
                {value}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={value}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary-600"
            />
          </div>
        ))}
      </div>

      <div className={`mt-5 flex items-center justify-between pt-4 border-t border-gray-100`}>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-black tabular-nums ${isValid ? 'text-emerald-600' : 'text-red-500'}`}>
            Total: {total}/100
          </span>
          {!isValid && (
            <span className="text-xs text-red-400">Debe sumar 100</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
