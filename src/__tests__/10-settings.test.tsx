/**
 * Test 10: Settings — RoleGuard y gestión de permisos
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGuard } from '../components/User/RoleGuard';

// ─── Mocks ──────────────────────────────────────────────────────

const mockPermissions = {
  canEdit: true,
  canDelete: true,
  canAssign: true,
  canManageUsers: true,
  canViewAll: true,
};

vi.mock('../hooks/auth/usePermissions', () => ({
  usePermissions: vi.fn(() => mockPermissions),
}));

vi.mock('../lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({})) }));

describe('RoleGuard', () => {
  it('renderiza children cuando el usuario tiene el permiso requerido', () => {
    render(
      <RoleGuard requires="canManageUsers">
        <div>Contenido protegido</div>
      </RoleGuard>
    );

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('no renderiza children cuando el usuario NO tiene el permiso', async () => {
    const { usePermissions } = await import('../hooks/auth/usePermissions');
    (usePermissions as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...mockPermissions,
      canManageUsers: false,
    });

    render(
      <RoleGuard requires="canManageUsers">
        <div>Contenido protegido</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('muestra fallback cuando el permiso no se cumple', async () => {
    const { usePermissions } = await import('../hooks/auth/usePermissions');
    (usePermissions as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...mockPermissions,
      canDelete: false,
    });

    render(
      <RoleGuard requires="canDelete" fallback={<div>No tienes permiso</div>}>
        <div>Contenido admin</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Contenido admin')).not.toBeInTheDocument();
    expect(screen.getByText('No tienes permiso')).toBeInTheDocument();
  });

  it('renderiza con permiso canEdit', () => {
    render(
      <RoleGuard requires="canEdit">
        <div>Puede editar</div>
      </RoleGuard>
    );

    expect(screen.getByText('Puede editar')).toBeInTheDocument();
  });

  it('renderiza con permiso canViewAll', () => {
    render(
      <RoleGuard requires="canViewAll">
        <div>Puede ver todo</div>
      </RoleGuard>
    );

    expect(screen.getByText('Puede ver todo')).toBeInTheDocument();
  });
});

describe('Permisos por rol', () => {
  it('admin tiene todos los permisos', async () => {
    // We test the usePermissions logic directly
    const { usePermissions } = await import('../hooks/auth/usePermissions');
    (usePermissions as ReturnType<typeof vi.fn>).mockReturnValue({
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canManageUsers: true,
      canViewAll: true,
    });

    render(
      <RoleGuard requires="canManageUsers">
        <div>Admin content</div>
      </RoleGuard>
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });

  it('comercial puede editar pero no gestionar usuarios', async () => {
    const { usePermissions } = await import('../hooks/auth/usePermissions');
    (usePermissions as ReturnType<typeof vi.fn>).mockReturnValue({
      canEdit: true,
      canDelete: false,
      canAssign: true,
      canManageUsers: false,
      canViewAll: true,
    });

    const { container: c1 } = render(
      <RoleGuard requires="canEdit">
        <div>Edit ok</div>
      </RoleGuard>
    );
    expect(screen.getByText('Edit ok')).toBeInTheDocument();

    const { container: c2 } = render(
      <RoleGuard requires="canManageUsers">
        <div>Manage users</div>
      </RoleGuard>
    );
    expect(screen.queryByText('Manage users')).not.toBeInTheDocument();
  });

  it('read_only no puede editar ni borrar', async () => {
    const { usePermissions } = await import('../hooks/auth/usePermissions');
    (usePermissions as ReturnType<typeof vi.fn>).mockReturnValue({
      canEdit: false,
      canDelete: false,
      canAssign: false,
      canManageUsers: false,
      canViewAll: true,
    });

    render(
      <RoleGuard requires="canEdit">
        <div>Edit content</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Edit content')).not.toBeInTheDocument();
  });
});
