import { TrendingUp, TrendingDown, Users, Target, AlertCircle } from 'lucide-react';
import { getScoreColor, getScoreBgColor } from '../../utils/format';

interface StatsCardsProps {
  total: number;
  conversionRate: number;
  avgScore: number;
  staleCount: number;
  newThisWeek: number;
}

export function StatsCards({ total, conversionRate, avgScore, staleCount, newThisWeek }: StatsCardsProps) {
  const getTrendIndicator = () => {
    if (newThisWeek > 5) return { icon: TrendingUp, color: 'text-emerald-600', label: `+${newThisWeek} esta semana` };
    if (newThisWeek > 0) return { icon: TrendingUp, color: 'text-blue-600', label: `+${newThisWeek} esta semana` };
    return { icon: TrendingDown, color: 'text-red-600', label: 'Sin movimiento' };
  };

  const trend = getTrendIndicator();
  const TrendIcon = trend.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Leads */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
            <Users className="text-blue-600" size={24} />
          </div>
          <div className={`flex items-center gap-1 text-sm font-semibold ${trend.color}`}>
            <TrendIcon size={16} />
            <span>{newThisWeek}</span>
          </div>
        </div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">Total de Leads</h3>
        <p className="text-4xl font-bold text-gray-900 mb-2">{total}</p>
        <p className="text-xs text-gray-500">{trend.label}</p>
      </div>

      {/* Conversion Rate */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-xl">
            <Target className="text-emerald-600" size={24} />
          </div>
          <div className="text-sm font-semibold text-emerald-600">{conversionRate}%</div>
        </div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">Tasa de Conversión</h3>
        <p className="text-4xl font-bold text-gray-900 mb-2">{conversionRate}%</p>
        <p className="text-xs text-gray-500">Cerrados vs Total</p>
      </div>

      {/* Average Score */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${
            avgScore >= 80 ? 'bg-emerald-100' : avgScore >= 60 ? 'bg-blue-100' : avgScore >= 40 ? 'bg-amber-100' : 'bg-gray-100'
          }`}>
            <span className={`text-xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</span>
          </div>
          <div className="text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 text-gray-700">
            {avgScore >= 80 ? 'Caliente' : avgScore >= 60 ? 'Templado' : avgScore >= 40 ? 'Tibio' : 'Frío'}
          </div>
        </div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">Score Medio</h3>
        <p className="text-4xl font-bold text-gray-900 mb-2">{avgScore}</p>
        <p className="text-xs text-gray-500">Puntuación promedio</p>
      </div>

      {/* Stale Leads */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl">
            <AlertCircle className="text-orange-600" size={24} />
          </div>
          {staleCount > 0 && <div className="text-sm font-semibold text-orange-600">⚠️ {staleCount}</div>}
        </div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">Leads Estancados</h3>
        <p className="text-4xl font-bold text-gray-900 mb-2">{staleCount}</p>
        <p className="text-xs text-gray-500">Sin actividad 30+ días</p>
      </div>
    </div>
  );
}
