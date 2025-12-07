import { Router, Request, Response } from 'express';
import { PrismaClient, SupplierStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { getProveedoresForHub } from '../services/parseIntegration';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Configurar multer para documentos de proveedores
const uploadDir = path.join(__dirname, '../../uploads/suppliers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `supplier-doc-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado. Solo PDF, JPG y PNG.'));
    }
  },
});

// ============================================
// LISTADO Y BÚSQUEDA
// ============================================

// GET /api/suppliers - Listar proveedores del tenant
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const source = req.query.source as string;
    const search = req.query.search as string;
    const status = req.query.status as SupplierStatus;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Si source=parse, obtener desde Parse API
    if (source === 'parse') {
      try {
        const result = await getProveedoresForHub({ search });
        return res.json({
          proveedores: result.proveedores,
          total: result.total,
          source: 'parse',
        });
      } catch (parseError) {
        console.error('Error obteniendo proveedores de Parse:', parseError);
      }
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    const where: any = {
      tenantId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { nombreFantasia: { contains: search, mode: 'insensitive' } },
          { cuit: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          documentos: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    res.json({
      proveedores: suppliers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      source: 'local',
    });
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    res.status(500).json({ error: 'Error al listar proveedores' });
  }
});

// GET /api/suppliers/parse - Listar proveedores desde Parse
router.get('/parse', authenticate, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const result = await getProveedoresForHub({ search });

    res.json({
      proveedores: result.proveedores,
      total: result.total,
    });
  } catch (error) {
    console.error('Error al listar proveedores desde Parse:', error);
    res.status(500).json({ error: 'Error al obtener proveedores desde Parse' });
  }
});

// GET /api/suppliers/pending-approval - Proveedores pendientes de aprobación
router.get('/pending-approval', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        tenantId,
        status: 'PENDING_APPROVAL',
      },
      include: {
        documentos: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ proveedores: suppliers });
  } catch (error) {
    console.error('Error al listar proveedores pendientes:', error);
    res.status(500).json({ error: 'Error al listar proveedores pendientes' });
  }
});

// ============================================
// DETALLE Y CRUD
// ============================================

// GET /api/suppliers/:id - Obtener proveedor por ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        documentos: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json({ proveedor: supplier });
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
});

// POST /api/suppliers - Crear proveedor (invitación)
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId, nombre, cuit, email } = req.body;
    const userId = req.user?.id;

    if (!tenantId || !nombre || !cuit) {
      return res.status(400).json({ error: 'tenantId, nombre y cuit son requeridos' });
    }

    // Verificar si ya existe
    const existing = await prisma.supplier.findUnique({
      where: {
        tenantId_cuit: { tenantId, cuit: cuit.replace(/-/g, '') },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya existe un proveedor con ese CUIT' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        nombre,
        cuit: cuit.replace(/-/g, ''),
        email,
        status: 'INVITED',
        invitadoPor: userId,
        invitadoAt: new Date(),
      },
    });

    // TODO: Enviar email de invitación

    res.status(201).json({ proveedor: supplier });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// PUT /api/suppliers/:id - Actualizar proveedor completo (onboarding)
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Limpiar CUIT si viene
    if (data.cuit) {
      data.cuit = data.cuit.replace(/-/g, '');
    }
    if (data.cuitTitular) {
      data.cuitTitular = data.cuitTitular.replace(/-/g, '');
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        // Datos básicos
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.nombreFantasia !== undefined && { nombreFantasia: data.nombreFantasia }),
        ...(data.condicionFiscal && { condicionFiscal: data.condicionFiscal }),
        ...(data.tipoFactura && { tipoFactura: data.tipoFactura }),

        // Domicilio
        ...(data.direccion !== undefined && { direccion: data.direccion }),
        ...(data.numero !== undefined && { numero: data.numero }),
        ...(data.piso !== undefined && { piso: data.piso }),
        ...(data.localidad !== undefined && { localidad: data.localidad }),
        ...(data.provincia !== undefined && { provincia: data.provincia }),
        ...(data.codigoPostal !== undefined && { codigoPostal: data.codigoPostal }),
        ...(data.pais !== undefined && { pais: data.pais }),

        // Contacto
        ...(data.telefono !== undefined && { telefono: data.telefono }),
        ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.emailFacturacion !== undefined && { emailFacturacion: data.emailFacturacion }),
        ...(data.contactoNombre !== undefined && { contactoNombre: data.contactoNombre }),
        ...(data.contactoCargo !== undefined && { contactoCargo: data.contactoCargo }),

        // Datos bancarios
        ...(data.banco !== undefined && { banco: data.banco }),
        ...(data.tipoCuenta && { tipoCuenta: data.tipoCuenta }),
        ...(data.numeroCuenta !== undefined && { numeroCuenta: data.numeroCuenta }),
        ...(data.cbu !== undefined && { cbu: data.cbu }),
        ...(data.alias !== undefined && { alias: data.alias }),
        ...(data.titularCuenta !== undefined && { titularCuenta: data.titularCuenta }),
        ...(data.cuitTitular !== undefined && { cuitTitular: data.cuitTitular }),
        ...(data.monedaCuenta !== undefined && { monedaCuenta: data.monedaCuenta }),

        // Notificaciones
        ...(data.notifEmail !== undefined && { notifEmail: data.notifEmail }),
        ...(data.notifWhatsapp !== undefined && { notifWhatsapp: data.notifWhatsapp }),
        ...(data.notifSms !== undefined && { notifSms: data.notifSms }),
        ...(data.notifDocStatus !== undefined && { notifDocStatus: data.notifDocStatus }),
        ...(data.notifPagos !== undefined && { notifPagos: data.notifPagos }),
        ...(data.notifComentarios !== undefined && { notifComentarios: data.notifComentarios }),
        ...(data.notifOC !== undefined && { notifOC: data.notifOC }),

        // Estado
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        documentos: true,
      },
    });

    res.json({ proveedor: supplier });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// DELETE /api/suppliers/:id - Eliminar proveedor (soft delete)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

