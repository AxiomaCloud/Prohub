import { Router, Request, Response } from 'express';
import { PrismaClient, SupplierStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { getProveedoresForHub } from '../services/parseIntegration';
import { NotificationService } from '../services/notificationService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Configurar multer para documentos de proveedores (usar process.cwd() para consistencia en producción)
const uploadDir = path.join(process.cwd(), 'uploads/suppliers');
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
// MI PROVEEDOR (PORTAL)
// ============================================

// GET /api/suppliers/me - Obtener el proveedor del usuario logueado
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    console.log(`🏢 [/me] Buscando proveedor para userId: ${userId}, email: ${userEmail}`);

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Primero buscar por userId
    let supplier = await prisma.supplier.findFirst({
      where: { userId },
      include: {
        documentos: true,
      },
    });

    // Si no se encuentra por userId, buscar por email
    if (!supplier && userEmail) {
      console.log(`🏢 [/me] No encontrado por userId, buscando por email: ${userEmail}`);
      supplier = await prisma.supplier.findFirst({
        where: { email: userEmail },
        include: {
          documentos: true,
        },
      });

      // Si se encuentra por email, vincular el userId
      if (supplier) {
        console.log(`🏢 [/me] Encontrado por email, vinculando userId: ${userId}`);
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: { userId },
        });
      }
    }

    if (!supplier) {
      console.log(`🏢 [/me] No se encontró proveedor para userId: ${userId}`);
      return res.status(404).json({
        error: 'No eres un proveedor registrado',
        isSupplier: false
      });
    }

    console.log(`🏢 [/me] Proveedor encontrado: ${supplier.nombre} (${supplier.id})`);
    res.json({
      supplier,
      isSupplier: true,
      supplierId: supplier.id
    });
  } catch (error) {
    console.error('Error al obtener proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/suppliers/me/users - Listar usuarios del proveedor
router.get('/me/users', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    // Primero obtener el proveedor del usuario
    let supplier = await prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier && userEmail) {
      supplier = await prisma.supplier.findFirst({
        where: { email: userEmail },
      });
    }

    if (!supplier) {
      return res.status(404).json({ error: 'No eres un proveedor registrado' });
    }

    // Obtener todos los usuarios vinculados a este proveedor
    const memberships = await prisma.tenantMembership.findMany({
      where: {
        supplierId: supplier.id,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // También incluir al usuario principal si no está en memberships
    const mainUser = await prisma.user.findFirst({
      where: { id: supplier.userId || '' },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    const users = memberships.map(m => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      emailVerified: m.user.emailVerified,
      createdAt: m.user.createdAt,
      roles: m.roles,
      membershipId: m.id,
      isMainUser: m.user.id === supplier?.userId,
    }));

    // Si el usuario principal no está en la lista, agregarlo
    if (mainUser && !users.find(u => u.id === mainUser.id)) {
      users.unshift({
        id: mainUser.id,
        email: mainUser.email,
        name: mainUser.name,
        emailVerified: mainUser.emailVerified,
        createdAt: mainUser.createdAt,
        roles: ['PROVIDER'],
        membershipId: null,
        isMainUser: true,
      } as any);
    }

    res.json({ users, supplierId: supplier.id });
  } catch (error) {
    console.error('Error al listar usuarios del proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/suppliers/me/users - Invitar nuevo usuario al proveedor
router.post('/me/users', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    // Obtener el proveedor del usuario
    let supplier = await prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier && userEmail) {
      supplier = await prisma.supplier.findFirst({
        where: { email: userEmail },
      });
    }

    if (!supplier) {
      return res.status(404).json({ error: 'No eres un proveedor registrado' });
    }

    // Verificar si el usuario ya existe
    let newUser = await prisma.user.findUnique({
      where: { email },
    });

    // Generar contraseña temporal
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    if (!newUser) {
      // Crear nuevo usuario
      newUser = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name: name || email.split('@')[0],
        },
      });
      console.log(`👤 Usuario creado para proveedor: ${email}`);
    }

    // Verificar si ya tiene membership con este supplier
    const existingMembership = await prisma.tenantMembership.findFirst({
      where: {
        userId: newUser.id,
        tenantId: supplier.tenantId,
        supplierId: supplier.id,
      },
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'Este usuario ya está vinculado al proveedor' });
    }

    // Crear membership
    await prisma.tenantMembership.create({
      data: {
        userId: newUser.id,
        tenantId: supplier.tenantId,
        supplierId: supplier.id,
        roles: ['PROVIDER'],
        isActive: true,
        invitedBy: userId,
        invitedAt: new Date(),
        joinedAt: new Date(),
      },
    });

    // Obtener nombre del tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: supplier.tenantId },
      select: { name: true },
    });

    // Enviar email con credenciales
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    await NotificationService.sendSupplierCredentials(
      email,
      name || email.split('@')[0],
      tenant?.name || 'Hub',
      email,
      tempPassword,
      `${FRONTEND_URL}/auth/login`
    );

    console.log(`📧 Invitación enviada a usuario del proveedor: ${email}`);

    res.json({
      success: true,
      message: 'Usuario invitado correctamente',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error('Error al invitar usuario al proveedor:', error);
    res.status(500).json({ error: 'Error al invitar usuario' });
  }
});

