import { describe, it, expect } from 'vitest';
import { calculateLeadScore, isLeadStale } from '../../lib/scoring-engine';
import { Lead } from '../../types/domain';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'test-1',
    name: 'Test Lead',
    email: 'test@example.com',
    phone: '',
    company: '',
    source: 'landing',
    status: 'nuevo',
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: '',
    tags: [],
    score: 0,
    ...overrides,
  } as Lead;
}

describe('calculateLeadScore', () => {
  it('returns a score between 0 and 100', () => {
    const lead = makeLead();
    const { score } = calculateLeadScore(lead);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives higher source score to web-contact than manual', () => {
    const webContact = calculateLeadScore(makeLead({ source: 'web-contact' }));
    const manual = calculateLeadScore(makeLead({ source: 'manual' }));
    expect(webContact.breakdown.sourceWeight).toBeGreaterThan(manual.breakdown.sourceWeight);
  });

  it('gives higher completeness when more fields are filled', () => {
    const sparse = calculateLeadScore(makeLead({ name: 'A', email: 'a@b.com' }));
    const full = calculateLeadScore(
      makeLead({
        name: 'Full Name',
        email: 'full@example.com',
        phone: '123456',
        company: 'ACME',
        message: 'Hello',
        cargo: 'CEO',
        tipoInmueble: 'Oficina',
      })
    );
    expect(full.breakdown.completeness).toBeGreaterThan(sparse.breakdown.completeness);
  });

  it('gives max recency for leads created today', () => {
    const lead = makeLead({ createdAt: new Date(), updatedAt: new Date() });
    const { breakdown } = calculateLeadScore(lead);
    expect(breakdown.recency).toBe(20);
  });

  it('gives zero recency for leads older than 60 days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 90);
    const lead = makeLead({ createdAt: old, updatedAt: old });
    const { breakdown } = calculateLeadScore(lead);
    expect(breakdown.recency).toBe(0);
  });

  it('gives higher response quality for progressed leads with notes', () => {
    const nuevo = calculateLeadScore(makeLead({ status: 'nuevo' }));
    const progressed = calculateLeadScore(
      makeLead({ status: 'en-progreso', notes: 'Called, interested', tags: ['hot'] })
    );
    expect(progressed.breakdown.responseQuality).toBeGreaterThan(nuevo.breakdown.responseQuality);
  });

  it('caps score at 100', () => {
    const lead = makeLead({
      source: 'web-contact',
      name: 'Full',
      email: 'f@b.com',
      phone: '123',
      company: 'Co',
      message: 'Hi',
      cargo: 'CTO',
      tipoInmueble: 'Casa',
      status: 'cerrado',
      notes: 'Won deal',
      tags: ['premium'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const { score } = calculateLeadScore(lead);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('isLeadStale', () => {
  it('returns false for leads updated recently', () => {
    const lead = makeLead({ updatedAt: new Date() });
    expect(isLeadStale(lead)).toBe(false);
  });

  it('returns true for leads not updated in 30+ days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 35);
    const lead = makeLead({ updatedAt: old, status: 'contactado' });
    expect(isLeadStale(lead)).toBe(true);
  });

  it('returns false for closed leads even if old', () => {
    const old = new Date();
    old.setDate(old.getDate() - 60);
    const lead = makeLead({ updatedAt: old, status: 'cerrado' });
    expect(isLeadStale(lead)).toBe(false);
  });
});
