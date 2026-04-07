import { useState } from 'react';
import { Lead } from '../../types/domain';
import { Pencil, Check, X } from 'lucide-react';

// Standard Lead keys — anything NOT in this set is a "custom field"
const STANDARD_KEYS = new Set([
  'id', 'name', 'email', 'phone', 'company', 'source', 'status',
  'createdAt', 'updatedAt', 'notes', 'tags', 'score', 'scoreBreakdown',
  'isStale', 'resource', 'message', 'apellidos', 'sector', 'cargo',
  'servicios', 'tipoInmueble', 'superficie', 'referenciaCatastral',
  'localidad', 'direccion', 'customFields', 'data', '_collection',
  'enrichment', 'enrichedAt', 'assignedTo', 'assignedAt',
  'movedToStatusAt', 'cancellationReason', 'closedAt', 'closedBy',
  'closedByName', 'stateHistory', 'attachments',
]);

interface CustomFieldsSectionProps {
  lead: Lead;
  onFieldUpdate?: (key: string, value: unknown) => Promise<void>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function CustomFieldsSection({ lead, onFieldUpdate }: CustomFieldsSectionProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Merge customFields + extra keys from raw data
  const fields: Record<string, unknown> = {};

  // 1. Explicit customFields
  if (lead.customFields) {
    for (const [k, v] of Object.entries(lead.customFields)) {
      if (v !== null && v !== undefined && v !== '') fields[k] = v;
    }
  }

  // 2. Extra keys from raw Firestore data
  if (lead.data) {
    for (const [k, v] of Object.entries(lead.data)) {
      if (!STANDARD_KEYS.has(k) && !(k in fields) && v !== null && v !== undefined && v !== '') {
        fields[k] = v;
      }
    }
  }

  const entries = Object.entries(fields);
  if (entries.length === 0) return null;

  const handleStartEdit = (key: string, value: unknown) => {
    setEditingKey(key);
    setEditValue(formatValue(value));
  };

  const handleSave = async (key: string) => {
    if (!onFieldUpdate) return;
    setSaving(true);
    try {
      await onFieldUpdate(key, editValue);
    } finally {
      setSaving(false);
      setEditingKey(null);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  return (
    <div className="bg-teal-50/60 rounded-xl p-3 space-y-2">
      <p className="text-[10px] font-bold text-teal-500 uppercase tracking-wider mb-2">
        Campos adicionales
      </p>
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between items-start gap-2 group">
          <span className="text-xs text-gray-500 shrink-0">{formatKey(key)}</span>
          {editingKey === key ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave(key);
                  if (e.key === 'Escape') handleCancel();
                }}
                autoFocus
                disabled={saving}
                className="text-xs font-medium text-gray-800 bg-white border border-teal-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-teal-400 w-32"
              />
              <button onClick={() => handleSave(key)} disabled={saving} className="text-teal-600 hover:text-teal-800">
                <Check size={12} />
              </button>
              <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-medium text-gray-800 text-right truncate">
                {formatValue(value)}
              </span>
              {onFieldUpdate && (
                <button
                  onClick={() => handleStartEdit(key, value)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-teal-600 transition-opacity shrink-0"
                >
                  <Pencil size={10} />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
