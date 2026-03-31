import { ScoreBreakdown as IScoreBreakdown } from '../../types/domain';

interface ScoreBreakdownProps {
  breakdown: IScoreBreakdown;
  score: number;
}

export function ScoreBreakdown({ breakdown, score }: ScoreBreakdownProps) {
  // Derive max for each category from the default weights (20/50/20/10)
  const categories = [
    { label: 'Fuente', value: breakdown.sourceWeight, max: 20 },
    { label: 'Datos', value: breakdown.completeness, max: 50 },
    { label: 'Actividad', value: breakdown.recency, max: 20 },
    { label: 'Respuesta', value: breakdown.responseQuality, max: 10 }
  ];

  const getBarColor = (pct: number) => {
    if (pct >= 0.8) return 'bg-emerald-500';
    if (pct >= 0.6) return 'bg-primary-500';
    if (pct >= 0.4) return 'bg-amber-500';
    return 'bg-gray-300';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900">{score}</div>
        <p className="text-xs text-gray-500 mt-1">Puntuación total</p>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const pct = cat.max > 0 ? cat.value / cat.max : 0;
          return (
            <div key={cat.label}>
              <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">{cat.label}</span>
                <span className="text-xs font-bold text-gray-900">{cat.value}/{cat.max}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getBarColor(pct)}`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
