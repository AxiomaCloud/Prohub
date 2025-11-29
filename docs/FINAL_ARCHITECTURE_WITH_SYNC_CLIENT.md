# Arquitectura Final Hub: Usando Sync-Client Legacy

## ⚠️ ACLARACIÓN IMPORTANTE

**Parse (NO Hub) maneja TODA la sincronización.**

- El sync-client se conecta a **Parse**, no a Hub
- **Parse** tiene los endpoints `/api/sync/*`
- **Parse** tiene las tablas `sync_configurations`, `sync_api_keys`, `sync_logs`
- **Parse** genera las API Keys para autenticar el sync-client
- **Hub** solo lee/escribe a las tablas del schema `sync` en PostgreSQL

## 🎯 Decisión de Arquitectura

**Hub reutiliza el sync-client standalone** que ya existe en Parse para sincronizar con Softland SQL Server, pero **Parse maneja toda la comunicación con el sync-client**.

```
                         Arquitectura Correcta

┌──────────────┐
│  Softland    │
│ SQL Server   │
└──────┬───────┘
       │ SQL Queries
       ▼
┌──────────────┐
│ Sync-Client  │  (Windows .exe en servidor del cliente)
│  .exe        │
└──────┬───────┘
       │ HTTPS + X-API-Key
       ▼
┌──────────────┐
│    Parse     │  ← MANEJA TODA LA SINCRONIZACIÓN
│  (Backend)   │  - Endpoints /api/sync/*
│              │  - sync_configurations
│              │  - sync_api_keys
│              │  - Genera API Keys
└──────┬───────┘
       │ PostgreSQL (shared database)
       │ - Tablas en schema "sync"
       ▼
┌──────────────┐
│     Hub      │  ← SOLO lee/escribe sync tables
│  (Backend)   │  - NO maneja sync-client
│              │  - NO tiene /api/sync/*
└──────────────┘
```

---

## 🔄 Cómo Funciona

### Componente Existente: Sync-Client

**Características del sync-client** (ya implementado en Parse):
- ✅ Ejecutable standalone Windows (.exe ~40MB)
- ✅ ETL de 3 fases: pre_process → process → post_process
- ✅ Sincronización bidireccional: Upload (cliente → backend) y Download (backend → cliente)
- ✅ Incremental por timestamp o ID
- ✅ Configuración encriptada AES-256-GCM
- ✅ Logs locales + remotos
- ✅ Programable con Windows Task Scheduler

---

## 📊 Arquitectura Simplificada

### Instalación del Sync-Client en Servidor Softland

