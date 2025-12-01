import { PrismaClient, NotificationEventType } from '@prisma/client';
import { EmailService } from './emailService';

const prisma = new PrismaClient();

// URL base del frontend para links en emails
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

interface NotificationContext {
  tenantId: string;
  numero?: string;
  titulo?: string;
  solicitante?: string;
  montoEstimado?: string;
  prioridad?: string;
  aprobador?: string;
  comentario?: string;
  fechaAprobacion?: string;
  nivelAprobacion?: string;
  proveedor?: string;
  montoTotal?: string;
  numeroRequerimiento?: string;
  numeroOC?: string;
  receptor?: string;
  fechaRecepcion?: string;
  delegator?: string;
  fechaInicio?: string;
  fechaFin?: string;
  motivo?: string;
  actionUrl?: string;
  [key: string]: string | undefined;
}

// Tipos simplificados para evitar problemas con Prisma types
interface SimpleRequester {
  name: string;
  email: string;
}

interface SimplePurchaseRequest {
  id: string;
  numero: string;
  titulo: string;
  montoEstimado?: any;
  prioridad?: string;
  requester: SimpleRequester;
}

export class NotificationService {
  /**
   * Notifica cuando un requerimiento es enviado para aprobación
   */
  static async notifyRequirementSubmitted(
    purchaseRequest: SimplePurchaseRequest,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: purchaseRequest.numero,
      titulo: purchaseRequest.titulo,
      solicitante: purchaseRequest.requester.name,
      montoEstimado: this.formatCurrency(purchaseRequest.montoEstimado),
      prioridad: this.translatePriority(purchaseRequest.prioridad || 'NORMAL'),
      actionUrl: `${FRONTEND_URL}/compras/aprobaciones?id=${purchaseRequest.id}`,
    };

    const recipients = await this.getRecipients('REQ_SUBMITTED', tenantId);

