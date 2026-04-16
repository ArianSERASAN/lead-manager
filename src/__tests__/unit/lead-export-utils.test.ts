import { describe, expect, it } from 'vitest';
import { Lead } from '../../types/domain';
import { buildLeadExportEntries, buildLeadExportRow } from '../../services/LeadExportUtils';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    name: 'Ana Lopez',
    email: 'ana@empresa.com',
    source: 'landing',
    status: 'nuevo',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    tags: [],
    score: 0,
    ...overrides,
  } as Lead;
}

describe('buildLeadExportRow', () => {
  it('includes calculator-like fields from nested raw data, even under data.*', () => {
    const lead = makeLead({
      data: {
        email: 'hidden@duplicate.com',
        calculator: { score_total: 87, temperatura: 'caliente' },
        data: { calculadora: { m2_totales: 18500 } },
      },
      customFields: {
        score_potencial: 30,
      },
    });

    const row = buildLeadExportRow(lead);

    expect(row['Data: calculator.score_total']).toBe(87);
    expect(row['Data: calculator.temperatura']).toBe('caliente');
    expect(row['Data: data.calculadora.m2_totales']).toBe(18500);
    expect(row['Custom: score_potencial']).toBe(30);
    expect(row['Data: email']).toBeUndefined();
  });

  it('exports the current score breakdown keys', () => {
    const lead = makeLead({
      scoreBreakdown: {
        sourceWeight: 20,
        completeness: 30,
        recency: 25,
        responseQuality: 15,
      },
    });

    const row = buildLeadExportRow(lead);

    expect(row['Score: Fuente']).toBe(20);
    expect(row['Score: Completitud']).toBe(30);
    expect(row['Score: Recencia']).toBe(25);
    expect(row['Score: Calidad Respuesta']).toBe(15);
  });
});

describe('buildLeadExportEntries', () => {
  it('returns stringified label/value entries', () => {
    const lead = makeLead({
      data: {
        calculator: { score_total: 90 },
      },
    });

    const entries = buildLeadExportEntries(lead);

    expect(entries.some((entry) => entry.label === 'Data: calculator.score_total' && entry.value === '90')).toBe(true);
  });
});
