/**
 * Test 5: Dashboard — KPIs se calculan correctamente
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardMetrics } from '../hooks/dashboard/useDashboardMetrics';
import { Lead } from '../types/domain';
import { createMockLead } from './helpers';

describe('useDashboardMetrics', () => {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const leads: Lead[] = [
    createMockLead({ id: '1', status: 'nuevo', score: 80, source: 'landing', createdAt: daysAgo(2), isStale: false }),
    createMockLead({ id: '2', status: 'contactado', score: 60, source: 'web-contact', createdAt: daysAgo(5), isStale: false }),
    createMockLead({ id: '3', status: 'en-progreso', score: 40, source: 'landing', createdAt: daysAgo(10), isStale: true }),
    createMockLead({ id: '4', status: 'cerrado', score: 20, source: 'manual', createdAt: daysAgo(20), isStale: false }),
    createMockLead({ id: '5', status: 'cerrado', score: 90, source: 'web-download', createdAt: daysAgo(3), isStale: false }),
  ];

  it('calcula el total de leads', () => {
    const { result } = renderHook(() => useDashboardMetrics(leads));
    expect(result.current.total).toBe(5);
  });

  it('calcula la tasa de conversión (cerrados / total)', () => {
    const { result } = renderHook(() => useDashboardMetrics(leads));
    // 2 cerrados / 5 total = 40%
    expect(result.current.conversionRate).toBe(40);
  });

  it('calcula el score medio redondeado', () => {
    const { result } = renderHook(() => useDashboardMetrics(leads));
    // (80 + 60 + 40 + 20 + 90) / 5 = 58
    expect(result.current.avgScore).toBe(58);
  });

  it('cuenta leads estancados (isStale=true)', () => {
    const { result } = renderHook(() => useDashboardMetrics(leads));
    expect(result.current.staleCount).toBe(1);
  });

  it('agrupa leads por estado', () => {
    const { result } = renderHook(() => useDashboardMetrics(leads));
    expect(result.current.byStatus).toEqual({
      'nuevo': 1,
      'contactado': 1,
      'en-progreso': 1,
      'cerrado': 2,
    });
  });

  it('agrupa leads por origen', () => {
    const { result } = renderHook(() => useDashboardMetrics(leads));
    expect(result.current.bySource).toEqual({
      'landing': 2,
      'web-contact': 1,
      'manual': 1,
      'web-download': 1,
    });
  });

  it('genera distribución de scores correctamente', () => {
    const { result } = renderHook(() => useDashboardMetrics(leads));
    // score 20 → 0-20 range (20 < 40 but >= 20 → range 20-40)
    // Actually: score < 20 → [0], 20 ≤ score < 40 → [1], 40 ≤ score < 60 → [2], 60 ≤ score < 80 → [3], 80+ → [4]
    const dist = result.current.scoreDistribution;
    expect(dist[0].range).toBe('0-20');
    expect(dist[1].range).toBe('20-40');
    expect(dist[1].count).toBe(1); // score 20
    expect(dist[2].count).toBe(1); // score 40
    expect(dist[3].count).toBe(1); // score 60
    expect(dist[4].count).toBe(2); // scores 80, 90
  });

  it('genera el funnel con 4 etapas', () => {
    const { result } = renderHook(() => useDashboardMetrics(leads));
    expect(result.current.funnel).toHaveLength(4);
    expect(result.current.funnel[0].stage).toBe('nuevo');
    expect(result.current.funnel[1].stage).toBe('contactado');
    expect(result.current.funnel[2].stage).toBe('en-progreso');
    expect(result.current.funnel[3].stage).toBe('cerrado');
  });

  it('filtra por rango de fechas', () => {
    const { result } = renderHook(() =>
      useDashboardMetrics(leads, {
        start: daysAgo(6).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      })
    );
    // Leads created in last 6 days: id 1 (2 days ago), id 2 (5 days ago), id 5 (3 days ago) = 3
    expect(result.current.total).toBe(3);
  });

  it('devuelve ceros cuando no hay leads', () => {
    const { result } = renderHook(() => useDashboardMetrics([]));
    expect(result.current.total).toBe(0);
    expect(result.current.conversionRate).toBe(0);
    expect(result.current.avgScore).toBe(0);
    expect(result.current.staleCount).toBe(0);
  });
});
