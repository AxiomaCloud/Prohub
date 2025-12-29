# Plan de Implementación: Sincronización Hub - Parse - ERP

**Fecha**: 28 Diciembre 2025
**Documento de Arquitectura**: [SYNC_ARCHITECTURE.md](./SYNC_ARCHITECTURE.md)

---

## Resumen Ejecutivo

Este plan detalla la implementación del sistema de sincronización entre Hub, Parse y ERP externos. El desarrollo se divide en 6 fases con hitos verificables.

**Duración estimada**: 4-6 semanas
**Prioridad**: Alta

---

## Fases de Implementación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ROADMAP DE IMPLEMENTACIÓN                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FASE 1          FASE 2          FASE 3          FASE 4          FASE 5 │
│  Schema Parse    APIs Parse      Hub Consumer    Hub Producer    Testing │
│  ───────────     ──────────      ────────────    ────────────    ─────── │
│  [1 semana]      [1 semana]      [1 semana]      [1 semana]      [1 sem] │
│                                                                          │
│  ▼ Tablas        ▼ Inbound       ▼ Sync job      ▼ Enviar OC     ▼ E2E  │
│  ▼ Índices       ▼ Outbound      ▼ Proveedores   ▼ Webhooks      ▼ Carga│
│  ▼ Config        ▼ Webhooks      ▼ Pagos         ▼ Retries       ▼ Docs │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## FASE 1: Schema y Modelos en Parse

**Objetivo**: Crear las tablas de sincronización en parse_db

### Diseño Flexible (JSONB)

> **Principio**: Usar JSONB para payloads genéricos + configuración por entidad.
> Esto permite agregar nuevas entidades/tablas sin migraciones.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MODELO DE DATOS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   sync_entity_config              sync_data                 sync_queue       │
│   ┌──────────────────┐           ┌──────────────┐          ┌─────────────┐  │
│   │ Config por       │           │ Payload JSONB │          │ Cola de     │  │
│   │ entidad/ERP      │──────────►│ (cualquier    │─────────►│ mensajes    │  │
│   │                  │           │  estructura)  │          │ pendientes  │  │
│   │ - queries SQL    │           │               │          │             │  │
│   │ - field_mapping  │           │               │          │             │  │
│   │ - transform_rules│           │               │          │             │  │
│   └──────────────────┘           └──────────────┘          └─────────────┘  │
│                                                                              │
│   sync_log                        sync_state                                 │
│   ┌──────────────────┐           ┌──────────────┐                           │
│   │ Auditoría de     │           │ Último sync  │                           │
│   │ operaciones      │           │ por entidad  │                           │
│   └──────────────────┘           └──────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Hitos

- [ ] **1.1 Crear tabla `sync_entity_config`** (Schema Registry)
  - [ ] Definir modelo Prisma/SQL
  - [ ] Campos principales:
    ```sql
    id, tenant_id, entity_type, erp_type,
    source_table, primary_key, timestamp_field,
    queries (JSONB),        -- SELECT, INSERT, UPDATE por entidad
    field_mapping (JSONB),  -- Mapeo ERP ↔ Hub
    transform_rules (JSONB),-- Reglas de transformación
    direction, enabled, sync_frequency
    ```
  - [ ] Constraint UNIQUE (tenant_id, entity_type, erp_type)
  - [ ] Ejecutar migración

- [ ] **1.2 Crear tabla `sync_data`** (Payload genérico JSONB)
  - [ ] Definir modelo Prisma/SQL
  - [ ] Campos principales:
    ```sql
    id, tenant_id, config_id (FK),
    entity_type, erp_type, entity_id,
    payload (JSONB),        -- Datos del registro (cualquier estructura)
    payload_hash,           -- SHA256 para detectar cambios
    version,                -- Versionado de registro
    status, sync_direction, synced_at, error_message
    ```
  - [ ] Índices: tenant+entity+status, entity_type+entity_id
  - [ ] Índice JSONB: (payload->>'CodProv') para búsquedas
  - [ ] Constraint UNIQUE (tenant_id, entity_type, erp_type, entity_id)
  - [ ] Ejecutar migración

