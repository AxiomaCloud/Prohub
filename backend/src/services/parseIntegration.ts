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

// ============================================
// SYNC DATA - Envío de datos a Parse para ERP
// ============================================

export interface SyncDataRequest {
  entityType: string;
  entityId: string;
  erpType: string;
  payload: any;
  userId?: string;
}

export interface SyncDataResponse {
  success: boolean;
  action?: 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR';
  id?: string;
  version?: number;
  reason?: string;
  error?: string;
}

export interface SyncStatusResponse {
  success: boolean;
  data?: {
    id: string;
    erpType: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    externalId: string | null;
    syncedAt: string | null;
    errorMessage: string | null;
    retryCount: number;
    version: number;
    updatedAt: string;
  } | Array<{
    id: string;
    erpType: string;
    status: string;
    externalId: string | null;
    syncedAt: string | null;
    errorMessage: string | null;
    retryCount: number;
    version: number;
    updatedAt: string;
  }>;
  error?: string;
}

/**
 * Envía datos a Parse para sincronización con ERP
 */
export async function sendToParseSync(data: SyncDataRequest): Promise<SyncDataResponse> {
  if (!PARSE_API_KEY) {
    console.warn('[SYNC] PARSE_API_KEY no configurada');
    return { success: false, error: 'API key not configured' };
  }

  // El endpoint de sync-data está en la raíz de la API (no en /api/v1)
  const baseUrl = PARSE_API_URL_RAW.replace(/\/api\/v1\/?$/, '');
  const url = `${baseUrl}/api/sync-data`;

  console.log(`[SYNC] Enviando ${data.entityType}:${data.entityId} a Parse (${data.erpType})`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': PARSE_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SYNC] Error ${response.status}: ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json() as SyncDataResponse;
    console.log(`[SYNC] Resultado: ${result.action} - ID: ${result.id}`);
    return result;
  } catch (error: any) {
    console.error(`[SYNC] Error enviando a Parse:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Consulta el estado de sincronización de una entidad
 */
export async function getSyncStatus(
  entityType: string,
  entityId: string,
  erpType?: string
): Promise<SyncStatusResponse> {
  if (!PARSE_API_KEY) {
    return { success: false, error: 'API key not configured' };
  }

  const baseUrl = PARSE_API_URL_RAW.replace(/\/api\/v1\/?$/, '');
  let url = `${baseUrl}/api/sync-data/${entityType}/${entityId}/status`;
  if (erpType) {
    url += `?erpType=${erpType}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': PARSE_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return await response.json() as SyncStatusResponse;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Envía una Orden de Compra aprobada a Parse para sincronizar con ERP
 */
export async function syncPurchaseOrderToERP(
  purchaseOrder: any,
  erpType: string = 'AXIOMA'
): Promise<SyncDataResponse> {
  // Construir payload con todos los datos necesarios para el ERP
  const payload = {
    // Identificación
    numero: purchaseOrder.numero,
    id: purchaseOrder.id,

    // Fechas
    fecha: purchaseOrder.fechaEmision,
    fechaAprobacion: purchaseOrder.fechaAprobacionOC,
    fechaEntregaEsperada: purchaseOrder.fechaEntregaEsperada,

    // Proveedor
    proveedor: purchaseOrder.proveedor ? {
      id: purchaseOrder.proveedor.id,
      cuit: purchaseOrder.proveedor.cuit,
      razonSocial: purchaseOrder.proveedor.nombre,
      email: purchaseOrder.proveedor.email,
    } : null,
    proveedorId: purchaseOrder.proveedorId,

    // Montos
    subtotal: purchaseOrder.subtotal,
    impuestos: purchaseOrder.impuestos,
    total: purchaseOrder.total,
    moneda: purchaseOrder.moneda || 'ARS',

    // Items
    items: purchaseOrder.items?.map((item: any) => ({
      numero: item.numero,
      descripcion: item.descripcion,
      codigoProducto: item.codigoProducto,
      cantidad: item.cantidad,
      unidad: item.unidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
      impuestos: item.impuestos,
      total: item.total,
    })) || [],

    // Referencias
    purchaseRequestId: purchaseOrder.purchaseRequestId,
    purchaseRequestNumero: purchaseOrder.purchaseRequest?.numero,

    // Metadata
    estado: purchaseOrder.estado,
    tipoCompra: purchaseOrder.tipoCompra,
    centroCostos: purchaseOrder.centroCostos,
    observaciones: purchaseOrder.observaciones,

    // Usuario
    creadoPorId: purchaseOrder.creadoPorId,
    creadoPorNombre: purchaseOrder.creadoPor?.name,
  };

  return sendToParseSync({
    entityType: 'PURCHASE_ORDER',
    entityId: purchaseOrder.numero || purchaseOrder.id,
    erpType,
    payload,
    userId: purchaseOrder.creadoPorId,
  });
}

// ============================================
// PULL DATA - Consulta de datos desde Parse (ERP → Parse → Hub)
// ============================================

export interface SyncRecord {
  id: string;
  entityType: string;
  entityId: string;
  erpType: string;
  payload: any;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PullDataResponse {
  success: boolean;
  data?: SyncRecord[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  error?: string;
}

/**
 * Consulta datos de sincronización desde Parse (datos que vinieron del ERP)
 */
export async function pullFromParse(
  entityType: string,
  options: {
    status?: string;
    since?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<PullDataResponse> {
  if (!PARSE_API_KEY) {
    return { success: false, error: 'API key not configured' };
  }

  const baseUrl = PARSE_API_URL_RAW.replace(/\/api\/v1\/?$/, '');
  let url = `${baseUrl}/api/sync-data/pull/${entityType}`;

  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.since) params.append('since', options.since);
  if (options.limit) params.append('limit', String(options.limit));
  if (options.offset) params.append('offset', String(options.offset));

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  console.log(`[SYNC] Consultando ${entityType} desde Parse: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': PARSE_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return await response.json() as PullDataResponse;
  } catch (error: any) {
    console.error(`[SYNC] Error consultando ${entityType}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene pagos desde Parse (datos del ERP)
 */
export async function getPagosFromERP(options: { since?: string; limit?: number } = {}): Promise<{
  pagos: any[];
  total: number;
}> {
  const result = await pullFromParse('PAYMENT', {
    status: 'COMPLETED',
    ...options,
  });

  if (!result.success || !result.data) {
    console.error('[SYNC] Error obteniendo pagos:', result.error);
    return { pagos: [], total: 0 };
  }

  // Extraer payload de cada registro
  const pagos = result.data.map(record => ({
    ...record.payload,
    _syncId: record.id,
    _syncVersion: record.version,
    _syncUpdatedAt: record.updatedAt,
  }));

  return {
    pagos,
    total: result.pagination?.total || pagos.length,
  };
}

/**
 * Obtiene actualizaciones de proveedores desde Parse (datos del ERP)
 */
export async function getProveedorUpdatesFromERP(options: { since?: string; limit?: number } = {}): Promise<{
  proveedores: any[];
  total: number;
}> {
  const result = await pullFromParse('SUPPLIER', {
    status: 'COMPLETED',
    ...options,
  });

  if (!result.success || !result.data) {
    return { proveedores: [], total: 0 };
  }

  const proveedores = result.data.map(record => ({
    ...record.payload,
    _syncId: record.id,
    _syncVersion: record.version,
  }));

  return {
    proveedores,
    total: result.pagination?.total || proveedores.length,
  };
}

/**
 * Obtiene confirmaciones de OC desde el ERP
 */
export async function getOCConfirmationsFromERP(options: { since?: string; limit?: number } = {}): Promise<{
  confirmaciones: any[];
  total: number;
}> {
  const result = await pullFromParse('PURCHASE_ORDER_CONFIRMATION', {
    status: 'COMPLETED',
    ...options,
  });

  if (!result.success || !result.data) {
    return { confirmaciones: [], total: 0 };
  }

  const confirmaciones = result.data.map(record => ({
    ...record.payload,
    _syncId: record.id,
  }));

  return {
    confirmaciones,
    total: result.pagination?.total || confirmaciones.length,
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
