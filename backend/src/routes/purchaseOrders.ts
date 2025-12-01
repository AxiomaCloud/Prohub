import { Router, Request, Response } from 'express';
import { PrismaClient, PurchaseOrderCircuitStatus, PurchaseRequestStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Generar número de OC
async function generateOCNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OC-${year}-`;

  const lastOC = await prisma.purchaseOrderCircuit.findFirst({
    where: {
      tenantId,
      numero: { startsWith: prefix },
    },
    orderBy: { numero: 'desc' },
  });

  let nextNumber = 1;
  if (lastOC) {
    const lastNum = parseInt(lastOC.numero.replace(prefix, ''));
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// GET /api/purchase-orders - Listar órdenes de compra del tenant
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    const ordenesCompra = await prisma.purchaseOrderCircuit.findMany({
      where: { tenantId },
      include: {
        purchaseRequest: {
          include: {
            solicitante: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        proveedor: true,
        items: true,
        recepciones: {
          include: {
            itemsRecibidos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mapear a formato esperado por el frontend
    const ordenesFormateadas = ordenesCompra.map((oc) => ({
      id: oc.id,
      numero: oc.numero,
      requerimientoId: oc.purchaseRequestId,
      requerimiento: oc.purchaseRequest
        ? {
            id: oc.purchaseRequest.id,
            numero: oc.purchaseRequest.numero,
            titulo: oc.purchaseRequest.titulo,
          }
        : null,
      proveedorId: oc.proveedorId,
      proveedor: {
        id: oc.proveedor.id,
        nombre: oc.proveedor.nombre,
        cuit: oc.proveedor.cuit,
        direccion: oc.proveedor.direccion,
        telefono: oc.proveedor.telefono,
        email: oc.proveedor.email,
        contacto: oc.proveedor.contacto,
      },
      estado: oc.estado,
      subtotal: parseFloat(oc.subtotal.toString()),
      impuestos: parseFloat(oc.impuestos.toString()),
      total: parseFloat(oc.total.toString()),
      moneda: oc.moneda,
      condicionPago: oc.condicionPago,
      lugarEntrega: oc.lugarEntrega,
      observaciones: oc.observaciones,
      fechaEmision: oc.fechaEmision,
      fechaEntregaEstimada: oc.fechaEntregaEstimada,
      creadoPorId: oc.creadoPorId,
      items: oc.items.map((item) => ({
        id: item.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        cantidadRecibida: item.cantidadRecibida,
        unidad: item.unidad,
        precioUnitario: parseFloat(item.precioUnitario.toString()),
        total: parseFloat(item.total.toString()),
      })),
      recepciones: oc.recepciones.map((rec) => ({
        id: rec.id,
        numero: rec.numero,
        fechaRecepcion: rec.fechaRecepcion,
        tipoRecepcion: rec.tipoRecepcion,
        observaciones: rec.observaciones,
        itemsRecibidos: rec.itemsRecibidos.map((ir) => ({
          id: ir.id,
          itemOCId: ir.purchaseOrderItemId,
          descripcion: ir.descripcion,
          unidad: ir.unidad,
          cantidadEsperada: ir.cantidadEsperada,
          cantidadRecibida: ir.cantidadRecibida,
          cantidadPendiente: ir.cantidadPendiente,
        })),
      })),
    }));

    res.json({ ordenesCompra: ordenesFormateadas });
  } catch (error) {
    console.error('Error al listar órdenes de compra:', error);
    res.status(500).json({ error: 'Error al listar órdenes de compra' });
  }
});

// GET /api/purchase-orders/:id - Obtener OC por ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const oc = await prisma.purchaseOrderCircuit.findUnique({
      where: { id },
      include: {
        purchaseRequest: {
          include: {
            solicitante: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        proveedor: true,
        items: true,
        recepciones: {
          include: {
            itemsRecibidos: true,
          },
        },
      },
    });

    if (!oc) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    res.json({ ordenCompra: oc });
  } catch (error) {
    console.error('Error al obtener OC:', error);
    res.status(500).json({ error: 'Error al obtener orden de compra' });
  }
});

// POST /api/purchase-orders - Crear orden de compra
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      purchaseRequestId,
      proveedorId,
      items,
      subtotal,
      impuestos,
      total,
      moneda,
      condicionPago,
      lugarEntrega,
      fechaEntregaEstimada,
      observaciones,
    } = req.body;

    if (!tenantId || !purchaseRequestId || !proveedorId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'tenantId, purchaseRequestId, proveedorId e items son requeridos',
      });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar que el proveedor existe en la tabla local (debe estar sincronizado)
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: proveedorId,
        tenantId,
      },
    });

    if (!supplier) {
      return res.status(400).json({
        error: 'Proveedor no encontrado. Ejecute la sincronización de proveedores primero.',
      });
    }

    // Verificar que el requerimiento existe y está aprobado
    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
    });

    if (!purchaseRequest) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    if (purchaseRequest.estado !== 'APROBADO') {
      return res.status(400).json({ error: 'El requerimiento debe estar aprobado' });
    }

    // Verificar que no existe ya una OC para este requerimiento
    const existingOC = await prisma.purchaseOrderCircuit.findUnique({
      where: { purchaseRequestId },
    });

    if (existingOC) {
      return res.status(400).json({ error: 'Ya existe una orden de compra para este requerimiento' });
    }

    // Generar número de OC
    const numero = await generateOCNumber(tenantId);

    // Crear OC con items en una transacción
    const ordenCompra = await prisma.$transaction(async (tx) => {
      // Crear la OC
      const oc = await tx.purchaseOrderCircuit.create({
        data: {
          numero,
          purchaseRequestId,
          proveedorId: supplier.id,
          estado: 'APROBADA', // Por defecto aprobada al crearla
          subtotal,
          impuestos: impuestos || 0,
          total,
          moneda: moneda || 'ARS',
          condicionPago,
          lugarEntrega,
          observaciones,
          fechaEntregaEstimada: fechaEntregaEstimada ? new Date(fechaEntregaEstimada) : null,
          tenantId,
          creadoPorId: userId,
        },
      });

      // Crear items
      await tx.purchaseOrderItem.createMany({
        data: items.map((item: any) => ({
          purchaseOrderId: oc.id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          unidad: item.unidad || 'Unidad',
          precioUnitario: item.precioUnitario,
          total: item.total || item.cantidad * item.precioUnitario,
        })),
      });

      // Actualizar estado del requerimiento
      await tx.purchaseRequest.update({
        where: { id: purchaseRequestId },
        data: { estado: 'OC_GENERADA' },
      });

      return oc;
    });

    // Obtener la OC completa con relaciones
    const ocCompleta = await prisma.purchaseOrderCircuit.findUnique({
      where: { id: ordenCompra.id },
      include: {
        purchaseRequest: true,
        proveedor: true,
        items: true,
      },
    });

    console.log(`✅ OC ${numero} creada para requerimiento ${purchaseRequest.numero}`);

    res.status(201).json({ ordenCompra: ocCompleta });
  } catch (error) {
    console.error('Error al crear OC:', error);
    res.status(500).json({ error: 'Error al crear orden de compra' });
  }
});

// PUT /api/purchase-orders/:id - Actualizar OC
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado, condicionPago, lugarEntrega, observaciones, fechaEntregaEstimada } = req.body;

    const oc = await prisma.purchaseOrderCircuit.update({
      where: { id },
      data: {
        ...(estado && { estado: estado as PurchaseOrderCircuitStatus }),
        ...(condicionPago !== undefined && { condicionPago }),
        ...(lugarEntrega !== undefined && { lugarEntrega }),
        ...(observaciones !== undefined && { observaciones }),
        ...(fechaEntregaEstimada && { fechaEntregaEstimada: new Date(fechaEntregaEstimada) }),
      },
      include: {
        proveedor: true,
        items: true,
      },
    });

    res.json({ ordenCompra: oc });
  } catch (error) {
    console.error('Error al actualizar OC:', error);
    res.status(500).json({ error: 'Error al actualizar orden de compra' });
  }
});

// PUT /api/purchase-orders/:id/approve - Aprobar OC
router.put('/:id/approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comentario } = req.body;
    const userId = (req as any).user?.id;

    const oc = await prisma.purchaseOrderCircuit.update({
      where: { id },
      data: {
        estado: 'APROBADA',
        aprobadorOCId: userId,
        fechaAprobacionOC: new Date(),
        comentarioAprobacionOC: comentario,
      },
    });

    res.json({ ordenCompra: oc });
  } catch (error) {
    console.error('Error al aprobar OC:', error);
    res.status(500).json({ error: 'Error al aprobar orden de compra' });
  }
});

// DELETE /api/purchase-orders/:id - Cancelar OC
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que la OC existe
    const oc = await prisma.purchaseOrderCircuit.findUnique({
      where: { id },
    });

    if (!oc) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    // No se puede cancelar si ya tiene recepciones
    const recepciones = await prisma.reception.count({
      where: { purchaseOrderId: id },
    });

    if (recepciones > 0) {
      return res.status(400).json({ error: 'No se puede cancelar una OC con recepciones' });
    }

    await prisma.$transaction(async (tx) => {
      // Eliminar items
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });

      // Eliminar OC
      await tx.purchaseOrderCircuit.delete({
        where: { id },
      });

      // Volver el requerimiento a APROBADO
      await tx.purchaseRequest.update({
        where: { id: oc.purchaseRequestId },
        data: { estado: 'APROBADO' },
      });
    });

    res.json({ message: 'Orden de compra cancelada' });
  } catch (error) {
    console.error('Error al cancelar OC:', error);
    res.status(500).json({ error: 'Error al cancelar orden de compra' });
  }
});

export default router;
