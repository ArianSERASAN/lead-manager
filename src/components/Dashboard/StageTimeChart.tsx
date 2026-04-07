import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGE_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  'en-progreso': 'En Progreso',
};

const STAGE_COLORS: Record<string, string> = {
  nuevo: '#10b981',
  contactado: '#f59e0b',
  'en-progreso': '#8b5cf6',
};

interface StageTimeChartProps {
  avgTimeInStage: Record<string, number>;
}

export function StageTimeChart({ avgTimeInStage }: StageTimeChartProps) {
  const data = Object.entries(avgTimeInStage)
    .filter(([, days]) => days > 0)
    .map(([stage, days]) => ({
      stage: STAGE_LABELS[stage] || stage,
      days,
      key: stage,
    }));

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Tiempo medio por etapa</h3>
        <p className="text-xs text-gray-400 text-center py-8">
          Sin datos de historial de estados. Las transiciones se registrarán automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-card p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-4">Tiempo medio por etapa (días)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" />
          <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`${value} días`, 'Promedio']}
            contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
          />
          <Bar dataKey="days" radius={[6, 6, 0, 0]} maxBarSize={50}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={STAGE_COLORS[entry.key] || '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
