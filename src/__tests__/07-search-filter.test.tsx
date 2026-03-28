/**
 * Test 7: Búsqueda — el filtro de texto filtra por nombre/email
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterLogic } from '../hooks/filtering/useFilterLogic';
import { createMockLead } from './helpers';

// Mock date-fns used by useFilterLogic
vi.mock('../utils/format', () => ({
  daysSince: vi.fn(() => 5),
}));

describe('useFilterLogic — Búsqueda y filtrado', () => {
  const leads = [
    createMockLead({ id: '1', name: 'Ana García', email: 'ana@gmail.com', company: 'TechCorp', source: 'landing', status: 'nuevo', score: 80 }),
    createMockLead({ id: '2', name: 'Pedro López', email: 'pedro@yahoo.com', company: 'ACME', source: 'web-contact', status: 'contactado', score: 50 }),
    createMockLead({ id: '3', name: 'María Ruiz', email: 'maria@outlook.com', company: 'StartupXYZ', source: 'manual', status: 'en-progreso', score: 30 }),
    createMockLead({ id: '4', name: 'Carlos Torres', email: 'carlos@serasan.es', company: 'SERASAN', source: 'landing', status: 'cerrado', score: 90 }),
  ];

  it('devuelve todos los leads sin filtros', () => {
    const { result } = renderHook(() => useFilterLogic(leads));
    expect(result.current.filteredLeads).toHaveLength(4);
  });

  it('filtra por nombre (búsqueda con debounce)', async () => {
    const { result } = renderHook(() => useFilterLogic(leads));

    act(() => {
      result.current.setSearchQuery('Ana');
    });

    // Wait for debounce (200ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    // Re-render to get the debounced value
    expect(result.current.filteredLeads.some(l => l.name === 'Ana García')).toBe(true);
  });

  it('filtra por email', async () => {
    const { result } = renderHook(() => useFilterLogic(leads));

    act(() => {
      result.current.setSearchQuery('serasan.es');
    });

    await new Promise(resolve => setTimeout(resolve, 300));

    expect(result.current.filteredLeads.some(l => l.email === 'carlos@serasan.es')).toBe(true);
  });

  it('filtra por estado', () => {
    const { result } = renderHook(() => useFilterLogic(leads));

    act(() => {
      result.current.setStatusFilter('nuevo');
    });

    expect(result.current.filteredLeads).toHaveLength(1);
    expect(result.current.filteredLeads[0].status).toBe('nuevo');
  });

  it('filtra por origen', () => {
    const { result } = renderHook(() => useFilterLogic(leads));

    act(() => {
      result.current.setSourceFilter('landing');
    });

    expect(result.current.filteredLeads).toHaveLength(2);
    expect(result.current.filteredLeads.every(l => l.source === 'landing')).toBe(true);
  });

  it('filtra por rango de score', () => {
    const { result } = renderHook(() => useFilterLogic(leads));

    act(() => {
      result.current.setScoreMin(70);
      result.current.setScoreMax(100);
    });

    expect(result.current.filteredLeads).toHaveLength(2);
    expect(result.current.filteredLeads.every(l => l.score >= 70)).toBe(true);
  });

  it('cuenta filtros activos correctamente', () => {
    const { result } = renderHook(() => useFilterLogic(leads));

    expect(result.current.activeFilterCount).toBe(0);

    act(() => {
      result.current.setStatusFilter('nuevo');
      result.current.setSourceFilter('landing');
    });

    expect(result.current.activeFilterCount).toBe(2);
  });

  it('clearAllFilters resetea todos los filtros', () => {
    const { result } = renderHook(() => useFilterLogic(leads));

    act(() => {
      result.current.setStatusFilter('nuevo');
      result.current.setSourceFilter('landing');
      result.current.setScoreMin(50);
    });

    expect(result.current.activeFilterCount).toBeGreaterThan(0);

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.filteredLeads).toHaveLength(4);
  });

  it('filtra por tags (match any)', () => {
    const leadsWithTags = [
      createMockLead({ id: '1', name: 'A', tags: ['vip', 'urgente'], score: 50 }),
      createMockLead({ id: '2', name: 'B', tags: ['normal'], score: 50 }),
      createMockLead({ id: '3', name: 'C', tags: ['vip'], score: 50 }),
    ];

    const { result } = renderHook(() => useFilterLogic(leadsWithTags));

    act(() => {
      result.current.setTags(['vip']);
    });

    expect(result.current.filteredLeads).toHaveLength(2);
  });

  it('oculta leads marcados para eliminación', () => {
    const { result } = renderHook(() => useFilterLogic(leads, ['1', '2']));

    expect(result.current.filteredLeads).toHaveLength(2);
    expect(result.current.filteredLeads.find(l => l.id === '1')).toBeUndefined();
    expect(result.current.filteredLeads.find(l => l.id === '2')).toBeUndefined();
  });

  it('getCurrentFilterState retorna el estado actual de los filtros', () => {
    const { result } = renderHook(() => useFilterLogic(leads));

    act(() => {
      result.current.setStatusFilter('nuevo');
      result.current.setScoreMin(60);
    });

    const filterState = result.current.getCurrentFilterState();
    expect(filterState.status).toEqual(['nuevo']);
    expect(filterState.scoreMin).toBe(60);
  });
});
