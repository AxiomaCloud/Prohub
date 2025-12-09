'use client';

import { ReactNode } from 'react';
import { usePermissions, Permission, Role } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
  /** Required permission(s) - user needs at least one */
  permission?: Permission | Permission[];
  /** Required role(s) - user needs at least one */
  role?: Role | Role[];
  /** Require all permissions instead of any */
  requireAll?: boolean;
  /** Component to show when access is denied */
  fallback?: ReactNode;
  /** Show loading state while checking permissions */
  showLoading?: boolean;
  /** Show access denied message instead of hiding */
  showDenied?: boolean;
}

/**
 * PermissionGate - Conditionally render content based on user permissions
 *
 * Usage:
 * ```tsx
 * <PermissionGate permission="documents:approve">
 *   <ApproveButton />
 * </PermissionGate>
 *
 * <PermissionGate permission={['documents:approve', 'documents:reject']}>
 *   <ApprovalActions />
 * </PermissionGate>
 *
 * <PermissionGate role="CLIENT_ADMIN">
 *   <AdminPanel />
 * </PermissionGate>
 *
 * <PermissionGate permission="documents:delete" showDenied>
 *   <DeleteButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  children,
  permission,
  role,
  requireAll = false,
  fallback = null,
  showLoading = false,
  showDenied = false,
}: PermissionGateProps) {
  const { isSuperuser } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole, loading } = usePermissions();

  // Show loading state if enabled
  if (showLoading && loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Superusers bypass all permission checks
  if (isSuperuser) {
    return <>{children}</>;
  }

  // Check permissions
  let hasAccess = true;

  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (role && hasAccess) {
    const roles = Array.isArray(role) ? role : [role];
    hasAccess = hasAnyRole(roles);
  }

  // Access granted
  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied - show fallback or denied message
  if (showDenied) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-2">
        <ShieldAlert className="w-4 h-4" />
        <span>No tienes permisos para esta acción</span>
      </div>
    );
  }

  return <>{fallback}</>;
}

/**
 * RequireAdmin - Only render for admin users
 */
export function RequireAdmin({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate role={['CLIENT_ADMIN', 'SUPER_ADMIN']} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * RequireSuperAdmin - Only render for super admins
 */
export function RequireSuperAdmin({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate role="SUPER_ADMIN" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * CanView - Render if user can view the resource type
 */
export function CanView({
  resource,
  children,
  fallback
}: {
  resource: 'documents' | 'suppliers' | 'purchases' | 'payments' | 'users';
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const permissionMap: Record<string, Permission> = {
    documents: 'documents:view',
    suppliers: 'suppliers:view',
    purchases: 'purchases:view',
    payments: 'payments:view',
    users: 'users:view',
  };

  return (
    <PermissionGate permission={permissionMap[resource]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * CanCreate - Render if user can create the resource type
 */
export function CanCreate({
  resource,
  children,
  fallback
}: {
  resource: 'documents' | 'suppliers' | 'purchases' | 'payments';
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const permissionMap: Record<string, Permission> = {
    documents: 'documents:upload',
    suppliers: 'suppliers:create',
    purchases: 'purchases:create',
    payments: 'payments:create',
  };

  return (
    <PermissionGate permission={permissionMap[resource]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * CanApprove - Render if user can approve the resource type
 */
export function CanApprove({
  resource,
  children,
  fallback
}: {
  resource: 'documents' | 'suppliers' | 'purchases' | 'payments';
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const permissionMap: Record<string, Permission> = {
    documents: 'documents:approve',
    suppliers: 'suppliers:approve',
    purchases: 'purchases:approve',
    payments: 'payments:approve',
  };

  return (
    <PermissionGate permission={permissionMap[resource]} fallback={fallback}>
      {children}
    </PermissionGate>
  );
}
