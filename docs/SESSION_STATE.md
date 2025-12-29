# SESSION STATE - Hub Development

**Última actualización**: 29 Diciembre 2025
**Sesión**: Implementación Sync Hub-Parse-ERP

---

## RESUMEN DE SESIÓN ACTUAL

### Tema Principal
1. Implementación de infraestructura de sincronización genérica en Parse
2. Tablas sync_entity_config y sync_data con payload JSONB
3. API endpoints /api/sync-data para Hub

---

## CAMBIOS REALIZADOS

### 1. Integración Parse API para Parámetros Maestros

**Decisión**: Usar Parse como fuente de datos para parámetros maestros (sectores, categorías, etc.) en lugar de tablas locales en Hub.

**Endpoint Parse**: `GET /api/v1/parse/parametros/:tipoCampo`
- Para sectores: `tipoCampo = "sector"`
- Respuesta: `{ success: true, data: [{ id, codigo, nombre, ... }] }`

**Archivos modificados**:

| Archivo | Cambio |
|---------|--------|
| `backend/src/services/parseIntegration.ts` | Actualizado endpoint y función `getSectores()` |
| `backend/src/routes/parametros.ts` | Nuevo endpoint `GET /api/parametros/sectores` |
| `frontend/src/hooks/compras/useParametros.ts` | Hook `useSectores()` para consumir API |
| `backend/.env` | Actualizado `PARSE_API_KEY` |

**Configuración Parse**:
```env
PARSE_API_URL="https://parsedemo.axiomacloud.com/api/v1"
PARSE_API_KEY="sk_9b19c89be84653ebbd679c705dc7c7b33ceabd2f23350f6d948e702812bc43fe"
PARSE_TENANT_ID="grupolb"
```

**Datos de sectores en Parse**:
- COM - Compras
- PRO - Producción

### 2. Cambio de Category a Sector en Reglas de Aprobación

**Concepto**: El "sector" representa el departamento/área que solicita la compra. Matchea con el campo `centroCostos` del PurchaseRequest.

**Archivos modificados**:

| Archivo | Cambio |
|---------|--------|
| `backend/prisma/schema.prisma` | Campo `category` → `sector` en modelo `ApprovalRule` |
| `backend/src/services/approvalWorkflowService.ts` | Lógica de matching usa `sector` |
| `backend/src/routes/approvalRules.ts` | CRUD usa campo `sector` |
| `backend/src/services/ruleActionExecutor.ts` | Referencias actualizadas a `sector` |
| `frontend/src/app/admin/approval-rules/page.tsx` | UI usa `sector` con datos de Parse |

**Schema Prisma actualizado**:
```prisma
model ApprovalRule {
  // ...
  sector          String?           // Sector que compra (matchea con centroCostos del PR)
  // ...
}
```

**Lógica de matching** en `findApplicableRule()`:
```typescript
// Verificar sector si está especificado en la regla
if (rule.sector && rule.sector !== sector) {
  continue; // No aplica esta regla
}
```

**Flujo**:
1. Usuario crea requerimiento con `centroCostos = "COM"` (Compras)
2. Al enviar a aprobación, se busca regla con `sector = "COM"` (o sin sector = aplica a todos)
3. Si hay match de sector + monto + tipo compra → inicia workflow con esa regla

### 3. Ajuste UI Grilla de Requerimientos

**Cambio**: El nombre del solicitante ahora aparece debajo del título en vez de columna separada.

**Archivo**: `frontend/src/app/compras/requerimientos/page.tsx`

**Antes**:
```tsx
<td>Título</td>
<td>Solicitante</td>  <!-- Columna separada -->
```

**Después**:
```tsx
<td>
  <div>Título del Requerimiento</div>
  <div className="text-xs text-text-secondary">Nombre Solicitante</div>
</td>
```

**Beneficio**: Ahorra espacio horizontal en la tabla, especialmente útil en pantallas pequeñas.

---

## ARCHIVOS CLAVE MODIFICADOS

### Backend
```
backend/
├── .env                                  ← PARSE_API_KEY actualizado
├── prisma/schema.prisma                  ← sector en ApprovalRule
├── src/
│   ├── routes/
│   │   ├── parametros.ts                 ← GET /api/parametros/sectores
│   │   └── approvalRules.ts              ← CRUD con sector
│   └── services/
│       ├── parseIntegration.ts           ← getSectores()
│       ├── approvalWorkflowService.ts    ← Matching por sector
│       └── ruleActionExecutor.ts         ← Referencias a sector
```

