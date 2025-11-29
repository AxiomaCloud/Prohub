# Integración Hub ↔ Parse via Webhooks + API

## 🎯 Estrategia de Comunicación

**Arquitectura híbrida** (webhooks + API REST):

```
┌──────────────┐                    ┌──────────────┐
│    Hub    │                    │    Parse     │
├──────────────┤                    ├──────────────┤
│              │                    │              │
│  Webhook     │◄───────────────────│  Emite       │
│  Endpoint    │  HTTP POST eventos │  Webhooks    │
│              │                    │              │
│              │                    │              │
│  API Client  │───────────────────►│  API REST    │
│              │  HTTP POST acciones│              │
└──────────────┘                    └──────────────┘
```

### Flujos de Comunicación

**Parse → Hub** (Eventos async):
- ✅ Webhook cuando OC sincronizada desde Softland
- ✅ Webhook cuando hay error en sincronización
- ✅ Webhook cuando sincronización completada

**Hub → Parse** (Acciones específicas):
- ✅ API call para enviar PR a Softland
- ✅ API call para enviar recepción a Softland
- ✅ API call para forzar sincronización manual

---

## Parse → Hub (Webhooks)

### 1. Configuración de Webhooks en Parse

```prisma
// En Parse schema (ya existe o agregar)
model WebhookSubscription {
  id          String   @id @default(cuid())
  tenantId    String
  tenant      tenants  @relation(fields: [tenantId], references: [id])

  // Configuración
  name        String
  url         String   // https://hub.com/api/webhooks/parse
  events      String[] // ["purchase_order.created", "sync.completed"]

  // Seguridad
  secret      String   // Para firmar payloads (HMAC)
  isActive    Boolean  @default(true)

  // Metadata
  lastTriggeredAt DateTime?
  failureCount    Int      @default(0)
  lastError       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tenantId])
  @@index([isActive])
}

model WebhookDelivery {
  id              String   @id @default(cuid())
  subscriptionId  String
  subscription    WebhookSubscription @relation(fields: [subscriptionId], references: [id])

  event           String   // "purchase_order.created"
  payload         Json

  // Delivery
  status          WebhookDeliveryStatus
  httpStatus      Int?
  response        String?
  error           String?

  // Reintentos
  attempts        Int      @default(1)
  nextRetryAt     DateTime?

  createdAt       DateTime @default(now())
  deliveredAt     DateTime?

  @@index([subscriptionId, status])
  @@index([event])
  @@index([createdAt])
}

enum WebhookDeliveryStatus {
  PENDING
  DELIVERED
  FAILED
  RETRYING
}
```

### 2. Servicio de Webhooks en Parse

```javascript
// /parse/backend/src/services/webhookService.js

const axios = require('axios');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WebhookService {
  /**
   * Emitir webhook a todas las suscripciones del tenant
   */
  async emit(tenantId, event, payload) {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: event }
      }
    });

    for (const subscription of subscriptions) {
      await this.deliver(subscription, event, payload);
    }
  }

  /**
   * Entregar webhook
   */
  async deliver(subscription, event, payload) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        subscriptionId: subscription.id,
        event,
        payload,
        status: 'PENDING'
      }
    });

    try {
      // Crear firma HMAC
      const signature = this.signPayload(payload, subscription.secret);

      // Enviar webhook
      const response = await axios.post(
        subscription.url,
        {
          event,
          tenant_id: subscription.tenantId,
          timestamp: new Date().toISOString(),
          data: payload
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'User-Agent': 'Parse-Webhooks/1.0'
          },
          timeout: 10000 // 10 segundos
        }
      );

      // Marcar como entregado
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'DELIVERED',
          httpStatus: response.status,
          response: JSON.stringify(response.data),
          deliveredAt: new Date()
        }
      });

      // Resetear contador de fallos
      await prisma.webhookSubscription.update({
        where: { id: subscription.id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: 0,
          lastError: null
        }
      });

      console.log(`✅ Webhook delivered: ${event} → ${subscription.url}`);

    } catch (error) {
      console.error(`❌ Webhook failed: ${event} → ${subscription.url}`, error.message);

      // Marcar como fallido
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          httpStatus: error.response?.status,
          error: error.message
        }
      });

      // Incrementar contador de fallos
      await prisma.webhookSubscription.update({
        where: { id: subscription.id },
        data: {
          failureCount: { increment: 1 },
          lastError: error.message
        }
      });

      // Programar reintento (exponential backoff)
      await this.scheduleRetry(delivery.id, 1);
    }
  }

  /**
   * Programar reintento
   */
  async scheduleRetry(deliveryId, attemptNumber) {
    if (attemptNumber > 3) {
      return; // Máximo 3 reintentos
    }

    const delay = Math.pow(2, attemptNumber) * 60 * 1000; // 2min, 4min, 8min
    const nextRetryAt = new Date(Date.now() + delay);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'RETRYING',
        nextRetryAt,
        attempts: attemptNumber + 1
      }
    });

    // TODO: Encolar job para reintento
  }

  /**
   * Firmar payload con HMAC SHA-256
   */
  signPayload(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verificar firma (para webhooks entrantes)
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.signPayload(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = new WebhookService();
```

