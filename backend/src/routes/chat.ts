import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import AIAssistantService from '../services/aiAssistant';
import ActionExecutorService from '../services/actionExecutor';

const router = Router();

// Inicializar servicios
let aiAssistant: AIAssistantService | null = null;
const actionExecutor = new ActionExecutorService();

// Inicializar AI Assistant (puede fallar si no hay API key)
try {
  aiAssistant = new AIAssistantService();
} catch (error) {
  console.warn('⚠️  AI Assistant no disponible:', (error as Error).message);
}

/**
 * POST /api/v1/chat
 * Procesa un comando de lenguaje natural
 */
router.post(
  '/',
  authenticate, // Requiere autenticación
  [
    body('message').notEmpty().withMessage('Message is required'),
    body('tenantId').notEmpty().withMessage('TenantId is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validar request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verificar que AI Assistant esté disponible
      if (!aiAssistant) {
        return res.status(503).json({
          error: 'AI Assistant no está configurado. Verifica ANTHROPIC_API_KEY en .env'
        });
      }

      const { message, tenantId } = req.body;
      const userId = req.user?.id; // Del middleware authenticate

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Obtener información del usuario
      const user = await getPrisma().user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          superuser: true,
          tenantMemberships: {
            where: { tenantId },
            select: {
              roles: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Verificar que el usuario pertenece al tenant (superusers tienen acceso a todos)
      if (!user.superuser && user.tenantMemberships.length === 0) {
        return res.status(403).json({
          error: 'No tienes acceso a este tenant'
        });
      }

      // Superusers tienen rol PURCHASE_ADMIN por defecto
      const userRole = user.superuser
        ? 'PURCHASE_ADMIN'
        : (user.tenantMemberships[0]?.roles[0] || 'PROVIDER');

      console.log('\n🎯 ===== NUEVA SOLICITUD AL CHATBOT =====');
      console.log(`Usuario: ${user.name} (${user.email})`);
      console.log(`Tenant: ${tenantId}`);
      console.log(`Mensaje: "${message}"`);

      // Paso 1: Procesar comando con IA
      const aiResponse = await aiAssistant.processCommand(message, {
        userId,
        tenantId,
        userName: user.name,
        userEmail: user.email,
        userRole
      });

      if (!aiResponse.success) {
        return res.status(400).json({
          success: false,
          message: 'No pude entender el comando',
          error: aiResponse.error
        });
      }

      // Paso 2: Validar acción
      const validation = aiAssistant.validateAction(aiResponse.action);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: `Faltan datos: ${validation.errors.join(', ')}`,
          errors: validation.errors
        });
      }

      // Paso 3: Ejecutar acción
      const executionResult = await actionExecutor.executeAction(
        aiResponse.action,
        userId,
        tenantId,
        message // Guardar el prompt original
      );

      console.log('✅ ===== SOLICITUD COMPLETADA =====\n');

      return res.status(executionResult.success ? 200 : 400).json({
        success: executionResult.success,
        message: executionResult.message,
        data: executionResult.data,
        error: executionResult.error,
        debug: process.env.NODE_ENV === 'development' ? {
          action: aiResponse.action,
          rawAIResponse: aiResponse.rawResponse
        } : undefined
      });

    } catch (error) {
      console.error('❌ Chat endpoint error:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        message: (error as Error).message
      });
    }
  }
);

/**
 * GET /api/v1/chat/health
 * Verifica si el servicio de AI está disponible
 */
router.get('/health', (req: Request, res: Response) => {
  return res.json({
    available: aiAssistant !== null,
    service: 'AI Chat Assistant',
    model: aiAssistant ? 'claude-3-5-sonnet-20241022' : null
  });
});

// Helper para obtener prisma (evita imports circulares)
function getPrisma() {
  const { prisma } = require('../lib/prisma');
  return prisma;
}

export default router;
