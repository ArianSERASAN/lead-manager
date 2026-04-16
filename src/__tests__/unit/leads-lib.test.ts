import { describe, it, expect } from 'vitest';
import { getLeadCollection, normalizeLeadSnapshot } from '../../lib/leads';

describe('getLeadCollection', () => {
  it('uses explicit _collection when available', () => {
    expect(getLeadCollection({ _collection: 'solicitudes_contacto', source: 'landing' })).toBe('solicitudes_contacto');
  });

  it('infers collection from web sources when _collection is missing', () => {
    expect(getLeadCollection({ source: 'web-download' })).toBe('leads_descargas');
    expect(getLeadCollection({ source: 'web-contact' })).toBe('solicitudes_contacto');
  });

  it('falls back to leads for other sources', () => {
    expect(getLeadCollection({ source: 'landing' })).toBe('leads');
    expect(getLeadCollection({ source: 'manual' })).toBe('leads');
    expect(getLeadCollection({ source: 'csv-import' })).toBe('leads');
    expect(getLeadCollection()).toBe('leads');
  });
});

describe('normalizeLeadSnapshot', () => {
  it('maps known source/status aliases to canonical values', () => {
    const lead = normalizeLeadSnapshot(
      {
        id: 'lead-aliases',
        data: () => ({
          name: 'Alias Lead',
          email: 'alias@test.com',
          source: 'web_download',
          status: 'in progress',
          tags: [],
        }),
      },
      'leads'
    );

    expect(lead.source).toBe('web-download');
    expect(lead.status).toBe('en-progreso');
  });

  it('falls back to safe defaults for unknown source/status', () => {
    const lead = normalizeLeadSnapshot(
      {
        id: 'lead-unknowns',
        data: () => ({
          name: 'Unknown Lead',
          email: 'unknown@test.com',
          source: 'foo-bar-source',
          status: 'foo-bar-status',
          tags: [],
        }),
      },
      'solicitudes_contacto'
    );

    expect(lead.source).toBe('web-contact');
    expect(lead.status).toBe('nuevo');
  });
});
