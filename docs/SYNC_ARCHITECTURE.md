# Arquitectura de Sincronización Hub - Parse - ERP

**Fecha**: 28 Diciembre 2025
**Estado**: Diseño Aprobado
**Versión**: 1.1

---

## 1. Visión General

Hub es un portal de proveedores y compras que necesita intercambiar información con ERPs externos. Parse actúa como intermediario/broker de sincronización.

### 1.1 ERPs Soportados

| ERP | Base de Datos | Método de Conexión |
|-----|---------------|-------------------|
| **Axioma** | SQL Server | Queries directas |
| **Softland** | SQL Server | Queries directas |

> **Nota**: Ninguno de los ERPs tiene APIs REST. La sincronización se realiza mediante queries SQL directas a sus bases de datos.

### 1.2 Diagrama de Arquitectura

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA CON SQL SERVER DIRECTO                         │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   ┌─────────────┐       ┌─────────────────┐       ┌───────────────────────┐   │
│   │     HUB     │       │      PARSE      │       │  ERPs (SQL Server)    │   │
│   │   hub_db    │◄─────►│    parse_db     │◄─────►│                       │   │
│   │ (PostgreSQL)│  API  │  (PostgreSQL)   │ MSSQL │  ┌─────────────────┐  │   │
│   └─────────────┘       │                 │       │  │     AXIOMA      │  │   │
│                         │  ┌───────────┐  │───────│  │   (SQL Server)  │  │   │
│                         │  │ Sync      │  │       │  └─────────────────┘  │   │
│                         │  │ Worker    │  │       │                       │   │
│                         │  └───────────┘  │       │  ┌─────────────────┐  │   │
│                         │                 │───────│  │    SOFTLAND     │  │   │
│                         └─────────────────┘       │  │   (SQL Server)  │  │   │
│                                                   │  └─────────────────┘  │   │
│   Portal proveedores     Broker/Queue             └───────────────────────┘   │
│   Requerimientos         Sync Worker              Datos maestros              │
│   OCs, Facturas          Transformación           Pagos emitidos              │
│                                                                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Requisitos de Conectividad

| Requisito | Descripción |
|-----------|-------------|
| **Red** | Parse debe poder conectarse a SQL Server del ERP (VPN, whitelist IP, etc.) |
| **Puerto** | 1433 (default SQL Server) o el configurado |
| **Usuario** | Usuario SQL con permisos de lectura en tablas maestras |
| **Escritura** | Permisos de INSERT en tablas de OC (si el ERP lo permite) |
| **Horario** | Queries de sincronización en horarios de baja carga |

---

## 2. Ownership de Datos (Fuente de Verdad)

### 2.1 Tabla de Ownership

| Entidad | Dueño | Parse | Hub | Dirección | Trigger | Frecuencia |
|---------|-------|-------|-----|-----------|---------|------------|
| **DATOS MAESTROS** |
| Proveedores | ERP | Copia | Copia | ERP → Parse → Hub | Cambio en ERP | Diario |
| Productos | ERP | Copia | No guarda | ERP → Parse → Hub | Cambio en ERP | Diario |
| Sectores | ERP | Copia | No guarda | ERP → Parse → Hub | Cambio en ERP | Semanal |
| Categorías | ERP | Copia | No guarda | ERP → Parse → Hub | Cambio en ERP | Semanal |
| Cuentas contables | ERP | Copia | No guarda | ERP → Parse | Cambio en ERP | Mensual |
| **TRANSACCIONES HUB** |
| Requerimientos | Hub | No | Maestro | Solo Hub | - | - |
| Órdenes de Compra | Hub | Transita | Maestro | Hub → Parse → ERP | OC Aprobada | Inmediato |
| Recepciones | Hub | Transita | Maestro | Hub → Parse → ERP | Recepción OK | Inmediato |
| **DOCUMENTOS** |
| Facturas (PDF) | Parse | Maestro | No | - | Upload | - |
| Facturas (datos) | Parse | Extrae | Copia | Parse → Hub | Procesamiento OK | Inmediato |
| **FINANCIERO** |
| Pagos emitidos | ERP | Transita | Copia | ERP → Parse → Hub | Pago emitido | Diario |
| Retenciones | ERP | Transita | Copia | ERP → Parse → Hub | Con el pago | Diario |

