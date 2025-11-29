# Arquitectura Final: Hub + Parse Integration

## 📋 Resumen Ejecutivo

**Hub aprovecha la infraestructura de Parse** como gateway para sincronización con Softland ERP.

```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   Hub    │◄──────►│    Parse    │◄──────►│  Softland   │
│ (PostgreSQL)│ Webhook│ API Gateway │   SQL  │ (SQL Server)│
└─────────────┘  +API  └─────────────┘        └─────────────┘
     │                       │
     │                       │
     ▼                       ▼
 Notificaciones      API Connectors
 en tiempo real     (ya implementado)
```

---

## 🎯 Decisión de Arquitectura

### Opción Elegida: **Parse como Gateway**

✅ **Ventajas:**
1. Parse ya tiene **API Connectors Bidireccionales** implementados
2. Sistema de autenticación robusto (API Keys)
3. Mapeo de campos configurable (JSON)
4. Paginación automática
5. Logs completos de sincronización
6. Staging opcional para validación
7. Hub no necesita conocer SQL de Softland

❌ **Descartadas:**
- Hub conecta directamente a Softland SQL (complejidad innecesaria)
- Triggers PostgreSQL (difícil debugging, mal desempeño)
- Message Queue (infraestructura adicional innecesaria)

---

## 🔄 Flujos de Datos

### 1. Crear Purchase Request (Hub → Softland)

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: Usuario crea PR en Hub                          │
└─────────────────────────────────────────────────────────────┘
1. Frontend Hub: POST /api/v1/purchase-requests
2. Backend Hub: Crea en PostgreSQL (hub.PurchaseRequest)
3. Status: DRAFT

┌─────────────────────────────────────────────────────────────┐
│ PASO 2: Aprobación                                         │
└─────────────────────────────────────────────────────────────┘
4. Aprobadores reciben notificación (WebSocket + Portal)
5. Aprueban nivel por nivel según monto
6. Status: APPROVED

┌─────────────────────────────────────────────────────────────┐
│ PASO 3: Envío a Softland via Parse                         │
└─────────────────────────────────────────────────────────────┘
7. Hub Backend: Llama a Parse API
   POST http://parse:5050/api/sync/upload/tenant-123
   Headers: X-API-Key: {parseApiKey}
   Body: {
     "tabla": "requerimientos_compra",
     "data": [{
       "numero": "PR-2025-00042",
       "descripcion": "Equipos IT",
       "monto": 45000,
       "estado": "APROBADO",
       "solicitante": "Juan Pérez"
     }]
   }

8. Parse Backend:
   - Valida API key
   - Conecta a Softland SQL Server
   - INSERT INTO SoftlandDB.dbo.RequerimientosCompra (...)
   - Responde: { "success": true, "registrosInsertados": 1 }

9. Hub actualiza PR:
   - erpStatus: SYNCED
   - erpSentAt: timestamp

10. Notificación al usuario: "Requerimiento enviado al ERP"
```

### 2. Sincronizar Orders desde Softland (Softland → Hub)

```
┌─────────────────────────────────────────────────────────────┐
│ Job Programado en Parse (cada 5 min)                       │
└─────────────────────────────────────────────────────────────┘
1. Parse Backend:
   - SELECT * FROM SoftlandDB.dbo.OrdenesCompra
     WHERE FechaModificacion > @lastSync
   - Encuentra OC nueva: OC-2025-789

2. Parse API Connector (PUSH mode):
   - Mapea campos según configuración
   - Llama a Webhook de Hub

┌─────────────────────────────────────────────────────────────┐
│ Webhook: Parse → Hub                                    │
└─────────────────────────────────────────────────────────────┘
3. Parse: POST http://hub:4000/api/webhooks/parse
   Headers:
     X-Webhook-Signature: sha256=...
     X-Webhook-Event: purchase_order.created
   Body: {
     "event": "purchase_order.created",
     "tenant_id": "tenant-123",
     "data": {
       "numero_oc": "OC-2025-789",
       "numero_requerimiento": "PR-2025-00042",
       "monto_total": 45000,
       "fecha_creacion": "2025-11-28T10:00:00Z",
       "estado": "ACTIVA"
     }
   }

