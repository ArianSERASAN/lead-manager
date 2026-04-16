import { describe, it, expect } from 'vitest';
import { getLeadCollection } from '../../lib/leads';

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