```
┌──────────────────────────────────────────────────────────┐
│ Windows Server (Cliente - donde está Softland)           │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ C:\sync\                                           │  │
│  │                                                    │  │
│  │ ├── ax-sync-client.exe       (ejecutable)      │  │
│  │ ├── sync-config.enc              (config cifrada) │  │
│  │ ├── last-sync.json               (timestamps)     │  │
│  │ └── logs/                                          │  │
│  │     ├── sync-combined.log                         │  │
│  │     └── sync-error.log                            │  │
│  └────────────────────────────────────────────────────┘  │
│                          │                                │
│                          ▼                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Softland SQL Server                                │  │
│  │                                                    │  │
│  │ ├── RequerimientosCompra       (tabla destino)    │  │
│  │ ├── OrdenesCompra              (tabla origen)     │  │
│  │ ├── Recepciones                (tabla destino)    │  │
│  │ └── sync_control               (timestamps)       │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS + X-API-Key
                          ▼
┌──────────────────────────────────────────────────────────┐
│ Parse Backend (Maneja TODA la sincronización)         │
│                                                           │
│  ├── /api/sync/config/:tenantId                          │
│  ├── /api/sync/upload/:tenantId                          │
│  ├── /api/sync/download/:tenantId                        │
│  ├── /api/sync/logs/:tenantId                            │
│  │                                                        │
│  ├── sync_configurations (credenciales SQL)              │
│  ├── sync_api_keys (autenticación sync-client)          │
│  └── sync_logs (logs de sincronización)                  │
└──────────────────────────────────────────────────────────┘
                          │
                          │ PostgreSQL (shared)
                          ▼
┌──────────────────────────────────────────────────────────┐
│ PostgreSQL (Cloud - compartido Parse ↔ Hub)           │
│                                                           │
│  Schemas:                                                 │
│  ├── parse.* (tablas de Parse)                           │
│  ├── hub.PurchaseRequest (PRs de Hub)                    │
│  ├── hub.PurchaseOrder (OCs desde Softland)              │
│  └── sync.* (tablas de sincronización):                  │
│      ├── requerimientos_compra_sync                      │
│      ├── ordenes_compra_sync                             │
│      └── recepciones_sync                                │
└──────────────────────────────────────────────────────────┘
                          │
                          │ Read/Write sync tables
                          ▼
┌──────────────────────────────────────────────────────────┐
│ Hub Backend (Next.js)                                  │
│                                                           │
│  Responsabilidades:                                       │
│  ✅ Crear PRs en hub.PurchaseRequest                     │
│  ✅ Cuando PR aprobado → escribir a sync.requerimientos_compra_sync │
│  ✅ Leer OCs de sync.ordenes_compra_sync (polling)       │
│  ✅ Crear hub.PurchaseOrder cuando detecta OC            │
│  ✅ Escribir recepciones a sync.recepciones_sync         │
│                                                           │
│  NO hace:                                                 │
│  ❌ NO maneja sync-client                                │
│  ❌ NO tiene endpoints /api/sync/*                       │
│  ❌ NO tiene sync_configurations, sync_api_keys         │
│  ❌ NO genera API keys para sync                         │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujos de Sincronización

### 1. Hub → Softland (Enviar Purchase Request)

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: Usuario aprueba PR en Hub                       │
└─────────────────────────────────────────────────────────────┘
1. Hub Backend crea PR en hub.PurchaseRequest
2. Status: APPROVED

┌─────────────────────────────────────────────────────────────┐
│ PASO 2: Hub escribe en tabla sync                       │
└─────────────────────────────────────────────────────────────┘
3. Hub Backend:
   INSERT INTO sync.requerimientos_compra_sync (
     numero, descripcion, monto, estado, solicitante, fecha_creacion
   ) VALUES (
     'PR-2025-00042', 'Equipos IT', 45000, 'APROBADO', 'Juan', NOW()
   );

4. Actualiza PR:
   - erpStatus: PENDING_SYNC
   - erpSentAt: NULL (aún no sincronizado)

┌─────────────────────────────────────────────────────────────┐
│ PASO 3: Sync-Client sincroniza (cada 5 minutos)            │
└─────────────────────────────────────────────────────────────┘
5. ax-sync-client.exe ejecuta:

   a) DOWNLOAD de PostgreSQL (conecta a Parse):
      GET http://parse-api/api/sync/download/tenant-123?tabla=requerimientos_compra&ultimaSync=2025-11-28T00:00:00Z

   b) Parse backend lee de sync.requerimientos_compra_sync y responde:
      {
        "data": [
          {
            "numero": "PR-2025-00042",
            "descripcion": "Equipos IT",
            "monto": 45000,
            ...
          }
        ]
      }

   c) Sync-Client inserta en Softland:
      INSERT INTO SoftlandDB.dbo.RequerimientosCompra (
        NumeroRequerimiento, Descripcion, MontoEstimado, Estado
      ) VALUES (
        'PR-2025-00042', 'Equipos IT', 45000, 'APROBADO'
      );

   d) Ejecuta post_process (opcional):
      -- Marcar como sincronizado en control
      UPDATE sync_control
      SET ultima_bajada = GETDATE()
      WHERE tabla = 'requerimientos_compra';

6. Sync-Client envía log a Parse:
   POST http://parse-api/api/sync/logs
   {
     "tabla": "requerimientos_compra",
     "estado": "exitoso",
     "registrosAfectados": 1
   }

7. Parse actualiza tabla sync (marca como sincronizado):
   UPDATE sync.requerimientos_compra_sync
   SET sincronizado = true, fecha_sincronizacion = NOW()
   WHERE numero_requerimiento = 'PR-2025-00042'
```

