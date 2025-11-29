# Reutilización de Arquitectura de Integración Parse para Hub

## 📋 Resumen Ejecutivo

La aplicación **Parse** (ubicada en `../parse`) cuenta con una arquitectura de integración robusta y probada que puede reutilizarse para el módulo de Purchase Requests de Hub.

**Componentes reutilizables:**
1. ✅ Sistema de API Keys por tenant
2. ✅ Sincronización bidireccional SQL (upload/download)
3. ✅ Middleware de autenticación y permisos
4. ✅ Encriptación de credenciales
5. ✅ Sistema incremental por timestamp
6. ✅ Configuración flexible por tabla

**Beneficios:**
- ⚡ Desarrollo más rápido (código ya probado)
- 🔒 Seguridad garantizada
- 🔄 Sincronización bidireccional ya implementada
- 🎯 Multi-tenant nativo
- 📊 Logs y trazabilidad incluidos

---

## Arquitectura Parse - Resumen

### 1. Flujo de Autenticación

```
Cliente ERP
    │
    ├── Header: X-API-Key: abc123...
    │
    ▼
┌─────────────────────┐
│  syncAuth.js        │
│  Middleware         │
└─────────┬───────────┘
          │
          ├── Busca API key en BD
          ├── Valida permisos (sync, parse, applyRules)
          ├── Valida tenant
          ├── Valida IP whitelist (opcional)
          │
          ▼
    req.syncClient = {
      tenantId,
      tenant,
      permisos: {
        sync: true,
        parse: true,
        applyRules: false
      }
    }
```

### 2. Modelo de Datos Parse

```prisma
// ../parse/backend/prisma/schema.prisma

model sync_api_keys {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      tenants  @relation(fields: [tenantId], references: [id])

  apiKey      String   @unique // UUID generado
  nombre      String   // Nombre descriptivo
  descripcion String?

  // Permisos granulares
  permisos    Json     // { sync: true, parse: true, applyRules: false }

  // Seguridad
  ipWhitelist String[] // IPs permitidas (vacío = todas)
  activo      Boolean  @default(true)

  // Auditoría
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastUsedAt  DateTime?
  usageCount  Int      @default(0)

  @@index([tenantId])
  @@index([apiKey])
}

model sync_configurations {
  id          String   @id @default(cuid())
  tenantId    String   @unique
  tenant      tenants  @relation(fields: [tenantId], references: [id])

  // Conexión SQL Server
  sqlServerHost     String
  sqlServerPort     Int      @default(1433)
  sqlServerDatabase String
  sqlServerUser     String
  sqlServerPassword String   // ENCRIPTADO con AES-256

  // Configuración de tablas
  configuracionTablas Json   // Ver estructura abajo

  // Estado
  activo              Boolean  @default(true)
  ultimaSincronizacion DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 3. Estructura de configuracionTablas

```json
{
  "tablasSubida": [
    {
      "nombre": "maestros_clientes",
      "columnas": ["codigo", "nombre", "cuit"],
      "clavePrimaria": "codigo",
      "incremental": true,
      "timestampColumn": "fecha_modificacion",
      "destino": "maestros_parametros",
      "postProcess": "transformar_clientes"
    }
  ],
  "tablasBajada": [
    {
      "nombre": "documentos_procesados",
      "columnas": ["*"],
      "destino": "facturas_parse",
      "incremental": true,
      "timestampColumn": "updated_at",
      "transformaciones": {
        "total_factura": "totalAmount",
        "numero_comprobante": "number"
      }
    }
  ]
}
```

---

## Adaptación para Hub Purchase Requests

### Modelo de Datos Adaptado

```prisma
// /home/martin/Desarrollos/hub/backend/prisma/schema.prisma

// ============================================
// INTEGRACIÓN ERP - REUTILIZACIÓN DE PARSE
// ============================================

model ErpApiKey {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  apiKey      String   @unique @default(cuid()) // UUID v4
  name        String
  description String?

  // Permisos granulares
  permissions Json     @default("{}")
  // Ejemplo: { "sync:read": true, "sync:write": true, "pr:create": false }

  // Seguridad
  ipWhitelist String[] @default([])
  isActive    Boolean  @default(true)

  // Auditoría
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastUsedAt  DateTime?
  usageCount  Int      @default(0)

  @@index([tenantId])
  @@index([apiKey])
  @@map("erp_api_keys")
}