### 2.2 Definiciones

- **Dueño/Maestro**: Sistema donde se CREA y MODIFICA el dato. Fuente de verdad en caso de conflicto.
- **Copia**: Réplica local para consultas rápidas, JOINs locales y funcionamiento independiente.
- **Transita**: No se guarda permanentemente, solo se encola, transforma y registra log.
- **No guarda**: Se consulta por API en tiempo real, no se almacena localmente.

---

## 3. Modelo de Datos en Parse (Sincronización)

### 3.0 Diseño Flexible para Múltiples ERPs y Estructuras

> **Problema**: Cada ERP (Axioma, Softland, etc.) tiene diferentes estructuras de tablas, y pueden surgir nuevas tablas/campos en el futuro.

> **Solución**: Usar JSONB para almacenar payloads genéricos + configuración de schema por entidad.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODELO FLEXIBLE DE SYNC                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  sync_entity_config                    sync_data                             │
│  ┌───────────────────────────┐        ┌────────────────────────────────┐    │
│  │ Configuración por entidad │        │ Datos genéricos (JSONB)        │    │
│  │ + ERP + tenant            │◄───────│                                 │    │
│  │                           │        │ payload: { cualquier estructura}│    │
│  │ - Queries SQL             │        │                                 │    │
│  │ - Mapeo de campos         │        │                                 │    │
│  │ - Reglas de transformación│        │                                 │    │
│  └───────────────────────────┘        └────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Tablas de Sincronización

