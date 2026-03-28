import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ScoreDistributionChartProps {
  data: { range: string; count: number }[];
}

const rangeColors: Record<string, string> = {
  '0-20': '#d1d5db',
  '20-40': '#fbbf24',
  '40-60': '#60a5fa',
  '60-80': '#34d399',
  '80-100': '#10b981'
};

const rangeLabels: Record<string, string> = {
  '0-20': 'Frío',
  '20-40': 'Tibio',
  '40-60': 'Templado',
  '60-80': 'Caliente',
  '80-100': 'Muy Caliente'
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { range: string; count: number; label: string } }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
        <p className="text-sm font-semibold text-gray-900">{rangeLabels[data.range]}</p>
        <p className="text-sm text-gray-600">Rango: {data.range}</p>
        <p className="text-sm text-gray-600">{data.count} leads</p>
      </div>
    );
  }
  return null;
};

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  const isMobile = useIsMobile();

  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="w-full h-60 sm:h-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Sin datos disponibles</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    label: rangeLabels[item.range] || item.range
  }));

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Distribución de Score</h3>
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="label"
            stroke="#9ca3af"
            style={{ fontSize: isMobile ? '9px' : '12px' }}
            tick={{ fontSize: isMobile ? 9 : 12 }}
            interval={0}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: isMobile ? '10px' : '12px' }}
            width={isMobile ? 25 : 40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={rangeColors[entry.range] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 sm:mt-6 grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
        {chartData.map(item => (
          <div key={item.range} className="text-center p-2 rounded-lg" style={{ backgroundColor: rangeColors[item.range] + '20' }}>
            <p className="font-semibold text-gray-900">{item.label}</p>
            <p className="text-gray-600">{item.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