// ============================================
// ONBOARDING - COMPLETAR FORMULARIOS
// ============================================

// POST /api/suppliers/:id/complete-bank-data - Completar datos bancarios
router.post('/:id/complete-bank-data', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { banco, tipoCuenta, numeroCuenta, cbu, alias, titularCuenta, cuitTitular, monedaCuenta } =
      req.body;

    if (!banco || !tipoCuenta || !cbu || !titularCuenta) {
      return res.status(400).json({
        error: 'Banco, tipo de cuenta, CBU y titular son requeridos',
      });
    }

    // Validar CBU (22 dígitos)
    const cleanCbu = cbu.replace(/\s/g, '');
    if (cleanCbu.length !== 22) {
      return res.status(400).json({ error: 'El CBU debe tener 22 dígitos' });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        banco,
        tipoCuenta,
        numeroCuenta,
        cbu: cleanCbu,
        alias,
        titularCuenta,
        cuitTitular: cuitTitular?.replace(/-/g, ''),
        monedaCuenta: monedaCuenta || 'ARS',
      },
    });

    res.json({ proveedor: supplier, message: 'Datos bancarios guardados' });
  } catch (error) {
    console.error('Error al guardar datos bancarios:', error);
    res.status(500).json({ error: 'Error al guardar datos bancarios' });
  }
});

// POST /api/suppliers/:id/complete-company-data - Completar datos empresa
router.post('/:id/complete-company-data', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!data.condicionFiscal || !data.tipoFactura) {
      return res.status(400).json({
        error: 'Condición fiscal y tipo de factura son requeridos',
      });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        nombreFantasia: data.nombreFantasia,
        condicionFiscal: data.condicionFiscal,
        tipoFactura: data.tipoFactura,
        direccion: data.direccion,
        numero: data.numero,
        piso: data.piso,
        localidad: data.localidad,
        provincia: data.provincia,
        codigoPostal: data.codigoPostal,
        pais: data.pais || 'Argentina',
        telefono: data.telefono,
        whatsapp: data.whatsapp,
        email: data.email,
        emailFacturacion: data.emailFacturacion,
        contactoNombre: data.contactoNombre,
        contactoCargo: data.contactoCargo,
        // Notificaciones
        notifEmail: data.notifEmail ?? true,
        notifWhatsapp: data.notifWhatsapp ?? false,
        notifSms: data.notifSms ?? false,
        notifDocStatus: data.notifDocStatus ?? true,
        notifPagos: data.notifPagos ?? true,
        notifComentarios: data.notifComentarios ?? true,
        notifOC: data.notifOC ?? false,
      },
    });

    res.json({ proveedor: supplier, message: 'Datos de empresa guardados' });
  } catch (error) {
    console.error('Error al guardar datos de empresa:', error);
    res.status(500).json({ error: 'Error al guardar datos de empresa' });
  }
});

