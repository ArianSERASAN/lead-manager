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

      <main className="flex-1 overflow-y-auto bg-gray-50/80 relative">
        <div className="w-full px-4 md:px-8 lg:px-10 py-6 md:py-7 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
