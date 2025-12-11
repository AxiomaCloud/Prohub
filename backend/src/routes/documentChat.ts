import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import { DocumentChatType, CommunicationChannel, ConversationStatus } from '@prisma/client';

// Función auxiliar para obtener membresías del usuario
async function getUserMemberships(userId: string) {
  return prisma.tenantMembership.findMany({
    where: { userId },
    select: { tenantId: true, roles: true, supplierId: true },
  });
}

const router = Router();

// Mapeo de tipos de documento a campos de vinculación
const documentTypeToField: Record<DocumentChatType, string> = {
  DOCUMENT: 'linkedDocumentId',
  PURCHASE_ORDER: 'linkedPurchaseOrderId',
  PURCHASE_REQUEST: 'linkedPurchaseRequestId',
  QUOTATION: 'linkedQuotationId',
  PAYMENT: 'linkedPaymentId',
};

/**
 * GET /api/document-chat/unread-count
 * Obtiene el contador global de mensajes no leídos
 * IMPORTANTE: Esta ruta debe ir ANTES de las rutas parametrizadas
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { tenantId } = req.query;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId requerido' });
    }

    // Obtener membresías del usuario
    const userMemberships = await getUserMemberships(user.id);

    // Verificar membresía del usuario al tenant
    const membership = userMemberships.find(
      (m) => m.tenantId === tenantId
    );

    if (!membership) {
      return res.status(403).json({ error: 'No tienes acceso a este tenant' });
    }

    // Determinar si es cliente o proveedor
    const isProvider = membership.roles?.includes('PROVIDER');

    // Contar mensajes no leídos
    let unreadCount: number;

    if (isProvider) {
      // Sumar unreadCountProvider de todas las conversaciones donde es proveedor
      const result = await prisma.conversation.aggregate({
        where: {
          OR: [
            { providerTenantId: tenantId as string },
            // También incluir conversaciones de OC donde el proveedor está vinculado
            {
              documentType: 'PURCHASE_ORDER',
              clientTenantId: tenantId as string,
            },
          ],
        },
        _sum: { unreadCountProvider: true },
      });
      unreadCount = result._sum.unreadCountProvider || 0;
    } else {
      // Sumar unreadCountClient de todas las conversaciones donde es cliente
      const result = await prisma.conversation.aggregate({
        where: { clientTenantId: tenantId as string },
        _sum: { unreadCountClient: true },
      });
      unreadCount = result._sum.unreadCountClient || 0;
    }

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error obteniendo contador de no leídos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// Función auxiliar para obtener información del documento
async function getDocumentInfo(documentType: DocumentChatType, documentId: string) {
  switch (documentType) {
    case 'DOCUMENT':
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          number: true,
          type: true,
          clientTenantId: true,
          providerTenantId: true,
          uploader: { select: { id: true, name: true, email: true } },
          clientTenant: { select: { id: true, name: true, email: true } },
          providerTenant: { select: { id: true, name: true, email: true } },
        },
      });
      return doc ? {
        ...doc,
        displayNumber: `${doc.type === 'INVOICE' ? 'FC' : doc.type === 'CREDIT_NOTE' ? 'NC' : doc.type === 'DEBIT_NOTE' ? 'ND' : 'REC'} ${doc.number}`,
      } : null;

    case 'PURCHASE_ORDER':
      const oc = await prisma.purchaseOrderCircuit.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          numero: true,
          tenantId: true,
          proveedorId: true,
          proveedor: { select: { id: true, nombre: true, email: true } },
          // Para OC: interlocutores son solicitante del REQ y creador de la OC
          creadoPorId: true,
          purchaseRequestId: true,
          purchaseRequest: {
            select: {
              solicitanteId: true,
              solicitante: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
      if (!oc) return null;

      // Buscar el creador de la OC (no hay relación directa en schema)
      const creadorOC = oc.creadoPorId ? await prisma.user.findUnique({
        where: { id: oc.creadoPorId },
        select: { id: true, name: true, email: true },
      }) : null;

      const ocTenant = await prisma.tenant.findUnique({
        where: { id: oc.tenantId },
        select: { id: true, name: true, email: true },
      });
      return {
        id: oc.id,
        number: oc.numero,
        displayNumber: `OC ${oc.numero}`,
        clientTenantId: oc.tenantId,
        providerTenantId: null,
        clientTenant: ocTenant,
        supplier: oc.proveedor,
        supplierId: oc.proveedorId,
        // Participantes del chat en OC: solicitante del REQ y creador de la OC
        solicitante: oc.purchaseRequest?.solicitante,
        solicitanteId: oc.purchaseRequest?.solicitanteId,
        creadorOC: creadorOC,
        creadorOCId: oc.creadoPorId,
      };

    case 'PURCHASE_REQUEST':
      const req = await prisma.purchaseRequest.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          numero: true,
          titulo: true,
          tenantId: true,
          solicitante: { select: { id: true, name: true, email: true } },
        },
      });
      if (!req) return null;
      const reqTenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
        select: { id: true, name: true, email: true },
      });
      return {
        id: req.id,
        number: req.numero,
        displayNumber: `REQ ${req.numero}`,
        clientTenantId: req.tenantId,
        providerTenantId: null,
        clientTenant: reqTenant,
        solicitante: req.solicitante,
      };

    case 'QUOTATION':
      const quot = await prisma.supplierQuotation.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          number: true,
          supplierId: true,
          supplier: { select: { id: true, nombre: true, email: true, tenantId: true } },
          quotationRequest: {
            select: { tenantId: true },
          },
        },
      });
      if (!quot) return null;
      const quotTenant = await prisma.tenant.findUnique({
        where: { id: quot.quotationRequest.tenantId },
        select: { id: true, name: true, email: true },
      });
      return {
        id: quot.id,
        number: quot.number,
        displayNumber: `COT ${quot.number}`,
        clientTenantId: quot.quotationRequest.tenantId,
        providerTenantId: null,
        clientTenant: quotTenant,
        supplier: quot.supplier,
        supplierId: quot.supplierId,
      };

    case 'PAYMENT':
      const pay = await prisma.payment.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          number: true,
          issuedByTenantId: true,
          receivedByTenantId: true,
          issuedByTenant: { select: { id: true, name: true, email: true } },
          receivedByTenant: { select: { id: true, name: true, email: true } },
        },
      });
      return pay ? {
        ...pay,
        displayNumber: `PAGO ${pay.number}`,
        clientTenantId: pay.issuedByTenantId,
        providerTenantId: pay.receivedByTenantId,
        clientTenant: pay.issuedByTenant,
        providerTenant: pay.receivedByTenant,
      } : null;

    default:
      return null;
  }
}

/**
 * GET /api/document-chat/:documentType/:documentId
 * Obtiene o crea la conversación para un documento
 */
