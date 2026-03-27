import { TrendingUp, Clock, Loader2, CheckCircle2, Plus } from 'lucide-react';
import { AppUser } from '../../types/domain';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leadCount?: number;
  user?: AppUser | null;
  stats?: {
    total: number;
    new: number;
    inProgress: number;
    closed: number;
  };
  onNewLeadClick?: () => void;
}

export function Header({ title, subtitle, leadCount, user, stats, onNewLeadClick }: HeaderProps) {
  return (
    <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-6">
      <div>
        <h2 className="text-4xl font-black text-gray-900 tracking-tighter">
          {title}
        </h2>
        {subtitle || leadCount !== undefined ? (
          <div className="flex items-center space-x-2 text-sm text-gray-500 mt-2 font-medium">
            <div className="flex -space-x-1">
              <div className="w-5 h-5 bg-blue-100 rounded-full border border-white" />
              <div className="w-5 h-5 bg-blue-200 rounded-full border border-white" />
              <div className="w-5 h-5 bg-blue-300 rounded-full border border-white" />
            </div>
            <span className="pl-1">
              {leadCount !== undefined ? (
                <>
                  <span className="text-blue-600 font-bold">{leadCount}</span> leads filtrados
                </>
              ) : (
                subtitle
              )}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center space-x-4 w-full xl:w-auto">
        {onNewLeadClick && (
          <button
            onClick={onNewLeadClick}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Nuevo Lead</span>
          </button>
        )}
        {user && (
          <div className="hidden sm:flex items-center space-x-4 bg-white/60 backdrop-blur-md p-2 rounded-[24px] border border-white shadow-sm ml-auto">
            <div className="pl-4 pr-2">
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none mb-0.5">
                {user.role.toUpperCase()}
              </p>
              <p className="text-xs font-bold text-gray-900">{user.email}</p>
            </div>
            <div className="w-12 h-12 bg-gray-900 rounded-[20px] flex items-center justify-center text-white font-black shadow-lg shadow-gray-900/10">
              {user.email?.[0].toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 2xl:grid-cols-4 gap-6 w-full mt-8">
          <StatCard label="Total Leads" value={stats.total} icon={TrendingUp} color="blue" />
          <StatCard label="Nuevos" value={stats.new} icon={Clock} color="orange" />
          <StatCard label="En Progreso" value={stats.inProgress} icon={Loader2} color="purple" />
          <StatCard label="Cerrados" value={stats.closed} icon={CheckCircle2} color="green" />
        </div>
      )}
    </header>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: any;
  color: 'blue' | 'orange' | 'purple' | 'green';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
    green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' }
  };

  const colors = colorMap[color];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-2xl p-6 flex items-center justify-between group hover:shadow-md transition-all duration-300 cursor-default`}>
      <div className="flex-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-gray-900">{value}</p>
      </div>
      <Icon className={`${colors.icon} size-12 opacity-20 group-hover:opacity-30 transition-opacity`} />
    </div>
  );
}
