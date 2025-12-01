import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { ApprovalMode, ApprovalLevelType, PurchaseType } from '@prisma/client';

const router = Router();

router.use(authenticate);

/**
 * GET /api/approval-rules
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const rules = await prisma.approvalRule.findMany({
      where: { tenantId },
      include: {
        levels: {
          orderBy: { levelOrder: 'asc' },
          include: {
            approvers: true,
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    // Agregar información de usuarios a los aprobadores
    const rulesWithUsers = await Promise.all(rules.map(async (rule) => ({
      ...rule,
      levels: await Promise.all(rule.levels.map(async (level) => ({
        ...level,
        approvers: await Promise.all(level.approvers.map(async (approver) => {
          if (approver.userId) {
            const user = await prisma.user.findUnique({
              where: { id: approver.userId },
              select: { id: true, name: true, email: true },
            });
            return { ...approver, user };
          }
          return { ...approver, user: null };
        })),
      }))),
    })));

    return res.json(rulesWithUsers);
  } catch (error) {
    console.error('Error getting approval rules:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/approval-rules/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const rule = await prisma.approvalRule.findUnique({
      where: { id },
      include: {
        levels: {
          orderBy: { levelOrder: 'asc' },
          include: {
            approvers: true,
          },
        },
      },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    return res.json(rule);
  } catch (error) {
    console.error('Error getting approval rule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/approval-rules
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('levels').isArray({ min: 1 }).withMessage('At least one level is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      const { name, purchaseType, minAmount, maxAmount, priority, levels } = req.body;

      const rule = await prisma.approvalRule.create({
        data: {
          tenantId,
          name,
          purchaseType: purchaseType || null,
          minAmount: minAmount || null,
          maxAmount: maxAmount || null,
          priority: priority || 0,
          isActive: true,
          levels: {
            create: levels.map((level: any, index: number) => ({
              name: level.name,
              levelOrder: index + 1,
              approvalMode: (level.mode || 'ANY') as ApprovalMode,
              levelType: (level.levelType || 'GENERAL') as ApprovalLevelType,
              approvers: {
                create: level.approverIds.map((userId: string) => ({
                  userId,
                })),
              },
            })),
          },
        },
        include: {
          levels: {
            include: {
              approvers: true,
            },
          },
        },
      });

      return res.status(201).json(rule);
    } catch (error) {
      console.error('Error creating approval rule:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/approval-rules/:id
 */
router.put(
  '/:id',
  [param('id').isUUID().withMessage('Invalid rule ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const { name, minAmount, maxAmount, purchaseType, priority, isActive } = req.body;

      const rule = await prisma.approvalRule.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(minAmount !== undefined && { minAmount }),
          ...(maxAmount !== undefined && { maxAmount }),
          ...(purchaseType !== undefined && { purchaseType }),
          ...(priority !== undefined && { priority }),
          ...(isActive !== undefined && { isActive }),
        },
        include: {
          levels: {
            include: {
              approvers: true,
            },
          },
        },
      });

      return res.json(rule);
    } catch (error) {
      console.error('Error updating approval rule:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/approval-rules/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    // Verificar si hay workflows activos usando esta regla
    const activeWorkflows = await prisma.approvalWorkflow.count({
      where: {
        approvalRuleId: id,
        status: 'IN_PROGRESS',
      },
    });

    if (activeWorkflows > 0) {
      return res.status(400).json({
        error: 'Cannot delete rule with active workflows',
        activeWorkflows,
      });
    }

    // Eliminar en cascada
    await prisma.approvalRule.delete({
      where: { id },
    });

    return res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting approval rule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/approval-rules/approvers/available
 */
router.get('/approvers/available', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const memberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId,
        roles: {
          hasSome: ['CLIENT_APPROVER', 'CLIENT_ADMIN', 'SUPER_ADMIN', 'PURCHASE_APPROVER', 'PURCHASE_ADMIN'],
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const approvers = memberships.map(m => m.user);

    return res.json(approvers);
  } catch (error) {
    console.error('Error getting available approvers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