router.get('/:documentType/:documentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { documentType, documentId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Validar tipo de documento
    if (!Object.keys(documentTypeToField).includes(documentType.toUpperCase())) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    const docType = documentType.toUpperCase() as DocumentChatType;
    const linkField = documentTypeToField[docType];

    // Obtener información del documento
    const docInfo = await getDocumentInfo(docType, documentId);
    if (!docInfo) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Buscar conversación existente
    let conversation = await prisma.conversation.findFirst({
      where: {
        documentType: docType,
        [linkField]: documentId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    // Si no existe, crear una nueva
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          subject: `Chat - ${docInfo.displayNumber}`,
          status: ConversationStatus.OPEN,
          channel: CommunicationChannel.PORTAL,
          clientTenantId: docInfo.clientTenantId,
          providerTenantId: docInfo.providerTenantId || null,
          createdById: user.id,
          documentType: docType,
          [linkField]: documentId,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    // Obtener membresías del usuario
    const userMemberships = await getUserMemberships(user.id);

    // Determinar si el usuario es del tenant o proveedor
    const isFromClient = userMemberships.some(
      (m) => m.tenantId === docInfo.clientTenantId
    );

    // Marcar mensajes como leídos si corresponde
    if (isFromClient) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadCountClient: 0 },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadCountProvider: 0 },
      });
    }

    res.json({
      conversation,
      documentInfo: docInfo,
      isFromClient,
    });
  } catch (error) {
    console.error('Error obteniendo conversación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/document-chat/:documentType/:documentId/messages
 * Lista mensajes de una conversación con paginación
 */
router.get('/:documentType/:documentId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const { documentType, documentId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const docType = documentType.toUpperCase() as DocumentChatType;
    const linkField = documentTypeToField[docType];

    if (!linkField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        documentType: docType,
        [linkField]: documentId,
      },
    });

    if (!conversation) {
      return res.json({ messages: [], total: 0 });
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.message.count({
        where: { conversationId: conversation.id },
      }),
    ]);

    res.json({
      messages: messages.reverse(), // Ordenar cronológicamente
      total,
      hasMore: parseInt(offset as string) + messages.length < total,
    });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/document-chat/:documentType/:documentId/messages
 * Crea un nuevo mensaje y notifica al destinatario
 */
