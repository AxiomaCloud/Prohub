import { Router, Request, Response } from 'express';
import { PrismaClient, PaymentStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// LISTADO DE PAGOS
// ============================================

// GET /api/payments - Listar pagos del proveedor
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const status = req.query.status as PaymentStatus;
    const search = req.query.search as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const minAmount = req.query.minAmount as string;
    const maxAmount = req.query.maxAmount as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    const where: any = {
      receivedByTenantId: tenantId,
      ...(status && { status }),
      ...(dateFrom && {
        issueDate: {
          gte: new Date(dateFrom),
        },
      }),
      ...(dateTo && {
        issueDate: {
          ...((where as any)?.issueDate || {}),
          lte: new Date(dateTo),
        },
      }),
      ...(minAmount && {
        amount: {
          gte: parseFloat(minAmount),
        },
      }),
      ...(maxAmount && {
        amount: {
          ...((where as any)?.amount || {}),
          lte: parseFloat(maxAmount),
        },
      }),
      ...(search && {
        number: { contains: search, mode: 'insensitive' },
      }),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          issuedByTenant: {
            select: {
              id: true,
              name: true,
              legalName: true,
            },
          },
          items: {
            include: {
              document: {
                select: {
                  id: true,
                  number: true,
                  type: true,
                  totalAmount: true,
                  date: true,
                  fileUrl: true,
                },
              },
            },
          },
        },
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    // Calcular cantidad de facturas y retenciones por pago
    const paymentsWithCounts = payments.map((payment) => ({
      ...payment,
      invoiceCount: payment.items.length,
      retentionCount: payment.retentionUrls
        ? (payment.retentionUrls as string[]).length
        : 0,
    }));

    res.json({
      payments: paymentsWithCounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error al listar pagos:', error);
    res.status(500).json({ error: 'Error al listar pagos' });
  }
});