// POST /api/suppliers/:id/complete-onboarding - Finalizar onboarding
router.post('/:id/complete-onboarding', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que tiene los datos mínimos
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { documentos: true },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    // Validaciones mínimas
    const errors: string[] = [];
    if (!supplier.cbu) errors.push('Datos bancarios incompletos');
    if (!supplier.condicionFiscal) errors.push('Condición fiscal requerida');
    if (!supplier.email) errors.push('Email requerido');

    // Verificar documentos requeridos según config del tenant
    const config = await prisma.tenantSupplierConfig.findUnique({
      where: { tenantId: supplier.tenantId },
    });

    if (config?.reqConstanciaAFIP) {
      const hasAFIP = supplier.documentos.some((d) => d.tipo === 'CONSTANCIA_AFIP');
      if (!hasAFIP) errors.push('Constancia de AFIP requerida');
    }

    if (config?.reqConstanciaCBU) {
      const hasCBU = supplier.documentos.some((d) => d.tipo === 'CONSTANCIA_CBU');
      if (!hasCBU) errors.push('Constancia de CBU requerida');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Faltan datos para completar el onboarding',
        details: errors,
      });
    }

    // Determinar el nuevo estado
    const newStatus = config?.aprobacionAutomatica ? 'ACTIVE' : 'PENDING_APPROVAL';

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        status: newStatus,
        completoOnboarding: true,
        onboardingCompletadoAt: new Date(),
        ...(newStatus === 'ACTIVE' && { aprobadoAt: new Date() }),
      },
    });

    // TODO: Enviar notificación al admin si requiere aprobación

    res.json({
      proveedor: updated,
      message:
        newStatus === 'ACTIVE'
          ? 'Registro completado. Tu cuenta está activa.'
          : 'Registro completado. Pendiente de aprobación.',
      requiresApproval: newStatus === 'PENDING_APPROVAL',
    });
  } catch (error) {
    console.error('Error al completar onboarding:', error);
    res.status(500).json({ error: 'Error al completar onboarding' });
  }
});

// ============================================
// APROBACIÓN DE PROVEEDORES
// ============================================

// POST /api/suppliers/:id/approve - Aprobar proveedor
router.post('/:id/approve', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        aprobadoPor: userId,
        aprobadoAt: new Date(),
        isActive: true,
      },
    });

    // TODO: Enviar email de aprobación al proveedor

    res.json({ proveedor: supplier, message: 'Proveedor aprobado' });
  } catch (error) {
    console.error('Error al aprobar proveedor:', error);
    res.status(500).json({ error: 'Error al aprobar proveedor' });
  }
});

// POST /api/suppliers/:id/reject - Rechazar proveedor
router.post('/:id/reject', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const userId = req.user?.id;

    if (!motivo) {
      return res.status(400).json({ error: 'El motivo del rechazo es requerido' });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        status: 'REJECTED',
        aprobadoPor: userId,
        aprobadoAt: new Date(),
        motivoRechazo: motivo,
      },
    });

    // TODO: Enviar email de rechazo al proveedor

    res.json({ proveedor: supplier, message: 'Proveedor rechazado' });
  } catch (error) {
    console.error('Error al rechazar proveedor:', error);
    res.status(500).json({ error: 'Error al rechazar proveedor' });
  }
});

// POST /api/suppliers/:id/suspend - Suspender proveedor
router.post('/:id/suspend', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        motivoRechazo: motivo,
      },
    });

    res.json({ proveedor: supplier, message: 'Proveedor suspendido' });
  } catch (error) {
    console.error('Error al suspender proveedor:', error);
    res.status(500).json({ error: 'Error al suspender proveedor' });
  }
});

