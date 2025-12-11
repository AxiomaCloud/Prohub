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
   * Envía al solicitante y a los compradores del tenant
   */
  static async notifyRequirementApproved(
    purchaseRequest: SimplePurchaseRequest,
    approverName: string,
    comment?: string,
    tenantId?: string
  ): Promise<void> {
    const actionUrl = `${FRONTEND_URL}/compras/requerimientos?id=${purchaseRequest.id}`;
    const fechaAprobacion = new Date().toLocaleDateString('es-AR');
    const montoFormateado = this.formatCurrency(purchaseRequest.montoEstimado);

    // Verificar si existe template
    const template = tenantId ? await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'REQ_APPROVED',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      }
    }) : null;

    // 1. Notificar al solicitante
    if (template) {
      const context: NotificationContext = {
        tenantId: tenantId || '',
        numero: purchaseRequest.numero,
        titulo: purchaseRequest.titulo,
        aprobador: approverName,
        fechaAprobacion,
        comentario: comment,
        actionUrl,
      };
      await this.sendNotification('REQ_APPROVED', purchaseRequest.requester.email, context);
    } else {
      console.log(`📧 [REQ_APPROVED] No hay template, enviando email directo a ${purchaseRequest.requester.email}`);
      await EmailService.sendEmail({
        to: purchaseRequest.requester.email,
        subject: `Requerimiento aprobado - ${purchaseRequest.numero}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">✅ Requerimiento Aprobado</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">Hola <strong>${purchaseRequest.requester.name}</strong>,</p>
              <p style="font-size: 16px; color: #374151;">Tu requerimiento ha sido <strong style="color: #10b981;">aprobado</strong>:</p>
              <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Número:</strong> ${purchaseRequest.numero}</p>
                <p><strong>Título:</strong> ${purchaseRequest.titulo}</p>
                <p><strong>Monto Estimado:</strong> ${montoFormateado}</p>
                <p><strong>Aprobado por:</strong> ${approverName}</p>
                <p><strong>Fecha:</strong> ${fechaAprobacion}</p>
                ${comment ? `<p><strong>Comentario:</strong> ${comment}</p>` : ''}
              </div>
              <p style="font-size: 16px; color: #374151;">El área de compras procederá con la gestión de la cotización.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${actionUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver Requerimiento
                </a>
              </div>
            </div>
            <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              Este es un mensaje automático del sistema de compras.
            </div>
          </div>
        `,
      });
    }

    // 2. Notificar a los compradores del tenant para que generen la cotización
    if (tenantId) {
      const buyerMemberships = await prisma.tenantMembership.findMany({
        where: {
          tenantId,
          isActive: true,
          roles: { hasSome: ['PURCHASE_ADMIN'] },
        },
      });

      const rfqActionUrl = `${FRONTEND_URL}/compras/cotizaciones/nueva?requerimiento=${purchaseRequest.id}`;

      for (const membership of buyerMemberships) {
        // Obtener el usuario por separado
        const buyerUser = await prisma.user.findUnique({
          where: { id: membership.userId },
          select: { email: true, name: true },
        });

        if (!buyerUser || buyerUser.email === purchaseRequest.requester.email) continue; // No duplicar si es el mismo

        console.log(`📧 [REQ_APPROVED] Notificando al comprador ${buyerUser.email} para generar cotización`);
        await EmailService.sendEmail({
          to: buyerUser.email,
          subject: `Nuevo requerimiento aprobado para cotizar - ${purchaseRequest.numero}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">📋 Requerimiento Listo para Cotizar</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <p style="font-size: 16px; color: #374151;">Hola <strong>${buyerUser.name}</strong>,</p>
                <p style="font-size: 16px; color: #374151;">Se ha aprobado un nuevo requerimiento que está listo para iniciar el proceso de cotización:</p>
                <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <p><strong>Número:</strong> ${purchaseRequest.numero}</p>
                  <p><strong>Título:</strong> ${purchaseRequest.titulo}</p>
                  <p><strong>Monto Estimado:</strong> ${montoFormateado}</p>
                  <p><strong>Solicitante:</strong> ${purchaseRequest.requester.name}</p>
                  <p><strong>Aprobado por:</strong> ${approverName}</p>
                </div>
                <p style="font-size: 16px; color: #374151;">Por favor, genera una solicitud de cotización para este requerimiento.</p>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${rfqActionUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Crear Solicitud de Cotización
                  </a>
                </div>
              </div>
              <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
                Este es un mensaje automático del sistema de compras.
              </div>
            </div>
          `,
        });
      }
    }
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
    const montoFormateado = this.formatCurrency(purchaseRequest.montoEstimado);
    const actionUrl = `${FRONTEND_URL}/compras/aprobaciones?id=${purchaseRequest.id}`;

    // Verificar si existe template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'REQ_NEEDS_APPROVAL',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      }
    });

    if (template) {
      const context: NotificationContext = {
        tenantId,
        numero: purchaseRequest.numero,
        titulo: purchaseRequest.titulo,
        solicitante: purchaseRequest.requester.name,
        montoEstimado: montoFormateado,
        nivelAprobacion: levelName,
        actionUrl,
      };
      await this.sendNotification('REQ_NEEDS_APPROVAL', approverEmail, context);
    } else {
      // Si no hay template, enviar email directo
      console.log(`📧 [REQ_NEEDS_APPROVAL] No hay template, enviando email directo a ${approverEmail}`);
      await EmailService.sendEmail({
        to: approverEmail,
        subject: `Requerimiento pendiente de aprobación - ${purchaseRequest.numero}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">⏳ Aprobación Pendiente</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">Tienes un nuevo requerimiento pendiente de aprobación:</p>
              <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Número:</strong> ${purchaseRequest.numero}</p>
                <p><strong>Título:</strong> ${purchaseRequest.titulo}</p>
                <p><strong>Solicitante:</strong> ${purchaseRequest.requester.name}</p>
                <p><strong>Monto Estimado:</strong> <span style="color: #f59e0b; font-weight: bold;">${montoFormateado}</span></p>
                <p><strong>Nivel de Aprobación:</strong> ${levelName}</p>
              </div>
              <p style="font-size: 16px; color: #374151;">Por favor revisa y toma una decisión sobre este requerimiento.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${actionUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Revisar Requerimiento
                </a>
              </div>
            </div>
            <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              Este es un mensaje automático del sistema de compras.
            </div>
          </div>
        `,
      });
    }
  }

  /**
   * Notifica a un aprobador que tiene una OC pendiente de aprobación
   */
  static async notifyOCApprovalNeeded(
    ocNumero: string,
    ocTotal: number,
    currency: string,
    supplierName: string,
    requesterName: string,
    approverEmail: string,
    levelName: string,
    tenantId: string,
    ocId: string
  ): Promise<void> {
    const montoFormateado = this.formatCurrency(ocTotal, currency);
    const actionUrl = `${FRONTEND_URL}/compras/ordenes?id=${ocId}`;

    // Verificar si existe template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'OC_NEEDS_APPROVAL',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      }
    });

    if (template) {
      const context: NotificationContext = {
        tenantId,
        numero: ocNumero,
        montoTotal: montoFormateado,
        proveedor: supplierName,
        solicitante: requesterName,
        nivelAprobacion: levelName,
        actionUrl,
      };
      await this.sendNotification('OC_NEEDS_APPROVAL', approverEmail, context);
    } else {
      // Si no hay template, enviar email directo
      console.log(`📧 [OC_NEEDS_APPROVAL] No hay template, enviando email directo a ${approverEmail}`);
      await EmailService.sendEmail({
        to: approverEmail,
        subject: `Orden de Compra pendiente de aprobación - ${ocNumero}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">📋 OC Pendiente de Aprobación</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">Tienes una nueva Orden de Compra pendiente de aprobación:</p>
              <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Número de OC:</strong> ${ocNumero}</p>
                <p><strong>Proveedor:</strong> ${supplierName}</p>
                <p><strong>Monto Total:</strong> <span style="color: #8b5cf6; font-weight: bold;">${montoFormateado}</span></p>
                <p><strong>Solicitante:</strong> ${requesterName}</p>
                <p><strong>Nivel de Aprobación:</strong> ${levelName}</p>
              </div>
              <p style="font-size: 16px; color: #374151;">Por favor revisa y toma una decisión sobre esta orden de compra.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${actionUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Revisar Orden de Compra
                </a>
              </div>
            </div>
            <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              Este es un mensaje automático del sistema de compras.
            </div>
          </div>
        `,
      });
    }
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
    context: NotificationContext,
    attachments?: Array<{
      filename: string;
      content?: string | Buffer;
      path?: string;
      contentType?: string;
    }>
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
      context.tenantId || undefined,
      attachments
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

  // ============================================
  // NOTIFICACIONES DE DOCUMENTOS
  // ============================================

  /**
   * Notifica cuando un documento es subido
   */
  static async notifyDocumentUploaded(
    documentNumber: string,
    documentType: string,
    uploaderName: string,
    providerName: string,
    clientEmail: string,
    documentId: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: documentNumber,
      titulo: `${documentType} - ${documentNumber}`,
      solicitante: uploaderName,
      proveedor: providerName,
      actionUrl: `${FRONTEND_URL}/documentos/${documentId}`,
    };

    await this.sendNotification('DOC_UPLOADED', clientEmail, context);
  }

  /**
   * Notifica cuando un documento cambia de estado
   */
  static async notifyDocumentStatusChanged(
    documentNumber: string,
    oldStatus: string,
    newStatus: string,
    changedByName: string,
    recipientEmail: string,
    documentId: string,
    tenantId: string,
    comment?: string
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      PROCESSING: 'Procesando',
      PRESENTED: 'Presentado',
      IN_REVIEW: 'En Revisión',
      APPROVED: 'Aprobado',
      PAID: 'Pagado',
      REJECTED: 'Rechazado',
    };

    const context: NotificationContext = {
      tenantId,
      numero: documentNumber,
      titulo: `Estado: ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
      aprobador: changedByName,
      comentario: comment,
      actionUrl: `${FRONTEND_URL}/documentos/${documentId}`,
    };

    // Determinar el tipo de evento según el nuevo estado
    let eventType: NotificationEventType = 'DOC_STATUS_CHANGED';
    if (newStatus === 'APPROVED') eventType = 'DOC_APPROVED';
    if (newStatus === 'REJECTED') eventType = 'DOC_REJECTED';

    await this.sendNotification(eventType, recipientEmail, context);
  }

  /**
   * Notifica cuando se agrega un comentario a un documento
   */
  static async notifyDocumentComment(
    documentNumber: string,
    commenterName: string,
    comment: string,
    recipientEmail: string,
    documentId: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: documentNumber,
      solicitante: commenterName,
      comentario: comment,
      actionUrl: `${FRONTEND_URL}/documentos/${documentId}`,
    };

    await this.sendNotification('DOC_COMMENT', recipientEmail, context);
  }

  // ============================================
  // NOTIFICACIONES DE PROVEEDORES
  // ============================================

  /**
   * Notifica cuando un proveedor es invitado
   */
  static async notifySupplierInvited(
    supplierEmail: string,
    supplierName: string,
    clientName: string,
    inviteUrl: string,
    tenantId: string
  ): Promise<void> {
    // Verificar si existe template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'SUPPLIER_INVITED',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      }
    });

    if (template) {
      const context: NotificationContext = {
        tenantId,
        proveedor: supplierName,
        titulo: `Invitación de ${clientName}`,
        actionUrl: inviteUrl,
      };
      await this.sendNotification('SUPPLIER_INVITED', supplierEmail, context);
    } else {
      // Si no hay template, enviar email directo
      console.log(`📧 [SUPPLIER_INVITED] No hay template, enviando email directo a ${supplierEmail}`);
      await EmailService.sendEmail({
        to: supplierEmail,
        subject: `Invitación para ser proveedor de ${clientName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">🤝 Invitación de Proveedor</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">Hola <strong>${supplierName}</strong>,</p>
              <p style="font-size: 16px; color: #374151;"><strong>${clientName}</strong> te ha invitado a formar parte de su red de proveedores.</p>
              <p style="font-size: 16px; color: #374151;">Para completar tu registro y comenzar a recibir solicitudes de cotización, haz clic en el siguiente botón:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px;">
                  Completar Registro
                </a>
              </div>
              <p style="font-size: 14px; color: #6b7280; text-align: center;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${inviteUrl}" style="color: #6366f1; word-break: break-all;">${inviteUrl}</a>
              </p>
            </div>
            <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              Este es un mensaje automático. Si no esperabas esta invitación, puedes ignorar este email.
            </div>
          </div>
        `,
      });
    }
  }

  /**
   * Notifica cuando un proveedor es aprobado
   */
  static async notifySupplierApproved(
    supplierEmail: string,
    supplierName: string,
    clientName: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      proveedor: supplierName,
      titulo: `Aprobación de ${clientName}`,
      actionUrl: `${FRONTEND_URL}/proveedores`,
    };

    await this.sendNotification('SUPPLIER_APPROVED', supplierEmail, context);
  }

  /**
   * Notifica cuando un proveedor es rechazado
   */
  static async notifySupplierRejected(
    supplierEmail: string,
    supplierName: string,
    clientName: string,
    reason: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      proveedor: supplierName,
      titulo: `Rechazo de ${clientName}`,
      comentario: reason,
      actionUrl: `${FRONTEND_URL}/proveedores`,
    };

    await this.sendNotification('SUPPLIER_REJECTED', supplierEmail, context);
  }

  /**
   * Notifica cuando hay un proveedor pendiente de aprobación
   */
  static async notifySupplierPendingApproval(
    approverEmail: string,
    supplierName: string,
    supplierId: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      proveedor: supplierName,
      titulo: `Proveedor pendiente de aprobación`,
      actionUrl: `${FRONTEND_URL}/proveedores/${supplierId}`,
    };

    await this.sendNotification('SUPPLIER_PENDING_APPROVAL', approverEmail, context);
  }

  /**
   * Envía un mensaje personalizado a un proveedor
   */
  static async sendSupplierMessage(
    supplierEmail: string,
    supplierName: string,
    clientName: string,
    message: string
  ): Promise<void> {
    // Enviar email directo sin usar template de notificación
    await EmailService.sendEmail({
      to: supplierEmail,
      subject: `Mensaje de ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Mensaje de ${clientName}</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151;">Hola <strong>${supplierName}</strong>,</p>
            <p style="font-size: 16px; color: #374151;">Has recibido un mensaje de ${clientName}:</p>
            <div style="background: white; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="font-size: 16px; color: #374151; white-space: pre-wrap; margin: 0;">${message}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Para responder a este mensaje, puedes ingresar al portal de proveedores o contactar directamente a ${clientName}.
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${FRONTEND_URL}/portal/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Ir al Portal
              </a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            Este mensaje fue enviado desde el sistema de gestión de proveedores.
          </div>
        </div>
      `,
    });
    console.log(`📧 [SUPPLIER MESSAGE] Mensaje enviado a ${supplierEmail}`);
  }

  /**
   * Envía credenciales de acceso a un proveedor aprobado
   */
  static async sendSupplierCredentials(
    supplierEmail: string,
    supplierName: string,
    clientName: string,
    userEmail: string,
    tempPassword: string,
    loginUrl: string
  ): Promise<void> {
    await EmailService.sendEmail({
      to: supplierEmail,
      subject: `Tu cuenta ha sido aprobada - ${clientName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">¡Bienvenido al Portal!</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151;">Hola <strong>${supplierName}</strong>,</p>
            <p style="font-size: 16px; color: #374151;">
              Tu registro como proveedor de <strong>${clientName}</strong> ha sido aprobado.
              Ya puedes acceder al portal con las siguientes credenciales:
            </p>
            <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0;">
                <strong style="color: #6b7280;">Email:</strong><br>
                <span style="font-size: 18px; color: #111827;">${userEmail}</span>
              </p>
              <p style="margin: 0;">
                <strong style="color: #6b7280;">Contraseña temporal:</strong><br>
                <span style="font-size: 18px; font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${tempPassword}</span>
              </p>
            </div>
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Importante:</strong> Te recomendamos cambiar tu contraseña después del primer inicio de sesión.
              </p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${loginUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Ingresar al Portal
              </a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            Este mensaje fue enviado desde el sistema de gestión de proveedores.
          </div>
        </div>
      `,
    });
    console.log(`📧 [SUPPLIER CREDENTIALS] Credenciales enviadas a ${supplierEmail}`);
  }

  // ============================================
  // NOTIFICACIONES DE PAGOS
  // ============================================

  /**
   * Notifica cuando se emite un pago
   */
  static async notifyPaymentIssued(
    paymentNumber: string,
    amount: number,
    currency: string,
    issuerName: string,
    recipientEmail: string,
    paymentId: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: paymentNumber,
      montoTotal: this.formatCurrency(amount),
      titulo: `Pago ${paymentNumber} de ${issuerName}`,
      actionUrl: `${FRONTEND_URL}/pagos/${paymentId}`,
    };

    await this.sendNotification('PAYMENT_ISSUED', recipientEmail, context);
  }

  /**
   * Notifica cuando un pago es marcado como pagado
   */
  static async notifyPaymentCompleted(
    paymentNumber: string,
    amount: number,
    issuerName: string,
    recipientEmail: string,
    paymentId: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: paymentNumber,
      montoTotal: this.formatCurrency(amount),
      titulo: `Pago completado - ${paymentNumber}`,
      actionUrl: `${FRONTEND_URL}/pagos/${paymentId}`,
    };

    await this.sendNotification('PAYMENT_COMPLETED', recipientEmail, context);
  }

  /**
   * Notifica cuando hay un pago programado próximo
   */
  static async notifyPaymentScheduled(
    paymentNumber: string,
    amount: number,
    scheduledDate: Date,
    recipientEmail: string,
    paymentId: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: paymentNumber,
      montoTotal: this.formatCurrency(amount),
      fechaAprobacion: scheduledDate.toLocaleDateString('es-AR'),
      titulo: `Pago programado - ${paymentNumber}`,
      actionUrl: `${FRONTEND_URL}/pagos/${paymentId}`,
    };

    await this.sendNotification('PAYMENT_SCHEDULED', recipientEmail, context);
  }

  // ============================================
  // NOTIFICACIONES DE RFQ (COTIZACIONES)
  // ============================================

  /**
   * Notifica a un proveedor que fue invitado a cotizar
   */
  static async notifyRFQInvitation(
    supplierEmail: string,
    supplierName: string,
    rfqNumber: string,
    rfqTitle: string,
    deadline: Date,
    clientName: string,
    rfqId: string,
    tenantId: string,
    attachments?: Array<{
      filename: string;
      content?: string | Buffer;
      path?: string;
      contentType?: string;
    }>
  ): Promise<void> {
    const actionUrl = `${FRONTEND_URL}/portal/cotizaciones/${rfqId}`;
    const fechaLimite = deadline.toLocaleDateString('es-AR');

    // Intentar primero con template
    const context: NotificationContext = {
      tenantId,
      numero: rfqNumber,
      titulo: rfqTitle,
      proveedor: supplierName,
      fechaAprobacion: fechaLimite,
      actionUrl,
    };

    // Verificar si existe template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'RFQ_INVITATION',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      }
    });

    if (template) {
      await this.sendNotification('RFQ_INVITATION', supplierEmail, context, attachments);
    } else {
      // Si no hay template, enviar email directo
      console.log(`📧 [RFQ_INVITATION] No hay template, enviando email directo a ${supplierEmail}`);
      await EmailService.sendEmail({
        to: supplierEmail,
        subject: `Invitación a cotizar: ${rfqNumber} - ${rfqTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Solicitud de Cotización</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">Hola <strong>${supplierName}</strong>,</p>
              <p style="font-size: 16px; color: #374151;">Has sido invitado a cotizar para el siguiente requerimiento:</p>
              <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Número:</strong> ${rfqNumber}</p>
                <p><strong>Título:</strong> ${rfqTitle}</p>
                <p><strong>Fecha límite:</strong> ${fechaLimite}</p>
              </div>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${actionUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver y Cotizar
                </a>
              </div>
              <p style="color: #6b7280; margin-top: 30px; font-size: 14px; text-align: center;">
                Ingresa al portal de proveedores para ver los detalles y enviar tu cotización.
              </p>
            </div>
          </div>
        `,
        attachments,
      });
    }
  }

  /**
   * Notifica a un proveedor que su cotizacion fue adjudicada
   */
  static async notifyRFQAwarded(
    supplierEmail: string,
    supplierName: string,
    rfqNumber: string,
    rfqTitle: string,
    quotationTotal: number,
    clientName: string,
    rfqId: string,
    tenantId: string
  ): Promise<void> {
    const montoFormateado = this.formatCurrency(quotationTotal);
    const actionUrl = `${FRONTEND_URL}/portal/cotizaciones/${rfqId}`;

    // Verificar si existe template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'RFQ_AWARDED',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      }
    });

    if (template) {
      const context: NotificationContext = {
        tenantId,
        numero: rfqNumber,
        titulo: rfqTitle,
        proveedor: supplierName,
        montoTotal: montoFormateado,
        actionUrl,
      };
      await this.sendNotification('RFQ_AWARDED', supplierEmail, context);
    } else {
      // Si no hay template, enviar email directo
      console.log(`📧 [RFQ_AWARDED] No hay template, enviando email directo a ${supplierEmail}`);
      await EmailService.sendEmail({
        to: supplierEmail,
        subject: `¡Felicitaciones! Tu cotización fue adjudicada - ${rfqNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">🎉 ¡Cotización Adjudicada!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">Hola <strong>${supplierName}</strong>,</p>
              <p style="font-size: 16px; color: #374151;">Nos complace informarte que tu cotización ha sido <strong style="color: #10b981;">adjudicada</strong> para el siguiente requerimiento:</p>
              <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Número:</strong> ${rfqNumber}</p>
                <p><strong>Título:</strong> ${rfqTitle}</p>
                <p><strong>Monto adjudicado:</strong> <span style="color: #10b981; font-weight: bold;">${montoFormateado}</span></p>
                <p><strong>Cliente:</strong> ${clientName}</p>
              </div>
              <p style="font-size: 16px; color: #374151;">Próximamente recibirás la Orden de Compra correspondiente.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${actionUrl}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver Detalle
                </a>
              </div>
            </div>
            <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              Este es un mensaje automático del sistema de compras.
            </div>
          </div>
        `,
      });
    }
  }

  /**
   * Notifica a un proveedor que su cotizacion no fue seleccionada
   */
  static async notifyRFQNotAwarded(
    supplierEmail: string,
    supplierName: string,
    rfqNumber: string,
    rfqTitle: string,
    clientName: string,
    rfqId: string,
    tenantId: string
  ): Promise<void> {
    const actionUrl = `${FRONTEND_URL}/portal/cotizaciones/${rfqId}`;

    // Verificar si existe template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'RFQ_NOT_AWARDED',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      }
    });

    if (template) {
      const context: NotificationContext = {
        tenantId,
        numero: rfqNumber,
        titulo: rfqTitle,
        proveedor: supplierName,
        actionUrl,
      };
      await this.sendNotification('RFQ_NOT_AWARDED', supplierEmail, context);
    } else {
      // Si no hay template, enviar email directo
      console.log(`📧 [RFQ_NOT_AWARDED] No hay template, enviando email directo a ${supplierEmail}`);
      await EmailService.sendEmail({
        to: supplierEmail,
        subject: `Resultado de cotización - ${rfqNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Resultado de Cotización</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">Hola <strong>${supplierName}</strong>,</p>
              <p style="font-size: 16px; color: #374151;">Te informamos que el proceso de cotización ha finalizado:</p>
              <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Número:</strong> ${rfqNumber}</p>
                <p><strong>Título:</strong> ${rfqTitle}</p>
                <p><strong>Cliente:</strong> ${clientName}</p>
              </div>
              <p style="font-size: 16px; color: #374151;">Lamentablemente, en esta oportunidad tu cotización no fue seleccionada. Te agradecemos tu participación y esperamos contar contigo en futuras oportunidades.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${actionUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver Detalle
                </a>
              </div>
            </div>
            <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              Este es un mensaje automático del sistema de compras.
            </div>
          </div>
        `,
      });
    }
  }

  /**
   * Notifica cuando se recibe una nueva cotizacion
   */
  static async notifyQuotationReceived(
    buyerEmail: string,
    supplierName: string,
    rfqNumber: string,
    quotationNumber: string,
    quotationTotal: number,
    rfqId: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: quotationNumber,
      titulo: `Cotizacion recibida para ${rfqNumber}`,
      proveedor: supplierName,
      montoTotal: this.formatCurrency(quotationTotal),
      actionUrl: `${FRONTEND_URL}/compras/cotizaciones/${rfqId}`,
    };

    await this.sendNotification('RFQ_QUOTATION_RECEIVED', buyerEmail, context);
  }

  /**
   * Recordatorio de RFQ por vencer
   */
  static async notifyRFQDeadlineReminder(
    supplierEmail: string,
    supplierName: string,
    rfqNumber: string,
    rfqTitle: string,
    daysRemaining: number,
    rfqId: string,
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: rfqNumber,
      titulo: rfqTitle,
      proveedor: supplierName,
      comentario: `Quedan ${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} para enviar tu cotizacion`,
      actionUrl: `${FRONTEND_URL}/portal/cotizaciones/${rfqId}`,
    };

    await this.sendNotification('RFQ_DEADLINE_REMINDER', supplierEmail, context);
  }

  /**
   * Notifica al proveedor que se generó una Orden de Compra
   */
  static async notifyOCToSupplier(
    supplierEmail: string,
    supplierName: string,
    ocNumber: string,
    ocTotal: number,
    currency: string,
    deliveryDate: Date | null,
    clientName: string,
    tenantId: string
  ): Promise<void> {
    const montoFormateado = this.formatCurrency(ocTotal, currency);
    const fechaEntrega = deliveryDate ? deliveryDate.toLocaleDateString('es-AR') : 'A convenir';
    const actionUrl = `${FRONTEND_URL}/portal/ordenes`;

    // Verificar si existe template
    const template = await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'OC_SUPPLIER_NOTIFIED',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId }
        ]
      }
    });

    if (template) {
      const context: NotificationContext = {
        tenantId,
        numero: ocNumber,
        titulo: `Orden de Compra ${ocNumber}`,
        proveedor: supplierName,
        montoTotal: montoFormateado,
        fechaAprobacion: fechaEntrega,
        actionUrl,
      };
      await this.sendNotification('OC_SUPPLIER_NOTIFIED', supplierEmail, context);
    } else {
      // Si no hay template, enviar email directo
      console.log(`📧 [OC_SUPPLIER_NOTIFIED] No hay template, enviando email directo a ${supplierEmail}`);
      await EmailService.sendEmail({
        to: supplierEmail,
        subject: `Nueva Orden de Compra - ${ocNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">📋 Orden de Compra Generada</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
              <p style="font-size: 16px; color: #374151;">Hola <strong>${supplierName}</strong>,</p>
              <p style="font-size: 16px; color: #374151;">Se ha generado una nueva Orden de Compra a tu favor:</p>
              <div style="background: white; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Número de OC:</strong> ${ocNumber}</p>
                <p><strong>Monto Total:</strong> <span style="color: #3b82f6; font-weight: bold;">${montoFormateado}</span></p>
                <p><strong>Fecha de Entrega:</strong> ${fechaEntrega}</p>
                <p><strong>Cliente:</strong> ${clientName}</p>
              </div>
              <p style="font-size: 16px; color: #374151;">Puedes ver el detalle completo de la orden en el portal de proveedores.</p>
              <div style="text-align: center; margin-top: 30px;">
                <a href="${actionUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver Mis Órdenes
                </a>
              </div>
            </div>
            <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              Este es un mensaje automático del sistema de compras.
            </div>
          </div>
        `,
      });
    }
  }

  // Helpers
  private static formatCurrency(amount: any, currency: string = 'ARS'): string {
    if (!amount) return '$0';
    const num = typeof amount === 'object' ? parseFloat(amount.toString()) : parseFloat(amount);
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
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

  private static translateDocumentType(docType: string): string {
    const translations: Record<string, string> = {
      DOCUMENT: 'Documento',
      PURCHASE_ORDER: 'Orden de Compra',
      PURCHASE_REQUEST: 'Requerimiento',
      QUOTATION: 'Cotización',
      PAYMENT: 'Pago',
    };
    return translations[docType] || docType;
  }

  /**
   * Notifica cuando hay un nuevo mensaje en el chat de un documento
   */
  static async notifyDocumentMessage(params: {
    recipientEmail: string;
    recipientTenantId: string;
    senderName: string;
    senderEmail: string;
    documentType: string;
    documentNumber: string;
    documentId: string;
    messageText: string;
    conversationId: string;
  }): Promise<void> {
    const {
      recipientEmail,
      recipientTenantId,
      senderName,
      senderEmail,
      documentType,
      documentNumber,
      documentId,
      messageText,
      conversationId,
    } = params;

    const documentTypeLabel = this.translateDocumentType(documentType);

    // Determinar URL según el tipo de documento
    let actionUrl = FRONTEND_URL;
    switch (documentType) {
      case 'DOCUMENT':
        actionUrl = `${FRONTEND_URL}/documentos/${documentId}`;
        break;
      case 'PURCHASE_ORDER':
        actionUrl = `${FRONTEND_URL}/portal/ordenes?id=${documentId}`;
        break;
      case 'PURCHASE_REQUEST':
        actionUrl = `${FRONTEND_URL}/compras/requerimientos/${documentId}`;
        break;
      case 'QUOTATION':
        actionUrl = `${FRONTEND_URL}/portal/cotizaciones?id=${documentId}`;
        break;
      case 'PAYMENT':
        actionUrl = `${FRONTEND_URL}/portal/pagos?id=${documentId}`;
        break;
    }

    // Verificar si existe template personalizado
    const template = await prisma.emailTemplate.findFirst({
      where: {
        eventType: 'DOC_MESSAGE_RECEIVED',
        isActive: true,
        OR: [
          { tenantId: null },
          { tenantId: recipientTenantId }
        ]
      },
      orderBy: { tenantId: 'desc' } // Priorizar template del tenant
    });

    if (template) {
      // Usar template de la BD
      await EmailService.sendTemplatedEmail(
        'DOC_MESSAGE_RECEIVED',
        recipientEmail,
        {
          senderName,
          senderEmail,
          documentType: documentTypeLabel,
          documentNumber,
          messageText,
          actionUrl,
        },
        recipientTenantId
      );
    } else {
      // Fallback: enviar email hardcoded
      const subject = `💬 Nuevo mensaje de ${senderName} - ${documentNumber}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💬 Nuevo mensaje</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              <strong>${senderName}</strong> te ha enviado un mensaje sobre:
            </p>
            <div style="background: white; border: 1px solid #e5e7eb; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">${documentTypeLabel}</p>
              <p style="margin: 5px 0 0 0; color: #111827; font-weight: 600; font-size: 18px;">${documentNumber}</p>
            </div>

            <div style="background: #f3f4f6; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="font-size: 15px; color: #374151; white-space: pre-wrap; margin: 0; line-height: 1.6;">
                ${messageText}
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${actionUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Responder en Hub
              </a>
            </div>
          </div>
          <div style="padding: 20px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
            Este mensaje fue enviado desde el sistema Hub. No responder a este email.
          </div>
        </div>
      `;

      await EmailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
      });
    }

    console.log(`📧 [NOTIFICATION] Mensaje de documento enviado a ${recipientEmail} por ${senderName}`);
  }
}