4. Hub Backend:
   - Verifica firma HMAC
   - Busca Purchase Request por numero_requerimiento
   - Crea Purchase Order en PostgreSQL
   - Actualiza PR status: PO_CREATED
   - Vincula PR con PO

5. Notificación en tiempo real:
   - Socket.io emite a usuario: "¡Tu OC está lista!"
   - Toast notification en frontend
   - Badge en campanita de notificaciones
```

### 3. Recepción de Mercadería (Hub → Softland)

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario recibe mercadería                                   │
└─────────────────────────────────────────────────────────────┘
1. Frontend Hub:
   - Lista OCs pendientes de recepción
   - Usuario selecciona OC-2025-789
   - Carga items recibidos:
     * Notebook Dell: Ordenado 5, Recibido 3
     * Monitor LG: Ordenado 10, Recibido 10
   - Adjunta foto del remito
   - Confirma recepción

2. Backend Hub:
   - Crea PurchaseReception en PostgreSQL
   - Status: PENDING (no sincronizado aún)

3. Envío a Softland via Parse:
   POST http://parse:5050/api/sync/upload/tenant-123
   Body: {
     "tabla": "recepciones_mercaderia",
     "data": [{
       "numero_recepcion": "REC-2025-001",
       "numero_oc": "OC-2025-789",
       "fecha": "2025-12-01T10:30:00Z",
       "receptor": "Ana López",
       "items": [...]
     }]
   }

4. Parse → Softland SQL:
   INSERT INTO Recepciones (...)
   INSERT INTO RecepcionesDetalle (...)

5. Softland actualiza inventario automáticamente

6. Hub actualiza recepción:
   - erpStatus: SYNCED
   - Notifica al solicitante original
```

---

## 📊 Modelo de Datos Hub

### Configuración de Parse por Tenant

```prisma
model ParseIntegrationConfig {
  id              String   @id @default(cuid())
  tenantId        String   @unique
  tenant          Tenant   @relation(fields: [tenantId], references: [id])

  // IDs de Parse
  parseTenantId   String   // ID del tenant en Parse DB
  parseApiKey     String   // API key para llamar a Parse
  parseApiUrl     String   @default("http://localhost:5050")

  // Webhook config
  webhookSecret   String   // Para validar firmas HMAC

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

### Purchase Requests (sin cambios del diseño original)

Ver: `PURCHASE_REQUESTS_MODULE.md`

---

## 🔐 Seguridad

### 1. Autenticación Hub → Parse

```javascript
// Hub llama a Parse API
const response = await axios.post(
  'http://parse:5050/api/sync/upload/tenant-123',
  { tabla: 'requerimientos_compra', data: [...] },
  {
    headers: {
      'X-API-Key': config.parseApiKey, // API key de Parse
      'Content-Type': 'application/json'
    }
  }
);
```

### 2. Validación de Webhooks Parse → Hub

```typescript
// Hub valida webhook de Parse
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = `sha256=${hmac.digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 🛠️ Configuración Inicial

### 1. En Parse: Crear Tenant y API Key

```sql
-- 1.1. Crear tenant (si no existe)
INSERT INTO tenants (id, nombre, slug)
VALUES ('tenant-abc', 'Empresa ABC', 'empresa-abc');

-- 1.2. Crear API key para Hub
INSERT INTO sync_api_keys (
  id, tenantId, apiKey, nombre, permisos, activo
) VALUES (
  gen_random_uuid(),
  'tenant-abc',
  'hub-api-key-uuid-here',
  'Hub Integration',
  '{"sync": true, "parse": false}',
  true
);

