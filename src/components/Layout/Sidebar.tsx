import { LayoutDashboard, Users, LogOut, CheckSquare, Settings, Kanban } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppUser } from '../../types/domain';

interface SidebarProps {
  user?: AppUser | null;
  onLogout: () => void;
  onNewLeadClick?: () => void;
}

const NAV_ITEMS = [
  { id: 'leads', path: '/', label: 'Leads', icon: Users },
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', path: '/pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'tasks', path: '/tasks', label: 'Tareas', icon: CheckSquare },
  { id: 'settings', path: '/settings', label: 'Ajustes', icon: Settings },
];

export function Sidebar({ user, onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveId = () => {
    const match = NAV_ITEMS.find(item =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    );
    return match?.id || 'leads';
  };

  const activeTab = getActiveId();

  return (
    <aside role="navigation" aria-label="Menú principal" className="w-full md:w-[220px] bg-white border-b md:border-b-0 md:border-r border-gray-200/60 flex flex-col shrink-0 z-20">
      {/* Logo — desktop */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100/80 hidden md:block">
        <div className="flex items-center gap-2.5">
          <img src="/logos/serasan-icon.png" alt="SERASAN" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Lead Manager</h1>
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">SERASAN</p>
          </div>
        </div>
      </div>

      {/* Logo — mobile */}
      <div className="md:hidden flex items-center gap-2 px-4 pt-2.5 pb-1">
        <img src="/logos/serasan-icon.png" alt="SERASAN" className="w-5 h-5 object-contain" />
        <span className="text-sm font-bold text-gray-900">Leads</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 md:py-4 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`relative flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-all duration-150 whitespace-nowrap md:whitespace-normal text-sm ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/20'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-[0.98]'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User + Logout — desktop */}
      <div className="px-3 py-3 border-t border-gray-100/80 hidden md:block space-y-1">
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center text-white text-[11px] font-bold">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          aria-label="Cerrar sesión"
          className="flex items-center gap-2.5 w-full px-3 py-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}
