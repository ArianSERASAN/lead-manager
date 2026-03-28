import { Lead, ScoreBreakdown } from '../types/domain';
import { SCORE_CONFIG } from '../utils/constants';
import { daysSince } from '../utils/format';

export function calculateLeadScore(lead: Lead): { score: number; breakdown: ScoreBreakdown } {
  const sourceWeight = calculateSourceWeight(lead.source);
  const completeness = calculateCompleteness(lead);
  const recency = calculateRecency(lead);
  const responseQuality = calculateResponseQuality(lead);

  const score = Math.min(100, Math.round(sourceWeight + completeness + recency + responseQuality));

  return {
    score,
    breakdown: { sourceWeight, completeness, recency, responseQuality }
  };
}

function calculateSourceWeight(source: string): number {
  return SCORE_CONFIG.sourceWeights[source as keyof typeof SCORE_CONFIG.sourceWeights] || 5;
}

function calculateCompleteness(lead: Lead): number {
  let filled = 0;
  let total = 5;
  if (lead.name && lead.name !== '—') filled++;
  if (lead.email && lead.email !== '—') filled++;
  if (lead.phone) filled++;
  if (lead.company) filled++;
  if (lead.message || lead.resource) filled++;
  return Math.round((filled / total) * SCORE_CONFIG.weights.completeness);
}

function calculateRecency(lead: Lead): number {
  const days = daysSince(lead.updatedAt || lead.createdAt);
  if (days <= 7) return 25;
  if (days <= 14) return 20;
  if (days <= 30) return 15;
  if (days <= 60) return 5;
  return 0;
}

function calculateResponseQuality(lead: Lead): number {
  let score = 0;
  if (lead.notes && lead.notes.length > 0) score += 8;
  if (lead.tags && lead.tags.length > 0) score += 5;
  if (lead.status === 'contactado') score += 5;
  if (lead.status === 'en-progreso') score += 10;
  if (lead.status === 'cerrado') score += 12;
  return Math.min(25, score);
}

export function isLeadStale(lead: Lead): boolean {
  const days = daysSince(lead.updatedAt || lead.createdAt);
  return days >= SCORE_CONFIG.staleDays && lead.status !== 'cerrado';
}