// DELETE /api/suppliers/me/users/:userId - Desactivar usuario del proveedor
router.delete('/me/users/:userIdToDelete', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const { userIdToDelete } = req.params;

    // Obtener el proveedor del usuario actual
    let supplier = await prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier && userEmail) {
      supplier = await prisma.supplier.findFirst({
        where: { email: userEmail },
      });
    }

    if (!supplier) {
      return res.status(404).json({ error: 'No eres un proveedor registrado' });
    }

    // No permitir eliminar al usuario principal
    if (userIdToDelete === supplier.userId) {
      return res.status(400).json({ error: 'No puedes eliminar al usuario principal del proveedor' });
    }

    // Desactivar el membership
    await prisma.tenantMembership.updateMany({
      where: {
        userId: userIdToDelete,
        supplierId: supplier.id,
      },
      data: {
        isActive: false,
      },
    });

    console.log(`🚫 Usuario ${userIdToDelete} desactivado del proveedor ${supplier.nombre}`);

    res.json({ success: true, message: 'Usuario desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar usuario del proveedor:', error);
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
});

// ============================================
// ONBOARDING PÚBLICO (sin autenticación)
// ============================================

// GET /api/suppliers/onboarding/:id - Obtener datos del proveedor para onboarding (PÚBLICO)
router.get('/onboarding/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        documentos: {
          orderBy: { createdAt: 'desc' },
        },
        cuentasBancarias: {
          where: { isActive: true },
          orderBy: { esPrincipal: 'desc' },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    // Solo permitir acceso si está en estado de onboarding
    const estadosPermitidos = ['INVITED', 'PENDING_COMPLETION'];
    if (!estadosPermitidos.includes(supplier.status)) {
      return res.status(403).json({
        error: 'El proceso de onboarding ya fue completado o el proveedor no está habilitado para edición',
        status: supplier.status
      });
    }

    console.log(`📋 [Onboarding] Acceso público a proveedor: ${supplier.nombre} (${id})`);

    res.json({ proveedor: supplier });
  } catch (error) {
    console.error('Error al obtener proveedor para onboarding:', error);
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
});