### 3. Emitir Webhooks desde Parse

```javascript
// Cuando se sincroniza OC desde Softland

// En /parse/backend/src/routes/sync.js o servicio de sincronización
const webhookService = require('../services/webhookService');

async function syncPurchaseOrdersFromSoftland(tenantId) {
  // ... código de sincronización ...

  for (const oc of nuevasOCs) {
    // Insertar en parse.ordenes_compra_sync
    await prisma.ordenes_compra_sync.create({ data: oc });

    // Emitir webhook a Hub
    await webhookService.emit(tenantId, 'purchase_order.created', {
      numero_oc: oc.numero_oc,
      numero_requerimiento: oc.numero_requerimiento,
      monto_total: oc.monto_total,
      fecha_creacion: oc.fecha_creacion,
      estado: oc.estado
    });
  }

  // Webhook de sync completado
  await webhookService.emit(tenantId, 'sync.purchase_orders.completed', {
    created_count: nuevasOCs.length,
    updated_count: actualizadasOCs.length,
    timestamp: new Date().toISOString()
  });
}
```

---

## Hub Recibiendo Webhooks

### 1. Endpoint de Webhooks en Hub

```typescript
// /home/martin/Desarrollos/hub/backend/src/routes/webhooks.ts

import express from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { notificationService } from '../services/notificationService';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/webhooks/parse
 * Recibe webhooks de Parse
 */
router.post('/parse', async (req, res) => {
  try {
    const { event, tenant_id, timestamp, data } = req.body;
    const signature = req.headers['x-webhook-signature'] as string;

    // Validar firma
    const isValid = await verifyWebhookSignature(req.body, signature, tenant_id);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log(`📨 Webhook received: ${event} from tenant ${tenant_id}`);

    // Procesar según evento
    switch (event) {
      case 'purchase_order.created':
        await handlePurchaseOrderCreated(tenant_id, data);
        break;

      case 'purchase_order.updated':
        await handlePurchaseOrderUpdated(tenant_id, data);
        break;

      case 'sync.purchase_orders.completed':
        await handleSyncCompleted(tenant_id, data);
        break;

      case 'sync.error':
        await handleSyncError(tenant_id, data);
        break;

      default:
        console.log(`⚠️ Unknown webhook event: ${event}`);
    }

    // Log webhook recibido
    await prisma.webhookLog.create({
      data: {
        event,
        tenantId: tenant_id,
        payload: data,
        status: 'PROCESSED',
        receivedAt: new Date()
      }
    });

    res.json({ success: true, event, processed_at: new Date().toISOString() });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);

    await prisma.webhookLog.create({
      data: {
        event: req.body.event,
        tenantId: req.body.tenant_id,
        payload: req.body.data,
        status: 'FAILED',
        error: error.message,
        receivedAt: new Date()
      }
    });

    res.status(500).json({ error: error.message });
  }
});

/**
 * Handler: OC creada
 */
async function handlePurchaseOrderCreated(tenantId: string, data: any) {
  // Buscar tenant en Hub (puede tener ID diferente)
  const tenant = await findTenantByParseId(tenantId);

  if (!tenant) {
    console.log(`⚠️ Tenant no encontrado en Hub: ${tenantId}`);
    return;
  }

  // Buscar Purchase Request asociado
  const pr = await prisma.purchaseRequest.findFirst({
    where: {
      tenantId: tenant.id,
      number: data.numero_requerimiento
    },
    include: {
      requestedByUser: true
    }
  });

  if (!pr) {
    console.log(`⚠️ PR no encontrado: ${data.numero_requerimiento}`);
    return;
  }

  // Crear Purchase Order
  const po = await prisma.purchaseOrder.upsert({
    where: {
      clientTenantId_number: {
        clientTenantId: tenant.id,
        number: data.numero_oc
      }
    },
    update: {
      amount: parseFloat(data.monto_total),
      status: mapSoftlandStatusToPO(data.estado),
      date: new Date(data.fecha_creacion)
    },
    create: {
      number: data.numero_oc,
      amount: parseFloat(data.monto_total),
      status: mapSoftlandStatusToPO(data.estado),
      date: new Date(data.fecha_creacion),
      clientTenantId: tenant.id
    }
  });

  // Actualizar Purchase Request
  await prisma.purchaseRequest.update({
    where: { id: pr.id },
    data: {
      status: 'PO_CREATED',
      purchaseOrderId: po.id
    }
  });

  // Notificar al usuario
  await notificationService.notifyPOCreated(po.id);

  console.log(`✅ PO created in Hub: ${po.number} linked to PR ${pr.number}`);
}

/**
 * Handler: Sincronización completada
 */
async function handleSyncCompleted(tenantId: string, data: any) {
  const tenant = await findTenantByParseId(tenantId);

  // Actualizar última sincronización
  await prisma.parseIntegrationConfig.update({
    where: { tenantId: tenant.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: 'SYNCED',
      lastSyncError: null
    }
  });

  console.log(`✅ Sync completed: ${data.created_count} created, ${data.updated_count} updated`);
}

/**
 * Handler: Error en sincronización
 */
async function handleSyncError(tenantId: string, data: any) {
  const tenant = await findTenantByParseId(tenantId);

  await prisma.parseIntegrationConfig.update({
    where: { tenantId: tenant.id },
    data: {
      lastSyncStatus: 'ERROR',
      lastSyncError: data.error
    }
  });

  // Notificar a admins
  const admins = await prisma.user.findMany({
    where: {
      tenantMemberships: {
        some: {
          tenantId: tenant.id,
          roles: { has: 'CLIENT_ADMIN' }
        }
      }
    }
  });

  for (const admin of admins) {
    await notificationService.createNotification({
      userId: admin.id,
      type: 'SYSTEM_ERROR',
      priority: 'HIGH',
      title: '⚠️ Error en sincronización ERP',
      message: `Error sincronizando datos con Softland: ${data.error}`,
      channel: 'PORTAL'
    });
  }

  console.error(`❌ Sync error: ${data.error}`);
}

/**
 * Verificar firma webhook
 */
async function verifyWebhookSignature(payload: any, signature: string, tenantId: string): Promise<boolean> {
  // Obtener secret del tenant
  const config = await prisma.parseIntegrationConfig.findFirst({
    where: {
      // Buscar por relación con Parse tenant
      // Puede requerir campo adicional parseWebhookSecret
    }
  });

  if (!config?.webhookSecret) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', config.webhookSecret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Helper: Buscar tenant Hub por ID Parse
 */
async function findTenantByParseId(parseId: string) {
  // Opción 1: Campo directo
  return prisma.tenant.findFirst({
    where: { parseTenantId: parseId }
  });

  // Opción 2: Via configuración
  const config = await prisma.parseIntegrationConfig.findFirst({
    where: { parseTenantId: parseId },
    include: { tenant: true }
  });
  return config?.tenant;
}

function mapSoftlandStatusToPO(status: string): string {
  const mapping = {
    'ACTIVA': 'ACTIVE',
    'COMPLETADA': 'COMPLETED',
    'CANCELADA': 'CANCELLED'
  };
  return mapping[status] || 'ACTIVE';
}

export default router;
```

