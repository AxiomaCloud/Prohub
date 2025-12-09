'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Permission types matching backend
export type Permission =
  // Document permissions
  | 'documents:view'
  | 'documents:upload'
  | 'documents:approve'
  | 'documents:reject'
  | 'documents:delete'
  | 'documents:comment'
  // Supplier permissions
  | 'suppliers:view'
  | 'suppliers:create'
  | 'suppliers:edit'
  | 'suppliers:approve'
  | 'suppliers:suspend'
  | 'suppliers:delete'
  // Purchase permissions
  | 'purchases:view'
  | 'purchases:create'
  | 'purchases:approve'
  | 'purchases:reject'
  | 'purchases:admin'
  // Payment permissions
  | 'payments:view'
  | 'payments:create'
  | 'payments:approve'
  | 'payments:mark-paid'
  // User/Tenant permissions
  | 'users:view'
  | 'users:manage'
  | 'tenant:admin'
  | 'system:admin';

export type Role =
  | 'PROVIDER'
  | 'CLIENT_VIEWER'
  | 'CLIENT_APPROVER'
  | 'CLIENT_ADMIN'
  | 'SUPER_ADMIN'
  | 'PURCHASE_REQUESTER'
  | 'PURCHASE_APPROVER'
  | 'PURCHASE_ADMIN';

interface PermissionsState {
  roles: Role[];
  permissions: Permission[];
  isActive: boolean;
  isMember: boolean;
  loading: boolean;
  error: string | null;
}

export function usePermissions() {
  const { token, tenant, user, isSuperuser } = useAuth();
  const [state, setState] = useState<PermissionsState>({
    roles: [],
    permissions: [],
    isActive: false,
    isMember: false,
    loading: true,
    error: null,
  });

  const fetchPermissions = useCallback(async () => {
    if (!token || !tenant?.id) {
      setState(prev => ({
        ...prev,
        roles: [],
        permissions: [],
        isActive: false,
        isMember: false,
        loading: false,
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/me/permissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-Id': tenant.id,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setState({
          roles: data.roles || [],
          permissions: data.permissions || [],
          isActive: data.isActive,
          isMember: data.isMember,
          loading: false,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Error loading permissions',
        }));
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error loading permissions',
      }));
    }
  }, [token, tenant?.id]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      // Superusers have all permissions
      if (isSuperuser) return true;
      return state.permissions.includes(permission);
    },
    [state.permissions, isSuperuser]
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (permissions: Permission[]): boolean => {
      if (isSuperuser) return true;
      return permissions.some(p => state.permissions.includes(p));
    },
    [state.permissions, isSuperuser]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (permissions: Permission[]): boolean => {
      if (isSuperuser) return true;
      return permissions.every(p => state.permissions.includes(p));
    },
    [state.permissions, isSuperuser]
  );

  /**
   * Check if user has a specific role
   */
  const hasRole = useCallback(
    (role: Role): boolean => {
      if (isSuperuser) return true;
      return state.roles.includes(role);
    },
    [state.roles, isSuperuser]
  );

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback(
    (roles: Role[]): boolean => {
      if (isSuperuser) return true;
      return roles.some(r => state.roles.includes(r));
    },
    [state.roles, isSuperuser]
  );

  /**
   * Check if user is an admin (CLIENT_ADMIN or SUPER_ADMIN)
   */
  const isAdmin = useCallback((): boolean => {
    if (isSuperuser) return true;
    return state.roles.includes('CLIENT_ADMIN') || state.roles.includes('SUPER_ADMIN');
  }, [state.roles, isSuperuser]);

  /**
   * Check if user can approve documents
   */
  const canApproveDocuments = useCallback((): boolean => {
    return hasPermission('documents:approve');
  }, [hasPermission]);

  /**
   * Check if user can manage suppliers
   */
  const canManageSuppliers = useCallback((): boolean => {
    return hasAnyPermission(['suppliers:create', 'suppliers:edit', 'suppliers:approve']);
  }, [hasAnyPermission]);

  /**
   * Check if user can approve purchases
   */
  const canApprovePurchases = useCallback((): boolean => {
    return hasPermission('purchases:approve');
  }, [hasPermission]);

  return {
    ...state,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    isAdmin,
    canApproveDocuments,
    canManageSuppliers,
    canApprovePurchases,
    refetch: fetchPermissions,
  };
}

// Permission constants for easy access
export const Permissions = {
  // Documents
  DOCUMENTS_VIEW: 'documents:view' as Permission,
  DOCUMENTS_UPLOAD: 'documents:upload' as Permission,
  DOCUMENTS_APPROVE: 'documents:approve' as Permission,
  DOCUMENTS_REJECT: 'documents:reject' as Permission,
  DOCUMENTS_DELETE: 'documents:delete' as Permission,
  DOCUMENTS_COMMENT: 'documents:comment' as Permission,

  // Suppliers
  SUPPLIERS_VIEW: 'suppliers:view' as Permission,
  SUPPLIERS_CREATE: 'suppliers:create' as Permission,
  SUPPLIERS_EDIT: 'suppliers:edit' as Permission,
  SUPPLIERS_APPROVE: 'suppliers:approve' as Permission,
  SUPPLIERS_SUSPEND: 'suppliers:suspend' as Permission,
  SUPPLIERS_DELETE: 'suppliers:delete' as Permission,

  // Purchases
  PURCHASES_VIEW: 'purchases:view' as Permission,
  PURCHASES_CREATE: 'purchases:create' as Permission,
  PURCHASES_APPROVE: 'purchases:approve' as Permission,
  PURCHASES_REJECT: 'purchases:reject' as Permission,
  PURCHASES_ADMIN: 'purchases:admin' as Permission,

  // Payments
  PAYMENTS_VIEW: 'payments:view' as Permission,
  PAYMENTS_CREATE: 'payments:create' as Permission,
  PAYMENTS_APPROVE: 'payments:approve' as Permission,
  PAYMENTS_MARK_PAID: 'payments:mark-paid' as Permission,

  // Users/Tenant
  USERS_VIEW: 'users:view' as Permission,
  USERS_MANAGE: 'users:manage' as Permission,
  TENANT_ADMIN: 'tenant:admin' as Permission,
  SYSTEM_ADMIN: 'system:admin' as Permission,
};

export const Roles = {
  PROVIDER: 'PROVIDER' as Role,
  CLIENT_VIEWER: 'CLIENT_VIEWER' as Role,
  CLIENT_APPROVER: 'CLIENT_APPROVER' as Role,
  CLIENT_ADMIN: 'CLIENT_ADMIN' as Role,
  SUPER_ADMIN: 'SUPER_ADMIN' as Role,
  PURCHASE_REQUESTER: 'PURCHASE_REQUESTER' as Role,
  PURCHASE_APPROVER: 'PURCHASE_APPROVER' as Role,
  PURCHASE_ADMIN: 'PURCHASE_ADMIN' as Role,
};
