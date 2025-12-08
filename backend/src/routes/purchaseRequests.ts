import { Router, Request, Response } from 'express';
import { PrismaClient, PurchaseRequestPriority, PurchaseType } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { ApprovalWorkflowService } from '../services/approvalWorkflowService';
import { NotificationService } from '../services/notificationService';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/purchase-requests
 * Obtiene los requerimientos de compra del tenant actual
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const userId = req.user?.id;
    const estado = req.query.estado as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    // Verificar que el usuario pertenece al tenant o es superuser
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantMemberships: {
          where: { tenantId }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Permitir acceso a superusers o miembros del tenant
    if (!user.superuser && user.tenantMemberships.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a este tenant' });
    }

    // Construir filtro
    const where: any = { tenantId };

    // Filtrar por estado si se especifica
    if (estado && estado !== 'TODOS') {
      where.estado = estado;
    }

    // Obtener roles del usuario
    const roles = user.superuser
      ? ['PURCHASE_ADMIN']
      : (user.tenantMemberships[0]?.roles || []);

    // Si no es admin ni aprobador, solo ver sus propios requerimientos
    const isAdmin = roles.includes('PURCHASE_ADMIN') || roles.includes('CLIENT_ADMIN') || roles.includes('SUPER_ADMIN');
    const isApprover = roles.includes('PURCHASE_APPROVER');

    if (!isAdmin && !isApprover) {
      where.solicitanteId = userId;
    }

    const requerimientos = await prisma.purchaseRequest.findMany({
      where,
      include: {
        items: true,
        adjuntos: true,
        solicitante: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        ordenesCompra: {
          select: {
            id: true,
            numero: true,
            estado: true,
          }
        },
        quotationRequests: {
          select: {
            id: true,
            number: true,
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Mapear a formato esperado por el frontend
    const mappedRequerimientos = requerimientos.map(req => ({
      id: req.id,
      numero: req.numero,
      titulo: req.titulo,
      descripcion: req.descripcion || '',
      justificacion: req.justificacion || '',
      estado: mapEstadoToFrontend(req.estado),
      prioridad: req.prioridad.toLowerCase(),
      categoria: req.categoria,
      centroCostos: req.centroCostos || '',
      montoEstimado: req.montoEstimado ? Number(req.montoEstimado) : null,
      moneda: req.currency,
      fechaCreacion: req.createdAt,
      fechaActualizacion: req.updatedAt,
      fechaNecesaria: req.fechaNecesidad,
      fechaNecesidad: req.fechaNecesidad,
      solicitanteId: req.solicitanteId,
      solicitante: {
        id: req.solicitante.id,
        nombre: req.solicitante.name,
        email: req.solicitante.email,
        rol: 'SOLICITANTE',
        departamento: 'General'
      },
      items: req.items.map(item => ({
        id: item.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidadMedida || 'unidad',
        unidadMedida: item.unidadMedida || 'unidad',
        precioUnitario: item.precioEstimado ? Number(item.precioEstimado) : 0,
        precioEstimado: item.precioEstimado ? Number(item.precioEstimado) : 0,
        total: (Number(item.cantidad) || 1) * (item.precioEstimado ? Number(item.precioEstimado) : 0),
        especificaciones: item.especificaciones ? JSON.parse(item.especificaciones) : []
      })),
      adjuntos: req.adjuntos?.map(adj => ({
        id: adj.id,
        nombre: adj.nombre,
        tipo: adj.tipo,
        tamanio: adj.tamanio,
        url: adj.url,
        esEspecificacion: adj.esEspecificacion,
        estado: adj.estado,
        fechaSubida: adj.createdAt
      })) || [],
      requiereAprobacionEspecificaciones: req.requiresSpecApproval || false,
      especificacionesAprobadas: req.specsApproved || false,
      creadoPorIA: req.creadoPorIA,
      promptOriginal: req.promptOriginal,
      // Info de OC y RFQ asociadas
      ordenesCompra: req.ordenesCompra || [],
      quotationRequests: req.quotationRequests || [],
      tieneOC: req.ordenesCompra && req.ordenesCompra.length > 0,
      tieneRFQ: req.quotationRequests && req.quotationRequests.length > 0,
    }));

    res.json({
      requerimientos: mappedRequerimientos,
      total: mappedRequerimientos.length
    });

  } catch (error) {
    console.error('Error obteniendo requerimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/purchase-requests/:id
 * Obtiene un requerimiento específico
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    const requerimiento = await prisma.purchaseRequest.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        items: true,
        adjuntos: true,
        solicitante: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!requerimiento) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    res.json({
      id: requerimiento.id,
      numero: requerimiento.numero,
      titulo: requerimiento.titulo,
      descripcion: requerimiento.descripcion || '',
      justificacion: requerimiento.justificacion || '',
      estado: mapEstadoToFrontend(requerimiento.estado),
      prioridad: requerimiento.prioridad.toLowerCase(),
      categoria: requerimiento.categoria,
      centroCostos: requerimiento.centroCostos || '',
      montoEstimado: requerimiento.montoEstimado ? Number(requerimiento.montoEstimado) : null,
      moneda: requerimiento.currency,
      fechaCreacion: requerimiento.createdAt,
      fechaActualizacion: requerimiento.updatedAt,
      fechaNecesaria: requerimiento.fechaNecesidad,
      fechaNecesidad: requerimiento.fechaNecesidad,
      solicitanteId: requerimiento.solicitanteId,
      solicitante: {
        id: requerimiento.solicitante.id,
        nombre: requerimiento.solicitante.name,
        email: requerimiento.solicitante.email,
        rol: 'SOLICITANTE',
        departamento: 'General'
      },
      items: requerimiento.items.map(item => ({
        id: item.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidadMedida || 'unidad',
        unidadMedida: item.unidadMedida || 'unidad',
        precioUnitario: item.precioEstimado ? Number(item.precioEstimado) : 0,
        precioEstimado: item.precioEstimado ? Number(item.precioEstimado) : null,
        total: (Number(item.cantidad) || 1) * (item.precioEstimado ? Number(item.precioEstimado) : 0),
        especificaciones: item.especificaciones ? JSON.parse(item.especificaciones) : []
      })),
      adjuntos: requerimiento.adjuntos?.map(adj => ({
        id: adj.id,
        nombre: adj.nombre,
        tipo: adj.tipo,
        tamanio: adj.tamanio,
        url: adj.url,
        esEspecificacion: adj.esEspecificacion,
        estado: adj.estado,
        fechaSubida: adj.createdAt
      })) || [],
      requiereAprobacionEspecificaciones: requerimiento.requiresSpecApproval || false,
      especificacionesAprobadas: requerimiento.specsApproved || false,
      creadoPorIA: requerimiento.creadoPorIA,
      promptOriginal: requerimiento.promptOriginal
    });

  } catch (error) {
    console.error('Error obteniendo requerimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/purchase-requests
 * Crea un nuevo requerimiento de compra
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      tenantId,
      titulo,
      descripcion,
      justificacion,
      items,
      categoria,
      centroCostos,
      prioridad,
      montoEstimado,
      fechaNecesidad,
      fechaNecesaria,
      estado,
    } = req.body;

    if (!tenantId || !titulo || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: tenantId, titulo, items'
      });
    }

    // Generar número de requerimiento
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;

    const ultimo = await prisma.purchaseRequest.findFirst({
      where: {
        tenantId,
        numero: { startsWith: prefix }
      },
      orderBy: { numero: 'desc' }
    });

    let nextNumber = 1;
    if (ultimo) {
      const parts = ultimo.numero.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      nextNumber = lastNum + 1;
    }

    const numero = `${prefix}${nextNumber.toString().padStart(5, '0')}`;

    // Calcular monto estimado desde los items si no viene
    let montoFinal = montoEstimado;
    if (!montoFinal && items) {
      montoFinal = items.reduce((sum: number, item: any) => {
        const cantidad = item.cantidad || 1;
        const precio = item.precioEstimado || item.precioUnitario || 0;
        return sum + (cantidad * precio);
      }, 0);
    }

    // Determinar estado inicial
    const estadoInicial = estado === 'PENDIENTE_APROBACION' ? 'PENDIENTE_APROBACION' : 'BORRADOR';

    const requerimiento = await prisma.purchaseRequest.create({
      data: {
        numero,
        titulo,
        descripcion: descripcion || '',
        justificacion: justificacion || '',
        centroCostos: centroCostos || null,
        estado: estadoInicial,
        prioridad: mapPrioridadToBackend(prioridad),
        categoria: categoria || 'Otros',
        montoEstimado: montoFinal ? parseFloat(montoFinal.toString()) : null,
        currency: 'ARS',
        tenantId,
        solicitanteId: userId!,
        fechaNecesidad: (fechaNecesaria || fechaNecesidad) ? new Date(fechaNecesaria || fechaNecesidad) : null,
        items: {
          create: items.map((item: any) => ({
            descripcion: item.descripcion,
            cantidad: item.cantidad || 1,
            unidadMedida: item.unidadMedida || item.unidad || 'unidad',
            precioEstimado: (item.precioEstimado || item.precioUnitario) ? parseFloat((item.precioEstimado || item.precioUnitario).toString()) : null,
            especificaciones: item.especificaciones
              ? JSON.stringify(item.especificaciones)
              : null
          }))
        }
      },
      include: {
        items: true,
        solicitante: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    res.status(201).json({
      id: requerimiento.id,
      numero: requerimiento.numero,
      titulo: requerimiento.titulo,
      estado: mapEstadoToFrontend(requerimiento.estado),
      message: `Requerimiento ${requerimiento.numero} creado exitosamente`
    });

  } catch (error) {
    console.error('Error creando requerimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/purchase-requests/:id
 * Actualiza un requerimiento de compra
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      titulo,
      descripcion,
      justificacion,
      categoria,
      centroCostos,
      prioridad,
      montoEstimado,
      fechaNecesidad,
      estado,
      comentarioAprobador,
      items,
      adjuntos,
      requiresSpecApproval
    } = req.body;

    console.log('📝 [PUT] Actualizando requerimiento:', id);
    console.log('📝 [PUT] Datos recibidos:', JSON.stringify(req.body, null, 2));

    // Preparar datos para actualizar
    const updateData: any = {
      updatedAt: new Date()
    };

    // Solo actualizar campos que vienen en el body
    if (titulo !== undefined) updateData.titulo = titulo;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (justificacion !== undefined) updateData.justificacion = justificacion;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (centroCostos !== undefined) updateData.centroCostos = centroCostos;
    if (prioridad !== undefined) updateData.prioridad = mapPrioridadToBackend(prioridad);
    if (montoEstimado !== undefined) updateData.montoEstimado = montoEstimado ? parseFloat(montoEstimado.toString()) : null;
    if (fechaNecesidad !== undefined) updateData.fechaNecesidad = fechaNecesidad ? new Date(fechaNecesidad) : null;
    if (estado !== undefined) updateData.estado = mapEstadoToBackend(estado);
    if (comentarioAprobador !== undefined) updateData.comentarioAprobador = comentarioAprobador;
    if (requiresSpecApproval !== undefined) updateData.requiresSpecApproval = requiresSpecApproval;

    // Si vienen items, eliminar los existentes y crear los nuevos
    if (items && Array.isArray(items)) {
      // Eliminar items existentes
      await prisma.purchaseRequestItem.deleteMany({
        where: { purchaseRequestId: id }
      });

      // Crear nuevos items
      updateData.items = {
        create: items.map((item: any) => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad || 1,
          unidadMedida: item.unidadMedida || item.unidad || 'unidad',
          precioEstimado: item.precioEstimado || item.precioUnitario
            ? parseFloat((item.precioEstimado || item.precioUnitario).toString())
            : null,
          especificaciones: item.especificaciones
            ? JSON.stringify(item.especificaciones)
            : null
        }))
      };
    }

    // Si vienen adjuntos, eliminar los existentes y crear los nuevos
    if (adjuntos && Array.isArray(adjuntos)) {
      // Eliminar adjuntos existentes
      await prisma.purchaseRequestAttachment.deleteMany({
        where: { purchaseRequestId: id }
      });

      // Crear nuevos adjuntos
      if (adjuntos.length > 0) {
        updateData.adjuntos = {
          create: adjuntos.map((adj: any) => ({
            nombre: adj.nombre,
            tipo: adj.tipo,
            tamanio: adj.tamanio || 0,
            url: adj.url || `/uploads/${adj.nombre}`,
            esEspecificacion: adj.esEspecificacion || false,
            estado: adj.estado || 'PENDIENTE'
          }))
        };
      }
    }

    console.log('📝 [PUT] Datos a guardar:', JSON.stringify(updateData, null, 2));

    const requerimiento = await prisma.purchaseRequest.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        adjuntos: true,
        solicitante: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    console.log('✅ [PUT] Requerimiento actualizado:', requerimiento.id, requerimiento.titulo);

    res.json({
      id: requerimiento.id,
      numero: requerimiento.numero,
      titulo: requerimiento.titulo,
      estado: mapEstadoToFrontend(requerimiento.estado),
      message: 'Requerimiento actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando requerimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/purchase-requests/:id/submit
 * Envía un requerimiento a aprobación
 */
router.put('/:id/submit', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.body.tenantId || req.query.tenantId as string;

    // Obtener el requerimiento actual con adjuntos
    const currentReq = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        solicitante: { select: { name: true, email: true } },
        adjuntos: true,
      }
    });

    if (!currentReq) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    // Validar que si requiere aprobación de especificaciones, tenga adjuntos
    if (currentReq.requiresSpecApproval) {
      if (!currentReq.adjuntos || currentReq.adjuntos.length === 0) {
        return res.status(400).json({
          error: 'El requerimiento requiere aprobación de especificaciones pero no tiene documentos adjuntos',
          code: 'NO_ATTACHMENTS_FOR_SPECS'
        });
      }
    }

    // Actualizar estado a ENVIADO
    const requerimiento = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        estado: 'ENVIADO',
        fechaEnvio: new Date(),
        updatedAt: new Date()
      },
      include: {
        solicitante: { select: { id: true, name: true, email: true } }
      }
    });

    // Iniciar workflow de aprobación si hay tenant
    if (tenantId && req.user?.id) {
      try {
        const workflow = await ApprovalWorkflowService.startWorkflow(
          tenantId,
          'PURCHASE_REQUEST',
          id,
          requerimiento.montoEstimado || 0,
          (requerimiento.purchaseType as PurchaseType) || 'DIRECT',
          requerimiento.requiresSpecApproval || false,
          req.user.id
        );

        if (workflow) {
          console.log(`✅ Workflow ${workflow.id} iniciado para requerimiento ${requerimiento.numero}`);
        } else {
          // Si no hay regla aplicable, notificar que requiere configuración
          console.log(`⚠️ No se encontró regla de aprobación aplicable para ${requerimiento.numero}`);
        }

        // Notificar envío del requerimiento
        await NotificationService.notifyRequirementSubmitted(
          requerimiento as any,
          tenantId
        );
      } catch (workflowError) {
        console.error('Error iniciando workflow:', workflowError);
        // No fallar el submit si hay error en el workflow
      }
    }

    res.json({
      id: requerimiento.id,
      numero: requerimiento.numero,
      estado: mapEstadoToFrontend(requerimiento.estado),
      message: `Requerimiento ${requerimiento.numero} enviado a aprobación`
    });

  } catch (error) {
    console.error('Error enviando requerimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/purchase-requests/:id/approve
 * Aprueba un requerimiento
 */
router.put('/:id/approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { comentario, tenantId } = req.body;

    // Obtener el requerimiento actual con adjuntos para validaciones
    const currentReq = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        adjuntos: true,
      }
    });

    if (!currentReq) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    console.log(`📋 [APPROVE] Requerimiento ${currentReq.numero}:`, {
      requiresSpecApproval: currentReq.requiresSpecApproval,
      specsApproved: currentReq.specsApproved,
      adjuntosCount: currentReq.adjuntos?.length || 0,
    });

    // Validar si requiere aprobación de especificaciones
    if (currentReq.requiresSpecApproval) {
      // Debe tener al menos un adjunto
      if (!currentReq.adjuntos || currentReq.adjuntos.length === 0) {
        return res.status(400).json({
          error: 'El requerimiento requiere aprobación de especificaciones pero no tiene documentos adjuntos',
          code: 'NO_ATTACHMENTS'
        });
      }

      // Las especificaciones deben estar aprobadas
      if (!currentReq.specsApproved) {
        return res.status(400).json({
          error: 'Debe aprobar las especificaciones técnicas antes de aprobar el requerimiento',
          code: 'SPECS_NOT_APPROVED'
        });
      }
    }

    // Buscar si hay un workflow activo
    const activeWorkflow = await ApprovalWorkflowService.getActiveWorkflow('PURCHASE_REQUEST', id);

    if (activeWorkflow) {
      // Procesar la aprobación a través del workflow
      const result = await ApprovalWorkflowService.processDecision(
        activeWorkflow.id,
        userId!,
        'APPROVED',
        comentario
      );

      if (!result.success) {
        return res.status(400).json({ error: 'No tiene permiso para aprobar este requerimiento' });
      }

      // Si el workflow está completo, el estado ya se actualizó en el servicio
      const requerimiento = await prisma.purchaseRequest.findUnique({
        where: { id }
      });

      return res.json({
        id: requerimiento!.id,
        numero: requerimiento!.numero,
        estado: mapEstadoToFrontend(requerimiento!.estado),
        workflowComplete: result.workflowComplete,
        message: result.workflowComplete
          ? `Requerimiento ${requerimiento!.numero} aprobado`
          : `Aprobación registrada, pendiente de más aprobaciones`
      });
    }

    // Si no hay workflow, usar el flujo tradicional
    const requerimiento = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        estado: 'APROBADO',
        aprobadorId: userId,
        fechaAprobacion: new Date(),
        comentarioAprobador: comentario,
        updatedAt: new Date()
      },
      include: {
        solicitante: { select: { id: true, name: true, email: true } }
      }
    });

    // Obtener nombre del aprobador
    const approver = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    // Notificar aprobación
    if (tenantId) {
      await NotificationService.notifyRequirementApproved(
        requerimiento as any,
        approver?.name || 'Usuario',
        comentario,
        tenantId
      );
    }

    res.json({
      id: requerimiento.id,
      numero: requerimiento.numero,
      estado: mapEstadoToFrontend(requerimiento.estado),
      message: `Requerimiento ${requerimiento.numero} aprobado`
    });

  } catch (error) {
    console.error('Error aprobando requerimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/purchase-requests/:id/approve-specs
 * Aprueba las especificaciones técnicas de un requerimiento
 */
router.put('/:id/approve-specs', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    console.log(`[APPROVE-SPECS] Iniciando aprobación para requerimiento ${id}`);

    // Obtener el requerimiento con adjuntos para validar
    const currentReq = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        adjuntos: true,
      }
    });

    if (!currentReq) {
      console.log(`[APPROVE-SPECS] Requerimiento ${id} no encontrado`);
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    console.log(`[APPROVE-SPECS] Requerimiento encontrado: ${currentReq.numero}, adjuntos: ${currentReq.adjuntos?.length || 0}`);

    // Validar que tenga adjuntos
    if (!currentReq.adjuntos || currentReq.adjuntos.length === 0) {
      console.log(`[APPROVE-SPECS] Sin adjuntos - rechazando`);
      return res.status(400).json({
        error: 'El requerimiento no tiene documentos adjuntos',
        code: 'NO_ATTACHMENTS'
      });
    }

    // Marcar el requerimiento como que tiene especificaciones aprobadas
    console.log(`[APPROVE-SPECS] Actualizando specsApproved a true`);
    const requerimiento = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        specsApproved: true,
        updatedAt: new Date(),
      }
    });

    console.log(`✅ Especificaciones de ${requerimiento.numero} aprobadas por usuario ${userId}`);

    res.json({
      id: requerimiento.id,
      numero: requerimiento.numero,
      message: `Especificaciones de ${requerimiento.numero} aprobadas`,
      especificacionesAprobadas: true
    });

  } catch (error: any) {
    console.error('Error aprobando especificaciones:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

/**
 * PUT /api/purchase-requests/:id/reject-specs
 * Rechaza las especificaciones técnicas de un requerimiento
 */
router.put('/:id/reject-specs', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { comentario } = req.body;

    // Obtener el requerimiento
    const currentReq = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        adjuntos: true,
      }
    });

    if (!currentReq) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    // Validar que tenga adjuntos
    if (!currentReq.adjuntos || currentReq.adjuntos.length === 0) {
      return res.status(400).json({
        error: 'El requerimiento no tiene documentos adjuntos',
        code: 'NO_ATTACHMENTS'
      });
    }

    // Marcar el requerimiento como que tiene especificaciones rechazadas
    // y devolverlo a estado BORRADOR para que el usuario lo modifique
    const requerimiento = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        specsApproved: false,
        estado: 'BORRADOR',
        comentarioAprobador: comentario || 'Especificaciones rechazadas',
        updatedAt: new Date(),
      }
    });

    console.log(`❌ Especificaciones de ${requerimiento.numero} rechazadas por usuario ${userId}`);

    res.json({
      id: requerimiento.id,
      numero: requerimiento.numero,
      message: `Especificaciones de ${requerimiento.numero} rechazadas. El requerimiento fue devuelto a borrador.`,
      especificacionesAprobadas: false
    });

  } catch (error) {
    console.error('Error rechazando especificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /api/purchase-requests/:id/reject
 * Rechaza un requerimiento
 */
router.put('/:id/reject', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { comentario, tenantId } = req.body;

    // Buscar si hay un workflow activo
    const activeWorkflow = await ApprovalWorkflowService.getActiveWorkflow('PURCHASE_REQUEST', id);

    if (activeWorkflow) {
      // Procesar el rechazo a través del workflow
      const result = await ApprovalWorkflowService.processDecision(
        activeWorkflow.id,
        userId!,
        'REJECTED',
        comentario
      );

      if (!result.success) {
        return res.status(400).json({ error: 'No tiene permiso para rechazar este requerimiento' });
      }

      const requerimiento = await prisma.purchaseRequest.findUnique({
        where: { id }
      });

      return res.json({
        id: requerimiento!.id,
        numero: requerimiento!.numero,
        estado: mapEstadoToFrontend(requerimiento!.estado),
        message: `Requerimiento ${requerimiento!.numero} rechazado`
      });
    }

    // Si no hay workflow, usar el flujo tradicional
    const requerimiento = await prisma.purchaseRequest.update({
      where: { id },
      data: {
        estado: 'RECHAZADO',
        aprobadorId: userId,
        fechaAprobacion: new Date(),
        comentarioAprobador: comentario,
        updatedAt: new Date()
      },
      include: {
        solicitante: { select: { id: true, name: true, email: true } }
      }
    });

    // Obtener nombre del aprobador
    const approver = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    // Notificar rechazo
    if (tenantId) {
      await NotificationService.notifyRequirementRejected(
        requerimiento as any,
        approver?.name || 'Usuario',
        comentario || 'Sin motivo especificado',
        tenantId
      );
    }

    res.json({
      id: requerimiento.id,
      numero: requerimiento.numero,
      estado: mapEstadoToFrontend(requerimiento.estado),
      message: `Requerimiento ${requerimiento.numero} rechazado`
    });

  } catch (error) {
    console.error('Error rechazando requerimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Helpers para mapear estados entre frontend y backend

function mapEstadoToFrontend(estado: string): string {
  const map: Record<string, string> = {
    'BORRADOR': 'BORRADOR',
    'PENDIENTE_APROBACION': 'PENDIENTE_APROBACION',
    'ENVIADO': 'PENDIENTE_APROBACION',
    'EN_REVISION': 'PENDIENTE_APROBACION',
    'APROBADO': 'APROBADO',
    'RECHAZADO': 'RECHAZADO',
    'CANCELADO': 'RECHAZADO',
    'OC_GENERADA': 'OC_GENERADA',
    'RECIBIDO': 'RECIBIDO'
  };
  return map[estado] || estado;
}

function mapEstadoToBackend(estado: string): string {
  const map: Record<string, string> = {
    'BORRADOR': 'BORRADOR',
    'PENDIENTE_APROBACION': 'PENDIENTE_APROBACION',
    'ENVIADO': 'ENVIADO',
    'EN_REVISION': 'EN_REVISION',
    'APROBADO': 'APROBADO',
    'RECHAZADO': 'RECHAZADO',
    'OC_GENERADA': 'OC_GENERADA',
    'RECIBIDO': 'RECIBIDO',
    'CANCELADO': 'CANCELADO'
  };
  return map[estado] || estado;
}

function mapPrioridadToBackend(prioridad?: string): PurchaseRequestPriority {
  const map: Record<string, PurchaseRequestPriority> = {
    'baja': 'BAJA',
    'normal': 'NORMAL',
    'alta': 'ALTA',
    'urgente': 'URGENTE'
  };
  return map[prioridad?.toLowerCase() || 'normal'] || 'NORMAL';
}

export default router;