- [ ] **1.3 Crear tabla `sync_queue`** (Cola de mensajes)
  - [ ] Definir modelo Prisma/SQL
  - [ ] Campos: source, destination, entity_type, entity_id, action, payload (JSONB)
  - [ ] Campos de estado: status, priority, retry_count, max_retries
  - [ ] Campos de resultado: external_id, response (JSONB), error_message
  - [ ] Timestamps: created_at, scheduled_at, started_at, completed_at
  - [ ] Índices: status+scheduled_at, entity_type+entity_id, tenant_id
  - [ ] Ejecutar migración

- [ ] **1.4 Crear tabla `sync_log`** (Auditoría)
  - [ ] Definir modelo Prisma/SQL
  - [ ] Campos: tenant_id, sync_queue_id (FK), entity_type, entity_id
  - [ ] Campos: action, direction, status, message
  - [ ] Campos de debug: request_payload (JSONB), response_data (JSONB), duration_ms
  - [ ] Índices para consultas de auditoría (tenant+created_at, entity)
  - [ ] Ejecutar migración

- [ ] **1.5 Crear tabla `sync_state`** (Estado de última sync)
  - [ ] Definir modelo Prisma/SQL
  - [ ] Campos: tenant_id, entity_type, erp_type, direction
  - [ ] Campos: last_sync_at, last_entity_id, last_timestamp
  - [ ] Estadísticas: total_synced, last_batch_size
  - [ ] Constraint UNIQUE (tenant_id, entity_type, erp_type, direction)
  - [ ] Ejecutar migración

- [ ] **1.6 Seed inicial de configuración**
  - [ ] Script para crear configs de Axioma:
    ```sql
    -- Proveedores Axioma
    INSERT INTO sync_entity_config (tenant_id, entity_type, erp_type, ...)
    VALUES ('default', 'PROVEEDOR', 'AXIOMA', ...);

    -- Pagos Axioma
    INSERT INTO sync_entity_config ...

    -- Sectores Axioma
    INSERT INTO sync_entity_config ...
    ```
  - [ ] Script para crear configs de Softland (cuando se tenga info)
  - [ ] Ejecutar seed en ambiente de desarrollo

### Verificación Fase 1
```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'sync_%';

-- Debe mostrar: sync_entity_config, sync_data, sync_queue, sync_log, sync_state

-- Verificar configuración inicial
SELECT entity_type, erp_type, direction FROM sync_entity_config;

-- Debe mostrar las entidades configuradas por ERP
```

### Agregar Nueva Entidad (sin migración)
```sql
-- Ejemplo: Agregar sincronización de Artículos desde Axioma
INSERT INTO sync_entity_config (
    tenant_id, entity_type, erp_type,
    source_table, primary_key, timestamp_field,
    queries, field_mapping, direction
) VALUES (
    'cliente1',
    'ARTICULO',
    'AXIOMA',
    'Articulos',
    'CodArt',
    'FechaModif',
    '{
        "select_all": "SELECT * FROM Articulos WHERE Activo = 1",
        "select_since": "SELECT * FROM Articulos WHERE FechaModif > @lastSync"
    }',
    '{
        "erp_to_hub": {
            "CodArt": "id",
            "Descripcion": "nombre",
            "PrecioVenta": "precio"
        }
    }',
    'IN'
);
-- ¡Listo! El worker de sync lo procesará automáticamente
```

---

## FASE 2: APIs de Sincronización en Parse

**Objetivo**: Crear los endpoints de sincronización en Parse

### Hitos

- [ ] **2.1 Servicio SyncQueueService**
  - [ ] Método `enqueue(source, dest, entity, action, payload)`
  - [ ] Método `dequeue(destination, entityType, limit)`
  - [ ] Método `acknowledge(syncId, status, response)`
  - [ ] Método `getStatus(syncId)`
  - [ ] Tests unitarios

- [ ] **2.2 Endpoints Inbound (Parse → Hub)**
  - [ ] `GET /api/v1/sync/inbound/:entity` - Obtener pendientes
  - [ ] `POST /api/v1/sync/inbound/:entity/ack` - Confirmar recepción
  - [ ] `GET /api/v1/sync/inbound/pending` - Listar entidades con pendientes
  - [ ] Autenticación por API Key
  - [ ] Tests de integración

- [ ] **2.3 Endpoints Outbound (Hub → Parse)**
  - [ ] `POST /api/v1/sync/outbound/:entity` - Enviar registro
  - [ ] `GET /api/v1/sync/outbound/:entity/:id/status` - Consultar estado
  - [ ] `POST /api/v1/sync/outbound/batch` - Envío masivo
  - [ ] Validación de payload
  - [ ] Tests de integración

