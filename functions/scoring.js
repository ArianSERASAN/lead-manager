/**
 * Server-side lead scoring — mirrors src/lib/scoring-engine.ts
 * Runs in Cloud Functions context (Node.js, no browser APIs).
 */

const SCORE_CONFIG = {
  weights: { source: 25, completeness: 25, recency: 25, responseQuality: 25 },
  sourceWeights: { landing: 20, 'web-download': 15, 'web-contact': 25, manual: 10 },
  staleDays: 30,
};

/**
 * @param {object} data — Firestore document data
 * @returns {{ score: number, breakdown: object }}
 */
export function calculateLeadScore(data) {
  const sourceWeight = SCORE_CONFIG.sourceWeights[data.source] || 5;
  const completeness = calcCompleteness(data);
  const recency = calcRecency(data);
  const responseQuality = calcResponseQuality(data);

  const score = Math.min(100, Math.round(sourceWeight + completeness + recency + responseQuality));

  return {
    score,
    breakdown: { sourceWeight, completeness, recency, responseQuality },
  };
}

/**
 * @param {object} data — Firestore document data
 * @returns {boolean}
 */
export function isLeadStale(data) {
  const days = daysSince(data.updatedAt || data.createdAt);
  return days >= SCORE_CONFIG.staleDays && data.status !== 'cerrado';
}

// ─── Internal helpers ─────────────────────────────────────────────

function calcCompleteness(data) {
  let filled = 0;
  const total = 7;
  if (data.name && data.name !== '—') filled++;
  if (data.email && data.email !== '—') filled++;
  if (data.phone || data.telefono) filled++;
  if (data.company || data.empresa) filled++;
  if (data.message || data.mensaje || data.resource || data.recurso) filled++;
  if (data.cargo || data.sector) filled++;
  if (data.tipoInmueble || data.localidad || data.direccion) filled++;
  return Math.round((filled / total) * SCORE_CONFIG.weights.completeness);
}

function calcRecency(data) {
  const days = daysSince(data.updatedAt || data.createdAt);
  if (days <= 7) return 25;
  if (days <= 14) return 20;
  if (days <= 30) return 15;
  if (days <= 60) return 5;
  return 0;
}

function calcResponseQuality(data) {
  let score = 0;
  if (data.notes && data.notes.length > 0) score += 8;
  if (data.tags && data.tags.length > 0) score += 5;
  if (data.status === 'contactado') score += 5;
  if (data.status === 'en-progreso') score += 10;
  if (data.status === 'cerrado') score += 12;
  return Math.min(25, score);
}

/**
 * Calculates days since a Firestore timestamp or date value.
 * Handles Firestore Timestamp objects, ISO strings, and Date objects.
 */
function daysSince(ts) {
  if (!ts) return 999;

  let date;
  if (ts.toDate && typeof ts.toDate === 'function') {
    // Firestore Timestamp
    date = ts.toDate();
  } else if (ts.seconds !== undefined) {
    // Firestore Timestamp-like object
    date = new Date(ts.seconds * 1000);
  } else if (typeof ts === 'string') {
    date = new Date(ts);
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    return 999;
  }

  const diff = Date.now() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
