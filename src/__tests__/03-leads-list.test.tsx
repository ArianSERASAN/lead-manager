/**
 * Test 3: Lista de Leads — LeadTable renderiza leads correctamente
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadTable } from '../components/LeadViews/LeadTable';
import { createMockLead } from './helpers';

// Mock dependencies
vi.mock('../utils/format', () => ({
  formatRelativeTime: vi.fn(() => 'hace 3 días'),
  formatTimestamp: vi.fn(() => '07/04/2026'),
  getScoreColor: vi.fn(() => 'text-blue-600'),
  getScoreBgColor: vi.fn(() => 'bg-blue-50 border-blue-200'),
  getScoreLabel: vi.fn(() => 'Tibio'),
}));

vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})), Timestamp: { now: vi.fn() } }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})) }));

describe('LeadTable', () => {
  const leads = [
    createMockLead({ id: '1', name: 'Ana Martín', email: 'ana@test.com', status: 'nuevo', score: 80, source: 'landing' }),
    createMockLead({ id: '2', name: 'Pedro Ruiz', email: 'pedro@test.com', status: 'en-progreso', score: 45, source: 'web-contact' }),
    createMockLead({ id: '3', name: 'Laura Sánchez', email: 'laura@test.com', status: 'cerrado', score: 20, source: 'manual' }),
  ];

  const defaultProps = {
    leads,
    selectedIds: [] as string[],
    onSelect: vi.fn(),
    onToggleSelection: vi.fn(),
    onToggleAll: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renderiza todos los leads de la lista', () => {
    render(<LeadTable {...defaultProps} />);

    expect(screen.getAllByText('Ana Martín').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pedro Ruiz').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Laura Sánchez').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra los emails de cada lead', () => {
    render(<LeadTable {...defaultProps} />);

    expect(screen.getAllByText('ana@test.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('pedro@test.com').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra estados de los leads', () => {
    render(<LeadTable {...defaultProps} />);

    expect(screen.getAllByText('Nuevo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('En Progreso').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cerrado').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra estado vacío cuando no hay leads', () => {
    render(<LeadTable {...defaultProps} leads={[]} />);

    expect(screen.getByText('Aún no hay leads')).toBeInTheDocument();
    expect(screen.getByText('Los leads de los formularios web aparecerán aquí automáticamente. También puedes crear uno manualmente.')).toBeInTheDocument();
  });

  it('llama a onSelect cuando se hace click en un lead', async () => {
    const user = userEvent.setup();
    render(<LeadTable {...defaultProps} />);

    // Click on lead name (mobile card view is visible too)
    const leadElements = screen.getAllByText('Ana Martín');
    await user.click(leadElements[0]);

    expect(defaultProps.onSelect).toHaveBeenCalled();
  });

  it('maneja selección/deselección de todos los leads', async () => {
    const user = userEvent.setup();
    render(<LeadTable {...defaultProps} />);

    const selectAllBtn = screen.getByLabelText('Seleccionar todos');
    await user.click(selectAllBtn);

    expect(defaultProps.onToggleAll).toHaveBeenCalledWith(['1', '2', '3']);
  });
});