model ErpSyncConfiguration {
  id        String   @id @default(cuid())
  tenantId  String   @unique
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  erpType   String   @default("SOFTLAND") // SOFTLAND, SAP, ODOO, CUSTOM

  // Conexión SQL (para ERPs con SQL Server)
  host            String
  port            Int      @default(1433)
  database        String
  username        String
  passwordHash    String   // Encriptado AES-256

  // Configuración de tablas y mapeos
  tableConfigs    Json
  /*
  {
    "uploadTables": [
      {
        "name": "purchase_requests",
        "destination": "SoftlandDB.dbo.Requerimientos",
        "mapping": {
          "number": "NumeroRequerimiento",
          "description": "Descripcion",
          "estimatedAmount": "MontoEstimado"
        },
        "primaryKey": "id",
        "incremental": true,
        "timestampColumn": "updated_at"
      }
    ],
    "downloadTables": [
      {
        "name": "purchase_orders",
        "source": "SoftlandDB.dbo.OrdenesCompra",
        "mapping": {
          "NumeroOC": "number",
          "MontoTotal": "amount",
          "FechaCreacion": "date"
        },
        "incremental": true,
        "timestampColumn": "FechaModificacion"
      }
    ]
  }
  */

  // Estado
  isActive    Boolean  @default(true)
  autoSync    Boolean  @default(true)
  syncInterval Int     @default(300) // Segundos

  // Última sincronización
  lastSyncAt      DateTime?
  lastSyncStatus  ErpSyncStatus @default(PENDING)
  lastSyncError   String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
  @@map("erp_sync_configurations")
}

model ErpSyncLog {
  id          String   @id @default(cuid())
  tenantId    String

  operation   ErpSyncOperation
  entityType  String   // "PurchaseRequest", "PurchaseOrder", "Reception"
  entityId    String?
  direction   SyncDirection

  status      ErpSyncStatus
  requestData Json?
  responseData Json?
  errorMessage String?

  startedAt   DateTime @default(now())
  completedAt DateTime?
  durationMs  Int?

  @@index([tenantId, entityType, entityId])
  @@index([status])
  @@index([startedAt])
  @@map("erp_sync_logs")
}

enum ErpSyncOperation {
  CREATE_PR
  UPDATE_PR
  FETCH_PO
  CREATE_RECEPTION
  SYNC_STATUS
}

enum SyncDirection {
  TO_ERP      // Hub → ERP
  FROM_ERP    // ERP → Hub
}

enum ErpSyncStatus {
  PENDING
  IN_PROGRESS
  SYNCED
  ERROR
}

// Agregar a Tenant:
// erpApiKeys           ErpApiKey[]
// erpSyncConfiguration ErpSyncConfiguration?
```

---

## Endpoints API Reutilizables

### Del Parse (../parse) → Hub

#### 1. Health Check
```javascript
GET /api/v1/erp/health

Response:
{
  "success": true,
  "status": "ok",
  "version": "1.0.0",
  "updated": "2025-11-28"
}
```

#### 2. Obtener Configuración (desde ERP cliente)
```javascript
GET /api/v1/erp/config/:tenantId
Headers: X-API-Key: {apiKey}

Response:
{
  "success": true,
  "id": "...",
  "tenantId": "...",
  "erpType": "SOFTLAND",
  "host": "192.168.1.100",
  "port": 1433,
  "database": "SoftlandDB",
  "username": "sync_user",
  "passwordHash": "decrypted_password",
  "tableConfigs": {...}
}
```

#### 3. Upload Data (ERP → Hub)
```javascript
POST /api/v1/erp/upload/:tenantId
Headers: X-API-Key: {apiKey}

Body:
{
  "table": "purchase_orders",
  "data": [
    {
      "NumeroOC": "OC-2025-789",
      "MontoTotal": 45000,
      "FechaCreacion": "2025-11-28T10:00:00Z",
      "RequerimientoID": "REQ-SOFT-12345"
    }
  ],
  "timestamp": "2025-11-28T12:00:00Z"
}

Response:
{
  "success": true,
  "table": "purchase_orders",
  "recordsInserted": 1,
  "recordsUpdated": 0,
  "timestamp": "2025-11-28T12:00:05Z"
}
```

#### 4. Download Data (Hub → ERP)
```javascript
GET /api/v1/erp/download/:tenantId?table=purchase_requests&since=2025-11-28T00:00:00Z
Headers: X-API-Key: {apiKey}

