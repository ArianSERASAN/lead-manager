import { Plus } from 'lucide-react';
import { RoleGuard } from '../User/RoleGuard';

interface HeaderProps {
  title: string;
  subtitle?: string;
  leadCount?: number;
  onNewLeadClick?: () => void;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, leadCount, onNewLeadClick, actions }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between mb-6 gap-3 sm:gap-4 animate-fade-in">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
          {title}
        </h2>
        {leadCount !== undefined && (
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
            {leadCount} leads
          </span>
        )}
        {subtitle && (
          <span className="text-sm text-gray-400 font-medium">{subtitle}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        {onNewLeadClick && (
          <RoleGuard requires="canEdit">
            <button
              onClick={onNewLeadClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-shadow duration-200 btn-press text-sm"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nuevo Lead</span>
            </button>
          </RoleGuard>
        )}
      </div>
    </header>
  );
}