### 2. Modelo de Datos Hub

```prisma
// Agregar a schema.prisma

model ParseIntegrationConfig {
  id              String   @id @default(cuid())
  tenantId        String   @unique
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  // IDs de Parse
  parseTenantId   String   // ID del tenant en Parse
  parseApiKey     String   // API key para llamar a Parse

  // Webhook secret para validar firmas
  webhookSecret   String   // Compartido con Parse

  // Estado
  isActive        Boolean  @default(true)
  lastSyncAt      DateTime?
  lastSyncStatus  String?
  lastSyncError   String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("parse_integration_configs")
}

model WebhookLog {
  id          String   @id @default(cuid())
  tenantId    String?

  event       String
  payload     Json
  status      WebhookLogStatus
  error       String?

  receivedAt  DateTime @default(now())

  @@index([tenantId, event])
  @@index([receivedAt])
  @@map("webhook_logs")
}

enum WebhookLogStatus {
  PROCESSED
  FAILED
  IGNORED
}
```

---

## Hub → Parse (API Calls)

### 1. Servicio en Hub

```typescript
// /home/martin/Desarrollos/hub/backend/src/services/parseApiService.ts

import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class ParseApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.PARSE_API_URL || 'http://localhost:5050';
  }

  /**
   * Obtener API key de Parse para el tenant
   */
  async getParseApiKey(tenantId: string): Promise<string> {
    const config = await prisma.parseIntegrationConfig.findUnique({
      where: { tenantId }
    });

    if (!config) {
      throw new Error('Parse integration not configured');
    }

    return config.parseApiKey;
  }

  /**
   * Enviar Purchase Request a Softland via Parse
   */
  async sendPurchaseRequest(purchaseRequestId: string) {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      include: {
        items: true,
        requestedByUser: true,
        tenant: true
      }
    });

    const config = await prisma.parseIntegrationConfig.findUnique({
      where: { tenantId: pr.tenantId }
    });

    // Preparar datos
    const data = {
      numero: pr.number,
      descripcion: pr.description,
      monto: pr.estimatedAmount,
      solicitante: pr.requestedByUser.name,
      departamento: pr.department,
      fecha_creacion: pr.createdAt.toISOString()
    };

    // Llamar a Parse API
    const response = await axios.post(
      `${this.baseUrl}/api/sync/upload/${config.parseTenantId}`,
      {
        tabla: 'requerimientos_compra',
        data: [data]
      },
      {
        headers: {
          'X-API-Key': config.parseApiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.data.success) {
      throw new Error(`Parse API error: ${response.data.error}`);
    }

    // Actualizar PR
    await prisma.purchaseRequest.update({
      where: { id: purchaseRequestId },
      data: {
        erpStatus: 'SYNCED',
        erpSentAt: new Date()
      }
    });

    return response.data;
  }

  /**
   * Forzar sincronización manual de OCs
   */
  async forceSyncPurchaseOrders(tenantId: string) {
    const config = await prisma.parseIntegrationConfig.findUnique({
      where: { tenantId }
    });

    const response = await axios.post(
      `${this.baseUrl}/api/sync/trigger-sync`,
      {
        tenant_id: config.parseTenantId,
        tabla: 'ordenes_compra'
      },
      {
        headers: {
          'X-API-Key': config.parseApiKey
        }
      }
    );

    return response.data;
  }
}

export default new ParseApiService();
```