// PUT /api/suppliers/onboarding/:id - Actualizar datos del proveedor durante onboarding (PÚBLICO)
router.put('/onboarding/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cuentasBancarias, ...data } = req.body;

    // Verificar que el proveedor existe y está en estado de onboarding
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!existingSupplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const estadosPermitidos = ['INVITED', 'PENDING_COMPLETION'];
    if (!estadosPermitidos.includes(existingSupplier.status)) {
      return res.status(403).json({
        error: 'El proceso de onboarding ya fue completado',
        status: existingSupplier.status
      });
    }

    // Limpiar CUIT si viene
    if (data.cuit) {
      data.cuit = data.cuit.replace(/-/g, '');
    }
    if (data.cuitTitular) {
      data.cuitTitular = data.cuitTitular.replace(/-/g, '');
    }

    // Actualizar a PENDING_COMPLETION si estaba en INVITED
    const nuevoEstado = existingSupplier.status === 'INVITED' ? 'PENDING_COMPLETION' : existingSupplier.status;

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

        // Datos bancarios (legacy - para cuenta principal)
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
        status: nuevoEstado,
      },
      include: {
        documentos: true,
        cuentasBancarias: true,
      },
    });

    // Manejar cuentas bancarias si vienen en el request
    if (cuentasBancarias && Array.isArray(cuentasBancarias)) {
      // Eliminar cuentas existentes
      await prisma.supplierBankAccount.deleteMany({
        where: { supplierId: id },
      });

      // Crear nuevas cuentas
      if (cuentasBancarias.length > 0) {
        await prisma.supplierBankAccount.createMany({
          data: cuentasBancarias.map((cuenta: any) => ({
            supplierId: id,
            banco: cuenta.banco,
            tipoCuenta: cuenta.tipoCuenta || 'CUENTA_CORRIENTE',
            numeroCuenta: cuenta.numeroCuenta || null,
            cbu: cuenta.cbu,
            alias: cuenta.alias || null,
            titularCuenta: cuenta.titularCuenta,
            moneda: cuenta.moneda || 'ARS',
            esPrincipal: cuenta.esPrincipal || false,
          })),
        });

        // También actualizar los campos legacy con la cuenta principal
        const cuentaPrincipal = cuentasBancarias.find((c: any) => c.esPrincipal) || cuentasBancarias[0];
        if (cuentaPrincipal) {
          await prisma.supplier.update({
            where: { id },
            data: {
              banco: cuentaPrincipal.banco,
              tipoCuenta: cuentaPrincipal.tipoCuenta || 'CUENTA_CORRIENTE',
              numeroCuenta: cuentaPrincipal.numeroCuenta || null,
              cbu: cuentaPrincipal.cbu,
              alias: cuentaPrincipal.alias || null,
              titularCuenta: cuentaPrincipal.titularCuenta,
              monedaCuenta: cuentaPrincipal.moneda || 'ARS',
            },
          });
        }
      }
    }

    // Obtener el proveedor actualizado con las cuentas
    const updatedSupplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        documentos: true,
        cuentasBancarias: true,
      },
    });

    console.log(`📋 [Onboarding] Datos actualizados para: ${supplier.nombre}`);

    res.json({ proveedor: updatedSupplier });
  } catch (error) {
    console.error('Error al actualizar proveedor en onboarding:', error);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// POST /api/suppliers/onboarding/:id/documents - Subir documento durante onboarding (PÚBLICO)
router.post(
  '/onboarding/:id/documents',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tipo, nombre, nombrePersonalizado } = req.body;

      // Verificar que el proveedor existe y está en estado de onboarding
      const existingSupplier = await prisma.supplier.findUnique({
        where: { id },
      });

      if (!existingSupplier) {
        return res.status(404).json({ error: 'Proveedor no encontrado' });
      }

      const estadosPermitidos = ['INVITED', 'PENDING_COMPLETION'];
      if (!estadosPermitidos.includes(existingSupplier.status)) {
        return res.status(403).json({ error: 'El proceso de onboarding ya fue completado' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
      }

      if (!tipo) {
        return res.status(400).json({ error: 'El tipo de documento es requerido' });
      }

      // Para tipo "OTRO", usar nombrePersonalizado si está disponible
      const documentName = tipo === 'OTRO' && nombrePersonalizado
        ? nombrePersonalizado
        : (nombre || req.file.originalname);

      const document = await prisma.supplierDocument.create({
        data: {
          supplierId: id,
          tipo,
          nombre: documentName,
          fileUrl: `/uploads/suppliers/${req.file.filename}`,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        },
      });

      console.log(`📎 [Onboarding] Documento subido: ${tipo} (${documentName}) para ${existingSupplier.nombre}`);

      res.status(201).json({
        id: document.id,
        tipo: document.tipo,
        nombre: document.nombre,
        url: document.fileUrl,
      });
    } catch (error) {
      console.error('Error al subir documento en onboarding:', error);
      res.status(500).json({ error: 'Error al subir documento' });
    }
  }
);

