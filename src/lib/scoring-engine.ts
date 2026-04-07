import { Lead, ScoreBreakdown } from '../types/domain';
import { SCORE_CONFIG } from '../utils/constants';
import { daysSince } from '../utils/format';

export interface ScoringWeights {
  source: number;
  completeness: number;
  recency: number;
  responseQuality: number;
}

export function calculateLeadScore(lead: Lead, weights?: ScoringWeights): { score: number; breakdown: ScoreBreakdown } {
  const w = weights || SCORE_CONFIG.weights;
  const sourceWeight = calculateSourceWeight(lead.source, w.source);
  const completeness = calculateCompleteness(lead, w.completeness);
  const recency = calculateRecency(lead, w.recency);
  const responseQuality = calculateResponseQuality(lead, w.responseQuality);

  const score = Math.min(100, Math.round(sourceWeight + completeness + recency + responseQuality));

  return {
    score,
    breakdown: { sourceWeight, completeness, recency, responseQuality }
  };
}

function calculateSourceWeight(source: string, maxWeight: number): number {
  const raw = SCORE_CONFIG.sourceWeights[source as keyof typeof SCORE_CONFIG.sourceWeights] || 5;
  // Scale from 0-25 range to 0-maxWeight range
  return Math.round((raw / 25) * maxWeight);
}

/** Weighted completeness: key contact fields carry more weight than secondary fields. */
function calculateCompleteness(lead: Lead, maxWeight: number): number {
  let rawScore = 0;
  const MAX_RAW = 100;

  // Key contact fields (high value — these are the minimum viable lead info)
  if (lead.name && lead.name !== '—') rawScore += 10;
  if (lead.email && lead.email !== '—') rawScore += 22;
  if (lead.phone) rawScore += 20;
  if (lead.company) rawScore += 15;

  // Context / intent fields (medium value)
  if (lead.message || lead.resource) rawScore += 8;

  // Professional fields
  if (lead.apellidos) rawScore += 3;
  if (lead.cargo || lead.sector) rawScore += 8;
  if (lead.servicios && lead.servicios.length > 0) rawScore += 4;

  // Property / location fields
  if (lead.tipoInmueble || lead.localidad || lead.direccion) rawScore += 5;
  if (lead.superficie || lead.referenciaCatastral) rawScore += 3;

  // Custom fields bonus (each extra field = 2 pts, capped at 4)
  if (lead.customFields) {
    const filledCustom = Object.values(lead.customFields).filter(v => v !== null && v !== '').length;
    rawScore += Math.min(4, filledCustom * 2);
  }

  // Cap at MAX_RAW and scale to maxWeight
  return Math.round((Math.min(rawScore, MAX_RAW) / MAX_RAW) * maxWeight);
}

/** Count how many distinct fields are filled — used for the "fields filled" filter. */
export function countFilledFields(lead: Lead): number {
  let count = 0;
  if (lead.name && lead.name !== '—') count++;
  if (lead.email && lead.email !== '—') count++;
  if (lead.phone) count++;
  if (lead.company) count++;
  if (lead.message || lead.resource) count++;
  if (lead.apellidos) count++;
  if (lead.cargo) count++;
  if (lead.sector) count++;
  if (lead.servicios && lead.servicios.length > 0) count++;
  if (lead.tipoInmueble) count++;
  if (lead.localidad) count++;
  if (lead.direccion) count++;
  if (lead.superficie) count++;
  if (lead.referenciaCatastral) count++;
  if (lead.customFields) {
    count += Object.values(lead.customFields).filter(v => v !== null && v !== '').length;
  }
  return count;
}

function calculateRecency(lead: Lead, maxWeight: number): number {
  const days = daysSince(lead.updatedAt || lead.createdAt);
  if (days <= 7) return maxWeight;
  if (days <= 14) return Math.round(maxWeight * 0.8);
  if (days <= 30) return Math.round(maxWeight * 0.6);
  if (days <= 60) return Math.round(maxWeight * 0.2);
  return 0;
}

function calculateResponseQuality(lead: Lead, maxWeight: number): number {
  let score = 0;
  const scale = maxWeight / 10; // scale factor from new 10-point max
  if (lead.notes && lead.notes.length > 0) score += Math.round(3 * scale);
  if (lead.tags && lead.tags.length > 0) score += Math.round(2 * scale);
  if (lead.status === 'contactado') score += Math.round(2 * scale);
  if (lead.status === 'en-progreso') score += Math.round(4 * scale);
  if (lead.status === 'cerrado') score += Math.round(5 * scale);
  return Math.min(maxWeight, score);
}

export function isLeadStale(lead: Lead): boolean {
  const days = daysSince(lead.updatedAt || lead.createdAt);
  return days >= SCORE_CONFIG.staleDays && lead.status !== 'cerrado';
}
