/**
 * Servicio de integración con Parse Backend
 * Consume la API de sync de Parse usando API Key
 */

// PARSE_API_URL puede incluir /api/v1, lo removemos para construir URLs correctamente
const PARSE_API_URL_RAW = process.env.PARSE_API_URL || 'https://parsedemo.axiomacloud.com/api/v1';
// Aseguramos que termine en /api/v1
const PARSE_API_URL = PARSE_API_URL_RAW.replace(/\/api\/v1\/?$/, '') + '/api/v1';
const PARSE_API_KEY = process.env.PARSE_API_KEY || '';
const PARSE_TENANT_ID = process.env.PARSE_TENANT_ID || 'grupolb';

export interface ParametroMaestro {
  id: number | string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  tipo_campo?: string;
  valor_padre?: string;
  orden?: number;
  activo?: boolean;
  tenantId?: string;
  parametros_json?: any;
  createdAt?: string;
  updatedAt?: string;
  // Campos de proveedores (formato Parse)
  razonSocial?: string;
  cuit?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  lastExportedAt?: string;
}

interface SyncDownloadResponse {
  success: boolean;
  data: ParametroMaestro[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
}

/**
 * Descarga parámetros maestros desde Parse usando el endpoint de parametros
 */
async function downloadFromParse(tipoCampo: string): Promise<ParametroMaestro[]> {
  if (!PARSE_API_KEY) {
    console.warn('[PARSE] PARSE_API_KEY no configurada');
    return [];
  }

  // El endpoint de parámetros en Parse es /api/v1/parse/parametros/{tipoCampo}
  const url = `${PARSE_API_URL}/parse/parametros/${tipoCampo}`;

  console.log(`[PARSE] Descargando ${tipoCampo} desde ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': PARSE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PARSE] Error ${response.status}: ${errorText}`);
      throw new Error(`Error fetching ${tipoCampo}: ${response.status}`);
    }

    const result = await response.json() as SyncDownloadResponse;

    if (!result.success) {
      console.error(`[PARSE] Error en respuesta: ${result.error}`);
      throw new Error(result.error || 'Error desconocido');
    }

    console.log(`[PARSE] Obtenidos ${result.data?.length || 0} registros de ${tipoCampo}`);
    return result.data || [];
  } catch (error) {
    console.error(`[PARSE] Error descargando ${tipoCampo}:`, error);
    throw error;
  }
}

/**
 * Obtiene proveedores desde Parse
 */
export async function getProveedores(): Promise<ParametroMaestro[]> {
  return downloadFromParse('proveedores');
}

/**
 * Obtiene tipos de producto desde Parse
 */
export async function getTiposProducto(): Promise<ParametroMaestro[]> {
  return downloadFromParse('tipos_producto');
}

/**
 * Obtiene categorías desde Parse
 */
export async function getCategorias(): Promise<ParametroMaestro[]> {
  return downloadFromParse('categorias');
}

/**
 * Obtiene sectores desde Parse
 */
export async function getSectores(): Promise<ParametroMaestro[]> {
  return downloadFromParse('sector');
}

/**
 * Interfaz de Proveedor para Hub
 */
export interface Supplier {
  id: string;
  nombre: string;
  cuit: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  contacto?: string;
  isActive: boolean;
}

/**
 * Mapea un proveedor de Parse al formato Supplier de Hub
 * Parse devuelve: id, razonSocial, cuit, email, telefono, direccion, activo
 */
export function mapParametroToSupplier(param: ParametroMaestro): Supplier {
  return {
    id: String(param.id),
    nombre: param.razonSocial || param.nombre || '',
    cuit: param.cuit || '',
    direccion: param.direccion,
    telefono: param.telefono,
    email: param.email,
    contacto: param.contacto,
    isActive: param.activo !== false, // Por defecto true
  };
}

/**
 * Obtiene proveedores mapeados al formato de Hub
 */
export async function getProveedoresForHub(options: { search?: string } = {}): Promise<{
  proveedores: Supplier[];
  total: number;
}> {
  const data = await getProveedores();

  let proveedores = data.map(mapParametroToSupplier);

  // Filtrar por búsqueda si se especifica
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    proveedores = proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(searchLower) ||
        p.cuit.toLowerCase().includes(searchLower)
    );
  }

  return {
    proveedores,
    total: proveedores.length,
  };
}

/**
 * Sincroniza proveedores desde Parse a la tabla Supplier local
 * Usa upsert para crear o actualizar según el codigo (ID)
 */
export async function syncProveedoresToLocal(prisma: any, tenantId: string): Promise<{
  created: number;
  updated: number;
  total: number;
}> {
  console.log(`[SYNC] Iniciando sincronización de proveedores para tenant ${tenantId}...`);

  const data = await getProveedores();
  const proveedores = data.map(mapParametroToSupplier);

  let created = 0;
  let updated = 0;

  for (const prov of proveedores) {
    try {
      // Buscar si existe por ID o por CUIT
      const existing = await prisma.supplier.findFirst({
        where: {
          tenantId,
          OR: [
            { id: prov.id },
            { cuit: prov.cuit },
          ],
        },
      });

      if (existing) {
        // Actualizar
        await prisma.supplier.update({
          where: { id: existing.id },
          data: {
            nombre: prov.nombre,
            cuit: prov.cuit || existing.cuit,
            direccion: prov.direccion,
            telefono: prov.telefono,
            email: prov.email,
            contacto: prov.contacto,
            isActive: prov.isActive,
          },
        });
        updated++;
      } else {
        // Crear nuevo
        await prisma.supplier.create({
          data: {
            id: prov.id,
            tenantId,
            nombre: prov.nombre,
            cuit: prov.cuit || prov.id, // Si no hay CUIT, usar el ID
            direccion: prov.direccion,
            telefono: prov.telefono,
            email: prov.email,
            contacto: prov.contacto,
            isActive: prov.isActive,
          },
        });
        created++;
      }
    } catch (error) {
      console.error(`[SYNC] Error sincronizando proveedor ${prov.id}:`, error);
    }
  }

  console.log(`[SYNC] Sincronización completada: ${created} creados, ${updated} actualizados, ${proveedores.length} total`);

  return {
    created,
    updated,
    total: proveedores.length,
  };
}
