import { Router, Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { authenticate, loadUserRoles } from '../middleware/auth';
import { getPermissionsForRoles, Role as AuthRole, Permission } from '../middleware/authorization';
import { hashPassword, comparePassword } from '../utils/password';

const router = Router();
const prisma = new PrismaClient();

// Lista de roles disponibles para el frontend
const AVAILABLE_ROLES = [
  { value: 'PROVIDER', label: 'Proveedor', description: 'Puede cargar documentos' },
  { value: 'CLIENT_VIEWER', label: 'Visor', description: 'Solo ver documentos' },
  { value: 'CLIENT_APPROVER', label: 'Aprobador Documentos', description: 'Aprobar/rechazar documentos' },
  { value: 'CLIENT_ADMIN', label: 'Administrador', description: 'Gestión completa' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Admin global del sistema' },
  { value: 'PURCHASE_REQUESTER', label: 'Solicitante Compras', description: 'Puede crear requerimientos de compra' },
  { value: 'PURCHASE_APPROVER', label: 'Aprobador Compras', description: 'Puede aprobar requerimientos de compra' },
  { value: 'PURCHASE_ADMIN', label: 'Admin Compras', description: 'Gestión completa del circuito de compras' },
];

// ============================================
// RUTAS SIN PARAMETROS (deben ir ANTES de /:id)
// ============================================

/**
 * GET /api/users/with-roles
 * Get users with their roles for a specific tenant (only users with membership in that tenant)
 */
router.get('/with-roles', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    // Solo obtener usuarios que tienen membresía en el tenant seleccionado
    const users = await prisma.user.findMany({
      where: {
        tenantMemberships: {
          some: {
            tenantId: tenantId,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        superuser: true,
        createdAt: true,
        tenantMemberships: {
          where: {
            tenantId: tenantId,
          },
          select: {
            id: true,
            roles: true,
            isActive: true,
            supplierId: true,
            supplier: {
              select: {
                id: true,
                nombre: true,
                cuit: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Obtener lista de proveedores del tenant para el selector
    const suppliers = await prisma.supplier.findMany({
      where: {
        tenantId: tenantId,
        isActive: true,
      },
      select: {
        id: true,
        nombre: true,
        cuit: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    // Transform to include roles directly
    const usersWithRoles = users.map(user => ({
      ...user,
      roles: user.tenantMemberships[0]?.roles || [],
      membershipActive: user.tenantMemberships[0]?.isActive ?? false,
      hasMembership: user.tenantMemberships.length > 0,
      supplierId: user.tenantMemberships[0]?.supplierId || null,
      supplier: user.tenantMemberships[0]?.supplier || null,
    }));

    res.json({ users: usersWithRoles, availableRoles: AVAILABLE_ROLES, suppliers });
  } catch (error) {
    console.error('Error fetching users with roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/roles/available
 * Get list of available roles
 */
router.get('/roles/available', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({ roles: AVAILABLE_ROLES });
  } catch (error) {
    console.error('Error fetching available roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/me/permissions
 * Get current user's roles and permissions for a tenant
 */
router.get('/me/permissions', authenticate, loadUserRoles, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    // Get membership
    const membership = await prisma.tenantMembership.findFirst({
      where: {
        userId: req.user!.id,
        tenantId: tenantId,
        isActive: true,
      },
      select: {
        id: true,
        roles: true,
        isActive: true,
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!membership) {
      return res.json({
        roles: [],
        permissions: [],
        isActive: false,
        isMember: false,
      });
    }

    const roles = membership.roles as AuthRole[];
    const permissions = getPermissionsForRoles(roles);

    res.json({
      roles,
      permissions,
      isActive: membership.isActive,
      isMember: true,
      tenant: membership.tenant,
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/me/password
 * Change current user's password
 */
router.put('/me/password', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body;

    // Validaciones
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Se requiere la contrasena actual y la nueva' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 6 caracteres' });
    }

    // Obtener usuario con su hash actual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contrasena actual
    const isValidPassword = await comparePassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'La contrasena actual es incorrecta' });
    }

    // Hashear nueva contrasena
    const newPasswordHash = await hashPassword(newPassword);

    // Actualizar contrasena
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    console.log(`🔐 Contrasena cambiada para usuario: ${user.email}`);

    res.json({ message: 'Contrasena actualizada correctamente' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Error al cambiar la contrasena' });
  }
});

// ============================================
// RUTAS BASE
// ============================================

/**
 * GET /api/users
 * Get all users
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { email, name, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password || 'changeme123');

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        phone,
        emailVerified: true, // Auto-verify for admin created users
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, avatar, password } = req.body;

    // Preparar datos de actualización
    const updateData: any = {
      name,
      phone,
      avatar,
    };

    // Si se envía password, hashearla
    if (password && password.trim() !== '') {
      updateData.passwordHash = await hashPassword(password);
      console.log(`🔐 Contraseña actualizada para usuario: ${id}`);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * PUT /api/users/:id/verify-email
 * Manually verify user email (admin only)
 */
router.put('/:id/verify-email', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    console.log(`✅ Email verificado manualmente para usuario: ${user.email}`);
    res.json({ message: 'Email verificado correctamente', user });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Error al verificar email' });
  }
});

// ============================================
// ROLES MANAGEMENT
// ============================================

/**
 * GET /api/users/roles/available
 * Get list of available roles
 */
router.get('/roles/available', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({ roles: AVAILABLE_ROLES });
  } catch (error) {
    console.error('Error fetching available roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id/roles
 * Get user roles for a specific tenant
 */
router.get('/:id/roles', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    const membership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: id,
          tenantId: tenantId,
        },
      },
      select: {
        id: true,
        roles: true,
        isActive: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'User is not a member of this tenant' });
    }

    res.json(membership);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id/roles
 * Update user roles for a specific tenant
 */
router.put('/:id/roles', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, roles } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    if (!Array.isArray(roles)) {
      return res.status(400).json({ error: 'roles must be an array' });
    }

    // Validate roles
    const validRoles = AVAILABLE_ROLES.map(r => r.value);
    const invalidRoles = roles.filter(r => !validRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ error: `Invalid roles: ${invalidRoles.join(', ')}` });
    }

    // Check if membership exists
    const existingMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: id,
          tenantId: tenantId,
        },
      },
    });

    let membership;

    if (existingMembership) {
      // Update existing membership
      membership = await prisma.tenantMembership.update({
        where: {
          userId_tenantId: {
            userId: id,
            tenantId: tenantId,
          },
        },
        data: {
          roles: roles as Role[],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } else {
      // Create new membership
      membership = await prisma.tenantMembership.create({
        data: {
          userId: id,
          tenantId: tenantId,
          roles: roles as Role[],
          joinedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    res.json(membership);
  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id/supplier
 * Link or unlink a user to/from a supplier
 */
router.put('/:id/supplier', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, supplierId } = req.body;

    console.log(`🔗 [Supplier Link] Recibido:`, { userId: id, tenantId, supplierId, bodyFull: req.body });

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    // Check if membership exists
    const existingMembership = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: id,
          tenantId: tenantId,
        },
      },
    });

    if (!existingMembership) {
      return res.status(404).json({ error: 'El usuario no tiene membresía en este tenant' });
    }

    // Si supplierId es null o vacío, desvincular
    // Si supplierId tiene valor, vincular al proveedor
    const updatedMembership = await prisma.tenantMembership.update({
      where: {
        userId_tenantId: {
          userId: id,
          tenantId: tenantId,
        },
      },
      data: {
        supplierId: supplierId || null,
      },
      include: {
        supplier: {
          select: {
            id: true,
            nombre: true,
            cuit: true,
          },
        },
      },
    });

    const action = supplierId ? 'vinculado a' : 'desvinculado de';
    const supplierName = updatedMembership.supplier?.nombre || 'proveedor';

    console.log(`✅ [Supplier Link] Membresía actualizada:`, {
      membershipId: existingMembership.id,
      supplierIdAntes: existingMembership.supplierId,
      supplierIdDespues: updatedMembership.supplierId,
      supplierNombre: updatedMembership.supplier?.nombre || 'NINGUNO'
    });

    res.json({
      message: `Usuario ${action} ${supplierName}`,
      supplierId: updatedMembership.supplierId,
      supplier: updatedMembership.supplier,
    });
  } catch (error) {
    console.error('Error updating user supplier:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