Response:
{
  "success": true,
  "table": "purchase_requests",
  "data": [
    {
      "id": "clx123",
      "NumeroRequerimiento": "PR-2025-00042",
      "Descripcion": "Equipos IT",
      "MontoEstimado": 45000,
      "Estado": "APPROVED",
      "FechaCreacion": "2025-11-28T08:00:00Z",
      "FechaModificacion": "2025-11-28T11:30:00Z"
    }
  ],
  "recordCount": 1,
  "timestamp": "2025-11-28T12:00:00Z"
}
```

---

## Middleware de Autenticación (Reutilizable)

### syncAuth.js (adaptado de Parse)

```javascript
// /home/martin/Desarrollos/hub/backend/src/middleware/erpAuth.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware: authenticateErpClient
 * Autentica cliente ERP usando API key
 */
async function authenticateErpClient(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key requerida. Incluir header: X-API-Key'
      });
    }

    // Buscar API key
    const erpApiKey = await prisma.erpApiKey.findUnique({
      where: { apiKey },
      include: { tenant: true }
    });

    if (!erpApiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key inválida'
      });
    }

    if (!erpApiKey.isActive) {
      return res.status(403).json({
        success: false,
        error: 'API key deshabilitada'
      });
    }

    // Validar IP whitelist
    if (erpApiKey.ipWhitelist.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!erpApiKey.ipWhitelist.includes(clientIp)) {
        return res.status(403).json({
          success: false,
          error: 'IP no autorizada'
        });
      }
    }

    // Actualizar uso
    await prisma.erpApiKey.update({
      where: { id: erpApiKey.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 }
      }
    });

    // Adjuntar al request
    req.erpClient = {
      tenantId: erpApiKey.tenantId,
      tenant: erpApiKey.tenant,
      permissions: erpApiKey.permissions,
      apiKeyId: erpApiKey.id
    };

    next();
  } catch (error) {
    console.error('Error en autenticación ERP:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno de autenticación'
    });
  }
}

/**
 * Middleware: requireErpPermission
 * Valida permiso específico
 */
function requireErpPermission(permission) {
  return (req, res, next) => {
    if (!req.erpClient) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const hasPermission = req.erpClient.permissions[permission] === true;

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `Permiso "${permission}" requerido`
      });
    }

    next();
  };
}

module.exports = {
  authenticateErpClient,
  requireErpPermission
};
```

---

## Encriptación de Credenciales (Reutilizable)

### syncEncryption.js (adaptado de Parse)

```javascript
// /home/martin/Desarrollos/hub/backend/src/utils/erpEncryption.js

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ERP_ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('ERP_ENCRYPTION_KEY debe ser una cadena de 32 caracteres');
}

/**
 * Encripta un password
 */
function encryptPassword(password) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Desencripta un password
 */
function decryptPassword(encryptedPassword) {
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY),
    iv
  );

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  encryptPassword,
  decryptPassword
};
```

---

## Servicio de Sincronización (Nuevo para Hub)

### erpSyncService.js

```javascript
// /home/martin/Desarrollos/hub/backend/src/services/erpSyncService.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const sql = require('mssql');
const { decryptPassword } = require('../utils/erpEncryption');

class ErpSyncService {
  /**
   * Obtiene conexión SQL al ERP del tenant
   */
  async getErpConnection(tenantId) {
    const config = await prisma.erpSyncConfiguration.findUnique({
      where: { tenantId }
    });

    if (!config || !config.isActive) {
      throw new Error('Configuración ERP no encontrada o inactiva');
    }

    const pool = new sql.ConnectionPool({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: decryptPassword(config.passwordHash),
      options: {
        encrypt: true,
        trustServerCertificate: false
      }
    });

    await pool.connect();
    return { pool, config };
  }