```sql
-- Configuración de entidades (schema registry)
CREATE TABLE sync_entity_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(50) NOT NULL,

    -- Identificación
    entity_type     VARCHAR(50) NOT NULL,   -- 'PROVEEDOR', 'PAGO', 'OC', 'SECTOR', etc.
    erp_type        VARCHAR(20) NOT NULL,   -- 'AXIOMA', 'SOFTLAND', 'CUSTOM'

    -- Tabla origen en el ERP
    source_table    VARCHAR(100),           -- 'Proveedores', 'PagosEmitidos', etc.
    primary_key     VARCHAR(50),            -- 'CodProv', 'IdPago', etc.
    timestamp_field VARCHAR(50),            -- Campo para sync incremental 'FechaModif'

    -- Queries SQL (específicas por ERP)
    queries         JSONB NOT NULL,
    /*
    {
        "select_all": "SELECT * FROM Proveedores WHERE Activo = 1",
        "select_since": "SELECT * FROM Proveedores WHERE FechaModif > @lastSync",
        "select_by_id": "SELECT * FROM Proveedores WHERE CodProv = @id",
        "insert": "INSERT INTO ... OUTPUT INSERTED.Id VALUES (...)",
        "update": "UPDATE ... WHERE ... "
    }
    */

    -- Mapeo de campos ERP ↔ Hub
    field_mapping   JSONB NOT NULL,
    /*
    {
        "erp_to_hub": {
            "CodProv": "id",
            "RazonSocial": "nombre",
            "NumCUIT": "cuit"
        },
        "hub_to_erp": {
            "id": "CodProv",
            "nombre": "RazonSocial"
        }
    }
    */

    -- Reglas de transformación (opcional)
    transform_rules JSONB,
    /*
    {
        "cuit": { "type": "format", "pattern": "##-########-#" },
        "fecha": { "type": "date", "format": "YYYY-MM-DD" },
        "activo": { "type": "boolean", "true_value": 1, "false_value": 0 }
    }
    */

    -- Configuración de sync
    direction       VARCHAR(10) NOT NULL,   -- 'IN', 'OUT', 'BOTH'
    enabled         BOOLEAN DEFAULT true,
    sync_frequency  VARCHAR(20),            -- 'realtime', 'hourly', 'daily'

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, entity_type, erp_type)
);

-- Datos sincronizados (payload genérico JSONB)
CREATE TABLE sync_data (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(50) NOT NULL,

    -- Referencia a config
    config_id       UUID REFERENCES sync_entity_config(id),
    entity_type     VARCHAR(50) NOT NULL,   -- Redundante para queries rápidas
    erp_type        VARCHAR(20) NOT NULL,   -- Redundante para queries rápidas

    -- Identificación del registro
    entity_id       VARCHAR(100) NOT NULL,  -- ID único en el ERP

    -- Payload genérico (cualquier estructura)
    payload         JSONB NOT NULL,
    /*
    {
        "CodProv": "P001",
        "RazonSocial": "Proveedor SA",
        "CUIT": "30-12345678-9",
        "Activo": 1,
        "_source": {
            "table": "Proveedores",
            "fetched_at": "2025-12-28T10:00:00Z"
        }
    }
    */

    -- Control de cambios
    payload_hash    VARCHAR(64),            -- SHA256 del payload para detectar cambios
    version         INTEGER DEFAULT 1,       -- Versión del registro

    -- Estado de sincronización
    status          VARCHAR(20) DEFAULT 'PENDING',  -- 'PENDING', 'SYNCED', 'ERROR'
    sync_direction  VARCHAR(10),            -- 'IN' (ERP→Hub), 'OUT' (Hub→ERP)
    synced_at       TIMESTAMP,
    error_message   TEXT,

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    -- Índices
    INDEX idx_sync_data_tenant (tenant_id, entity_type, status),
    INDEX idx_sync_data_entity (entity_type, entity_id),
    INDEX idx_sync_data_payload ((payload->>'CodProv')),  -- Ejemplo de índice JSONB

    UNIQUE(tenant_id, entity_type, erp_type, entity_id)
);

-- Cola de sincronización (mensajes pendientes)
CREATE TABLE sync_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(50) NOT NULL,

    -- Origen y destino
    source          VARCHAR(20) NOT NULL,  -- 'HUB', 'ERP', 'PARSE'
    destination     VARCHAR(20) NOT NULL,  -- 'HUB', 'ERP', 'PARSE'

    -- Qué se sincroniza
    entity_type     VARCHAR(50) NOT NULL,  -- 'PROVEEDOR', 'OC', 'PAGO', etc.
    entity_id       VARCHAR(100) NOT NULL, -- ID en el sistema origen
    action          VARCHAR(20) NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE'

    -- Datos
    payload         JSONB NOT NULL,        -- Datos a sincronizar

    -- Estado
    status          VARCHAR(20) DEFAULT 'PENDING',  -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY'
    priority        INTEGER DEFAULT 5,     -- 1 = máxima, 10 = mínima
    retry_count     INTEGER DEFAULT 0,
    max_retries     INTEGER DEFAULT 3,

    -- Resultado
    external_id     VARCHAR(100),          -- ID asignado en el destino
    response        JSONB,                 -- Respuesta del destino
    error_message   TEXT,

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    scheduled_at    TIMESTAMP DEFAULT NOW(),  -- Para programar envío
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP,

    -- Índices
    INDEX idx_sync_queue_status (status, scheduled_at),
    INDEX idx_sync_queue_entity (entity_type, entity_id),
    INDEX idx_sync_queue_tenant (tenant_id, status)
);

-- Configuración de sincronización por entidad
CREATE TABLE sync_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(50) NOT NULL,

    -- Configuración
    entity_type     VARCHAR(50) NOT NULL,  -- 'PROVEEDOR', 'OC', 'PAGO'
    direction       VARCHAR(10) NOT NULL,  -- 'IN', 'OUT', 'BOTH'
    enabled         BOOLEAN DEFAULT true,

    -- Método de conexión
    method          VARCHAR(20) NOT NULL,  -- 'API', 'DATABASE', 'FILE', 'WEBHOOK'

    -- Configuración del método
    config          JSONB NOT NULL,
    /*
    Para API:
    {
        "url": "https://erp.example.com/api/v1",
        "auth_type": "bearer|basic|api_key",
        "credentials": { ... },
        "endpoints": {
            "create": "POST /ordenes",
            "update": "PUT /ordenes/{id}",
            "get": "GET /ordenes/{id}",
            "list": "GET /ordenes?since={lastSync}"
        }
    }

    Para DATABASE:
    {
        "connection_string": "...",
        "queries": {
            "insert": "INSERT INTO ordenes_compra ...",
            "select": "SELECT * FROM pagos WHERE fecha > :lastSync"
        }
    }

    Para FILE:
    {
        "path": "/shared/erp/",
        "format": "csv|json|xml",
        "filename_pattern": "OC_{date}_{seq}.json"
    }
    */

    -- Transformación de datos
    field_mapping   JSONB,  -- Mapeo de campos Hub ↔ ERP
    /*
    {
        "hub_to_erp": {
            "numero": "order_number",
            "proveedor.cuit": "vendor_tax_id",
            "total": "amount"
        },
        "erp_to_hub": {
            "order_number": "numero",
            "vendor_tax_id": "proveedor.cuit"
        }
    }
    */

    -- Scheduling
    sync_frequency  VARCHAR(20),  -- 'realtime', 'hourly', 'daily', 'manual'
    last_sync_at    TIMESTAMP,
    next_sync_at    TIMESTAMP,

    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, entity_type, direction)
);

-- Log de sincronización (auditoría)
CREATE TABLE sync_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(50) NOT NULL,
    sync_queue_id   UUID REFERENCES sync_queue(id),

    -- Detalles
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       VARCHAR(100),
    action          VARCHAR(20) NOT NULL,
    direction       VARCHAR(10) NOT NULL,  -- 'IN', 'OUT'

    -- Resultado
    status          VARCHAR(20) NOT NULL,  -- 'SUCCESS', 'ERROR', 'SKIPPED'
    message         TEXT,

    -- Datos para debug
    request_payload JSONB,
    response_data   JSONB,

    -- Timing
    duration_ms     INTEGER,
    created_at      TIMESTAMP DEFAULT NOW(),

    INDEX idx_sync_log_tenant (tenant_id, created_at DESC),
    INDEX idx_sync_log_entity (entity_type, entity_id)
);

-- Estado de sincronización por entidad (para saber qué ya se sincronizó)
CREATE TABLE sync_state (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    direction       VARCHAR(10) NOT NULL,

    -- Marcadores
    last_sync_at    TIMESTAMP,
    last_entity_id  VARCHAR(100),  -- Último ID sincronizado
    last_timestamp  TIMESTAMP,     -- Timestamp del último registro

    -- Estadísticas
    total_synced    INTEGER DEFAULT 0,
    last_batch_size INTEGER DEFAULT 0,

    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(tenant_id, entity_type, direction)
);
```

