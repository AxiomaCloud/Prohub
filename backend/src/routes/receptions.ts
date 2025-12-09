import { Router, Request, Response } from 'express';
import { PrismaClient, PurchaseOrderCircuitStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Generar número de recepción
async function generateReceptionNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REC-${year}-`;

  const lastRec = await prisma.reception.findFirst({
    where: {
      tenantId,
      numero: { startsWith: prefix },
    },
    orderBy: { numero: 'desc' },
  });

  let nextNumber = 1;
  if (lastRec) {
    const lastNum = parseInt(lastRec.numero.replace(prefix, ''));
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// GET /api/receptions - Listar recepciones del tenant
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    const recepciones = await prisma.reception.findMany({
      where: { tenantId },
      include: {
        purchaseOrder: {
          include: {
            proveedor: true,
            purchaseRequest: true,
          },
        },
        itemsRecibidos: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mapear a formato del frontend
    const recepcionesFormateadas = recepciones.map((rec) => ({
      id: rec.id,
      numero: rec.numero,
      ordenCompraId: rec.purchaseOrderId,
      ordenCompra: {
        id: rec.purchaseOrder.id,
        numero: rec.purchaseOrder.numero,
      },
      requerimientoId: rec.purchaseOrder.purchaseRequestId,
      receptorId: rec.receptorId,
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
    }));

    res.json({ recepciones: recepcionesFormateadas });
  } catch (error) {
    console.error('Error al listar recepciones:', error);
    res.status(500).json({ error: 'Error al listar recepciones' });
  }
});

// GET /api/receptions/:id - Obtener recepción por ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recepcion = await prisma.reception.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            proveedor: true,
            items: true,
          },
        },
        itemsRecibidos: true,
      },
    });

    if (!recepcion) {
      return res.status(404).json({ error: 'Recepción no encontrada' });
    }

    res.json({ recepcion });
  } catch (error) {
    console.error('Error al obtener recepción:', error);
    res.status(500).json({ error: 'Error al obtener recepción' });
  }
});

// POST /api/receptions - Registrar recepción
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId, purchaseOrderId, itemsRecibidos, observaciones, fechaRecepcion } = req.body;

    if (!tenantId || !purchaseOrderId || !itemsRecibidos || itemsRecibidos.length === 0) {
      return res.status(400).json({
        error: 'tenantId, purchaseOrderId e itemsRecibidos son requeridos',
      });
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener la OC con sus items
    const oc = await prisma.purchaseOrderCircuit.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!oc) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    // Verificar que la OC está en un estado que permite recepción
    const estadosValidos: PurchaseOrderCircuitStatus[] = [
      'APROBADA',
      'EN_PROCESO',
      'PARCIALMENTE_RECIBIDA',
    ];
    if (!estadosValidos.includes(oc.estado)) {
      return res.status(400).json({ error: 'La OC no está en un estado que permita recepción' });
    }

    // Generar número
    const numero = await generateReceptionNumber(tenantId);

    // Determinar tipo de recepción
    let todosRecibidos = true;
    let algunoRecibido = false;

    for (const item of oc.items) {
      const itemRecibido = itemsRecibidos.find((ir: any) => ir.itemOCId === item.id);
      const cantidadRecibidaAhora = Number(itemRecibido?.cantidadRecibida || 0);
      const cantidadRecibidaPrevia = Number(item.cantidadRecibida);
      const cantidadTotalRecibida = cantidadRecibidaPrevia + cantidadRecibidaAhora;
      const cantidadRequerida = Number(item.cantidad);

      if (cantidadRecibidaAhora > 0) {
        algunoRecibido = true;
      }

      if (cantidadTotalRecibida < cantidadRequerida) {
        todosRecibidos = false;
      }
    }

    const tipoRecepcion = todosRecibidos ? 'TOTAL' : 'PARCIAL';

    // Crear recepción en una transacción
    const recepcion = await prisma.$transaction(async (tx) => {
      // Crear la recepción
      const rec = await tx.reception.create({
        data: {
          numero,
          purchaseOrderId,
          receptorId: userId,
          tenantId,
          tipoRecepcion,
          observaciones,
          fechaRecepcion: fechaRecepcion ? new Date(fechaRecepcion) : new Date(),
        },
      });

      // Crear items recibidos y actualizar cantidades en OC
      for (const itemRec of itemsRecibidos) {
        if (itemRec.cantidadRecibida > 0) {
          const ocItem = oc.items.find((i) => i.id === itemRec.itemOCId);
          if (!ocItem) continue;

          // Crear item de recepción
          await tx.receptionItem.create({
            data: {
              receptionId: rec.id,
              purchaseOrderItemId: itemRec.itemOCId,
              descripcion: ocItem.descripcion,
              unidad: ocItem.unidad,
              cantidadEsperada: ocItem.cantidad,
              cantidadRecibida: itemRec.cantidadRecibida,
              cantidadPendiente: Math.max(
                0,
                Number(ocItem.cantidad) - Number(ocItem.cantidadRecibida) - itemRec.cantidadRecibida
              ),
            },
          });

          // Actualizar cantidad recibida en el item de OC
          await tx.purchaseOrderItem.update({
            where: { id: itemRec.itemOCId },
            data: {
              cantidadRecibida: ocItem.cantidadRecibida + itemRec.cantidadRecibida,
            },
          });
        }
      }

      // Determinar nuevo estado de la OC
      let nuevoEstadoOC: PurchaseOrderCircuitStatus;
      if (todosRecibidos) {
        nuevoEstadoOC = 'FINALIZADA';
      } else if (algunoRecibido) {
        nuevoEstadoOC = 'PARCIALMENTE_RECIBIDA';
      } else {
        nuevoEstadoOC = oc.estado; // Sin cambios
      }

      // Actualizar estado de la OC
      await tx.purchaseOrderCircuit.update({
        where: { id: purchaseOrderId },
        data: { estado: nuevoEstadoOC },
      });

      // Si la OC está finalizada, actualizar el requerimiento
      if (nuevoEstadoOC === 'FINALIZADA') {
        await tx.purchaseRequest.update({
          where: { id: oc.purchaseRequestId },
          data: { estado: 'RECIBIDO' },
        });
      }

      return rec;
    });

    // Obtener recepción completa
    const recepcionCompleta = await prisma.reception.findUnique({
      where: { id: recepcion.id },
      include: {
        purchaseOrder: {
          include: {
            proveedor: true,
          },
        },
        itemsRecibidos: true,
      },
    });

    console.log(
      `✅ Recepción ${numero} registrada para OC ${oc.numero} - Tipo: ${tipoRecepcion}`
    );

    res.status(201).json({ recepcion: recepcionCompleta });
  } catch (error) {
    console.error('Error al registrar recepción:', error);
    res.status(500).json({ error: 'Error al registrar recepción' });
  }
});

// DELETE /api/receptions/:id - Anular recepción
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recepcion = await prisma.reception.findUnique({
      where: { id },
      include: {
        itemsRecibidos: true,
        purchaseOrder: true,
      },
    });

    if (!recepcion) {
      return res.status(404).json({ error: 'Recepción no encontrada' });
    }

    await prisma.$transaction(async (tx) => {
      // Restar cantidades recibidas de los items de OC
      for (const item of recepcion.itemsRecibidos) {
        await tx.purchaseOrderItem.update({
          where: { id: item.purchaseOrderItemId },
          data: {
            cantidadRecibida: {
              decrement: item.cantidadRecibida,
            },
          },
        });
      }

      // Eliminar items de recepción
      await tx.receptionItem.deleteMany({
        where: { receptionId: id },
      });

      // Eliminar recepción
      await tx.reception.delete({
        where: { id },
      });

      // Recalcular estado de la OC
      const oc = await tx.purchaseOrderCircuit.findUnique({
        where: { id: recepcion.purchaseOrderId },
        include: { items: true },
      });

      if (oc) {
        // Convertir Decimals a números para comparación correcta
        const todosRecibidos = oc.items.every((i) => Number(i.cantidadRecibida) >= Number(i.cantidad));
        const algunoRecibido = oc.items.some((i) => Number(i.cantidadRecibida) > 0);

        let nuevoEstado: PurchaseOrderCircuitStatus;
        if (todosRecibidos) {
          nuevoEstado = 'FINALIZADA';
        } else if (algunoRecibido) {
          nuevoEstado = 'PARCIALMENTE_RECIBIDA';
        } else {
          nuevoEstado = 'APROBADA';
        }

        await tx.purchaseOrderCircuit.update({
          where: { id: oc.id },
          data: { estado: nuevoEstado },
        });

        // Actualizar estado del requerimiento
        if (nuevoEstado === 'FINALIZADA') {
          await tx.purchaseRequest.update({
            where: { id: oc.purchaseRequestId },
            data: { estado: 'RECIBIDO' },
          });
        } else {
          await tx.purchaseRequest.update({
            where: { id: oc.purchaseRequestId },
            data: { estado: 'OC_GENERADA' },
          });
        }
      }
    });

    res.json({ message: 'Recepción anulada' });
  } catch (error) {
    console.error('Error al anular recepción:', error);
    res.status(500).json({ error: 'Error al anular recepción' });
  }
});

export default router;
