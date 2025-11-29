# 🗓️ Roadmap de Implementación - Purchase Requests Module

**Proyecto**: Hub - Purchase Requests
**Duración Total**: 5 semanas (2.5 MVP + 2.5 Full)
**Fecha inicio**: [A definir]
**Equipo**: [A definir]

---

## 🎯 Estrategia: MVP + Versión Full

### 🚀 MVP (Semanas 1-2.5) - **Producto Mínimo Viable**
**Objetivo**: Sistema básico funcionando para demostrar valor

**Incluye:**
- ✅ CRUD de Purchase Requests (crear, listar, ver)
- ✅ Aprobación simple (1 nivel, cualquier admin puede aprobar)
- ✅ Sincronización básica a Softland (PRs → Softland)
- ✅ Sincronización de OCs (Softland → Hub, manual)
- ✅ UI mínima para crear y listar PRs

**NO incluye:**
- ❌ Aprobación multinivel compleja
- ❌ Notificaciones automáticas
- ❌ Recepciones de mercadería
- ❌ Jobs automatizados
- ❌ UI completa con filtros avanzados

**Duración**: 2.5 semanas
**Entregable**: Demo funcional con flujo básico PR → Aprobación → Softland → OC

---

### 🏆 Versión Full (Semanas 3-5) - **Sistema Completo**
**Objetivo**: Agregar toda la funcionalidad enterprise

**Agrega:**
- ✅ Aprobación multinivel por monto
- ✅ Notificaciones en tiempo real (WebSocket + Email)
- ✅ Recepciones de mercadería con validación
- ✅ Jobs automatizados (procesamiento OCs cada 1 min)
- ✅ UI completa con filtros, búsqueda, analytics
- ✅ Sincronización bidireccional automática
- ✅ Testing exhaustivo E2E
- ✅ Monitoreo y alertas

**Duración**: 2.5 semanas
**Entregable**: Sistema production-ready con todas las features

---

## 📊 Resumen Ejecutivo

| Fase | Duración | Entregable | Status |
|------|----------|------------|--------|
| **MVP** | | | |
| Fase 1: Setup Base | 1 semana | Modelos Prisma + Endpoints Sync | ⏳ Pendiente |
| Fase 2: Sync-Client + CRUD | 1 semana | Sincronización + PRs básicos | ⏳ Pendiente |
| Fase 3: Aprobación Simple | 0.5 semanas | Workflow aprobación 1 nivel | ⏳ Pendiente |
| **VERSIÓN FULL** | | | |
| Fase 4: Aprobación Multinivel | 0.5 semanas | Workflow completo por montos | ⏳ Pendiente |
| Fase 5: Notificaciones + Jobs | 1 semana | Sistema reactivo automático | ⏳ Pendiente |
| Fase 6: Recepciones + Testing | 1 semana | Recepciones + Tests E2E | ⏳ Pendiente |

---

## 🎭 Desglose: MVP vs Full

### 📦 Alcance del MVP

