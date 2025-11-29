import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/tenants
 * Get all tenants (superuser only)
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        legalName: true,
        taxId: true,
        country: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            memberships: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tenants
 * Create new tenant (superuser only)
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, legalName, taxId, country, isActive } = req.body;

    const tenant = await prisma.tenant.create({
      data: {
        name,
        legalName,
        taxId,
        country,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({ tenant });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tenants/my-tenants
 * Get tenants assigned to current user
 * IMPORTANT: Must be BEFORE /:id route
 */
router.get('/my-tenants', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const memberships = await prisma.tenantMembership.findMany({
      where: {
        userId: req.user.id,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            legalName: true,
            taxId: true,
          },
        },
      },
    });

    const tenants = memberships.map(m => m.tenant);
    res.json({ tenants });
  } catch (error) {
    console.error('Error fetching user tenants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tenants/:id
 * Get tenant by ID
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        legalName: true,
        taxId: true,
        country: true,
        address: true,
        phone: true,
        email: true,
        website: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ tenant });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tenants/:id/users
 * Get users assigned to a tenant
 */
router.get('/:id/users', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const memberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId: id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
          },
        },
      },
    });

    const users = memberships.map(m => ({
      ...m.user,
      roles: m.roles,
      membershipId: m.id,
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/tenants/:id/users
 * Assign user to tenant
 */
router.post('/:id/users', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, roles } = req.body;

    // Check if membership already exists
    const existing = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId: id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'User already assigned to this tenant' });
    }

    const membership = await prisma.tenantMembership.create({
      data: {
        userId,
        tenantId: id,
        roles: roles || [],
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
          },
        },
      },
    });

    res.status(201).json({
      ...membership.user,
      roles: membership.roles,
      membershipId: membership.id,
    });
  } catch (error) {
    console.error('Error assigning user to tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/tenants/:id/users/:membershipId
 * Remove user from tenant
 */
router.delete('/:id/users/:membershipId', authenticate, async (req: Request, res: Response) => {
  try {
    const { membershipId } = req.params;

    await prisma.tenantMembership.delete({
      where: { id: membershipId },
    });

    res.json({ message: 'User removed from tenant successfully' });
  } catch (error) {
    console.error('Error removing user from tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/tenants/:id/users/:membershipId
 * Update user roles in tenant
 */
router.put('/:id/users/:membershipId', authenticate, async (req: Request, res: Response) => {
  try {
    const { membershipId } = req.params;
    const { roles } = req.body;

    const membership = await prisma.tenantMembership.update({
      where: { id: membershipId },
      data: { roles },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            emailVerified: true,
          },
        },
      },
    });

    res.json({
      ...membership.user,
      roles: membership.roles,
      membershipId: membership.id,
    });
  } catch (error) {
    console.error('Error updating user roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/tenants/:id
 * Update tenant (superuser only)
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, legalName, taxId, country, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (legalName !== undefined) updateData.legalName = legalName;
    if (taxId !== undefined) updateData.taxId = taxId;
    if (country !== undefined) updateData.country = country;
    if (isActive !== undefined) updateData.isActive = isActive;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    res.json({ tenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/tenants/:id
 * Delete tenant (superuser only)
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.tenant.delete({
      where: { id },
    });

    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
