# Implementación de Sync en Parse - Plan Detallado

**Fecha**: 28 Diciembre 2025
**Objetivo**: Agregar tabla genérica `sync_data` en Parse para recibir datos de Hub y sincronizarlos al ERP

---

## Resumen

Agregar a Parse la capacidad de:
1. Recibir datos de Hub (OCs, recepciones, etc.)
2. Guardarlos en una tabla genérica con payload JSONB
3. Procesarlos y enviarlos al ERP (Axioma/Softland)

---

## Checklist de Implementación

### FASE 1: Schema de Base de Datos

- [ ] **1.1** Agregar modelo `sync_entity_config` al schema.prisma de Parse
- [ ] **1.2** Agregar modelo `sync_data` al schema.prisma de Parse
- [ ] **1.3** Agregar relaciones al modelo `tenants`
- [ ] **1.4** Ejecutar `npx prisma db push` o `prisma migrate dev`
- [ ] **1.5** Verificar tablas creadas en base de datos

### FASE 2: Servicio de Sincronización

- [ ] **2.1** Crear archivo `backend/src/services/syncDataService.js`
- [ ] **2.2** Implementar método `enqueue()` - Encolar datos para sync
- [ ] **2.3** Implementar método `getByEntity()` - Obtener datos por entidad
- [ ] **2.4** Implementar método `markAsSynced()` - Marcar como sincronizado
- [ ] **2.5** Implementar método `processQueue()` - Procesar cola y enviar a ERP

### FASE 3: API Endpoints

- [ ] **3.1** Crear archivo `backend/src/routes/syncData.js`
- [ ] **3.2** Endpoint `POST /api/sync-data` - Recibir datos de Hub
- [ ] **3.3** Endpoint `GET /api/sync-data/:entityType` - Listar por tipo
- [ ] **3.4** Endpoint `GET /api/sync-data/:entityType/:entityId/status` - Estado de un registro
- [ ] **3.5** Endpoint `POST /api/sync-data/process` - Trigger manual de procesamiento
- [ ] **3.6** Registrar rutas en `server.js`

### FASE 4: Integración con Hub

- [ ] **4.1** Crear `SyncService.ts` en Hub
- [ ] **4.2** Llamar a Parse cuando se aprueba una OC
- [ ] **4.3** Mostrar estado de sync en UI de OC

### FASE 5: Testing

- [ ] **5.1** Test: Enviar OC de prueba desde Hub
- [ ] **5.2** Test: Verificar que se guarda en sync_data
- [ ] **5.3** Test: Verificar que se procesa y llega al ERP

---

## Código a Agregar

### 1. Schema Prisma (Parse)

**Archivo**: `D:\Desarrollos\React\parse\backend\prisma\schema.prisma`

**Agregar al final del archivo**:

