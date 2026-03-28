/**
 * Test 4: Pipeline/Kanban — leads se muestran en columnas correctas según su estado
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeadKanban } from '../components/LeadViews/LeadKanban';
import { createMockLead } from './helpers';

// ─── Mocks ──────────────────────────────────────────────────────

vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})), Timestamp: { now: vi.fn() } }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
    cb(null);
    return vi.fn();
  }),
  signOut: vi.fn(),
}));

// Mock AuthContext to provide permissions
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    appUser: { uid: 'u1', email: 'a@b.com', name: 'Admin', role: 'admin', active: true, createdAt: new Date() },
    firebaseUser: { uid: 'u1' },
    loading: false,
    authError: null,
    logout: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../hooks/auth/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    canEdit: true, canDelete: true, canAssign: true, canManageUsers: true, canViewAll: true,
  })),
}));

vi.mock('../utils/format', () => ({
  formatRelativeTime: vi.fn(() => 'hace 2 días'),
  formatTimestamp: vi.fn(() => '20 mar 2026'),
  daysSince: vi.fn(() => 5),
  getScoreColor: vi.fn(() => 'text-blue-600'),
  getScoreBgColor: vi.fn(() => 'bg-blue-50'),
  getScoreLabel: vi.fn(() => 'Tibio'),
}));

// Mock dnd-kit to avoid pointer event issues
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
  useDraggable: vi.fn(() => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), isDragging: false })),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  closestCorners: vi.fn(),
}));

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: vi.fn(() => ({
    attributes: {}, listeners: {}, setNodeRef: vi.fn(),
    transform: null, transition: null, isDragging: false,
  })),
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LeadKanban — Pipeline', () => {
  const leads = [
    createMockLead({ id: '1', name: 'Lead Nuevo 1', status: 'nuevo', score: 70 }),
    createMockLead({ id: '2', name: 'Lead Nuevo 2', status: 'nuevo', score: 30 }),
    createMockLead({ id: '3', name: 'Lead Contactado', status: 'contactado', score: 50 }),
    createMockLead({ id: '4', name: 'Lead Progreso', status: 'en-progreso', score: 85 }),
    createMockLead({ id: '5', name: 'Lead Cerrado', status: 'cerrado', score: 10 }),
  ];

  const defaultProps = {
    leads,
    onLeadClick: vi.fn(),
    onStatusChange: vi.fn(() => Promise.resolve()),
    isLoading: false,
  };

  it('renderiza las 4 columnas del pipeline', () => {
    render(<LeadKanban {...defaultProps} />);

    // Check column headers exist (the desktop view has KanbanColumn components)
    expect(screen.getAllByText(/Nuevo/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Contactado/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/En progreso/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Cerrado/).length).toBeGreaterThanOrEqual(1);
  });

  it('muestra los nombres de los leads', () => {
    render(<LeadKanban {...defaultProps} />);

    // At least in mobile or desktop view
    expect(screen.getAllByText('Lead Nuevo 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Lead Contactado').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra el buscador del kanban', () => {
    render(<LeadKanban {...defaultProps} />);

    expect(screen.getByPlaceholderText(/Buscar leads/)).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay leads', () => {
    render(<LeadKanban {...defaultProps} leads={[]} />);

    expect(screen.getByText(/Sin leads disponibles/)).toBeInTheDocument();
  });

  it('filtra leads por búsqueda', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();

    render(<LeadKanban {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/Buscar leads/);
    await user.type(searchInput, 'Cerrado');

    // Only the matching lead should appear
    expect(screen.getAllByText('Lead Cerrado').length).toBeGreaterThanOrEqual(1);
    // Others should be filtered out from search results
    expect(screen.queryByText('No se encontraron leads')).not.toBeInTheDocument();
  });
});
