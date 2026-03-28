import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { SOURCE_CONFIG } from '../../utils/constants';

interface TrendChartProps {
  data: { week: string; count: number; source: string }[];
}

const sourceColors: Record<string, string> = {
  'landing': '#3b82f6',
  'web-download': '#10b981',
  'web-contact': '#a855f7',
  'manual': '#6b7280'
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { week: string; source: string; count: number; [key: string]: unknown } }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
        <p className="text-sm font-semibold text-gray-900">{data.week}</p>
        {payload.map((entry, idx) => {
          const dataKey = (entry as unknown as { dataKey?: string }).dataKey;
          const value = (entry as unknown as { value?: number }).value;
          const source = SOURCE_CONFIG[dataKey as keyof typeof SOURCE_CONFIG];
          return (
            <p key={idx} className="text-sm text-gray-600">
              {source?.label || dataKey}: {value ?? 0} leads
            </p>
          );
        })}
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

export function TrendChart({ data }: TrendChartProps) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="w-full h-60 sm:h-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Sin datos disponibles</p>
      </div>
    );
  }

  // Group data by week
  const groupedByWeek = data.reduce((acc, item) => {
    const existing = acc.find(x => x.week === item.week);
    if (existing) {
      existing[item.source] = item.count;
    } else {
      acc.push({ week: item.week, [item.source]: item.count });
    }
    return acc;
  }, [] as Record<string, unknown>[]);

  const sources = Array.from(new Set(data.map(d => d.source)));

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Tendencia de Leads (Últimas 8 Semanas)</h3>
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
        <LineChart data={groupedByWeek} margin={isMobile ? { top: 5, right: 10, left: -10, bottom: 5 } : undefined}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="week"
            stroke="#9ca3af"
            style={{ fontSize: isMobile ? '10px' : '12px' }}
            tick={{ fontSize: isMobile ? 9 : 12 }}
            interval={isMobile ? 1 : 0}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: isMobile ? '10px' : '12px' }}
            width={isMobile ? 30 : 40}
          />
          <Tooltip content={<CustomTooltip />} />
          {!isMobile && (
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
          )}
          {sources.map(source => (
            <Line
              key={source}
              type="monotone"
              dataKey={source}
              stroke={sourceColors[source] || '#6b7280'}
              strokeWidth={2}
              dot={{ fill: sourceColors[source] || '#6b7280', r: isMobile ? 2 : 4 }}
              activeDot={{ r: isMobile ? 4 : 6 }}
              isAnimationActive={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
