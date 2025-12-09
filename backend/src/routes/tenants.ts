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
 * Delete tenant (superuser only) - elimina en cascada todos los registros relacionados
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el tenant existe
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }

    console.log(`🗑️ [TENANT DELETE] Eliminando tenant: ${tenant.name} (${id})`);

    // Eliminar en cascada usando transacción
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar PaymentItem (depende de Document y Payment)
      await tx.paymentItem.deleteMany({
        where: {
          OR: [
            { payment: { issuedByTenantId: id } },
            { payment: { receivedByTenantId: id } },
          ],
        },
      });

      // 2. Eliminar Payments
      await tx.payment.deleteMany({
        where: {
          OR: [
            { issuedByTenantId: id },
            { receivedByTenantId: id },
          ],
        },
      });

      // 3. Eliminar Comment, DocumentEvent, Attachment de documentos
      const docs = await tx.document.findMany({
        where: {
          OR: [
            { providerTenantId: id },
            { clientTenantId: id },
          ],
        },
        select: { id: true },
      });
      const docIds = docs.map(d => d.id);

      if (docIds.length > 0) {
        await tx.comment.deleteMany({
          where: { documentId: { in: docIds } },
        });
        await tx.documentEvent.deleteMany({
          where: { documentId: { in: docIds } },
        });
        await tx.attachment.deleteMany({
          where: { documentId: { in: docIds } },
        });
      }

      // 4. Eliminar Documents
      await tx.document.deleteMany({
        where: {
          OR: [
            { providerTenantId: id },
            { clientTenantId: id },
          ],
        },
      });

      // 5. Eliminar PurchaseOrder (modelo viejo) relacionados
      await tx.purchaseOrder.deleteMany({
        where: { clientTenantId: id },
      });

      // 6. Eliminar RFQ relacionados
      // Primero obtenemos los IDs de las RFQs del tenant
      const rfqs = await tx.quotationRequest.findMany({
        where: { tenantId: id },
        select: { id: true },
      });
      const rfqIds = rfqs.map(r => r.id);

      if (rfqIds.length > 0) {
        // Obtener IDs de cotizaciones de proveedores
        const quotations = await tx.supplierQuotation.findMany({
          where: { quotationRequestId: { in: rfqIds } },
          select: { id: true },
        });
        const quotationIds = quotations.map(q => q.id);

        if (quotationIds.length > 0) {
          await tx.supplierQuotationItem.deleteMany({
            where: { supplierQuotationId: { in: quotationIds } },
          });
        }

        await tx.supplierQuotation.deleteMany({
          where: { quotationRequestId: { in: rfqIds } },
        });
        await tx.quotationRequestSupplier.deleteMany({
          where: { quotationRequestId: { in: rfqIds } },
        });
        await tx.quotationRequestItem.deleteMany({
          where: { quotationRequestId: { in: rfqIds } },
        });
      }

      await tx.quotationRequest.deleteMany({
        where: { tenantId: id },
      });

      // 7. Eliminar PurchaseRequest relacionados
      const prs = await tx.purchaseRequest.findMany({
        where: { tenantId: id },
        select: { id: true },
      });
      const prIds = prs.map(p => p.id);

      if (prIds.length > 0) {
        await tx.purchaseRequestAttachment.deleteMany({
          where: { purchaseRequestId: { in: prIds } },
        });
        await tx.purchaseRequestItem.deleteMany({
          where: { purchaseRequestId: { in: prIds } },
        });
      }
      await tx.purchaseRequest.deleteMany({
        where: { tenantId: id },
      });

      // 8. Eliminar PurchaseOrderCircuit relacionados
      const pocs = await tx.purchaseOrderCircuit.findMany({
        where: { tenantId: id },
        select: { id: true },
      });
      const pocIds = pocs.map(p => p.id);

      if (pocIds.length > 0) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: { in: pocIds } },
        });
      }
      await tx.purchaseOrderCircuit.deleteMany({
        where: { tenantId: id },
      });

      // 9. Eliminar Reception relacionados
      const receptions = await tx.reception.findMany({
        where: { tenantId: id },
        select: { id: true },
      });
      const receptionIds = receptions.map(r => r.id);

      if (receptionIds.length > 0) {
        await tx.receptionItem.deleteMany({
          where: { receptionId: { in: receptionIds } },
        });
      }
      await tx.reception.deleteMany({
        where: { tenantId: id },
      });

      // 10. Eliminar Suppliers relacionados
      const suppliers = await tx.supplier.findMany({
        where: { tenantId: id },
        select: { id: true },
      });
      const supplierIds = suppliers.map(s => s.id);

      if (supplierIds.length > 0) {
        await tx.supplierBankAccount.deleteMany({
          where: { supplierId: { in: supplierIds } },
        });
        await tx.supplierDocument.deleteMany({
          where: { supplierId: { in: supplierIds } },
        });
      }
      await tx.supplier.deleteMany({
        where: { tenantId: id },
      });

      // 11. Eliminar Approval relacionados
      const workflows = await tx.approvalWorkflow.findMany({
        where: { tenantId: id },
        select: { id: true },
      });
      const workflowIds = workflows.map(w => w.id);

      if (workflowIds.length > 0) {
        await tx.approvalInstance.deleteMany({
          where: { workflowId: { in: workflowIds } },
        });
      }
      await tx.approvalWorkflow.deleteMany({
        where: { tenantId: id },
      });

      await tx.approvalDelegation.deleteMany({
        where: { tenantId: id },
      });

      const rules = await tx.approvalRule.findMany({
        where: { tenantId: id },
        select: { id: true },
      });
      const ruleIds = rules.map(r => r.id);

      if (ruleIds.length > 0) {
        const levels = await tx.approvalLevel.findMany({
          where: { approvalRuleId: { in: ruleIds } },
          select: { id: true },
        });
        const levelIds = levels.map(l => l.id);

        if (levelIds.length > 0) {
          await tx.approvalLevelApprover.deleteMany({
            where: { approvalLevelId: { in: levelIds } },
          });
        }
        await tx.approvalLevel.deleteMany({
          where: { approvalRuleId: { in: ruleIds } },
        });
      }
      await tx.approvalRule.deleteMany({
        where: { tenantId: id },
      });

      // 12. Eliminar UserNotificationPreference
      await tx.userNotificationPreference.deleteMany({
        where: { tenantId: id },
      });

      // 13. Eliminar EmailTemplate del tenant
      await tx.emailTemplate.deleteMany({
        where: { tenantId: id },
      });

      // 14. Eliminar TenantSupplierConfig
      await tx.tenantSupplierConfig.deleteMany({
        where: { tenantId: id },
      });

      // 15. Eliminar Conversations y Messages
      const conversations = await tx.conversation.findMany({
        where: {
          OR: [
            { providerTenantId: id },
            { clientTenantId: id },
          ],
        },
        select: { id: true },
      });
      const convIds = conversations.map(c => c.id);

      if (convIds.length > 0) {
        await tx.message.deleteMany({
          where: { conversationId: { in: convIds } },
        });
      }
      await tx.conversation.deleteMany({
        where: {
          OR: [
            { providerTenantId: id },
            { clientTenantId: id },
          ],
        },
      });

      // 16. Eliminar Notifications - solo las del tenant, no filtramos por usuario
      // Las notificaciones no tienen tenantId directo, así que las dejamos

      // 17. Eliminar MenuItem
      await tx.menuItem.deleteMany({
        where: { tenantId: id },
      });

      // 18. Eliminar TenantMembership (usuarios asociados)
      await tx.tenantMembership.deleteMany({
        where: { tenantId: id },
      });

      // 19. Finalmente eliminar el Tenant
      await tx.tenant.delete({
        where: { id },
      });
    });

    console.log(`✅ [TENANT DELETE] Tenant eliminado: ${tenant.name}`);
    res.json({ message: 'Tenant eliminado correctamente', tenant: { id, name: tenant.name } });
  } catch (error: any) {
    console.error('❌ [TENANT DELETE] Error:', error.message);
    res.status(500).json({ error: 'Error al eliminar tenant', details: error.message });
  }
});

export default router;
