import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';

const router = Router();

interface Participant {
  userId: string;
  name: string;
  email: string;
  role: 'SOLICITANTE' | 'APROBADOR';
}

/**
 * Obtiene los participantes del chat de un requerimiento
 * Participantes: Solicitante + todos los aprobadores del workflow
 */
async function getChatParticipants(purchaseRequestId: string): Promise<Participant[]> {
  const participants: Participant[] = [];
  const addedUserIds = new Set<string>();

  // 1. Obtener el requerimiento con el solicitante
  const pr = await prisma.purchaseRequest.findUnique({
    where: { id: purchaseRequestId },
    include: {
      solicitante: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!pr) return participants;

  // Agregar solicitante
  if (pr.solicitante) {
    participants.push({
      userId: pr.solicitante.id,
      name: pr.solicitante.name,
      email: pr.solicitante.email,
      role: 'SOLICITANTE'
    });
    addedUserIds.add(pr.solicitante.id);
  }

  // 2. Obtener aprobadores del workflow activo
  const workflow = await prisma.approvalWorkflow.findFirst({
    where: {
      documentType: 'PURCHASE_REQUEST',
      documentId: purchaseRequestId,
    },
    include: {
      approvals: true,
    },
  });

  if (workflow) {
    for (const approval of workflow.approvals) {
      const potentialApprovers = approval.potentialApprovers as any[];
      if (potentialApprovers && Array.isArray(potentialApprovers)) {
        for (const approver of potentialApprovers) {
          if (!addedUserIds.has(approver.userId)) {
            addedUserIds.add(approver.userId);
            participants.push({
              userId: approver.userId,
              name: approver.name || 'Aprobador',
              email: approver.email || '',
              role: 'APROBADOR'
            });
          }
        }
      }
    }
  }

  // 3. Si el aprobador está asignado directamente en el requerimiento, agregarlo
  if (pr.aprobadorId && !addedUserIds.has(pr.aprobadorId)) {
    const aprobador = await prisma.user.findUnique({
      where: { id: pr.aprobadorId },
      select: { id: true, name: true, email: true }
    });
    if (aprobador) {
      addedUserIds.add(aprobador.id);
      participants.push({
        userId: aprobador.id,
        name: aprobador.name,
        email: aprobador.email,
        role: 'APROBADOR'
      });
    }
  }

  // 4. Fallback: si no hay aprobadores, buscar por roles en el tenant
  if (participants.filter(p => p.role === 'APROBADOR').length === 0) {
    const approverMemberships = await prisma.tenantMembership.findMany({
      where: {
        tenantId: pr.tenantId,
        roles: { hasSome: ['PURCHASE_APPROVER', 'PURCHASE_ADMIN'] },
        isActive: true,
      },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
    });

    for (const membership of approverMemberships) {
      if (!addedUserIds.has(membership.userId)) {
        addedUserIds.add(membership.userId);
        participants.push({
          userId: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          role: 'APROBADOR'
        });
      }
    }
  }

  return participants;
}

/**
 * GET /api/pr-chat/:purchaseRequestId
 * Obtiene o crea el chat y retorna mensajes + participantes
 */
router.get('/:purchaseRequestId', authenticate, async (req: Request, res: Response) => {
  try {
    const { purchaseRequestId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Verificar que el requerimiento existe
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      select: { id: true, numero: true, titulo: true, tenantId: true, solicitanteId: true }
    });

    if (!pr) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    // Obtener participantes
    const participants = await getChatParticipants(purchaseRequestId);

    // Verificar que el usuario es participante
    const isParticipant = participants.some(p => p.userId === user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'No tienes acceso a este chat' });
    }

    // Buscar o crear el chat
    let chat = await prisma.purchaseRequestChat.findUnique({
      where: { purchaseRequestId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
        userReadStatus: {
          where: { userId: user.id }
        }
      }
    });

    if (!chat) {
      chat = await prisma.purchaseRequestChat.create({
        data: { purchaseRequestId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          userReadStatus: {
            where: { userId: user.id }
          }
        }
      });
    }

    // Calcular mensajes no leídos para el usuario actual
    const lastReadStatus = chat.userReadStatus[0];
    const lastReadAt = lastReadStatus?.lastReadAt || new Date(0);
    const unreadCount = chat.messages.filter(m =>
      m.senderId !== user.id && m.createdAt > lastReadAt
    ).length;

    // Marcar como leído al abrir
    await prisma.purchaseRequestChatReadStatus.upsert({
      where: {
        chatId_userId: {
          chatId: chat.id,
          userId: user.id
        }
      },
      update: {
        lastReadAt: new Date(),
        lastReadMessageId: chat.messages[chat.messages.length - 1]?.id || null
      },
      create: {
        chatId: chat.id,
        userId: user.id,
        lastReadAt: new Date(),
        lastReadMessageId: chat.messages[chat.messages.length - 1]?.id || null
      }
    });

    res.json({
      chat: {
        id: chat.id,
        purchaseRequestId: chat.purchaseRequestId,
        messages: chat.messages,
        createdAt: chat.createdAt,
      },
      participants,
      unreadCount,
      purchaseRequest: {
        id: pr.id,
        numero: pr.numero,
        titulo: pr.titulo,
      }
    });
  } catch (error) {
    console.error('Error obteniendo chat de requerimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /api/pr-chat/:purchaseRequestId/participants
 * Lista participantes (para mostrar "Enviando a:")
 */
router.get('/:purchaseRequestId/participants', authenticate, async (req: Request, res: Response) => {
  try {
    const { purchaseRequestId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const participants = await getChatParticipants(purchaseRequestId);

    // Filtrar al usuario actual para mostrar solo "los otros"
    const otherParticipants = participants.filter(p => p.userId !== user.id);

    res.json({ participants: otherParticipants });
  } catch (error) {
    console.error('Error obteniendo participantes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/pr-chat/:purchaseRequestId/messages
 * Crea mensaje + notifica por email
 */
router.post('/:purchaseRequestId/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const { purchaseRequestId } = req.params;
    const { text, attachments } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!text?.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    // Verificar que el requerimiento existe
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      select: { id: true, numero: true, titulo: true, solicitanteId: true, tenantId: true }
    });

    if (!pr) {
      return res.status(404).json({ error: 'Requerimiento no encontrado' });
    }

    // Obtener participantes
    const participants = await getChatParticipants(purchaseRequestId);

    // Verificar que el usuario es participante
    const currentParticipant = participants.find(p => p.userId === user.id);
    if (!currentParticipant) {
      return res.status(403).json({ error: 'No tienes acceso a este chat' });
    }

    // Buscar o crear el chat
    let chat = await prisma.purchaseRequestChat.findUnique({
      where: { purchaseRequestId }
    });

    if (!chat) {
      chat = await prisma.purchaseRequestChat.create({
        data: { purchaseRequestId }
      });
    }

    // Crear el mensaje
    const message = await prisma.purchaseRequestChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: user.id,
        senderName: user.name,
        senderRole: currentParticipant.role,
        text: text.trim(),
        attachments: attachments || null,
      }
    });

    // Actualizar el estado de lectura del remitente
    await prisma.purchaseRequestChatReadStatus.upsert({
      where: {
        chatId_userId: {
          chatId: chat.id,
          userId: user.id
        }
      },
      update: {
        lastReadAt: new Date(),
        lastReadMessageId: message.id
      },
      create: {
        chatId: chat.id,
        userId: user.id,
        lastReadAt: new Date(),
        lastReadMessageId: message.id
      }
    });

    // Notificar a los otros participantes por email
    const recipientIds = participants
      .filter(p => p.userId !== user.id)
      .map(p => p.userId);

    if (recipientIds.length > 0) {
      try {
        await NotificationService.notifyPurchaseRequestChatMessage({
          purchaseRequestId: pr.id,
          purchaseRequestNumber: pr.numero,
          senderName: user.name,
          senderId: user.id,
          messageText: text.trim(),
          recipientIds,
          tenantId: pr.tenantId,
        });
      } catch (notifError) {
        console.error('Error enviando notificación de chat:', notifError);
        // No fallar la operación si la notificación falla
      }
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error creando mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PATCH /api/pr-chat/:purchaseRequestId/read
 * Marca como leído para usuario actual
 */
router.patch('/:purchaseRequestId/read', authenticate, async (req: Request, res: Response) => {
  try {
    const { purchaseRequestId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const chat = await prisma.purchaseRequestChat.findUnique({
      where: { purchaseRequestId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }

    const lastMessageId = chat.messages[0]?.id || null;

    await prisma.purchaseRequestChatReadStatus.upsert({
      where: {
        chatId_userId: {
          chatId: chat.id,
          userId: user.id
        }
      },
      update: {
        lastReadAt: new Date(),
        lastReadMessageId: lastMessageId
      },
      create: {
        chatId: chat.id,
        userId: user.id,
        lastReadAt: new Date(),
        lastReadMessageId: lastMessageId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marcando como leído:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /api/pr-chat/unread-counts
 * Contadores de no leídos para múltiples requerimientos
 */
router.post('/unread-counts', authenticate, async (req: Request, res: Response) => {
  try {
    const { purchaseRequestIds } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!purchaseRequestIds || !Array.isArray(purchaseRequestIds) || purchaseRequestIds.length === 0) {
      return res.json({ counts: {} });
    }

    // Obtener chats con mensajes y estado de lectura
    const chats = await prisma.purchaseRequestChat.findMany({
      where: {
        purchaseRequestId: { in: purchaseRequestIds }
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        userReadStatus: {
          where: { userId: user.id }
        }
      }
    });

    const counts: Record<string, number> = {};

    for (const chat of chats) {
      const lastReadStatus = chat.userReadStatus[0];
      const lastReadAt = lastReadStatus?.lastReadAt || new Date(0);

      // Contar mensajes no leídos (que no sean del usuario y posteriores a lastReadAt)
      const unreadCount = chat.messages.filter(m =>
        m.senderId !== user.id && m.createdAt > lastReadAt
      ).length;

      counts[chat.purchaseRequestId] = unreadCount;
    }

    // Para requerimientos sin chat, el contador es 0
    for (const prId of purchaseRequestIds) {
      if (!(prId in counts)) {
        counts[prId] = 0;
      }
    }

    res.json({ counts });
  } catch (error) {
    console.error('Error obteniendo contadores de no leídos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