-- 1.3. Configurar sincronización SQL
INSERT INTO sync_configurations (
  id, tenantId,
  sqlServerHost, sqlServerPort, sqlServerDatabase,
  sqlServerUser, sqlServerPassword,
  configuracionTablas, activo
) VALUES (
  gen_random_uuid(),
  'tenant-abc',
  '192.168.1.100', 1433, 'SoftlandDB',
  'sync_user', 'encrypted_password',
  '{
    "tablasSubida": [
      {
        "nombre": "requerimientos_compra",
        "destino": "SoftlandDB.dbo.RequerimientosCompra",
        "mapping": { ... }
      },
      {
        "nombre": "recepciones_mercaderia",
        "destino": "SoftlandDB.dbo.Recepciones",
        "mapping": { ... }
      }
    ],
    "tablasBajada": [
      {
        "nombre": "ordenes_compra",
        "origen": "SoftlandDB.dbo.OrdenesCompra",
        "incremental": true,
        "timestampColumn": "FechaModificacion"
      }
    ]
  }',
  true
);

-- 1.4. Crear webhook subscription
INSERT INTO webhook_subscriptions (
  id, tenantId, name, url, events, secret, isActive
) VALUES (
  gen_random_uuid(),
  'tenant-abc',
  'Hub Webhook',
  'http://hub:4000/api/webhooks/parse',
  ARRAY['purchase_order.created', 'purchase_order.updated', 'sync.error'],
  'shared-webhook-secret-here',
  true
);
```

### 2. En Hub: Configurar Parse

```typescript
// POST /api/v1/admin/parse-integration
{
  "tenantId": "hub-tenant-456",
  "parseTenantId": "tenant-abc",
  "parseApiKey": "hub-api-key-uuid-here",
  "parseApiUrl": "http://localhost:5050",
  "webhookSecret": "shared-webhook-secret-here"
}
```

### 3. Variables de Entorno

```bash
# Hub backend/.env
PARSE_API_URL=http://localhost:5050
PARSE_WEBHOOK_SECRET=shared-webhook-secret-here

# Parse backend/.env
HUB_WEBHOOK_URL=http://localhost:4000/api/webhooks/parse
```

---

## 📝 Endpoints Hub

### API Calls Hub → Parse

```typescript
// Servicio en Hub
class ParseApiService {
  // Enviar PR a Softland
  async sendPurchaseRequest(prId: string) {
    const config = await getParseConfig(tenantId);
    return axios.post(
      `${config.parseApiUrl}/api/sync/upload/${config.parseTenantId}`,
      { tabla: 'requerimientos_compra', data: [...] },
      { headers: { 'X-API-Key': config.parseApiKey } }
    );
  }

  // Enviar recepción a Softland
  async sendReception(receptionId: string) {
    const config = await getParseConfig(tenantId);
    return axios.post(
      `${config.parseApiUrl}/api/sync/upload/${config.parseTenantId}`,
      { tabla: 'recepciones_mercaderia', data: [...] },
      { headers: { 'X-API-Key': config.parseApiKey } }
    );
  }

