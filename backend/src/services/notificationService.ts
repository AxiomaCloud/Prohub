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
    const context: NotificationContext = {
      tenantId,
      proveedor: supplierName,
      titulo: `Invitación de ${clientName}`,
      actionUrl: inviteUrl,
    };

    await this.sendNotification('SUPPLIER_INVITED', supplierEmail, context);
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
    tenantId: string
  ): Promise<void> {
    const context: NotificationContext = {
      tenantId,
      numero: rfqNumber,
      titulo: rfqTitle,
      proveedor: supplierName,
      fechaAprobacion: deadline.toLocaleDateString('es-AR'),
      actionUrl: `${FRONTEND_URL}/portal/cotizaciones/${rfqId}`,
    };

    await this.sendNotification('RFQ_INVITATION', supplierEmail, context);
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
    const context: NotificationContext = {
      tenantId,
      numero: rfqNumber,
      titulo: rfqTitle,
      proveedor: supplierName,
      montoTotal: this.formatCurrency(quotationTotal),
      actionUrl: `${FRONTEND_URL}/portal/cotizaciones/${rfqId}`,
    };

    await this.sendNotification('RFQ_AWARDED', supplierEmail, context);
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
    const context: NotificationContext = {
      tenantId,
      numero: rfqNumber,
      titulo: rfqTitle,
      proveedor: supplierName,
      actionUrl: `${FRONTEND_URL}/portal/cotizaciones/${rfqId}`,
    };

    await this.sendNotification('RFQ_NOT_AWARDED', supplierEmail, context);
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
    const context: NotificationContext = {
      tenantId,
      numero: ocNumber,
      titulo: `Orden de Compra ${ocNumber}`,
      proveedor: supplierName,
      montoTotal: this.formatCurrency(ocTotal, currency),
      fechaAprobacion: deliveryDate ? deliveryDate.toLocaleDateString('es-AR') : 'A convenir',
      actionUrl: `${FRONTEND_URL}/portal/ordenes`,
    };

    await this.sendNotification('OC_SUPPLIER_NOTIFIED', supplierEmail, context);
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
}
