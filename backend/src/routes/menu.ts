import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/menu
 * Gets complete menu in hierarchical structure
 * For now, returns a static menu until we implement superuser system
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    console.log('📋 [MENU] Request:', { userId });

    // Get level 1 items with their children
    const menuItems = await prisma.menuItem.findMany({
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

    console.log(`✅ [MENU] Found ${menuItems.length} level 1 items`);

    res.json(menuItems);
  } catch (error) {
    console.error('❌ [MENU] Error getting menu:', error);
    res.status(500).json({
      error: 'Error getting menu',
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