    for (const recipient of recipients) {
      await this.sendNotification('REQ_SUBMITTED', recipient.email, context);
    }
  }

  /**
   * Notifica cuando un requerimiento es aprobado
   */
  static async notifyRequirementApproved(
    purchaseRequest: SimplePurchaseRequest,
    approverName: string,
    comment?: string,
    tenantId?: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId: tenantId || '',
      numero: purchaseRequest.numero,
      titulo: purchaseRequest.titulo,
      aprobador: approverName,
      fechaAprobacion: new Date().toLocaleDateString('es-AR'),
      comentario: comment,
      actionUrl: `${FRONTEND_URL}/compras/requerimientos?id=${purchaseRequest.id}`,
    };

    await this.sendNotification('REQ_APPROVED', purchaseRequest.requester.email, context);
  }

  /**
   * Notifica cuando un requerimiento es rechazado
   */
  static async notifyRequirementRejected(
    purchaseRequest: SimplePurchaseRequest,
    approverName: string,
    reason: string,
    tenantId?: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId: tenantId || '',
      numero: purchaseRequest.numero,
      titulo: purchaseRequest.titulo,
      aprobador: approverName,
      comentario: reason,
      actionUrl: `${FRONTEND_URL}/compras/requerimientos?id=${purchaseRequest.id}`,
    };

    await this.sendNotification('REQ_REJECTED', purchaseRequest.requester.email, context);
  }

  /**
   * Notifica a un aprobador que tiene un requerimiento pendiente
   */
  static async notifyApprovalNeeded(
    purchaseRequest: SimplePurchaseRequest,
    approverEmail: string,
    levelName: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: purchaseRequest.numero,
      titulo: purchaseRequest.titulo,
      solicitante: purchaseRequest.requester.name,
      montoEstimado: this.formatCurrency(purchaseRequest.montoEstimado),
      nivelAprobacion: levelName,
      actionUrl: `${FRONTEND_URL}/compras/aprobaciones?id=${purchaseRequest.id}`,
    };

    await this.sendNotification('REQ_NEEDS_APPROVAL', approverEmail, context);
  }

  /**
   * Notifica cuando se registra una recepción
   */
  static async notifyReceptionRegistered(
    receptionNumero: string,
    ocNumero: string,
    receptorName: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: receptionNumero,
      numeroOC: ocNumero,
      receptor: receptorName,
      fechaRecepcion: new Date().toLocaleDateString('es-AR'),
      actionUrl: `${FRONTEND_URL}/compras/recepcion`,
    };

    const recipients = await this.getRecipients('RECEPTION_REGISTERED', tenantId);

    for (const recipient of recipients) {
      await this.sendNotification('RECEPTION_REGISTERED', recipient.email, context);
    }
  }

  /**
   * Notifica cuando se recibe una delegación
   */
  static async notifyDelegationReceived(
    delegateEmail: string,
    delegatorName: string,
    startDate: Date,
    endDate: Date,
    reason?: string,
    tenantId?: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId: tenantId || '',
      delegator: delegatorName,
      fechaInicio: startDate.toLocaleDateString('es-AR'),
      fechaFin: endDate.toLocaleDateString('es-AR'),
      motivo: reason,
      actionUrl: `${FRONTEND_URL}/compras/aprobaciones`,
    };

    await this.sendNotification('DELEGATION_RECEIVED', delegateEmail, context);
  }

  /**
   * Obtiene los destinatarios de una notificación según preferencias
   */
  private static async getRecipients(
    eventType: NotificationEventType,
    tenantId: string
  ): Promise<Array<{ email: string; userId: string }>> {
    const preferences = await prisma.userNotificationPreference.findMany({
      where: {
        tenantId,
        eventType,
        emailEnabled: true,
      },
    });

    const recipients = [];
    for (const pref of preferences) {
      const user = await prisma.user.findUnique({
        where: { id: pref.userId },
        select: { id: true, email: true },
      });
      if (user) {
        recipients.push({ email: user.email, userId: user.id });
      }
    }

    return recipients;
  }

  /**
   * Envía una notificación verificando preferencias del usuario
   */
  private static async sendNotification(
    eventType: NotificationEventType,
    email: string,
    context: NotificationContext
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user && context.tenantId) {
      const preference = await prisma.userNotificationPreference.findFirst({
        where: {
          userId: user.id,
          tenantId: context.tenantId,
          eventType,
        },
      });

      if (preference && !preference.emailEnabled) {
        console.log(`📭 [NOTIFICATION] Skipped ${eventType} for ${email} (disabled by preference)`);
        return;
      }
    }

    await EmailService.sendTemplatedEmail(
      eventType,
      email,
      context,
      context.tenantId || undefined
    );
  }

  /**
   * Inicializa las preferencias de notificación para un usuario
   */
  static async initializeUserPreferences(userId: string, tenantId: string): Promise<void> {
    const eventTypes: NotificationEventType[] = [
      'REQ_SUBMITTED',
      'REQ_APPROVED',
      'REQ_REJECTED',
      'REQ_NEEDS_APPROVAL',
      'OC_GENERATED',
      'OC_NEEDS_APPROVAL',
      'OC_APPROVED',
      'OC_REJECTED',
      'RECEPTION_REGISTERED',
      'RECEPTION_COMPLETE',
      'DELEGATION_RECEIVED',
      'DELEGATION_EXPIRED',
    ];

    for (const eventType of eventTypes) {
      const existing = await prisma.userNotificationPreference.findFirst({
        where: {
          userId,
          tenantId,
          eventType,
        },
      });

      if (!existing) {
        await prisma.userNotificationPreference.create({
          data: {
            userId,
            tenantId,
            eventType,
            emailEnabled: true,
            portalEnabled: true,
          },
        });
      }
    }

    console.log(`✅ [NOTIFICATION] Initialized preferences for user ${userId} in tenant ${tenantId}`);
  }

  /**
   * Obtiene las preferencias de notificación de un usuario
   */
  static async getUserPreferences(userId: string, tenantId: string) {
    return await prisma.userNotificationPreference.findMany({
      where: {
        userId,
        tenantId,
      },
    });
  }

  /**
   * Actualiza una preferencia de notificación
   */
  static async updatePreference(
    userId: string,
    tenantId: string,
    eventType: NotificationEventType,
    emailEnabled: boolean,
    inAppEnabled: boolean
  ) {
    const existing = await prisma.userNotificationPreference.findFirst({
      where: {
        userId,
        tenantId,
        eventType,
      },
    });

    if (existing) {
      return await prisma.userNotificationPreference.update({
        where: { id: existing.id },
        data: {
          emailEnabled,
          portalEnabled: inAppEnabled,
        },
      });
    }

    return await prisma.userNotificationPreference.create({
      data: {
        userId,
        tenantId,
        eventType,
        emailEnabled,
        portalEnabled: inAppEnabled,
      },
    });
  }

  // Helpers
  private static formatCurrency(amount: any): string {
    if (!amount) return '$0';
    const num = typeof amount === 'object' ? parseFloat(amount.toString()) : parseFloat(amount);
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(num);
  }

  private static translatePriority(priority: string): string {
    const translations: Record<string, string> = {
      BAJA: 'Baja',
      NORMAL: 'Media',
      ALTA: 'Alta',
      URGENTE: 'Urgente',
    };
    return translations[priority] || priority;
  }
}
