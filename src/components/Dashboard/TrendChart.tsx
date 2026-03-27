import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
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

const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const source = SOURCE_CONFIG[data.source as keyof typeof SOURCE_CONFIG];
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
        <p className="text-sm font-semibold text-gray-900">{data.week}</p>
        <p className="text-sm text-gray-600">
          {source?.label}: {data.count} leads
        </p>
      </div>
    );
  }
  return null;
};

export function TrendChart({ data }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
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
  }, [] as any[]);

  const sources = Array.from(new Set(data.map(d => d.source)));

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Tendencia de Leads (Últimas 8 Semanas)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={groupedByWeek}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="week"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="line"
          />
          {sources.map(source => (
            <Line
              key={source}
              type="monotone"
              dataKey={source}
              stroke={sourceColors[source] || '#6b7280'}
              strokeWidth={2}
              dot={{ fill: sourceColors[source] || '#6b7280', r: 4 }}
              activeDot={{ r: 6 }}
              isAnimationActive={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