---

## 4. APIs de Sincronización

### 4.1 Parse → Hub (API que Hub consume)

```
Base URL: https://parse.axiomacloud.com/api/v1/sync
```

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/inbound/{entity}` | Obtener registros pendientes para Hub |
| POST | `/inbound/{entity}/ack` | Confirmar recepción de registros |
| GET | `/inbound/pending` | Listar todas las entidades con datos pendientes |

**Ejemplo: Obtener pagos nuevos**
```http
GET /api/v1/sync/inbound/pagos?since=2025-12-28T00:00:00Z&limit=100
Authorization: X-API-Key: sk_xxx

Response:
{
    "success": true,
    "data": [
        {
            "id": "sync-123",
            "entity_id": "PAG-001",
            "action": "CREATE",
            "payload": {
                "numero": "PAG-001",
                "fecha": "2025-12-28",
                "monto": 150000,
                "proveedor_cuit": "30-71234567-9",
                "facturas": ["FC-001", "FC-002"],
                "retenciones": [...]
            }
        }
    ],
    "pagination": {
        "total": 45,
        "hasMore": true,
        "nextCursor": "sync-124"
    }
}
```

### 4.2 Hub → Parse (API que Hub llama)

```
Base URL: https://parse.axiomacloud.com/api/v1/sync
```

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/outbound/{entity}` | Enviar registro para sincronizar al ERP |
| GET | `/outbound/{entity}/{id}/status` | Consultar estado de sincronización |
| POST | `/outbound/batch` | Enviar múltiples registros |