```prisma
// ============================================
// SISTEMA DE SINCRONIZACIÓN GENÉRICA (HUB ↔ ERP)
// ============================================

// Configuración por entidad/ERP (Schema Registry)
model sync_entity_config {
  id              String   @id @default(uuid())
  tenantId        String

  // Identificación
  entityType      String   @db.VarChar(50)   // 'PURCHASE_ORDER', 'RECEPTION', 'SUPPLIER'
  erpType         String   @db.VarChar(20)   // 'AXIOMA', 'SOFTLAND'

  // Tabla origen/destino en el ERP
  sourceTable     String?  @db.VarChar(100)  // Tabla en el ERP
  primaryKey      String?  @db.VarChar(50)   // Campo PK en el ERP
  timestampField  String?  @db.VarChar(50)   // Campo para sync incremental

  // Queries SQL para el ERP
  queries         Json                        // { select_all, select_since, insert, update }

  // Mapeo de campos Hub ↔ ERP
  fieldMapping    Json                        // { hub_to_erp: {}, erp_to_hub: {} }

  // Reglas de transformación
  transformRules  Json?                       // { campo: { type, format } }

  // Configuración
  direction       String   @db.VarChar(10)   // 'IN', 'OUT', 'BOTH'
  enabled         Boolean  @default(true)
  syncFrequency   String?  @db.VarChar(20)   // 'realtime', 'hourly', 'daily'

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenants         tenants  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sync_data       sync_data[]

  @@unique([tenantId, entityType, erpType])
  @@index([tenantId])
  @@index([entityType])
  @@index([enabled])
}

// Datos a sincronizar (payload genérico JSONB)
model sync_data {
  id              String   @id @default(uuid())
  tenantId        String

  // Referencia a config (opcional)
  configId        String?

  // Identificación del registro
  entityType      String   @db.VarChar(50)   // 'PURCHASE_ORDER', 'RECEPTION'
  entityId        String   @db.VarChar(100)  // ID en Hub (ej: OC-2025-001)
  erpType         String   @db.VarChar(20)   // 'AXIOMA', 'SOFTLAND'

  // Payload genérico (cualquier estructura)
  payload         Json                        // Datos completos del registro

  // Control de cambios
  payloadHash     String?  @db.VarChar(64)   // SHA256 para detectar cambios
  version         Int      @default(1)

  // Dirección y estado
  direction       String   @db.VarChar(10)   // 'OUT' (Hub→ERP), 'IN' (ERP→Hub)
  status          String   @default("PENDING") @db.VarChar(20) // PENDING, PROCESSING, COMPLETED, FAILED

  // Resultado de sincronización
  externalId      String?  @db.VarChar(100)  // ID asignado por el ERP
  syncedAt        DateTime?
  errorMessage    String?  @db.Text
  retryCount      Int      @default(0)

  // Origen
  sourceSystem    String   @db.VarChar(20)   // 'HUB', 'ERP'
  sourceUserId    String?                    // Usuario que originó el cambio

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenants         tenants  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  config          sync_entity_config? @relation(fields: [configId], references: [id])

  @@unique([tenantId, entityType, entityId, erpType])
  @@index([tenantId, status])
  @@index([entityType, entityId])
  @@index([status, createdAt])
  @@index([erpType])
}
```

### 2. Actualizar modelo Tenants

**Agregar relaciones al modelo `tenants`** (buscar la lista de relaciones y agregar):

```prisma
  // En el modelo tenants, agregar estas líneas:
  sync_entity_config    sync_entity_config[]
  sync_data             sync_data[]
```

### 3. Servicio de Sincronización

**Archivo**: `D:\Desarrollos\React\parse\backend\src\services\syncDataService.js`

