import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// ============================================
// TYPES
// ============================================

// All available roles from Prisma schema
export type Role =
  | 'PROVIDER'
  | 'CLIENT_VIEWER'
  | 'CLIENT_APPROVER'
  | 'CLIENT_ADMIN'
  | 'SUPER_ADMIN'
  | 'PURCHASE_REQUESTER'
  | 'PURCHASE_APPROVER'
  | 'PURCHASE_ADMIN';

// All available permissions
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

// Extend Express Request to include roles and permissions
declare global {
  namespace Express {
    interface Request {
      userRoles?: Role[];
      userPermissions?: Permission[];
      tenantMembership?: {
        id: string;
        tenantId: string;
        roles: Role[];
        isActive: boolean;
      };
    }
  }
}

// ============================================
// ROLE -> PERMISSIONS MAPPING
// ============================================

const rolePermissions: Record<Role, Permission[]> = {
  // Provider - can upload documents and view their own
  PROVIDER: [
    'documents:view',
    'documents:upload',
    'documents:comment',
    'payments:view',
  ],

  // Client Viewer - read-only access
  CLIENT_VIEWER: [
    'documents:view',
    'suppliers:view',
    'purchases:view',
    'payments:view',
  ],

  // Client Approver - can approve/reject documents
  CLIENT_APPROVER: [
    'documents:view',
    'documents:approve',
    'documents:reject',
    'documents:comment',
    'suppliers:view',
    'purchases:view',
    'payments:view',
  ],

  // Client Admin - full client access
  CLIENT_ADMIN: [
    'documents:view',
    'documents:upload',
    'documents:approve',
    'documents:reject',
    'documents:delete',
    'documents:comment',
    'suppliers:view',
    'suppliers:create',
    'suppliers:edit',
    'suppliers:approve',
    'suppliers:suspend',
    'suppliers:delete',
    'payments:view',
    'payments:create',
    'payments:approve',
    'payments:mark-paid',
    'users:view',
    'users:manage',
    'tenant:admin',
  ],

  // Super Admin - full system access
  SUPER_ADMIN: [
    'documents:view',
    'documents:upload',
    'documents:approve',
    'documents:reject',
    'documents:delete',
    'documents:comment',
    'suppliers:view',
    'suppliers:create',
    'suppliers:edit',
    'suppliers:approve',
    'suppliers:suspend',
    'suppliers:delete',
    'purchases:view',
    'purchases:create',
    'purchases:approve',
    'purchases:reject',
    'purchases:admin',
    'payments:view',
    'payments:create',
    'payments:approve',
    'payments:mark-paid',
    'users:view',
    'users:manage',
    'tenant:admin',
    'system:admin',
  ],

  // Purchase Requester - can create purchase requests
  PURCHASE_REQUESTER: [
    'purchases:view',
    'purchases:create',
    'documents:view',
  ],

  // Purchase Approver - can approve purchase requests
  PURCHASE_APPROVER: [
    'purchases:view',
    'purchases:approve',
    'purchases:reject',
    'documents:view',
  ],

  // Purchase Admin - full purchase access
  PURCHASE_ADMIN: [
    'purchases:view',
    'purchases:create',
    'purchases:approve',
    'purchases:reject',
    'purchases:admin',
    'documents:view',
    'documents:upload',
    'suppliers:view',
    'payments:view',
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all permissions for a set of roles
 */
export function getPermissionsForRoles(roles: Role[]): Permission[] {
  const permissionSet = new Set<Permission>();

  for (const role of roles) {
    const permissions = rolePermissions[role] || [];
    for (const permission of permissions) {
      permissionSet.add(permission);
    }
  }

  return Array.from(permissionSet);
}

/**
 * Check if roles have a specific permission
 */
export function hasPermission(roles: Role[], permission: Permission): boolean {
  const permissions = getPermissionsForRoles(roles);
  return permissions.includes(permission);
}

/**
 * Check if roles have any of the specified permissions
 */
export function hasAnyPermission(roles: Role[], permissions: Permission[]): boolean {
  const userPermissions = getPermissionsForRoles(roles);
  return permissions.some(p => userPermissions.includes(p));
}

/**
 * Check if roles have all of the specified permissions
 */
export function hasAllPermissions(roles: Role[], permissions: Permission[]): boolean {
  const userPermissions = getPermissionsForRoles(roles);
  return permissions.every(p => userPermissions.includes(p));
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Load user's tenant membership and roles
 * Must be used AFTER authenticate middleware
 */
export async function loadUserRoles(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get tenant ID from header or query
    const tenantId = req.headers['x-tenant-id'] as string || req.query.tenantId as string;

    if (!tenantId) {
      // If no tenant specified, continue without roles (some endpoints don't need it)
      req.userRoles = [];
      req.userPermissions = [];
      return next();
    }

    // Get user's membership for this tenant
    const membership = await prisma.tenantMembership.findFirst({
      where: {
        userId: req.user.id,
        tenantId: tenantId,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        roles: true,
        isActive: true,
      },
    });

    if (!membership) {
      // User is not a member of this tenant
      req.userRoles = [];
      req.userPermissions = [];
      return next();
    }

    // Attach roles and permissions to request
    req.tenantMembership = {
      id: membership.id,
      tenantId: membership.tenantId,
      roles: membership.roles as Role[],
      isActive: membership.isActive,
    };
    req.userRoles = membership.roles as Role[];
    req.userPermissions = getPermissionsForRoles(membership.roles as Role[]);

    next();
  } catch (error) {
    console.error('Error loading user roles:', error);
    return res.status(500).json({ error: 'Error loading user roles' });
  }
}

/**
 * Require specific role(s)
 * User must have at least one of the specified roles
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userRoles || req.userRoles.length === 0) {
      return res.status(403).json({
        error: 'No tienes roles asignados para esta empresa',
        requiredRoles: roles,
      });
    }

    const hasRole = roles.some(role => req.userRoles!.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'No tienes el rol requerido para esta acción',
        requiredRoles: roles,
        yourRoles: req.userRoles,
      });
    }

    next();
  };
}

/**
 * Require specific permission(s)
 * User must have at least one of the specified permissions
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userPermissions || req.userPermissions.length === 0) {
      return res.status(403).json({
        error: 'No tienes permisos asignados para esta empresa',
        requiredPermissions: permissions,
      });
    }

    const hasRequiredPermission = permissions.some(p => req.userPermissions!.includes(p));

    if (!hasRequiredPermission) {
      return res.status(403).json({
        error: 'No tienes los permisos necesarios para esta acción',
        requiredPermissions: permissions,
      });
    }

    next();
  };
}

/**
 * Require ALL specified permissions
 * User must have all of the specified permissions
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userPermissions || req.userPermissions.length === 0) {
      return res.status(403).json({
        error: 'No tienes permisos asignados para esta empresa',
        requiredPermissions: permissions,
      });
    }

    const hasAllRequired = permissions.every(p => req.userPermissions!.includes(p));

    if (!hasAllRequired) {
      const missingPermissions = permissions.filter(p => !req.userPermissions!.includes(p));
      return res.status(403).json({
        error: 'No tienes todos los permisos necesarios para esta acción',
        requiredPermissions: permissions,
        missingPermissions,
      });
    }

    next();
  };
}

/**
 * Require tenant membership
 * Ensures user is a member of the specified tenant
 */
export function requireTenantMembership(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantMembership) {
    return res.status(403).json({
      error: 'No eres miembro de esta empresa',
    });
  }

  if (!req.tenantMembership.isActive) {
    return res.status(403).json({
      error: 'Tu membresía en esta empresa está desactivada',
    });
  }

  next();
}

/**
 * Require admin access (CLIENT_ADMIN or SUPER_ADMIN)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminRoles: Role[] = ['CLIENT_ADMIN', 'SUPER_ADMIN'];

  if (!req.userRoles || !req.userRoles.some(r => adminRoles.includes(r))) {
    return res.status(403).json({
      error: 'Se requiere acceso de administrador',
    });
  }

  next();
}

/**
 * Require super admin access
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.userRoles || !req.userRoles.includes('SUPER_ADMIN')) {
    return res.status(403).json({
      error: 'Se requiere acceso de super administrador',
    });
  }

  next();
}

// ============================================
// UTILITY EXPORTS
// ============================================

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
