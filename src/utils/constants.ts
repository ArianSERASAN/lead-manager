export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  'nuevo': { label: 'Nuevo', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  'contactado': { label: 'Contactado', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  'en-progreso': { label: 'En progreso', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-200' },
  'cerrado': { label: 'Cerrado', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
};

export const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  'landing': { label: 'Landing Page', color: 'text-blue-600' },
  'web-download': { label: 'Descarga PDF', color: 'text-green-600' },
  'web-contact': { label: 'Formulario Web', color: 'text-purple-600' },
  'manual': { label: 'Manual', color: 'text-gray-600' },
};

export const SCORE_CONFIG = {
  weights: { source: 25, completeness: 25, recency: 25, responseQuality: 25 },
  sourceWeights: { 'landing': 20, 'web-download': 15, 'web-contact': 25, 'manual': 10 },
  staleDays: 30,
};

export const PIPELINE_STAGES: string[] = ['nuevo', 'contactado', 'en-progreso', 'cerrado'];

export const TAG_COLORS: string[] = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-yellow-100 text-yellow-700',
  'bg-indigo-100 text-indigo-700',
  'bg-red-100 text-red-700',
  'bg-teal-100 text-teal-700',
];

// Timing constants
export const DELETION_TIMEOUT_MS = 5000;
export const TOAST_DEFAULT_DURATION_MS = 5000;
export const SEARCH_DEBOUNCE_MS = 200;

// Score thresholds
export const MAX_SCORE = 100;
export const MIN_SCORE = 0;
export const SCORE_HOT_THRESHOLD = 80;
export const SCORE_WARM_THRESHOLD = 60;
export const SCORE_LUKEWARM_THRESHOLD = 40;

// Pagination
export const PAGE_SIZE = 50;
