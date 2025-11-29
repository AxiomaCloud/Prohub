# Integración ERP Softland vía Parse API

## 📋 Resumen

**Arquitectura Real**: Softland NO tiene API, por lo tanto Hub usará **Parse como gateway** para sincronización bidireccional con Softland SQL Server.

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Hub    │◄───────►│    Parse    │◄───────►│  Softland   │
│ (PostgreSQL)│  HTTP   │   API/Sync  │   SQL   │ (SQL Server)│
└─────────────┘         └─────────────┘         └─────────────┘
                             Gateway
```

**Ventajas**:
- ✅ Parse ya tiene infraestructura de sincronización SQL probada
- ✅ No necesitamos reimplementar conexión SQL en Hub
- ✅ Parse maneja encriptación, logs, y errores
- ✅ Multi-tenant ya resuelto en Parse
- ✅ Reutilizamos `/api/sync/upload` y `/api/sync/download`

---

## Arquitectura Actualizada

### Flujo de Datos

#### 1. Hub → Softland (Envío de Purchase Requests)

```
1. Usuario aprueba PR en Hub
   │
   ▼
2. Hub Backend encola job
   │
   ▼
3. Job llama a Parse API:
   POST /api/sync/upload/:tenantId
   Body: {
     "tabla": "requerimientos_compra",
     "data": [{
       "numero": "PR-2025-00042",
       "descripcion": "Equipos IT",
       "monto": 45000,
       ...
     }]
   }
   │
   ▼
4. Parse recibe y procesa:
   - Valida API key de Hub
   - Conecta a Softland SQL
   - Inserta en tabla configurada
   │
   ▼
5. Parse responde:
   {
     "success": true,
     "registrosInsertados": 1
   }
   │
   ▼
6. Hub actualiza PR:
   - erpStatus: SYNCED
   - erpSentAt: timestamp
```

#### 2. Softland → Hub (Sincronización de OCs)

```
1. Job programado en Hub (cada 5 min)
   │
   ▼
2. Hub llama a Parse API:
   GET /api/sync/download/:tenantId?tabla=ordenes_compra&ultimaSync=2025-11-28T00:00:00Z
   │
   ▼
3. Parse ejecuta:
   - Conecta a Softland SQL
   - SELECT * FROM OrdenesCompra WHERE FechaModif > @ultimaSync
   - Mapea campos según configuración
   │
   ▼
4. Parse responde:
   {
     "success": true,
     "tabla": "ordenes_compra",
     "data": [{
       "NumeroOC": "OC-2025-789",
       "MontoTotal": 45000,
       "RequerimientoID": "PR-2025-00042",
       ...
     }]
   }
   │
   ▼
5. Hub procesa datos:
   - Crea/actualiza PurchaseOrder
   - Vincula con PurchaseRequest
   - Actualiza estado a PO_CREATED