- [ ] **2.4 Worker de procesamiento**
  - [ ] Job para procesar sync_queue con status PENDING
  - [ ] Implementar reintentos con backoff exponencial
  - [ ] Manejar dead letter queue
  - [ ] Logging de cada operación

- [ ] **2.5 Endpoints de administración**
  - [ ] `GET /api/v1/sync/stats` - Estadísticas de sync
  - [ ] `GET /api/v1/sync/logs` - Consultar logs
  - [ ] `POST /api/v1/sync/retry/:id` - Reintentar registro fallido
  - [ ] `GET /api/v1/sync/config` - Ver configuración

### Verificación Fase 2
```bash
# Test de endpoints
curl -X GET "https://parse.../api/v1/sync/inbound/pending" \
  -H "X-API-Key: sk_xxx"

# Debe retornar lista de entidades con conteo
```

---

## FASE 3: Hub como Consumidor (Inbound)

**Objetivo**: Hub consume datos desde Parse (proveedores, pagos, etc.)

### Hitos

- [ ] **3.1 Servicio SyncService en Hub**
  - [ ] Crear `backend/src/services/syncService.ts`
  - [ ] Método `fetchInbound(entityType, since)`
  - [ ] Método `acknowledgeInbound(syncIds)`
  - [ ] Configuración de URL y API Key de Parse
  - [ ] Manejo de errores y logging

- [ ] **3.2 Sincronización de Proveedores**
  - [ ] Job `syncProveedores()` que consulta Parse
  - [ ] Mapeo de campos Parse → Hub (Supplier)
  - [ ] Upsert en tabla Supplier
  - [ ] Registro de última sincronización
  - [ ] Test con datos reales

- [ ] **3.3 Sincronización de Pagos**
  - [ ] Job `syncPagos()` que consulta Parse
  - [ ] Mapeo de campos ERP → Hub (Payment)
  - [ ] Crear Payment + PaymentItems
  - [ ] Vincular con facturas existentes (por número)
  - [ ] Notificar al proveedor
  - [ ] Test con datos reales

- [ ] **3.4 Job programado de sincronización**
  - [ ] Crear endpoint `POST /api/sync/run` para trigger manual
  - [ ] Configurar cron job (cada 15 minutos)
  - [ ] Logging de ejecución
  - [ ] Manejo de errores sin detener el proceso

- [ ] **3.5 Endpoint de estado de sync en Hub**
  - [ ] `GET /api/sync/status` - Estado de última sync por entidad
  - [ ] `GET /api/sync/logs` - Logs locales de sync
  - [ ] Dashboard simple en admin

### Verificación Fase 3
```bash
# Ejecutar sync manual
curl -X POST "http://localhost:4000/api/sync/run?entity=proveedores" \
  -H "Authorization: Bearer xxx"

# Verificar que se crearon/actualizaron proveedores
SELECT COUNT(*) FROM "Supplier" WHERE "updatedAt" > NOW() - INTERVAL '5 minutes';
```

---

## FASE 4: Hub como Productor (Outbound)

**Objetivo**: Hub envía datos a Parse/ERP (OCs, recepciones)

### Hitos

- [ ] **4.1 Enviar OC al aprobar**
  - [ ] Modificar `approvalWorkflowService.completeWorkflow()`
  - [ ] Cuando OC pasa a APROBADA, llamar a `syncService.sendOutbound()`
  - [ ] Mapear campos Hub → ERP
  - [ ] Guardar sync_id en PurchaseOrderCircuit
  - [ ] Test con OC de prueba

- [ ] **4.2 Enviar Recepción al confirmar**
  - [ ] Modificar endpoint de recepción
  - [ ] Cuando recepción se confirma, enviar a sync
  - [ ] Incluir datos de OC relacionada
  - [ ] Test con recepción de prueba

- [ ] **4.3 Webhook receiver en Hub**
  - [ ] Crear endpoint `POST /api/webhooks/sync`
  - [ ] Validar firma HMAC
  - [ ] Procesar evento `sync.completed`
  - [ ] Actualizar externalId en OC/Recepcion
  - [ ] Procesar evento `sync.failed`
  - [ ] Notificar a admin si falla

