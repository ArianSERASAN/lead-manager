/**
 * Test 9: Tareas — TaskCard se renderiza correctamente
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '../components/Tasks/TaskCard';
import { createMockTask } from './helpers';

vi.mock('../utils/format', () => ({
  formatTimestamp: vi.fn(() => '30 mar 2026'),
  daysSince: vi.fn(() => 2),
}));

describe('TaskCard', () => {
  const defaultProps = {
    onToggleComplete: vi.fn(),
    onDelete: vi.fn(),
    onSelectLead: vi.fn(),
  };

  it('renderiza título de la tarea', () => {
    const task = createMockTask({ title: 'Enviar presupuesto' });

    render(<TaskCard task={task} {...defaultProps} />);

    expect(screen.getByText('Enviar presupuesto')).toBeInTheDocument();
  });

  it('muestra la descripción cuando existe', () => {
    const task = createMockTask({ description: 'Incluir descuento del 10%' });

    render(<TaskCard task={task} {...defaultProps} />);

    expect(screen.getByText('Incluir descuento del 10%')).toBeInTheDocument();
  });

  it('muestra la prioridad correcta', () => {
    const { rerender } = render(
      <TaskCard task={createMockTask({ priority: 'high' })} {...defaultProps} />
    );
    expect(screen.getByText('Alta')).toBeInTheDocument();

    rerender(
      <TaskCard task={createMockTask({ priority: 'medium' })} {...defaultProps} />
    );
    expect(screen.getByText('Media')).toBeInTheDocument();

    rerender(
      <TaskCard task={createMockTask({ priority: 'low' })} {...defaultProps} />
    );
    expect(screen.getByText('Baja')).toBeInTheDocument();
  });

  it('muestra la fecha formateada', () => {
    const task = createMockTask();

    render(<TaskCard task={task} {...defaultProps} />);

    expect(screen.getByText('30 mar 2026')).toBeInTheDocument();
  });

  it('muestra el nombre del lead asociado', () => {
    const task = { ...createMockTask(), leadName: 'Ana García', leadEmail: 'ana@test.com' };

    render(<TaskCard task={task} {...defaultProps} />);

    expect(screen.getByText(/Ana García/)).toBeInTheDocument();
    expect(screen.getByText(/ana@test.com/)).toBeInTheDocument();
  });

  it('llama a onToggleComplete al hacer click en el checkbox', async () => {
    const user = userEvent.setup();
    const task = createMockTask({ id: 'task-abc' });

    render(<TaskCard task={task} {...defaultProps} />);

    // Click the circle/checkbox icon button
    const checkboxButtons = screen.getAllByRole('button');
    await user.click(checkboxButtons[0]); // first button is the toggle

    expect(defaultProps.onToggleComplete).toHaveBeenCalledWith('task-abc');
  });

  it('llama a onDelete al hacer click en eliminar', async () => {
    const user = userEvent.setup();
    const task = createMockTask({ id: 'task-xyz' });

    render(<TaskCard task={task} {...defaultProps} />);

    const deleteButton = screen.getByLabelText('Eliminar tarea');
    await user.click(deleteButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith('task-xyz');
  });

  it('aplica estilo tachado cuando la tarea está completada', () => {
    const task = createMockTask({ completed: true, title: 'Tarea completada' });

    render(<TaskCard task={task} {...defaultProps} />);

    const title = screen.getByText('Tarea completada');
    expect(title.className).toContain('line-through');
  });

  it('llama a onSelectLead al hacer click en el nombre del lead', async () => {
    const user = userEvent.setup();
    const task = { ...createMockTask(), leadName: 'Pedro Test' };

    render(<TaskCard task={task} {...defaultProps} />);

    await user.click(screen.getByText(/Pedro Test/));
    expect(defaultProps.onSelectLead).toHaveBeenCalled();
  });
});