**Ejemplo: Enviar OC aprobada**
```http
POST /api/v1/sync/outbound/ordenes-compra
Authorization: X-API-Key: sk_xxx
Content-Type: application/json

{
    "entity_id": "OC-2025-001",
    "action": "CREATE",
    "priority": 1,
    "payload": {
        "numero": "OC-2025-001",
        "fecha": "2025-12-28",
        "proveedor": {
            "cuit": "30-71234567-9",
            "razon_social": "Proveedor SA"
        },
        "items": [
            {
                "codigo": "PROD-001",
                "descripcion": "Producto X",
                "cantidad": 100,
                "precio_unitario": 1500,
                "total": 150000
            }
        ],
        "total": 150000,
        "moneda": "ARS"
    }
}

Response:
{
    "success": true,
    "sync_id": "sync-456",
    "status": "PENDING",
    "message": "Encolado para sincronización"
}
```

### 4.3 Webhooks (Parse notifica a Hub)

Parse puede notificar a Hub cuando hay eventos importantes:

```http
POST https://hub.example.com/api/webhooks/sync
X-Webhook-Secret: whsec_xxx
Content-Type: application/json

{
    "event": "sync.completed",
    "entity_type": "PAGO",
    "entity_id": "PAG-001",
    "sync_id": "sync-123",
    "status": "SUCCESS",
    "external_id": "ERP-PAG-001",
    "timestamp": "2025-12-28T10:30:00Z"
}
```

---

## 5. Flujos de Sincronización

### 5.1 Flujo: Maestro Proveedores (ERP → Hub)

```
┌─────────┐         ┌─────────────────┐         ┌─────────┐
│   ERP   │         │      PARSE      │         │   HUB   │
└────┬────┘         └────────┬────────┘         └────┬────┘
     │                       │                       │
     │  1. Sync programado   │                       │
     │  (o cambio detectado) │                       │
     ├──────────────────────►│                       │
     │                       │                       │
     │                       │  2. Guardar en        │
     │                       │  param_maestros       │
     │                       │                       │
     │                       │  3. Encolar en        │
     │                       │  sync_queue           │
     │                       │  (dest: HUB)          │
     │                       │                       │
     │                       │                       │
     │                       │◄──────────────────────┤
     │                       │  4. GET /sync/inbound │
     │                       │     /proveedores      │
     │                       │                       │
     │                       ├──────────────────────►│
     │                       │  5. Datos proveedor   │
     │                       │                       │
     │                       │                       │  6. Upsert en
     │                       │                       │  Supplier
     │                       │                       │
     │                       │◄──────────────────────┤
     │                       │  7. ACK recibido      │
     │                       │                       │
     │                       │  8. Marcar COMPLETED  │
     │                       │  en sync_queue        │
     │                       │                       │
```

### 5.2 Flujo: OC Aprobada (Hub → ERP)

