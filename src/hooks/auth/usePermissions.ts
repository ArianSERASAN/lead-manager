import { useAuth } from '../../contexts/AuthContext';

export interface Permissions {
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canManageUsers: boolean;
  canViewAll: boolean;
}

export function usePermissions(): Permissions {
  const { appUser } = useAuth();

  const role = appUser?.role || 'read_only';

  switch (role) {
    case 'admin':
      return {
        canEdit: true,
        canDelete: true,
        canAssign: true,
        canManageUsers: true,
        canViewAll: true
      };

    case 'comercial':
      return {
        canEdit: true,
        canDelete: false,
        canAssign: true,
        canManageUsers: false,
        canViewAll: true
      };

    case 'read_only':
    default:
      return {
        canEdit: false,
        canDelete: false,
        canAssign: false,
        canManageUsers: false,
        canViewAll: true
      };
  }
}