  // Forzar sincronización manual
  async forceSyncOrders(tenantId: string) {
    const config = await getParseConfig(tenantId);
    return axios.post(
      `${config.parseApiUrl}/api/sync/trigger-sync`,
      { tenant_id: config.parseTenantId, tabla: 'ordenes_compra' },
      { headers: { 'X-API-Key': config.parseApiKey } }
    );
  }
}
```

### Webhooks Parse → Hub

```typescript
// POST /api/webhooks/parse
router.post('/parse', async (req, res) => {
  const { event, tenant_id, data } = req.body;
  const signature = req.headers['x-webhook-signature'];

  // Validar firma
  if (!verifySignature(req.body, signature, webhookSecret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Procesar eventos
  switch (event) {
    case 'purchase_order.created':
      await handlePurchaseOrderCreated(tenant_id, data);
      break;
    case 'purchase_order.updated':
      await handlePurchaseOrderUpdated(tenant_id, data);
      break;
    case 'sync.error':
      await handleSyncError(tenant_id, data);
      break;
  }

  res.json({ success: true });
});
```

---

## 📊 Sistema de Notificaciones

### Eventos que Generan Notificaciones

| Evento | Cuándo | Quién recibe | Prioridad |
|--------|--------|--------------|-----------|
| PR_CREATED | Usuario crea PR | Creador | NORMAL |
| PR_APPROVAL_REQUIRED | PR enviado a aprobación | Aprobador nivel N | HIGH |
| PR_APPROVED | Última aprobación completada | Creador | NORMAL |
| PR_REJECTED | Aprobador rechaza | Creador | HIGH |
| PO_CREATED | Webhook de Parse | Creador | NORMAL |
| RECEPTION_PENDING | OC sin recepción | Equipo almacén | NORMAL |
| RECEPTION_OVERDUE | OC vencida | Equipo almacén | URGENT |
| RECEPTION_COMPLETED | Recepción confirmada | Creador | NORMAL |

### Widget de Notificaciones (Frontend)

```tsx
// Bell icon con badge
<NotificationBell />
  → Muestra count de no leídas
  → Escucha WebSocket para tiempo real
  → Toast notifications

// Lista de notificaciones
<NotificationList filter="unread" />
  → Agrupa por tipo
  → Marca como leída al hacer clic
  → Link directo a PR/OC/Recepción
```

---

## 🎯 Ventajas de esta Arquitectura

### ✅ Simplicidad
- Hub solo hace CRUD en PostgreSQL
- No maneja SQL de Softland
- No necesita jobs de sincronización

### ✅ Reutilización
- Parse ya tiene API Connectors probados
- Sistema de webhooks ya implementado
- Autenticación y mapeo de campos resuelto

### ✅ Separación de Responsabilidades
- **Hub**: Lógica de negocio Purchase Requests
- **Parse**: Gateway SQL (sincronización pura)
- **Softland**: ERP sin modificar

### ✅ Escalabilidad
- Parse puede manejar N clientes Hub
- Cada tenant independiente
- Sincronización paralela

### ✅ Debugging Fácil
- Logs en Parse y Hub separados
- Webhook logs en ambos lados
- Reintento automático en Parse

---

## 📅 Roadmap de Implementación

### Fase 1: Setup Básico (1 semana)
- ✅ Crear modelos Prisma en Hub (ParseIntegrationConfig, WebhookLog)
- ✅ Endpoint webhook receptor en Hub
- ✅ Servicio parseApiService en Hub
- ✅ Configurar tenant en Parse
- ✅ Test de conexión Hub ↔ Parse

### Fase 2: Flujo PR → Softland (1 semana)
- ✅ Llamar Parse API desde Hub al aprobar PR
- ✅ Configurar tabla sync en Parse (requerimientos_compra)
- ✅ Validar inserción en Softland SQL
- ✅ Actualizar erpStatus en Hub

### Fase 3: Flujo Softland → Hub (1 semana)
- ✅ Configurar API Connector PULL en Parse
- ✅ Job sincronización OCs (cada 5 min)
- ✅ Webhook de Parse a Hub
- ✅ Handler en Hub (crear PO, vincular PR)
- ✅ Notificaciones en tiempo real

### Fase 4: Recepciones (1 semana)
- ✅ UI de recepción en Hub
- ✅ Envío a Parse API
- ✅ Sincronización a Softland
- ✅ Notificaciones de recepción completada

### Fase 5: Notificaciones (1 semana)
- ✅ Sistema de notificaciones completo
- ✅ WebSocket real-time
- ✅ Preferencias de usuario
- ✅ Email notifications

**Total: 5 semanas**

---

## 📚 Documentos de Referencia

1. `PURCHASE_REQUESTS_MODULE.md` - Specs completas del módulo
2. `SIMPLIFIED_ARCHITECTURE.md` - Arquitectura sin Parse (descartada)
3. `WEBHOOK_INTEGRATION.md` - Detalles de webhooks
4. Parse docs: `CONECTOR-API-BIDIRECCIONAL.md` - Sistema de conectores Parse

---

## ✅ Conclusión

Esta arquitectura logra:

1. ✅ **Simplicidad**: Hub no conoce Softland SQL
2. ✅ **Reutilización**: Aprovecha Parse API Connectors
3. ✅ **Notificaciones**: Tiempo real con WebSocket
4. ✅ **Escalabilidad**: Fácil agregar más tenants
5. ✅ **Mantenibilidad**: Separación clara de responsabilidades

**Próximo paso**: Implementar Fase 1 (Setup Básico)

---

**Documento creado**: 2025-11-29
**Versión**: 1.0 Final
**Autor**: Hub Development Team
**Estado**: ✅ Aprobado para implementación
