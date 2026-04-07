/**
 * Test 6: Mover lead de estado — StatsCards renderiza KPIs y el status config es correcto
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsCards } from '../components/Dashboard/StatsCards';
import { STATUS_CONFIG, PIPELINE_STAGES } from '../utils/constants';

vi.mock('../utils/format', () => ({
  getScoreColor: vi.fn((score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-gray-400';
  }),
}));

describe('StatsCards — KPI rendering', () => {
  it('muestra los 4 KPIs correctamente', () => {
    render(
      <StatsCards
        total={42}
        conversionRate={25}
        avgScore={65}
        staleCount={3}
        newThisWeek={7}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getAllByText('25').length).toBeGreaterThanOrEqual(1); // conversionRate appears in badge + main
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Total Leads')).toBeInTheDocument();
    expect(screen.getByText('Conversión')).toBeInTheDocument();
    expect(screen.getByText('Score Medio')).toBeInTheDocument();
    expect(screen.getByText('Estancados')).toBeInTheDocument();
  });

  it('muestra indicador de tendencia con leads nuevos', () => {
    render(
      <StatsCards total={10} conversionRate={10} avgScore={50} staleCount={0} newThisWeek={8} />
    );

    expect(screen.getByText('+8 esta semana')).toBeInTheDocument();
  });

  it('muestra "Sin movimiento" cuando no hay leads nuevos', () => {
    render(
      <StatsCards total={10} conversionRate={10} avgScore={50} staleCount={0} newThisWeek={0} />
    );

    expect(screen.getByText('Sin movimiento')).toBeInTheDocument();
  });

  it('muestra "Atención" cuando hay leads estancados', () => {
    render(
      <StatsCards total={10} conversionRate={10} avgScore={50} staleCount={5} newThisWeek={2} />
    );

    expect(screen.getByText('Atención')).toBeInTheDocument();
  });

  it('muestra etiqueta de score correcta según rango', () => {
    const { rerender } = render(
      <StatsCards total={10} conversionRate={10} avgScore={85} staleCount={0} newThisWeek={0} />
    );
    expect(screen.getByText('Caliente')).toBeInTheDocument();

    rerender(
      <StatsCards total={10} conversionRate={10} avgScore={65} staleCount={0} newThisWeek={0} />
    );
    expect(screen.getByText('Templado')).toBeInTheDocument();

    rerender(
      <StatsCards total={10} conversionRate={10} avgScore={45} staleCount={0} newThisWeek={0} />
    );
    expect(screen.getByText('Tibio')).toBeInTheDocument();

    rerender(
      <StatsCards total={10} conversionRate={10} avgScore={20} staleCount={0} newThisWeek={0} />
    );
    expect(screen.getByText('Frío')).toBeInTheDocument();
  });
});

describe('STATUS_CONFIG y PIPELINE_STAGES', () => {
  it('tiene los 4 estados del pipeline definidos', () => {
    expect(PIPELINE_STAGES).toEqual(['nuevo', 'contactado', 'en-progreso', 'cerrado']);
  });

  it('cada estado tiene label, color, bgColor y borderColor', () => {
    for (const stage of PIPELINE_STAGES) {
      const config = STATUS_CONFIG[stage];
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
      expect(config.color).toBeTruthy();
      expect(config.bgColor).toBeTruthy();
      expect(config.borderColor).toBeTruthy();
    }
  });

  it('los labels de los estados son correctos', () => {
    expect(STATUS_CONFIG['nuevo'].label).toBe('Nuevo');
    expect(STATUS_CONFIG['contactado'].label).toBe('Contactado');
    expect(STATUS_CONFIG['en-progreso'].label).toBe('En progreso');
    expect(STATUS_CONFIG['cerrado'].label).toBe('Cerrado (ganado)');
  });
});
