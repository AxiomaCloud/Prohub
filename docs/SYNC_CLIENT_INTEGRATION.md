# Integración con Sync-Client Standalone - Hub

**Fecha**: 2025-11-29
**Versión**: 2.0

---

## ⚠️ ACLARACIÓN CRÍTICA

**Este documento describe la arquitectura de sincronización, pero IMPORTANTE:**

- **Parse** (NO Hub) implementa TODOS los endpoints `/api/sync/*`
- **Parse** (NO Hub) maneja la autenticación del sync-client
- **Parse** (NO Hub) tiene los modelos `SyncConfiguration`, `SyncApiKey`, `SyncLog`
- **Hub** SOLO lee y escribe directamente a las tablas del schema `sync` en PostgreSQL

---

## 📋 Resumen

Este documento detalla la arquitectura de sincronización entre Softland y Hub usando el **sync-client-standalone** existente en `/parse/sync-client-standalone`.

**Arquitectura Real:**
- Sync-Client → se conecta a **Parse** (NO a Hub)
- Parse → maneja sincronización, lee/escribe tablas `sync.*`
- Hub → solo lee/escribe tablas `sync.*` directamente via Prisma

El sync-client es un **ejecutable standalone** (.exe) que sincroniza tablas entre SQL Server (Softland) y PostgreSQL de manera bidireccional, comunicándose con **Parse**.

---

## 🎯 Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│         Cliente (Windows - Servidor Softland)                │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ax-sync-client.exe                                 │    │
│  │  - Ejecuta SQL en Softland                          │    │
│  │  - Lee/escribe tablas                               │    │
│  │  - Sincroniza cada 5 minutos (Task Scheduler)      │    │
│  └─────────────────────────────────────────────────────┘    │
│                         ↕ HTTPS                              │
└─────────────────────────│─────────────────────────────────────┘
                          │
                          │ X-API-Key authentication
                          ↓
