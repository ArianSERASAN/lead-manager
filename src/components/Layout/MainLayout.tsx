import { ReactNode } from 'react';
import { AppUser } from '../../types/domain';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
  user?: AppUser | null;
  onLogout: () => void;
  onNewLeadClick?: () => void;
}

export function MainLayout({ children, user, onLogout, onNewLeadClick }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden font-sans">
      <Sidebar user={user} onLogout={onLogout} onNewLeadClick={onNewLeadClick} />

      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-50 relative scroll-smooth">
        <div className="w-full px-4 md:px-10 lg:px-12 py-8 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
