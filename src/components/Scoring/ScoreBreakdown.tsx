import { ScoreBreakdown as IScoreBreakdown } from '../../types/domain';

interface ScoreBreakdownProps {
  breakdown: IScoreBreakdown;
  score: number;
}

export function ScoreBreakdown({ breakdown, score }: ScoreBreakdownProps) {
  const categories = [
    { label: 'Fuente', value: breakdown.sourceWeight, max: 25 },
    { label: 'Datos', value: breakdown.completeness, max: 25 },
    { label: 'Actividad', value: breakdown.recency, max: 25 },
    { label: 'Respuesta', value: breakdown.responseQuality, max: 25 }
  ];

  const getBarColor = (value: number) => {
    if (value >= 20) return 'bg-emerald-500';
    if (value >= 15) return 'bg-blue-500';
    if (value >= 10) return 'bg-amber-500';
    return 'bg-gray-300';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-900">{score}</div>
        <p className="text-xs text-gray-500 mt-1">Puntuación total</p>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex justify-between mb-1">
              <span className="text-xs font-semibold text-gray-700">{cat.label}</span>
              <span className="text-xs font-bold text-gray-900">{cat.value}/{cat.max}</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getBarColor(cat.value)}`}
                style={{ width: `${(cat.value / cat.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
