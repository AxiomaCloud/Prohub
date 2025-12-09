import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import AIAssistantService from '../services/aiAssistant';
import ActionExecutorService from '../services/actionExecutor';
import { ParseService } from '../services/parseService';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Directorio permanente para uploads (usar process.cwd() para consistencia en producción)
const permanentUploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(permanentUploadDir)) {
  fs.mkdirSync(permanentUploadDir, { recursive: true });
}

// Configurar multer para subida de archivos
const uploadDir = path.join(process.cwd(), 'uploads/chat');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `chat-upload-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado. Solo PDF, JPG y PNG.'));
    }
  }
});

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
        requiresUserAction: executionResult.requiresUserAction,
        actionContext: executionResult.actionContext,
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
 * POST /api/v1/chat/upload-document
 * Sube un documento y lo procesa con Parse
 */
router.post(
  '/upload-document',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { tenantId, tipoDocumento } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!tenantId) {
        return res.status(400).json({ error: 'TenantId es requerido' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
      }

      console.log('\n📤 ===== SUBIDA DE DOCUMENTO VIA CHAT =====');
      console.log(`Usuario: ${userId}`);
      console.log(`Tenant: ${tenantId}`);
      console.log(`Archivo: ${req.file.originalname}`);
      console.log(`Tamaño: ${(req.file.size / 1024).toFixed(2)} KB`);

      try {
        // Procesar documento con Parse
        const parseResult = await ParseService.processDocument(
          req.file.path,
          req.file.originalname,
          {}
        );

        console.log('✅ Documento procesado con Parse exitosamente');

        // Extraer datos del resultado
        const cabecera = parseResult.documento?.cabecera || {};
        const items = parseResult.documento?.items || [];
        const impuestos = parseResult.documento?.impuestos || [];

        // El documento pertenece al tenant del usuario (es el cliente/receptor)
        // El proveedor (emisor) se guarda en parseData y opcionalmente como Supplier

        // Buscar o crear el Supplier si tenemos CUIT del emisor
        if (cabecera.cuitEmisor) {
          const cleanCuit = cabecera.cuitEmisor.replace(/-/g, '');

          // Buscar si ya existe el supplier en este tenant
          const existingSupplier = await prisma.supplier.findFirst({
            where: {
              tenantId: tenantId,
              cuit: cleanCuit
            }
          });

          if (existingSupplier) {
            console.log(`📍 Proveedor existente: ${existingSupplier.nombre} (${existingSupplier.id})`);
          } else {
            // Crear nuevo supplier dentro del tenant
            const supplierName = cabecera.razonSocialEmisor || `Proveedor ${cabecera.cuitEmisor}`;
            const newSupplier = await prisma.supplier.create({
              data: {
                tenantId: tenantId,
                nombre: supplierName,
                cuit: cleanCuit,
                isActive: true
              }
            });
            console.log(`✨ Nuevo proveedor creado: ${newSupplier.nombre} (${newSupplier.id})`);
          }
        }

        // Mover archivo a carpeta permanente
        const permanentFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${req.file.originalname}`;
        const permanentPath = path.join(permanentUploadDir, permanentFilename);
        fs.renameSync(req.file.path, permanentPath);

        // Determinar tipo de documento
        let docType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RECEIPT' = 'INVOICE';
        if (cabecera.tipoComprobante?.includes('CREDITO')) {
          docType = 'CREDIT_NOTE';
        } else if (cabecera.tipoComprobante?.includes('DEBITO')) {
          docType = 'DEBIT_NOTE';
        } else if (cabecera.tipoComprobante?.includes('RECIBO')) {
          docType = 'RECEIPT';
        }

        // Parsear fecha del documento
        let docDate: Date | null = null;
        if (cabecera.fecha) {
          // Intentar parsear fecha en formato DD/MM/YYYY o YYYY-MM-DD
          const dateMatch = cabecera.fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dateMatch) {
            docDate = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
          } else {
            docDate = new Date(cabecera.fecha);
          }
        }

        // Crear el documento en la base de datos
        const document = await prisma.document.create({
          data: {
            number: cabecera.numeroComprobante
              ? `${cabecera.puntoVenta || ''}-${cabecera.numeroComprobante}`.replace(/^-/, '')
              : `CHAT-${Date.now()}`,
            type: docType,
            status: 'PRESENTED', // Documento listo para revisión
            amount: cabecera.subtotal || 0,
            taxAmount: cabecera.iva || 0,
            totalAmount: cabecera.total || 0,
            currency: cabecera.moneda || 'ARS',
            fileUrl: `/uploads/${permanentFilename}`,
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            // Ambos tenant son el mismo - el usuario recibe la factura de un proveedor externo
            providerTenantId: tenantId,
            clientTenantId: tenantId,
            uploadedBy: userId,
            date: docDate,
            parseStatus: 'COMPLETED',
            parseData: parseResult as any,
            parsedAt: new Date(),
            parseConfidence: parseResult.metadata.confianza,
            parseRawText: JSON.stringify(cabecera)
          }
        });

        // Crear evento de documento
        await prisma.documentEvent.create({
          data: {
            documentId: document.id,
            fromStatus: null,
            toStatus: 'PRESENTED',
            reason: 'Documento subido via Axio (chat)',
            userId: userId
          }
        });

        console.log(`💾 Documento guardado en BD: ${document.number} (${document.id})`);

        // Construir mensaje de respuesta
        let mensaje = '✅ **¡Documento procesado y guardado exitosamente!**\n\n';
        mensaje += '📋 **Datos de cabecera:**\n';

        if (cabecera.tipoComprobante) {
          mensaje += `• **Tipo:** ${cabecera.tipoComprobante}\n`;
        }
        if (document.number) {
          mensaje += `• **Número:** ${document.number}\n`;
        }
        if (cabecera.fecha) {
          mensaje += `• **Fecha:** ${cabecera.fecha}\n`;
        }
        if (cabecera.razonSocialEmisor) {
          mensaje += `• **Emisor:** ${cabecera.razonSocialEmisor}\n`;
        }
        if (cabecera.cuitEmisor) {
          mensaje += `• **CUIT:** ${cabecera.cuitEmisor}\n`;
        }
        if (cabecera.total) {
          mensaje += `• **Total:** $${cabecera.total.toLocaleString('es-AR')}\n`;
        }

        // Mostrar items si hay
        if (items.length > 0) {
          mensaje += `\n📦 **Items (${items.length}):**\n`;
          items.slice(0, 5).forEach((item: any, index: number) => {
            mensaje += `  ${index + 1}. ${item.descripcion}`;
            if (item.cantidad) mensaje += ` x${item.cantidad}`;
            if (item.totalLinea) mensaje += ` - $${item.totalLinea.toLocaleString('es-AR')}`;
            mensaje += '\n';
          });
          if (items.length > 5) {
            mensaje += `  ... y ${items.length - 5} items más\n`;
          }
        }

        // Mostrar impuestos si hay
        if (impuestos.length > 0) {
          mensaje += `\n💰 **Impuestos:**\n`;
          impuestos.forEach((imp: any) => {
            mensaje += `  • ${imp.descripcion || imp.tipo}: $${(imp.importe || 0).toLocaleString('es-AR')}`;
            if (imp.alicuota) mensaje += ` (${imp.alicuota}%)`;
            mensaje += '\n';
          });
        }

        mensaje += `\n📊 **Confianza:** ${(parseResult.metadata.confianza * 100).toFixed(0)}%`;
        mensaje += `\n⏱️ **Tiempo:** ${parseResult.metadata.processingTimeMs}ms`;
        mensaje += `\n\n✨ _El documento ya está disponible en la lista de documentos._`;

        return res.json({
          success: true,
          message: mensaje,
          data: {
            documentId: document.id,
            documentNumber: document.number,
            documento: parseResult.documento,
            metadata: parseResult.metadata
          }
        });

      } catch (parseError) {
        console.error('❌ Error procesando documento:', parseError);

        // Limpiar archivo temporal
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlink(req.file.path, () => {});
        }

        const errorMessage = (parseError as Error).message;
        let userMessage = '❌ **No se pudo procesar el documento**\n\n';

        if (errorMessage.includes('404')) {
          userMessage += 'El servicio de Parse no está disponible. Por favor contactá al administrador.';
        } else if (errorMessage.includes('Parse API')) {
          userMessage += `Error del servicio: ${errorMessage}`;
        } else {
          userMessage += 'Por favor verificá que el archivo sea un PDF o imagen válida e intentá nuevamente.';
        }

        return res.status(500).json({
          success: false,
          message: userMessage,
          error: errorMessage
        });
      }

    } catch (error) {
      console.error('❌ Error en upload-document:', error);

      // Limpiar archivo temporal
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }

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
