import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

/**
 * Helper function to check if user has access to a menu item
 */
function canAccessMenuItem(
  item: { allowedRoles: Role[]; superuserOnly: boolean },
  userRoles: Role[],
  isSuperuser: boolean
): boolean {
  // Superusers can see everything
  if (isSuperuser) return true;

  // If superuserOnly, only superusers can see it
  if (item.superuserOnly) return false;

  // If no roles specified (empty array), only superusers can see it
  if (!item.allowedRoles || item.allowedRoles.length === 0) return false;

  // Check if user has any of the allowed roles (merge de roles)
  return item.allowedRoles.some(role => userRoles.includes(role));
}

/**
 * GET /api/menu
 * Gets complete menu in hierarchical structure filtered by user roles
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const tenantId = req.headers['x-tenant-id'] as string;

    console.log('📋 [MENU] Request:', { userId, tenantId });

    // Get user's roles in the current tenant
    let userRoles: Role[] = [];
    let isSuperuser = false;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          superuser: true,
          tenantMemberships: {
            where: tenantId ? { tenantId } : undefined,
            select: { roles: true }
          }
        }
      });

      isSuperuser = user?.superuser || false;

      // Collect all roles from all memberships (or just the current tenant)
      userRoles = user?.tenantMemberships.flatMap(m => m.roles) || [];
    }

    console.log('📋 [MENU] User roles:', { userRoles, isSuperuser });

    // Get all level 1 items with their children
    const allMenuItems = await prisma.menuItem.findMany({
      where: {
        isActive: true,
        parentId: null, // Only level 1 items
      },
      include: {
        children: {
          where: {
            isActive: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    // Filter menu items based on user roles
    const filteredMenuItems = allMenuItems
      .filter(item => canAccessMenuItem(item, userRoles, isSuperuser))
      .map(item => ({
        ...item,
        children: item.children.filter(child =>
          canAccessMenuItem(child, userRoles, isSuperuser)
        )
      }))
      // Remove parent items that have no visible children (if they don't have their own URL)
      .filter(item => item.url || (item.children && item.children.length > 0));

    console.log(`✅ [MENU] Found ${allMenuItems.length} items, showing ${filteredMenuItems.length} after filtering`);

    // Log de items filtrados para debug
    if (filteredMenuItems.length > 0) {
      console.log('📋 [MENU] Items visibles:', filteredMenuItems.map(i => i.title).join(', '));
    } else {
      console.log('📋 [MENU] No hay items visibles para este usuario');
    }

    res.json(filteredMenuItems);
  } catch (error) {
    console.error('❌ [MENU] Error getting menu:', error);
    res.status(500).json({
      error: 'Error getting menu',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/menu/admin
 * Gets all menu items without role filtering (for admin purposes)
 * Only accessible by superusers
 */