// DELETE /api/suppliers/onboarding/:supplierId/documents/:docId - Eliminar documento durante onboarding (PÚBLICO)
router.delete('/onboarding/:supplierId/documents/:docId', async (req: Request, res: Response) => {
  try {
    const { supplierId, docId } = req.params;

    // Verificar que el proveedor existe y está en estado de onboarding
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!existingSupplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const estadosPermitidos = ['INVITED', 'PENDING_COMPLETION'];
    if (!estadosPermitidos.includes(existingSupplier.status)) {
      return res.status(403).json({ error: 'El proceso de onboarding ya fue completado' });
    }

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
    console.error('Error al eliminar documento en onboarding:', error);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
});

// POST /api/suppliers/onboarding/:id/complete - Finalizar onboarding (PÚBLICO)
router.post('/onboarding/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🔄 [Onboarding Complete] Iniciando para proveedor: ${id}`);

    // Verificar que tiene los datos mínimos
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: { documentos: true, cuentasBancarias: true },
    });

    if (!supplier) {
      console.log(`❌ [Onboarding Complete] Proveedor no encontrado: ${id}`);
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    console.log(`📋 [Onboarding Complete] Proveedor: ${supplier.nombre}, Estado: ${supplier.status}`);
    console.log(`   - CBU: ${supplier.cbu || 'NO'}`);
    console.log(`   - Condición Fiscal: ${supplier.condicionFiscal || 'NO'}`);
    console.log(`   - Email: ${supplier.email || 'NO'}`);
    console.log(`   - Cuentas bancarias: ${supplier.cuentasBancarias?.length || 0}`);
    console.log(`   - Documentos: ${supplier.documentos?.length || 0}`);

    // Verificar estado
    const estadosPermitidos = ['INVITED', 'PENDING_COMPLETION'];
    if (!estadosPermitidos.includes(supplier.status)) {
      console.log(`❌ [Onboarding Complete] Estado no permitido: ${supplier.status}`);
      return res.status(403).json({ error: 'El proceso de onboarding ya fue completado' });
    }

    // Validaciones mínimas
    const errors: string[] = [];

    // Verificar CBU - puede estar en el campo legacy o en cuentasBancarias
    const tieneCBU = supplier.cbu || (supplier.cuentasBancarias && supplier.cuentasBancarias.length > 0);
    if (!tieneCBU) errors.push('Datos bancarios incompletos');

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
      console.log(`❌ [Onboarding Complete] Errores de validación:`, errors);
      return res.status(400).json({
        error: 'Faltan datos para completar el onboarding',
        details: errors,
      });
    }

    // Determinar el nuevo estado
    const newStatus = config?.aprobacionAutomatica ? 'ACTIVE' : 'PENDING_APPROVAL';
    console.log(`📋 [Onboarding Complete] Configuración del tenant: aprobación automática = ${config?.aprobacionAutomatica}`);
    console.log(`📋 [Onboarding Complete] Nuevo estado: ${newStatus}`);

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        status: newStatus,
        completoOnboarding: true,
        onboardingCompletadoAt: new Date(),
        ...(newStatus === 'ACTIVE' && { aprobadoAt: new Date() }),
      },
    });

    console.log(`✅ [Onboarding Complete] Completado para: ${supplier.nombre} - Estado: ${newStatus}`);

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
        cuentasBancarias: {
          where: { isActive: true },
          orderBy: { esPrincipal: 'desc' },
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

    // Obtener nombre del tenant para el email
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Enviar email de invitación
    if (email) {
      try {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const onboardingUrl = `${baseUrl}/onboarding?id=${supplier.id}`;

        await NotificationService.notifySupplierInvited(
          email,
          nombre,
          tenant?.name || 'Hub',
          onboardingUrl,
          tenantId
        );
        console.log(`📧 Email de invitación enviado a ${email}`);
      } catch (emailError) {
        console.error('Error enviando email de invitación:', emailError);
        // No fallar si el email no se envía
      }
    }

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
    const { cuentasBancarias, ...data } = req.body;

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

        // Datos bancarios (legacy - para cuenta principal)
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
        cuentasBancarias: true,
      },
    });

    // Manejar cuentas bancarias si vienen en el request
    if (cuentasBancarias && Array.isArray(cuentasBancarias)) {
      // Eliminar cuentas existentes
      await prisma.supplierBankAccount.deleteMany({
        where: { supplierId: id },
      });

      // Crear nuevas cuentas
      if (cuentasBancarias.length > 0) {
        await prisma.supplierBankAccount.createMany({
          data: cuentasBancarias.map((cuenta: any) => ({
            supplierId: id,
            banco: cuenta.banco,
            tipoCuenta: cuenta.tipoCuenta || 'CUENTA_CORRIENTE',
            numeroCuenta: cuenta.numeroCuenta || null,
            cbu: cuenta.cbu,
            alias: cuenta.alias || null,
            titularCuenta: cuenta.titularCuenta,
            moneda: cuenta.moneda || 'ARS',
            esPrincipal: cuenta.esPrincipal || false,
          })),
        });

        // También actualizar los campos legacy con la cuenta principal
        const cuentaPrincipal = cuentasBancarias.find((c: any) => c.esPrincipal) || cuentasBancarias[0];
        if (cuentaPrincipal) {
          await prisma.supplier.update({
            where: { id },
            data: {
              banco: cuentaPrincipal.banco,
              tipoCuenta: cuentaPrincipal.tipoCuenta || 'CUENTA_CORRIENTE',
              numeroCuenta: cuentaPrincipal.numeroCuenta || null,
              cbu: cuentaPrincipal.cbu,
              alias: cuentaPrincipal.alias || null,
              titularCuenta: cuentaPrincipal.titularCuenta,
              monedaCuenta: cuentaPrincipal.moneda || 'ARS',
            },
          });
        }
      }
    }

    // Obtener el proveedor actualizado con las cuentas
    const updatedSupplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        documentos: true,
        cuentasBancarias: true,
      },
    });

    res.json({ proveedor: updatedSupplier });
  } catch (error) {
    console.error('Error al actualizar proveedor:', error);
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// DELETE /api/suppliers/:id - Eliminar proveedor
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verificar que el proveedor existe
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        documentos: true,
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    // Verificar si tiene órdenes de compra asociadas
    const ordenesCompra = await prisma.purchaseOrderCircuit.count({
      where: { proveedorId: id },
    });

    if (ordenesCompra > 0) {
      return res.status(400).json({
        error: `No se puede eliminar el proveedor porque tiene ${ordenesCompra} orden(es) de compra asociada(s)`
      });
    }

    // Eliminar documentos físicos del proveedor
    for (const doc of supplier.documentos) {
      const filePath = path.join(process.cwd(), doc.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Usar transacción para eliminar todo en orden correcto
    await prisma.$transaction(async (tx) => {
      // Eliminar items de cotizaciones del proveedor
      await tx.supplierQuotationItem.deleteMany({
        where: {
          supplierQuotation: {
            supplierId: id,
          },
        },
      });

      // Eliminar cotizaciones del proveedor
      await tx.supplierQuotation.deleteMany({
        where: { supplierId: id },
      });

      // Eliminar invitaciones a cotizaciones
      await tx.quotationRequestSupplier.deleteMany({
        where: { supplierId: id },
      });

      // Quitar adjudicaciones de RFQs (no eliminar el RFQ, solo quitar la referencia)
      await tx.quotationRequest.updateMany({
        where: { awardedToId: id },
        data: { awardedToId: null },
      });

      // Eliminar cuentas bancarias
      await tx.supplierBankAccount.deleteMany({
        where: { supplierId: id },
      });

      // Eliminar documentos de la BD
      await tx.supplierDocument.deleteMany({
        where: { supplierId: id },
      });

      // Eliminar memberships asociadas al proveedor
      await tx.tenantMembership.deleteMany({
        where: { supplierId: id },
      });

      // Eliminar el proveedor
      await tx.supplier.delete({
        where: { id },
      });
    });

    console.log(`🗑️ Proveedor eliminado: ${supplier.nombre} (${supplier.cuit})`);

    res.json({ message: 'Proveedor eliminado correctamente' });
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
    const approverUserId = req.user?.id;

    // Obtener el proveedor actual
    const currentSupplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!currentSupplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    // Obtener nombre del tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: currentSupplier.tenantId },
      select: { name: true },
    });

    let newUserId = currentSupplier.userId;
    let tempPassword: string | null = null;

    // Si el proveedor no tiene usuario y tiene email, crear uno
    if (!currentSupplier.userId && currentSupplier.email) {
      // Verificar si ya existe un usuario con ese email
      const existingUser = await prisma.user.findUnique({
        where: { email: currentSupplier.email },
      });

      if (existingUser) {
        // Vincular el usuario existente al proveedor
        newUserId = existingUser.id;
        console.log(`👤 Usuario existente vinculado al proveedor: ${existingUser.email}`);
      } else {
        // Crear nuevo usuario para el proveedor
        tempPassword = crypto.randomBytes(8).toString('hex'); // Contraseña temporal
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newUser = await prisma.user.create({
          data: {
            email: currentSupplier.email,
            passwordHash: hashedPassword,
            name: currentSupplier.contactoNombre || currentSupplier.nombre,
          },
        });

        newUserId = newUser.id;

        // Crear membership con rol PROVIDER
        await prisma.tenantMembership.create({
          data: {
            userId: newUser.id,
            tenantId: currentSupplier.tenantId,
            roles: ['PROVIDER'],
            isActive: true,
            joinedAt: new Date(),
          },
        });

        console.log(`👤 Usuario creado para proveedor: ${currentSupplier.email}`);
      }
    }

    // Actualizar el proveedor
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        aprobadoPor: approverUserId,
        aprobadoAt: new Date(),
        isActive: true,
        userId: newUserId,
      },
    });

    // Enviar email de aprobación con credenciales si se creó usuario nuevo
    if (supplier.email) {
      try {
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (tempPassword) {
          // Enviar email con credenciales
          await NotificationService.sendSupplierCredentials(
            supplier.email,
            supplier.nombre,
            tenant?.name || 'Hub',
            supplier.email,
            tempPassword,
            `${FRONTEND_URL}/auth/login`
          );
          console.log(`📧 Email con credenciales enviado a ${supplier.email}`);
        } else {
          // Enviar email de aprobación normal
          await NotificationService.notifySupplierApproved(
            supplier.email,
            supplier.nombre,
            tenant?.name || 'Hub',
            supplier.tenantId
          );
          console.log(`📧 Email de aprobación enviado a ${supplier.email}`);
        }
      } catch (emailError) {
        console.error('Error enviando email de aprobación:', emailError);
      }
    }

    res.json({ proveedor: supplier, message: 'Proveedor aprobado y usuario creado' });
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

    // Obtener nombre del tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: supplier.tenantId },
      select: { name: true },
    });

    // Enviar email de rechazo
    if (supplier.email) {
      try {
        await NotificationService.notifySupplierRejected(
          supplier.email,
          supplier.nombre,
          tenant?.name || 'Hub',
          motivo,
          supplier.tenantId
        );
        console.log(`📧 Email de rechazo enviado a ${supplier.email}`);
      } catch (emailError) {
        console.error('Error enviando email de rechazo:', emailError);
      }
    }

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
// COMUNICACIÓN CON PROVEEDORES
// ============================================

