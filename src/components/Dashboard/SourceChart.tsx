import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
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

const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const source = SOURCE_CONFIG[data.name as keyof typeof SOURCE_CONFIG];
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
        <p className="text-sm font-semibold text-gray-900">{source?.label}</p>
        <p className="text-sm text-gray-600">{data.value} leads</p>
        <p className="text-xs text-gray-500">{data.percent}%</p>
      </div>
    );
  }
  return null;
};

export function SourceChart({ data }: SourceChartProps) {
  const chartData = Object.entries(data).map(([source, count]) => ({
    name: source,
    value: count,
    label: SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG]?.label || source
  }));

  if (chartData.length === 0 || chartData.every(d => d.value === 0)) {
    return (
      <div className="w-full h-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Sin datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Origen</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={sourceColors[entry.name] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => `${entry.payload.label} (${entry.payload.value})`}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend with colors */}
      <div className="mt-6 space-y-2">
        {chartData.map(item => (
          <div key={item.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: sourceColors[item.name] || '#6b7280' }}
              />
              <span className="text-gray-700">{item.label}</span>
            </div>
            <span className="font-semibold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
