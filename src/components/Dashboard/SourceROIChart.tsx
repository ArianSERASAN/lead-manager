import { TrendingUp, Users, Target, Zap } from 'lucide-react';

interface SourceROI {
  source: string;
  label: string;
  total: number;
  closed: number;
  conversionRate: number;
  avgScore: number;
}

interface SourceROIChartProps {
  data: SourceROI[];
}

export function SourceROIChart({ data }: SourceROIChartProps) {
  if (data.length === 0) return null;

  // Sort by conversion rate descending
  const sorted = [...data].sort((a, b) => b.conversionRate - a.conversionRate);
  const maxTotal = Math.max(...sorted.map((s) => s.total), 1);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={18} className="text-primary-600" />
        <h3 className="text-base font-bold text-gray-900">ROI por fuente</h3>
      </div>

      <div className="space-y-4">
        {sorted.map((item) => (
          <div key={item.source} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">{item.label}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Users size={12} />
                  {item.total}
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                  <Target size={12} />
                  {item.conversionRate}%
                </span>
                <span className="flex items-center gap-1 text-xs text-primary-600 font-bold">
                  <Zap size={12} />
                  {item.avgScore}
                </span>
              </div>
            </div>

            {/* Progress bars */}
            <div className="flex gap-1 h-2">
              <div
                className="bg-primary-500 rounded-full transition-all duration-500"
                style={{ width: `${(item.total / maxTotal) * 100}%` }}
                title={`${item.total} leads`}
              />
              {item.closed > 0 && (
                <div
                  className="bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(item.closed / maxTotal) * 100}%` }}
                  title={`${item.closed} cerrados`}
                />
              )}
            </div>

            <div className="flex gap-4 text-[10px] text-gray-400">
              <span>{item.total} leads totales</span>
              <span>{item.closed} cerrados</span>
              <span>Conversión: {item.conversionRate}%</span>
              <span>Score medio: {item.avgScore}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" /> Total leads
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Cerrados
        </span>
      </div>
    </div>
  );
}