---

## Configuración Inicial

### 1. En Parse: Crear Webhook Subscription

```bash
POST http://parse-server:5050/api/webhooks/subscriptions
Headers:
  X-API-Key: admin-api-key
  Content-Type: application/json

Body:
{
  "tenantId": "parse-tenant-123",
  "name": "Hub Integration",
  "url": "https://hub.com/api/webhooks/parse",
  "events": [
    "purchase_order.created",
    "purchase_order.updated",
    "sync.purchase_orders.completed",
    "sync.error"
  ],
  "secret": "shared-secret-key-here"
}
```

### 2. En Hub: Configurar Parse Integration

```bash
POST http://hub.com/api/v1/admin/parse-integration
Headers:
  Authorization: Bearer {admin-token}

Body:
{
  "tenantId": "hub-tenant-456",
  "parseTenantId": "parse-tenant-123",
  "parseApiKey": "api-key-from-parse",
  "webhookSecret": "shared-secret-key-here"
}
```

---

## Eventos Disponibles

### Parse → Hub

| Evento | Cuándo se dispara | Payload |
|--------|-------------------|---------|
| `purchase_order.created` | Nueva OC sincronizada desde Softland | `{ numero_oc, numero_requerimiento, monto_total, ... }` |
| `purchase_order.updated` | OC actualizada en Softland | `{ numero_oc, cambios: {...} }` |
| `sync.purchase_orders.completed` | Sincronización completada | `{ created_count, updated_count, timestamp }` |
| `sync.error` | Error en sincronización | `{ tabla, error, timestamp }` |

