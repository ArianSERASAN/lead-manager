import { useNavigate, useLocation } from 'react-router-dom';
import { Users, LayoutDashboard, Kanban, CheckSquare, Archive } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'leads', path: '/', label: 'Leads', icon: Users },
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', path: '/pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'tasks', path: '/tasks', label: 'Tareas', icon: CheckSquare },
  { id: 'historial', path: '/historial', label: 'Historial', icon: Archive },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeId = (() => {
    const match = NAV_ITEMS.find((item) =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    );
    return match?.id || 'leads';
  })();

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 z-30 pb-safe"
    >
      <div className="flex items-stretch h-14">
        {NAV_ITEMS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-1 transition-colors duration-150 active:bg-gray-50 ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {/* Active top indicator */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 rounded-b-full" />
              )}
              <item.icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.75}
                aria-hidden="true"
              />
              <span className={`text-[10px] leading-tight font-semibold ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