```

---

## Configuración en Parse

### 1. Configuración de Tenant en Parse

Cada tenant de Hub debe tener configuración en Parse (`sync_configurations`):

```json
{
  "id": "config-123",
  "tenantId": "tenant-abc",
  "sqlServerHost": "192.168.1.100",
  "sqlServerPort": 1433,
  "sqlServerDatabase": "SoftlandDB",
  "sqlServerUser": "sync_user",
  "sqlServerPassword": "encrypted_password",
  "configuracionTablas": {
    "tablasSubida": [
      {
        "nombre": "requerimientos_compra",
        "destino": "SoftlandDB.dbo.RequerimientosCompra",
        "columnas": ["numero", "descripcion", "monto", "estado", "solicitante"],
        "clavePrimaria": "numero",
        "incremental": false,
        "mapping": {
          "numero": "NumeroRequerimiento",
          "descripcion": "Descripcion",
          "monto": "MontoEstimado",
          "estado": "Estado",
          "solicitante": "SolicitanteID"
        }
      },
      {
        "nombre": "requerimientos_items",
        "destino": "SoftlandDB.dbo.RequerimientosDetalle",
        "columnas": ["numero_req", "linea", "descripcion", "cantidad", "precio_unitario"],
        "clavePrimaria": ["numero_req", "linea"],
        "incremental": false,
        "mapping": {
          "numero_req": "NumeroRequerimiento",
          "linea": "NumeroLinea",
          "descripcion": "DescripcionItem",
          "cantidad": "Cantidad",
          "precio_unitario": "PrecioUnitario"
        }
      },
      {
        "nombre": "recepciones_mercaderia",
        "destino": "SoftlandDB.dbo.Recepciones",
        "columnas": ["numero", "numero_oc", "fecha", "receptor", "observaciones"],
        "clavePrimaria": "numero",
        "incremental": false,
        "mapping": {
          "numero": "NumeroRecepcion",
          "numero_oc": "NumeroOC",
          "fecha": "FechaRecepcion",
          "receptor": "ReceptorID",
          "observaciones": "Observaciones"
        }
      },
      {
        "nombre": "recepciones_items",
        "destino": "SoftlandDB.dbo.RecepcionesDetalle",
        "columnas": ["numero_recepcion", "linea", "cantidad_recibida", "estado_calidad"],
        "clavePrimaria": ["numero_recepcion", "linea"],
        "incremental": false,
        "mapping": {
          "numero_recepcion": "NumeroRecepcion",
          "linea": "NumeroLinea",
          "cantidad_recibida": "CantidadRecibida",
          "estado_calidad": "EstadoCalidad"
        }
      }
    ],
    "tablasBajada": [
      {
        "nombre": "ordenes_compra",
        "origen": "SoftlandDB.dbo.OrdenesCompra",
        "columnas": ["NumeroOC", "NumeroRequerimiento", "MontoTotal", "FechaCreacion", "Estado"],
        "incremental": true,
        "timestampColumn": "FechaModificacion",
        "mapping": {
          "NumeroOC": "numero",
          "NumeroRequerimiento": "numero_requerimiento",
          "MontoTotal": "monto_total",
          "FechaCreacion": "fecha_creacion",
          "Estado": "estado"
        }
      },
      {
        "nombre": "ordenes_compra_items",
        "origen": "SoftlandDB.dbo.OrdenesCompraDetalle",
        "columnas": ["NumeroOC", "NumeroLinea", "DescripcionItem", "Cantidad", "PrecioUnitario"],
        "incremental": true,
        "timestampColumn": "FechaModificacion",
        "relacionPadre": {
          "tabla": "ordenes_compra",
          "campo": "NumeroOC"
        },
        "mapping": {
          "NumeroOC": "numero_oc",
          "NumeroLinea": "linea",
          "DescripcionItem": "descripcion",
          "Cantidad": "cantidad",
          "PrecioUnitario": "precio_unitario"
        }
      }
    ]
  },
  "activo": true
}
```

### 2. API Key de Hub en Parse

Hub necesita un API key en Parse para autenticarse:

```sql
-- En Parse PostgreSQL
INSERT INTO sync_api_keys (
  id,
  tenantId,
  apiKey,
  nombre,
  descripcion,
  permisos,
  activo
) VALUES (
  'key-hub-123',
  'tenant-abc',
  'uuid-v4-generated-key-here',
  'Hub Integration',
  'API key para sincronización Hub <-> Softland',
  '{"sync": true, "parse": false, "applyRules": false}',
  true
);
```

---

## Implementación en Hub

### 1. Servicio de Integración Parse

```javascript
// /home/martin/Desarrollos/hub/backend/src/services/parseIntegrationService.js

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ParseIntegrationService {
  constructor() {
    this.parseApiUrl = process.env.PARSE_API_URL || 'http://localhost:5050';
  }

  /**
   * Obtiene API key de Parse para el tenant
   */
  async getParseApiKey(tenantId) {
    const config = await prisma.parseIntegrationConfig.findUnique({
      where: { tenantId }
    });

    if (!config || !config.isActive) {
      throw new Error('Configuración de Parse no encontrada o inactiva');
    }

    return config.parseApiKey;
  }

  /**
   * Envía Purchase Request a Softland vía Parse
   */
  async sendPurchaseRequestToSoftland(purchaseRequestId) {
    const startTime = Date.now();

    try {
      // Obtener PR con items
      const pr = await prisma.purchaseRequest.findUnique({
        where: { id: purchaseRequestId },
        include: {
          items: true,
          requestedByUser: true,
          tenant: true
        }
      });

      if (!pr) {
        throw new Error('Purchase Request no encontrado');
      }

      const apiKey = await this.getParseApiKey(pr.tenantId);

      // Preparar datos para Parse
      const cabeceraData = {
        numero: pr.number,
        descripcion: pr.description,
        monto: pr.estimatedAmount?.toString(),
        estado: this.mapPRStatusToSoftland(pr.status),
        solicitante: pr.requestedByUser.name,
        departamento: pr.department,
        fecha_creacion: pr.createdAt.toISOString(),
        fecha_necesidad: pr.neededByDate?.toISOString()
      };

      const itemsData = pr.items.map((item, index) => ({
        numero_req: pr.number,
        linea: item.lineNumber,
        descripcion: item.description,
        cantidad: item.quantity.toString(),
        unidad: item.unit,
        precio_unitario: item.estimatedUnitPrice?.toString()
      }));

      // Enviar cabecera
      const cabeceraResponse = await axios.post(
        `${this.parseApiUrl}/api/sync/upload/${pr.tenant.slug || pr.tenantId}`,
        {
          tabla: 'requerimientos_compra',
          data: [cabeceraData],
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!cabeceraResponse.data.success) {
        throw new Error(`Error en Parse: ${cabeceraResponse.data.error}`);
      }

      // Enviar items
      if (itemsData.length > 0) {
        const itemsResponse = await axios.post(
          `${this.parseApiUrl}/api/sync/upload/${pr.tenant.slug || pr.tenantId}`,
          {
            tabla: 'requerimientos_items',
            data: itemsData,
            timestamp: new Date().toISOString()
          },
          {
            headers: {
              'X-API-Key': apiKey,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!itemsResponse.data.success) {
          throw new Error(`Error enviando items: ${itemsResponse.data.error}`);
        }
      }

      // Actualizar PR
      await prisma.purchaseRequest.update({
        where: { id: purchaseRequestId },
        data: {
          erpRequestId: pr.number, // Usamos el número como ID en Softland
          erpStatus: 'SYNCED',
          erpSentAt: new Date()
        }
      });

      // Log de sincronización
      await prisma.erpSyncLog.create({
        data: {
          tenantId: pr.tenantId,
          operation: 'CREATE_PR',
          entityType: 'PurchaseRequest',
          entityId: purchaseRequestId,
          direction: 'TO_ERP',
          status: 'SYNCED',
          requestData: { cabeceraData, itemsData },
          responseData: {
            cabecera: cabeceraResponse.data,
            items: itemsData.length > 0 ? itemsResponse.data : null
          },
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        }
      });

      console.log(`✅ PR ${pr.number} enviado a Softland vía Parse`);

      return pr.number;

    } catch (error) {
      // Log de error
      await prisma.erpSyncLog.create({
        data: {
          tenantId: pr?.tenantId,
          operation: 'CREATE_PR',
          entityType: 'PurchaseRequest',
          entityId: purchaseRequestId,
          direction: 'TO_ERP',
          status: 'ERROR',
          errorMessage: error.message,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        }
      });

      // Actualizar PR con error
      if (pr) {
        await prisma.purchaseRequest.update({
          where: { id: purchaseRequestId },
          data: {
            erpStatus: 'ERROR',
            erpError: error.message
          }
        });
      }

      throw error;
    }
  }

  /**
   * Sincroniza Purchase Orders desde Softland vía Parse
   */
  async syncPurchaseOrdersFromSoftland(tenantId) {
    const startTime = Date.now();

    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      const apiKey = await this.getParseApiKey(tenantId);

      // Obtener última sincronización
      const config = await prisma.parseIntegrationConfig.findUnique({
        where: { tenantId }
      });

      const ultimaSync = config?.lastSyncAt?.toISOString();

      // Llamar a Parse para obtener OCs
      const params = new URLSearchParams({
        tabla: 'ordenes_compra'
      });

      if (ultimaSync) {
        params.append('ultimaSync', ultimaSync);
      }

      const response = await axios.get(
        `${this.parseApiUrl}/api/sync/download/${tenant.slug || tenantId}?${params}`,
        {
          headers: {
            'X-API-Key': apiKey
          }
        }
      );

      if (!response.data.success) {
        throw new Error(`Error en Parse: ${response.data.error}`);
      }

      const ordenesCompra = response.data.data || [];
      let createdCount = 0;
      let updatedCount = 0;

      for (const oc of ordenesCompra) {
        // Buscar si ya existe
        const existing = await prisma.purchaseOrder.findFirst({
          where: {
            clientTenantId: tenantId,
            number: oc.numero
          }
        });

        // Buscar PR asociado
        const pr = await prisma.purchaseRequest.findFirst({
          where: {
            tenantId,
            number: oc.numero_requerimiento
          }
        });

        const poData = {
          number: oc.numero,
          amount: parseFloat(oc.monto_total),
          status: this.mapSoftlandStatusToPO(oc.estado),
          date: new Date(oc.fecha_creacion),
          clientTenantId: tenantId
        };

        if (existing) {
          // Actualizar
          await prisma.purchaseOrder.update({
            where: { id: existing.id },
            data: poData
          });
          updatedCount++;
        } else {
          // Crear
          const newPO = await prisma.purchaseOrder.create({
            data: poData
          });
          createdCount++;

          // Actualizar PR si existe
          if (pr) {
            await prisma.purchaseRequest.update({
              where: { id: pr.id },
              data: {
                status: 'PO_CREATED',
                purchaseOrderId: newPO.id
              }
            });

            // TODO: Notificar al solicitante
          }
        }
      }

      // Actualizar última sincronización
      await prisma.parseIntegrationConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SYNCED'
        }
      });

      // Log
      await prisma.erpSyncLog.create({
        data: {
          tenantId,
          operation: 'FETCH_PO',
          entityType: 'PurchaseOrder',
          direction: 'FROM_ERP',
          status: 'SYNCED',
          responseData: {
            createdCount,
            updatedCount,
            totalRecords: ordenesCompra.length
          },
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        }
      });

      console.log(`✅ Sincronizadas ${createdCount} OCs nuevas, ${updatedCount} actualizadas`);

      return { createdCount, updatedCount };

    } catch (error) {
      await prisma.erpSyncLog.create({
        data: {
          tenantId,
          operation: 'FETCH_PO',
          entityType: 'PurchaseOrder',
          direction: 'FROM_ERP',
          status: 'ERROR',
          errorMessage: error.message,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        }
      });

      throw error;
    }
  }

  /**
   * Envía Recepción a Softland vía Parse
   */
  async sendReceptionToSoftland(receptionId) {
    const startTime = Date.now();

    try {
      const reception = await prisma.purchaseReception.findUnique({
        where: { id: receptionId },
        include: {
          items: true,
          purchaseOrder: true,
          tenant: true,
          receivedByUser: true
        }
      });

      if (!reception) {
        throw new Error('Recepción no encontrada');
      }

      const apiKey = await this.getParseApiKey(reception.tenantId);

      // Preparar datos
      const cabeceraData = {
        numero: reception.number,
        numero_oc: reception.purchaseOrder.number,
        fecha: reception.receptionDate.toISOString(),
        receptor: reception.receivedByUser.name,
        numero_remito: reception.deliveryNoteNumber,
        observaciones: reception.notes
      };

      const itemsData = reception.items.map(item => ({
        numero_recepcion: reception.number,
        linea: item.purchaseRequestItem?.lineNumber || 1,
        cantidad_ordenada: item.quantityOrdered.toString(),
        cantidad_recibida: item.quantityReceived.toString(),
        estado_calidad: item.qualityStatus,
        observaciones_discrepancia: item.discrepancyReason
      }));

      // Enviar cabecera
      const cabeceraResponse = await axios.post(
        `${this.parseApiUrl}/api/sync/upload/${reception.tenant.slug || reception.tenantId}`,
        {
          tabla: 'recepciones_mercaderia',
          data: [cabeceraData],
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!cabeceraResponse.data.success) {
        throw new Error(`Error en Parse: ${cabeceraResponse.data.error}`);
      }

      // Enviar items
      const itemsResponse = await axios.post(
        `${this.parseApiUrl}/api/sync/upload/${reception.tenant.slug || reception.tenantId}`,
        {
          tabla: 'recepciones_items',
          data: itemsData,
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!itemsResponse.data.success) {
        throw new Error(`Error enviando items: ${itemsResponse.data.error}`);
      }

      // Actualizar recepción
      await prisma.purchaseReception.update({
        where: { id: receptionId },
        data: {
          erpReceptionId: reception.number,
          erpStatus: 'SYNCED',
          erpSentAt: new Date()
        }
      });

      // Log
      await prisma.erpSyncLog.create({
        data: {
          tenantId: reception.tenantId,
          operation: 'CREATE_RECEPTION',
          entityType: 'PurchaseReception',
          entityId: receptionId,
          direction: 'TO_ERP',
          status: 'SYNCED',
          requestData: { cabeceraData, itemsData },
          responseData: {
            cabecera: cabeceraResponse.data,
            items: itemsResponse.data
          },
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        }
      });

      console.log(`✅ Recepción ${reception.number} enviada a Softland vía Parse`);

      return reception.number;

    } catch (error) {
      await prisma.erpSyncLog.create({
        data: {
          tenantId: reception?.tenantId,
          operation: 'CREATE_RECEPTION',
          entityType: 'PurchaseReception',
          entityId: receptionId,
          direction: 'TO_ERP',
          status: 'ERROR',
          errorMessage: error.message,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        }
      });

      if (reception) {
        await prisma.purchaseReception.update({
          where: { id: receptionId },
          data: {
            erpStatus: 'ERROR',
            erpError: error.message
          }
        });
      }

      throw error;
    }
  }

  /**
   * Helpers para mapeo de estados
   */
  mapPRStatusToSoftland(status) {
    const mapping = {
      'DRAFT': 'BORRADOR',
      'PENDING': 'PENDIENTE',
      'IN_APPROVAL': 'EN_APROBACION',
      'APPROVED': 'APROBADO',
      'SENT_TO_ERP': 'ENVIADO',
      'PO_CREATED': 'OC_CREADA',
      'REJECTED': 'RECHAZADO',
      'CANCELLED': 'CANCELADO'
    };
    return mapping[status] || status;
  }

  mapSoftlandStatusToPO(status) {
    const mapping = {
      'ACTIVA': 'ACTIVE',
      'COMPLETADA': 'COMPLETED',
      'CANCELADA': 'CANCELLED'
    };
    return mapping[status] || 'ACTIVE';
  }
}

module.exports = new ParseIntegrationService();
```

---

## Modelo de Datos Hub

### Configuración de Parse por Tenant

```prisma
// Agregar a schema.prisma de Hub

model ParseIntegrationConfig {
  id          String   @id @default(cuid())
  tenantId    String   @unique
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Conexión a Parse API
  parseApiUrl String   @default("http://localhost:5050")
  parseApiKey String   // API key en Parse (sync_api_keys)

  // Estado
  isActive    Boolean  @default(true)
  autoSync    Boolean  @default(true)
  syncInterval Int     @default(300) // Segundos

  // Última sincronización
  lastSyncAt      DateTime?
  lastSyncStatus  String?
  lastSyncError   String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("parse_integration_configs")
}

// Agregar a Tenant:
// parseIntegrationConfig ParseIntegrationConfig?
```

---

## Jobs de Sincronización

```javascript
// /home/martin/Desarrollos/hub/backend/src/jobs/parseIntegrationJobs.js

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const parseIntegrationService = require('../services/parseIntegrationService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

const syncPurchaseOrdersQueue = new Queue('sync-purchase-orders-parse', { connection });
const sendPurchaseRequestsQueue = new Queue('send-purchase-requests-parse', { connection });

/**
 * Worker: Sincronizar OCs desde Softland vía Parse
 */
const syncPurchaseOrdersWorker = new Worker(
  'sync-purchase-orders-parse',
  async (job) => {
    const { tenantId } = job.data;
    console.log(`[Job Parse] Sincronizando OCs para tenant: ${tenantId}`);

    try {
      const result = await parseIntegrationService.syncPurchaseOrdersFromSoftland(tenantId);
      return result;
    } catch (error) {
      console.error(`[Job Parse] Error:`, error);
      throw error;
    }
  },
  { connection, concurrency: 3 }
);

/**
 * Worker: Enviar PRs a Softland vía Parse
 */
const sendPurchaseRequestsWorker = new Worker(
  'send-purchase-requests-parse',
  async (job) => {
    const { purchaseRequestId } = job.data;
    console.log(`[Job Parse] Enviando PR: ${purchaseRequestId}`);

    try {
      const erpId = await parseIntegrationService.sendPurchaseRequestToSoftland(purchaseRequestId);
      return { erpId };
    } catch (error) {
      console.error(`[Job Parse] Error:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 }
  }
);

/**
 * Programar sincronización automática
 */
async function schedulePurchaseOrderSync() {
  const tenants = await prisma.tenant.findMany({
    where: {
      parseIntegrationConfig: {
        isActive: true,
        autoSync: true
      }
    },
    select: { id: true, name: true }
  });

  for (const tenant of tenants) {
    await syncPurchaseOrdersQueue.add(
      `sync-pos-${tenant.id}`,
      { tenantId: tenant.id },
      { repeat: { every: 300000 } } // 5 minutos
    );
  }

  console.log(`✅ Jobs de sync programados para ${tenants.length} tenants`);
}

module.exports = {
  syncPurchaseOrdersQueue,
  sendPurchaseRequestsQueue,
  schedulePurchaseOrderSync
};
```

---

## Ventajas de esta Arquitectura

### ✅ Beneficios

1. **No reinventar la rueda**
   - Parse ya maneja conexión SQL Server
   - Encriptación de credenciales ya implementada
   - Logs y manejo de errores probado

2. **Separación de responsabilidades**
   - Hub: Lógica de negocio Purchase Requests
   - Parse: Gateway SQL (sincronización pura)
   - Softland: ERP sin modificar

3. **Flexibilidad**
   - Si cambia el ERP, solo se reconfigura Parse
   - Hub no necesita cambios
   - Misma API para múltiples ERPs

4. **Seguridad**
   - Credenciales SQL nunca están en Hub
   - Solo Parse tiene acceso directo a Softland
   - API keys controladas por Parse

5. **Escalabilidad**
   - Parse puede manejar múltiples clientes Hub
   - Cada tenant Hub = 1 tenant Parse
   - Sincronización independiente por tenant

### ⚠️ Consideraciones

1. **Dependencia de Parse**
   - Hub depende de que Parse esté disponible
   - Solución: Health checks + circuit breaker

2. **Latencia adicional**
   - Hub → Parse → Softland (2 saltos HTTP)
   - Mitigation: Jobs asíncronos, no crítico

3. **Mapeo de campos**
   - Debe estar configurado correctamente en Parse
   - Documentar mapeos por tenant

---

## Setup Inicial

### 1. En Parse (por cada tenant)

```bash
# Crear tenant en Parse si no existe
POST /api/tenants
{
  "nombre": "Cliente ABC",
  "slug": "cliente-abc"
}

# Crear API key para Hub
POST /api/sync-api-keys
{
  "tenantId": "tenant-abc-id",
  "nombre": "Hub Integration",
  "permisos": {
    "sync": true
  }
}
# Guardar el apiKey generado

# Configurar sync con Softland
POST /api/sync-configurations
{
  "tenantId": "tenant-abc-id",
  "sqlServerHost": "192.168.1.100",
  "sqlServerPort": 1433,
  "sqlServerDatabase": "SoftlandDB",
  "sqlServerUser": "sync_user",
  "sqlServerPassword": "password123",
  "configuracionTablas": { ... }
}
```

### 2. En Hub

```bash
# Crear configuración de Parse
POST /api/v1/admin/parse-integration
{
  "tenantId": "hub-tenant-id",
  "parseApiUrl": "http://parse-server:5050",
  "parseApiKey": "api-key-from-parse",
  "autoSync": true,
  "syncInterval": 300
}
```

### 3. Variables de Entorno

```env
# Hub backend/.env
PARSE_API_URL=http://localhost:5050
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Testing

### Test de Conexión

```javascript
// POST /api/v1/admin/parse-integration/test
{
  "parseApiUrl": "http://localhost:5050",
  "parseApiKey": "test-key"
}

// Internamente hace:
GET http://localhost:5050/api/sync/health
Headers: X-API-Key: test-key

// Si responde 200 OK → conexión exitosa
```

### Test de Sincronización Manual

```bash
# Sincronizar OCs ahora
POST /api/v1/admin/sync/purchase-orders/manual
{
  "tenantId": "tenant-123"
}

# Ver logs
GET /api/v1/admin/sync-logs?limit=10
```

---

## Diagrama de Secuencia Completo

```
Usuario    Hub      BullMQ      Parse       Softland
  │          │           │           │            │
  │─Crea PR─►│           │           │            │
  │          │           │           │            │
  │          │─Aprueba──►│           │            │
  │          │           │           │            │
  │          │──Job PR──►│           │            │
  │          │           │           │            │
  │          │           │─Send PR──►│            │
  │          │           │           │            │
  │          │           │           │──INSERT───►│
  │          │           │           │◄──OK───────│
  │          │           │           │            │
  │          │           │◄──OK──────│            │
  │          │◄─Update PR│           │            │
  │          │  (SYNCED) │           │            │
  │          │           │           │            │
  │          │           │           │            │
  │          │◄─Job 5min─│           │            │
  │          │           │           │            │
  │          │──Sync OCs─►│          │            │
  │          │           │           │            │
  │          │           │─Download─►│            │
  │          │           │           │            │
  │          │           │           │──SELECT───►│
  │          │           │           │◄──Data─────│
  │          │           │           │            │
  │          │           │◄─OC Data──│            │
  │          │           │           │            │
  │          │─Create PO─│           │            │
  │          │─Update PR─│           │            │
  │◄Notif PO─│  (PO_CREATED)         │            │
```

---

## Conclusión

**Arquitectura Final**: Hub → Parse API → Softland SQL

- ✅ Más simple que conectar directamente a SQL
- ✅ Reutiliza infraestructura probada de Parse
- ✅ Misma seguridad y encriptación
- ✅ Fácil de testear y debuggear
- ✅ Flexible para agregar otros ERPs

**Próximos pasos**:
1. Configurar tenants en Parse
2. Crear API keys para Hub
3. Implementar `parseIntegrationService.js`
4. Setup jobs BullMQ
5. Testear flujo completo

---

**Documento creado**: 2025-11-28
**Versión**: 2.0 (Arquitectura vía Parse)
**Autor**: Hub Development Team