// POST /api/suppliers/:id/reactivate - Reactivar proveedor
router.post('/:id/reactivate', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        motivoRechazo: null,
      },
    });

    res.json({ proveedor: supplier, message: 'Proveedor reactivado' });
  } catch (error) {
    console.error('Error al reactivar proveedor:', error);
    res.status(500).json({ error: 'Error al reactivar proveedor' });
  }
});

// ============================================
// DOCUMENTOS DEL PROVEEDOR
// ============================================

// POST /api/suppliers/:id/documents - Subir documento
router.post(
  '/:id/documents',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tipo, nombre } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
      }

      if (!tipo) {
        return res.status(400).json({ error: 'El tipo de documento es requerido' });
      }

      const document = await prisma.supplierDocument.create({
        data: {
          supplierId: id,
          tipo,
          nombre: nombre || req.file.originalname,
          fileUrl: `/uploads/suppliers/${req.file.filename}`,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        },
      });

      res.status(201).json({ documento: document });
    } catch (error) {
      console.error('Error al subir documento:', error);
      res.status(500).json({ error: 'Error al subir documento' });
    }
  }
);

// GET /api/suppliers/:id/documents - Listar documentos
router.get('/:id/documents', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const documents = await prisma.supplierDocument.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ documentos: documents });
  } catch (error) {
    console.error('Error al listar documentos:', error);
    res.status(500).json({ error: 'Error al listar documentos' });
  }
});

// DELETE /api/suppliers/:supplierId/documents/:docId - Eliminar documento
router.delete('/:supplierId/documents/:docId', authenticate, async (req: Request, res: Response) => {
  try {
    const { docId } = req.params;

    const doc = await prisma.supplierDocument.findUnique({
      where: { id: docId },
    });

    if (doc) {
      // Eliminar archivo físico
      const filePath = path.join(__dirname, '../..', doc.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await prisma.supplierDocument.delete({
        where: { id: docId },
      });
    }

    res.json({ message: 'Documento eliminado' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

// ============================================
// CONFIGURACIÓN DEL TENANT
// ============================================

// GET /api/suppliers/config/:tenantId - Obtener configuración
router.get('/config/:tenantId', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    let config = await prisma.tenantSupplierConfig.findUnique({
      where: { tenantId },
    });

    // Si no existe, crear con valores por defecto
    if (!config) {
      config = await prisma.tenantSupplierConfig.create({
        data: { tenantId },
      });
    }

    res.json({ config });
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// PUT /api/suppliers/config/:tenantId - Actualizar configuración
router.put('/config/:tenantId', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const data = req.body;

    const config = await prisma.tenantSupplierConfig.upsert({
      where: { tenantId },
      update: {
        reqConstanciaCBU: data.reqConstanciaCBU,
        reqTitularCoincide: data.reqTitularCoincide,
        reqConstanciaAFIP: data.reqConstanciaAFIP,
        reqConstanciaIIBB: data.reqConstanciaIIBB,
        reqCertificadoRetencion: data.reqCertificadoRetencion,
        reqEmailFacturacion: data.reqEmailFacturacion,
        reqWhatsapp: data.reqWhatsapp,
        reqTelefonoAlt: data.reqTelefonoAlt,
        aprobacionAutomatica: data.aprobacionAutomatica,
        mensajeBienvenida: data.mensajeBienvenida,
        mensajeAprobacion: data.mensajeAprobacion,
        mensajeRechazo: data.mensajeRechazo,
      },
      create: {
        tenantId,
        ...data,
      },
    });

    res.json({ config, message: 'Configuración actualizada' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

// ============================================
// ESTADÍSTICAS
// ============================================

// GET /api/suppliers/stats/:tenantId - Estadísticas de proveedores
router.get('/stats/:tenantId', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const [total, active, pending, invited, suspended] = await Promise.all([
      prisma.supplier.count({ where: { tenantId } }),
      prisma.supplier.count({ where: { tenantId, status: 'ACTIVE' } }),
      prisma.supplier.count({ where: { tenantId, status: 'PENDING_APPROVAL' } }),
      prisma.supplier.count({ where: { tenantId, status: 'INVITED' } }),
      prisma.supplier.count({ where: { tenantId, status: 'SUSPENDED' } }),
    ]);

    res.json({
      stats: {
        total,
        active,
        pending,
        invited,
        suspended,
      },
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