```javascript
/**
 * Servicio de Sincronización Genérica
 * Maneja la cola de datos entre Hub y ERPs
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

class SyncDataService {
  /**
   * Encolar datos para sincronización
   */
  static async enqueue({
    tenantId,
    entityType,
    entityId,
    erpType,
    payload,
    direction = 'OUT',
    sourceSystem = 'HUB',
    sourceUserId = null
  }) {
    // Calcular hash del payload
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');

    // Buscar si ya existe
    const existing = await prisma.sync_data.findUnique({
      where: {
        tenantId_entityType_entityId_erpType: {
          tenantId,
          entityType,
          entityId,
          erpType
        }
      }
    });

    if (existing) {
      // Si el payload es igual, no hacer nada
      if (existing.payloadHash === payloadHash && existing.status === 'COMPLETED') {
        return { action: 'SKIP', reason: 'No changes detected', id: existing.id };
      }

      // Actualizar registro existente
      const updated = await prisma.sync_data.update({
        where: { id: existing.id },
        data: {
          payload,
          payloadHash,
          version: existing.version + 1,
          status: 'PENDING',
          errorMessage: null,
          retryCount: 0,
          updatedAt: new Date()
        }
      });

      return { action: 'UPDATE', id: updated.id };
    }

    // Crear nuevo registro
    const created = await prisma.sync_data.create({
      data: {
        tenantId,
        entityType,
        entityId,
        erpType,
        payload,
        payloadHash,
        direction,
        sourceSystem,
        sourceUserId,
        status: 'PENDING'
      }
    });

    return { action: 'CREATE', id: created.id };
  }

  /**
   * Obtener registros pendientes para procesar
   */
  static async getPending({ tenantId, entityType, erpType, limit = 100 }) {
    const where = {
      status: 'PENDING',
      retryCount: { lt: 3 }
    };

    if (tenantId) where.tenantId = tenantId;
    if (entityType) where.entityType = entityType;
    if (erpType) where.erpType = erpType;

    return prisma.sync_data.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit
    });
  }

  /**
   * Marcar como procesando
   */
  static async markAsProcessing(id) {
    return prisma.sync_data.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        updatedAt: new Date()
      }
    });
  }

  /**
   * Marcar como completado
   */
  static async markAsCompleted(id, externalId = null) {
    return prisma.sync_data.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        externalId,
        syncedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Marcar como fallido
   */
  static async markAsFailed(id, errorMessage) {
    const record = await prisma.sync_data.findUnique({ where: { id } });

    return prisma.sync_data.update({
      where: { id },
      data: {
        status: record.retryCount >= 2 ? 'FAILED' : 'PENDING',
        errorMessage,
        retryCount: record.retryCount + 1,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Obtener estado de un registro
   */
  static async getStatus(tenantId, entityType, entityId) {
    return prisma.sync_data.findFirst({
      where: { tenantId, entityType, entityId },
      select: {
        id: true,
        status: true,
        externalId: true,
        syncedAt: true,
        errorMessage: true,
        retryCount: true,
        version: true,
        updatedAt: true
      }
    });
  }

  /**
   * Obtener estadísticas
   */
  static async getStats(tenantId) {
    const stats = await prisma.sync_data.groupBy({
      by: ['entityType', 'status'],
      where: { tenantId },
      _count: true
    });

    return stats;
  }
}

module.exports = SyncDataService;
```

### 4. API Endpoints

**Archivo**: `D:\Desarrollos\React\parse\backend\src\routes\syncData.js`

```javascript
/**
 * API de Sincronización Genérica
 * Endpoints para recibir datos de Hub y sincronizar con ERPs
 */

const express = require('express');
const router = express.Router();
const SyncDataService = require('../services/syncDataService');
const { requireSyncPermission } = require('../middleware/syncAuth');

/**
 * POST /api/sync-data
 * Recibir datos de Hub para sincronizar
 */
router.post('/', requireSyncPermission('sync'), async (req, res) => {
  try {
    const { entityType, entityId, erpType, payload } = req.body;
    const tenantId = req.syncClient?.tenantId;

    if (!entityType || !entityId || !erpType || !payload) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: entityType, entityId, erpType, payload'
      });
    }

    const result = await SyncDataService.enqueue({
      tenantId,
      entityType,
      entityId,
      erpType,
      payload,
      direction: 'OUT',
      sourceSystem: 'HUB',
      sourceUserId: req.body.userId || null
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[SYNC-DATA] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sync-data/batch
 * Recibir múltiples registros
 */
router.post('/batch', requireSyncPermission('sync'), async (req, res) => {
  try {
    const { items } = req.body;
    const tenantId = req.syncClient?.tenantId;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere array de items'
      });
    }

    const results = [];
    for (const item of items) {
      try {
        const result = await SyncDataService.enqueue({
          tenantId,
          ...item,
          direction: 'OUT',
          sourceSystem: 'HUB'
        });
        results.push({ entityId: item.entityId, ...result });
      } catch (err) {
        results.push({ entityId: item.entityId, action: 'ERROR', error: err.message });
      }
    }

    res.json({
      success: true,
      results,
      total: items.length,
      processed: results.filter(r => r.action !== 'ERROR').length
    });

  } catch (error) {
    console.error('[SYNC-DATA] Error batch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync-data/:entityType/:entityId/status
 * Obtener estado de sincronización de un registro
 */
router.get('/:entityType/:entityId/status', requireSyncPermission('sync'), async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const tenantId = req.syncClient?.tenantId;

    const status = await SyncDataService.getStatus(tenantId, entityType, entityId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Registro no encontrado'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('[SYNC-DATA] Error status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync-data/pending
 * Listar registros pendientes
 */
router.get('/pending', requireSyncPermission('sync'), async (req, res) => {
  try {
    const tenantId = req.syncClient?.tenantId;
    const { entityType, erpType, limit } = req.query;

    const pending = await SyncDataService.getPending({
      tenantId,
      entityType,
      erpType,
      limit: parseInt(limit) || 100
    });

    res.json({
      success: true,
      data: pending,
      count: pending.length
    });

  } catch (error) {
    console.error('[SYNC-DATA] Error pending:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync-data/stats
 * Estadísticas de sincronización
 */
router.get('/stats', requireSyncPermission('sync'), async (req, res) => {
  try {
    const tenantId = req.syncClient?.tenantId;
    const stats = await SyncDataService.getStats(tenantId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[SYNC-DATA] Error stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

### 5. Registrar Rutas

**Archivo**: `D:\Desarrollos\React\parse\backend\src\server.js`

**Agregar**:
```javascript
// Al inicio, con los otros requires
const syncDataRoutes = require('./routes/syncData');

