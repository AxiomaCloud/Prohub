import nodemailer from 'nodemailer';
import { PrismaClient, NotificationEventType } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración SMTP desde variables de entorno
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

if (!SMTP_USER || !SMTP_PASS) {
  console.warn('⚠️  SMTP credentials not configured. Email service will not work.');
}

// Crear transporter de nodemailer
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verificar conexión al iniciar
transporter.verify()
  .then(() => console.log('✅ [EMAIL] SMTP connection verified'))
  .catch((err) => console.error('❌ [EMAIL] SMTP connection failed:', err.message));

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

export class EmailService {
  /**
   * Envía un email directo (sin plantilla)
   */
  static async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!SMTP_USER || !SMTP_PASS) {
      console.error('❌ [EMAIL] SMTP not configured');
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      console.log(`📧 [EMAIL] Sending to: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);

      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
        attachments: options.attachments,
      });

      console.log(`✅ [EMAIL] Sent successfully. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error('❌ [EMAIL] Failed to send:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía un email usando una plantilla de la base de datos
   */
  static async sendTemplatedEmail(
    eventType: NotificationEventType,
    to: string | string[],
    variables: TemplateVariables,
    tenantId?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Obtener plantilla (primero buscar por tenant, luego global)
      const template = await this.getTemplate(eventType, tenantId);

      if (!template) {
        console.error(`❌ [EMAIL] Template not found for event: ${eventType}`);
        return { success: false, error: `Template not found: ${eventType}` };
      }

      // Renderizar plantilla con variables
      const subject = this.renderTemplate(template.subject, variables);
      const html = this.renderTemplate(template.bodyHtml, variables);
      const text = template.bodyText ? this.renderTemplate(template.bodyText, variables) : undefined;

      return await this.sendEmail({
        to,
        subject,
        html,
        text,
      });
    } catch (error: any) {
      console.error('❌ [EMAIL] Failed to send templated email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene una plantilla de email de la base de datos
   * Prioridad: 1) Plantilla específica del tenant, 2) Plantilla global
   */
  static async getTemplate(eventType: NotificationEventType, tenantId?: string) {
    // Primero buscar plantilla específica del tenant
    if (tenantId) {
      const tenantTemplate = await prisma.emailTemplate.findFirst({
        where: {
          eventType,
          tenantId,
          isActive: true,
        },
      });

      if (tenantTemplate) {
        return tenantTemplate;
      }
    }

    // Si no hay plantilla del tenant, buscar plantilla global
    const globalTemplate = await prisma.emailTemplate.findFirst({
      where: {
        eventType,
        tenantId: null,
        isActive: true,
      },
    });

    return globalTemplate;
  }

  /**
   * Renderiza una plantilla reemplazando variables
   * Soporta sintaxis {{variable}} y {{#if variable}}...{{/if}}
   */
  static renderTemplate(template: string, variables: TemplateVariables): string {
    let result = template;

    // Procesar condicionales {{#if variable}}...{{/if}}
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    result = result.replace(conditionalRegex, (match, varName, content) => {
      const value = variables[varName];
      // Mostrar contenido si la variable existe y no es falsy
      return value ? content : '';
    });

    // Reemplazar variables simples {{variable}}
    const variableRegex = /\{\{(\w+)\}\}/g;
    result = result.replace(variableRegex, (match, varName) => {
      const value = variables[varName];
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  /**
   * Convierte HTML básico a texto plano
   */
  static htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Encola un email para envío asíncrono (usando EmailQueue)
   */
  static async queueEmail(
    eventType: NotificationEventType,
    to: string,
    subject: string,
    bodyHtml: string,
    scheduledFor?: Date
  ): Promise<string> {
    const queueEntry = await prisma.emailQueue.create({
      data: {
        toEmail: to,
        eventType,
        subject,
        bodyHtml,
        scheduledFor: scheduledFor || new Date(),
        status: 'PENDING',
      },
    });

    console.log(`📬 [EMAIL] Queued email ${queueEntry.id} for ${to}`);
    return queueEntry.id;
  }

  /**
   * Procesa la cola de emails pendientes
   * Este método debería llamarse desde un cron job o worker
   */
  static async processQueue(batchSize: number = 10): Promise<number> {
    const pendingEmails = await prisma.emailQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: new Date(),
        },
      },
      take: batchSize,
      orderBy: {
        scheduledFor: 'asc',
      },
    });

    let processedCount = 0;

    for (const email of pendingEmails) {
      // Marcar como procesando
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: { status: 'PROCESSING' },
      });

      const result = await this.sendEmail({
        to: email.toEmail,
        subject: email.subject,
        html: email.bodyHtml,
        text: email.bodyText || undefined,
      });

      if (result.success) {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        processedCount++;
      } else {
        const newAttempts = email.attempts + 1;
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: newAttempts >= email.maxAttempts ? 'FAILED' : 'PENDING',
            attempts: newAttempts,
            lastError: result.error,
          },
        });
      }
    }

    if (processedCount > 0) {
      console.log(`✅ [EMAIL] Processed ${processedCount}/${pendingEmails.length} queued emails`);
    }

    return processedCount;
  }

  /**
   * Envía un email de prueba para verificar la configuración
   */
  static async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    return await this.sendEmail({
      to,
      subject: 'Hub - Email de prueba',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a56db;">Configuración de Email Verificada</h2>
          <p>Este es un email de prueba enviado desde Hub.</p>
          <p>Si recibes este mensaje, la configuración de SMTP está funcionando correctamente.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Host SMTP:</strong> ${SMTP_HOST}</p>
            <p><strong>Puerto:</strong> ${SMTP_PORT}</p>
            <p><strong>Usuario:</strong> ${SMTP_USER}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Enviado automáticamente por Hub.</p>
        </div>
      `,
    });
  }
}
