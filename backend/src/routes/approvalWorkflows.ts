import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { ApprovalWorkflowService } from '../services/approvalWorkflowService';

const router = Router();

router.use(authenticate);

/**
 * GET /api/approval-workflows/pending
 */
router.get('/pending', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const pendingApprovals = await ApprovalWorkflowService.getPendingApprovals(
      req.user.id,
      tenantId
    );

    return res.json(pendingApprovals);
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/approval-workflows/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const workflow = await ApprovalWorkflowService.getWorkflowStatus(id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    return res.json(workflow);
  } catch (error) {
    console.error('Error getting workflow status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/approval-workflows/document/:documentType/:documentId
 */
router.get('/document/:documentType/:documentId', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { documentType, documentId } = req.params;

    const workflow = await ApprovalWorkflowService.getActiveWorkflow(
      documentType as 'PURCHASE_REQUEST' | 'PURCHASE_ORDER',
      documentId
    );

    return res.json(workflow);
  } catch (error) {
    console.error('Error getting document workflow:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/approval-workflows/:id/approve
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const { comment } = req.body;

    const result = await ApprovalWorkflowService.processDecision(
      id,
      req.user.id,
      'APPROVED',
      comment
    );

    if (!result.success) {
      return res.status(400).json({ error: 'Unable to process approval' });
    }

    return res.json({
      message: 'Aprobación registrada',
      workflowComplete: result.workflowComplete,
      finalStatus: result.finalStatus,
    });
  } catch (error) {
    console.error('Error processing approval:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/approval-workflows/:id/reject
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const result = await ApprovalWorkflowService.processDecision(
      id,
      req.user.id,
      'REJECTED',
      comment
    );

    if (!result.success) {
      return res.status(400).json({ error: 'Unable to process rejection' });
    }

    return res.json({
      message: 'Rechazo registrado',
      workflowComplete: result.workflowComplete,
      finalStatus: result.finalStatus,
    });
  } catch (error) {
    console.error('Error processing rejection:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/approval-workflows/:id/cancel
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    await ApprovalWorkflowService.cancelWorkflow(id);

    return res.json({ message: 'Workflow cancelado' });
  } catch (error) {
    console.error('Error canceling workflow:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DELEGACIONES ====================

/**
 * GET /api/approval-workflows/delegations
 */
router.get('/delegations', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const delegations = await ApprovalWorkflowService.getUserDelegations(
      req.user.id,
      tenantId
    );

    return res.json(delegations);
  } catch (error) {
    console.error('Error getting delegations:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/approval-workflows/delegations
 */
router.post('/delegations', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const { delegateId, startDate, endDate, reason } = req.body;

    if (!delegateId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    if (delegateId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delegate to yourself' });
    }

    const delegation = await ApprovalWorkflowService.createDelegation(
      req.user.id,
      delegateId,
      tenantId,
      start,
      end,
      reason
    );

    return res.status(201).json(delegation);
  } catch (error: any) {
    console.error('Error creating delegation:', error);

    if (error.message?.includes('Ya existe una delegación activa')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/approval-workflows/delegations/:id
 */
router.delete('/delegations/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    const delegation = await prisma.approvalDelegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      return res.status(404).json({ error: 'Delegation not found' });
    }

    if (delegation.delegatorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to cancel this delegation' });
    }

    await ApprovalWorkflowService.cancelDelegation(id);

    return res.json({ message: 'Delegación cancelada' });
  } catch (error) {
    console.error('Error canceling delegation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/approval-workflows/delegations/available-delegates
 */
router.get('/delegations/available-delegates', async (req: Request, res: Response) => {
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
        userId: {
          not: req.user.id,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const delegates = memberships.map(m => m.user);

    return res.json(delegates);
  } catch (error) {
    console.error('Error getting available delegates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