// En la sección de rutas, agregar:
app.use('/api/sync-data', syncDataRoutes);
```

---

## Flujo de Uso desde Hub

### Enviar OC aprobada a Parse:

```typescript
// En Hub, cuando se aprueba una OC
const response = await fetch('https://parse.../api/sync-data', {
  method: 'POST',
  headers: {
    'X-API-Key': PARSE_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    entityType: 'PURCHASE_ORDER',
    entityId: 'OC-2025-001',
    erpType: 'AXIOMA',
    payload: {
      numero: 'OC-2025-001',
      fecha: '2025-12-28',
      proveedor: {
        cuit: '30-12345678-9',
        razonSocial: 'Proveedor SA'
      },
      items: [
        { codigo: 'PROD-001', cantidad: 100, precio: 1500 }
      ],
      total: 150000
    }
  })
});

// Respuesta:
// { success: true, action: 'CREATE', id: 'uuid...' }
```

### Consultar estado:

```typescript
const status = await fetch(
  'https://parse.../api/sync-data/PURCHASE_ORDER/OC-2025-001/status',
  { headers: { 'X-API-Key': PARSE_API_KEY } }
);

// Respuesta:
// { success: true, data: { status: 'COMPLETED', externalId: 'ERP-123', syncedAt: '...' } }
```

---

## Archivos a Crear/Modificar en Parse

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `prisma/schema.prisma` | MODIFICAR | Agregar 2 modelos + relaciones |
| `src/services/syncDataService.js` | CREAR | Servicio de sincronización |
| `src/routes/syncData.js` | CREAR | Endpoints API |
| `src/server.js` | MODIFICAR | Registrar rutas |

---

## Verificación

Después de implementar, verificar:

```bash
# 1. Migrar base de datos
cd D:\Desarrollos\React\parse\backend
npx prisma db push

# 2. Verificar tablas
npx prisma studio
# Debe mostrar: sync_entity_config, sync_data

# 3. Reiniciar servidor Parse
npm run dev

# 4. Probar endpoint
curl -X POST http://localhost:5100/api/sync-data \
  -H "X-API-Key: sk_xxx" \
  -H "Content-Type: application/json" \
  -d '{"entityType":"TEST","entityId":"TEST-001","erpType":"AXIOMA","payload":{"test":true}}'
```

---

**Documento creado por**: Claude Code
**Fecha**: 28 Diciembre 2025
