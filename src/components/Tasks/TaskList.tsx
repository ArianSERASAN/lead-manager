import { useState } from 'react';
import { Task } from '../../types/domain';
import { Plus, Loader2 } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { TaskForm } from './TaskForm';
import { createTask, completeTask, deleteTask } from '../../services/TaskService';
import { recordActivity } from '../../services/ActivityService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface TaskListProps {
  tasks: Task[];
  leadId: string;
  leadCollection: string;
  leadName: string;
  leadEmail: string;
}

export function TaskList({ tasks, leadId, leadCollection, leadName, leadEmail }: TaskListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { appUser } = useAuth();
  const { addToast } = useToast();

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'leadId' | 'createdAt' | 'createdBy' | 'completedAt' | 'completedBy'>) => {
    if (!appUser) return;

    setIsLoading(true);
    try {
      const taskId = await createTask(leadCollection, leadId, {
        ...taskData,
        leadId,
        createdBy: appUser.uid,
        completed: false
      });

      await recordActivity(
        leadId,
        leadCollection,
        appUser.uid,
        appUser.name || 'Unknown',
        'task_created',
        { description: `Tarea creada: ${taskData.title}` }
      );

      addToast({ message: 'Tarea creada correctamente', type: 'success' });
      setIsFormOpen(false);
    } catch (err) {
      console.error('Error creating task:', err);
      addToast({ message: 'Error al crear la tarea', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!appUser) return;

    try {
      await completeTask(leadCollection, leadId, taskId, appUser.uid);

      await recordActivity(
        leadId,
        leadCollection,
        appUser.uid,
        appUser.name || 'Unknown',
        'task_completed',
        { description: 'Tarea completada' }
      );

      addToast({ message: 'Tarea marcada como completada', type: 'success' });
    } catch (err) {
      console.error('Error completing task:', err);
      addToast({ message: 'Error al completar la tarea', type: 'error' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(leadCollection, leadId, taskId);
      addToast({ message: 'Tarea eliminada', type: 'success' });
    } catch (err) {
      console.error('Error deleting task:', err);
      addToast({ message: 'Error al eliminar la tarea', type: 'error' });
    }
  };

  const displayTasks = showCompleted ? tasks : tasks.filter(t => !t.completed);
  const completedCount = tasks.filter(t => t.completed).length;

  const tasksWithLeadInfo = displayTasks.map(t => ({
    ...t,
    leadName,
    leadEmail
  }));

  return (
    <div className="space-y-4">
      {/* Form */}
      {isFormOpen && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setIsFormOpen(false)}
          isLoading={isLoading}
        />
      )}

      {/* Create Button */}
      {!isFormOpen && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full bg-blue-50 border-2 border-dashed border-blue-300 text-blue-600 px-4 py-3 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors duration-150 btn-press flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Nueva Tarea
        </button>
      )}

      {/* Task List */}
      {tasksWithLeadInfo.length > 0 ? (
        <div className="space-y-2">
          {tasksWithLeadInfo.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleCompleteTask}
              onDelete={handleDeleteTask}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm font-semibold">Sin tareas pendientes</p>
          {completedCount > 0 && !showCompleted && (
            <p className="text-xs mt-2">
              {completedCount} tarea{completedCount !== 1 ? 's' : ''} completada{completedCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Show Completed Toggle */}
      {completedCount > 0 && (
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="w-full text-center py-2 text-xs text-gray-500 hover:text-gray-700 font-semibold transition-colors"
        >
          {showCompleted
            ? `Ocultar ${completedCount} completada${completedCount !== 1 ? 's' : ''}`
            : `Mostrar ${completedCount} completada${completedCount !== 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  );
}
