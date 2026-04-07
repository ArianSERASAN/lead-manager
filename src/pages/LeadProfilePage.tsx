import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Mail, Phone, Globe, MapPin,
  Building2, Briefcase, User, Calendar, Loader2, AlertCircle,
  Pencil, Check, X, Save, ExternalLink, Tag, Clock, XCircle,
  Hash, FileText, AlignLeft, ToggleLeft, ToggleRight, List, Plus, type LucideIcon,
} from 'lucide-react';
import { useLeadById } from '../hooks/leads/useLeadById';
import { useFieldSchema } from '../hooks/leads/useFieldSchema';
import { useLeadActivity } from '../hooks/leads/useLeadActivity';
import { useLeadTasks } from '../hooks/leads/useLeadTasks';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ScoreBadge } from '../components/Scoring/ScoreBadge';
import { ScoreBreakdown } from '../components/Scoring/ScoreBreakdown';
import { TagEditor } from '../components/Tags/TagEditor';
import { AssigneeDropdown } from '../components/User/AssigneeDropdown';
import { LeadActivityTimeline } from '../components/LeadViews/LeadActivityTimeline';
import { TaskList } from '../components/Tasks/TaskList';
import { ApolloEnrichmentPanel } from '../components/LeadViews/ApolloEnrichmentPanel';
import { RoleGuard } from '../components/User/RoleGuard';
import { CancellationModal } from '../components/Shared/CancellationModal';
import { MergeLeadsModal } from '../components/LeadViews/MergeLeadsModal';
import { Lead, LeadStatus, FieldDefinition, FieldType } from '../types/domain';
import { formatTimestamp } from '../utils/format';
import * as LeadService from '../services/LeadService';
import * as ActivityService from '../services/ActivityService';

// ─── Helpers ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<LeadStatus, { label: string; cls: string; dot: string }> = {
  nuevo: { label: 'Nuevo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  contactado: { label: 'Contactado', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  'en-progreso': { label: 'En Progreso', cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  cerrado: { label: 'Cerrado', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-50 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
};

const SOURCE_CONFIG: Record<Lead['source'], { label: string; cls: string }> = {
  landing: { label: 'Landing page', cls: 'bg-blue-50 text-blue-600' },
  'web-download': { label: 'Descarga PDF', cls: 'bg-emerald-50 text-emerald-600' },
  'web-contact': { label: 'Formulario web', cls: 'bg-purple-50 text-purple-600' },
  manual: { label: 'Manual', cls: 'bg-gray-100 text-gray-600' },
  'csv-import': { label: 'Importado', cls: 'bg-orange-50 text-orange-600' },
};

const FIELD_TYPE_ICON: Record<FieldType, LucideIcon> = {
  text: Hash,
  number: Hash,
  email: Mail,
  phone: Phone,
  url: Globe,
  date: Calendar,
  select: List,
  'multi-select': List,
  textarea: AlignLeft,
  checkbox: ToggleLeft,
};

// ─── Inline editable field value ─────────────────────────────────

interface InlineFieldProps {
  label: string;
  value: string;
  onSave: (val: string) => Promise<void>;
  editable?: boolean;
  href?: string;
  prefix?: string;
  placeholder?: string;
}

