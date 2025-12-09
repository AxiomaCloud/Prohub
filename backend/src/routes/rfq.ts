import { Router, Request, Response } from 'express';
import { PrismaClient, RFQStatus, QuotationStatus, RFQInvitationStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Helper para generar número de RFQ
async function generateRFQNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RFQ-${year}-`;

  const lastRFQ = await prisma.quotationRequest.findFirst({
    where: {
      tenantId,
      number: { startsWith: prefix }
    },
    orderBy: { number: 'desc' }
  });

  let nextNumber = 1;
  if (lastRFQ) {
    const lastNumber = parseInt(lastRFQ.number.replace(prefix, ''), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}

// Helper para generar número de cotización
async function generateQuotationNumber(rfqId: string): Promise<string> {
  const rfq = await prisma.quotationRequest.findUnique({
    where: { id: rfqId }
  });

  if (!rfq) throw new Error('RFQ no encontrado');

  const count = await prisma.supplierQuotation.count({
    where: { quotationRequestId: rfqId }
  });

  return `${rfq.number}-COT-${String(count + 1).padStart(3, '0')}`;
}

/**
 * GET /api/rfq
 * Listar solicitudes de cotización del tenant
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    // Verificar acceso al tenant
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      include: {
        tenantMemberships: { where: { tenantId } }
      }
    });

    if (!user?.superuser && (!user?.tenantMemberships || user.tenantMemberships.length === 0)) {
      return res.status(403).json({ error: 'No tienes acceso a este tenant' });
    }

    // Construir filtros
    const where: any = { tenantId };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [rfqs, total] = await Promise.all([
      prisma.quotationRequest.findMany({
        where,
        include: {
          items: true,
          invitedSuppliers: {
            include: {
              supplier: {
                select: { id: true, nombre: true, email: true }
              }
            }
          },
          quotations: {
            select: {
              id: true,
              status: true,
              totalAmount: true
            }
          },
          purchaseRequest: {
            select: { id: true, numero: true, titulo: true }
          },
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.quotationRequest.count({ where })
    ]);

    // Mapear respuesta
    const mappedRFQs = rfqs.map(rfq => ({
      id: rfq.id,
      number: rfq.number,
      title: rfq.title,
      description: rfq.description,
      status: rfq.status,
      deadline: rfq.deadline,
      deliveryDeadline: rfq.deliveryDeadline,
      paymentTerms: rfq.paymentTerms,
      currency: rfq.currency,
      estimatedBudget: rfq.budget ? Number(rfq.budget) : null,
      createdAt: rfq.createdAt,
      updatedAt: rfq.updatedAt,
      publishedAt: rfq.publishedAt,
      closedAt: rfq.closedAt,
      purchaseRequest: rfq.purchaseRequest,
      createdBy: rfq.createdBy,
      items: rfq.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        specifications: item.specifications
      })),
      suppliersInvited: rfq.invitedSuppliers.length,
      quotationsReceived: rfq.quotations.filter(q => q.status !== 'DRAFT').length,
      invitedSuppliers: rfq.invitedSuppliers.map(inv => ({
        id: inv.id,
        supplierId: inv.supplierId,
        supplier: inv.supplier,
        status: inv.status,
        invitedAt: inv.invitedAt,
        viewedAt: inv.viewedAt,
        respondedAt: inv.respondedAt
      }))
    }));

    res.json({
      rfqs: mappedRFQs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error al obtener RFQs:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/rfq/stats/:tenantId
 * Estadísticas de RFQs
 */
router.get('/stats/:tenantId', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const [total, draft, published, inQuotation, evaluation, awarded, cancelled] = await Promise.all([
      prisma.quotationRequest.count({ where: { tenantId } }),
      prisma.quotationRequest.count({ where: { tenantId, status: 'DRAFT' } }),
      prisma.quotationRequest.count({ where: { tenantId, status: 'PUBLISHED' } }),
      prisma.quotationRequest.count({ where: { tenantId, status: 'IN_QUOTATION' } }),
      prisma.quotationRequest.count({ where: { tenantId, status: 'EVALUATION' } }),
      prisma.quotationRequest.count({ where: { tenantId, status: 'AWARDED' } }),
      prisma.quotationRequest.count({ where: { tenantId, status: 'CANCELLED' } })
    ]);

    // RFQs por vencer (próximos 3 días)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringSoon = await prisma.quotationRequest.count({
      where: {
        tenantId,
        status: { in: ['PUBLISHED', 'IN_QUOTATION'] },
        deadline: {
          gte: new Date(),
          lte: threeDaysFromNow
        }
      }
    });

    res.json({
      stats: {
        total,
        draft,
        published,
        inQuotation,
        evaluation,
        awarded,
        cancelled,
        active: published + inQuotation + evaluation,
        expiringSoon
      }
    });
  } catch (error) {
    console.error('Error al obtener stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/rfq/:id
 * Obtener detalle de una RFQ
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        items: true,
        invitedSuppliers: {
          include: {
            supplier: {
              select: { id: true, nombre: true, email: true, cuit: true }
            }
          }
        },
        quotations: {
          include: {
            supplier: {
              select: { id: true, nombre: true, email: true, cuit: true }
            },
            items: true
          }
        },
        purchaseRequest: {
          include: {
            items: true,
            solicitante: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        awardedTo: {
          select: { id: true, nombre: true, email: true, cuit: true }
        }
      }
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    res.json({ rfq });
  } catch (error) {
    console.error('Error al obtener RFQ:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq
 * Crear nueva solicitud de cotización
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      title,
      description,
      purchaseRequestId,
      deadline,
      deliveryDeadline,
      paymentTerms,
      currency,
      estimatedBudget,
      items,
      supplierIds,
      attachments // [{fileName, fileUrl, fileType, fileSize}]
    } = req.body;

    if (!tenantId || !title || !deadline) {
      return res.status(400).json({ error: 'tenantId, title y deadline son requeridos' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const number = await generateRFQNumber(tenantId);

    // Crear RFQ con items y proveedores invitados
    const rfq = await prisma.quotationRequest.create({
      data: {
        number,
        title,
        description,
        tenantId,
        createdById: userId,
        purchaseRequestId: purchaseRequestId || null,
        deadline: new Date(deadline),
        deliveryDeadline: deliveryDeadline ? new Date(deliveryDeadline) : null,
        paymentTerms,
        currency: currency || 'ARS',
        budget: estimatedBudget || null,
        attachments: attachments || null,
        status: 'DRAFT',
        items: items && items.length > 0 ? {
          create: items.map((item: any, index: number) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || 'Unidad',
            specifications: item.specifications || null,
            orderIndex: index
          }))
        } : undefined,
        invitedSuppliers: supplierIds && supplierIds.length > 0 ? {
          create: supplierIds.map((supplierId: string) => ({
            supplierId,
            status: 'PENDING'
          }))
        } : undefined
      },
      include: {
        items: true,
        invitedSuppliers: {
          include: {
            supplier: {
              select: { id: true, nombre: true, email: true }
            }
          }
        }
      }
    });

    res.status(201).json({ rfq });
  } catch (error) {
    console.error('Error al crear RFQ:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/rfq/:id
 * Actualizar solicitud de cotización
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      deadline,
      deliveryDeadline,
      paymentTerms,
      currency,
      estimatedBudget,
      items,
      attachments
    } = req.body;

    // Verificar que existe y está en DRAFT
    const existing = await prisma.quotationRequest.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Solo se pueden editar RFQs en borrador' });
    }

    // Actualizar items si se proporcionan
    if (items) {
      // Eliminar items existentes
      await prisma.quotationRequestItem.deleteMany({
        where: { quotationRequestId: id }
      });

      // Crear nuevos items
      await prisma.quotationRequestItem.createMany({
        data: items.map((item: any, index: number) => ({
          quotationRequestId: id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || 'UN',
          specifications: item.specifications || null,
          orderIndex: index
        }))
      });
    }

    const rfq = await prisma.quotationRequest.update({
      where: { id },
      data: {
        title,
        description,
        deadline: deadline ? new Date(deadline) : undefined,
        deliveryDeadline: deliveryDeadline ? new Date(deliveryDeadline) : undefined,
        paymentTerms,
        currency,
        budget: estimatedBudget,
        attachments: attachments !== undefined ? attachments : undefined
      },
      include: {
        items: true,
        invitedSuppliers: {
          include: {
            supplier: { select: { id: true, nombre: true, email: true } }
          }
        }
      }
    });

    res.json({ rfq });
  } catch (error) {
    console.error('Error al actualizar RFQ:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /api/rfq/:id
 * Eliminar RFQ (solo en DRAFT)
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.quotationRequest.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Solo se pueden eliminar RFQs en borrador' });
    }

    // Eliminar en cascada
    await prisma.quotationRequestItem.deleteMany({ where: { quotationRequestId: id } });
    await prisma.quotationRequestSupplier.deleteMany({ where: { quotationRequestId: id } });
    await prisma.quotationRequest.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar RFQ:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq/:id/invite
 * Invitar proveedores a cotizar
 */
router.post('/:id/invite', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierIds } = req.body;

    if (!supplierIds || supplierIds.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un proveedor' });
    }

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id },
      include: { invitedSuppliers: true }
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (!['DRAFT', 'PUBLISHED'].includes(rfq.status)) {
      return res.status(400).json({ error: 'No se pueden agregar proveedores en este estado' });
    }

    // Filtrar proveedores ya invitados
    const existingIds = rfq.invitedSuppliers.map(inv => inv.supplierId);
    const newSupplierIds = supplierIds.filter((id: string) => !existingIds.includes(id));

    if (newSupplierIds.length === 0) {
      return res.status(400).json({ error: 'Todos los proveedores ya están invitados' });
    }

    // Crear invitaciones
    await prisma.quotationRequestSupplier.createMany({
      data: newSupplierIds.map((supplierId: string) => ({
        quotationRequestId: id,
        supplierId,
        status: rfq.status === 'PUBLISHED' ? 'INVITED' : 'PENDING'
      }))
    });

    // Si ya está publicada, enviar notificaciones
    if (rfq.status === 'PUBLISHED') {
      const notificationService = new NotificationService();
      for (const supplierId of newSupplierIds) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId }
        });
        if (supplier?.userId) {
          // TODO: Enviar notificación de invitación
        }
      }
    }

    const updated = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        invitedSuppliers: {
          include: {
            supplier: { select: { id: true, nombre: true, email: true } }
          }
        }
      }
    });

    res.json({ rfq: updated });
  } catch (error) {
    console.error('Error al invitar proveedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /api/rfq/:id/suppliers/:supplierId
 * Remover proveedor de la invitación
 */
router.delete('/:id/suppliers/:supplierId', authenticate, async (req: Request, res: Response) => {
  try {
    const { id, supplierId } = req.params;

    const rfq = await prisma.quotationRequest.findUnique({ where: { id } });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (rfq.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Solo se pueden remover proveedores en borrador' });
    }

    await prisma.quotationRequestSupplier.deleteMany({
      where: {
        quotationRequestId: id,
        supplierId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error al remover proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq/:id/publish
 * Publicar RFQ y enviar a proveedores
 */
router.post('/:id/publish', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        items: true,
        invitedSuppliers: {
          include: {
            supplier: true
          }
        }
      }
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (rfq.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Solo se pueden publicar RFQs en borrador' });
    }

    if (rfq.items.length === 0) {
      return res.status(400).json({ error: 'La RFQ debe tener al menos un item' });
    }

    if (rfq.invitedSuppliers.length === 0) {
      return res.status(400).json({ error: 'La RFQ debe tener al menos un proveedor invitado' });
    }

    // Actualizar RFQ y estado de invitaciones
    await prisma.$transaction([
      prisma.quotationRequest.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      }),
      prisma.quotationRequestSupplier.updateMany({
        where: {
          quotationRequestId: id,
          status: 'PENDING'
        },
        data: {
          status: 'INVITED',
          invitedAt: new Date()
        }
      })
    ]);

    const updated = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        items: true,
        invitedSuppliers: {
          include: {
            supplier: { select: { id: true, nombre: true, email: true } }
          }
        }
      }
    });

    // Obtener tenant por separado
    const tenant = await prisma.tenant.findUnique({
      where: { id: updated?.tenantId || '' },
      select: { id: true, name: true }
    });

    // Preparar adjuntos para el email
    let emailAttachments: Array<{
      filename: string;
      path: string;
    }> = [];

    if (updated?.attachments) {
      const attachmentsArray = updated.attachments as Array<{
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize: number;
      }>;

      if (Array.isArray(attachmentsArray) && attachmentsArray.length > 0) {
        console.log(`📎 [RFQ Publish] Procesando ${attachmentsArray.length} adjuntos para el email`);
        emailAttachments = attachmentsArray.map(att => {
          // Construir path completo del archivo
          const filePath = att.fileUrl.startsWith('/')
            ? path.join(process.cwd(), att.fileUrl)
            : path.join(process.cwd(), 'uploads', att.fileUrl);
          return {
            filename: att.fileName,
            path: filePath
          };
        }).filter(att => {
          // Verificar que el archivo existe
          const exists = fs.existsSync(att.path);
          if (!exists) {
            console.warn(`  ⚠️ Adjunto no encontrado: ${att.path}`);
          }
          return exists;
        });
        console.log(`  📎 ${emailAttachments.length} adjuntos válidos para enviar`);
      }
    }

    // Enviar notificaciones por email a cada proveedor
    if (updated) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📧 [RFQ Publish] RFQ ${updated.number} - Enviando invitaciones`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📋 Total proveedores invitados: ${updated.invitedSuppliers.length}`);

      if (updated.invitedSuppliers.length === 0) {
        console.log(`⚠️  No hay proveedores invitados para esta RFQ`);
      }

      let enviados = 0;
      let errores = 0;
      let sinEmail = 0;

      for (const invitation of updated.invitedSuppliers) {
        if (invitation.supplier.email) {
          try {
            console.log(`\n  [${enviados + errores + 1}/${updated.invitedSuppliers.length}] Enviando a: ${invitation.supplier.nombre}`);
            console.log(`      Email: ${invitation.supplier.email}`);
            console.log(`      Supplier ID: ${invitation.supplier.id}`);

            await NotificationService.notifyRFQInvitation(
              invitation.supplier.email,
              invitation.supplier.nombre,
              updated.number,
              updated.title,
              updated.deadline,
              tenant?.name || '',
              updated.id,
              updated.tenantId,
              emailAttachments.length > 0 ? emailAttachments : undefined
            );
            enviados++;
            console.log(`      ✅ Email enviado exitosamente${emailAttachments.length > 0 ? ` con ${emailAttachments.length} adjuntos` : ''}`);
          } catch (notifError: any) {
            errores++;
            console.error(`      ❌ Error: ${notifError.message || notifError}`);
          }
        } else {
          sinEmail++;
          console.log(`\n  [${enviados + errores + sinEmail}/${updated.invitedSuppliers.length}] ⚠️ Proveedor sin email: ${invitation.supplier.nombre} (ID: ${invitation.supplier.id})`);
        }
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Resumen de envío de invitaciones:`);
      console.log(`   ✅ Enviados: ${enviados}`);
      console.log(`   ❌ Errores: ${errores}`);
      console.log(`   ⚠️  Sin email: ${sinEmail}`);
      console.log(`${'='.repeat(60)}\n`);
    }

    res.json({ rfq: updated, message: 'RFQ publicada exitosamente' });
  } catch (error) {
    console.error('Error al publicar RFQ:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq/:id/close
 * Cerrar recepción de cotizaciones
 */
router.post('/:id/close', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        quotations: true
      }
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (!['PUBLISHED', 'IN_QUOTATION'].includes(rfq.status)) {
      return res.status(400).json({ error: 'La RFQ no está en estado para cerrar' });
    }

    const submittedQuotations = rfq.quotations.filter(q => q.status === 'SUBMITTED');

    const updated = await prisma.quotationRequest.update({
      where: { id },
      data: {
        status: submittedQuotations.length > 0 ? 'EVALUATION' : 'CLOSED',
        closedAt: new Date()
      }
    });

    res.json({
      rfq: updated,
      message: submittedQuotations.length > 0
        ? 'RFQ cerrada, pasa a evaluación'
        : 'RFQ cerrada sin cotizaciones recibidas'
    });
  } catch (error) {
    console.error('Error al cerrar RFQ:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq/:id/cancel
 * Cancelar RFQ
 */
router.post('/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rfq = await prisma.quotationRequest.findUnique({ where: { id } });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (['AWARDED', 'CLOSED', 'CANCELLED'].includes(rfq.status)) {
      return res.status(400).json({ error: 'No se puede cancelar una RFQ en este estado' });
    }

    const updated = await prisma.quotationRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        closedAt: new Date(),
        notes: reason ? `Cancelada: ${reason}` : 'Cancelada'
      }
    });

    // TODO: Notificar a proveedores invitados

    res.json({ rfq: updated });
  } catch (error) {
    console.error('Error al cancelar RFQ:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/rfq/:id/quotations
 * Obtener todas las cotizaciones de una RFQ
 */
router.get('/:id/quotations', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quotations = await prisma.supplierQuotation.findMany({
      where: { quotationRequestId: id },
      include: {
        supplier: {
          select: { id: true, nombre: true, email: true, cuit: true }
        },
        items: {
          include: {
            quotationRequestItem: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({ quotations });
  } catch (error) {
    console.error('Error al obtener cotizaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/rfq/:id/comparison
 * Cuadro comparativo de cotizaciones
 */
router.get('/:id/comparison', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        items: { orderBy: { orderIndex: 'asc' } },
        quotations: {
          where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'AWARDED'] } },
          include: {
            supplier: {
              select: { id: true, nombre: true, email: true, cuit: true }
            },
            items: true
          }
        }
      }
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    // Construir matriz comparativa
    const comparison = {
      rfq: {
        id: rfq.id,
        number: rfq.number,
        title: rfq.title,
        currency: rfq.currency,
        estimatedBudget: rfq.budget ? Number(rfq.budget) : null
      },
      items: rfq.items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit
      })),
      suppliers: rfq.quotations.map(q => ({
        quotationId: q.id,
        supplierId: q.supplierId,
        supplierName: q.supplier.nombre,
        totalAmount: Number(q.totalAmount),
        deliveryDays: q.deliveryDays,
        paymentTerms: q.paymentTerms,
        validUntil: q.validUntil,
        status: q.status,
        items: q.items.map(qi => ({
          requestItemId: qi.quotationRequestItemId,
          unitPrice: Number(qi.unitPrice),
          quantity: Number(qi.quantity),
          totalPrice: Number(qi.totalPrice),
          brand: qi.brand,
          model: qi.model,
          notes: qi.notes
        }))
      }))
    };

    // Calcular mejor precio por item
    const bestPrices: Record<string, { supplierId: string; price: number }> = {};
    for (const item of rfq.items) {
      let bestPrice = Infinity;
      let bestSupplierId = '';

      for (const quotation of rfq.quotations) {
        const quotedItem = quotation.items.find(qi => qi.quotationRequestItemId === item.id);
        if (quotedItem && Number(quotedItem.unitPrice) < bestPrice) {
          bestPrice = Number(quotedItem.unitPrice);
          bestSupplierId = quotation.supplierId;
        }
      }

      if (bestSupplierId) {
        bestPrices[item.id] = { supplierId: bestSupplierId, price: bestPrice };
      }
    }

    // Mejor total
    let bestTotalSupplierId = '';
    let bestTotal = Infinity;
    for (const q of rfq.quotations) {
      if (Number(q.totalAmount) < bestTotal) {
        bestTotal = Number(q.totalAmount);
        bestTotalSupplierId = q.supplierId;
      }
    }

    res.json({
      comparison,
      bestPrices,
      bestTotal: { supplierId: bestTotalSupplierId, amount: bestTotal }
    });
  } catch (error) {
    console.error('Error al generar comparativo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq/:id/award
 * Adjudicar RFQ a un proveedor
 */
router.post('/:id/award', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierId, quotationId, notes } = req.body;

    if (!supplierId || !quotationId) {
      return res.status(400).json({ error: 'supplierId y quotationId son requeridos' });
    }

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id },
      include: { quotations: true }
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (rfq.status !== 'EVALUATION') {
      return res.status(400).json({ error: 'La RFQ debe estar en evaluación para adjudicar' });
    }

    // Actualizar RFQ y cotizaciones
    await prisma.$transaction([
      // Marcar RFQ como adjudicada
      prisma.quotationRequest.update({
        where: { id },
        data: {
          status: 'AWARDED',
          awardedToId: supplierId,
          awardedAt: new Date(),
          notes: notes || null
        }
      }),
      // Marcar cotización ganadora
      prisma.supplierQuotation.update({
        where: { id: quotationId },
        data: { status: 'AWARDED' }
      }),
      // Rechazar otras cotizaciones
      prisma.supplierQuotation.updateMany({
        where: {
          quotationRequestId: id,
          id: { not: quotationId },
          status: { in: ['SUBMITTED', 'UNDER_REVIEW'] }
        },
        data: { status: 'REJECTED' }
      })
    ]);

    // Obtener datos completos para notificaciones
    const updated = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        awardedTo: { select: { id: true, nombre: true, email: true } },
        quotations: {
          include: {
            supplier: { select: { id: true, nombre: true, email: true } }
          }
        }
      }
    });

    // Obtener tenant por separado
    const tenant = await prisma.tenant.findUnique({
      where: { id: updated?.tenantId || '' },
      select: { id: true, name: true }
    });

    if (updated) {
      // Enviar notificaciones
      try {
        const awardedQuotation = updated.quotations.find(q => q.id === quotationId);

        // Notificar al ganador
        if (awardedQuotation?.supplier.email) {
          await NotificationService.notifyRFQAwarded(
            awardedQuotation.supplier.email,
            awardedQuotation.supplier.nombre,
            updated.number,
            updated.title,
            Number(awardedQuotation.totalAmount),
            tenant?.name || '',
            updated.id,
            updated.tenantId
          );
        }

        // Notificar a los no ganadores
        for (const quotation of updated.quotations) {
          if (quotation.id !== quotationId && quotation.supplier.email) {
            await NotificationService.notifyRFQNotAwarded(
              quotation.supplier.email,
              quotation.supplier.nombre,
              updated.number,
              updated.title,
              tenant?.name || '',
              updated.id,
              updated.tenantId
            );
          }
        }
      } catch (notifError) {
        console.error('Error enviando notificaciones de adjudicacion:', notifError);
        // No fallar la operacion por errores de notificacion
      }
    }

    res.json({ rfq: updated, message: 'RFQ adjudicada exitosamente' });
  } catch (error) {
    console.error('Error al adjudicar RFQ:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq/:id/generate-po
 * Generar Orden de Compra desde RFQ adjudicada
 */
router.post('/:id/generate-po', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        quotations: {
          where: { status: 'AWARDED' },
          include: {
            items: {
              include: { quotationRequestItem: true }
            },
            supplier: true
          }
        },
        purchaseRequest: true
      }
    });

    if (!rfq) {
      return res.status(404).json({ error: 'RFQ no encontrada' });
    }

    if (rfq.status !== 'AWARDED') {
      return res.status(400).json({ error: 'La RFQ debe estar adjudicada' });
    }

    const awardedQuotation = rfq.quotations[0];
    if (!awardedQuotation) {
      return res.status(400).json({ error: 'No hay cotización adjudicada' });
    }

    // Verificar que tenga purchaseRequestId
    if (!rfq.purchaseRequestId) {
      return res.status(400).json({ error: 'La RFQ no tiene requerimiento asociado' });
    }

    // Generar número de OC
    const year = new Date().getFullYear();
    const prefix = `OC-${year}-`;
    const lastOC = await prisma.purchaseOrderCircuit.findFirst({
      where: {
        tenantId: rfq.tenantId,
        numero: { startsWith: prefix }
      },
      orderBy: { numero: 'desc' }
    });

    let nextNumber = 1;
    if (lastOC) {
      const lastNum = parseInt(lastOC.numero.replace(prefix, ''), 10);
      nextNumber = lastNum + 1;
    }
    const ocNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`;

    // Calcular totales (sin impuestos - la OC es neta)
    const subtotal = Number(awardedQuotation.totalAmount) || 0;
    const impuestos = 0;
    const total = subtotal;

    // Crear la OC usando PurchaseOrderCircuit
    const purchaseOrder = await prisma.purchaseOrderCircuit.create({
      data: {
        numero: ocNumber,
        tenantId: rfq.tenantId,
        proveedorId: awardedQuotation.supplierId,
        purchaseRequestId: rfq.purchaseRequestId,
        moneda: rfq.currency,
        subtotal: subtotal,
        impuestos: impuestos,
        total: total,
        estado: 'PENDIENTE_APROBACION',
        condicionPago: awardedQuotation.paymentTerms,
        fechaEntregaEstimada: awardedQuotation.deliveryDays
          ? new Date(Date.now() + awardedQuotation.deliveryDays * 24 * 60 * 60 * 1000)
          : null,
        creadoPorId: req.user?.id!,
        items: {
          create: awardedQuotation.items.map((item) => ({
            descripcion: item.quotationRequestItem?.description || '',
            cantidad: Number(item.quantity),
            unidad: item.quotationRequestItem?.unit || 'Unidad',
            precioUnitario: Number(item.unitPrice),
            total: Number(item.totalPrice),
            purchaseRequestItemId: item.quotationRequestItem?.purchaseRequestItemId || null,
          }))
        }
      },
      include: {
        items: true,
        proveedor: { select: { id: true, nombre: true } }
      }
    });

    // Actualizar estado del requerimiento
    await prisma.purchaseRequest.update({
      where: { id: rfq.purchaseRequestId },
      data: { estado: 'OC_GENERADA' }
    });

    // Actualizar estado de la RFQ a PO_GENERATED y el monto estimado
    await prisma.quotationRequest.update({
      where: { id: rfq.id },
      data: {
        status: 'PO_GENERATED',
        budget: total, // Actualizar al monto real de la OC
      }
    });

    // Notificar al proveedor sobre la OC generada
    if (awardedQuotation.supplier?.email) {
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: rfq.tenantId } });
        await NotificationService.notifyOCToSupplier(
          awardedQuotation.supplier.email,
          awardedQuotation.supplier.nombre || 'Proveedor',
          ocNumber,
          total,
          rfq.currency,
          purchaseOrder.fechaEntregaEstimada,
          tenant?.name || 'Hub',
          rfq.tenantId
        );
        console.log(`📧 [OC] Notificación enviada a ${awardedQuotation.supplier.email}`);
      } catch (notifError) {
        console.error(`❌ Error enviando notificación OC a proveedor:`, notifError);
      }
    }

    res.json({
      purchaseOrder,
      message: `Orden de Compra ${ocNumber} generada exitosamente`
    });
  } catch (error) {
    console.error('Error al generar OC:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// =====================================
// ENDPOINTS PORTAL PROVEEDOR
// =====================================

/**
 * GET /api/rfq/supplier-portal/invitations
 * RFQs donde el proveedor está invitado
 */
router.get('/supplier-portal/invitations', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    console.log('📋 [RFQ] Buscando invitaciones para userId:', userId);

    // Obtener el proveedor asociado al usuario
    // Primero buscar directamente por userId
    let supplier = await prisma.supplier.findFirst({
      where: { userId }
    });
    console.log('📋 [RFQ] Supplier por userId:', supplier?.id || 'No encontrado');

    // Si no encuentra, buscar por TenantMembership.supplierId
    if (!supplier && userId) {
      const membership = await prisma.tenantMembership.findFirst({
        where: {
          userId,
          supplierId: { not: null },
          roles: { has: 'PROVIDER' }
        }
      });
      console.log('📋 [RFQ] Membership encontrado:', membership?.id, 'supplierId:', membership?.supplierId);

      if (membership?.supplierId) {
        supplier = await prisma.supplier.findUnique({
          where: { id: membership.supplierId }
        });
        console.log('📋 [RFQ] Supplier por membership:', supplier?.id || 'No encontrado');

        // Auto-actualizar userId en Supplier para futuras búsquedas
        if (supplier && !supplier.userId) {
          await prisma.supplier.update({
            where: { id: supplier.id },
            data: { userId }
          });
          console.log('📋 [RFQ] Actualizado userId en Supplier');
        }
      }
    }

    if (!supplier) {
      console.log('📋 [RFQ] No se encontró proveedor para userId:', userId);
      return res.status(404).json({ error: 'No eres un proveedor registrado' });
    }

    console.log('📋 [RFQ] Buscando invitaciones para supplierId:', supplier.id);

    const invitations = await prisma.quotationRequestSupplier.findMany({
      where: {
        supplierId: supplier.id,
        quotationRequest: {
          status: { in: ['PUBLISHED', 'IN_QUOTATION', 'EVALUATION', 'AWARDED', 'CLOSED'] }
        }
      },
      include: {
        quotationRequest: {
          include: {
            items: true,
          }
        }
      },
      orderBy: { invitedAt: 'desc' }
    });
    console.log('📋 [RFQ] Invitaciones encontradas:', invitations.length);

    // Obtener cotizaciones del proveedor
    const quotations = await prisma.supplierQuotation.findMany({
      where: { supplierId: supplier.id }
    });

    const quotationMap = new Map(quotations.map(q => [q.quotationRequestId, q]));

    // Obtener tenant para mostrar nombre
    const tenant = await prisma.tenant.findUnique({
      where: { id: supplier.tenantId },
      select: { id: true, name: true }
    });

    const mappedInvitations = invitations.map(inv => ({
      id: inv.id,
      status: inv.status,
      invitedAt: inv.invitedAt,
      viewedAt: inv.viewedAt,
      respondedAt: inv.respondedAt,
      rfq: {
        id: inv.quotationRequest.id,
        number: inv.quotationRequest.number,
        title: inv.quotationRequest.title,
        status: inv.quotationRequest.status,
        deadline: inv.quotationRequest.deadline,
        deliveryDeadline: inv.quotationRequest.deliveryDeadline,
        currency: inv.quotationRequest.currency,
        tenant: tenant,
        itemCount: inv.quotationRequest.items.length
      },
      myQuotation: quotationMap.get(inv.quotationRequestId) || null
    }));

    res.json({ invitations: mappedInvitations });
  } catch (error) {
    console.error('Error al obtener invitaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/rfq/supplier-portal/:id
 * Detalle de RFQ para cotizar (portal proveedor)
 */
router.get('/supplier-portal/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Buscar proveedor directamente o por TenantMembership
    let supplier = await prisma.supplier.findFirst({
      where: { userId }
    });

    if (!supplier && userId) {
      const membership = await prisma.tenantMembership.findFirst({
        where: {
          userId,
          supplierId: { not: null },
          roles: { has: 'PROVIDER' }
        }
      });

      if (membership?.supplierId) {
        supplier = await prisma.supplier.findUnique({
          where: { id: membership.supplierId }
        });
      }
    }

    if (!supplier) {
      return res.status(404).json({ error: 'No eres un proveedor registrado' });
    }

    // Verificar que está invitado
    const invitation = await prisma.quotationRequestSupplier.findFirst({
      where: {
        quotationRequestId: id,
        supplierId: supplier.id
      }
    });

    if (!invitation) {
      return res.status(403).json({ error: 'No estás invitado a esta solicitud' });
    }

    // Marcar como vista si no lo estaba
    if (!invitation.viewedAt) {
      await prisma.quotationRequestSupplier.update({
        where: { id: invitation.id },
        data: { viewedAt: new Date(), status: 'VIEWED' }
      });
    }

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        items: { orderBy: { orderIndex: 'asc' } }
      }
    });

    // Obtener tenant por separado
    const tenant = rfq ? await prisma.tenant.findUnique({
      where: { id: rfq.tenantId },
      select: { id: true, name: true }
    }) : null;

    // Obtener cotización existente del proveedor
    const existingQuotation = await prisma.supplierQuotation.findFirst({
      where: {
        quotationRequestId: id,
        supplierId: supplier.id
      },
      include: { items: true }
    });

    res.json({ rfq: rfq ? { ...rfq, tenant } : null, myQuotation: existingQuotation });
  } catch (error) {
    console.error('Error al obtener RFQ para proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq/supplier-portal/:id/quotation
 * Enviar o actualizar cotización (portal proveedor)
 */
router.post('/supplier-portal/:id/quotation', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      items,
      deliveryDays,
      paymentTerms,
      validUntil,
      notes,
      submit // true = enviar, false = guardar borrador
    } = req.body;

    const userId = req.user?.id;

    // Buscar proveedor directamente o por TenantMembership
    let supplier = await prisma.supplier.findFirst({
      where: { userId }
    });

    if (!supplier && userId) {
      const membership = await prisma.tenantMembership.findFirst({
        where: {
          userId,
          supplierId: { not: null },
          roles: { has: 'PROVIDER' }
        }
      });

      if (membership?.supplierId) {
        supplier = await prisma.supplier.findUnique({
          where: { id: membership.supplierId }
        });
      }
    }

    if (!supplier) {
      return res.status(404).json({ error: 'No eres un proveedor registrado' });
    }

    // Verificar invitación
    const invitation = await prisma.quotationRequestSupplier.findFirst({
      where: {
        quotationRequestId: id,
        supplierId: supplier.id
      }
    });

    if (!invitation) {
      return res.status(403).json({ error: 'No estás invitado a esta solicitud' });
    }

    const rfq = await prisma.quotationRequest.findUnique({
      where: { id }
    });

    if (!rfq || !['PUBLISHED', 'IN_QUOTATION'].includes(rfq.status)) {
      return res.status(400).json({ error: 'La solicitud no está abierta para cotizaciones' });
    }

    // Verificar deadline
    if (new Date() > rfq.deadline) {
      return res.status(400).json({ error: 'El plazo para cotizar ha vencido' });
    }

    // Calcular total
    const totalAmount = items.reduce((sum: number, item: any) =>
      sum + (Number(item.unitPrice) * Number(item.quantity)), 0
    );

    // Buscar cotización existente
    let quotation = await prisma.supplierQuotation.findFirst({
      where: {
        quotationRequestId: id,
        supplierId: supplier.id
      }
    });

    if (quotation) {
      // Actualizar existente
      if (!['DRAFT', 'SUBMITTED'].includes(quotation.status)) {
        return res.status(400).json({ error: 'No se puede modificar esta cotización' });
      }

      // Eliminar items anteriores
      await prisma.supplierQuotationItem.deleteMany({
        where: { supplierQuotationId: quotation.id }
      });

      quotation = await prisma.supplierQuotation.update({
        where: { id: quotation.id },
        data: {
          deliveryDays,
          paymentTerms,
          validUntil: validUntil ? new Date(validUntil) : null,
          notes,
          totalAmount,
          subtotal: totalAmount,
          currency: rfq.currency,
          status: submit ? 'SUBMITTED' : 'DRAFT',
          submittedAt: submit ? new Date() : null,
          items: {
            create: items.map((item: any) => ({
              quotationRequestItemId: item.requestItemId,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: Number(item.unitPrice) * Number(item.quantity),
              brand: item.brand || null,
              model: item.model || null,
              notes: item.notes || null
            }))
          }
        },
        include: { items: true }
      });
    } else {
      // Crear nueva
      const number = await generateQuotationNumber(id);

      quotation = await prisma.supplierQuotation.create({
        data: {
          number,
          quotationRequestId: id,
          supplierId: supplier.id,
          deliveryDays,
          paymentTerms,
          validUntil: validUntil ? new Date(validUntil) : null,
          notes,
          totalAmount,
          subtotal: totalAmount,
          currency: rfq.currency,
          status: submit ? 'SUBMITTED' : 'DRAFT',
          submittedAt: submit ? new Date() : null,
          items: {
            create: items.map((item: any) => ({
              quotationRequestItemId: item.requestItemId,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: Number(item.unitPrice) * Number(item.quantity),
              brand: item.brand || null,
              model: item.model || null,
              notes: item.notes || null
            }))
          }
        },
        include: { items: true }
      });
    }

    // Actualizar estado de invitación si se envió
    if (submit) {
      await prisma.quotationRequestSupplier.update({
        where: { id: invitation.id },
        data: { respondedAt: new Date() }
      });

      // Actualizar RFQ a IN_QUOTATION si es la primera cotización
      if (rfq.status === 'PUBLISHED') {
        await prisma.quotationRequest.update({
          where: { id },
          data: { status: 'IN_QUOTATION' }
        });
      }
    }

    res.json({
      quotation,
      message: submit ? 'Cotización enviada exitosamente' : 'Borrador guardado'
    });
  } catch (error) {
    console.error('Error al guardar cotización:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/rfq/supplier-portal/:id/decline
 * Rechazar participar en RFQ
 */
router.post('/supplier-portal/:id/decline', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    // Buscar proveedor directamente o por TenantMembership
    let supplier = await prisma.supplier.findFirst({
      where: { userId }
    });

    if (!supplier && userId) {
      const membership = await prisma.tenantMembership.findFirst({
        where: {
          userId,
          supplierId: { not: null },
          roles: { has: 'PROVIDER' }
        }
      });

      if (membership?.supplierId) {
        supplier = await prisma.supplier.findUnique({
          where: { id: membership.supplierId }
        });
      }
    }

    if (!supplier) {
      return res.status(404).json({ error: 'No eres un proveedor registrado' });
    }

    const invitation = await prisma.quotationRequestSupplier.findFirst({
      where: {
        quotationRequestId: id,
        supplierId: supplier.id
      }
    });

    if (!invitation) {
      return res.status(403).json({ error: 'No estás invitado a esta solicitud' });
    }

    await prisma.quotationRequestSupplier.update({
      where: { id: invitation.id },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
        declineReason: reason || null
      }
    });

    res.json({ success: true, message: 'Has declinado participar en esta solicitud' });
  } catch (error) {
    console.error('Error al declinar:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