```
┌─────────┐         ┌─────────────────┐         ┌─────────┐
│   HUB   │         │      PARSE      │         │   ERP   │
└────┬────┘         └────────┬────────┘         └────┬────┘
     │                       │                       │
     │  1. OC Aprobada       │                       │
     │  Estado=APROBADA      │                       │
     │                       │                       │
     ├──────────────────────►│                       │
     │  2. POST /sync/       │                       │
     │  outbound/oc          │                       │
     │                       │                       │
     │                       │  3. Validar y         │
     │                       │  encolar              │
     │                       │                       │
     │◄──────────────────────┤                       │
     │  4. sync_id + PENDING │                       │
     │                       │                       │
     │                       │  5. Procesar cola     │
     │                       │  (worker async)       │
     │                       │                       │
     │                       ├──────────────────────►│
     │                       │  6. Crear OC en ERP   │
     │                       │  (API/Query/File)     │
     │                       │                       │
     │                       │◄──────────────────────┤
     │                       │  7. OK + ID externo   │
     │                       │                       │
     │                       │  8. Actualizar        │
     │                       │  sync_queue           │
     │                       │  status=COMPLETED     │
     │                       │                       │
     │◄──────────────────────┤                       │
     │  9. Webhook:          │                       │
     │  sync.completed       │                       │
     │                       │                       │
     │  10. Guardar          │                       │
     │  externalId en OC     │                       │
     │                       │                       │
```

### 5.3 Flujo: Pago Emitido (ERP → Hub)

```
┌─────────┐         ┌─────────────────┐         ┌─────────┐
│   ERP   │         │      PARSE      │         │   HUB   │
└────┬────┘         └────────┬────────┘         └────┬────┘
     │                       │                       │
     │  1. Pago emitido      │                       │
     │                       │                       │
     │  (sync diario o       │                       │
     │   webhook del ERP)    │                       │
     ├──────────────────────►│                       │
     │                       │                       │
     │                       │  2. Encolar en        │
     │                       │  sync_queue           │
     │                       │  (dest: HUB)          │
     │                       │                       │
     │                       │                       │  (job programado
     │                       │                       │   cada X minutos)
     │                       │◄──────────────────────┤
     │                       │  3. GET /sync/inbound │
     │                       │     /pagos            │
     │                       │                       │
     │                       ├──────────────────────►│
     │                       │  4. Datos pago +      │
     │                       │     retenciones       │
     │                       │                       │
     │                       │                       │  5. Crear Payment
     │                       │                       │  en hub_db
     │                       │                       │
     │                       │                       │  6. Notificar al
     │                       │                       │  proveedor (email)
     │                       │                       │
     │                       │◄──────────────────────┤
     │                       │  7. ACK               │
     │                       │                       │
```

---

## 6. Manejo de Errores

### 6.1 Reintentos

```javascript
// Política de reintentos
const retryPolicy = {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000,  // 1 segundo
    maxDelay: 30000,     // 30 segundos

    // Delay: 1s, 2s, 4s (con jitter)
    calculateDelay(retryCount) {
        const delay = Math.min(
            this.initialDelay * Math.pow(this.backoffMultiplier, retryCount),
            this.maxDelay
        );
        // Añadir jitter ±20%
        return delay * (0.8 + Math.random() * 0.4);
    }
};
```

### 6.2 Estados de Error

| Estado | Descripción | Acción |
|--------|-------------|--------|
| `FAILED` | Error definitivo, no reintentar | Notificar admin, requiere intervención manual |
| `RETRY` | Error temporal, reintentar | Aplicar backoff, programar siguiente intento |
| `TIMEOUT` | Destino no respondió | Reintentar con timeout mayor |
| `INVALID` | Datos inválidos | Marcar para revisión, no reintentar |

### 6.3 Dead Letter Queue

Registros que fallan después de todos los reintentos van a una cola especial:

```sql
-- Registros que requieren intervención manual
SELECT * FROM sync_queue
WHERE status = 'FAILED'
  AND retry_count >= max_retries
ORDER BY created_at DESC;
```

---

## 7. Monitoreo

### 7.1 Métricas Clave

| Métrica | Descripción | Alerta si... |
|---------|-------------|--------------|
| `sync_queue_pending` | Registros pendientes | > 1000 por más de 1 hora |
| `sync_queue_failed` | Registros fallidos | > 10 en última hora |
| `sync_latency_avg` | Tiempo promedio de sync | > 30 segundos |
| `sync_success_rate` | % de éxito | < 95% |

### 7.2 Dashboard de Sincronización

```sql
-- Vista de estado actual
SELECT
    entity_type,
    status,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_sec
FROM sync_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY entity_type, status
ORDER BY entity_type, status;
```