function InlineField({ label, value, onSave, editable = true, href, prefix = '', placeholder = '—' }: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="group">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button onClick={handleSave} disabled={saving} className="text-emerald-600 hover:text-emerald-700 p-1">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </button>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 min-h-[24px]">
          {value ? (
            href ? (
              <a href={href} className="text-sm text-blue-600 hover:underline truncate">
                {prefix}{value}
              </a>
            ) : (
              <span className="text-sm text-gray-800 truncate">{prefix}{value}</span>
            )
          ) : (
            <span className="text-sm text-gray-300">{placeholder}</span>
          )}
          {editable && (
            <button
              onClick={() => { setDraft(value); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 transition-opacity p-0.5 shrink-0"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Custom field value renderer/editor ──────────────────────────

interface CustomFieldProps {
  field: FieldDefinition;
  value: unknown;
  editable: boolean;
  onSave: (val: unknown) => Promise<void>;
}

function CustomFieldView({ field, value, editable, onSave }: CustomFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);
  const [saving, setSaving] = useState(false);

  const Icon = FIELD_TYPE_ICON[field.type] || Hash;

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  const renderValue = () => {
    if (value === null || value === undefined || value === '') return <span className="text-gray-300 text-sm">—</span>;
    if (field.type === 'checkbox') return <span className="text-sm">{value ? '✓ Sí' : '✗ No'}</span>;
    if (field.type === 'url') return <a href={String(value)} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate flex items-center gap-1">{String(value)}<ExternalLink size={10} /></a>;
    if (field.type === 'email') return <a href={`mailto:${value}`} className="text-sm text-blue-600 hover:underline">{String(value)}</a>;
    if (field.type === 'phone') return <a href={`tel:${value}`} className="text-sm text-gray-800">{String(value)}</a>;
    if (field.type === 'multi-select' && Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {(value as string[]).map((v) => (
            <span key={v} className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">{v}</span>
          ))}
        </div>
      );
    }
    return <span className="text-sm text-gray-800">{String(value)}</span>;
  };

  const renderEditor = () => {
    switch (field.type) {
      case 'textarea':
        return <textarea autoFocus value={String(draft ?? '')} onChange={(e) => setDraft(e.target.value)} className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none h-20" />;
      case 'checkbox':
        return (
          <button
            onClick={() => setDraft(!draft)}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${draft ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
          >
            {draft ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            {draft ? 'Sí' : 'No'}
          </button>
        );
      case 'select':
        return (
          <select
            autoFocus
            value={String(draft ?? '')}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Seleccionar...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'number':
        return <input autoFocus type="number" value={String(draft ?? '')} onChange={(e) => setDraft(e.target.value)} className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />;
      case 'date':
        return <input autoFocus type="date" value={String(draft ?? '')} onChange={(e) => setDraft(e.target.value)} className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />;
      default:
        return (
          <input
            autoFocus
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
            value={String(draft ?? '')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        );
    }
  };

  return (
    <div className="group">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={10} className="text-gray-400" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{field.label}</p>
        {field.required && <span className="text-red-400 text-[10px]">*</span>}
      </div>

      {editing ? (
        <div className="space-y-1.5">
          {renderEditor()}
          {field.type !== 'checkbox' && (
            <div className="flex gap-1.5">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Guardar
              </button>
              <button onClick={() => { setDraft(value); setEditing(false); }} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          )}
          {field.type === 'checkbox' && (
            <div className="flex gap-1.5">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Guardar
              </button>
              <button onClick={() => { setDraft(value); setEditing(false); }} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">{renderValue()}</div>
          {editable && (
            <button
              onClick={() => { setDraft(value); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-blue-500 transition-opacity p-0.5 shrink-0 mt-0.5"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Info Section Card ────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, accentClass = 'bg-gray-50' }: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  accentClass?: string;
}) {
  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm">
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-gray-100 ${accentClass}`}>
        <Icon size={14} className="text-gray-500" />
        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

type SidePanelTab = 'actividad' | 'tareas';

export function LeadProfilePage() {
  const { collection: col, id } = useParams<{ collection: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { appUser } = useAuth();
  const { addToast } = useToast();

  const { lead, loading, error } = useLeadById(col || '', id || '');
  const { fields: customSchema } = useFieldSchema();
  const { tasks } = useLeadTasks(col || 'leads', id || '');

  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>('actividad');
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Navigation: leads list passed via router state
  const navLeads: Lead[] = (location.state as { leads?: Lead[] })?.leads || [];
  const currentIdx = navLeads.findIndex((l) => l.id === id);
  const prevLead = currentIdx > 0 ? navLeads[currentIdx - 1] : null;
  const nextLead = currentIdx !== -1 && currentIdx < navLeads.length - 1 ? navLeads[currentIdx + 1] : null;

  const navigateTo = (l: Lead) => {
    navigate(`/leads/${l._collection || 'leads'}/${l.id}`, { state: location.state });
  };

  // ── Field update helpers ──────────────────────────────────────

  const FIELD_LABELS: Record<string, string> = {
    name: 'nombre', email: 'email', phone: 'teléfono', company: 'empresa',
    cargo: 'cargo', sector: 'sector', apellidos: 'apellidos',
    localidad: 'localidad', direccion: 'dirección', tipoInmueble: 'tipo de inmueble',
    superficie: 'superficie', referenciaCatastral: 'ref. catastral', message: 'mensaje',
  };

  const updateField = useCallback(async (field: string, value: unknown) => {
    if (!lead) return;
    const oldValue = (lead as unknown as Record<string, unknown>)[field];
    await LeadService.updateLeadField(lead, field, value);
    if (appUser) {
      const colName = lead._collection || 'leads';
      await ActivityService.recordActivity(lead.id, colName, appUser.uid, appUser.name, 'field_updated', {
        field: FIELD_LABELS[field] || field,
        oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : '',
        newValue: value !== null && value !== undefined ? String(value) : '',
      });
    }
  }, [lead, appUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = useCallback(async (status: LeadStatus) => {
    if (!lead || !appUser) return;
    try {
      await LeadService.updateLeadStatus(lead, status, appUser.uid, appUser.name);
      const colName = lead._collection || 'leads';
      await ActivityService.recordActivity(lead.id, colName, appUser.uid, appUser.name,
        status === 'cerrado' ? 'closed' : 'status_change',
        { field: 'status', oldValue: lead.status, newValue: status });
      addToast({ message: `Estado actualizado: ${STATUS_CONFIG[status].label}`, type: 'success' });
    } catch {
      addToast({ message: 'Error al actualizar estado', type: 'error' });
    }
  }, [lead, appUser, addToast]);

  const updateNotes = useCallback(async () => {
    if (!lead) return;
    setSavingNotes(true);
    try {
      await LeadService.updateLeadNotes(lead, notesDraft);
      if (appUser) {
        const colName = lead._collection || 'leads';
        await ActivityService.recordActivity(lead.id, colName, appUser.uid, appUser.name, 'note_added', { note: notesDraft });
      }
      addToast({ message: 'Notas guardadas', type: 'success' });
      setNotesEditing(false);
    } catch {
      addToast({ message: 'Error al guardar notas', type: 'error' });
    } finally {
      setSavingNotes(false);
    }
  }, [lead, notesDraft, appUser, addToast]);

  const updateCustomField = useCallback(async (fieldName: string, value: unknown) => {
    if (!lead) return;
    const merged = { ...(lead.customFields || {}), [fieldName]: value };
    await updateField('customFields', merged);
  }, [lead, updateField]);

  const assignLead = useCallback(async (userId: string) => {
    if (!lead) return;
    try {
      await LeadService.assignLead(lead, userId);
      if (appUser) {
        const colName = lead._collection || 'leads';
        await ActivityService.recordActivity(lead.id, colName, appUser.uid, appUser.name, 'assigned', { newValue: userId });
      }
      addToast({ message: 'Lead asignado', type: 'success' });
    } catch {
      addToast({ message: 'Error al asignar', type: 'error' });
    }
  }, [lead, appUser, addToast]);

  const updateTags = useCallback(async (tags: string[]) => {
    if (!lead) return;
    await LeadService.updateLeadTags(lead, tags);
  }, [lead]);

  const handleCancel = useCallback(async (reason: string) => {
    if (!lead || !appUser) return;
    try {
      await LeadService.cancelLead(lead, reason, appUser.uid, appUser.name);
      const colName = lead._collection || 'leads';
      await ActivityService.recordActivity(lead.id, colName, appUser.uid, appUser.name, 'cancelled',
        { field: 'status', oldValue: lead.status, newValue: 'cancelado', note: reason });
      addToast({ message: 'Lead cancelado', type: 'success' });
      setShowCancelModal(false);
    } catch {
      addToast({ message: 'Error al cancelar', type: 'error' });
    }
  }, [lead, appUser, addToast]);

  // ── Render states ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-500" size={28} />
          <p className="text-sm text-gray-400">Cargando ficha...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-400 mb-3" size={32} />
          <p className="text-gray-600 font-medium">{error || 'Lead no encontrado'}</p>
          <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <ArrowLeft size={14} /> Volver a leads
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[lead.status];
  const sourceCfg = SOURCE_CONFIG[lead.source];
  const canEdit = appUser?.role === 'admin' || appUser?.role === 'comercial';
  const visibleCustomFields = customSchema.filter((f) => f.visible).sort((a, b) => a.order - b.order);

  // Group custom fields by section
  const fieldsBySection: Record<string, FieldDefinition[]> = {};
  for (const f of visibleCustomFields) {
    const sec = f.section || '';
    if (!fieldsBySection[sec]) fieldsBySection[sec] = [];
    fieldsBySection[sec].push(f);
  }

  // Ad-hoc fields from imports: keys in customFields not covered by any schema definition
  const schemaFieldNames = new Set(customSchema.map((f) => f.name));
  const adHocEntries = Object.entries(lead.customFields || {}).filter(
    ([key, val]) => !schemaFieldNames.has(key) && val !== null && val !== undefined && val !== ''
  );

  const hasContactInfo = lead.email || lead.phone;
  const hasCompanyInfo = lead.company || lead.cargo || lead.sector;
  const hasPropertyInfo = lead.tipoInmueble || lead.superficie || lead.localidad || lead.direccion || lead.referenciaCatastral;
  const hasInterest = (lead.servicios && lead.servicios.length > 0) || lead.message;

  return (
    <>
      {/* ── Top navigation bar ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Volver
        </button>

        {/* Prev / Next navigation */}
        {navLeads.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevLead && navigateTo(prevLead)}
              disabled={!prevLead}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>
            {currentIdx !== -1 && (
              <span className="text-xs text-gray-400 font-medium">
                {currentIdx + 1} / {navLeads.length}
              </span>
            )}
            <button
              onClick={() => nextLead && navigateTo(nextLead)}
              disabled={!nextLead}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Hero header ────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-5 md:p-6 mb-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-md select-none">
              {lead.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-2 mb-1.5">
              {canEdit ? (
                <div className="flex flex-wrap items-center gap-2">
                  <InlineField
                    label=""
                    value={lead.name}
                    editable={canEdit}
                    onSave={(v) => updateField('name', v)}
                    placeholder="Nombre"
                  />
                  <InlineField
                    label=""
                    value={lead.apellidos || ''}
                    editable={canEdit}
                    placeholder="Apellidos"
                    onSave={(v) => updateField('apellidos', v)}
                  />
                </div>
              ) : (
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                  {lead.name}{lead.apellidos ? ` ${lead.apellidos}` : ''}
                </h1>
              )}
              {lead.isStale && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                  <Clock size={10} /> Sin actividad
                </span>
              )}
            </div>

            {/* Company + role line */}
            {(lead.company || lead.cargo) && (
              <p className="text-base text-gray-500 mb-2">
                {lead.cargo && <span className="font-medium text-gray-700">{lead.cargo}</span>}
                {lead.cargo && lead.company && <span className="text-gray-400 mx-1">·</span>}
                {lead.company && <span>{lead.company}</span>}
              </p>
            )}

            {/* Quick contact line */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {lead.email && lead.email !== '—' && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <Mail size={13} />{lead.email}
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
                  <Phone size={13} />{lead.phone}
                </a>
              )}
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sourceCfg.cls}`}>
                {sourceCfg.label}
              </span>
              <span className="text-xs text-gray-400">
                {formatTimestamp(lead.createdAt)}
              </span>
              {lead.tags && lead.tags.length > 0 && lead.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                  <Tag size={9} />{tag}
                </span>
              ))}
              {lead.tags && lead.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{lead.tags.length - 3} más</span>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="shrink-0">
            <button
              onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
              className="hover:opacity-80 transition-opacity"
              aria-label="Ver desglose de puntuación"
            >
              <ScoreBadge score={lead.score} size="lg" />
            </button>
          </div>
        </div>

        {/* Score breakdown */}
        {showScoreBreakdown && lead.scoreBreakdown && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <ScoreBreakdown breakdown={lead.scoreBreakdown} score={lead.score} />
          </div>
        )}
      </div>

      {/* ── Body: two columns ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* ─ Left column ─────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Contact info */}
          {hasContactInfo && (
            <SectionCard title="Contacto" icon={User} accentClass="bg-blue-50/60">
              {lead.email && lead.email !== '—' && (
                <InlineField
                  label="Email"
                  value={lead.email}
                  href={`mailto:${lead.email}`}
                  editable={canEdit}
                  onSave={(v) => updateField('email', v)}
                />
              )}
              {(lead.phone || canEdit) && (
                <InlineField
                  label="Teléfono"
                  value={lead.phone || ''}
                  href={lead.phone ? `tel:${lead.phone}` : undefined}
                  editable={canEdit}
                  placeholder="Sin teléfono"
                  onSave={(v) => updateField('phone', v)}
                />
              )}
            </SectionCard>
          )}

          {/* Company info */}
          {(hasCompanyInfo || canEdit) && (
            <SectionCard title="Empresa" icon={Building2} accentClass="bg-emerald-50/60">
              <InlineField
                label="Empresa"
                value={lead.company || ''}
                editable={canEdit}
                placeholder="Sin empresa"
                onSave={(v) => updateField('company', v)}
              />
              {(lead.cargo || canEdit) && (
                <InlineField
                  label="Cargo"
                  value={lead.cargo || ''}
                  editable={canEdit}
                  placeholder="Sin cargo"
                  onSave={(v) => updateField('cargo', v)}
                />
              )}
              {(lead.sector || canEdit) && (
                <InlineField
                  label="Sector"
                  value={lead.sector || ''}
                  editable={canEdit}
                  placeholder="Sin sector"
                  onSave={(v) => updateField('sector', v)}
                />
              )}
            </SectionCard>
          )}

          {/* Property info (Reactiva tu Edificio) */}
          {hasPropertyInfo && (
            <SectionCard title="Inmueble" icon={MapPin} accentClass="bg-purple-50/60">
              {lead.tipoInmueble && (
                <InlineField label="Tipo de inmueble" value={lead.tipoInmueble} editable={canEdit} onSave={(v) => updateField('tipoInmueble', v)} />
              )}
              {lead.superficie && (
                <InlineField label="Superficie" value={lead.superficie} prefix="" editable={canEdit} onSave={(v) => updateField('superficie', v)} />
              )}
              {lead.localidad && (
                <InlineField label="Localidad" value={lead.localidad} editable={canEdit} onSave={(v) => updateField('localidad', v)} />
              )}
              {lead.direccion && (
                <InlineField label="Dirección" value={lead.direccion} editable={canEdit} onSave={(v) => updateField('direccion', v)} />
              )}
              {(lead.referenciaCatastral || canEdit) && (
                <InlineField
                  label="Ref. Catastral"
                  value={lead.referenciaCatastral || ''}
                  editable={canEdit}
                  placeholder="Sin referencia catastral"
                  onSave={(v) => updateField('referenciaCatastral', v)}
                />
              )}
            </SectionCard>
          )}

          {/* Interest / services */}
          {hasInterest && (
            <SectionCard title="Interés" icon={Briefcase} accentClass="bg-amber-50/60">
              {lead.servicios && lead.servicios.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Servicios solicitados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.servicios.map((s) => (
                      <span key={s} className="text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {(lead.message || canEdit) && (
                <InlineField
                  label="Mensaje"
                  value={lead.message || ''}
                  editable={canEdit}
                  placeholder="Sin mensaje"
                  onSave={(v) => updateField('message', v)}
                />
              )}
            </SectionCard>
          )}

          {/* Custom fields (grouped by section) */}
          {visibleCustomFields.length > 0 && (
            <div className="space-y-5">
              {Object.entries(fieldsBySection).map(([section, sectionFields]) => (
                <SectionCard
                  key={section || '__default__'}
                  title={section || 'Campos personalizados'}
                  icon={FileText}
                  accentClass="bg-indigo-50/60"
                >
                  {sectionFields.map((field) => (
                    <CustomFieldView
                      key={field.id}
                      field={field}
                      value={(lead.customFields || {})[field.name]}
                      editable={canEdit}
                      onSave={(val) => updateCustomField(field.name, val)}
                    />
                  ))}
                </SectionCard>
              ))}
            </div>
          )}

          {/* Ad-hoc fields from Excel/CSV imports (no schema definition) */}
          {(adHocEntries.length > 0 || canEdit) && (
            <SectionCard title="Datos adicionales" icon={Hash} accentClass="bg-amber-50/60">
              {adHocEntries.map(([key, val]) => (
                <InlineField
                  key={key}
                  label={key}
                  value={String(val)}
                  editable={canEdit}
                  onSave={(v) => updateCustomField(key, v)}
                />
              ))}

              {/* Add new custom field inline */}
              {canEdit && (
                <div className="pt-1">
                  {addingField ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={newFieldKey}
                          onChange={(e) => setNewFieldKey(e.target.value)}
                          placeholder="Nombre del campo"
                          className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <input
                          type="text"
                          value={newFieldValue}
                          onChange={(e) => setNewFieldValue(e.target.value)}
                          placeholder="Valor"
                          className="flex-1 text-sm border border-blue-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const key = newFieldKey.trim();
                            const val = newFieldValue.trim();
                            if (!key) return;
                            await updateCustomField(key, val);
                            setNewFieldKey('');
                            setNewFieldValue('');
                            setAddingField(false);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                        >
                          <Check size={12} /> Añadir
                        </button>
                        <button
                          onClick={() => { setAddingField(false); setNewFieldKey(''); setNewFieldValue(''); }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingField(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Plus size={12} /> Añadir campo
                    </button>
                  )}
                </div>
              )}
            </SectionCard>
          )}

          {/* Apollo enrichment */}
          <RoleGuard requires="canEdit" fallback={lead.enrichment ? <ApolloEnrichmentPanel lead={lead} /> : null}>
            <ApolloEnrichmentPanel lead={lead} />
          </RoleGuard>

          {/* Notes */}
          <SectionCard title="Notas" icon={AlignLeft}>
            <RoleGuard requires="canEdit" fallback={
              <p className="text-sm text-gray-700 min-h-16 p-3 bg-gray-50 rounded-xl leading-relaxed">
                {lead.notes || <span className="text-gray-300">Sin notas...</span>}
              </p>
            }>
              {notesEditing ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Escribe notas sobre este lead..."
                    className="w-full bg-gray-50 border border-blue-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none min-h-28"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={updateNotes}
                      disabled={savingNotes}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                    >
                      {savingNotes ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Guardar
                    </button>
                    <button
                      onClick={() => setNotesEditing(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed min-h-16 p-3 bg-gray-50 rounded-xl mb-2">
                    {lead.notes || <span className="text-gray-300">Sin notas...</span>}
                  </p>
                  <button
                    onClick={() => { setNotesDraft(lead.notes || ''); setNotesEditing(true); }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <Pencil size={13} />
                    {lead.notes ? 'Editar notas' : 'Añadir notas'}
                  </button>
                </div>
              )}
            </RoleGuard>
          </SectionCard>

        </div>

        {/* ─ Right column ────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Pipeline / Status card */}
          <SectionCard title="Pipeline" icon={Hash} accentClass="bg-gray-50">
            <div className="space-y-4">
              {/* Status */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Estado</p>
                <RoleGuard requires="canEdit" fallback={
                  <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl border ${statusCfg.cls}`}>
                    <span className={`w-2 h-2 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                }>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(e.target.value as LeadStatus)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none cursor-pointer"
                  >
                    <option value="nuevo">Nuevo</option>
                    <option value="contactado">Contactado</option>
                    <option value="en-progreso">En Progreso</option>
                    <option value="cerrado">Cerrado (ganado)</option>
                  </select>
                </RoleGuard>
              </div>

              {/* Assignee */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Asignado a</p>
                <RoleGuard requires="canAssign" fallback={
                  <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-xl">
                    {lead.assignedTo ? 'Asignado' : 'Sin asignar'}
                  </p>
                }>
                  <AssigneeDropdown currentAssigneeId={lead.assignedTo} onAssign={assignLead} />
                </RoleGuard>
              </div>

              {/* Tags */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Etiquetas</p>
                <RoleGuard requires="canEdit" fallback={
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.tags || []).map((t) => (
                      <span key={t} className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">{t}</span>
                    ))}
                    {(lead.tags || []).length === 0 && <span className="text-xs text-gray-300">Sin etiquetas</span>}
                  </div>
                }>
                  <TagEditor
                    tags={lead.tags || []}
                    onChange={updateTags}
                    leadId={lead.id}
                    leadCollection={lead._collection || 'leads'}
                  />
                </RoleGuard>
              </div>

              {/* Created date */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Creado el</p>
                <p className="text-sm text-gray-600">{formatTimestamp(lead.createdAt)}</p>
              </div>
            </div>
          </SectionCard>

          {/* Cancellation info */}
          {lead.status === 'cancelado' && lead.cancellationReason && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Motivo de cancelación</p>
              <p className="text-sm text-red-800">{lead.cancellationReason}</p>
              {lead.closedAt && (
                <p className="text-xs text-red-400 mt-1">
                  {formatTimestamp(lead.closedAt)}
                  {lead.closedByName && ` · por ${lead.closedByName}`}
                </p>
              )}
            </div>
          )}

          {/* Merge + Cancel buttons (for non-cancelled leads) */}
          {lead.status !== 'cancelado' && (
            <RoleGuard requires="canEdit">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-600 text-sm font-semibold border border-purple-200 rounded-2xl hover:bg-purple-100 transition-colors active:scale-[0.98]"
                >
                  <Plus size={15} />
                  Fusionar
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 text-sm font-semibold border border-red-200 rounded-2xl hover:bg-red-100 transition-colors active:scale-[0.98]"
                >
                  <XCircle size={15} />
                  Cancelar
                </button>
              </div>
            </RoleGuard>
          )}

          {/* Activity / Tasks tabs */}
          <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex border-b border-gray-100">
              {(['actividad', 'tareas'] as SidePanelTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidePanelTab(tab)}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                    sidePanelTab === tab
                      ? 'text-blue-700 bg-blue-50/80 border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'actividad' ? `Actividad` : `Tareas (${tasks.length})`}
                </button>
              ))}
            </div>
            <div className="p-4">
              {sidePanelTab === 'actividad' ? (
                <LeadActivityTimeline
                  leadId={lead.id}
                  leadCollection={lead._collection || 'leads'}
                />
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
          </div>

        </div>
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={showCancelModal}
        leadName={lead.name}
        isBulk={false}
        bulkCount={0}
        onConfirm={handleCancel}
        onClose={() => setShowCancelModal(false)}
      />

      {/* Merge Modal */}
      <MergeLeadsModal
        isOpen={showMergeModal}
        onClose={() => setShowMergeModal(false)}
        leadA={lead}
        onMerged={() => navigate('/')}
      />
    </>
  );
}
