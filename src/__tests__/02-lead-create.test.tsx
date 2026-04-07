/**
 * Test 2: Crear Lead — LeadCreateForm valida campos y llama a la función de crear
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeadCreateForm } from '../components/LeadViews/LeadCreateForm';

// ─── Mocks ──────────────────────────────────────────────────────

vi.mock('../services/LeadService', () => ({
  createLead: vi.fn(() => Promise.resolve('new-lead-id')),
  getCollectionName: vi.fn(() => 'leads-manual'),
}));

vi.mock('../services/ActivityService', () => ({
  recordActivity: vi.fn(() => Promise.resolve()),
}));

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  Timestamp: { now: vi.fn() },
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
}));

describe('LeadCreateForm', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    userId: 'user-1',
    userName: 'Admin',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <LeadCreateForm {...defaultProps} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renderiza el formulario con todos los campos', () => {
    render(<LeadCreateForm {...defaultProps} />);

    expect(screen.getByText('Nuevo Lead')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Empresa/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Origen/)).toBeInTheDocument();
    expect(screen.getByText('Crear Lead')).toBeInTheDocument();
  });

  it('los campos requeridos tienen el atributo aria-required', () => {
    render(<LeadCreateForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/Nombre/);
    const emailInput = screen.getByLabelText(/Email/);

    expect(nameInput).toHaveAttribute('aria-required', 'true');
    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(nameInput).toBeRequired();
    expect(emailInput).toBeRequired();
  });

  it('los campos de nombre y email empiezan vacíos', () => {
    render(<LeadCreateForm {...defaultProps} />);

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
    expect(screen.getByLabelText(/Email/)).toHaveValue('');
  });

  it('crea un lead correctamente con datos válidos', async () => {
    const user = userEvent.setup();
    render(<LeadCreateForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/Nombre/), 'María López');
    await user.type(screen.getByLabelText(/Email/), 'maria@example.com');
    await user.type(screen.getByLabelText(/Teléfono/), '+34 611 222 333');
    await user.type(screen.getByLabelText(/Empresa/), 'TechCorp');
    await user.click(screen.getByText('Crear Lead'));

    const { createLead } = await import('../services/LeadService');

    await waitFor(() => {
      expect(createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'María López',
          email: 'maria@example.com',
          phone: '+34 611 222 333',
          company: 'TechCorp',
          source: 'manual',
          status: 'nuevo',
        })
      );
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('cierra el formulario al hacer click en Cancelar', async () => {
    const user = userEvent.setup();
    render(<LeadCreateForm {...defaultProps} />);

    await user.click(screen.getByText('Cancelar'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('permite seleccionar el origen del lead', async () => {
    const user = userEvent.setup();
    render(<LeadCreateForm {...defaultProps} />);

    const sourceSelect = screen.getByLabelText(/Origen/);
    await user.selectOptions(sourceSelect, 'landing');
    expect(sourceSelect).toHaveValue('landing');

    await user.selectOptions(sourceSelect, 'web-contact');
    expect(sourceSelect).toHaveValue('web-contact');
  });

  it('muestra el modal con role="dialog" y aria-modal', () => {
    render(<LeadCreateForm {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