---

## 8. Seguridad

### 8.1 Autenticación

- **Hub → Parse**: API Key en header `X-API-Key`
- **Parse → ERP**: Configurable por tenant (Bearer, Basic, API Key)
- **Webhooks**: Firma HMAC en header `X-Webhook-Signature`

### 8.2 Datos Sensibles

- Credenciales de ERP encriptadas en `sync_config.config`
- Payloads con datos sensibles marcados para no loguear completos
- Retención de logs: 90 días (luego se anonimiza)

---

## 9. Consideraciones de Performance

### 9.1 Batching

- Enviar/recibir hasta 100 registros por request
- Procesar en paralelo hasta 5 workers
- Rate limiting: 100 requests/minuto por tenant

### 9.2 Caching

- Maestros (proveedores, productos) cacheados en Redis con TTL 1 hora
- Invalidar cache cuando llega sync de esa entidad

---

## 10. Configuración Específica SQL Server

### 10.1 Conexión a SQL Server desde Parse

```javascript
// Usando mssql (tedious) en Node.js
const sql = require('mssql');

const config = {
    server: '192.168.1.100',
    database: 'AXIOMA_PROD',
    user: 'hub_sync',
    password: 'xxx',
    port: 1433,
    options: {
        encrypt: true,
        trustServerCertificate: true,  // Para certs auto-firmados
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};
```

### 10.2 Configuración por ERP en sync_config

```json
{
    "method": "DATABASE",
    "driver": "mssql",
    "erp_type": "AXIOMA",

    "connection": {
        "server": "192.168.1.100",
        "database": "AXIOMA_PROD",
        "user": "hub_sync",
        "password": "encrypted:xxxx",
        "port": 1433
    },

    "queries": {
        "proveedores": {
            "select_all": "SELECT * FROM Proveedores WHERE Activo = 1",
            "select_since": "SELECT * FROM Proveedores WHERE FechaModif > @lastSync",
            "select_by_id": "SELECT * FROM Proveedores WHERE CodProv = @id"
        },
        "pagos": {
            "select_since": "SELECT p.*, d.* FROM PagosEmitidos p LEFT JOIN PagosDetalle d ON p.IdPago = d.IdPago WHERE p.FechaPago > @lastSync"
        },
        "ordenes_compra": {
            "insert_header": "INSERT INTO OrdCompra (Numero, Fecha, CodProv, Total, ...) OUTPUT INSERTED.IdOC VALUES (@numero, @fecha, @codProv, @total, ...)",
            "insert_item": "INSERT INTO OrdCompraDetalle (IdOC, Item, CodArticulo, Cantidad, Precio, ...) VALUES (@idOC, @item, @codArticulo, @cantidad, @precio, ...)"
        },
        "sectores": {
            "select_all": "SELECT * FROM CentrosCosto WHERE Activo = 1"
        }
    },

    "field_mapping": {
        "proveedores": {
            "erp_to_hub": {
                "CodProv": "id",
                "RazonSocial": "nombre",
                "NumCUIT": "cuit",
                "Direccion": "direccion",
                "Telefono": "telefono",
                "Email": "email",
                "Activo": "isActive"
            },
            "hub_to_erp": {
                "id": "CodProv",
                "nombre": "RazonSocial",
                "cuit": "NumCUIT"
            }
        },
        "pagos": {
            "erp_to_hub": {
                "IdPago": "id",
                "Numero": "numero",
                "FechaPago": "fechaPago",
                "ImporteTotal": "monto",
                "CodProv": "proveedorId"
            }
        },
        "ordenes_compra": {
            "hub_to_erp": {
                "numero": "Numero",
                "fechaEmision": "Fecha",
                "proveedor.id": "CodProv",
                "total": "Total"
            }
        }
    }
}
```

### 10.3 Diferencias entre Axioma y Softland

> **IMPORTANTE**: Esta sección debe completarse con la documentación real de cada ERP.