┌──────────────────────────────────────────────────────────────┐
│        Parse Backend (Maneja TODA la sincronización)      │
│                                                               │
│  Endpoints /api/sync/*:                                      │
│  - GET  /api/sync/health                                     │
│  - GET  /api/sync/config/:tenantId                           │
│  - POST /api/sync/upload/:tenantId                           │
│  - GET  /api/sync/download/:tenantId?tabla=xxx               │
│  - POST /api/sync/logs/:tenantId                             │
│                                                               │
│  Tablas en Parse PostgreSQL:                                 │
│  - sync_configurations (credenciales SQL)                    │
│  - sync_api_keys (autenticación sync-client)                 │
│  - sync_logs (logs de sincronización)                        │
└──────────────────────────────────────────────────────────────┘
                          ↕
                   PostgreSQL (shared)
                   Schema "sync":
                   - sync.requerimientos_compra_sync
                   - sync.ordenes_compra_sync
                   - sync.recepciones_sync
                          ↕
┌──────────────────────────────────────────────────────────────┐
│              Hub Backend (Next.js 15 + Prisma)            │
│                                                               │
│  Responsabilidades:                                          │
│  ✅ Escribir a sync.requerimientos_compra_sync (PR aprobado) │
│  ✅ Leer de sync.ordenes_compra_sync (job polling)           │
│  ✅ Escribir a sync.recepciones_sync (recepción creada)      │
│                                                               │
│  NO hace:                                                     │
│  ❌ NO tiene endpoints /api/sync/*                           │
│  ❌ NO maneja sync-client                                    │
│  ❌ NO tiene sync_configurations, sync_api_keys, sync_logs   │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Tablas Necesarias en PostgreSQL

### 1. `sync_configurations`

Almacena la configuración de sincronización para cada tenant.

```prisma
model SyncConfiguration {
  id                   String   @id @default(cuid())
  tenantId             String   @unique
  tenant               Tenant   @relation(fields: [tenantId], references: [id])

  // Credenciales SQL Server (encriptadas)
  sqlServerHost        String
  sqlServerPort        Int      @default(1433)
  sqlServerDatabase    String
  sqlServerUser        String
  sqlServerPassword    String   // Encriptado con AES-256

  // Configuración de tablas (JSON)
  configuracionTablas  Json     // Ver estructura abajo

  activo               Boolean  @default(true)

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@map("sync_configurations")
}
```

**Estructura de `configuracionTablas` (JSON):**

```json
{
  "tablasSubida": [
    {
      "nombre": "ordenes_compra",
      "primaryKey": "numero_orden",
      "incremental": true,
      "campoFecha": "fecha_modificacion",
      "pre_process": {
        "enabled": false
      },
      "process": {
        "query": "SELECT numero_orden, numero_requerimiento, monto_total, fecha_creacion, fecha_modificacion FROM softland_ordenes_compra WHERE fecha_modificacion > @ultimaSync"
      },
      "post_process": {
        "enabled": false
      }
    }
  ],
  "tablasBajada": [
    {
      "nombre": "requerimientos_compra",
      "primaryKey": "numero_requerimiento",
      "incremental": false,
      "schema": {
        "columns": [
          {"name": "numero_requerimiento", "type": "VARCHAR(50)", "nullable": false},
          {"name": "descripcion", "type": "NVARCHAR(MAX)", "nullable": false},
          {"name": "monto_estimado", "type": "DECIMAL(18,2)", "nullable": true},
          {"name": "estado", "type": "VARCHAR(50)", "nullable": false},
          {"name": "fecha_creacion", "type": "DATETIME2", "nullable": false}
        ],
        "primaryKey": "numero_requerimiento"
      },
      "pre_process": {
        "enabled": true,
        "ejecutarEn": "destino",
        "sql": "IF NOT EXISTS (SELECT * FROM sys.tables WHERE name='requerimientos_compra') CREATE TABLE requerimientos_compra (numero_requerimiento VARCHAR(50) PRIMARY KEY, descripcion NVARCHAR(MAX), monto_estimado DECIMAL(18,2), estado VARCHAR(50), fecha_creacion DATETIME2)"
      },
      "process": {
        "query": "SELECT * FROM sync.requerimientos_compra_sync WHERE sincronizado = false"
      },
      "post_process": {
        "enabled": true,
        "ejecutarEn": "destino",
        "sql": "MERGE requerimientos_compra AS t USING {temp_table} AS s ON t.numero_requerimiento = s.numero_requerimiento WHEN MATCHED THEN UPDATE SET descripcion = s.descripcion, monto_estimado = s.monto_estimado, estado = s.estado WHEN NOT MATCHED THEN INSERT VALUES (s.numero_requerimiento, s.descripcion, s.monto_estimado, s.estado, s.fecha_creacion);"
      }
    }
  ]
}
```

---

### 2. `sync_api_keys`

API Keys para autenticar el sync-client.

```prisma
model SyncApiKey {
  id             String   @id @default(cuid())
  tenantId       String
  tenant         Tenant   @relation(fields: [tenantId], references: [id])

  keyPrefix      String   // Primeros 8 caracteres (sk_abc123...)
  keyHash        String   // Hash SHA-256 de la key completa

  nombre         String   // "Servidor SQL Producción"
  permisos       Json     // { "sync": true }

  activo         Boolean  @default(true)
  ultimoUso      DateTime?

  createdAt      DateTime @default(now())

  @@unique([tenantId, keyPrefix])
  @@map("sync_api_keys")
}
```

---

### 3. `sync_logs`

Logs de sincronización (enviados por el sync-client).

```prisma
model SyncLog {
  id                   String   @id @default(cuid())
  tenantId             String
  tenant               Tenant   @relation(fields: [tenantId], references: [id])

  direccion            String   // "upload" | "download"
  tabla                String   // Nombre de la tabla
  fase                 String   // "pre_process" | "process" | "post_process"

  estado               String   // "success" | "error"
  registrosAfectados   Int      @default(0)
  duracionMs           Int?

  mensaje              String?  @db.Text
  errorDetalle         String?  @db.Text

  fechaInicio          DateTime
  fechaFin             DateTime?

  createdAt            DateTime @default(now())

  @@index([tenantId, tabla, createdAt])
  @@map("sync_logs")
}
```

---

### 4. Tablas de Sincronización (Schema `sync`)

**Crear schema separado:**
```sql
CREATE SCHEMA IF NOT EXISTS sync;
```

#### 4.1 `sync.requerimientos_compra_sync`

Purchase Requests que se envían desde Hub a Softland.

```prisma
model RequerimientoCompraSyncTable {
  id                      String   @id @default(cuid())
  tenantId                String

  // Datos del requerimiento
  numero_requerimiento    String   @unique
  descripcion             String   @db.Text
  prioridad               String   // "NORMAL" | "HIGH" | "URGENT"
  monto_estimado          Decimal? @db.Decimal(18,2)
  fecha_necesaria         DateTime?

  // Usuario y departamento
  usuario_solicitante     String
  departamento            String?

  // Control de sincronización
  sincronizado            Boolean  @default(false)
  fecha_sincronizacion    DateTime?
  intentos_sincronizacion Int      @default(0)
  error_sincronizacion    String?  @db.Text

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@map("requerimientos_compra_sync")
  @@schema("sync")
}
```

#### 4.2 `sync.ordenes_compra_sync`

Órdenes de Compra que vienen desde Softland a Hub.

```prisma
model OrdenCompraSyncTable {
  id                      String   @id @default(cuid())
  tenantId                String

  // Datos de la OC
  numero_orden            String   @unique
  numero_requerimiento    String?  // Referencia al PR
  proveedor_cuit          String?
  proveedor_nombre        String?

  monto_total             Decimal  @db.Decimal(18,2)
  moneda                  String   @default("ARS")

  fecha_creacion          DateTime
  fecha_entrega_estimada  DateTime?
  fecha_modificacion      DateTime

  estado_softland         String?  // Estado en Softland

  // Control de sincronización
  procesado               Boolean  @default(false)
  fecha_procesado         DateTime?

  // Datos adicionales (opcional, JSON)
  datos_adicionales       Json?

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@index([numero_requerimiento])
  @@map("ordenes_compra_sync")
  @@schema("sync")
}
```

#### 4.3 `sync.recepciones_sync`

Recepciones de mercadería que se envían desde Hub a Softland.

```prisma
model RecepcionSyncTable {
  id                      String   @id @default(cuid())
  tenantId                String

  // Datos de la recepción
  numero_recepcion        String   @unique
  numero_orden            String   // Referencia a la OC

  fecha_recepcion         DateTime
  usuario_receptor        String

  // Items recibidos (JSON array)
  items_recibidos         Json     // [{ "codigo": "PROD01", "cantidad": 10, "tiene_discrepancia": false }]

  observaciones           String?  @db.Text

  // Control de sincronización
  sincronizado            Boolean  @default(false)
  fecha_sincronizacion    DateTime?
  intentos_sincronizacion Int      @default(0)
  error_sincronizacion    String?  @db.Text

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@map("recepciones_sync")
  @@schema("sync")
}
```

---

## 🔌 Endpoints (Implementados en Parse, NO en Hub)

**IMPORTANTE**: Los siguientes endpoints están implementados en **Parse**, NO en Hub.

Hub NO necesita implementar estos endpoints. Este documento los describe para entender cómo funciona la sincronización.

### 1. Health Check (en Parse)

**Endpoint**: `GET /api/sync/health`
**Autenticación**: NO
**Descripción**: Verifica que el servidor está disponible.

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T10:00:00.000Z"
}
```

**Implementación:**
```typescript
// app/api/sync/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

---

### 2. Obtener Configuración (en Parse)

**Endpoint**: `GET /api/sync/config/:tenantId` (en Parse)
**Autenticación**: `X-API-Key` header
**Descripción**: Retorna la configuración de sincronización del tenant.

**NOTA**: Este endpoint está en Parse, NO en Hub.

**Headers:**
```
X-API-Key: sk_abc123def456...
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "sqlServerHost": "192.168.1.100",
    "sqlServerPort": 1433,
    "sqlServerDatabase": "SoftlandDB",
    "sqlServerUser": "sync_user",
    "sqlServerPassword": "encrypted_password_here",
    "configuracionTablas": {
      "tablasSubida": [...],
      "tablasBajada": [...]
    }
  }
}
```

**Implementación:**
```typescript
// app/api/sync/config/[tenantId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiKey } from '@/lib/sync/auth';
import { decryptPassword } from '@/lib/sync/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // 1. Verificar API Key
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key requerida' },
        { status: 401 }
      );
    }

    const isValid = await verifyApiKey(apiKey, params.tenantId);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'API Key inválida' },
        { status: 401 }
      );
    }

    // 2. Obtener configuración
    const config = await prisma.syncConfiguration.findUnique({
      where: { tenantId: params.tenantId }
    });

    if (!config || !config.activo) {
      return NextResponse.json(
        { success: false, error: 'Configuración no encontrada o inactiva' },
        { status: 404 }
      );
    }

    // 3. Desencriptar password
    const decryptedPassword = decryptPassword(config.sqlServerPassword);

    // 4. Retornar configuración
    return NextResponse.json({
      success: true,
      data: {
        sqlServerHost: config.sqlServerHost,
        sqlServerPort: config.sqlServerPort,
        sqlServerDatabase: config.sqlServerDatabase,
        sqlServerUser: config.sqlServerUser,
        sqlServerPassword: decryptedPassword,
        configuracionTablas: config.configuracionTablas
      }
    });
  } catch (error) {
    console.error('Error en /api/sync/config:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
```

---

### 3. Upload de Datos (Softland → Parse → Hub)

**Endpoint**: `POST /api/sync/upload/:tenantId` (en Parse)
**Autenticación**: `X-API-Key` header
**Descripción**: Recibe datos desde Softland (ej. órdenes de compra) y los escribe a tablas sync.

**NOTA**: Este endpoint está en Parse, NO en Hub. Parse escribe a sync.ordenes_compra_sync, luego Hub lee de esa tabla.

**Headers:**
```
X-API-Key: sk_abc123def456...
Content-Type: application/json
```

**Body:**
```json
{
  "tabla": "ordenes_compra",
  "data": [
    {
      "numero_orden": "OC-2025-00123",
      "numero_requerimiento": "PR-2025-00045",
      "proveedor_cuit": "30-12345678-9",
      "proveedor_nombre": "Proveedor SA",
      "monto_total": 125000.50,
      "moneda": "ARS",
      "fecha_creacion": "2025-11-29T10:00:00.000Z",
      "fecha_entrega_estimada": "2025-12-15T00:00:00.000Z",
      "fecha_modificacion": "2025-11-29T10:00:00.000Z",
      "estado_softland": "APROBADA"
    }
  ],
  "timestamp": "2025-11-29T10:05:00.000Z"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "1 registros procesados",
  "registrosProcesados": 1
}
```

**Implementación:**
```typescript
// app/api/sync/upload/[tenantId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiKey } from '@/lib/sync/auth';
import { processUploadedData } from '@/lib/sync/upload-processor';

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // 1. Verificar API Key
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key requerida' },
        { status: 401 }
      );
    }

    const isValid = await verifyApiKey(apiKey, params.tenantId);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'API Key inválida' },
        { status: 401 }
      );
    }

    // 2. Parsear body
    const body = await request.json();
    const { tabla, data, timestamp } = body;

    if (!tabla || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // 3. Procesar según la tabla
    let registrosProcesados = 0;

    switch (tabla) {
      case 'ordenes_compra':
        registrosProcesados = await processOrdenesCompra(params.tenantId, data);
        break;

      // Agregar otros casos según necesidad
      default:
        return NextResponse.json(
          { success: false, error: `Tabla ${tabla} no soportada` },
          { status: 400 }
        );
    }

    // 4. Retornar éxito
    return NextResponse.json({
      success: true,
      message: `${registrosProcesados} registros procesados`,
      registrosProcesados
    });
  } catch (error) {
    console.error('Error en /api/sync/upload:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar datos' },
      { status: 500 }
    );
  }
}

// Función auxiliar para procesar órdenes de compra
async function processOrdenesCompra(tenantId: string, data: any[]) {
  let count = 0;

  for (const oc of data) {
    await prisma.ordenCompraSyncTable.upsert({
      where: { numero_orden: oc.numero_orden },
      create: {
        tenantId,
        numero_orden: oc.numero_orden,
        numero_requerimiento: oc.numero_requerimiento,
        proveedor_cuit: oc.proveedor_cuit,
        proveedor_nombre: oc.proveedor_nombre,
        monto_total: oc.monto_total,
        moneda: oc.moneda,
        fecha_creacion: new Date(oc.fecha_creacion),
        fecha_entrega_estimada: oc.fecha_entrega_estimada ? new Date(oc.fecha_entrega_estimada) : null,
        fecha_modificacion: new Date(oc.fecha_modificacion),
        estado_softland: oc.estado_softland,
        datos_adicionales: oc.datos_adicionales || null,
        procesado: false
      },
      update: {
        proveedor_cuit: oc.proveedor_cuit,
        proveedor_nombre: oc.proveedor_nombre,
        monto_total: oc.monto_total,
        moneda: oc.moneda,
        fecha_entrega_estimada: oc.fecha_entrega_estimada ? new Date(oc.fecha_entrega_estimada) : null,
        fecha_modificacion: new Date(oc.fecha_modificacion),
        estado_softland: oc.estado_softland,
        datos_adicionales: oc.datos_adicionales || null,
        procesado: false
      }
    });
    count++;
  }

  return count;
}
```

---

### 4. Download de Datos (Hub → Parse → Softland)

**Endpoint**: `GET /api/sync/download/:tenantId?tabla=xxx&ultimaSync=xxx` (en Parse)
**Autenticación**: `X-API-Key` header
**Descripción**: Envía datos hacia Softland (ej. requerimientos de compra).

**NOTA**: Este endpoint está en Parse, NO en Hub. Hub escribe a sync.requerimientos_compra_sync, luego Parse lee de esa tabla y envía al sync-client.

**Headers:**
```
X-API-Key: sk_abc123def456...
```

**Query Params:**
- `tabla`: Nombre de la tabla a descargar (ej. "requerimientos_compra")
- `ultimaSync` (opcional): Fecha ISO de última sincronización (para sync incremental)

**Respuesta:**
```json
{
  "success": true,
  "syncType": "incremental",
  "data": [
    {
      "numero_requerimiento": "PR-2025-00046",
      "descripcion": "Compra de materiales de oficina",
      "prioridad": "NORMAL",
      "monto_estimado": 50000.00,
      "fecha_necesaria": "2025-12-10T00:00:00.000Z",
      "usuario_solicitante": "juan.perez@empresa.com",
      "departamento": "Administración",
      "fecha_creacion": "2025-11-29T09:00:00.000Z"
    }
  ],
  "schema": {
    "columns": [
      {"name": "numero_requerimiento", "type": "VARCHAR(50)", "nullable": false},
      {"name": "descripcion", "type": "NVARCHAR(MAX)", "nullable": false},
      {"name": "prioridad", "type": "VARCHAR(20)", "nullable": false},
      {"name": "monto_estimado", "type": "DECIMAL(18,2)", "nullable": true},
      {"name": "fecha_necesaria", "type": "DATETIME2", "nullable": true},
      {"name": "usuario_solicitante", "type": "VARCHAR(255)", "nullable": false},
      {"name": "departamento", "type": "VARCHAR(100)", "nullable": true},
      {"name": "fecha_creacion", "type": "DATETIME2", "nullable": false}
    ],
    "primaryKey": "numero_requerimiento"
  }
}
```

**Implementación:**
```typescript
// app/api/sync/download/[tenantId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiKey } from '@/lib/sync/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // 1. Verificar API Key
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key requerida' },
        { status: 401 }
      );
    }

    const isValid = await verifyApiKey(apiKey, params.tenantId);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'API Key inválida' },
        { status: 401 }
      );
    }

    // 2. Parsear query params
    const searchParams = request.nextUrl.searchParams;
    const tabla = searchParams.get('tabla');
    const ultimaSync = searchParams.get('ultimaSync');

    if (!tabla) {
      return NextResponse.json(
        { success: false, error: 'Parámetro "tabla" requerido' },
        { status: 400 }
      );
    }

    // 3. Obtener datos según tabla
    let data: any[] = [];
    let schema: any = null;
    let syncType = 'completa';

    switch (tabla) {
      case 'requerimientos_compra':
        const result = await downloadRequerimientosCompra(
          params.tenantId,
          ultimaSync
        );
        data = result.data;
        schema = result.schema;
        syncType = result.syncType;
        break;

      case 'recepciones':
        // Implementar según necesidad
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Tabla ${tabla} no soportada` },
          { status: 400 }
        );
    }

    // 4. Retornar datos
    return NextResponse.json({
      success: true,
      syncType,
      data,
      schema
    });
  } catch (error) {
    console.error('Error en /api/sync/download:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener datos' },
      { status: 500 }
    );
  }
}

// Función auxiliar para descargar requerimientos
async function downloadRequerimientosCompra(
  tenantId: string,
  ultimaSync?: string | null
) {
  // Determinar tipo de sync
  const syncType = ultimaSync ? 'incremental' : 'completa';

  // Query base
  const where: any = {
    tenantId,
    sincronizado: false
  };

  // Si es incremental, filtrar por fecha
  if (ultimaSync) {
    where.createdAt = {
      gt: new Date(ultimaSync)
    };
  }

  // Obtener datos
  const requerimientos = await prisma.requerimientoCompraSyncTable.findMany({
    where,
    orderBy: { createdAt: 'asc' }
  });

  // Mapear a formato para Softland
  const data = requerimientos.map(req => ({
    numero_requerimiento: req.numero_requerimiento,
    descripcion: req.descripcion,
    prioridad: req.prioridad,
    monto_estimado: req.monto_estimado?.toNumber() || null,
    fecha_necesaria: req.fecha_necesaria?.toISOString() || null,
    usuario_solicitante: req.usuario_solicitante,
    departamento: req.departamento,
    fecha_creacion: req.createdAt.toISOString()
  }));

  // Schema explícito (recomendado)
  const schema = {
    columns: [
      { name: 'numero_requerimiento', type: 'VARCHAR(50)', nullable: false },
      { name: 'descripcion', type: 'NVARCHAR(MAX)', nullable: false },
      { name: 'prioridad', type: 'VARCHAR(20)', nullable: false },
      { name: 'monto_estimado', type: 'DECIMAL(18,2)', nullable: true },
      { name: 'fecha_necesaria', type: 'DATETIME2', nullable: true },
      { name: 'usuario_solicitante', type: 'VARCHAR(255)', nullable: false },
      { name: 'departamento', type: 'VARCHAR(100)', nullable: true },
      { name: 'fecha_creacion', type: 'DATETIME2', nullable: false }
    ],
    primaryKey: 'numero_requerimiento'
  };

  // Marcar como sincronizados (después de enviar)
  if (data.length > 0) {
    await prisma.requerimientoCompraSyncTable.updateMany({
      where: { id: { in: requerimientos.map(r => r.id) } },
      data: {
        sincronizado: true,
        fecha_sincronizacion: new Date()
      }
    });
  }

  return { data, schema, syncType };
}
```

---

### 5. Logs de Sincronización (en Parse)

**Endpoint**: `POST /api/sync/logs/:tenantId` (en Parse)
**Autenticación**: `X-API-Key` header
**Descripción**: Recibe logs de sincronización del sync-client.

**NOTA**: Este endpoint está en Parse, NO en Hub.

**Headers:**
```
X-API-Key: sk_abc123def456...
Content-Type: application/json
```

**Body:**
```json
{
  "logs": [
    {
      "direccion": "upload",
      "tabla": "ordenes_compra",
      "fase": "process",
      "estado": "success",
      "registrosAfectados": 15,
      "duracionMs": 1234,
      "mensaje": "Upload exitoso",
      "fechaInicio": "2025-11-29T10:00:00.000Z",
      "fechaFin": "2025-11-29T10:00:01.234Z"
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "1 logs guardados"
}
```

**Implementación:**
```typescript
// app/api/sync/logs/[tenantId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyApiKey } from '@/lib/sync/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    // 1. Verificar API Key (opcional, los logs pueden enviarse sin auth estricta)
    const apiKey = request.headers.get('X-API-Key');

    // 2. Parsear body
    const body = await request.json();
    const { logs } = body;

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { success: false, error: 'Logs inválidos' },
        { status: 400 }
      );
    }

    // 3. Guardar logs
    await prisma.syncLog.createMany({
      data: logs.map((log: any) => ({
        tenantId: params.tenantId,
        direccion: log.direccion,
        tabla: log.tabla,
        fase: log.fase,
        estado: log.estado,
        registrosAfectados: log.registrosAfectados || 0,
        duracionMs: log.duracionMs || null,
        mensaje: log.mensaje || null,
        errorDetalle: log.errorDetalle || null,
        fechaInicio: new Date(log.fechaInicio),
        fechaFin: log.fechaFin ? new Date(log.fechaFin) : null
      }))
    });

    // 4. Retornar éxito
    return NextResponse.json({
      success: true,
      message: `${logs.length} logs guardados`
    });
  } catch (error) {
    console.error('Error en /api/sync/logs:', error);
    // No fallar si no se pueden guardar logs
    return NextResponse.json(
      { success: false, error: 'Error al guardar logs' },
      { status: 500 }
    );
  }
}
```

---

## 🔐 Autenticación con API Keys

### Verificación de API Key

```typescript
// lib/sync/auth.ts
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function verifyApiKey(
  apiKey: string,
  tenantId: string
): Promise<boolean> {
  try {
    // Formato: sk_abc123def456...
    if (!apiKey.startsWith('sk_')) {
      return false;
    }

    // Extraer prefix (primeros 8 chars después de sk_)
    const keyPrefix = apiKey.substring(0, 10); // "sk_abc123..."

    // Hash de la key completa
    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Buscar en BD
    const apiKeyRecord = await prisma.syncApiKey.findFirst({
      where: {
        tenantId,
        keyPrefix,
        keyHash,
        activo: true
      }
    });

    if (!apiKeyRecord) {
      return false;
    }

    // Actualizar último uso
    await prisma.syncApiKey.update({
      where: { id: apiKeyRecord.id },
      data: { ultimoUso: new Date() }
    });

    return true;
  } catch (error) {
    console.error('Error al verificar API Key:', error);
    return false;
  }
}

export async function generateApiKey(
  tenantId: string,
  nombre: string
): Promise<string> {
  // Generar key aleatoria
  const randomBytes = crypto.randomBytes(32);
  const plainKey = `sk_${randomBytes.toString('hex')}`;

  // Hash para almacenar
  const keyHash = crypto
    .createHash('sha256')
    .update(plainKey)
    .digest('hex');

  // Prefix para búsqueda rápida
  const keyPrefix = plainKey.substring(0, 10);

  // Guardar en BD
  await prisma.syncApiKey.create({
    data: {
      tenantId,
      keyPrefix,
      keyHash,
      nombre,
      permisos: { sync: true },
      activo: true
    }
  });

  // Retornar key en texto plano (SOLO esta vez)
  return plainKey;
}
```

### Encriptación de Passwords SQL Server

```typescript
// lib/sync/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.SYNC_ENCRYPTION_KEY!; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptPassword(encryptedData: string): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

## 🚀 Instalación del Sync-Client en el Cliente

### 1. Generar API Key en Hub

```bash
# Endpoint: POST /api/admin/sync/api-keys
curl -X POST https://hub.ejemplo.com/api/admin/sync/api-keys \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-abc-123",
    "nombre": "Servidor SQL Producción"
  }'

# Respuesta:
{
  "success": true,
  "plainKey": "sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0..."
}
```

⚠️ **IMPORTANTE**: Guardar la key, no se puede recuperar después.

### 2. Configurar sync_configurations en Hub

```sql
-- Ejecutar en PostgreSQL de Hub
INSERT INTO sync_configurations (
  "tenantId",
  "sqlServerHost",
  "sqlServerPort",
  "sqlServerDatabase",
  "sqlServerUser",
  "sqlServerPassword",
  "configuracionTablas",
  "activo"
)
VALUES (
  'tenant-abc-123',
  '192.168.1.100',
  1433,
  'SoftlandDB',
  'sync_user',
  '<password_encriptado>',  -- Usar encryptPassword()
  '{
    "tablasSubida": [...],
    "tablasBajada": [...]
  }'::jsonb,
  true
);
```

### 3. Instalar sync-client en servidor Windows (cliente)

```cmd
REM 1. Copiar ejecutable
copy ax-sync-client.exe C:\sync\

REM 2. Configurar password de encriptación
setx SYNC_CONFIG_PASSWORD "MiPasswordSeguro2025"

REM 3. Cerrar y abrir nueva ventana CMD

REM 4. Inicializar
cd C:\sync
ax-sync-client.exe init ^
  --url https://hub.ejemplo.com ^
  --tenant tenant-abc-123 ^
  --key sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0...

REM 5. Probar conexión
ax-sync-client.exe test

REM 6. Ejecutar primera sincronización
ax-sync-client.exe sync
```

### 4. Programar ejecución automática (Task Scheduler)

```cmd
schtasks /create /tn "Hub Sync Client" ^
  /tr "C:\sync\ax-sync-client.exe sync" ^
  /sc minute /mo 5 ^
  /ru SYSTEM
```

---

## 📊 Flujo Completo: Purchase Request → OC → Recepción

### 1. Usuario crea Purchase Request en Hub

```typescript
// Hub: Usuario crea PR
const pr = await prisma.purchaseRequest.create({
  data: {
    number: 'PR-2025-00046',
    description: 'Compra de materiales de oficina',
    priority: 'NORMAL',
    estimatedAmount: 50000,
    tenantId: 'tenant-abc-123',
    requestedBy: 'user-123',
    status: 'DRAFT'
  }
});
```

### 2. PR se aprueba → Copia a tabla sync

```typescript
// Cuando PR llega a APPROVED
await prisma.requerimientoCompraSyncTable.create({
  data: {
    tenantId: pr.tenantId,
    numero_requerimiento: pr.number,
    descripcion: pr.description,
    prioridad: pr.priority,
    monto_estimado: pr.estimatedAmount,
    fecha_necesaria: pr.neededByDate,
    usuario_solicitante: pr.requestedByUser.email,
    departamento: pr.department,
    sincronizado: false
  }
});

// Actualizar estado PR
await prisma.purchaseRequest.update({
  where: { id: pr.id },
  data: { status: 'SENT_TO_ERP' }
});
```

### 3. Sync-client descarga PR (cada 5 min)

```
Sync-Client (Windows):
1. GET /api/sync/download/tenant-abc-123?tabla=requerimientos_compra
2. Recibe PR-2025-00046
3. Crea tabla en Softland si no existe (pre_process)
4. Ejecuta MERGE en Softland (post_process)
5. Requerimiento ahora está en Softland
```

### 4. Usuario crea OC en Softland manualmente

Usuario ingresa a Softland y crea OC referenciando el requerimiento PR-2025-00046.

### 5. Sync-client sube OC (cada 5 min)

```
Sync-Client (Windows):
1. Ejecuta query en Softland: SELECT * FROM OrdenesCompra WHERE fecha_modificacion > @ultimaSync
2. Encuentra OC-2025-00123 (vinculada a PR-2025-00046)
3. POST /api/sync/upload/tenant-abc-123
   Body: { "tabla": "ordenes_compra", "data": [...] }
4. Hub recibe y guarda en sync.ordenes_compra_sync
```

### 6. Hub procesa OC y notifica usuario

```typescript
// Job de Hub que revisa OCs nuevas cada 1 min
const nuevasOCs = await prisma.ordenCompraSyncTable.findMany({
  where: { procesado: false }
});

for (const oc of nuevasOCs) {
  // Vincular OC con PR
  const pr = await prisma.purchaseRequest.findFirst({
    where: { number: oc.numero_requerimiento }
  });

  if (pr) {
    // Crear PurchaseOrder en Hub
    const po = await prisma.purchaseOrder.create({
      data: {
        erpOrderId: oc.numero_orden,
        purchaseRequestId: pr.id,
        totalAmount: oc.monto_total,
        currency: oc.moneda,
        createdInErpAt: oc.fecha_creacion,
        estimatedDeliveryDate: oc.fecha_entrega_estimada
      }
    });

    // Actualizar PR
    await prisma.purchaseRequest.update({
      where: { id: pr.id },
      data: {
        status: 'PO_CREATED',
        purchaseOrderId: po.id
      }
    });

    // Notificar usuario
    await createNotification({
      userId: pr.requestedBy,
      type: 'PO_CREATED',
      message: `Se creó la OC ${oc.numero_orden} para tu requerimiento ${pr.number}`,
      data: { purchaseOrderId: po.id }
    });

    // Marcar como procesado
    await prisma.ordenCompraSyncTable.update({
      where: { id: oc.id },
      data: {
        procesado: true,
        fecha_procesado: new Date()
      }
    });
  }
}
```

### 7. Usuario confirma recepción en Hub

```typescript
// Usuario marca recepción
const reception = await prisma.purchaseReception.create({
  data: {
    number: 'REC-2025-00078',
    purchaseOrderId: po.id,
    receivedBy: 'user-456',
    receivedAt: new Date(),
    items: {
      create: [
        {
          productCode: 'PROD01',
          quantityOrdered: 10,
          quantityReceived: 10,
          hasDiscrepancy: false,
          qualityStatus: 'APPROVED'
        }
      ]
    }
  }
});

// Copiar a tabla sync
await prisma.recepcionSyncTable.create({
  data: {
    tenantId: po.tenantId,
    numero_recepcion: reception.number,
    numero_orden: po.erpOrderId!,
    fecha_recepcion: reception.receivedAt,
    usuario_receptor: reception.receivedByUser.email,
    items_recibidos: reception.items,
    sincronizado: false
  }
});
```

### 8. Sync-client descarga recepción y actualiza Softland

```
Sync-Client (Windows):
1. GET /api/sync/download/tenant-abc-123?tabla=recepciones
2. Recibe REC-2025-00078
3. Ejecuta SQL en Softland para registrar recepción
4. Actualiza inventario en Softland
```

---

## ✅ Checklist de Implementación

### Backend Hub (Tareas Reales)

- [ ] Crear modelos Prisma SOLO para tablas sync:
  - [ ] ~~SyncConfiguration~~ **OMITIR - está en Parse**
  - [ ] ~~SyncApiKey~~ **OMITIR - está en Parse**
  - [ ] ~~SyncLog~~ **OMITIR - está en Parse**
  - [ ] RequerimientoCompraSyncTable (schema sync) ✅
  - [ ] OrdenCompraSyncTable (schema sync) ✅
  - [ ] RecepcionSyncTable (schema sync) ✅

- [ ] ~~Implementar endpoints /api/sync/*~~ **OMITIR - están en Parse**
  - [ ] ~~GET /api/sync/health~~ **En Parse**
  - [ ] ~~GET /api/sync/config/:tenantId~~ **En Parse**
  - [ ] ~~POST /api/sync/upload/:tenantId~~ **En Parse**
  - [ ] ~~GET /api/sync/download/:tenantId~~ **En Parse**
  - [ ] ~~POST /api/sync/logs/:tenantId~~ **En Parse**

- [ ] ~~Implementar utilidades de sync~~ **OMITIR - están en Parse**
  - [ ] ~~verifyApiKey()~~ **En Parse**
  - [ ] ~~generateApiKey()~~ **En Parse**
  - [ ] ~~encryptPassword()~~ **En Parse**
  - [ ] ~~decryptPassword()~~ **En Parse**

- [ ] Implementar lógica de Hub:
  - [ ] Service para escribir PRs aprobados a sync.requerimientos_compra_sync ✅
  - [ ] Job para leer sync.ordenes_compra_sync cada 1 min ✅
  - [ ] Procesador que vincula OCs con PRs ✅
  - [ ] Service para escribir recepciones a sync.recepciones_sync ✅
  - [ ] Crear notificaciones cuando OC procesada ✅
  - [ ] Marcar OCs como procesadas ✅

### Configuración en Parse (Coordinar con equipo Parse)

- [ ] Verificar que sync-client.exe existe
- [ ] Generar API key en Parse admin
- [ ] Configurar sync_configurations en Parse para tenant
- [ ] Configurar tablas de sincronización (JSON config en Parse)

### Instalación Cliente

- [ ] Copiar sync-client.exe a servidor Windows del cliente
- [ ] Inicializar apuntando a Parse: `--url https://parse-api.com`
- [ ] Probar sincronización manual
- [ ] Programar Task Scheduler (cada 5 min)

---

## 📚 Referencias

- **Sync-Client README**: `/parse/sync-client-standalone/README.md`
- **Multi-Backend Setup**: `/parse/sync-client-standalone/MULTI-BACKEND-SETUP.md`
- **Schema Support**: `/parse/sync-client-standalone/SCHEMA-SUPPORT.md`
- **Purchase Requests Module**: `./PURCHASE_REQUESTS_MODULE.md`
- **Final Architecture**: `./FINAL_ARCHITECTURE_WITH_SYNC_CLIENT.md`

---

**Documento creado**: 2025-11-29
**Autor**: Hub Development Team
**Estado**: ✅ Listo para implementación
