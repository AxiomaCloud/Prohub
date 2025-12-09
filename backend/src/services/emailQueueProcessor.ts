import { PrismaClient, EmailQueueStatus } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Configurar transporter de nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@hub.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Hub Portal';

export class EmailQueueProcessor {
  private static isProcessing = false;
  private static batchSize = 10;
  private static processingInterval: NodeJS.Timeout | null = null;

  /**
   * Inicia el procesamiento periódico de la cola de emails
   */
  static start(intervalMs: number = 60000): void {
    if (this.processingInterval) {
      console.log('⚠️ [EMAIL_QUEUE] Processor already running');
      return;
    }

    console.log(`✅ [EMAIL_QUEUE] Processor started (interval: ${intervalMs}ms)`);

    // Procesar inmediatamente al inicio
    this.processQueue();

    // Configurar intervalo
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);
  }

  /**
   * Detiene el procesamiento
   */
  static stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('🛑 [EMAIL_QUEUE] Processor stopped');
    }
  }

  /**
   * Procesa emails pendientes en la cola
   */
  static async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ [EMAIL_QUEUE] Already processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // Obtener emails pendientes que no han excedido intentos
      const pendingEmails = await prisma.$queryRaw`
        SELECT * FROM email_queue
        WHERE status = 'PENDING'
          AND "scheduledFor" <= NOW()
          AND attempts < "maxAttempts"
        ORDER BY priority DESC, "createdAt" ASC
        LIMIT ${this.batchSize}
      ` as any[];

      if (pendingEmails.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`📧 [EMAIL_QUEUE] Processing ${pendingEmails.length} emails...`);

      for (const email of pendingEmails) {
        await this.processEmail(email);
      }

      console.log(`✅ [EMAIL_QUEUE] Batch complete`);
    } catch (error) {
      console.error('❌ [EMAIL_QUEUE] Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Procesa un email individual
   */
  private static async processEmail(email: any): Promise<void> {
    try {
      // Marcar como procesando
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
        },
      });

      // Enviar email
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: email.toName ? `"${email.toName}" <${email.toEmail}>` : email.toEmail,
        subject: email.subject,
        html: email.bodyHtml,
        text: email.bodyText || undefined,
      });

      // Marcar como enviado
      await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      console.log(`✅ [EMAIL_QUEUE] Sent: ${email.subject} -> ${email.toEmail}`);
    } catch (error: any) {
      console.error(`❌ [EMAIL_QUEUE] Failed: ${email.subject} -> ${email.toEmail}`, error.message);

      // Actualizar con error
      const updatedEmail = await prisma.emailQueue.update({
        where: { id: email.id },
        data: {
          status: email.attempts + 1 >= email.maxAttempts ? 'FAILED' : 'PENDING',
          lastError: error.message || 'Unknown error',
        },
      });

      if (updatedEmail.status === 'FAILED') {
        console.log(`🚫 [EMAIL_QUEUE] Max attempts reached for: ${email.id}`);
      }
    }
  }

  /**
   * Agrega un email a la cola
   */
  static async enqueue(params: {
    toEmail: string;
    toName?: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    eventType: string;
    tenantId?: string;
    priority?: number;
    scheduledFor?: Date;
    maxAttempts?: number;
  }): Promise<string> {
    const email = await prisma.emailQueue.create({
      data: {
        toEmail: params.toEmail,
        toName: params.toName,
        subject: params.subject,
        bodyHtml: params.bodyHtml,
        bodyText: params.bodyText,
        eventType: params.eventType as any,
        tenantId: params.tenantId,
        priority: params.priority || 0,
        scheduledFor: params.scheduledFor || new Date(),
        maxAttempts: params.maxAttempts || 3,
        status: 'PENDING',
      },
    });

    console.log(`📥 [EMAIL_QUEUE] Enqueued: ${params.subject} -> ${params.toEmail}`);

    return email.id;
  }

  /**
   * Obtiene estadísticas de la cola
   */
  static async getStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, sent, failed, total] = await Promise.all([
      prisma.emailQueue.count({ where: { status: 'PENDING' } }),
      prisma.emailQueue.count({ where: { status: 'PROCESSING' } }),
      prisma.emailQueue.count({ where: { status: 'SENT' } }),
      prisma.emailQueue.count({ where: { status: 'FAILED' } }),
      prisma.emailQueue.count(),
    ]);

    return { pending, processing, sent, failed, total };
  }

  /**
   * Reintentar emails fallidos
   */
  static async retryFailed(): Promise<number> {
    const result = await prisma.emailQueue.updateMany({
      where: { status: 'FAILED' },
      data: {
        status: 'PENDING',
        attempts: 0,
        lastError: null,
      },
    });

    console.log(`🔄 [EMAIL_QUEUE] Reset ${result.count} failed emails`);
    return result.count;
  }

  /**
   * Limpiar emails antiguos (enviados o cancelados)
   */
  static async cleanup(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.emailQueue.deleteMany({
      where: {
        status: { in: ['SENT', 'CANCELLED'] },
        createdAt: { lt: cutoffDate },
      },
    });

    console.log(`🧹 [EMAIL_QUEUE] Cleaned ${result.count} old emails`);
    return result.count;
  }
}
