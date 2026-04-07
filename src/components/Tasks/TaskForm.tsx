import { useState } from 'react';
import { Task, TaskPriority } from '../../types/domain';
import { X, Save, Loader2 } from 'lucide-react';

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'leadId' | 'createdAt' | 'createdBy' | 'completedAt' | 'completedBy'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaskForm({ onSubmit, onCancel, isLoading = false }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueAt) return;

    const dueDate = new Date(dueAt);
    await onSubmit({
      title,
      description,
      dueAt: dueDate.toISOString(),
      priority,
      completed: false,
      assignedTo: ''
    });

    setTitle('');
    setDescription('');
    setDueAt('');
    setPriority('medium');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-4 mb-4">
      {/* Title */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
          Título *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre de la tarea..."
          required
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles opcionales..."
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none h-20"
        />
      </div>

      {/* Due Date & Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
            Fecha de vencimiento *
          </label>
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            required
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
            Prioridad
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isLoading || !title || !dueAt}
          className="flex-1 bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <Save size={16} />
              Crear Tarea
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