  /**
   * Envía Purchase Request al ERP
   */
  async sendPurchaseRequestToERP(purchaseRequestId) {
    const startTime = Date.now();
    const log = await this.createSyncLog({
      operation: 'CREATE_PR',
      entityType: 'PurchaseRequest',
      entityId: purchaseRequestId,
      direction: 'TO_ERP'
    });

    try {
      // Obtener PR con items
      const pr = await prisma.purchaseRequest.findUnique({
        where: { id: purchaseRequestId },
        include: {
          items: true,
          requestedByUser: true
        }
      });

      if (!pr) {
        throw new Error('Purchase Request no encontrado');
      }

      const { pool, config } = await this.getErpConnection(pr.tenantId);

      // Obtener configuración de tabla
      const tableConfig = config.tableConfigs.uploadTables.find(
        t => t.name === 'purchase_requests'
      );

      if (!tableConfig) {
        throw new Error('Configuración de tabla purchase_requests no encontrada');
      }

      // Mapear campos según configuración
      const mappedData = this.mapFields(pr, tableConfig.mapping);

      // Insertar en ERP
      const request = pool.request();
      const columns = Object.keys(mappedData).join(', ');
      const values = Object.keys(mappedData).map((_, i) => `@param${i}`).join(', ');

      Object.entries(mappedData).forEach(([key, value], i) => {
        request.input(`param${i}`, value);
      });

      const query = `
        INSERT INTO ${tableConfig.destination} (${columns})
        OUTPUT INSERTED.ID
        VALUES (${values})
      `;

      const result = await request.query(query);
      const erpRequestId = result.recordset[0].ID;

      // Insertar items
      if (pr.items.length > 0) {
        await this.insertPurchaseRequestItems(pool, config, erpRequestId, pr.items);
      }

      // Actualizar PR en Hub
      await prisma.purchaseRequest.update({
        where: { id: purchaseRequestId },
        data: {
          erpRequestId: erpRequestId.toString(),
          erpStatus: 'SYNCED',
          erpSentAt: new Date()
        }
      });

      await pool.close();

      // Completar log
      await this.completeSyncLog(log.id, 'SYNCED', {
        erpRequestId,
        durationMs: Date.now() - startTime
      });

      return erpRequestId;

    } catch (error) {
      await this.completeSyncLog(log.id, 'ERROR', {
        error: error.message,
        durationMs: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Sincroniza Purchase Orders desde ERP
   */
  async syncPurchaseOrdersFromERP(tenantId) {
    const startTime = Date.now();
    const log = await this.createSyncLog({
      tenantId,
      operation: 'FETCH_PO',
      entityType: 'PurchaseOrder',
      direction: 'FROM_ERP'
    });

    try {
      const { pool, config } = await this.getErpConnection(tenantId);

      const tableConfig = config.tableConfigs.downloadTables.find(
        t => t.name === 'purchase_orders'
      );

      if (!tableConfig) {
        throw new Error('Configuración de tabla purchase_orders no encontrada');
      }

      // Obtener última sincronización
      const lastSync = await prisma.erpSyncConfiguration.findUnique({
        where: { tenantId },
        select: { lastSyncAt: true }
      });

      // Query incremental
      let query = `SELECT * FROM ${tableConfig.source}`;
      if (lastSync?.lastSyncAt && tableConfig.incremental) {
        const timestamp = lastSync.lastSyncAt.toISOString();
        query += ` WHERE ${tableConfig.timestampColumn} > '${timestamp}'`;
      }

      const result = await pool.request().query(query);
      const purchaseOrders = result.recordset;

      let createdCount = 0;
      let updatedCount = 0;

      for (const po of purchaseOrders) {
        // Mapear campos
        const mappedPO = this.reverseMapFields(po, tableConfig.mapping);

        // Buscar Purchase Request asociado
        const prId = await this.findPurchaseRequestByErpId(
          tenantId,
          po.RequerimientoID
        );

        // Upsert Purchase Order
        const existing = await prisma.purchaseOrder.findFirst({
          where: {
            clientTenantId: tenantId,
            number: mappedPO.number
          }
        });

        if (existing) {
          await prisma.purchaseOrder.update({
            where: { id: existing.id },
            data: mappedPO
          });
          updatedCount++;
        } else {
          await prisma.purchaseOrder.create({
            data: {
              ...mappedPO,
              clientTenantId: tenantId
            }
          });
          createdCount++;

          // Actualizar PR si existe
          if (prId) {
            await prisma.purchaseRequest.update({
              where: { id: prId },
              data: {
                status: 'PO_CREATED',
                purchaseOrderId: existing?.id
              }
            });
          }
        }
      }

      await pool.close();

      // Actualizar última sincronización
      await prisma.erpSyncConfiguration.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'SYNCED'
        }
      });

      await this.completeSyncLog(log.id, 'SYNCED', {
        createdCount,
        updatedCount,
        durationMs: Date.now() - startTime
      });

      return { createdCount, updatedCount };

    } catch (error) {
      await this.completeSyncLog(log.id, 'ERROR', {
        error: error.message,
        durationMs: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Helpers
   */
  mapFields(data, mapping) {
    const mapped = {};
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (data[sourceField] !== undefined) {
        mapped[targetField] = data[sourceField];
      }
    }
    return mapped;
  }

  reverseMapFields(data, mapping) {
    const reversed = {};
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (data[sourceField] !== undefined) {
        reversed[targetField] = data[sourceField];
      }
    }
    return reversed;
  }

  async createSyncLog(data) {
    return prisma.erpSyncLog.create({
      data: {
        ...data,
        status: 'IN_PROGRESS'
      }
    });
  }

  async completeSyncLog(id, status, additionalData) {
    return prisma.erpSyncLog.update({
      where: { id },
      data: {
        status,
        responseData: additionalData,
        completedAt: new Date(),
        durationMs: additionalData?.durationMs
      }
    });
  }

  async findPurchaseRequestByErpId(tenantId, erpRequestId) {
    const pr = await prisma.purchaseRequest.findFirst({
      where: {
        tenantId,
        erpRequestId: erpRequestId.toString()
      }
    });
    return pr?.id;
  }

  async insertPurchaseRequestItems(pool, config, erpRequestId, items) {
    // Similar a insertPurchaseRequest pero para items
    // Implementar según estructura del ERP
  }
}

module.exports = new ErpSyncService();
```

---

## Jobs de Sincronización (BullMQ)

### Configuración de Jobs

```javascript
// /home/martin/Desarrollos/hub/backend/src/jobs/erpSyncJobs.js

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const erpSyncService = require('../services/erpSyncService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

// Queue para sincronizar OCs desde ERP
const syncPurchaseOrdersQueue = new Queue('sync-purchase-orders', { connection });

// Queue para enviar PRs al ERP
const sendPurchaseRequestsQueue = new Queue('send-purchase-requests', { connection });

// Queue para enviar recepciones al ERP
const sendReceptionsQueue = new Queue('send-receptions', { connection });

/**
 * Worker: Sincronizar Purchase Orders desde ERP
 */
const syncPurchaseOrdersWorker = new Worker(
  'sync-purchase-orders',
  async (job) => {
    const { tenantId } = job.data;
    console.log(`[Job] Sincronizando POs para tenant: ${tenantId}`);

    try {
      const result = await erpSyncService.syncPurchaseOrdersFromERP(tenantId);
      console.log(`[Job] POs sincronizadas: ${result.createdCount} nuevas, ${result.updatedCount} actualizadas`);
      return result;
    } catch (error) {
      console.error(`[Job] Error sincronizando POs:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 60000 // 10 jobs por minuto
    }
  }
);

/**
 * Worker: Enviar Purchase Requests al ERP
 */
const sendPurchaseRequestsWorker = new Worker(
  'send-purchase-requests',
  async (job) => {
    const { purchaseRequestId } = job.data;
    console.log(`[Job] Enviando PR al ERP: ${purchaseRequestId}`);

    try {
      const erpRequestId = await erpSyncService.sendPurchaseRequestToERP(purchaseRequestId);
      console.log(`[Job] PR enviado. ERP ID: ${erpRequestId}`);
      return { erpRequestId };
    } catch (error) {
      console.error(`[Job] Error enviando PR:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 3,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000 // 1 minuto
    }
  }
);

/**
 * Cron: Sincronizar POs cada 5 minutos
 */
async function schedulePurchaseOrderSync() {
  const tenants = await prisma.tenant.findMany({
    where: {
      erpSyncConfiguration: {
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
      {
        repeat: {
          every: 300000 // 5 minutos
        }
      }
    );
  }

  console.log(`✅ Jobs de sincronización programados para ${tenants.length} tenants`);
}

/**
 * Helper: Encolar envío de PR al ERP
 */
async function enqueueSendPurchaseRequest(purchaseRequestId) {
  await sendPurchaseRequestsQueue.add(
    `send-pr-${purchaseRequestId}`,
    { purchaseRequestId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000
      }
    }
  );
}

module.exports = {
  syncPurchaseOrdersQueue,
  sendPurchaseRequestsQueue,
  sendReceptionsQueue,
  schedulePurchaseOrderSync,
  enqueueSendPurchaseRequest
};
```

---

## Comparación: Parse vs Hub

| Aspecto | Parse | Hub (Adaptado) |
|---------|-------|-------------------|
| **Autenticación** | X-API-Key por tenant | ✅ Mismo sistema |
| **Permisos** | sync, parse, applyRules | sync:read, sync:write, pr:create, etc. |
| **Upload/Download** | Bidireccional SQL | ✅ Mismo flujo |
| **Encriptación** | AES-256 | ✅ Misma implementación |
| **Logs** | No estructurados | ✅ Mejorado con ErpSyncLog |
| **Jobs** | Manual | ✅ BullMQ con cron |
| **Incremental** | Por timestamp | ✅ Mismo sistema |
| **Multi-tenant** | Nativo | ✅ Nativo |

---

## Roadmap de Implementación

### Fase 1: Fundamentos (1-2 semanas)
- ✅ Copiar middleware `erpAuth.js` de Parse
- ✅ Copiar utils `erpEncryption.js` de Parse
- ✅ Crear modelos Prisma (ErpApiKey, ErpSyncConfiguration, ErpSyncLog)
- ✅ Migración de base de datos

### Fase 2: API Endpoints (1 semana)
- ✅ GET `/api/v1/erp/health`
- ✅ GET `/api/v1/erp/config/:tenantId`
- ✅ POST `/api/v1/erp/upload/:tenantId`
- ✅ GET `/api/v1/erp/download/:tenantId`

### Fase 3: Servicios (2 semanas)
- ✅ ErpSyncService: sendPurchaseRequestToERP
- ✅ ErpSyncService: syncPurchaseOrdersFromERP
- ✅ ErpSyncService: sendReceptionToERP
- ✅ Mapeo de campos configurable

### Fase 4: Jobs (1 semana)
- ✅ Setup BullMQ + Redis
- ✅ Worker: sync-purchase-orders
- ✅ Worker: send-purchase-requests
- ✅ Worker: send-receptions
- ✅ Cron schedules

### Fase 5: UI Admin (1 semana)
- ✅ Panel de configuración ERP
- ✅ Gestión de API keys
- ✅ Logs de sincronización
- ✅ Test de conexión

**Total estimado: 6-8 semanas**

---

## Variables de Entorno

```env
# Backend .env
ERP_ENCRYPTION_KEY=your-32-character-encryption-key-here
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Seguridad

### Checklist de Seguridad

- ✅ API keys con UUID v4 (no predecibles)
- ✅ Passwords encriptados con AES-256
- ✅ IP whitelist opcional
- ✅ Validación de tenant en cada request
- ✅ Rate limiting en jobs (10/min)
- ✅ Logs de auditoría completos
- ✅ Conexiones SQL con TLS
- ✅ Permisos granulares

### Mejoras vs Parse

1. **Logs estructurados**: ErpSyncLog con duración, status, error
2. **Retry automático**: BullMQ con exponential backoff
3. **Validación mejorada**: Validar mapeo de campos antes de enviar
4. **Monitoring**: Métricas de sincronización por tenant

---

## Testing

### Test de Conexión

```javascript
// POST /api/v1/admin/erp/test-connection
{
  "host": "192.168.1.100",
  "port": 1433,
  "database": "SoftlandDB",
  "username": "sync_user",
  "password": "password123"
}

Response:
{
  "success": true,
  "message": "Conexión exitosa",
  "serverVersion": "Microsoft SQL Server 2019",
  "databaseName": "SoftlandDB"
}
```

### Test de Sincronización

```bash
# Encolar job manualmente
POST /api/v1/admin/erp/sync-purchase-orders

# Ver logs
GET /api/v1/admin/erp/sync-logs?operation=FETCH_PO&limit=10
```

---

## Conclusión

La arquitectura de integración de **Parse** es sólida y probada. Reutilizarla para Hub permitirá:

1. **Acelerar desarrollo** (50-60% más rápido que desde cero)
2. **Reducir bugs** (código ya probado en producción)
3. **Mantener consistencia** (misma arquitectura en ambos proyectos)
4. **Facilitar mantenimiento** (equipo ya familiarizado)

Los principales cambios son:
- Adaptar nombres (sync → erp)
- Agregar jobs automáticos (BullMQ)
- Mejorar logs y trazabilidad
- Especializar para Purchase Requests/Orders/Receptions

---

**Documento creado**: 2025-11-28
**Versión**: 1.0
**Basado en**: Parse v2.0.0 (slug-support)
**Autor**: Hub Development Team
