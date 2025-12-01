import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';
import { EmailService } from '../services/emailService';
import { NotificationEventType } from '@prisma/client';

const router = Router();

// Todos los endpoints requieren autenticación
router.use(authenticate);

/**
 * GET /api/notifications/preferences
 * Obtiene las preferencias de notificación del usuario
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const preferences = await NotificationService.getUserPreferences(req.user.id, tenantId);

    // Si no hay preferencias, inicializarlas
    if (preferences.length === 0) {
      await NotificationService.initializeUserPreferences(req.user.id, tenantId);
      const newPreferences = await NotificationService.getUserPreferences(req.user.id, tenantId);
      return res.json(newPreferences);
    }

    return res.json(preferences);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/preferences/:eventType
 * Actualiza una preferencia de notificación
 */
router.put(
  '/preferences/:eventType',
  [
    param('eventType').isIn([
      'REQ_SUBMITTED', 'REQ_APPROVED', 'REQ_REJECTED', 'REQ_NEEDS_APPROVAL',
      'OC_GENERATED', 'OC_NEEDS_APPROVAL', 'OC_APPROVED', 'OC_REJECTED',
      'RECEPTION_REGISTERED', 'RECEPTION_COMPLETE',
      'DELEGATION_RECEIVED', 'DELEGATION_EXPIRED'
    ]).withMessage('Invalid event type'),
    body('emailEnabled').isBoolean().withMessage('emailEnabled must be boolean'),
    body('inAppEnabled').isBoolean().withMessage('inAppEnabled must be boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      const { eventType } = req.params;
      const { emailEnabled, inAppEnabled } = req.body;

      const preference = await NotificationService.updatePreference(
        req.user.id,
        tenantId,
        eventType as NotificationEventType,
        emailEnabled,
        inAppEnabled
      );

      return res.json(preference);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/notifications/preferences/bulk
 * Actualiza múltiples preferencias de notificación
 */
router.put(
  '/preferences/bulk',
  [
    body('preferences').isArray().withMessage('preferences must be an array'),
    body('preferences.*.eventType').isString().withMessage('eventType is required'),
    body('preferences.*.emailEnabled').isBoolean().withMessage('emailEnabled must be boolean'),
    body('preferences.*.inAppEnabled').isBoolean().withMessage('inAppEnabled must be boolean'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      const { preferences } = req.body;

      const results = await Promise.all(
        preferences.map((pref: { eventType: NotificationEventType; emailEnabled: boolean; inAppEnabled: boolean }) =>
          NotificationService.updatePreference(
            req.user!.id,
            tenantId,
            pref.eventType,
            pref.emailEnabled,
            pref.inAppEnabled
          )
        )
      );

      return res.json(results);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/notifications/templates
 * Obtiene las plantillas de email (admin)
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.headers['x-tenant-id'] as string;

    // Obtener plantillas globales y del tenant
    const templates = await prisma.emailTemplate.findMany({
      where: {
        OR: [
          { tenantId: null },
          { tenantId: tenantId || undefined },
        ],
      },
      orderBy: { eventType: 'asc' },
    });

    return res.json(templates);
  } catch (error) {
    console.error('Error getting email templates:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/notifications/templates/:id
 * Actualiza una plantilla de email (admin)
 */
router.put(
  '/templates/:id',
  [
    param('id').isUUID().withMessage('Invalid template ID'),
    body('subject').optional().isString(),
    body('bodyHtml').optional().isString(),
    body('bodyText').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { id } = req.params;
      const { subject, bodyHtml, bodyText, isActive } = req.body;

      const template = await prisma.emailTemplate.update({
        where: { id },
        data: {
          ...(subject && { subject }),
          ...(bodyHtml && { bodyHtml }),
          ...(bodyText && { bodyText }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return res.json(template);
    } catch (error) {
      console.error('Error updating email template:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/notifications/test-email
 * Envía un email de prueba
 */
router.post(
  '/test-email',
  [body('email').isEmail().withMessage('Valid email required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { email } = req.body;

      const result = await EmailService.sendTestEmail(email);

      if (result.success) {
        return res.json({ message: 'Email de prueba enviado correctamente' });
      } else {
        return res.status(500).json({ error: result.error || 'Error enviando email' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/notifications/queue
 * Obtiene la cola de emails (admin)
 */
router.get('/queue', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const status = req.query.status as string;

    const queue = await prisma.emailQueue.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json(queue);
  } catch (error) {
    console.error('Error getting email queue:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/process-queue
 * Procesa la cola de emails manualmente (admin)
 */
router.post('/process-queue', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const processed = await EmailService.processQueue(10);

    return res.json({ processed, message: `Se procesaron ${processed} emails` });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
