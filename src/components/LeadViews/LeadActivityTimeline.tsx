import { useLeadActivity } from '../../hooks/leads/useLeadActivity';
import { formatRelativeTime } from '../../utils/format';
import {
  ArrowRight,
  MessageSquare,
  Plus,
  UserPlus,
  Tag,
  X,
  CheckSquare,
  Loader2,
} from 'lucide-react';
import { Activity, ActivityAction } from '../../types/domain';

interface LeadActivityTimelineProps {
  leadId: string;
  leadCollection: string;
}

function getActionIcon(action: ActivityAction) {
  switch (action) {
    case 'status_change':
      return <ArrowRight size={16} className="text-primary-600" />;
    case 'note_added':
      return <MessageSquare size={16} className="text-purple-600" />;
    case 'created':
      return <Plus size={16} className="text-green-600" />;
    case 'assigned':
      return <UserPlus size={16} className="text-orange-600" />;
    case 'tag_added':
      return <Tag size={16} className="text-cyan-600" />;
    case 'tag_removed':
      return <X size={16} className="text-red-600" />;
    case 'task_created':
      return <CheckSquare size={16} className="text-indigo-600" />;
    case 'task_completed':
      return <CheckSquare size={16} className="text-emerald-600" />;
    case 'score_updated':
      return <ArrowRight size={16} className="text-amber-600" />;
    default:
      return <Plus size={16} className="text-gray-600" />;
  }
}

function getActionColor(action: ActivityAction): string {
  switch (action) {
    case 'status_change':
      return 'bg-primary-100';
    case 'note_added':
      return 'bg-purple-100';
    case 'created':
      return 'bg-green-100';
    case 'assigned':
      return 'bg-orange-100';
    case 'tag_added':
      return 'bg-cyan-100';
    case 'tag_removed':
      return 'bg-red-100';
    case 'task_created':
      return 'bg-indigo-100';
    case 'task_completed':
      return 'bg-emerald-100';
    case 'score_updated':
      return 'bg-amber-100';
    default:
      return 'bg-gray-100';
  }
}

function getActionDescription(activity: Activity): string {
  const { action, details, actorName } = activity;
  const actor = actorName || 'Sistema';

  switch (action) {
    case 'status_change':
      return `${actor} cambió el estado de ${details.oldValue || 'desconocido'} a ${details.newValue}`;
    case 'note_added':
      const notePreview = details.note ? details.note.substring(0, 100) : '';
      return `${actor} añadió una nota: "${notePreview}${details.note && details.note.length > 100 ? '...' : ''}"`;
    case 'created':
      return `${actor} creó este lead`;
    case 'assigned':
      return `${actor} asignó a ${details.newValue}`;
    case 'tag_added':
      const tagList = Array.isArray(details.newValue)
        ? details.newValue.join(', ')
        : details.newValue;
      return `${actor} añadió la etiqueta${Array.isArray(details.newValue) && details.newValue.length > 1 ? 's' : ''} '${tagList}'`;
    case 'tag_removed':
      const removedList = Array.isArray(details.oldValue)
        ? details.oldValue.join(', ')
        : details.oldValue;
      return `${actor} eliminó la etiqueta${Array.isArray(details.oldValue) && details.oldValue.length > 1 ? 's' : ''} '${removedList}'`;
    case 'task_created':
      return `${actor} creó una tarea: ${details.description || 'Sin título'}`;
    case 'task_completed':
      return `${actor} completó una tarea: ${details.description || 'Sin título'}`;
    case 'score_updated':
      return `${actor} actualizó la puntuación a ${details.newValue}`;
    default:
      return `${actor} realizó una acción`;
  }
}

export function LeadActivityTimeline({ leadId, leadCollection }: LeadActivityTimelineProps) {
  const { activities, loading } = useLeadActivity(leadId, leadCollection);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          Sin actividad registrada. La actividad se registrará automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Timeline entries */}
      <div className="space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-4 relative">
            {/* Colored dot */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getActionColor(activity.action)} flex items-center justify-center relative z-10`}>
              {getActionIcon(activity.action)}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <p className="text-sm text-gray-900">
                {getActionDescription(activity)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatRelativeTime(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
