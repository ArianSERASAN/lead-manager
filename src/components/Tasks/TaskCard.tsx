import { Task } from '../../types/domain';
import { CheckCircle2, Circle } from 'lucide-react';
import { formatTimestamp, daysSince } from '../../utils/format';

interface TaskCardProps {
  task: Task & { leadName?: string; leadEmail?: string };
  onToggleComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onSelectLead?: () => void;
}

export function TaskCard({ task, onToggleComplete, onDelete, onSelectLead }: TaskCardProps) {
  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
    }
  };

  const getDueDateColor = (dueAt: Task['dueAt']) => {
    const days = daysSince(dueAt);
    if (days < 0) return 'text-red-600'; // Overdue
    if (days === 0) return 'text-amber-600'; // Today
    return 'text-gray-600';
  };

  const daysUntilDue = daysSince(task.dueAt);
  const isDueToday = daysUntilDue === 0;
  const isOverdue = daysUntilDue < 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 hover-lift ${
      task.completed ? 'opacity-60 bg-gray-50' : ''
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id)}
          className="flex-shrink-0 mt-1 text-gray-400 hover:text-blue-600 transition-colors"
        >
          {task.completed ? (
            <CheckCircle2 size={20} className="text-green-600" />
          ) : (
            <Circle size={20} />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-sm mb-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {task.title}
          </h4>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Priority Badge */}
            <span className={`text-xs font-semibold px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>

            {/* Due Date */}
            <span className={`text-xs font-semibold ${getDueDateColor(task.dueAt)}`}>
              {isOverdue && '⚠️ '}
              {isDueToday && '📅 '}
              {formatTimestamp(task.dueAt)}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-xs text-gray-600 mb-2">{task.description}</p>
          )}

          {/* Lead Info */}
          <div className="flex items-center justify-between">
            <button
              onClick={onSelectLead}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {task.leadName} {task.leadEmail && `(${task.leadEmail})`}
            </button>

            {/* Delete Button */}
            <button
              onClick={() => onDelete(task.id)}
              className="text-xs text-gray-400 hover:text-red-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