### Frontend
```
frontend/src/
├── hooks/compras/useParametros.ts        ← useSectores() hook
├── app/
│   ├── admin/approval-rules/page.tsx     ← UI reglas con sector
│   └── compras/requerimientos/page.tsx   ← Solicitante bajo título
```

---

## ESTADO DE LA BASE DE DATOS

**Migración aplicada**: `npx prisma db push`
- Campo `category` renombrado a `sector` en tabla `approval_rules`

---

## ENDPOINTS NUEVOS/MODIFICADOS

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/parametros/sectores` | Obtiene sectores desde Parse API |

---

## PARA RETOMAR

Al iniciar nueva sesión, revisar:

1. Este archivo (`docs/SESSION_STATE.md`)
2. `docs/TODO_DESARROLLO.md` - Estado general del proyecto
3. `backend/src/services/parseIntegration.ts` - Integración con Parse
4. `backend/src/services/approvalWorkflowService.ts` - Lógica de matching por sector

---

## PLANES PENDIENTES

### 1. Unificar Aprobaciones
Existe un plan en `C:\Users\marti\.claude\plans\zazzy-chasing-scott.md` para:
- Unificar aprobaciones de Requerimientos y OCs en una sola página
- Agregar campo `autoApprove` a ApprovalRule
- Iniciar workflow automático al crear OC

**Estado**: Planificado, no implementado

### 2. Sincronización Hub - Parse - ERP

**Estado**: FASE 1 COMPLETADA

**Documentación**:
- Arquitectura: [`docs/SYNC_ARCHITECTURE.md`](./SYNC_ARCHITECTURE.md)
- Plan de implementación: [`docs/SYNC_IMPLEMENTATION_PLAN.md`](./SYNC_IMPLEMENTATION_PLAN.md)
- Implementación Parse: [`docs/SYNC_PARSE_IMPLEMENTATION.md`](./SYNC_PARSE_IMPLEMENTATION.md)

**Resumen**:
- Parse actúa como broker/intermediario
- ERP es dueño de: Proveedores, Productos, Sectores, Pagos
- Hub es dueño de: Requerimientos, OCs, Recepciones
- Parse es dueño de: Documentos (PDFs)

**Implementado en Parse** (29 Dic 2025):

| Archivo | Descripción |
|---------|-------------|
| `parse/backend/prisma/schema.prisma` | Modelos `sync_entity_config` y `sync_data` |
| `parse/backend/src/services/syncDataService.js` | Servicio de sincronización |
| `parse/backend/src/services/erpSyncProcessor.js` | Procesador que envía a SQL Server |
| `parse/backend/src/routes/syncData.js` | API endpoints |
| `parse/backend/src/routes/syncEntityConfig.js` | Admin de configuraciones |
| `parse/backend/src/index.js` | Registro de rutas |

**Implementado en Hub** (29 Dic 2025):

| Archivo | Descripción |
|---------|-------------|
| `backend/src/services/parseIntegration.ts` | Funciones `syncPurchaseOrderToERP()`, `pullFromParse()` |
| `backend/src/services/approvalWorkflowService.ts` | Integración al aprobar OC |

**Endpoints Parse (sync-data)**:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sync-data` | Hub envía datos (OC, Recepción) |
| POST | `/api/sync-data/batch` | Batch de registros |
| POST | `/api/sync-data/from-erp` | Parse recibe datos del ERP |
| POST | `/api/sync-data/process` | Procesar pendientes → ERP |
| GET | `/api/sync-data/pull/:entityType` | Hub consulta datos del ERP |
| GET | `/api/sync-data/pending` | Listar pendientes |
| GET | `/api/sync-data/stats` | Estadísticas |
| GET | `/api/sync-data/:entityType/:entityId/status` | Estado de sync |

**Endpoints Parse (sync-entity-config)**:

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/sync-entity-config` | Listar configs |
| POST | `/api/sync-entity-config` | Crear config |
| POST | `/api/sync-entity-config/seed-axioma` | Crear configs AXIOMA |

**Flujo Completo**:

```
HUB                         PARSE                        ERP
 │                            │                           │
 │ aprobar OC                 │                           │
 ├──► POST /sync-data ───────►│                           │
 │    {entityType,payload}    │                           │
 │                            │ POST /process             │
 │                            ├──► INSERT SQL ───────────►│
 │                            │                           │
 │                            │◄── SELECT SQL ────────────┤
 │                            │    (pagos, proveedores)   │
 │ GET /pull/PAYMENT          │                           │
 │◄───────────────────────────┤                           │
```

**Estado**: FASE 1 y 2 COMPLETADAS

---

**Documento actualizado por**: Claude Code
**Fecha**: 28 Diciembre 2025