- [ ] **4.4 UI de estado de sincronización**
  - [ ] Mostrar estado de sync en detalle de OC
  - [ ] Badge: "Sincronizado", "Pendiente", "Error"
  - [ ] Botón "Reintentar" si falló
  - [ ] Mostrar ID externo del ERP

- [ ] **4.5 Reintentos manuales**
  - [ ] Endpoint `POST /api/sync/retry/:entityType/:entityId`
  - [ ] Botón en UI para reintentar
  - [ ] Notificación de resultado

### Verificación Fase 4
```bash
# Aprobar una OC y verificar que se envió
# 1. Aprobar OC desde UI
# 2. Verificar en Parse:
curl -X GET "https://parse.../api/v1/sync/outbound/oc/OC-2025-001/status"

# Debe mostrar status: COMPLETED o PENDING
```

---

## FASE 5: Conectores SQL Server para Axioma y Softland

**Objetivo**: Parse se conecta a los ERPs vía SQL Server directo

> **Nota**: Axioma y Softland NO tienen APIs. La conexión es directa a SQL Server.

### Hitos

- [ ] **5.1 Preparación de conexión**
  - [ ] Instalar driver `mssql` (tedious) en Parse
  - [ ] Crear servicio `SqlServerConnector` genérico
  - [ ] Implementar pool de conexiones
  - [ ] Test de conexión básico
  - [ ] Manejo de errores de conexión

- [ ] **5.2 Obtener información de Axioma**
  - [ ] Servidor, puerto, base de datos
  - [ ] Crear usuario `hub_sync` con permisos limitados
  - [ ] Documentar estructura de tablas:
    - [ ] Tabla de Proveedores (campos, PK, fecha modificación)
    - [ ] Tabla de Pagos emitidos (campos, relaciones)
    - [ ] Tabla de OC (si existe y permite INSERT)
    - [ ] Tabla de Sectores/Centros de costo
  - [ ] Configurar field_mapping en sync_config

- [ ] **5.3 Obtener información de Softland**
  - [ ] Servidor, puerto, base de datos
  - [ ] Crear usuario `hub_sync` con permisos limitados
  - [ ] Documentar estructura de tablas:
    - [ ] Tabla de Proveedores
    - [ ] Tabla de Pagos emitidos
    - [ ] Tabla de OC
    - [ ] Tabla de Sectores
  - [ ] Configurar field_mapping en sync_config

- [ ] **5.4 Conector de lectura (ERP → Parse → Hub)**
  - [ ] Método `readFromERP(entityType, since)`:
    ```javascript
    async readFromERP(config, entityType, lastSync) {
        const query = config.queries[entityType].select_since;
        const result = await pool.request()
            .input('lastSync', lastSync)
            .query(query);
        return transformFields(result.recordset, config.field_mapping[entityType].erp_to_hub);
    }
    ```
  - [ ] Implementar para: proveedores, pagos, sectores
  - [ ] Encolar resultados en sync_queue (dest: HUB)
  - [ ] Test con datos reales de cada ERP

- [ ] **5.5 Conector de escritura (Hub → Parse → ERP)**
  - [ ] Método `writeToERP(entityType, data)`:
    ```javascript
    async writeToERP(config, entityType, data) {
        const transformed = transformFields(data, config.field_mapping[entityType].hub_to_erp);
        const query = config.queries[entityType].insert;
        const result = await pool.request()
            .input('numero', transformed.Numero)
            .input('fecha', transformed.Fecha)
            // ... más campos
            .query(query);
        return result.recordset[0]; // Retorna ID generado
    }
    ```
  - [ ] Implementar para: ordenes_compra (si el ERP lo permite)
  - [ ] Transacción para header + items
  - [ ] Test con OC de prueba

- [ ] **5.6 Job de sincronización programada**
  - [ ] Cron para sync de proveedores (diario)
  - [ ] Cron para sync de pagos (cada hora o diario)
  - [ ] Cron para sync de sectores (semanal)
  - [ ] Configurar horarios de baja carga
  - [ ] Logging de cada ejecución

- [ ] **5.7 UI de configuración de ERP**
  - [ ] Página admin para configurar conexión SQL Server
  - [ ] Test de conexión desde UI
  - [ ] Selector de ERP (Axioma/Softland)
  - [ ] Mapeo de campos visual (opcional)
  - [ ] Programar frecuencia de sync