| Componente | MVP | Full |
|------------|-----|------|
| **Backend - Modelos** | | |
| - PurchaseRequest (básico) | ✅ | ✅ |
| - ApprovalLevel (simple) | ✅ 1 nivel fijo | ✅ Multinivel configurable |
| - PurchaseOrder | ✅ | ✅ |
| - PurchaseReception | ❌ | ✅ |
| - SyncConfiguration | ✅ | ✅ |
| - Notifications | ❌ | ✅ |
| **Backend - Endpoints** | | |
| - POST /api/v1/purchase-requests | ✅ | ✅ |
| - GET /api/v1/purchase-requests | ✅ Simple | ✅ Con filtros avanzados |
| - GET /api/v1/purchase-requests/:id | ✅ | ✅ |
| - POST /api/v1/purchase-requests/:id/approve | ✅ Simple | ✅ Con niveles |
| - POST /api/v1/purchase-requests/:id/reject | ✅ | ✅ |
| - POST /api/v1/receptions | ❌ | ✅ |
| - GET /api/sync/* (todos) | ✅ | ✅ |
| **Sincronización** | | |
| - Sync-client instalado | ✅ | ✅ |
| - PRs → Softland | ✅ | ✅ |
| - OCs ← Softland | ✅ Manual | ✅ Automático (job) |
| - Recepciones → Softland | ❌ | ✅ |
| **Frontend** | | |
| - Crear PR | ✅ Form básico | ✅ Form completo con validaciones |
| - Listar PRs | ✅ Tabla simple | ✅ Tabla con filtros + búsqueda |
| - Ver PR | ✅ | ✅ Con timeline completo |
| - Aprobar/Rechazar | ✅ Botón simple | ✅ Modal con comentarios |
| - Dashboard | ❌ | ✅ Con gráficos |
| - Recepciones UI | ❌ | ✅ |
| **Features Avanzadas** | | |
| - Notificaciones push | ❌ | ✅ |
| - Email notifications | ❌ | ✅ |
| - WebSocket real-time | ❌ | ✅ |
| - Job procesamiento OCs | ❌ | ✅ Cada 1 min |
| - Analytics/Reports | ❌ | ✅ |
| - Audit log | ❌ | ✅ |

---

## 🗓️ PLAN DE TRABAJO DETALLADO

---

## 📅 SEMANA 1: Setup Base de Datos y Endpoints Sync
**MVP - FASE 1**

**Objetivo**: Tener la infraestructura de sincronización funcionando

### Día 1-2: Modelos Prisma y Migraciones

#### Backend: Schema Prisma

**Archivo**: `prisma/schema.prisma`

**IMPORTANTE**: Hub NO necesita modelos para `SyncConfiguration`, `SyncApiKey`, ni `SyncLog`. Estos modelos están en Parse.

- [ ] **Task 1.1**: ~~Crear modelos de sincronización~~ **OMITIR - Parse los tiene**

  **Nota**: Los modelos `SyncConfiguration`, `SyncApiKey` y `SyncLog` están en Parse, no en Hub.

- [ ] **Task 1.2**: Verificar que schema `sync` existe en PostgreSQL compartido
  ```sql
  -- Ejecutar en PostgreSQL (probablemente ya existe desde Parse)
  CREATE SCHEMA IF NOT EXISTS sync;
  ```
  **Criterio**: Schema visible en `\dn` de psql
  **Nota**: Este schema es compartido entre Parse y Hub

- [ ] **Task 1.3**: Agregar modelos de tablas sync (schema separado) a Prisma de Hub
  ```prisma
  model RequerimientoCompraSyncTable {
    id                      String   @id @default(cuid())
    tenantId                String

    numero_requerimiento    String   @unique
    descripcion             String   @db.Text
    prioridad               String
    monto_estimado          Decimal? @db.Decimal(18,2)
    fecha_necesaria         DateTime?

    usuario_solicitante     String
    departamento            String?

    sincronizado            Boolean  @default(false)
    fecha_sincronizacion    DateTime?
    intentos_sincronizacion Int      @default(0)
    error_sincronizacion    String?  @db.Text

    createdAt               DateTime @default(now())
    updatedAt               DateTime @updatedAt

    @@map("requerimientos_compra_sync")
    @@schema("sync")
  }

  model OrdenCompraSyncTable {
    id                      String   @id @default(cuid())
    tenantId                String

    numero_orden            String   @unique
    numero_requerimiento    String?
    proveedor_cuit          String?
    proveedor_nombre        String?

    monto_total             Decimal  @db.Decimal(18,2)
    moneda                  String   @default("ARS")

    fecha_creacion          DateTime
    fecha_entrega_estimada  DateTime?
    fecha_modificacion      DateTime

    estado_softland         String?

    procesado               Boolean  @default(false)
    fecha_procesado         DateTime?

    datos_adicionales       Json?

    createdAt               DateTime @default(now())
    updatedAt               DateTime @updatedAt

    @@index([numero_requerimiento])
    @@map("ordenes_compra_sync")
    @@schema("sync")
  }

  model RecepcionSyncTable {
    id                      String   @id @default(cuid())
    tenantId                String

    numero_recepcion        String   @unique
    numero_orden            String

    fecha_recepcion         DateTime
    usuario_receptor        String

    items_recibidos         Json
    observaciones           String?  @db.Text

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
  **Criterio**: `npx prisma validate` pasa sin errores

- [ ] **Task 1.4**: Generar y ejecutar migraciones
  ```bash
  npx prisma migrate dev --name add_sync_tables
  ```
  **Criterio**: Migraciones aplicadas sin errores, tablas creadas en BD

- [ ] **Task 1.5**: Generar Prisma Client
  ```bash
  npx prisma generate
  ```
  **Criterio**: Client generado, tipos TypeScript disponibles

**Estimación**: 0.5 días
**Dependencias**: Ninguna
**Bloqueadores**: Acceso a PostgreSQL

---

### ~~Día 2-3: Utilidades de Encriptación y Auth~~ **OMITIR - Parse las tiene**

**IMPORTANTE**: Hub NO necesita implementar estas utilidades. Parse ya las tiene.

- [ ] ~~Task 1.6: Implementar encriptación AES-256-GCM~~ **OMITIR**
- [ ] ~~Task 1.7: Implementar autenticación con API Keys~~ **OMITIR**
- [ ] ~~Task 1.8: Agregar variable de entorno SYNC_ENCRYPTION_KEY~~ **OMITIR**

**Razón**: Parse maneja toda la autenticación del sync-client y encriptación de credenciales SQL.

---

### ~~Día 3-5: Endpoints de Sincronización~~ **OMITIR - Parse los tiene**

**IMPORTANTE**: Hub NO necesita implementar endpoints `/api/sync/*`. Estos están en Parse.

- [ ] ~~Task 1.9: Endpoint health check~~ **OMITIR**
- [ ] ~~Task 1.10: Endpoint obtener configuración~~ **OMITIR**
- [ ] ~~Task 1.11: Endpoint upload (Softland → Hub)~~ **OMITIR**
- [ ] ~~Task 1.12: Endpoint download (Hub → Softland)~~ **OMITIR**
- [ ] ~~Task 1.13: Endpoint logs~~ **OMITIR**

**Razón**: El sync-client se comunica con Parse, no con Hub. Parse tiene todos estos endpoints.

---

### Revisión Semana 1

**Checklist de cierre:**

- [ ] Schema `sync` existe en PostgreSQL
- [ ] Modelos Prisma para tablas sync creados en Hub
- [ ] Migraciones aplicadas en BD
- [ ] Tablas sync.requerimientos_compra_sync, sync.ordenes_compra_sync, sync.recepciones_sync creadas
- [ ] Documentación actualizada si hubo cambios
- [ ] Code review completado
- [ ] PR mergeado a `main`

**Entregable**: Tablas sync creadas y accesibles desde Hub via Prisma

**Nota**: NO se implementan endpoints /api/sync/* en Hub (están en Parse)

---

## 📅 SEMANA 2: Configuración del Sync-Client (en Parse)

**Objetivo**: Tener sync-client instalado y sincronizando entre Softland y Parse

**IMPORTANTE**: Esta semana se trabaja mayormente en Parse, NO en Hub.

### Día 1: Compilación del Sync-Client (si no existe)

- [ ] **Task 2.1**: Verificar si sync-client ya existe en Parse
  ```bash
  cd /home/martin/Desarrollos/parse/sync-client-standalone
  ls dist/ax-sync-client.exe
  ```
  **Criterio**: Si existe, omitir compilación. Si no, compilar con `npm run build`

- [ ] **Task 2.2**: Copiar ejecutable a servidor Windows del cliente
  ```cmd
  copy dist\ax-sync-client.exe \\servidor-cliente\C$\sync\
  ```
  **Criterio**: Archivo copiado exitosamente

**Estimación**: 0.5 días
**Dependencias**: Acceso al servidor Windows del cliente

---

### Día 2-3: Configuración en Parse (NO en Hub)

**IMPORTANTE**: Estas tareas se hacen en Parse, NO en Hub.

- [ ] **Task 2.3**: ~~Endpoint para generar API Keys en Hub~~ **OMITIR**

  **Se hace en Parse**: Generar API key usando el admin panel de Parse

  ```bash
  # Desde Parse admin panel
  POST https://parse-api.com/api/admin/sync/api-keys
  {
    "tenantId": "tenant-abc-123",
    "nombre": "Hub - Servidor SQL Producción"
  }
  ```
  **Criterio**: API key generada en Parse, guardada en archivo seguro

- [ ] **Task 2.4**: ~~Crear sync_configuration en Hub~~ **OMITIR**

  **Se hace en Parse**: Configurar sync_configuration en Parse admin panel

  Configurar tablas de sincronización:
  - `tablasBajada`: requerimientos_compra, recepciones
  - `tablasSubida`: ordenes_compra

  **Criterio**: Configuración visible en Parse admin

- [ ] **Task 2.5**: Coordinar con equipo de Parse

  **Acción**: Solicitar al equipo de Parse que:
  1. Genere API key para el tenant
  2. Configure sync_configuration con credenciales SQL del cliente
  3. Configure tablas de sincronización (JSON config)

  **Criterio**: Parse confirma configuración completada

**Estimación**: 0.5 días (solo coordinación)
**Dependencias**: Semana 1 completada

---

### Día 4-5: Instalación en Cliente

- [ ] **Task 2.6**: Configurar password de encriptación en servidor Windows
  ```cmd
  REM En servidor Windows del cliente
  setx SYNC_CONFIG_PASSWORD "PasswordSeguro2025"
  REM Cerrar y abrir nueva ventana CMD
  ```
  **Criterio**: Variable de entorno configurada

- [ ] **Task 2.7**: Inicializar sync-client (apunta a Parse, NO a Hub)

  **Archivo**: `app/api/admin/sync/api-keys/route.ts`
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { generateApiKey } from '@/lib/sync/auth';
  import { authenticate } from '@/lib/auth'; // Tu middleware de auth

  export async function POST(request: NextRequest) {
    // Verificar que es admin
    const user = await authenticate(request);
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tenantId, nombre } = body;

    if (!tenantId || !nombre) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    try {
      const plainKey = await generateApiKey(tenantId, nombre);

      return NextResponse.json({
        success: true,
        plainKey,
        message: 'IMPORTANTE: Guardar esta key, no se puede recuperar después'
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Error al generar API key' },
        { status: 500 }
      );
    }
  }
  ```
  **Criterio**: Admin puede generar API key desde panel

- [ ] **Task 2.4**: Crear sync_configuration para el tenant

  Insertar en BD (o endpoint POST):
  ```sql
  INSERT INTO sync_configurations (
    "tenantId",
    "sqlServerHost",
    "sqlServerPort",
    "sqlServerDatabase",
    "sqlServerUser",
    "sqlServerPassword",
    "configuracionTablas",
    "activo"
  ) VALUES (
    'tenant-abc-123',
    '192.168.1.100',
    1433,
    'SoftlandDB',
    'sync_user',
    '<usar encryptPassword("password_real")>',
    '{...}'::jsonb,  -- Ver estructura en SYNC_CLIENT_INTEGRATION.md
    true
  );
  ```
  **Criterio**: Configuración visible en tabla `sync_configurations`

- [ ] **Task 2.5**: Generar API key para sync-client
  ```bash
  # Desde Hub admin panel o SQL
  POST /api/admin/sync/api-keys
  {
    "tenantId": "tenant-abc-123",
    "nombre": "Servidor SQL Producción"
  }
  ```
  **Criterio**: API key generada, guardada en archivo seguro

**Estimación**: 1 día
**Dependencias**: Semana 1 completada

---

### Día 4-5: Instalación en Cliente

- [ ] **Task 2.6**: Configurar password de encriptación en servidor Windows
  ```cmd
  REM En servidor Windows del cliente
  setx SYNC_CONFIG_PASSWORD "PasswordSeguro2025"
  REM Cerrar y abrir nueva ventana CMD
  ```
  **Criterio**: Variable de entorno configurada

```cmd
  cd C:\sync
  ax-sync-client.exe init ^
    --url https://parse-api.com ^
    --tenant tenant-abc-123 ^
    --key sk_<key-generada-en-PARSE>
  ```
  **Criterio**: Archivo `sync-config.enc` creado
  **IMPORTANTE**: La URL debe apuntar a Parse, NO a Hub

- [ ] **Task 2.8**: Probar conexión
  ```cmd
  ax-sync-client.exe test
  ```
  **Criterio**: Test exitoso, conecta a Hub y Softland

- [ ] **Task 2.9**: Ejecutar primera sincronización manual
  ```cmd
  ax-sync-client.exe sync
  ```
  **Criterio**:
  - Sincronización completa sin errores
  - Logs guardados en `C:\sync\logs\`
  - Logs enviados a Hub (visible en `sync_logs`)

- [ ] **Task 2.10**: Programar Task Scheduler
  ```cmd
  schtasks /create /tn "Hub Sync Client" ^
    /tr "C:\sync\ax-sync-client.exe sync" ^
    /sc minute /mo 5 ^
    /ru SYSTEM
  ```
  **Criterio**: Tarea programada activa, ejecuta cada 5 minutos

**Estimación**: 1.5 días
**Dependencias**: Tasks 2.3-2.5 completadas, acceso al servidor cliente

---

### Revisión Semana 2

**Checklist de cierre:**

- [ ] Sync-client instalado en servidor Windows del cliente
- [ ] Sync-client configurado apuntando a Parse (NO a Hub)
- [ ] Sincronización cada 5 minutos activa (Task Scheduler)
- [ ] Logs llegando a Parse (verificar en Parse admin)
- [ ] Conectividad Parse ↔ Softland verificada
- [ ] Tablas sync.* visibles desde Hub via Prisma
- [ ] Documentación de instalación actualizada

**Entregable**: Sync-client operativo sincronizando Parse ↔ Softland

**Nota**: Hub aún no lee/escribe a las tablas sync (eso es Semana 3)

---

## 📅 SEMANA 3-4: Módulo Purchase Requests + Integración

**Objetivo**: Implementar Purchase Requests con workflow de aprobación + procesamiento de OCs

### Semana 2.5 - Día 1-2: Modelos de Purchase Requests (MVP Simplificado)

#### Backend: Prisma Models (Versión MVP)

- [ ] **Task 3.1**: Agregar modelos básicos de Purchase Requests (MVP)

  **Archivo**: `prisma/schema.prisma`
  ```prisma
  enum PurchaseRequestStatus {
    DRAFT
    PENDING
    IN_APPROVAL
    APPROVED
    SENT_TO_ERP
    PO_CREATED
    PARTIALLY_RECEIVED
    RECEIVED
    REJECTED
    CANCELLED
  }

  enum PurchaseRequestPriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  model PurchaseRequest {
    id              String   @id @default(cuid())
    number          String   @unique
    description     String   @db.Text
    status          PurchaseRequestStatus
    priority        PurchaseRequestPriority @default(NORMAL)

    tenantId        String
    tenant          Tenant   @relation(fields: [tenantId], references: [id])

    requestedBy     String
    requestedByUser User     @relation("RequestedPurchases", fields: [requestedBy], references: [id])
    department      String?

    estimatedAmount Decimal?
    currency        String   @default("ARS")

    neededByDate    DateTime?
    createdAt       DateTime  @default(now())
    updatedAt       DateTime  @updatedAt

    erpSentAt       DateTime?
    erpRequestId    String?   @unique

    approvals       PurchaseRequestApproval[]
    purchaseOrderId String?
    purchaseOrder   PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
    receptions      PurchaseReception[]

    @@map("purchase_requests")
  }

  model ApprovalLevel {
    id           String   @id @default(cuid())
    tenantId     String
    tenant       Tenant   @relation(fields: [tenantId], references: [id])

    level        Int
    minAmount    Decimal  @db.Decimal(18,2)
    maxAmount    Decimal? @db.Decimal(18,2)

    approverRoles String[]
    requiresAll   Boolean  @default(false)

    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    @@unique([tenantId, level])
    @@map("approval_levels")
  }

  model PurchaseRequestApproval {
    id                  String   @id @default(cuid())
    purchaseRequestId   String
    purchaseRequest     PurchaseRequest @relation(fields: [purchaseRequestId], references: [id])

    level               Int
    approverId          String
    approver            User     @relation(fields: [approverId], references: [id])

    status              String   // PENDING, APPROVED, REJECTED, CHANGES_REQUESTED
    comments            String?  @db.Text

    approvedAt          DateTime?
    createdAt           DateTime  @default(now())

    @@unique([purchaseRequestId, level, approverId])
    @@map("purchase_request_approvals")
  }

  model PurchaseOrder {
    id                      String   @id @default(cuid())
    erpOrderId              String   @unique

    tenantId                String
    tenant                  Tenant   @relation(fields: [tenantId], references: [id])

    totalAmount             Decimal  @db.Decimal(18,2)
    currency                String   @default("ARS")

    supplierCuit            String?
    supplierName            String?

    createdInErpAt          DateTime
    estimatedDeliveryDate   DateTime?

    purchaseRequests        PurchaseRequest[]
    receptions              PurchaseReception[]

    createdAt               DateTime @default(now())
    updatedAt               DateTime @updatedAt

    @@map("purchase_orders")
  }

  model PurchaseReception {
    id                String   @id @default(cuid())
    number            String   @unique

    purchaseOrderId   String
    purchaseOrder     PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])

    purchaseRequestId String?
    purchaseRequest   PurchaseRequest? @relation(fields: [purchaseRequestId], references: [id])

    receivedBy        String
    receivedByUser    User     @relation(fields: [receivedBy], references: [id])

    receivedAt        DateTime

    items             Json     // Array de items recibidos
    observations      String?  @db.Text

    erpSentAt         DateTime?

    createdAt         DateTime @default(now())
    updatedAt         DateTime @updatedAt

    @@map("purchase_receptions")
  }
  ```
  **Criterio**: `npx prisma validate` pasa

- [ ] **Task 3.2**: Ejecutar migraciones
  ```bash
  npx prisma migrate dev --name add_purchase_requests
  npx prisma generate
  ```
  **Criterio**: Migraciones aplicadas, client generado

**Estimación**: 1 día

---

### Semana 3 - Día 3-5: API Endpoints de Purchase Requests

#### Backend: CRUD Purchase Requests

**Archivos**:
- `app/api/v1/purchase-requests/route.ts`
- `app/api/v1/purchase-requests/[id]/route.ts`
- `app/api/v1/purchase-requests/[id]/approve/route.ts`
- `app/api/v1/purchase-requests/[id]/reject/route.ts`

- [ ] **Task 3.3**: Endpoint crear PR

  **Archivo**: `app/api/v1/purchase-requests/route.ts`
  ```typescript
  export async function POST(request: NextRequest) {
    // 1. Autenticar usuario
    // 2. Validar datos
    // 3. Generar número (PR-YYYY-XXXXX)
    // 4. Crear en BD
    // 5. Crear primera aprobación si monto > 0
    // 6. Retornar PR creado
  }
  ```
  **Criterio**: POST crea PR con estado DRAFT

- [ ] **Task 3.4**: Endpoint listar PRs
  ```typescript
  export async function GET(request: NextRequest) {
    // 1. Autenticar usuario
    // 2. Filtrar por tenant
    // 3. Paginación
    // 4. Filtros (status, requestedBy, dateRange)
    // 5. Retornar lista
  }
  ```
  **Criterio**: GET retorna PRs paginados con filtros

- [ ] **Task 3.5**: Endpoint obtener PR por ID

  **Archivo**: `app/api/v1/purchase-requests/[id]/route.ts`
  ```typescript
  export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    // 1. Autenticar
    // 2. Verificar permisos
    // 3. Incluir approvals, purchaseOrder, receptions
    // 4. Retornar PR completo
  }
  ```
  **Criterio**: GET retorna PR con relaciones

- [ ] **Task 3.6**: Endpoint aprobar PR

  **Archivo**: `app/api/v1/purchase-requests/[id]/approve/route.ts`
  ```typescript
  export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    // 1. Autenticar usuario
    // 2. Verificar que es aprobador del nivel actual
    // 3. Marcar aprobación
    // 4. Si todos aprobaron nivel → avanzar nivel
    // 5. Si último nivel → cambiar status a APPROVED
    // 6. Si APPROVED → copiar a sync table
    // 7. Crear notificación
    // 8. Retornar PR actualizado
  }
  ```
  **Criterio**:
  - Aprueba nivel por nivel
  - Cuando llega a APPROVED → copia a `sync.requerimientos_compra_sync`

- [ ] **Task 3.7**: Endpoint rechazar PR

  **Archivo**: `app/api/v1/purchase-requests/[id]/reject/route.ts`
  ```typescript
  export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    // 1. Autenticar
    // 2. Verificar es aprobador
    // 3. Marcar como REJECTED
    // 4. Crear notificación
    // 5. Retornar PR
  }
  ```
  **Criterio**: Rechaza PR, notifica al creador

**Estimación**: 2 días

---

### Semana 4 - Día 1-3: Procesamiento de OCs y Notificaciones

#### Backend: Jobs y Workers

**Archivos**:
- `lib/jobs/process-purchase-orders.ts`
- `lib/notifications/purchase-request-notifications.ts`

- [ ] **Task 3.8**: Job de procesamiento de OCs

  **Archivo**: `lib/jobs/process-purchase-orders.ts`
  ```typescript
  import { prisma } from '@/lib/prisma';
  import { createNotification } from '@/lib/notifications/purchase-request-notifications';

  export async function processPurchaseOrders() {
    console.log('[Job] Procesando OCs nuevas...');

    // 1. Buscar OCs no procesadas
    const nuevasOCs = await prisma.ordenCompraSyncTable.findMany({
      where: { procesado: false }
    });

    console.log(`[Job] Encontradas ${nuevasOCs.length} OCs nuevas`);

    for (const oc of nuevasOCs) {
      try {
        // 2. Buscar PR vinculado
        const pr = await prisma.purchaseRequest.findFirst({
          where: { number: oc.numero_requerimiento }
        });

        if (!pr) {
          console.warn(`[Job] PR ${oc.numero_requerimiento} no encontrado para OC ${oc.numero_orden}`);
          continue;
        }

        // 3. Crear Purchase Order
        const po = await prisma.purchaseOrder.create({
          data: {
            erpOrderId: oc.numero_orden,
            tenantId: oc.tenantId,
            totalAmount: oc.monto_total,
            currency: oc.moneda,
            supplierCuit: oc.proveedor_cuit,
            supplierName: oc.proveedor_nombre,
            createdInErpAt: oc.fecha_creacion,
            estimatedDeliveryDate: oc.fecha_entrega_estimada
          }
        });

        // 4. Actualizar PR
        await prisma.purchaseRequest.update({
          where: { id: pr.id },
          data: {
            status: 'PO_CREATED',
            purchaseOrderId: po.id
          }
        });

        // 5. Crear notificación
        await createNotification({
          userId: pr.requestedBy,
          type: 'PO_CREATED',
          title: '📄 Orden de Compra generada',
          message: `Se generó la OC ${oc.numero_orden} por ${oc.moneda} ${oc.monto_total.toFixed(2)}`,
          data: {
            purchaseRequestId: pr.id,
            purchaseOrderId: po.id,
            erpOrderId: oc.numero_orden
          }
        });

        // 6. Marcar OC como procesada
        await prisma.ordenCompraSyncTable.update({
          where: { id: oc.id },
          data: {
            procesado: true,
            fecha_procesado: new Date()
          }
        });

        console.log(`[Job] ✓ OC ${oc.numero_orden} procesada`);
      } catch (error) {
        console.error(`[Job] ✗ Error procesando OC ${oc.numero_orden}:`, error);
      }
    }

    console.log('[Job] Procesamiento de OCs completado');
  }
  ```
  **Criterio**: Job procesa OCs y crea notificaciones

- [ ] **Task 3.9**: Sistema de notificaciones

  **Archivo**: `lib/notifications/purchase-request-notifications.ts`
  ```typescript
  import { prisma } from '@/lib/prisma';
  // Importar tu sistema de notificaciones existente

  interface NotificationData {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }

  export async function createNotification(notification: NotificationData) {
    // Usar tu modelo de notificaciones existente
    await prisma.notification.create({
      data: {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: false
      }
    });

    // TODO: Enviar por WebSocket si usuario está conectado
    // TODO: Enviar email si es prioridad alta
  }
  ```
  **Criterio**: Notificaciones creadas en BD

- [ ] **Task 3.10**: Programar job con cron

  **Opción 1: node-cron (simple)**
  ```typescript
  // app/api/cron/process-orders/route.ts
  import { NextResponse } from 'next/server';
  import { processPurchaseOrders } from '@/lib/jobs/process-purchase-orders';

  export async function GET() {
    await processPurchaseOrders();
    return NextResponse.json({ success: true });
  }
  ```

  Configurar en Vercel Cron o usar `node-cron`:
  ```typescript
  // lib/cron.ts
  import cron from 'node-cron';
  import { processPurchaseOrders } from './jobs/process-purchase-orders';

  export function startCronJobs() {
    // Cada 1 minuto
    cron.schedule('*/1 * * * *', async () => {
      await processPurchaseOrders();
    });
  }
  ```

  **Criterio**: Job ejecuta cada 1 minuto automáticamente

**Estimación**: 2 días

---

### Semana 4 - Día 4-5: Recepciones

#### Backend: Purchase Receptions

**Archivos**:
- `app/api/v1/receptions/route.ts`
- `app/api/v1/receptions/[id]/route.ts`

- [ ] **Task 3.11**: Endpoint crear recepción

  **Archivo**: `app/api/v1/receptions/route.ts`
  ```typescript
  export async function POST(request: NextRequest) {
    // 1. Autenticar usuario
    // 2. Validar purchaseOrderId existe
    // 3. Generar número (REC-YYYY-XXXXX)
    // 4. Crear recepción
    // 5. Copiar a sync.recepciones_sync
    // 6. Actualizar status de PR si recepción completa
    // 7. Crear notificación
    // 8. Retornar recepción
  }
  ```
  **Criterio**:
  - POST crea recepción
  - Copia a tabla sync para enviar a Softland

- [ ] **Task 3.12**: Endpoint listar recepciones
  ```typescript
  export async function GET(request: NextRequest) {
    // 1. Autenticar
    // 2. Filtrar por tenant
    // 3. Incluir purchaseOrder y purchaseRequest
    // 4. Paginación
    // 5. Retornar lista
  }
  ```
  **Criterio**: GET retorna recepciones paginadas

**Estimación**: 1 día

---

### Revisión Semana 3-4

**Checklist de cierre:**

- [ ] PRs se pueden crear, aprobar, rechazar
- [ ] Workflow de aprobación multinivel funciona
- [ ] PRs aprobados se copian a tabla sync
- [ ] Sync-client descarga PRs y los envía a Softland
- [ ] OCs de Softland se procesan automáticamente
- [ ] Notificaciones funcionan
- [ ] Recepciones se pueden crear y sincronizan a Softland
- [ ] Tests E2E básicos pasan
- [ ] Code review completado

**Entregable**: Módulo Purchase Requests funcional end-to-end

---

## 📅 SEMANA 5: Testing, Ajustes y Deploy

**Objetivo**: Sistema probado y en producción

### Día 1-2: Testing E2E

- [ ] **Task 4.1**: Test: Crear PR → Aprobar → Softland
  ```
  1. Usuario crea PR con monto $10,000
  2. Aprobador nivel 1 aprueba
  3. PR cambia a APPROVED
  4. PR se copia a sync.requerimientos_compra_sync
  5. Sync-client descarga PR (esperar 5 min)
  6. Verificar PR existe en Softland DB
  ```
  **Criterio**: PR llega a Softland correctamente

- [ ] **Task 4.2**: Test: OC en Softland → Hub → Notificación
  ```
  1. Crear OC manualmente en Softland vinculada a PR
  2. Esperar 5 minutos (sync-client sube OC)
  3. Verificar OC en sync.ordenes_compra_sync
  4. Verificar job procesó OC
  5. Verificar PurchaseOrder creada
  6. Verificar PR status = PO_CREATED
  7. Verificar notificación enviada al usuario
  ```
  **Criterio**: OC se procesa y notifica correctamente

- [ ] **Task 4.3**: Test: Recepción → Softland → Inventario
  ```
  1. Usuario crea recepción en Hub
  2. Verificar en sync.recepciones_sync
  3. Esperar 5 minutos (sync-client descarga)
  4. Verificar recepción en Softland DB
  5. Verificar inventario actualizado en Softland
  ```
  **Criterio**: Recepción actualiza inventario

- [ ] **Task 4.4**: Test de errores y recuperación
  ```
  - Sync-client sin conexión a Hub
  - Sync-client sin conexión a Softland
  - PR con monto inválido
  - OC sin PR vinculado
  - Recepción con cantidad > ordenada
  ```
  **Criterio**: Errores logueados, sistema no cae

**Estimación**: 1.5 días

---

### Día 3-4: Performance y Logs

- [ ] **Task 4.5**: UI para ver logs de sincronización

  **Archivo**: `app/(protected)/admin/sync-logs/page.tsx`
  ```typescript
  // Mostrar últimos 100 logs de sync
  // Filtros: tenant, tabla, estado, fecha
  // Refresh automático cada 30 seg
  ```
  **Criterio**: Admin puede ver logs en tiempo real

- [ ] **Task 4.6**: Optimización de queries
  - [ ] Agregar índices a tablas sync
  - [ ] Optimizar query de OCs no procesadas
  - [ ] Implementar caché en endpoints más usados

  **Criterio**: Queries < 100ms

- [ ] **Task 4.7**: Configurar monitoreo
  - [ ] Alertas si sync-client no reporta en 10 min
  - [ ] Alertas si job de OCs falla 3 veces seguidas
  - [ ] Dashboard con métricas clave

  **Criterio**: Alertas funcionando

**Estimación**: 1.5 días

---

### Día 5: Deploy a Producción

- [ ] **Task 4.8**: Deploy de Hub backend
  ```bash
  # Actualizar variables de entorno
  # Ejecutar migraciones en prod
  # Deploy con Vercel/Railway/otro
  ```
  **Criterio**: Backend en producción

- [ ] **Task 4.9**: Instalar sync-client en producción
  ```cmd
  REM En servidor Windows del cliente (producción)
  REM Seguir pasos de instalación
  ```
  **Criterio**: Sync-client sincronizando en prod

- [ ] **Task 4.10**: Smoke tests en producción
  - [ ] Crear PR de prueba
  - [ ] Aprobar
  - [ ] Verificar llega a Softland

  **Criterio**: Sistema funciona en producción

- [ ] **Task 4.11**: Documentación final
  - [ ] Actualizar README con instrucciones de instalación
  - [ ] Documentar troubleshooting
  - [ ] Crear guía de usuario

  **Criterio**: Documentación completa

**Estimación**: 1 día

---

### Revisión Semana 5

**Checklist de cierre:**

- [ ] Tests E2E pasan en staging
- [ ] Sistema deployed en producción
- [ ] Sync-client funcionando en prod
- [ ] Monitoreo activo
- [ ] Documentación completa
- [ ] Cliente notificado y capacitado
- [ ] Retrospectiva completada

**Entregable**: Sistema Purchase Requests en producción

---

## 📊 Métricas de Éxito

Al finalizar las 5 semanas, validar:

### Funcionales
- [ ] Usuario puede crear PR desde el portal
- [ ] Workflow de aprobación funciona correctamente
- [ ] PRs aprobados llegan a Softland en < 5 minutos
- [ ] OCs creadas en Softland aparecen en Hub en < 5 minutos
- [ ] Notificaciones llegan a usuarios en tiempo real
- [ ] Recepciones actualizan inventario en Softland

### Técnicas
- [ ] Uptime del sync-client > 99%
- [ ] Tasa de sincronización exitosa > 98%
- [ ] Tiempo promedio de sincronización < 2 segundos
- [ ] Endpoints responden en < 500ms
- [ ] 0 errores críticos en logs

### Negocio
- [ ] Reducción de tiempo de proceso PR → OC
- [ ] Reducción de errores manuales
- [ ] Trazabilidad completa del proceso
- [ ] Satisfacción del cliente

---

## 🚨 Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Estructura de Softland diferente a esperada | Media | Alto | Validar estructura en Semana 1, ajustar queries |
| Problemas de conectividad cliente → Hub | Media | Alto | Implementar retry logic, queue de sincronización |
| Performance de sync con gran volumen | Baja | Medio | Paginación, sincronización incremental |
| Errores en workflow de aprobación | Baja | Alto | Tests exhaustivos, validaciones en backend |
| Sync-client cae en producción | Baja | Crítico | Monitoreo + alertas, auto-restart con Task Scheduler |

---

## 👥 Roles y Responsabilidades

| Rol | Responsable | Tareas |
|-----|-------------|--------|
| **Backend Developer** | [Nombre] | Endpoints, modelos, jobs, encriptación |
| **DevOps** | [Nombre] | Deploy, monitoreo, configuración servidores |
| **QA** | [Nombre] | Tests E2E, validación funcional |
| **Cliente - IT** | [Nombre] | Acceso a Softland, instalación sync-client |
| **PM** | [Nombre] | Coordinación, validación entregas |

---

## 📞 Contactos

**Equipo Hub**: [emails/slack]
**Cliente**: [contacto IT del cliente]
**Soporte Softland**: [contacto si aplica]

---

## 📝 Notas

- Este roadmap asume 1 desarrollador full-time
- Si hay más recursos, se pueden paralelizar tareas
- Ajustar estimaciones según complejidad real de Softland
- Priorizar siempre: funcionalidad básica → optimizaciones

---

**Documento creado**: 2025-11-29
**Autor**: Hub Development Team
**Estado**: ✅ Listo para ejecución

---

## 🚀 ROADMAP SIMPLIFICADO: MVP vs FULL

### ⚡ MVP - 2.5 Semanas (Demo Funcional)

#### Semana 1: Infraestructura
- [ ] Modelos Prisma básicos (sync + PR simple)
- [ ] Endpoints `/api/sync/*` (5 endpoints)
- [ ] Encriptación + Auth con API Keys
- [ ] Migraciones aplicadas

#### Semana 2: Sincronización
- [ ] Sync-client compilado e instalado
- [ ] API key generada
- [ ] Primera sincronización exitosa
- [ ] Task Scheduler configurado (cada 5 min)

#### Semana 2.5: CRUD + Aprobación Simple
- [ ] Modelo PurchaseRequest básico
- [ ] POST /api/v1/purchase-requests (crear)
- [ ] GET /api/v1/purchase-requests (listar)
- [ ] GET /api/v1/purchase-requests/:id (ver)
- [ ] POST /api/v1/purchase-requests/:id/approve (aprobar simple)
- [ ] POST /api/v1/purchase-requests/:id/reject (rechazar)
- [ ] PR aprobado → se copia a sync table
- [ ] Sync-client descarga PR → Softland
- [ ] Frontend básico: Crear PR, Listar PRs, Aprobar/Rechazar

**🎉 DEMO MVP**: Usuario crea PR → Aprueba → Llega a Softland → OC manual

---

### 🏆 FULL - 2.5 Semanas Adicionales (Production Ready)

#### Semana 3: Aprobación Multinivel + Jobs

**Backend**:
- [ ] Modelo ApprovalLevel con rangos de monto
- [ ] Endpoint POST /api/v1/admin/approval-levels (configurar niveles)
- [ ] Lógica de aprobación multinivel en /approve
- [ ] Job procesamiento OCs automático (cada 1 min)
- [ ] Procesador que vincula OCs con PRs
- [ ] Update status PR → PO_CREATED automáticamente

**Testing**:
- [ ] Test: PR $5K → 1 aprobador
- [ ] Test: PR $15K → 2 aprobadores
- [ ] Test: OC automática desde Softland
- [ ] Test: Job procesa OC y actualiza PR

**Entregable**: Workflow multinivel + Procesamiento automático OCs

---

#### Semana 4: Notificaciones + Recepciones

**Backend**:
- [ ] Modelo Notification
- [ ] Service createNotification()
- [ ] Notificaciones en aprobación/rechazo
- [ ] Notificaciones cuando OC es creada
- [ ] WebSocket server (opcional)
- [ ] Email service (opcional)

**Recepciones**:
- [ ] Modelo PurchaseReception
- [ ] POST /api/v1/receptions
- [ ] GET /api/v1/receptions
- [ ] Recepción → sync table → Softland
- [ ] Validación cantidad recibida vs ordenada

**Frontend**:
- [ ] Bell icon con contador de notificaciones
- [ ] Dropdown de notificaciones
- [ ] Formulario crear recepción
- [ ] Listar recepciones

**Testing**:
- [ ] Test: Notificación al aprobar PR
- [ ] Test: Notificación cuando OC creada
- [ ] Test: Crear recepción parcial
- [ ] Test: Recepción completa → PR status RECEIVED

**Entregable**: Sistema de notificaciones + Recepciones funcionando

---

#### Semana 5: UI Completa + Testing + Deploy

**Frontend Avanzado**:
- [ ] Dashboard con métricas (PRs pendientes, aprobados, rechazados)
- [ ] Filtros avanzados en lista PRs
- [ ] Búsqueda por número/descripción
- [ ] Timeline de eventos en detalle PR
- [ ] Vista de aprobadores pendientes
- [ ] Exportar PRs a Excel/PDF
- [ ] UI Admin para configurar niveles de aprobación

**Testing E2E**:
- [ ] Flujo completo: Crear PR → Aprobar multinivel → Softland → OC → Notificación
- [ ] Flujo recepción: OC → Crear recepción → Softland actualiza inventario
- [ ] Tests de errores (sync falla, Softland offline, etc.)
- [ ] Performance testing (100 PRs simultáneos)

**Deploy**:
- [ ] Deploy backend a producción
- [ ] Deploy frontend a producción
- [ ] Sync-client en servidor cliente (producción)
- [ ] Monitoreo configurado
- [ ] Alertas configuradas

**Documentación**:
- [ ] Guía de usuario final
- [ ] Guía de troubleshooting
- [ ] Runbook de operaciones

**🚀 PRODUCCIÓN**: Sistema completo funcionando en cliente real

---

## 📋 Checklist de Entregables

### ✅ MVP (Semana 2.5)
- [ ] Backend con endpoints CRUD de PRs
- [ ] Sincronización Hub ↔ Softland funcionando
- [ ] Aprobación simple (1 nivel)
- [ ] Frontend básico (crear, listar, aprobar)
- [ ] **DEMO**: Flujo end-to-end básico funciona

### ✅ Full (Semana 5)
- [ ] Aprobación multinivel configurable
- [ ] Jobs automáticos procesando OCs
- [ ] Sistema de notificaciones real-time
- [ ] Recepciones con validación
- [ ] UI completa con dashboard
- [ ] Tests E2E pasan al 100%
- [ ] Sistema en producción
- [ ] **PRODUCCIÓN**: Cliente usando el sistema

---

## 🎯 Hitos Clave

| Hito | Fecha Objetivo | Status |
|------|----------------|--------|
| **MVP DEMO** | Fin Semana 2.5 | ⏳ Pendiente |
| Aprobación Multinivel | Fin Semana 3 | ⏳ Pendiente |
| Notificaciones + Recepciones | Fin Semana 4 | ⏳ Pendiente |
| **PRODUCCIÓN** | Fin Semana 5 | ⏳ Pendiente |

---

## 💡 Decisiones de Scope MVP

### ¿Por qué NO incluir en MVP?

**Notificaciones Automáticas**:
- Requiere configurar Email/WebSocket
- No crítico para demostrar flujo básico
- Se puede notificar manualmente en MVP

**Aprobación Multinivel**:
- Lógica compleja de niveles
- Configuración de rangos de monto
- MVP: Cualquier admin puede aprobar (más simple)

**Recepciones**:
- Feature adicional después del flujo core
- Requiere validaciones complejas
- MVP: Focus en PR → OC

**Jobs Automatizados**:
- Requiere configurar cron/BullMQ
- MVP: Admin puede ejecutar sync manual si necesario
- Full: Automatización completa

### ¿Qué SÍ es crítico para MVP?

✅ **Crear PRs**: Core del sistema
✅ **Aprobar**: Sin esto no hay flujo
✅ **Sincronizar a Softland**: Demostrar integración
✅ **Ver OCs**: Mostrar que la integración es bidireccional

---

## 🎬 Script de Demo MVP (Semana 2.5)

**Para mostrar al cliente:**

1. **Login** como usuario normal
2. **Crear Purchase Request**:
   - Descripción: "Compra de 10 notebooks Dell"
   - Monto estimado: $500,000
   - Fecha necesaria: 2025-12-15
   - Guardar → Status: DRAFT

3. **Enviar a aprobación**:
   - Clic en "Enviar a Aprobación"
   - Status cambia a PENDING

4. **Login** como admin/aprobador
5. **Aprobar PR**:
   - Ver lista de PRs pendientes
   - Clic en PR creado
   - Botón "Aprobar"
   - Status cambia a APPROVED

6. **Verificar sincronización**:
   - PR se copia automáticamente a sync table
   - Esperar 5 minutos (o ejecutar sync manual)
   - Mostrar PR en base de datos Softland

7. **Crear OC en Softland** (manual):
   - Usuario entra a Softland
   - Crea OC basada en el PR
   - Vincula número de PR

8. **Ver OC en Hub**:
   - Esperar 5 minutos (sync sube OC)
   - Refrescar lista de PRs
   - PR ahora muestra "OC Creada: OC-2025-789"
   - Status: PO_CREATED

**🎉 FIN DEMO MVP** - Flujo completo demostrado en ~10 minutos

---

**Documento actualizado**: 2025-11-29
**Versión**: 2.0 (con MVP/Full)