### Hub → Parse (API Calls)

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/sync/upload/:tenantId` | POST | Enviar PR/Recepción a Softland |
| `/api/sync/trigger-sync` | POST | Forzar sincronización manual |
| `/api/sync/status/:tenantId` | GET | Obtener estado de sincronización |

---

## Ventajas vs Otras Arquitecturas

### ✅ Webhooks + API vs Polling

| Aspecto | Webhooks + API | Polling | Triggers DB |
|---------|----------------|---------|-------------|
| Latencia | Baja (inmediata) | Alta (cada N min) | Media |
| Carga servidor | Baja | Alta | Media |
| Escalabilidad | Alta | Media | Baja |
| Debugging | Fácil (logs) | Fácil | Difícil |
| Complejidad | Media | Baja | Alta |

### ✅ Webhooks + API vs Message Queue

| Aspecto | Webhooks + API | MQ (RabbitMQ/Kafka) |
|---------|----------------|---------------------|
| Infraestructura | Mínima | Requiere MQ cluster |
| Setup | Simple | Complejo |
| Mantenimiento | Bajo | Alto |
| Garantías | At-most-once | Exactly-once |
| Apropiado para | Eventos simples | Alto volumen |

**Conclusión**: Para este caso, **Webhooks + API es óptimo**.

---

## Testing

### Test de Webhook (desde Parse)

```bash
# Simular webhook desde Parse
curl -X POST http://localhost:4000/api/webhooks/parse \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=..." \
  -H "X-Webhook-Event: purchase_order.created" \
  -d '{
    "event": "purchase_order.created",
    "tenant_id": "tenant-123",
    "timestamp": "2025-11-28T12:00:00Z",
    "data": {
      "numero_oc": "OC-2025-789",
      "numero_requerimiento": "PR-2025-00042",
      "monto_total": 45000
    }
  }'
```

### Test de API Call (desde Hub)

```bash
# Enviar PR a Parse
curl -X POST http://localhost:5050/api/sync/upload/tenant-123 \
  -H "X-API-Key: api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "tabla": "requerimientos_compra",
    "data": [{
      "numero": "PR-2025-00042",
      "descripcion": "Equipos IT",
      "monto": 45000
    }]
  }'
```

---

## Conclusión

**Arquitectura Final**: Webhooks (Parse → Hub) + API REST (Hub → Parse)

- ✅ Simple de implementar
- ✅ Bajo acoplamiento
- ✅ Fácil debugging (logs de webhooks)
- ✅ Escalable
- ✅ No requiere infraestructura adicional
- ✅ Notificaciones en tiempo real

**Próximos pasos**:
1. Implementar webhook service en Parse
2. Implementar webhook endpoint en Hub
3. Configurar suscripciones
4. Testear flujo completo end-to-end

---

**Documento creado**: 2025-11-28
**Versión**: 1.0
**Autor**: Hub Development Team
