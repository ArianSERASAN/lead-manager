import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Check, X, Loader2, AlertTriangle, LayoutList } from 'lucide-react';
import { FieldDefinition, FieldType, FieldOption } from '../../types/domain';
import { useFieldSchema } from '../../hooks/leads/useFieldSchema';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { keyToLabel } from '../../utils/fieldDetection';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto',
  number: 'Número',
  email: 'Email',
  phone: 'Teléfono',
  url: 'URL',
  date: 'Fecha',
  select: 'Desplegable',
  'multi-select': 'Multi-opción',
  textarea: 'Texto largo',
  checkbox: 'Casilla',
};

const FIELD_TYPES: FieldType[] = [
  'text', 'number', 'email', 'phone', 'url', 'date',
  'select', 'multi-select', 'textarea', 'checkbox',
];

function generateId(): string {
  return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

// ─── Field Form ───────────────────────────────────────────────────

interface FieldFormProps {
  initial?: Partial<FieldDefinition>;
  existingNames: string[];
  onSave: (data: Omit<FieldDefinition, 'id' | 'createdAt' | 'createdBy'>) => void;
  onCancel: () => void;
  saving: boolean;
}

function FieldForm({ initial, existingNames, onSave, onCancel, saving }: FieldFormProps) {
  const [label, setLabel] = useState(initial?.label || '');
  const [name, setName] = useState(initial?.name || '');
  const [type, setType] = useState<FieldType>(initial?.type || 'text');
  const [section, setSection] = useState(initial?.section || '');
  const [required, setRequired] = useState(initial?.required || false);
  const [options, setOptions] = useState<FieldOption[]>(initial?.options || []);
  const [newOption, setNewOption] = useState('');
  const [nameAutoFilled, setNameAutoFilled] = useState(!initial?.name);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (nameAutoFilled) setName(generateSlug(val));
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setNameAutoFilled(false);
  };

  const addOption = () => {
    const v = newOption.trim();
    if (!v) return;
    setOptions([...options, { value: generateSlug(v), label: v }]);
    setNewOption('');
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!label.trim()) errs.label = 'Etiqueta obligatoria';
    if (!name.trim()) errs.name = 'Clave obligatoria';
    else if (!/^[a-z0-9_]+$/.test(name)) errs.name = 'Solo letras, números y _';
    else if (existingNames.includes(name) && name !== initial?.name) errs.name = 'Esta clave ya existe';
    if ((type === 'select' || type === 'multi-select') && options.length === 0) {
      errs.options = 'Añade al menos una opción';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({
      name,
      label,
      type,
      section: section.trim() || undefined,
      required,
      visible: initial?.visible ?? true,
      order: initial?.order ?? 0,
      options: (type === 'select' || type === 'multi-select') ? options : undefined,
    });
  };

  return (
    <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 space-y-4">
      {/* Label + Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Etiqueta *</label>
          <input
            type="text"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="ej. Presupuesto"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.label ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
          />
          {errors.label && <p className="text-xs text-red-600 mt-1">{errors.label}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Clave interna *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="ej. presupuesto"
            className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          {!errors.name && <p className="text-[10px] text-gray-400 mt-0.5">Solo minúsculas, sin espacios</p>}
        </div>
      </div>

      {/* Type + Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FieldType)}
            className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sección (opcional)</label>
          <input
            type="text"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            placeholder="ej. Datos del proyecto"
            className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Options for select types */}
      {(type === 'select' || type === 'multi-select') && (
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Opciones *</label>
          <div className="space-y-1.5 mb-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                <span className="text-sm flex-1">{opt.label}</span>
                <span className="text-[10px] text-gray-400 font-mono">{opt.value}</span>
                <button onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 p-0.5">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
              placeholder="Nueva opción..."
              className="flex-1 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={addOption}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          {errors.options && <p className="text-xs text-red-600 mt-1">{errors.options}</p>}
        </div>
      )}

      {/* Required toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setRequired(!required)}
          className={`w-8 h-4.5 rounded-full transition-colors flex items-center px-0.5 ${required ? 'bg-blue-500' : 'bg-gray-200'}`}
        >
          <span className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${required ? 'translate-x-3' : ''}`} />
        </button>
        <span className="text-sm text-gray-700">Campo obligatorio</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {initial?.id ? 'Guardar cambios' : 'Crear campo'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────

interface FieldRowProps {
  field: FieldDefinition;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FieldRow({ field, index, total, onEdit, onDelete, onToggleVisible, onMoveUp, onMoveDown }: FieldRowProps) {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors">
      {/* Reorder */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors p-0.5"
          title="Subir"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors p-0.5"
          title="Bajar"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Label + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-gray-900">{field.label}</span>
          {field.section && (
            <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {field.section}
            </span>
          )}
          {field.required && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
              Obligatorio
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] font-mono text-gray-400">{field.name}</span>
          <span className="text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
            {FIELD_TYPE_LABELS[field.type]}
          </span>
          {field.options && field.options.length > 0 && (
            <span className="text-[11px] text-gray-400">{field.options.length} opciones</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleVisible}
          title={field.visible ? 'Ocultar campo' : 'Mostrar campo'}
          className={`p-1.5 rounded-lg transition-colors ${field.visible ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100'}`}
        >
          {field.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button
          onClick={onEdit}
          title="Editar"
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={onDelete}
          title="Eliminar"
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Main FieldSchemaManager ──────────────────────────────────────

export function FieldSchemaManager() {
  const { appUser } = useAuth();
  const { addToast } = useToast();
  const { fields, loading, addField, updateField, deleteField, reorderFields } = useFieldSchema();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const existingNames = fields.map((f) => f.name);

  const handleAdd = async (data: Omit<FieldDefinition, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!appUser) return;
    setSaving(true);
    try {
      const newField: FieldDefinition = {
        ...data,
        id: generateId(),
        order: fields.length,
        createdAt: new Date().toISOString(),
        createdBy: appUser.uid,
      };
      await addField(newField);
      addToast({ message: `Campo "${data.label}" creado`, type: 'success' });
      setShowAddForm(false);
    } catch {
      addToast({ message: 'Error al crear el campo', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (fieldId: string, data: Omit<FieldDefinition, 'id' | 'createdAt' | 'createdBy'>) => {
    setSaving(true);
    try {
      await updateField(fieldId, data);
      addToast({ message: 'Campo actualizado', type: 'success' });
      setEditingId(null);
    } catch {
      addToast({ message: 'Error al actualizar el campo', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (fieldId: string) => {
    setDeletingId(fieldId);
    try {
      await deleteField(fieldId);
      addToast({ message: 'Campo eliminado', type: 'success' });
    } catch {
      addToast({ message: 'Error al eliminar el campo', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleVisible = async (field: FieldDefinition) => {
    try {
      await updateField(field.id, { visible: !field.visible });
    } catch {
      addToast({ message: 'Error al cambiar visibilidad', type: 'error' });
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[swapIdx]] = [newFields[swapIdx], newFields[index]];
    const reordered = newFields.map((f, i) => ({ ...f, order: i }));
    try {
      await reorderFields(reordered);
    } catch {
      addToast({ message: 'Error al reordenar', type: 'error' });
    }
  };

  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {fields.length === 0
              ? 'Aún no hay campos personalizados. Crea el primero para enriquecer las fichas de lead.'
              : `${fields.length} campo${fields.length !== 1 ? 's' : ''} definido${fields.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={15} />
            Nuevo campo
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <FieldForm
          existingNames={existingNames}
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
          saving={saving}
        />
      )}

      {/* Field list */}
      {sortedFields.length === 0 && !showAddForm ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
          <LayoutList className="mx-auto text-gray-300 mb-2" size={28} />
          <p className="text-sm text-gray-400">Ningún campo personalizado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedFields.map((field, i) => (
            <div key={field.id}>
              {editingId === field.id ? (
                <FieldForm
                  initial={field}
                  existingNames={existingNames.filter((n) => n !== field.name)}
                  onSave={(data) => handleUpdate(field.id, data)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                />
              ) : deletingId === field.id ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <span className="flex-1 text-sm text-red-800">
                    ¿Eliminar <strong>{field.label}</strong>? Se perderán los datos de todos los leads.
                  </span>
                  <button
                    onClick={() => handleDelete(field.id)}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <FieldRow
                  field={field}
                  index={i}
                  total={sortedFields.length}
                  onEdit={() => setEditingId(field.id)}
                  onDelete={() => setDeletingId(field.id)}
                  onToggleVisible={() => handleToggleVisible(field)}
                  onMoveUp={() => handleMove(i, 'up')}
                  onMoveDown={() => handleMove(i, 'down')}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Usage note */}
      {fields.length > 0 && (
        <p className="text-xs text-gray-400 pt-2">
          Los campos personalizados se muestran en la ficha completa de cada lead. Los datos se guardan en{' '}
          <code className="bg-gray-100 px-1 rounded">lead.customFields</code>.
        </p>
      )}
    </div>
  );
}
