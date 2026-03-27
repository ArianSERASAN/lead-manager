import { LayoutDashboard, Users, MessageSquare, Download, LogOut, CheckSquare, Plus, Settings, Kanban } from 'lucide-react';
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

export function Sidebar({ user, onLogout, onNewLeadClick }: SidebarProps) {
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
    <aside role="navigation" aria-label="Menú principal" className="w-full md:w-72 bg-white/90 backdrop-blur-xl border-b md:border-b-0 md:border-r border-gray-200/50 flex flex-col shrink-0 z-20">
      {/* Logo section */}
      <div className="p-6 border-b border-gray-100/80 hidden md:block">
        <div className="flex items-center space-x-3 mb-2">
          <img src="/logos/serasan-icon.png" alt="SERASAN" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight">Lead Manager</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SERASAN Engineering</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 px-1">
          <img src="/logos/reactiva-icon.png" alt="Reactiva tu Edificio" className="w-4 h-4 object-contain" />
          <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider">Reactiva tu Edificio</span>
        </div>
      </div>

      {/* Mobile: logo pill */}
      <div className="md:hidden flex items-center gap-2 px-4 pt-3 pb-1">
        <img src="/logos/serasan-icon.png" alt="SERASAN" className="w-6 h-6 object-contain" />
        <span className="text-sm font-bold text-gray-900">Lead Manager</span>
      </div>

      {/* Nuevo Lead Button */}
      {onNewLeadClick && (
        <div className="p-4 md:p-5 border-b border-gray-100/50 hidden md:block">
          <button
            onClick={onNewLeadClick}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-600/25 hover:-translate-y-0.5 transition-all duration-200 active:scale-95"
          >
            <Plus size={20} />
            <span>Nuevo Lead</span>
          </button>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 md:px-4 md:py-5 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar gap-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`relative flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group whitespace-nowrap md:whitespace-normal ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/25'
                  : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-800 active:scale-[0.98]'
              }`}
            >
              <item.icon
                size={20}
                className={`transition-transform duration-200 ${
                  isActive ? '' : 'group-hover:scale-110'
                }`}
              />
              <span className="text-sm">{item.label}</span>
              {isActive && (
                <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[2px] w-1 h-6 bg-white rounded-full opacity-80" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t border-gray-100/80 hidden md:block space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
          className="flex items-center gap-3 w-full px-4 py-2.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 font-semibold group"
        >
          <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
