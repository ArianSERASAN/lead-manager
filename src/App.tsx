import { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { Login } from './components/Shared/Login';
import { Toast } from './components/Shared/Toast';
import { MainLayout } from './components/Layout/MainLayout';
import { useLeadSubscription } from './stores/useLeadStore';

// Lazy load pages for performance
const LeadsPage = lazy(() => import('./pages/LeadsPage').then(m => ({ default: m.LeadsPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const KanbanPage = lazy(() => import('./pages/KanbanPage').then(m => ({ default: m.KanbanPage })));
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const HistorialPage = lazy(() => import('./pages/HistorialPage').then(m => ({ default: m.HistorialPage })));
const LeadProfilePage = lazy(() => import('./pages/LeadProfilePage').then(m => ({ default: m.LeadProfilePage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="animate-spin text-gray-300" size={24} />
    </div>
  );
}

function AppContent() {
  const { firebaseUser, appUser, loading, logout } = useAuth();
  const { toasts, removeToast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  useLeadSubscription();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <div className="flex flex-col items-center animate-fade-in">
          <img src="/logos/serasan-icon.png" alt="SERASAN" className="w-14 h-14 object-contain brand-pulse mb-5" />
          <div className="flex items-center gap-2.5">
            <Loader2 className="animate-spin text-blue-600" size={18} />
            <span className="text-sm font-medium text-gray-400">Cargando...</span>
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LeadsPage showCreateForm={showCreateForm} onOpenCreateForm={() => setShowCreateForm(true)} onCloseCreateForm={() => setShowCreateForm(false)} />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/pipeline" element={<KanbanPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/historial" element={<HistorialPage />} />
          <Route path="/leads/:collection/:id" element={<LeadProfilePage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>

      {/* Toast Container */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-50">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast id={toast.id} message={toast.message} type={toast.type} onClose={removeToast} onUndo={toast.onUndo} duration={toast.duration} />
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
