import { describe, it, expect } from 'vitest';
import { applyFilters, LeadFilters } from '../../stores/useLeadStore';
import { Lead } from '../../types/domain';

function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: `lead-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Test',
    email: 'test@test.com',
    phone: '',
    company: '',
    source: 'landing',
    status: 'nuevo',
    createdAt: new Date(),
    updatedAt: new Date(),
    notes: '',
    tags: [],
    score: 50,
    ...overrides,
  } as Lead;
}

const DEFAULT_FILTERS: LeadFilters = {
  searchQuery: '',
  statusFilter: '',
  sourceFilter: '',
  dateFilter: '',
  activeTab: 'all',
  tags: [],
  assignedTo: [],
  scoreMin: 0,
  scoreMax: 100,
  staleDays: null,
};

function filters(overrides: Partial<LeadFilters> = {}): LeadFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

describe('applyFilters', () => {
  it('returns all non-cancelled leads with no filters', () => {
    const leads = [
      makeLead({ id: '1', status: 'nuevo' }),
      makeLead({ id: '2', status: 'contactado' }),
      makeLead({ id: '3', status: 'cancelado' }),
    ];
    const result = applyFilters(leads, filters(), '');
    expect(result).toHaveLength(2);
    expect(result.find(l => l.status === 'cancelado')).toBeUndefined();
  });

  it('filters by status', () => {
    const leads = [
      makeLead({ id: '1', status: 'nuevo' }),
      makeLead({ id: '2', status: 'contactado' }),
    ];
    const result = applyFilters(leads, filters({ statusFilter: 'nuevo' }), '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by source', () => {
    const leads = [
      makeLead({ id: '1', source: 'landing' }),
      makeLead({ id: '2', source: 'web-contact' }),
    ];
    const result = applyFilters(leads, filters({ sourceFilter: 'landing' }), '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by search query across name, email, company', () => {
    const leads = [
      makeLead({ id: '1', name: 'Juan García', email: 'juan@acme.com' }),
      makeLead({ id: '2', name: 'Ana López', email: 'ana@test.com' }),
    ];
    const result = applyFilters(leads, filters(), 'juan');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('search is case-insensitive', () => {
    const leads = [makeLead({ id: '1', name: 'JUAN' })];
    const result = applyFilters(leads, filters(), 'juan');
    expect(result).toHaveLength(1);
  });

  it('filters by tags (match any)', () => {
    const leads = [
      makeLead({ id: '1', tags: ['hot', 'vip'] }),
      makeLead({ id: '2', tags: ['cold'] }),
      makeLead({ id: '3', tags: [] }),
    ];
    const result = applyFilters(leads, filters({ tags: ['hot'] }), '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by score range', () => {
    const leads = [
      makeLead({ id: '1', score: 30 }),
      makeLead({ id: '2', score: 60 }),
      makeLead({ id: '3', score: 90 }),
    ];
    const result = applyFilters(leads, filters({ scoreMin: 50, scoreMax: 80 }), '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by activeTab (descargas)', () => {
    const leads = [
      makeLead({ id: '1', source: 'web-download' }),
      makeLead({ id: '2', source: 'landing' }),
    ];
    const result = applyFilters(leads, filters({ activeTab: 'descargas' }), '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by assignedTo', () => {
    const leads = [
      makeLead({ id: '1', assignedTo: 'user-1' }),
      makeLead({ id: '2', assignedTo: 'user-2' }),
      makeLead({ id: '3' }), // unassigned
    ];
    const result = applyFilters(leads, filters({ assignedTo: ['user-1'] }), '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by date (today)', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    const leads = [
      makeLead({ id: '1', createdAt: today }),
      makeLead({ id: '2', createdAt: yesterday }),
    ];
    const result = applyFilters(leads, filters({ dateFilter: 'today' }), '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('combines multiple filters (AND logic)', () => {
    const leads = [
      makeLead({ id: '1', status: 'nuevo', source: 'landing', score: 80 }),
      makeLead({ id: '2', status: 'nuevo', source: 'web-contact', score: 80 }),
      makeLead({ id: '3', status: 'contactado', source: 'landing', score: 80 }),
    ];
    const result = applyFilters(leads, filters({ statusFilter: 'nuevo', sourceFilter: 'landing' }), '');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty array when no leads match', () => {
    const leads = [makeLead({ id: '1', status: 'nuevo' })];
    const result = applyFilters(leads, filters({ statusFilter: 'cerrado' }), '');
    expect(result).toHaveLength(0);
  });

  it('handles empty leads array', () => {
    const result = applyFilters([], filters(), '');
    expect(result).toHaveLength(0);
  });
});
