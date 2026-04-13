import { Timestamp } from 'firebase/firestore';

/** Flexible timestamp type that covers Firestore Timestamp, JS Date, and ISO strings */
export type TimestampLike = Timestamp | Date | string | null;

/** Safely convert any TimestampLike to a JS Date */
export function toJSDate(ts: TimestampLike): Date {
  if (!ts) return new Date(0);
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') return ts.toDate();
  return new Date(0);
}

export type LeadStatus = 'nuevo' | 'contactado' | 'en-progreso' | 'cerrado' | 'cancelado';
export type LeadSource = 'landing' | 'web-download' | 'web-contact' | 'manual' | 'csv-import';
export type LeadCollection = 'leads' | 'leads_descargas' | 'solicitudes_contacto';
export type UserRole = 'admin' | 'comercial' | 'read_only';
export type ActivityAction = 'created' | 'status_change' | 'note_added' | 'assigned' | 'tag_added' | 'tag_removed' | 'task_created' | 'task_completed' | 'score_updated' | 'enriched' | 'email_sent' | 'cancelled' | 'closed' | 'field_updated';
export type TaskPriority = 'low' | 'medium' | 'high';

/** Registro de un cambio de estado dentro del documento del lead */
export interface StateChange {
  timestamp: string;          // ISO string (serverTimestamp no puede usarse en arrays)
  actor: string;              // User ID
  actorName?: string;
  fromStatus: LeadStatus;     // Stage del pipeline antes del cambio
  toStatus: LeadStatus;
  reason?: string;            // Motivo (obligatorio en cancelaciones)
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: LeadSource;
  status: LeadStatus;
  createdAt: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
  notes?: string;
  tags: string[];
  score: number;
  scoreBreakdown?: ScoreBreakdown;
  isStale?: boolean;
  assignedTo?: string;
  assignedAt?: Timestamp | Date | string;
  pipelinePosition?: number;
  movedToStatusAt?: Timestamp | Date | string;
  type?: string;
  resource?: string;
  message?: string;
  // Campos de serasanengineering.com (formulario de contacto)
  apellidos?: string;
  sector?: string;
  cargo?: string;
  servicios?: string[];
  // Campos de reactivatuedificio.es (formulario de diagnóstico)
  tipoInmueble?: string;
  superficie?: string;
  referenciaCatastral?: string;
  localidad?: string;
  direccion?: string;
  customFields?: Record<string, unknown>;
  data?: Record<string, unknown>; // Legacy raw data
  _collection?: LeadCollection; // Track original collection for backward compat

  // ─── Cierre / Cancelación ───────────────────────────────────────────
  cancellationReason?: string;                    // Motivo de cancelación
  closedAt?: Timestamp | Date | string;           // Fecha de cierre o cancelación
  closedBy?: string;                              // UID del usuario que cerró/canceló
  closedByName?: string;                          // Nombre del usuario que cerró/canceló
  stateHistory?: StateChange[];                   // Historial de cambios de estado

  // ─── Adjuntos ────────────────────────────────────────────────────
  attachments?: LeadAttachment[];

  // ─── Apollo Enrichment Data ─────────────────────────────────────
  enrichment?: ApolloEnrichment;
  enrichedAt?: Timestamp | Date | string;
}

/** Data returned by Apollo.io People Enrichment + Organization Enrichment */
export interface ApolloEnrichment {
  // Person data
  apolloId?: string;
  firstName?: string;
  lastName?: string;
  title?: string;           // Job title (e.g. "CEO", "CTO")
  headline?: string;        // LinkedIn headline
  linkedinUrl?: string;
  photoUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  seniority?: string;       // e.g. "c_suite", "director"
  departments?: string[];
  // Organization data
  organizationName?: string;
  organizationDomain?: string;
  organizationWebsite?: string;
  organizationIndustry?: string;
  organizationLinkedin?: string;
  organizationSize?: number;       // estimated_num_employees
  organizationFoundedYear?: number;
  organizationRevenue?: number;
  organizationFunding?: number;
  organizationFundingStage?: string;
  // Meta
  source: 'apollo';
  matchConfidence?: string;   // Apollo's match status
  rawResponse?: Record<string, unknown>; // Full raw response for debugging
}