// GET /api/payments/stats/:tenantId - Estadísticas de pagos
router.get('/stats/:tenantId', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Fecha hace 12 meses
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    // Fecha inicio del mes actual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fecha hace 1 mes (para comparación)
    const lastMonthStart = new Date(startOfMonth);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(startOfMonth);
    lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);

    const [
      totalReceived12m,
      totalReceivedThisMonth,
      totalReceivedLastMonth,
      pendingPayments,
      scheduledPayments,
    ] = await Promise.all([
      // Total recibido últimos 12 meses
      prisma.payment.aggregate({
        where: {
          receivedByTenantId: tenantId,
          status: 'PAID',
          paidAt: { gte: last12Months },
        },
        _sum: { amount: true },
      }),
      // Total recibido este mes
      prisma.payment.aggregate({
        where: {
          receivedByTenantId: tenantId,
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Total recibido mes anterior
      prisma.payment.aggregate({
        where: {
          receivedByTenantId: tenantId,
          status: 'PAID',
          paidAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
        _sum: { amount: true },
      }),
      // Documentos pendientes de pago (facturas aprobadas no pagadas)
      prisma.document.aggregate({
        where: {
          providerTenantId: tenantId,
          status: 'APPROVED',
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Pagos programados
      prisma.payment.aggregate({
        where: {
          receivedByTenantId: tenantId,
          status: 'SCHEDULED',
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Calcular variación porcentual
    const thisMonth = Number(totalReceivedThisMonth._sum.amount) || 0;
    const lastMonth = Number(totalReceivedLastMonth._sum.amount) || 0;
    const variation = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    res.json({
      stats: {
        totalReceived12m: Number(totalReceived12m._sum.amount) || 0,
        totalReceivedThisMonth: thisMonth,
        monthlyVariation: Math.round(variation),
        pendingAmount: Number(pendingPayments._sum.totalAmount) || 0,
        pendingCount: pendingPayments._count,
        scheduledAmount: Number(scheduledPayments._sum.amount) || 0,
        scheduledCount: scheduledPayments._count,
      },
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ============================================
// DETALLE DE PAGO
// ============================================

// GET /api/payments/:id - Obtener detalle de pago
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        issuedByTenant: {
          select: {
            id: true,
            name: true,
            legalName: true,
            taxId: true,
            address: true,
            phone: true,
            email: true,
          },
        },
        receivedByTenant: {
          select: {
            id: true,
            name: true,
            legalName: true,
            taxId: true,
          },
        },
        items: {
          include: {
            document: {
              select: {
                id: true,
                number: true,
                type: true,
                amount: true,
                taxAmount: true,
                totalAmount: true,
                date: true,
                fileUrl: true,
                fileName: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    // Parsear retenciones
    const retentions = payment.retentionUrls as any[] || [];

    res.json({
      payment: {
        ...payment,
        retentions,
        invoiceCount: payment.items.length,
        retentionCount: retentions.length,
      },
    });
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({ error: 'Error al obtener pago' });
  }
});

// ============================================
// DESCARGAS
// ============================================

// GET /api/payments/:id/download-all - Descargar todos los comprobantes
router.get('/:id/download-all', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            document: {
              select: {
                fileUrl: true,
                fileName: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    // Crear archivo ZIP
    const archive = archiver('zip', { zlib: { level: 9 } });
    const zipFileName = `pago-${payment.number}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    archive.pipe(res);

    // Agregar recibo de pago si existe
    if (payment.receiptUrl) {
      const receiptPath = path.join(__dirname, '../..', payment.receiptUrl);
      if (fs.existsSync(receiptPath)) {
        archive.file(receiptPath, { name: `recibo-${payment.number}.pdf` });
      }
    }

    // Agregar facturas
    for (const item of payment.items) {
      if (item.document?.fileUrl) {
        const docPath = path.join(__dirname, '../..', item.document.fileUrl);
        if (fs.existsSync(docPath)) {
          archive.file(docPath, {
            name: `factura-${item.document.fileName || 'documento.pdf'}`,
          });
        }
      }
    }

    // Agregar retenciones
    const retentions = payment.retentionUrls as any[] || [];
    for (let i = 0; i < retentions.length; i++) {
      const ret = retentions[i];
      if (ret.fileUrl) {
        const retPath = path.join(__dirname, '../..', ret.fileUrl);
        if (fs.existsSync(retPath)) {
          archive.file(retPath, {
            name: `retencion-${ret.type || i + 1}-${ret.number || 'doc'}.pdf`,
          });
        }
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Error al descargar comprobantes:', error);
    res.status(500).json({ error: 'Error al descargar comprobantes' });
  }
});

// ============================================
// ADMINISTRACIÓN (para el cliente que emite pagos)
// ============================================

// POST /api/payments - Crear nuevo pago
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      issuedByTenantId,
      receivedByTenantId,
      amount,
      currency,
      issueDate,
      scheduledDate,
      documentIds,
      receiptUrl,
      retentionUrls,
    } = req.body;

    if (!issuedByTenantId || !receivedByTenantId || !amount) {
      return res.status(400).json({
        error: 'issuedByTenantId, receivedByTenantId y amount son requeridos',
      });
    }

    // Generar número de pago
    const lastPayment = await prisma.payment.findFirst({
      where: { issuedByTenantId },
      orderBy: { createdAt: 'desc' },
    });

    const year = new Date().getFullYear();
    let sequence = 1;
    if (lastPayment?.number) {
      const match = lastPayment.number.match(/PAG-\d{4}-(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }
    const number = `PAG-${year}-${sequence.toString().padStart(5, '0')}`;

    // Crear pago
    const payment = await prisma.payment.create({
      data: {
        number,
        amount,
        currency: currency || 'ARS',
        status: scheduledDate ? 'SCHEDULED' : 'PROCESSING',
        issuedByTenantId,
        receivedByTenantId,
        issueDate: new Date(issueDate || Date.now()),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        receiptUrl,
        retentionUrls: retentionUrls || [],
        items: {
          create: (documentIds || []).map((docId: string, index: number) => ({
            documentId: docId,
            amount: 0, // Se actualizará después
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Actualizar montos de items basado en documentos
    if (documentIds?.length > 0) {
      for (const item of payment.items) {
        const doc = await prisma.document.findUnique({
          where: { id: item.documentId },
        });
        if (doc) {
          await prisma.paymentItem.update({
            where: { id: item.id },
            data: { amount: doc.totalAmount },
          });

          // Actualizar estado del documento
          await prisma.document.update({
            where: { id: item.documentId },
            data: { status: 'PAID' },
          });
        }
      }
    }

    res.status(201).json({ payment });
  } catch (error) {
    console.error('Error al crear pago:', error);
    res.status(500).json({ error: 'Error al crear pago' });
  }
});

// PUT /api/payments/:id - Actualizar pago
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paidAt, receiptUrl, retentionUrls } = req.body;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paidAt && { paidAt: new Date(paidAt) }),
        ...(receiptUrl !== undefined && { receiptUrl }),
        ...(retentionUrls !== undefined && { retentionUrls }),
      },
    });

    res.json({ payment });
  } catch (error) {
    console.error('Error al actualizar pago:', error);
    res.status(500).json({ error: 'Error al actualizar pago' });
  }
});

// POST /api/payments/:id/mark-paid - Marcar como pagado
router.post('/:id/mark-paid', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Actualizar documentos asociados
    await prisma.paymentItem.findMany({
      where: { paymentId: id },
    }).then(async (items) => {
      for (const item of items) {
        await prisma.document.update({
          where: { id: item.documentId },
          data: { status: 'PAID' },
        });
      }
    });

    res.json({ payment, message: 'Pago marcado como pagado' });
  } catch (error) {
    console.error('Error al marcar pago:', error);
    res.status(500).json({ error: 'Error al marcar pago' });
  }
});

// ============================================
// RETENCIONES
// ============================================

// POST /api/payments/:id/retentions - Agregar retención
router.post('/:id/retentions', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, number, amount, fileUrl } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const currentRetentions = (payment.retentionUrls as any[]) || [];
    const newRetention = {
      type,
      number,
      amount,
      fileUrl,
      createdAt: new Date().toISOString(),
    };

    await prisma.payment.update({
      where: { id },
      data: {
        retentionUrls: [...currentRetentions, newRetention],
      },
    });

    res.json({ retention: newRetention, message: 'Retención agregada' });
  } catch (error) {
    console.error('Error al agregar retención:', error);
    res.status(500).json({ error: 'Error al agregar retención' });
  }
});

export default router;
