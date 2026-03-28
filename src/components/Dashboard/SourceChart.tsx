import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SOURCE_CONFIG } from '../../utils/constants';

interface SourceChartProps {
  data: Record<string, number>;
}

const sourceColors: Record<string, string> = {
  'landing': '#3b82f6',
  'web-download': '#10b981',
  'web-contact': '#a855f7',
  'manual': '#6b7280'
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; label: string; percent?: number } }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const source = SOURCE_CONFIG[data.name as keyof typeof SOURCE_CONFIG];
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
        <p className="text-sm font-semibold text-gray-900">{source?.label}</p>
        <p className="text-sm text-gray-600">{data.value} leads</p>
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

export function SourceChart({ data }: SourceChartProps) {
  const isMobile = useIsMobile();

  const chartData = Object.entries(data).map(([source, count]) => ({
    name: source,
    value: count,
    label: SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG]?.label || source
  }));

  if (chartData.length === 0 || chartData.every(d => d.value === 0)) {
    return (
      <div className="w-full h-60 sm:h-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Sin datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Distribución por Origen</h3>
      <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 40 : 60}
            outerRadius={isMobile ? 70 : 100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={sourceColors[entry.name] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {!isMobile && (
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(_value: string, entry: { payload?: { label?: string; value?: number } }) =>
                `${entry.payload?.label ?? ''} (${entry.payload?.value ?? 0})`
              }
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Legend with colors */}
      <div className="mt-4 sm:mt-6 space-y-2">
        {chartData.map(item => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: sourceColors[item.name] || '#6b7280' }}
              />
              <span className="text-gray-700 text-xs sm:text-sm">{item.label}</span>
            </div>
            <span className="font-semibold text-gray-900 text-xs sm:text-sm">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