### 2. Softland → Hub (Sincronizar Purchase Orders)

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: Sync-Client lee Softland (cada 5 minutos)          │
└─────────────────────────────────────────────────────────────┘
1. hub-sync-client.exe ejecuta:

   a) Lee última sincronización:
      SELECT ultima_subida
      FROM sync_control
      WHERE tabla = 'ordenes_compra';
      -- Resultado: 2025-11-28 10:00:00

   b) Query incremental en Softland:
      SELECT
        NumeroOC, NumeroRequerimiento, MontoTotal,
        FechaCreacion, Estado
      FROM SoftlandDB.dbo.OrdenesCompra
      WHERE FechaModificacion > '2025-11-28 10:00:00';

      -- Resultado: 1 OC nueva
      {
        "NumeroOC": "OC-2025-789",
        "NumeroRequerimiento": "PR-2025-00042",
        "MontoTotal": 45000,
        "Estado": "ACTIVA"
      }

┌─────────────────────────────────────────────────────────────┐
│ PASO 2: Sync-Client envía a Parse                        │
└─────────────────────────────────────────────────────────────┘
2. Sync-Client llama API de Parse:
   POST http://parse-api/api/sync/upload/tenant-123
   Headers: X-API-Key: {sync-client-api-key}
   Body: {
     "tabla": "ordenes_compra",
     "data": [{
       "NumeroOC": "OC-2025-789",
       "NumeroRequerimiento": "PR-2025-00042",
       "MontoTotal": 45000,
       "FechaCreacion": "2025-11-28T10:00:00Z",
       "Estado": "ACTIVA"
     }],
     "timestamp": "2025-11-28T12:00:00Z"
   }

┌─────────────────────────────────────────────────────────────┐
│ PASO 3: Parse escribe a tabla sync                      │
└─────────────────────────────────────────────────────────────┘
3. Parse Backend (endpoint /api/sync/upload):

   a) Inserta en tabla sync:
      INSERT INTO sync.ordenes_compra_sync (
        numero_oc, numero_requerimiento, monto_total, estado, procesado
      ) VALUES (
        'OC-2025-789', 'PR-2025-00042', 45000, 'ACTIVA', false
      );

┌─────────────────────────────────────────────────────────────┐
│ PASO 4: Hub detecta nueva OC (job polling cada 1 min)   │
└─────────────────────────────────────────────────────────────┘
4. Hub Backend (job automático):

   a) Lee tabla sync:
      SELECT * FROM sync.ordenes_compra_sync
      WHERE procesado = false;

   b) Busca Purchase Request:
      SELECT id FROM hub.PurchaseRequest
      WHERE number = 'PR-2025-00042';

   c) Crea Purchase Order:
      INSERT INTO hub.PurchaseOrder (
        id, number, amount, status, clientTenantId
      ) VALUES (
        gen_random_uuid(), 'OC-2025-789', 45000, 'ACTIVE', 'tenant-123'
      );

   d) Actualiza Purchase Request:
      UPDATE hub.PurchaseRequest
      SET status = 'PO_CREATED',
          purchaseOrderId = {nuevo_po_id}
      WHERE number = 'PR-2025-00042';

   e) Marca OC como procesada:
      UPDATE sync.ordenes_compra_sync
      SET procesado = true, fecha_procesado = NOW()
      WHERE numero_oc = 'OC-2025-789';

   f) Crea notificación:
      INSERT INTO hub.Notification (
        userId, type, title, message
      ) VALUES (
        {solicitante_id},
        'PO_CREATED',
        '📄 Orden de Compra generada',
        'Se ha generado la OC OC-2025-789 por $45,000'
      );

   g) Emite WebSocket:
      io.to(`user:{solicitante_id}`).emit('notification', {...});

