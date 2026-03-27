import { CheckSquare, Plus } from 'lucide-react';
import { useState } from 'react';
import { Header } from '../components/Layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { useAllTasks } from '../hooks/leads/useAllTasks';
import { TaskCard } from '../components/Tasks/TaskCard';
import { deleteTask, completeTask } from '../services/TaskService';
import { useToast } from '../contexts/ToastContext';
import { useLeads } from '../hooks/leads/useLeads';

export function TasksPage() {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const { groupedTasks, loading } = useAllTasks();
  const { leads } = useLeads();
  const [selectedLeadForNewTask, setSelectedLeadForNewTask] = useState<string | null>(null);

  const handleCompleteTask = async (task: any) => {
    if (!appUser) return;
    try {
      await completeTask(task.leadCollection, task.leadId, task.id, appUser.uid);
      // Note: Activity recording could be added here if needed
      addToast({ message: 'Tarea marcada como completada', type: 'success' });
    } catch (err) {
      console.error('Error:', err);
      addToast({ message: 'Error al completar la tarea', type: 'error' });
    }
  };

  const handleDeleteTask = async (task: any) => {
    try {
      await deleteTask(task.leadCollection, task.leadId, task.id);
      addToast({ message: 'Tarea eliminada', type: 'success' });
    } catch (err) {
      console.error('Error:', err);
      addToast({ message: 'Error al eliminar la tarea', type: 'error' });
    }
  };

  const handleSelectLead = (leadId: string) => {
    // Navigate to lead detail would be handled by parent router
    console.log('Navigate to lead:', leadId);
  };

  const stats = {
    total: (groupedTasks.overdue?.length || 0) + (groupedTasks.today?.length || 0) + (groupedTasks.upcoming?.length || 0),
    overdue: groupedTasks.overdue?.length || 0,
    today: groupedTasks.today?.length || 0
  };

  return (
    <>
      <Header title="Tareas" user={appUser} />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-gray-500">Cargando tareas...</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Total de Tareas</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-bold text-red-500 uppercase mb-2">Vencidas</p>
              <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-bold text-amber-500 uppercase mb-2">Hoy</p>
              <p className="text-3xl font-bold text-amber-600">{stats.today}</p>
            </div>
          </div>

          {/* Tasks by category */}
          <div className="space-y-8">
            {/* Overdue */}
            {groupedTasks.overdue && groupedTasks.overdue.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                  ⚠️ Vencidas ({groupedTasks.overdue.length})
                </h2>
                <div className="space-y-3">
                  {groupedTasks.overdue.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={() => handleCompleteTask(task)}
                      onDelete={() => handleDeleteTask(task)}
                      onSelectLead={() => handleSelectLead(task.leadId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today */}
            {groupedTasks.today && groupedTasks.today.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-amber-600 mb-4 flex items-center gap-2">
                  📅 Hoy ({groupedTasks.today.length})
                </h2>
                <div className="space-y-3">
                  {groupedTasks.today.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={() => handleCompleteTask(task)}
                      onDelete={() => handleDeleteTask(task)}
                      onSelectLead={() => handleSelectLead(task.leadId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {groupedTasks.upcoming && groupedTasks.upcoming.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
                  📍 Próximas ({groupedTasks.upcoming.length})
                </h2>
                <div className="space-y-3">
                  {groupedTasks.upcoming.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={() => handleCompleteTask(task)}
                      onDelete={() => handleDeleteTask(task)}
                      onSelectLead={() => handleSelectLead(task.leadId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {stats.total === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                  <CheckSquare className="text-green-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sin tareas pendientes</h3>
                <p className="text-gray-500 mb-6">¡Excelente! Todas tus tareas están completas.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
