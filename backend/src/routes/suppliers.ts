import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { getProveedoresForHub } from '../services/parseIntegration';

const router = Router();
const prisma = new PrismaClient();

// GET /api/suppliers - Listar proveedores del tenant
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const source = req.query.source as string; // 'parse' o 'local'
    const search = req.query.search as string;

    // Si source=parse, obtener desde Parse API
    if (source === 'parse') {
      try {
        const result = await getProveedoresForHub({ search });
        return res.json({
          proveedores: result.proveedores,
          total: result.total,
          source: 'parse'
        });
      } catch (parseError) {
        console.error('Error obteniendo proveedores de Parse:', parseError);
        // Fallback a local si Parse falla
      }
    }

    // Obtener de base de datos local
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId es requerido' });
    }

    const suppliers = await prisma.supplier.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(search && {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { cuit: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { nombre: 'asc' },
    });

    res.json({ proveedores: suppliers, source: 'local' });
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

// GET /api/suppliers/:id - Obtener proveedor por ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findUnique({
      where: { id },
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

// POST /api/suppliers - Crear proveedor
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId, nombre, cuit, direccion, telefono, email, contacto } = req.body;

    if (!tenantId || !nombre || !cuit) {
      return res.status(400).json({ error: 'tenantId, nombre y cuit son requeridos' });
    }

    // Verificar si ya existe
    const existing = await prisma.supplier.findUnique({
      where: {
        tenantId_cuit: { tenantId, cuit },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Ya existe un proveedor con ese CUIT' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        tenantId,
        nombre,
        cuit,
        direccion,
        telefono,
        email,
        contacto,
      },
    });

    res.status(201).json({ proveedor: supplier });
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// PUT /api/suppliers/:id - Actualizar proveedor
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono, email, contacto, isActive } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(nombre && { nombre }),
        ...(direccion !== undefined && { direccion }),
        ...(telefono !== undefined && { telefono }),
        ...(email !== undefined && { email }),
        ...(contacto !== undefined && { contacto }),
        ...(isActive !== undefined && { isActive }),
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

export default router;
