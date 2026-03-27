import { Timestamp } from 'firebase/firestore';

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
  createdAt: Timestamp | any;
  updatedAt?: Timestamp | any;
  notes?: string;
  tags: string[];
  score: number;
  scoreBreakdown?: ScoreBreakdown;
  isStale?: boolean;
  assignedTo?: string;
  assignedAt?: Timestamp | any;
  pipelinePosition?: number;
  movedToStatusAt?: Timestamp | any;
  type?: string;
  resource?: string;
  message?: string;
  customFields?: Record<string, any>;
  data?: any; // Legacy raw data
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
  timestamp: Timestamp | any;
  actor: string;
  actorName?: string;
  action: ActivityAction;
  details: {
    oldValue?: any;
    newValue?: any;
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
  dueAt: Timestamp | any;
  createdAt: Timestamp | any;
  createdBy: string;
  assignedTo?: string;
  completed: boolean;
  completedAt?: Timestamp | any;
  completedBy?: string;
  priority: TaskPriority;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: Timestamp | any;
  lastLogin?: Timestamp | any;
}

export interface SavedFilter {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp | any;
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
  updatedAt?: any;
  updatedBy?: string;
}

// Legacy type alias for backward compatibility
export type { Lead as LeadLegacy };
