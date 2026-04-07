/**
 * Test 8: Responsive — menú hamburguesa y tabs del kanban en móvil
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/Layout/Sidebar';
import { createMockUser } from './helpers';

// Mock react-router-dom navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
});

describe('Sidebar — Responsive', () => {
  const mockUser = createMockUser();
  const onLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el botón hamburguesa para móvil', () => {
    render(
      <MemoryRouter>
        <Sidebar user={mockUser} onLogout={onLogout} />
      </MemoryRouter>
    );

    // The mobile hamburger button
    const menuButton = screen.getByLabelText('Abrir menú');
    expect(menuButton).toBeInTheDocument();
  });

  it('abre el drawer móvil al hacer click en hamburguesa', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Sidebar user={mockUser} onLogout={onLogout} />
      </MemoryRouter>
    );

    const menuButton = screen.getByLabelText('Abrir menú');
    await user.click(menuButton);

    // After opening, should show "Cerrar menú"
    expect(screen.getAllByLabelText('Cerrar menú').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra las opciones de navegación en el drawer', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Sidebar user={mockUser} onLogout={onLogout} />
      </MemoryRouter>
    );

    await user.click(screen.getByLabelText('Abrir menú'));

    // Nav items should be visible
    expect(screen.getAllByText('Leads').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pipeline').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tareas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Ajustes').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el nombre del usuario en el drawer', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Sidebar user={mockUser} onLogout={onLogout} />
      </MemoryRouter>
    );

    await user.click(screen.getByLabelText('Abrir menú'));

    // User name and email should appear
    expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('admin@serasan.es').length).toBeGreaterThanOrEqual(1);
  });

  it('tiene botón de logout accesible', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Sidebar user={mockUser} onLogout={onLogout} />
      </MemoryRouter>
    );

    // Desktop logout button
    const logoutButtons = screen.getAllByLabelText('Cerrar sesión');
    expect(logoutButtons.length).toBeGreaterThanOrEqual(1);

    await user.click(logoutButtons[0]);
    expect(onLogout).toHaveBeenCalled();
  });

  it('renderiza la sidebar desktop con role="navigation"', () => {
    render(
      <MemoryRouter>
        <Sidebar user={mockUser} onLogout={onLogout} />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: 'Menú principal' })).toBeInTheDocument();
  });
});
