import { Lead, LeadStatus } from '../../types/domain';
import { useState, useEffect } from 'react';
import { X, Phone, Mail, Building, Clock, Save, Loader2, Copy, Trash2, ChevronDown } from 'lucide-react';
import { formatTimestamp } from '../../utils/format';
import { LeadActivityTimeline } from './LeadActivityTimeline';
import { TagEditor } from '../Tags/TagEditor';
import { ScoreBadge } from '../Scoring/ScoreBadge';
import { ScoreBreakdown } from '../Scoring/ScoreBreakdown';
import { TaskList } from '../Tasks/TaskList';
import { useLeadTasks } from '../../hooks/leads/useLeadTasks';
import { AssigneeDropdown } from '../User/AssigneeDropdown';
import { RoleGuard } from '../User/RoleGuard';

interface LeadDetailProps {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => void;
  onNotesChange: (notes: string) => void;
  onTagsChange: (tags: string[]) => void;
  onAssign: (userId: string) => void;
}

type TabType = 'info' | 'actividad' | 'tareas';

export function LeadDetail({ lead, onStatusChange, onNotesChange, onTagsChange, onAssign }: LeadDetailProps) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState(lead.tags || []);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const { tasks, loading: tasksLoading } = useLeadTasks(lead._collection || 'leads', lead.id);

  useEffect(() => {
    setNotes(lead.notes || '');
    setTags(lead.tags || []);
  }, [lead.id, lead.notes, lead.tags]);

  const handleSaveNotes = async () => {
    setIsLoading(true);
    await onNotesChange(notes);
    setIsLoading(false);
    setIsEditing(false);
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    onTagsChange(newTags);
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-card p-6 sticky top-10 animate-slide-in-right">
      {/* Header */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{lead.name}</h3>
            <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline">
              {lead.email}
            </a>
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="text-sm text-gray-600 ml-3">
                {lead.phone}
              </a>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
              aria-label={`Puntuación: ${lead.score}. Pulsa para ver desglose`}
              aria-expanded={showScoreBreakdown}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ScoreBadge score={lead.score} size="md" />
            </button>
          </div>
        </div>
        {showScoreBreakdown && lead.scoreBreakdown && (
          <div className="mt-4">
            <ScoreBreakdown breakdown={lead.scoreBreakdown} score={lead.score} />
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 pb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'info'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Detalles
        </button>
        <button
          onClick={() => setActiveTab('actividad')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'actividad'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Actividad
        </button>
        <button
          onClick={() => setActiveTab('tareas')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'tareas'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Tareas
        </button>
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div>
          {/* Etiquetas */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-3">
              Etiquetas
            </label>
            <TagEditor
              tags={tags}
              onChange={handleTagsChange}
              leadId={lead.id}
              leadCollection={lead._collection || 'leads'}
            />
          </div>

          {/* Info Cards */}
          <div className="space-y-4 mb-6">
            {/* Status */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Estado
              </label>
              <select
                value={lead.status}
                onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="nuevo">Nuevo</option>
                <option value="contactado">Contactado</option>
                <option value="en-progreso">En Progreso</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>

            {/* Company */}
            {lead.company && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Empresa
                </label>
                <p className="text-sm text-gray-700">{lead.company}</p>
              </div>
            )}

            {/* Assignee */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Asignado a
              </label>
              <RoleGuard requires="canAssign" fallback={
                <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                  {lead.assignedTo ? 'Asignado' : 'Sin asignar'}
                </p>
              }>
                <AssigneeDropdown
                  currentAssigneeId={lead.assignedTo}
                  onAssign={onAssign}
                />
              </RoleGuard>
            </div>

            {/* Created Date */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                Creado el
              </label>
              <p className="text-sm text-gray-700">{formatTimestamp(lead.createdAt)}</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Notas
            </label>
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escribe notas sobre este lead..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Guardar Notas</span>
                </button>
                <button
                  onClick={() => {
                    setNotes(lead.notes || '');
                    setIsEditing(false);
                  }}
                  className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-200"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-3 min-h-20 p-3 bg-gray-50 rounded-lg">
                  {notes || 'Sin notas...'}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-200"
                >
                  Editar Notas
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actividad Tab */}
      {activeTab === 'actividad' && (
        <LeadActivityTimeline
          leadId={lead.id}
          leadCollection={lead._collection || 'leads'}
        />
      )}

      {/* Tareas Tab */}
      {activeTab === 'tareas' && (
        <div>
          {tasksLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">Cargando tareas...</p>
            </div>
          ) : (
            <TaskList
              tasks={tasks}
              leadId={lead.id}
              leadCollection={lead._collection || 'leads'}
              leadName={lead.name}
              leadEmail={lead.email}
            />
          )}
        </div>
      )}
    </div>
  );
}
