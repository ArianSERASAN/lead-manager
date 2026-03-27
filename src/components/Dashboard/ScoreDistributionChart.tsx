import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps
} from 'recharts';

interface ScoreDistributionChartProps {
  data: { range: string; count: number }[];
}

const rangeColors: Record<string, string> = {
  '0-20': '#d1d5db',      // gray
  '20-40': '#fbbf24',     // amber
  '40-60': '#60a5fa',     // blue
  '60-80': '#34d399',     // emerald
  '80-100': '#10b981'     // emerald-600
};

const rangeLabels: Record<string, string> = {
  '0-20': 'Frío',
  '20-40': 'Tibio',
  '40-60': 'Templado',
  '60-80': 'Caliente',
  '80-100': 'Muy Caliente'
};

const CustomTooltip = (props: any) => {
  const { active, payload } = props;
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

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="w-full h-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Sin datos disponibles</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    label: rangeLabels[item.range] || item.range
  }));

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribución de Score</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="label"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
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
      <div className="mt-6 grid grid-cols-5 gap-2 text-xs">
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