// POST /api/suppliers/:id/send-message - Enviar mensaje al proveedor
router.post('/:id/send-message', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, tenantId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    if (!supplier.email) {
      return res.status(400).json({ error: 'El proveedor no tiene email configurado' });
    }

    // Obtener nombre del tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: supplier.tenantId },
      select: { name: true },
    });

    // Enviar email con el mensaje
    await NotificationService.sendSupplierMessage(
      supplier.email,
      supplier.nombre,
      tenant?.name || 'Hub',
      message
    );

    console.log(`📧 Mensaje enviado al proveedor ${supplier.nombre} (${supplier.email})`);

    res.json({ success: true, message: 'Mensaje enviado correctamente' });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({ error: 'Error al enviar mensaje' });
  }
});

// POST /api/suppliers/:id/resend-invitation - Reenviar invitación al proveedor
router.post('/:id/resend-invitation', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    if (!supplier.email) {
      return res.status(400).json({ error: 'El proveedor no tiene email configurado' });
    }

    // Solo permitir reenviar si está en estado INVITED o PENDING_COMPLETION
    if (!['INVITED', 'PENDING_COMPLETION'].includes(supplier.status)) {
      return res.status(400).json({
        error: 'Solo se puede reenviar invitación a proveedores en estado Invitado o Pendiente'
      });
    }

    // Obtener nombre del tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: supplier.tenantId },
      select: { name: true },
    });

    // URL del portal de onboarding
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = `${FRONTEND_URL}/onboarding?id=${supplier.id}`;

    // Enviar email de invitación
    await NotificationService.notifySupplierInvited(
      supplier.email,
      supplier.nombre,
      tenant?.name || 'Hub',
      inviteUrl,
      supplier.tenantId
    );

    console.log(`📧 Invitación reenviada al proveedor ${supplier.nombre} (${supplier.email})`);

    res.json({ success: true, message: 'Invitación reenviada correctamente' });
  } catch (error) {
    console.error('Error al reenviar invitación:', error);
    res.status(500).json({ error: 'Error al reenviar invitación' });
  }
});

