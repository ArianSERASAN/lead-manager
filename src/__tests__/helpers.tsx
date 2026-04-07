import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Lead, AppUser, Task } from '../types/domain';

// ─── Test Data Factories ──────────────────────────────────────────

export function createMockLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: `lead-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Juan García',
    email: 'juan@example.com',
    phone: '+34 600 000 000',
    company: 'ACME S.L.',
    source: 'landing',
    status: 'nuevo',
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-10'),
    tags: [],
    score: 55,
    isStale: false,
    ...overrides,
  };
}

export function createMockUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    uid: 'user-1',
    email: 'admin@serasan.es',
    name: 'Admin',
    role: 'admin',
    active: true,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Math.random().toString(36).slice(2, 8)}`,
    leadId: 'lead-1',
    title: 'Llamar al cliente',
    description: 'Seguimiento del presupuesto',
    dueAt: new Date('2026-03-30'),
    createdAt: new Date('2026-03-20'),
    createdBy: 'user-1',
    completed: false,
    priority: 'medium',
    ...overrides,
  };
}

// ─── Render Helpers ──────────────────────────────────────────────

interface WrapperOptions {
  route?: string;
}

function createWrapper({ route = '/' }: WrapperOptions = {}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        {children}
      </MemoryRouter>
    );
  };
}

export function renderWithRouter(
  ui: React.ReactElement,
  options?: WrapperOptions & Omit<RenderOptions, 'wrapper'>
) {
  const { route, ...renderOptions } = options || {};
  return render(ui, {
    wrapper: createWrapper({ route }),
    ...renderOptions,
  });
}