router.post('/:documentType/:documentId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const { documentType, documentId } = req.params;
    const { text, attachments } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!text?.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    const docType = documentType.toUpperCase() as DocumentChatType;
    const linkField = documentTypeToField[docType];

    if (!linkField) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    // Obtener información del documento
    const docInfo = await getDocumentInfo(docType, documentId);
    if (!docInfo) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Buscar o crear conversación
    let conversation = await prisma.conversation.findFirst({
      where: {
        documentType: docType,
        [linkField]: documentId,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          subject: `Chat - ${docInfo.displayNumber}`,
          status: ConversationStatus.OPEN,
          channel: CommunicationChannel.PORTAL,
          clientTenantId: docInfo.clientTenantId,
          providerTenantId: docInfo.providerTenantId || null,
          createdById: user.id,
          documentType: docType,
          [linkField]: documentId,
        },
      });
    }

    // Obtener membresías del usuario
    const userMemberships = await getUserMemberships(user.id);

    // Determinar si el mensaje viene del cliente o proveedor
    const isFromClient = userMemberships.some(
      (m) => m.tenantId === docInfo.clientTenantId
    );

    // Obtener el tenantId del remitente
    const senderTenantId = isFromClient
      ? docInfo.clientTenantId
      : (docInfo.providerTenantId || docInfo.clientTenantId);

    // Crear el mensaje
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        senderName: user.name,
        senderTenantId: senderTenantId,
        text: text.trim(),
        channel: CommunicationChannel.PORTAL,
        attachments: attachments || null,
      },
    });

    // Actualizar contadores de no leídos
    if (isFromClient) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          unreadCountProvider: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          unreadCountClient: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    }

    // Determinar destinatario para notificación según tipo de documento
    let recipientEmail: string | null = null;
    let recipientTenantId: string | null = null;

    console.log(`📧 [DOCUMENT-CHAT] Determinando destinatario para ${docType}`);
    console.log(`📧 [DOCUMENT-CHAT] Usuario actual: ${user.id} (${user.email})`);
    console.log(`📧 [DOCUMENT-CHAT] isFromClient: ${isFromClient}`);
    console.log(`📧 [DOCUMENT-CHAT] docInfo:`, JSON.stringify({
      clientTenantId: docInfo.clientTenantId,
      providerTenantId: docInfo.providerTenantId,
      clientTenant: docInfo.clientTenant,
      ...(('supplier' in docInfo) && { supplier: docInfo.supplier }),
      ...(('supplierId' in docInfo) && { supplierId: docInfo.supplierId }),
    }, null, 2));

    if (docType === 'PURCHASE_ORDER') {
      // Para OC: chat entre solicitante del REQ y creador de la OC
      const solicitanteId = (docInfo as any).solicitanteId;
      const creadorOCId = (docInfo as any).creadorOCId;
      const solicitante = (docInfo as any).solicitante;
      const creadorOC = (docInfo as any).creadorOC;

      console.log(`📧 [DOCUMENT-CHAT] OC - Solicitante: ${solicitanteId} (${solicitante?.email}), Creador: ${creadorOCId} (${creadorOC?.email})`);

      if (user.id === solicitanteId) {
        // El solicitante escribe -> notificar al creador de la OC
        recipientEmail = creadorOC?.email || null;
        console.log(`📧 [DOCUMENT-CHAT] Usuario es solicitante, notificar a creador: ${recipientEmail}`);
      } else if (user.id === creadorOCId) {
        // El creador de la OC escribe -> notificar al solicitante
        recipientEmail = solicitante?.email || null;
        console.log(`📧 [DOCUMENT-CHAT] Usuario es creador OC, notificar a solicitante: ${recipientEmail}`);
      } else {
        // Usuario no es ninguno de los dos participantes principales
        // Notificar a ambos si es posible
        recipientEmail = solicitante?.email || creadorOC?.email || null;
        console.log(`📧 [DOCUMENT-CHAT] Usuario externo, notificar a: ${recipientEmail}`);
      }
      recipientTenantId = docInfo.clientTenantId;
    } else if (isFromClient) {
      // Mensaje del tenant al proveedor (para documentos, pagos, etc.)
      console.log(`📧 [DOCUMENT-CHAT] Mensaje del TENANT al proveedor`);

      // Castear a any para evitar problemas de tipo con propiedades opcionales
      const docInfoAny = docInfo as any;

      // Para documentos, buscar el usuario que subió el documento (proveedor)
      if (docType === 'DOCUMENT' && docInfoAny.uploader?.email) {
        recipientEmail = docInfoAny.uploader.email;
        console.log(`📧 [DOCUMENT-CHAT] Usando email del uploader: ${recipientEmail}`);
      } else if (docInfoAny.supplier?.email) {
        recipientEmail = docInfoAny.supplier.email;
        console.log(`📧 [DOCUMENT-CHAT] Usando email del supplier objeto: ${recipientEmail}`);
      } else if (docInfoAny.supplierId) {
        // Buscar el email del supplier directamente
        const supplier = await prisma.supplier.findUnique({
          where: { id: docInfoAny.supplierId },
          select: { email: true, emailFacturacion: true, nombre: true },
        });
        console.log(`📧 [DOCUMENT-CHAT] Supplier encontrado:`, supplier);
        recipientEmail = supplier?.email || supplier?.emailFacturacion || null;
        console.log(`📧 [DOCUMENT-CHAT] Email del supplier por ID: ${recipientEmail}`);
      } else if (docInfo.providerTenantId) {
        const providerTenant = await prisma.tenant.findUnique({
          where: { id: docInfo.providerTenantId },
          select: { email: true, name: true },
        });
        console.log(`📧 [DOCUMENT-CHAT] Provider tenant encontrado:`, providerTenant);
        recipientEmail = providerTenant?.email || null;
        console.log(`📧 [DOCUMENT-CHAT] Email del provider tenant: ${recipientEmail}`);
      }
      recipientTenantId = docInfo.providerTenantId || docInfo.clientTenantId;
    } else {
      // Mensaje del proveedor al tenant
      console.log(`📧 [DOCUMENT-CHAT] Mensaje del PROVEEDOR al tenant`);
      recipientEmail = docInfo.clientTenant?.email || null;
      recipientTenantId = docInfo.clientTenantId;
      console.log(`📧 [DOCUMENT-CHAT] Email del client tenant: ${recipientEmail}`);
    }

    console.log(`📧 [DOCUMENT-CHAT] Destinatario final: ${recipientEmail}, TenantId: ${recipientTenantId}`);

    // Enviar notificación por email
    if (recipientEmail) {
      try {
        await NotificationService.notifyDocumentMessage({
          recipientEmail,
          recipientTenantId: recipientTenantId || docInfo.clientTenantId,
          senderName: user.name,
          senderEmail: user.email,
          documentType: docType,
          documentNumber: docInfo.displayNumber,
          documentId: documentId,
          messageText: text.trim(),
          conversationId: conversation.id,
        });
        console.log(`📧 [DOCUMENT-CHAT] Notificación enviada a ${recipientEmail}`);
      } catch (notifError) {
        console.error('Error enviando notificación de mensaje:', notifError);
        // No fallar la operación si la notificación falla
      }
    } else {
      console.log(`⚠️ [DOCUMENT-CHAT] No se encontró email de destinatario para ${docType} ${documentId}`);
    }

    res.status(201).json({
      message,
      conversation: {
        id: conversation.id,
        unreadCountClient: isFromClient ? conversation.unreadCountClient : conversation.unreadCountClient + 1,
        unreadCountProvider: isFromClient ? conversation.unreadCountProvider + 1 : conversation.unreadCountProvider,
      },
    });
  } catch (error) {
    console.error('Error creando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PATCH /api/document-chat/:conversationId/read
 * Marca mensajes como leídos
 */
router.patch('/:conversationId/read', authenticate, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Obtener membresías del usuario
    const userMemberships = await getUserMemberships(user.id);

    // Determinar si el usuario es del cliente o proveedor
    const isFromClient = userMemberships.some(
      (m) => m.tenantId === conversation.clientTenantId
    );

    // Marcar mensajes específicos o todos
    const whereClause = messageIds?.length
      ? { id: { in: messageIds }, conversationId }
      : { conversationId, readAt: null };

    await prisma.message.updateMany({
      where: whereClause,
      data: { readAt: new Date() },
    });

    // Resetear contador de no leídos
    if (isFromClient) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCountClient: 0 },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { unreadCountProvider: 0 },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marcando mensajes como leídos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
