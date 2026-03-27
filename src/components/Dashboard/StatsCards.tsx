import { TrendingUp, TrendingDown, Users, Target, AlertCircle, Zap } from 'lucide-react';
import { getScoreColor } from '../../utils/format';

interface StatsCardsProps {
  total: number;
  conversionRate: number;
  avgScore: number;
  staleCount: number;
  newThisWeek: number;
}

export function StatsCards({ total, conversionRate, avgScore, staleCount, newThisWeek }: StatsCardsProps) {
  const getTrendIndicator = () => {
    if (newThisWeek > 5) return { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', label: `+${newThisWeek} esta semana` };
    if (newThisWeek > 0) return { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', label: `+${newThisWeek} esta semana` };
    return { icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50', label: 'Sin movimiento' };
  };

  const trend = getTrendIndicator();
  const TrendIcon = trend.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
      {/* Total Leads */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-6 hover:shadow-card-hover transition-all duration-300 group cursor-default">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-blue-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Users className="text-blue-600" size={22} />
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend.bg} ${trend.color}`}>
            <TrendIcon size={14} />
            <span>{newThisWeek}</span>
          </div>
        </div>
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Leads</h3>
        <p className="text-3xl font-black text-gray-900 animate-count-up">{total}</p>
        <p className="text-xs text-gray-400 mt-1">{trend.label}</p>
      </div>

      {/* Conversion Rate */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-6 hover:shadow-card-hover transition-all duration-300 group cursor-default">
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-emerald-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <Target className="text-emerald-600" size={22} />
          </div>
          <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{conversionRate}%</div>
        </div>
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Conversión</h3>
        <p className="text-3xl font-black text-gray-900 animate-count-up">{conversionRate}<span className="text-lg text-gray-400">%</span></p>
        <p className="text-xs text-gray-400 mt-1">Cerrados vs Total</p>
      </div>

      {/* Average Score */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-6 hover:shadow-card-hover transition-all duration-300 group cursor-default">
        <div className="flex items-start justify-between mb-4">
          <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl group-hover:scale-110 transition-transform duration-300 ${
            avgScore >= 80 ? 'bg-emerald-100' : avgScore >= 60 ? 'bg-blue-100' : avgScore >= 40 ? 'bg-amber-100' : 'bg-gray-100'
          }`}>
            <Zap className={`${getScoreColor(avgScore)}`} size={22} />
          </div>
          <div className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
            {avgScore >= 80 ? 'Caliente' : avgScore >= 60 ? 'Templado' : avgScore >= 40 ? 'Tibio' : 'Frío'}
          </div>
        </div>
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Score Medio</h3>
        <p className="text-3xl font-black text-gray-900 animate-count-up">{avgScore}</p>
        <p className="text-xs text-gray-400 mt-1">Puntuación promedio</p>
      </div>

      {/* Stale Leads */}
      <div className={`bg-white rounded-2xl shadow-card border p-6 hover:shadow-card-hover transition-all duration-300 group cursor-default ${
        staleCount > 0 ? 'border-orange-200/80' : 'border-gray-100/80'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-orange-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
            <AlertCircle className="text-orange-600" size={22} />
          </div>
          {staleCount > 0 && (
            <div className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg animate-pulse">
              Atención
            </div>
          )}
        </div>
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Estancados</h3>
        <p className={`text-3xl font-black animate-count-up ${staleCount > 0 ? 'text-orange-600' : 'text-gray-900'}`}>{staleCount}</p>
        <p className="text-xs text-gray-400 mt-1">Sin actividad 30+ días</p>
      </div>
    </div>
  );
}
