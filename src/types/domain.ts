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

export type LeadStatus = 'nuevo' | 'contactado' | 'en-progreso' | 'cerrado';
export type LeadSource = 'landing' | 'web-download' | 'web-contact' | 'manual';
export type UserRole = 'admin' | 'comercial' | 'read_only';
export type ActivityAction = 'created' | 'status_change' | 'note_added' | 'assigned' | 'tag_added' | 'tag_removed' | 'task_created' | 'task_completed' | 'score_updated';
export type TaskPriority = 'low' | 'medium' | 'high';

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
  customFields?: Record<string, unknown>;
  data?: Record<string, unknown>; // Legacy raw data
  _collection?: string; // Track original collection for backward compat
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

// Legacy type alias for backward compatibility
export type { Lead as LeadLegacy };