5. Usuario recibe notificación en tiempo real
```

### 3. Hub → Softland (Recepciones)

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario crea recepción en Hub                           │
└─────────────────────────────────────────────────────────────┘
1. Frontend Hub:
   POST /api/v1/receptions
   { purchaseOrderId, items: [...], deliveryNote: "..." }

2. Backend Hub:
   - Crea en hub.PurchaseReception
   - Inserta en sync.recepciones_sync

3. Sync-Client (próxima ejecución):
   - DOWNLOAD de recepciones_sync
   - INSERT en Softland.dbo.Recepciones

4. Softland actualiza inventario automáticamente

5. Hub actualiza:
   - erpStatus: SYNCED
   - Notifica al solicitante
```

---

## 📋 Configuración del Sync-Client

### 1. Configuración en PostgreSQL (sync_configurations)

```json
{
  "id": "config-123",
  "tenantId": "tenant-abc",

  // Credenciales Softland (encriptadas)
  "sqlServerHost": "192.168.1.100",
  "sqlServerPort": 1433,
  "sqlServerDatabase": "SoftlandDB",
  "sqlServerUser": "sync_user",
  "sqlServerPassword": "encrypted_password_here",

  // Configuración de tablas
  "configuracionTablas": {
    "tablasSubida": [
      {
        "nombre": "ordenes_compra",
        "origen": "SoftlandDB.dbo.OrdenesCompra",
        "incremental": true,
        "campoFecha": "FechaModificacion",

        "process": {
          "query": `
            SELECT
              NumeroOC,
              NumeroRequerimiento,
              MontoTotal,
              FechaCreacion,
              Estado,
              FechaModificacion
            FROM SoftlandDB.dbo.OrdenesCompra
            WHERE FechaModificacion > @ultimaSync
          `
        },

        "destino": "sync.ordenes_compra_sync",
        "mapping": {
          "NumeroOC": "numero_oc",
          "NumeroRequerimiento": "numero_requerimiento",
          "MontoTotal": "monto_total",
          "FechaCreacion": "fecha_creacion",
          "Estado": "estado"
        }
      }
    ],

    "tablasBajada": [
      {
        "nombre": "requerimientos_compra",
        "origen": "sync.requerimientos_compra_sync",
        "destino": "SoftlandDB.dbo.RequerimientosCompra",
        "incremental": true,
        "campoFecha": "fecha_modificacion",

        "pre_process": {
          "sql": `
            -- Crear tabla si no existe
            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RequerimientosCompra')
            BEGIN
              CREATE TABLE RequerimientosCompra (
                NumeroRequerimiento NVARCHAR(50) PRIMARY KEY,
                Descripcion NVARCHAR(MAX),
                MontoEstimado DECIMAL(18,2),
                Estado NVARCHAR(50),
                Solicitante NVARCHAR(100),
                FechaCreacion DATETIME2,
                FechaModificacion DATETIME2 DEFAULT GETDATE()
              )
            END
          `
        },

        "process": {
          "query": `
            SELECT
              numero, descripcion, monto, estado,
              solicitante, fecha_creacion
            FROM sync.requerimientos_compra_sync
            WHERE fecha_modificacion > @ultimaSync
          `
        },

        "post_process": {
          "sql": `
            -- Merge en tabla destino
            MERGE SoftlandDB.dbo.RequerimientosCompra AS target
            USING #temp_requerimientos_compra AS source
            ON target.NumeroRequerimiento = source.numero
            WHEN MATCHED THEN
              UPDATE SET
                Descripcion = source.descripcion,
                MontoEstimado = source.monto,
                Estado = source.estado,
                FechaModificacion = GETDATE()
            WHEN NOT MATCHED THEN
              INSERT (NumeroRequerimiento, Descripcion, MontoEstimado, Estado, Solicitante, FechaCreacion)
              VALUES (source.numero, source.descripcion, source.monto, source.estado, source.solicitante, source.fecha_creacion);

            -- Limpiar temporal
            DROP TABLE #temp_requerimientos_compra;
          `
        },

        "mapping": {
          "numero": "NumeroRequerimiento",
          "descripcion": "Descripcion",
          "monto": "MontoEstimado",
          "estado": "Estado",
          "solicitante": "Solicitante",
          "fecha_creacion": "FechaCreacion"
        }
      },

      {
        "nombre": "recepciones",
        "origen": "sync.recepciones_sync",
        "destino": "SoftlandDB.dbo.Recepciones",
        "incremental": true,
        "campoFecha": "fecha_modificacion",

        "post_process": {
          "sql": `
            MERGE SoftlandDB.dbo.Recepciones AS target
            USING #temp_recepciones AS source
            ON target.NumeroRecepcion = source.numero_recepcion
            WHEN NOT MATCHED THEN
              INSERT (NumeroRecepcion, NumeroOC, FechaRecepcion, Receptor)
              VALUES (source.numero_recepcion, source.numero_oc, source.fecha_recepcion, source.receptor);

            -- Actualizar inventario
            INSERT INTO SoftlandDB.dbo.MovimientosStock (Tipo, Cantidad, ProductoID, OrigenRecepcionID)
            SELECT 'ENTRADA', ri.cantidad_recibida, ri.producto_id, r.id
            FROM Recepciones r
            INNER JOIN RecepcionesItems ri ON r.id = ri.recepcion_id
            WHERE r.NumeroRecepcion IN (SELECT numero_recepcion FROM #temp_recepciones);
          `
        }
      }
    ]
  }
}
```

### 2. Instalación del Sync-Client

```bash
# En el servidor Windows donde está Softland

# 1. Copiar ejecutable
copy ax-sync-client.exe C:\sync\

# 2. Inicializar configuración (conecta a Parse, NO a Hub)
cd C:\sync
ax-sync-client.exe init ^
  --api-url https://parse-api.com ^
  --api-key {api-key-generada-en-PARSE} ^
  --tenant-id tenant-abc

# 3. Test de conexión
ax-sync-client.exe test

# 4. Sincronización manual (test)
ax-sync-client.exe sync --direction both

# 5. Programar con Task Scheduler
ax-sync-client.exe schedule ^
  --interval 5 ^
  --task-name "Hub Sync via Parse"
```

**Nota**: El sync-client se autentica contra Parse usando una API Key generada en Parse.

### 3. Windows Task Scheduler

```xml
<!-- Tarea programada cada 5 minutos -->
<Task>
  <Triggers>
    <CalendarTrigger>
      <Repetition>
        <Interval>PT5M</Interval>
      </Repetition>
    </CalendarTrigger>
  </Triggers>
  <Actions>
    <Exec>
      <Command>C:\sync\hub-sync-client.exe</Command>
      <Arguments>sync --direction both</Arguments>
      <WorkingDirectory>C:\sync</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
```

---

## 📊 Modelo de Datos PostgreSQL (Compartido)

**Nota**: Estas tablas están en el schema `sync` de PostgreSQL y son accedidas por:
- **Parse**: Lee y escribe via endpoints /api/sync/*
- **Hub**: Solo lee y escribe directamente a las tablas

### Tablas de Sincronización (schema sync)

```sql
-- Tabla temporal para PRs que van a Softland
-- Hub escribe aquí cuando un PR es aprobado
-- Parse lee de aquí para enviar al sync-client
CREATE TABLE sync.requerimientos_compra_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  monto DECIMAL(18,2),
  estado VARCHAR(50),
  solicitante VARCHAR(100),
  departamento VARCHAR(100),
  fecha_creacion TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT NOW(),

  -- Control de sync
  sincronizado BOOLEAN DEFAULT FALSE,
  fecha_sincronizacion TIMESTAMP,

  -- FK a Hub
  purchase_request_id UUID REFERENCES hub."PurchaseRequest"(id)
);

-- Tabla para OCs que vienen de Softland
-- Parse escribe aquí cuando sync-client sube OCs
-- Hub lee de aquí (polling job) para procesar OCs
CREATE TABLE sync.ordenes_compra_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_oc VARCHAR(50) UNIQUE NOT NULL,
  numero_requerimiento VARCHAR(50),
  monto_total DECIMAL(18,2),
  fecha_creacion TIMESTAMP,
  estado VARCHAR(50),
  fecha_modificacion TIMESTAMP DEFAULT NOW(),

  -- Control
  procesado BOOLEAN DEFAULT FALSE,
  fecha_procesado TIMESTAMP
);

-- Tabla para recepciones que van a Softland
-- Hub escribe aquí cuando usuario crea recepción
-- Parse lee de aquí para enviar al sync-client
CREATE TABLE sync.recepciones_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_recepcion VARCHAR(50) UNIQUE NOT NULL,
  numero_oc VARCHAR(50),
  fecha_recepcion TIMESTAMP,
  receptor VARCHAR(100),
  fecha_modificacion TIMESTAMP DEFAULT NOW(),
  sincronizado BOOLEAN DEFAULT FALSE
);

-- Índices
CREATE INDEX idx_req_sync_modificacion ON sync.requerimientos_compra_sync(fecha_modificacion) WHERE NOT sincronizado;
CREATE INDEX idx_oc_sync_modificacion ON sync.ordenes_compra_sync(fecha_modificacion) WHERE NOT procesado;
CREATE INDEX idx_rec_sync_modificacion ON sync.recepciones_sync(fecha_modificacion) WHERE NOT sincronizado;
```

---

## 🔐 Seguridad

### 1. API Key para Sync-Client

**IMPORTANTE**: Las API Keys se generan en **Parse**, no en Hub.

```sql
-- En Parse PostgreSQL (NO en Hub)
INSERT INTO sync_api_keys (
  id, tenantId, apiKey, nombre, permisos, activo
) VALUES (
  gen_random_uuid(),
  'tenant-abc',
  'sync-client-api-key-uuid-here',
  'Sync Client Softland',
  '{"sync": true, "upload": true, "download": true}',
  true
);
```

### 2. Encriptación de Credenciales

El sync-client almacena credenciales de Softland encriptadas con AES-256-GCM en `sync-config.enc`.

```javascript
// sync-config.enc (encriptado)
{
  "apiUrl": "https://parse-api.com",  // ← Apunta a Parse, NO a Hub
  "apiKey": "sync-client-api-key-uuid-here",
  "tenantId": "tenant-abc",
  "sqlServer": {
    "host": "192.168.1.100",
    "port": 1433,
    "database": "SoftlandDB",
    "user": "sync_user",
    "password": "encrypted_with_aes_256"
  }
}
```

---

## ✅ Ventajas de esta Arquitectura

### ✅ Reutilización Total
- Sync-client ya está implementado y probado en Parse
- No necesitas reimplementar conexión SQL
- Funciona con cualquier SQL Server (no solo Softland)
- Parse ya tiene todos los endpoints /api/sync/*

### ✅ Simplicidad Hub
- Hub solo hace CRUD PostgreSQL (lee/escribe sync tables)
- Hub NO conoce credenciales de Softland
- Hub NO necesita implementar autenticación de sync-client
- Hub NO necesita encriptación de credenciales SQL

### ✅ Seguridad
- Credenciales SQL nunca salen del servidor del cliente
- Conexión cifrada cliente → Parse
- Parse maneja autenticación con API Keys
- Hub no tiene acceso a credenciales sensibles

### ✅ Flexibilidad
- ETL personalizable con SQL (configurado en Parse)
- Fácil agregar nuevas tablas de sincronización
- Soporte incremental automático

### ✅ Escalabilidad
- Un sync-client por cliente
- Sincronización independiente
- No afecta performance de Hub ni Parse

---

## 📅 Roadmap de Implementación

### Fase 1: Setup Tablas Sync en PostgreSQL (0.5 semanas)
- ✅ Crear schema `sync` en PostgreSQL compartido
- ✅ Crear tablas: requerimientos_compra_sync, ordenes_compra_sync, recepciones_sync
- ❌ NO crear endpoints en Hub (están en Parse)
- ❌ NO generar API keys en Hub (se generan en Parse)

### Fase 2: Configurar Sync-Client en Parse (1 semana)
**Nota**: Esto se hace en Parse, NO en Hub
- ✅ Generar API key en Parse admin
- ✅ Configurar sync_configurations en Parse para tenant
- ✅ Configurar tablas de sincronización (JSON config)
- ✅ Test de endpoints Parse /api/sync/*

### Fase 3: Instalar Sync-Client en Servidor Cliente (0.5 semanas)
- ✅ Copiar ax-sync-client.exe a servidor Windows del cliente
- ✅ Inicializar apuntando a Parse (--api-url https://parse-api.com)
- ✅ Test de sincronización manual
- ✅ Programar Task Scheduler (cada 5 min)

### Fase 4: Integrar con Hub (2 semanas)
- ✅ Service en Hub para escribir PRs aprobados a sync.requerimientos_compra_sync
- ✅ Job en Hub (cada 1 min) para leer sync.ordenes_compra_sync
- ✅ Procesador de OCs en Hub (crea PurchaseOrder, actualiza PR)
- ✅ Sistema de notificaciones en Hub
- ✅ Service para escribir recepciones a sync.recepciones_sync

### Fase 5: Testing End-to-End (1 semana)
- ✅ Test: Hub PR → sync table → Parse → Sync-client → Softland
- ✅ Test: Softland OC → Sync-client → Parse → sync table → Hub job → Notificación
- ✅ Test: Hub Recepción → sync table → Parse → Sync-client → Softland
- ✅ Validar notificaciones en tiempo real
- ✅ Validar logs en Parse

**Total: 5 semanas** (menos trabajo para Hub porque Parse maneja sync)

---

## 🆚 Comparación: Con Parse vs Con Sync-Client

| Aspecto | Con Parse Gateway (webhooks) | Con Sync-Client + Parse |
|---------|------------------------------|-------------------------|
| **Complejidad** | Media (webhooks + API calls) | Baja (solo sync tables) |
| **Dependencias Hub** | Parse webhooks | Solo PostgreSQL |
| **Latencia** | 2 saltos (Hub → Parse → Softland) | Hub escribe → Parse lee → Softland |
| **Setup Hub** | Implementar webhook handlers | Solo leer/escribir tables |
| **Setup Parse** | Configurar webhooks | Configurar sync-client |
| **Seguridad** | Credenciales en Parse | Credenciales en Parse |
| **Debugging** | Logs en 3 lugares | Logs en 3 lugares |
| **Escalabilidad** | Parse maneja N clientes | 1 .exe por cliente |
| **Mantenimiento Hub** | Endpoints webhook | Queries PostgreSQL |
| **Mantenimiento Parse** | Envío webhooks | Endpoints /api/sync/* |

**Recomendación**: **Sync-Client + Parse** por simplicidad en Hub (no necesita webhooks ni endpoints especiales).

---

## 📚 Documentos de Referencia

1. `PURCHASE_REQUESTS_MODULE.md` - Specs del módulo
2. `FINAL_ARCHITECTURE.md` - Arquitectura con Parse (descartada)
3. Parse docs: `SYNC-SYSTEM-DOCS.md` - Sync-client completo
4. Parse docs: `SYNC-CLIENT-MIGRATION.md` - Migración incremental

---

## ✅ Conclusión

**Arquitectura Final**: Hub + Sync-Client Standalone + Softland SQL

✅ **Más simple** que Parse gateway
✅ **Reutiliza** componente existente probado
✅ **Menos dependencias** (no necesita Parse)
✅ **Más seguro** (credenciales no salen del cliente)
✅ **Más flexible** (ETL personalizable con SQL)

**Estado**: ✅ Listo para implementación

---

**Documento creado**: 2025-11-29
**Versión**: 2.0 Final (Con Sync-Client)
**Autor**: Hub Development Team
