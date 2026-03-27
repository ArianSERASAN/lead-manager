import { ReactNode } from 'react';
import { usePermissions, Permissions } from '../../hooks/auth/usePermissions';

interface RoleGuardProps {
  requires: keyof Permissions;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ requires, children, fallback }: RoleGuardProps) {
  const permissions = usePermissions();

  if (!permissions[requires]) {
    return fallback || null;
  }

  return <>{children}</>;
}