| Entidad | Campo Hub | Axioma | Softland |
|---------|-----------|--------|----------|
| **Proveedores** |
| | id | `CodProv` | `CodProveedor` |
| | nombre | `RazonSocial` | `NomProv` |
| | cuit | `NumCUIT` | `RutProveedor` |
| **Pagos** |
| | id | `IdPago` | `NumPago` |
| | fecha | `FechaPago` | `FecPago` |
| | monto | `ImporteTotal` | `MontoTotal` |
| **OC** |
| | numero | `Numero` | `NumOC` |
| | fecha | `Fecha` | `FechaOC` |
| | total | `Total` | `TotalOC` |

### 10.4 Tablas Típicas (a confirmar)

#### Axioma (estructura estimada)
```sql
-- Proveedores
Proveedores (
    CodProv VARCHAR(20) PK,
    RazonSocial VARCHAR(100),
    NumCUIT VARCHAR(13),
    Direccion VARCHAR(200),
    Telefono VARCHAR(50),
    Email VARCHAR(100),
    Activo BIT,
    FechaModif DATETIME
)

-- Pagos
PagosEmitidos (
    IdPago INT PK,
    Numero VARCHAR(20),
    FechaPago DATE,
    CodProv VARCHAR(20) FK,
    ImporteTotal DECIMAL(18,2),
    Estado VARCHAR(20)
)

-- Órdenes de Compra
OrdCompra (
    IdOC INT PK IDENTITY,
    Numero VARCHAR(20),
    Fecha DATE,
    CodProv VARCHAR(20) FK,
    Total DECIMAL(18,2),
    Estado VARCHAR(20)
)
```

#### Softland (estructura estimada)
```sql
-- Por documentar según instalación del cliente
```

### 10.5 Consideraciones de Seguridad

```sql
-- Crear usuario dedicado para sincronización
CREATE LOGIN hub_sync WITH PASSWORD = 'StrongPassword123!';
CREATE USER hub_sync FOR LOGIN hub_sync;

-- Permisos de LECTURA en tablas maestras
GRANT SELECT ON Proveedores TO hub_sync;
GRANT SELECT ON CentrosCosto TO hub_sync;
GRANT SELECT ON PagosEmitidos TO hub_sync;
GRANT SELECT ON PagosDetalle TO hub_sync;

-- Permisos de ESCRITURA solo donde sea necesario
GRANT INSERT ON OrdCompra TO hub_sync;
GRANT INSERT ON OrdCompraDetalle TO hub_sync;

-- NO dar permisos de UPDATE o DELETE
-- NO dar permisos en tablas sensibles (contabilidad, etc.)
```

---

## Apéndice A: Glosario

| Término | Definición |
|---------|------------|
| **Dueño/Maestro** | Sistema donde se crea y modifica el dato originalmente |
| **Sync Queue** | Cola de mensajes pendientes de sincronización |
| **Inbound** | Datos que entran a Hub (desde ERP/Parse) |
| **Outbound** | Datos que salen de Hub (hacia ERP/Parse) |
| **ACK** | Acknowledgment - Confirmación de recepción |
| **Dead Letter** | Registro que falló todos los reintentos |
| **MSSQL** | Microsoft SQL Server |
| **Axioma** | ERP contable/gestión con BD SQL Server |
| **Softland** | ERP contable/gestión con BD SQL Server |

---

## Apéndice B: Información Pendiente por Cliente

### Para Axioma
- [ ] Servidor y puerto SQL Server
- [ ] Nombre de base de datos
- [ ] Credenciales de usuario (o crear usuario dedicado)
- [ ] Documentación de tablas (o acceso para explorar)
- [ ] ¿Se pueden insertar OCs desde afuera?
- [ ] Horarios de baja carga para sync

### Para Softland
- [ ] Servidor y puerto SQL Server
- [ ] Nombre de base de datos
- [ ] Credenciales de usuario
- [ ] Documentación de tablas
- [ ] ¿Se pueden insertar OCs desde afuera?
- [ ] Horarios de baja carga para sync
