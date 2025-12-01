import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import {
  getProveedores,
  getProveedoresForHub,
  getTiposProducto,
  getCategorias,
  getCentrosCosto,
  syncProveedoresToLocal,
  ParametroMaestro,
} from '../services/parseIntegration';

const prisma = new PrismaClient();

const router = Router();

/**
 * GET /api/parametros/proveedores
 * Obtiene proveedores desde Parse, mapeados al formato de Hub
 */
router.get('/proveedores', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('[PARAMETROS] Solicitando proveedores desde Parse...');
    const search = req.query.search as string;
    const result = await getProveedoresForHub({ search });
    console.log(`[PARAMETROS] Obtenidos ${result.proveedores.length} proveedores`);
    res.json(result);
  } catch (error) {
    console.error('[PARAMETROS] Error fetching proveedores:', error);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

/**
 * GET /api/parametros/proveedores/raw
 * Obtiene proveedores desde Parse en formato raw (parametros_maestros)
 */
router.get('/proveedores/raw', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await getProveedores();
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching proveedores raw:', error);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

/**
 * GET /api/parametros/tipos-producto
 * Obtiene tipos de producto desde Parse
 */
router.get('/tipos-producto', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await getTiposProducto();
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching tipos producto:', error);
    res.status(500).json({ error: 'Error al obtener tipos de producto' });
  }
});

/**
 * GET /api/parametros/categorias
 * Obtiene categorías desde Parse
 */
router.get('/categorias', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await getCategorias();
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching categorias:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

/**
 * GET /api/parametros/centros-costo
 * Obtiene centros de costo desde Parse
 */
router.get('/centros-costo', authenticate, async (req: Request, res: Response) => {
  try {
    const data = await getCentrosCosto();
    res.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching centros de costo:', error);
    res.status(500).json({ error: 'Error al obtener centros de costo' });
  }
});

/**
 * POST /api/parametros/proveedores/sync
 * Sincroniza proveedores desde Parse a la tabla Supplier local
 */
router.post('/proveedores/sync', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.tenantId || (req as any).user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId requerido' });
    }

    console.log(`[PARAMETROS] Sincronizando proveedores para tenant ${tenantId}...`);
    const result = await syncProveedoresToLocal(prisma, tenantId);

    res.json({
      success: true,
      message: `Sincronización completada: ${result.created} creados, ${result.updated} actualizados`,
      ...result,
    });
  } catch (error) {
    console.error('[PARAMETROS] Error sincronizando proveedores:', error);
    res.status(500).json({ error: 'Error al sincronizar proveedores' });
  }
});

export default router;