export interface ScoreBreakdown {
  sourceWeight: number;
  completeness: number;
  recency: number;
  responseQuality: number;
}

export interface Activity {
  id: string;
  leadId: string;
  timestamp: Timestamp | Date | string;
  actor: string;
  actorName?: string;
  action: ActivityAction;
  details: {
    oldValue?: string | string[];
    newValue?: string | string[];
    field?: string;
    note?: string;
    description?: string;
  };
}

export interface Task {
  id: string;
  leadId: string;
  title: string;
  description?: string;
  dueAt: Timestamp | Date | string;
  createdAt: Timestamp | Date | string;
  createdBy: string;
  assignedTo?: string;
  completed: boolean;
  completedAt?: Timestamp | Date | string;
  completedBy?: string;
  priority: TaskPriority;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: Timestamp | Date | string | null;
  lastLogin?: Timestamp | Date | string | null;
}

export interface SavedFilter {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp | Date | string;
  filters: FilterState;
}

export interface FilterState {
  search?: string;
  status?: LeadStatus[];
  source?: LeadSource[];
  tags?: string[];
  assignedTo?: string[];
  scoreMin?: number;
  scoreMax?: number;
  staleDays?: number;
  dateRange?: { start: string; end: string };
}

// ─── Alert Configuration ──────────────────────────────────────────

export interface AlertNewLead {
  enabled: boolean;
  recipients: string[];
  sources: LeadSource[];
}

export interface AlertHotLead {
  enabled: boolean;
  recipients: string[];
  scoreThreshold: number;
}

export interface AlertUnattended {
  enabled: boolean;
  recipients: string[];
  hoursThreshold: number;
}

export interface AlertStale {
  enabled: boolean;
  recipients: string[];
  daysThreshold: number;
}

export interface AlertDigest {
  enabled: boolean;
  recipients: string[];
  frequency: 'daily' | 'weekly';
}

export interface AlertConfig {
  newLead: AlertNewLead;
  hotLead: AlertHotLead;
  unattended: AlertUnattended;
  stale: AlertStale;
  digest: AlertDigest;
  updatedAt?: Timestamp | Date | string;
  updatedBy?: string;
}

// ─── Email Sequence Configuration ─────────────────────────────────

export interface EmailSequenceStep {
  enabled: boolean;
  delayDays: number;
  subject: string;
}

export interface EmailSequenceConfig {
  enabled: boolean;
  senderName: string;
  welcome: EmailSequenceStep;
  followUp: EmailSequenceStep;
  reminder: EmailSequenceStep;
  contacted: EmailSequenceStep;
  updatedAt?: Timestamp | Date | string;
  updatedBy?: string;
}

// Legacy type alias for backward compatibility
export type { Lead as LeadLegacy };

// ─── Custom Field Schema ───────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'textarea'
  | 'checkbox';

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  id: string;
  name: string;        // key used in lead.customFields (slug)
  label: string;       // display label
  type: FieldType;
  options?: FieldOption[];  // for select / multi-select
  order: number;
  visible: boolean;
  required: boolean;
  section?: string;    // optional group heading
  createdAt: string;   // ISO date string
  createdBy: string;   // uid
}

export interface DetectedUnknownField {
  key: string;
  sampleValue: unknown;
  suggestedLabel: string;
  suggestedType: FieldType;
  isKnownAlias: boolean;
  aliasMapsTo?: string;
}

// ─── Attachments ──────────────────────────────────────────────────

export interface LeadAttachment {
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName: string;
}

// ─── Notifications ─────────────────────────────────────────────────

export type NotificationType = 'new_lead' | 'hot_lead' | 'stale_lead' | 'assigned';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string | Date;
  leadId?: string;
}