// ============================================
// PORTAL PROVEEDOR - ÓRDENES DE COMPRA
// ============================================

// GET /api/suppliers/me/ordenes - Listar órdenes de compra del proveedor
router.get('/me/ordenes', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    console.log(`📦 [/me/ordenes] Buscando órdenes para userId: ${userId}`);

    // Obtener el proveedor del usuario
    let supplier = await prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier && userEmail) {
      supplier = await prisma.supplier.findFirst({
        where: { email: userEmail },
      });
    }

    if (!supplier) {
      console.log(`📦 [/me/ordenes] No es proveedor`);
      return res.status(404).json({ error: 'No eres un proveedor registrado', ordenes: [] });
    }

    console.log(`📦 [/me/ordenes] Proveedor encontrado: ${supplier.nombre} (${supplier.id})`);

    // Buscar órdenes de compra donde el proveedor es el destinatario
    const ordenes = await prisma.purchaseOrderCircuit.findMany({
      where: {
        proveedorId: supplier.id,
      },
      include: {
        proveedor: {
          select: {
            id: true,
            nombre: true,
            cuit: true,
          },
        },
        purchaseRequest: {
          select: {
            id: true,
            numero: true,
            titulo: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📦 [/me/ordenes] Encontradas ${ordenes.length} órdenes`);

    // Mapear al formato esperado por el frontend
    const ordenesFormateadas = ordenes.map(oc => ({
      id: oc.id,
      numero: oc.numero,
      fechaEmision: oc.fechaEmision?.toISOString() || oc.createdAt.toISOString(),
      estado: oc.estado,
      subtotal: Number(oc.subtotal) || 0,
      impuestos: Number(oc.impuestos) || 0,
      total: Number(oc.total) || 0,
      moneda: oc.moneda || 'ARS',
      requerimiento: oc.purchaseRequest ? {
        id: oc.purchaseRequest.id,
        numero: oc.purchaseRequest.numero,
        titulo: oc.purchaseRequest.titulo,
      } : null,
      items: oc.items.map(item => ({
        id: item.id,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad),
        unidad: item.unidad,
        precioUnitario: Number(item.precioUnitario),
        total: Number(item.total),
      })),
      facturas: [], // TODO: Obtener facturas asociadas
      condicionPago: oc.condicionPago,
      lugarEntrega: oc.lugarEntrega,
      fechaEntregaEstimada: oc.fechaEntregaEstimada?.toISOString() || null,
      observaciones: oc.observaciones,
    }));

    res.json({ ordenes: ordenesFormateadas });
  } catch (error) {
    console.error('Error al listar órdenes del proveedor:', error);
    res.status(500).json({ error: 'Error al listar órdenes', ordenes: [] });
  }
});

// ============================================
// PORTAL PROVEEDOR - FACTURAS
// ============================================

// POST /api/suppliers/me/facturas - Subir factura asociada a una OC
router.post('/me/facturas', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    // Obtener el proveedor del usuario
    let supplier = await prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier && userEmail) {
      supplier = await prisma.supplier.findFirst({
        where: { email: userEmail },
      });
    }

    if (!supplier) {
      return res.status(404).json({ error: 'No eres un proveedor registrado' });
    }

    const { ordenCompraId, numero, fecha, subtotal, iva, total, items } = req.body;

    console.log(`📄 [/me/facturas] Guardando factura para proveedor ${supplier.nombre}`);
    console.log(`   OC: ${ordenCompraId}, Número: ${numero}, Total: ${total}`);

    // Verificar que la OC existe y pertenece al proveedor
    const ordenCompra = await prisma.purchaseOrderCircuit.findFirst({
      where: {
        id: ordenCompraId,
        proveedorId: supplier.id,
      },
    });

    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    // Buscar el tenant del proveedor por CUIT
    let providerTenant = await prisma.tenant.findFirst({
      where: { taxId: supplier.cuit },
    });

    // Si no existe, crear un tenant temporal para el proveedor
    if (!providerTenant) {
      providerTenant = await prisma.tenant.create({
        data: {
          name: supplier.nombre,
          taxId: supplier.cuit,
          legalName: supplier.nombre,
          country: supplier.pais || 'Argentina',
        },
      });
      console.log(`   Tenant creado para proveedor: ${providerTenant.id}`);
    }

    // El clientTenant es el tenant de la OC
    const clientTenantId = ordenCompra.tenantId;

    // Determinar el tipo de documento
    let docType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RECEIPT' = 'INVOICE';

    // Crear el documento
    // Nota: purchaseOrderId apunta al modelo PurchaseOrder (viejo), no a PurchaseOrderCircuit
    // Guardamos la referencia a la OC del circuito en parseData
    const document = await prisma.document.create({
      data: {
        number: numero || `FC-${Date.now()}`,
        type: docType,
        status: 'PRESENTED',
        amount: parseFloat(subtotal) || 0,
        taxAmount: parseFloat(iva) || 0,
        totalAmount: parseFloat(total) || 0,
        currency: ordenCompra.moneda || 'ARS',
        fileUrl: `/uploads/suppliers/${req.file.filename}`,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        providerTenantId: providerTenant.id,
        clientTenantId: clientTenantId,
        uploadedBy: userId!,
        date: fecha ? new Date(fecha) : new Date(),
        parseStatus: 'COMPLETED',
        parsedAt: new Date(),
        parseData: {
          purchaseOrderCircuitId: ordenCompraId,
          purchaseOrderNumber: ordenCompra.numero,
          uploadedFromPortal: true,
        },
      },
      include: {
        providerTenant: {
          select: { id: true, name: true, taxId: true },
        },
        clientTenant: {
          select: { id: true, name: true, taxId: true },
        },
      },
    });

    // Crear evento de documento
    await prisma.documentEvent.create({
      data: {
        documentId: document.id,
        fromStatus: null,
        toStatus: 'PRESENTED',
        reason: 'Factura presentada por proveedor desde portal',
        userId: userId!,
      },
    });

    // Parsear los items del matching si vienen
    let matchItems = [];
    try {
      if (items) {
        matchItems = JSON.parse(items);
      }
    } catch (e) {
      console.warn('No se pudieron parsear los items del matching');
    }

    console.log(`✅ [/me/facturas] Factura guardada: ${document.id}`);

    res.status(201).json({
      success: true,
      document,
      message: 'Factura guardada correctamente',
    });
  } catch (error) {
    console.error('Error al guardar factura:', error);
    res.status(500).json({ error: 'Error al guardar la factura' });
  }
});

// GET /api/suppliers/me/facturas - Listar facturas del proveedor
router.get('/me/facturas', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    // Obtener el proveedor del usuario
    let supplier = await prisma.supplier.findFirst({
      where: { userId },
    });

    if (!supplier && userEmail) {
      supplier = await prisma.supplier.findFirst({
        where: { email: userEmail },
      });
    }

    if (!supplier) {
      return res.status(404).json({ error: 'No eres un proveedor registrado', facturas: [] });
    }

    // Buscar el tenant del proveedor por CUIT para obtener sus documentos
    const supplierTenant = await prisma.tenant.findFirst({
      where: { taxId: supplier.cuit },
    });

    if (!supplierTenant) {
      return res.json({ facturas: [], message: 'No se encontró tenant asociado' });
    }

    // Obtener documentos donde el proveedor es el emisor
    const documents = await prisma.document.findMany({
      where: {
        providerTenantId: supplierTenant.id,
        type: { in: ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'] },
      },
      include: {
        clientTenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Mapear a formato esperado por el frontend
    const facturas = documents.map(doc => {
      // Extraer info de OC del circuito desde parseData si existe
      const parseData = doc.parseData as any;
      const ocInfo = parseData?.purchaseOrderCircuitId ? {
        id: parseData.purchaseOrderCircuitId,
        numero: parseData.purchaseOrderNumber || '-',
      } : null;

      return {
        id: doc.id,
        numero: doc.number,
        fecha: doc.date?.toISOString() || doc.uploadedAt.toISOString(),
        estado: mapDocumentStatus(doc.status),
        subtotal: Number(doc.amount) || 0,
        iva: Number(doc.taxAmount) || 0,
        total: Number(doc.totalAmount) || 0,
        moneda: doc.currency || 'ARS',
        ordenCompra: ocInfo,
        motivoRechazo: (parseData?.rejectionReason as string) || null,
        fechaAprobacion: null, // No hay campo approvedAt en el modelo
        fechaPago: doc.status === 'PAID' ? doc.updatedAt.toISOString() : null,
        archivoUrl: doc.fileUrl || null,
        cliente: doc.clientTenant?.name || null,
      };
    });

    res.json({ facturas });
  } catch (error) {
    console.error('Error al listar facturas del proveedor:', error);
    res.status(500).json({ error: 'Error al listar facturas', facturas: [] });
  }
});

// Helper para mapear estados de documento
function mapDocumentStatus(status: string): 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'PAGADA' {
  switch (status) {
    case 'APPROVED':
      return 'APROBADA';
    case 'REJECTED':
      return 'RECHAZADA';
    case 'PAID':
      return 'PAGADA';
    default:
      return 'PENDIENTE';
  }
}

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
