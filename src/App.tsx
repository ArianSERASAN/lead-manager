import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { Login } from './components/Shared/Login';
import { Toast } from './components/Shared/Toast';
import { MainLayout } from './components/Layout/MainLayout';
import { LeadsPage } from './pages/LeadsPage';
import { DashboardPage } from './pages/DashboardPage';
import { KanbanPage } from './pages/KanbanPage';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const { firebaseUser, appUser, loading, logout } = useAuth();
  const { toasts, removeToast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <div className="flex flex-col items-center animate-fade-in">
          <img
            src="/logos/serasan-icon.png"
            alt="SERASAN"
            className="w-16 h-16 object-contain brand-pulse mb-6"
          />
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-blue-600" size={20} />
            <span className="text-sm font-semibold text-gray-400">Cargando Lead Manager...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Login />;
  }

  return (
    <MainLayout
      user={appUser || undefined}
      onLogout={logout}
      onNewLeadClick={() => setShowCreateForm(true)}
    >
      <Routes>
        <Route path="/" element={<LeadsPage showCreateForm={showCreateForm} onCloseCreateForm={() => setShowCreateForm(false)} />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pipeline" element={<KanbanPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Toast Container */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={removeToast}
              onUndo={toast.onUndo}
              duration={toast.duration}
            />
          </div>
        ))}
      </div>
    </MainLayout>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