router.get('/admin', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Check if user is superuser
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { superuser: true }
    });

    if (!user?.superuser) {
      return res.status(403).json({ error: 'Access denied. Superuser required.' });
    }

    // Get all items without filtering
    const menuItems = await prisma.menuItem.findMany({
      where: {
        parentId: null,
      },
      include: {
        children: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    res.json(menuItems);
  } catch (error) {
    console.error('❌ [MENU] Error getting admin menu:', error);
    res.status(500).json({
      error: 'Error getting menu',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/menu/roles
 * Gets all available roles in the system
 */
router.get('/roles', authenticate, async (req: Request, res: Response) => {
  try {
    // Return all roles from the enum with descriptions
    const roles = [
      { value: 'PROVIDER', label: 'Proveedor', description: 'Puede cargar documentos' },
      { value: 'CLIENT_VIEWER', label: 'Visualizador', description: 'Solo puede ver documentos' },
      { value: 'CLIENT_APPROVER', label: 'Aprobador', description: 'Puede aprobar/rechazar documentos' },
      { value: 'CLIENT_ADMIN', label: 'Admin Cliente', description: 'Gestión completa del cliente' },
      { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Administrador global del sistema' },
      { value: 'PURCHASE_REQUESTER', label: 'Solicitante Compras', description: 'Puede crear requerimientos de compra' },
      { value: 'PURCHASE_APPROVER', label: 'Aprobador Compras', description: 'Puede aprobar requerimientos de compra' },
      { value: 'PURCHASE_ADMIN', label: 'Admin Compras', description: 'Gestión completa del circuito de compras' },
    ];

    res.json(roles);
  } catch (error) {
    console.error('❌ [MENU] Error getting roles:', error);
    res.status(500).json({
      error: 'Error getting roles',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/menu/:id/roles
 * Updates the allowed roles for a menu item
 */
router.patch('/:id/roles', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { allowedRoles } = req.body;
    const userId = req.user?.id;

    // Check if user is superuser
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { superuser: true }
    });

    if (!user?.superuser) {
      return res.status(403).json({ error: 'Access denied. Superuser required.' });
    }

    // Validate roles
    const validRoles = ['PROVIDER', 'CLIENT_VIEWER', 'CLIENT_APPROVER', 'CLIENT_ADMIN', 'SUPER_ADMIN', 'PURCHASE_REQUESTER', 'PURCHASE_APPROVER', 'PURCHASE_ADMIN'];
    const invalidRoles = allowedRoles?.filter((r: string) => !validRoles.includes(r)) || [];

    if (invalidRoles.length > 0) {
      return res.status(400).json({
        error: 'Invalid roles',
        message: `Invalid roles: ${invalidRoles.join(', ')}`,
      });
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        allowedRoles: allowedRoles || [],
        updatedBy: userId,
      },
    });

    console.log(`✅ [MENU] Roles updated for ${menuItem.title}: ${allowedRoles?.join(', ') || 'all'}`);

    res.json(menuItem);
  } catch (error) {
    console.error('❌ [MENU] Error updating roles:', error);
    res.status(500).json({
      error: 'Error updating menu roles',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/menu/icons/available
 * List of available icons from lucide-react
 */
router.get('/icons/available', (req: Request, res: Response) => {
  const availableIcons = [
    'Home',
    'Upload',
    'CreditCard',
    'Settings',
    'LogOut',
    'User',
    'Users',
    'FileText',
    'PieChart',
    'Receipt',
    'Shield',
    'Send',
    'Building2',
    'BarChart3',
    'FileCheck',
    'Banknote',
    'CheckCircle',
    'Folder',
    'ChevronDown',
    'ChevronRight',
    'TrendingUp',
    'Calculator',
    'DollarSign',
    'Download',
    'FileBarChart',
    'ArrowLeftRight',
    'ArrowUpCircle',
    'ArrowDownCircle',
    'RefreshCw',
    'Key',
    'Sparkles',
    'ScanText',
    'Package',
    'ShoppingCart',
    'Brain',
  ];

  res.json(availableIcons);
});

/**
 * GET /api/menu/:id
 * Gets a specific menu item
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
        },
        parent: true,
      },
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(menuItem);
  } catch (error) {
    console.error('❌ [MENU] Error getting item:', error);
    res.status(500).json({
      error: 'Error getting menu item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/menu
 * Creates a new menu item
 * TODO: Require admin permissions
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      parentId,
      title,
      icon,
      url,
      description,
      orderIndex,
      isActive,
      requiresPermission,
      superuserOnly,
      tenantId,
    } = req.body;

    // Validations
    if (!title || !icon) {
      return res.status(400).json({
        error: 'Invalid data',
        message: 'Title and icon are required',
      });
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        parentId,
        title,
        icon,
        url,
        description,
        orderIndex: orderIndex || 0,
        isActive: isActive !== undefined ? isActive : true,
        requiresPermission,
        superuserOnly: superuserOnly || false,
        tenantId,
        createdBy: req.user?.id,
        updatedBy: req.user?.id,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    console.log(`✅ [MENU] Item created: ${menuItem.title} (${menuItem.id})`);

    res.status(201).json(menuItem);
  } catch (error) {
    console.error('❌ [MENU] Error creating item:', error);
    res.status(500).json({
      error: 'Error creating menu item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/menu/:id
 * Updates an existing menu item
 * TODO: Require admin permissions
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      parentId,
      title,
      icon,
      url,
      description,
      orderIndex,
      isActive,
      requiresPermission,
      superuserOnly,
      tenantId,
    } = req.body;

    // Verify item exists
    const existingItem = await prisma.menuItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        ...(parentId !== undefined && { parentId }),
        ...(title && { title }),
        ...(icon && { icon }),
        ...(url !== undefined && { url }),
        ...(description !== undefined && { description }),
        ...(orderIndex !== undefined && { orderIndex }),
        ...(isActive !== undefined && { isActive }),
        ...(requiresPermission !== undefined && { requiresPermission }),
        ...(superuserOnly !== undefined && { superuserOnly }),
        ...(tenantId !== undefined && { tenantId }),
        updatedBy: req.user?.id,
      },
      include: {
        children: true,
        parent: true,
      },
    });

    console.log(`✅ [MENU] Item updated: ${menuItem.title} (${menuItem.id})`);

    res.json(menuItem);
  } catch (error) {
    console.error('❌ [MENU] Error updating item:', error);
    res.status(500).json({
      error: 'Error updating menu item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/menu/:id
 * Deletes a menu item
 * TODO: Require admin permissions
 * Also deletes all children in cascade
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify item exists
    const existingItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Delete (cascade handled by Prisma)
    await prisma.menuItem.delete({
      where: { id },
    });

    console.log(`✅ [MENU] Item deleted: ${existingItem.title} (${id})`);
    if (existingItem.children.length > 0) {
      console.log(`   ⚠️  Also deleted ${existingItem.children.length} child items`);
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
      deletedChildren: existingItem.children.length,
    });
  } catch (error) {
    console.error('❌ [MENU] Error deleting item:', error);
    res.status(500).json({
      error: 'Error deleting menu item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/menu/:id/reorder
 * Reorders a menu item by changing its orderIndex
 */
router.patch('/:id/reorder', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { orderIndex } = req.body;

    if (orderIndex === undefined || orderIndex === null) {
      return res.status(400).json({
        error: 'Invalid data',
        message: 'orderIndex is required',
      });
    }

    const menuItem = await prisma.menuItem.update({
      where: { id },
      data: {
        orderIndex: parseInt(orderIndex as string),
        updatedBy: req.user?.id,
      },
    });

    console.log(`✅ [MENU] Item reordered: ${menuItem.title} -> position ${orderIndex}`);

    res.json(menuItem);
  } catch (error) {
    console.error('❌ [MENU] Error reordering item:', error);
    res.status(500).json({
      error: 'Error reordering menu item',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
