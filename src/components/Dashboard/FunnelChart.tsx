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
import { STATUS_CONFIG } from '../../utils/constants';

interface FunnelChartProps {
  data: { stage: string; count: number; percentage: number }[];
}

const statusColors: Record<string, string> = {
  'nuevo': '#10b981',
  'contactado': '#f59e0b',
  'en-progreso': '#a855f7',
  'cerrado': '#ef4444'
};

const CustomTooltip = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const config = STATUS_CONFIG[data.stage];
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-lg">
        <p className="text-sm font-semibold text-gray-900">{config?.label}</p>
        <p className="text-sm text-gray-600">{data.count} leads</p>
        {data.percentage && <p className="text-xs text-gray-500">Retención: {data.percentage}%</p>}
      </div>
    );
  }
  return null;
};

export function FunnelChart({ data }: FunnelChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-80 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Sin datos disponibles</p>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    stageName: STATUS_CONFIG[item.stage]?.label || item.stage
  }));

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Embudo de Ventas</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis
            dataKey="stageName"
            type="category"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={statusColors[entry.stage] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Dropout percentages */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {chartData.map((stage, idx) => (
          <div key={stage.stage} className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-900">{stage.stageName}</p>
            <p className="text-gray-600">{stage.count}</p>
            {idx < chartData.length - 1 && (
              <p className="text-amber-600 font-semibold text-xs mt-1">
                ↓ {Math.round(100 - stage.percentage)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