### Verificación Fase 5
```bash
# Verificar que el conector funciona
# 1. Crear OC en Hub
# 2. Aprobar OC
# 3. Verificar en ERP que se creó
# 4. Emitir pago en ERP
# 5. Ejecutar sync en Hub
# 6. Verificar que el pago aparece en Hub
```

---

## FASE 6: Testing y Documentación

**Objetivo**: Asegurar calidad y documentar

### Hitos

- [ ] **6.1 Tests End-to-End**
  - [ ] Test: Proveedor nuevo en ERP aparece en Hub
  - [ ] Test: OC aprobada en Hub llega al ERP
  - [ ] Test: Pago emitido en ERP aparece en Hub
  - [ ] Test: Recepción en Hub actualiza ERP
  - [ ] Test: Manejo de errores y reintentos

- [ ] **6.2 Tests de carga**
  - [ ] Simular 1000 registros en sync_queue
  - [ ] Medir tiempo de procesamiento
  - [ ] Verificar que no hay pérdida de datos
  - [ ] Ajustar workers/concurrencia si necesario

- [ ] **6.3 Monitoreo**
  - [ ] Dashboard de métricas de sync
  - [ ] Alertas por errores frecuentes
  - [ ] Alertas por cola muy grande
  - [ ] Logs centralizados

- [ ] **6.4 Documentación técnica**
  - [ ] README de configuración de sync
  - [ ] Guía de troubleshooting
  - [ ] Documentación de APIs
  - [ ] Diagrama de arquitectura actualizado

- [ ] **6.5 Documentación de usuario**
  - [ ] Guía: Cómo configurar conexión al ERP
  - [ ] Guía: Cómo ver estado de sincronización
  - [ ] Guía: Qué hacer si algo falla
  - [ ] FAQ

### Verificación Fase 6
```
- [ ] Todos los tests E2E pasan
- [ ] Documentación revisada y publicada
- [ ] Dashboard de monitoreo funcionando
- [ ] Al menos 1 semana en producción sin errores críticos
```

---

## Resumen de Progreso

### Por Fase

| Fase | Descripción | Hitos | Completados | Estado |
|------|-------------|-------|-------------|--------|
| 1 | Schema Parse (diseño flexible JSONB) | 6 | 0 | Pendiente |
| 2 | APIs Parse | 5 | 0 | Pendiente |
| 3 | Hub Consumer | 5 | 0 | Pendiente |
| 4 | Hub Producer | 5 | 0 | Pendiente |
| 5 | Conectores SQL Server (Axioma/Softland) | 7 | 0 | Pendiente |
| 6 | Testing/Docs | 5 | 0 | Pendiente |
| **Total** | | **33** | **0** | **0%** |

### Por Entidad

| Entidad | Dirección | Parse | Hub | ERP | Estado |
|---------|-----------|-------|-----|-----|--------|
| Proveedores | ERP→Hub | - | - | - | Pendiente |
| Sectores | ERP→Hub | - | - | - | Pendiente |
| OCs | Hub→ERP | - | - | - | Pendiente |
| Recepciones | Hub→ERP | - | - | - | Pendiente |
| Pagos | ERP→Hub | - | - | - | Pendiente |

---

## Dependencias y Riesgos

### Dependencias

| Dependencia | Descripción | Responsable | Estado |
|-------------|-------------|-------------|--------|
| API Key Parse | Acceso a Parse para desarrollo | DevOps | Listo |
| Credenciales ERP | Acceso al ERP para pruebas | Cliente | Pendiente |
| Documentación ERP | API o método de conexión | Cliente | Pendiente |
| Ambiente de prueba | ERP de test/sandbox | Cliente | Pendiente |

### Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| ERP no tiene API | Alto | Media | Usar queries directas o archivos |
| Latencia de red | Medio | Baja | Implementar colas y reintentos |
| Mapeo de campos complejo | Medio | Alta | Dedicar tiempo extra a análisis |
| Volumen alto de datos | Medio | Media | Batching y workers paralelos |

---

## Próximos Pasos Inmediatos

1. **Revisar y aprobar** este plan de implementación
2. **Confirmar** qué ERP se va a integrar
3. **Obtener** documentación del ERP (API, campos, etc.)
4. **Iniciar Fase 1** creando schema en Parse

---

## Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2025-12-28 | 1.0 | Documento inicial |

---

**Documento generado por**: Claude Code
**Fecha**: 28 Diciembre 2025
