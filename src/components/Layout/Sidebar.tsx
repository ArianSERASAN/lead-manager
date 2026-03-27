import { LayoutDashboard, Users, MessageSquare, Download, LogOut, CheckSquare, Plus, Settings } from 'lucide-react';
import { AppUser } from '../../types/domain';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user?: AppUser | null;
  onLogout: () => void;
  onNewLeadClick?: () => void;
}

export function Sidebar({ activeTab, onTabChange, user, onLogout, onNewLeadClick }: SidebarProps) {
  const navItems = [
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pipeline', label: 'Pipeline', icon: Users },
    { id: 'tasks', label: 'Tareas', icon: CheckSquare },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside role="navigation" aria-label="Menú principal" className="w-full md:w-72 bg-white/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-gray-200/50 flex flex-col shrink-0 z-20">
      <div className="p-8 border-b border-gray-100/50 hidden md:block">
        <div className="flex items-center space-x-3 mb-1">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/20">
            L
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Lead Manager</h1>
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">SERASAN Engineering</p>
      </div>

      {/* Nuevo Lead Button */}
      {onNewLeadClick && (
        <div className="p-4 md:p-6 border-b border-gray-100/50 hidden md:block">
          <button
            onClick={onNewLeadClick}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold hover:shadow-lg hover:shadow-blue-600/30 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Nuevo Lead</span>
          </button>
        </div>
      )}

      <nav className="flex-1 p-4 md:p-6 flex md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center space-x-4 w-full px-5 py-3.5 rounded-2xl transition-all duration-300 group whitespace-nowrap md:whitespace-normal ${
              activeTab === item.id
                ? 'bg-blue-600 text-white font-bold shadow-xl shadow-blue-600/30 -translate-y-0.5'
                : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 active:scale-95'
            }`}
          >
            <item.icon size={22} className={activeTab === item.id ? 'scale-110' : 'group-hover:scale-110 transition-transform'} />
            <span className="text-[15px]">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-100/50 hidden md:block">
        <button
          onClick={onLogout}
          aria-label="Cerrar sesión"
          className="flex items-center space-x-3 w-full px-5 py-4 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all font-bold group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
