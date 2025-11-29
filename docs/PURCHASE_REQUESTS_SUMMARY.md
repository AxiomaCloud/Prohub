# 📚 Resumen Completo: Módulo Purchase Requests

**Fecha**: 2025-11-29
**Estado**: ✅ Documentación completa - Listo para decisión

---

## 🎯 Objetivo del Módulo

Sistema completo de **gestión de requerimientos de compra** con:
- Workflow de aprobación multinivel
- Integración bidireccional con ERP Softland
- Recepciones de mercadería (parcial/total)
- Notificaciones en tiempo real
- 7 puntos de integración con IA

---

## 📄 Documentos Generados (9 documentos)

### 1. **PURCHASE_REQUESTS_MODULE.md** (60 KB)
**Especificaciones Técnicas Completas**

✅ Schema de BD (11 modelos Prisma)
✅ Workflow 9 estados + aprobaciones multinivel por monto
✅ 30+ endpoints API REST
✅ Flujo end-to-end completo
✅ **7 puntos de integración IA**:
  1. Asistente creación PR (autocompletado, estimaciones)
  2. Detección duplicados + validación presupuesto
  3. Scoring de aprobación (riesgo, precio)
  4. Matching automático OC ↔ PR
  5. OCR de remitos (autocompletar recepción)
  6. Analytics predictivos
  7. Chatbot asistencia

**Roadmap**: 14-20 semanas (full implementation)

---

### 2. **INTEGRATION_PARSE_ARCHITECTURE.md** (45 KB)
**Arquitectura Reutilizable de Parse**

✅ Sistema de API Keys de Parse (copiar código)
✅ Middleware autenticación + encriptación AES-256
✅ Sincronización bidireccional SQL
✅ Servicios de integración ERP
✅ Jobs BullMQ
✅ Código JavaScript reutilizable

**Roadmap**: 6-8 semanas (solo integración ERP)

---

### 3. **SIMPLIFIED_ARCHITECTURE.md** (35 KB)
**Arquitectura sin Jobs ni Parse** (DESCARTADA)

- Triggers PostgreSQL
- Sin jobs de sincronización
- Parse sincroniza en background
- Hub solo lee/escribe PostgreSQL

**Status**: Descartada por complejidad triggers

---

### 4. **WEBHOOK_INTEGRATION.md** (40 KB)
**Integración Parse ↔ Hub via Webhooks**

✅ Webhooks Parse → Hub (eventos)
✅ API calls Hub → Parse (acciones)
✅ Código TypeScript listo
✅ Validación HMAC SHA-256
✅ Sistema de reintentos

**Opción**: Si usas Parse como gateway

---

### 5. **FINAL_ARCHITECTURE.md** (30 KB)
**Arquitectura con Parse como Gateway** (Opción A)

```
Hub ← Webhooks → Parse ← SQL → Softland
```

✅ Parse ya tiene API Connectors
✅ Hub solo CRUD PostgreSQL
✅ Webhooks para eventos
✅ Notificaciones tiempo real

**Roadmap**: 5 semanas
**Complejidad**: Media
**Dependencias**: Parse + Hub

---

### 6. **FINAL_ARCHITECTURE_WITH_SYNC_CLIENT.md** ⭐ (50 KB)
**Arquitectura con Sync-Client Standalone + Parse** (Opción B - RECOMENDADA)

```
Softland SQL ← Sync-Client.exe → Parse → PostgreSQL (sync tables) ← Hub
```

✅ **Más simple para Hub** (solo lee/escribe sync tables)
✅ **Reutiliza** sync-client existente (ya probado en Parse)
✅ **Parse maneja** toda la sincronización (endpoints, auth, config)
✅ **Más seguro** (credenciales en cliente, Parse las encripta)
✅ **ETL personalizable** con SQL (configurado en Parse)
✅ **Logs completos** local + Parse

**Roadmap**: 5 semanas (incluyendo coordinación Parse)
**Complejidad Hub**: Baja (solo queries PostgreSQL)
**Dependencias**: Hub + Parse (Parse hace el trabajo pesado)

---

### 7. **SYNC_CLIENT_INTEGRATION.md** ⭐ (40 KB) **NUEVO - ARQUITECTURA**
**Descripción de arquitectura de sincronización**

**IMPORTANTE**: Este documento describe la arquitectura, pero aclara que:
- Parse (NO Hub) tiene los endpoints /api/sync/*
- Parse (NO Hub) maneja autenticación del sync-client
- Parse (NO Hub) tiene los modelos de configuración
- Hub SOLO lee/escribe tablas sync.* directamente

✅ **Diagramas** de arquitectura correcta
✅ **Flujo completo** PR → OC → Recepción (paso a paso)
✅ **Checklist** de lo que Hub SÍ debe implementar vs lo que NO

**Roadmap**: Incluido en las 5 semanas (coordinación con Parse)
**Nivel**: Arquitectura de referencia

---

### 8. **ROADMAP_PURCHASE_REQUESTS.md** ⭐ (80 KB) **NUEVO - PLAN DE TRABAJO**
**Roadmap de implementación con tareas tildables**

✅ **Estrategia MVP + Full**: 2.5 semanas MVP + 2.5 semanas Full
✅ **50+ tareas específicas** con checkboxes para tildar
✅ **Código de ejemplo** incluido en cada tarea
✅ **Criterios de aceptación** claros y medibles
✅ **Estimaciones de tiempo** por tarea
✅ **Script de demo MVP** para mostrar al cliente
✅ **Decisiones de scope** (qué va en MVP vs Full)
✅ **Roles y responsabilidades** definidos
✅ **Riesgos y mitigaciones** identificados
✅ **Métricas de éxito** técnicas y de negocio

**MVP**: 2.5 semanas - Demo funcional básico
**Full**: 2.5 semanas adicionales - Production ready
**Roadmap**: Ejecución inmediata
**Nivel**: Plan de trabajo operativo

---

### 9. **INDEX.md** (actualizado)
**Índice de documentación**

Índice general actualizado con todos los documentos del módulo Purchase Requests.

---

## 🆚 Comparación de Opciones

| Aspecto | Opción A: Parse Gateway (webhooks) | Opción B: Sync-Client + Parse ⭐ |
|---------|-------------------------------------|----------------------------------|
| **Arquitectura** | Hub ← webhooks → Parse ← SQL → Softland | Hub ← PostgreSQL → Parse ← Sync-Client ← Softland |
| **Componentes** | Hub + Parse (webhooks + API) | Hub + Parse + Sync-Client (.exe) |
| **Complejidad Hub** | Media (endpoints webhook) | Baja (solo queries PostgreSQL) |
| **Latencia** | Inmediata (webhooks) | 1-5 min (polling/sync) |
| **Dependencias Hub** | Parse webhooks | PostgreSQL compartido |
| **Seguridad Credenciales** | En Parse cloud | En Parse + cliente local |
| **ETL Customización** | Limited (JSON config) | Total (SQL queries) |
| **Debugging** | Logs en 3 lugares | Logs en 3 lugares |
| **Escalabilidad** | Parse maneja N clientes | 1 .exe por cliente |
| **Mantenimiento Hub** | Endpoints webhook | Queries PostgreSQL |
| **Mantenimiento Parse** | Webhooks | Endpoints /api/sync/* |
| **Roadmap** | 5 semanas | 5 semanas |
| **Código Reutilizable** | Webhooks + API client | Sync-client + endpoints (Parse) |

---

## 💡 Recomendación

### ⭐ **Opción B: Sync-Client + Parse**

**Por qué:**
1. ✅ **Más simple para Hub**: Solo lee/escribe tablas sync en PostgreSQL
2. ✅ **Parse ya lo tiene**: Endpoints /api/sync/* ya existen en Parse
3. ✅ **Más seguro**: Credenciales Softland encriptadas en Parse + cliente
4. ✅ **Código existente**: Sync-client ya está probado en producción
5. ✅ **Flexible**: ETL con SQL personalizable (configurado en Parse)
6. ✅ **Sin webhooks**: Hub no necesita implementar endpoints especiales

**Cuándo usar Opción A (Webhooks Parse):**
- Necesitas notificaciones en tiempo real inmediatas (< 1 min)
- Prefieres event-driven architecture
- Hub debe reaccionar instantáneamente a cambios en Parse

**Con Opción B:**
- Hub hace polling cada 1-5 min (suficiente para mayoría de casos)
- Parse hace toda la sincronización pesada
- Hub solo hace CRUD PostgreSQL

---

## 🚀 Roadmap de Implementación

### Con Sync-Client (Opción B - Recomendada)

#### **Fase 1: Setup Tablas Sync** (1 semana)
- Crear schema `sync` en PostgreSQL
- Tablas: requerimientos_compra_sync, ordenes_compra_sync, recepciones_sync
- Endpoints: /api/sync/upload, /api/sync/download
- Generar API key para sync-client

#### **Fase 2: Configurar Sync-Client** (1 semana)
- Compilar hub-sync-client.exe
- Configurar sync_configurations en PostgreSQL
- Instalar en servidor Softland (Windows)
- Test sincronización manual
- Programar Task Scheduler (cada 5 min)

#### **Fase 3: Integrar con Hub** (2 semanas)
- Handler /api/sync/upload procesa OCs
- Service escribe PRs en tabla sync
- Sistema de notificaciones
- Logs de sincronización
- UI para ver estado sync

#### **Fase 4: Testing E2E** (1 semana)
- Test: Crear PR → Aprobar → Softland
- Test: OC en Softland → Hub → Notificación
- Test: Recepción → Softland → Inventario
- Validar logs y errores
- Performance testing

**Total: 5 semanas**

---

## 📊 Características del Módulo

### Estados de Purchase Request

1. **DRAFT** - Borrador
2. **PENDING** - Esperando primera aprobación
3. **IN_APPROVAL** - En proceso de aprobación
4. **APPROVED** - Aprobado, listo para ERP
5. **SENT_TO_ERP** - Sincronizado a Softland (via sync-client)
6. **PO_CREATED** - OC creada en Softland
7. **PARTIALLY_RECEIVED** - Recepción parcial
8. **RECEIVED** - Completamente recibido
9. **REJECTED** - Rechazado
10. **CANCELLED** - Cancelado

### Workflow de Aprobación

**Por Monto** (configurable):
- $0 - $10,000: Supervisor
- $10,001 - $50,000: Supervisor + Gerente
- $50,001+: Supervisor + Gerente + Director

**Acciones**:
- ✅ Aprobar
- ❌ Rechazar
- ✏️ Solicitar cambios

### Notificaciones

| Evento | Receptor | Canal | Prioridad |
|--------|----------|-------|-----------|
| PR creado | Creador | Portal | Normal |
| Requiere aprobación | Aprobador nivel N | Portal + Email | High |
| PR aprobado | Creador | Portal | Normal |
| PR rechazado | Creador | Portal + Email | High |
| OC creada | Creador | Portal + WebSocket | Normal |
| OC pendiente recepción | Almacén | Portal | Normal |
| OC vencida sin recepción | Almacén | Portal + Email | Urgent |
| Recepción completada | Creador | Portal | Normal |

---

## 🔧 Configuración Técnica

### Tablas Sync (PostgreSQL)

```sql
-- PRs que van a Softland
sync.requerimientos_compra_sync

-- OCs que vienen de Softland
sync.ordenes_compra_sync

-- Recepciones que van a Softland
sync.recepciones_sync
```

### Sync-Client Config (JSON en PostgreSQL)

```json
{
  "tablasSubida": [
    {
      "nombre": "ordenes_compra",
      "origen": "SoftlandDB.dbo.OrdenesCompra",
      "incremental": true,
      "campoFecha": "FechaModificacion",
      "destino": "sync.ordenes_compra_sync"
    }
  ],
  "tablasBajada": [
    {
      "nombre": "requerimientos_compra",
      "origen": "sync.requerimientos_compra_sync",
      "destino": "SoftlandDB.dbo.RequerimientosCompra",
      "incremental": true,
      "pre_process": { "sql": "..." },
      "post_process": { "sql": "MERGE ..." }
    }
  ]
}
```

### Instalación Sync-Client

```bash
# En servidor Windows Softland

# 1. Instalar
copy hub-sync-client.exe C:\sync\

# 2. Inicializar
hub-sync-client.exe init \
  --api-url https://hub-api.com \
  --api-key {generated-key} \
  --tenant-id tenant-abc

# 3. Test
hub-sync-client.exe sync --direction both

# 4. Programar (cada 5 min)
hub-sync-client.exe schedule --interval 5
```

---

## 🎨 Integraciones con IA

### 1. Asistente de Creación
- Autocompletado basado en PRs anteriores
- Estimación de cantidades y precios
- Categorización automática

### 2. Validación Inteligente
- Detección de duplicados
- Verificación de presupuesto
- Sugerencia de proveedores

### 3. Aprobación Asistida
- Scoring de riesgo (0-1)
- Análisis de precio vs mercado
- Historial de proveedor
- Recomendación: Aprobar/Rechazar

### 4. Matching Automático
- OC sin referencia exacta → PR por monto + descripción
- OCR de PDFs de OC
- Validación contra PR

### 5. OCR de Remitos
- Extrae datos del remito
- Autocompleta recepción
- Detecta discrepancias

### 6. Analytics
- Predicción de necesidades
- Optimización de compras
- Tendencias

### 7. Chatbot
- Consultas de estado
- Guía de uso
- Troubleshooting

---

## 📈 Métricas a Trackear

```typescript
{
  // Tiempos
  avgApprovalTime: 2.3,      // días
  avgTimeToERP: 0.5,         // horas
  avgTimeToReceive: 15,      // días

  // Tasas
  approvalRate: 0.87,        // 87% aprobados
  rejectionRate: 0.08,       // 8% rechazados
  partialReceptionRate: 0.34,// 34% recepciones parciales

  // Sync
  syncSuccessRate: 0.98,     // 98% syncs OK
  syncAvgTime: 1.2,          // segundos
  syncFailures: 3            // últimos 30 días
}
```

---

## 🔒 Seguridad

### Autenticación
- JWT para usuarios web
- API Keys para sync-client
- IP whitelist (opcional)
- Multi-tenant nativo

### Permisos por Rol
```
PROVIDER:         [] (no accede a PRs)
CLIENT_VIEWER:    [PR_VIEW_OWN, RECEPTION_VIEW]
CLIENT_APPROVER:  [PR_VIEW_ALL, PR_APPROVE_L1, PR_APPROVE_L2]
CLIENT_ADMIN:     [PR_*, RECEPTION_*, APPROVAL_LEVELS_MANAGE]
SUPER_ADMIN:      [*]
```

### Datos Sensibles
- Credenciales Softland: En cliente, encriptadas AES-256-GCM
- API Keys: UUID v4 no predecibles
- Logs: Sin passwords en texto plano

---

## ✅ Checklist Pre-Implementación

### Decisiones Pendientes

- [ ] **Opción de arquitectura**: A (Parse) o B (Sync-Client) ⭐
- [ ] **Niveles de aprobación**: ¿Cuántos? ¿Por monto, rol, departamento?
- [ ] **Integración IA**: ¿Cuáles implementar en MVP?
- [ ] **Notificaciones**: ¿Email? ¿WhatsApp? ¿Solo portal?

### Configuración Requerida

- [ ] Acceso a Softland SQL Server (host, port, DB, user, pass)
- [ ] Estructura de tablas Softland:
  - [ ] RequerimientosCompra
  - [ ] OrdenesCompra
  - [ ] Recepciones
- [ ] Servidor Windows para sync-client (si opción B)
- [ ] API keys y secrets
- [ ] Variables de entorno

---

## 📞 Próximos Pasos

1. **Revisar documentación completa**:
   - **PURCHASE_REQUESTS_SUMMARY.md** ⭐ (este documento - overview)
   - **PURCHASE_REQUESTS_MODULE.md** (especificaciones técnicas detalladas)
   - **FINAL_ARCHITECTURE_WITH_SYNC_CLIENT.md** (arquitectura recomendada)
   - **SYNC_CLIENT_INTEGRATION.md** ⭐ (guía de implementación paso a paso)
   - **ROADMAP_PURCHASE_REQUESTS.md** ⭐ (plan de trabajo con tareas)

2. **Decidir opción de arquitectura**:
   - Opción A: Parse Gateway
   - **Opción B: Sync-Client** ⭐ (recomendada)

3. **Confirmar configuración**:
   - Niveles de aprobación
   - Integraciones IA prioritarias
   - Estructura Softland
   - Acceso a SQL Server (host, port, DB, user, pass)

4. **Comenzar implementación** (seguir ROADMAP_PURCHASE_REQUESTS.md):

   **🚀 MVP (2.5 semanas) - Mostrable rápido:**
   - **Semana 1**: Infraestructura (Modelos Prisma + Endpoints Sync)
   - **Semana 2**: Sincronización (Sync-client instalado + funcionando)
   - **Semana 2.5**: CRUD PRs + Aprobación simple (1 nivel)
   - **🎉 DEMO MVP**: Flujo PR → Aprobar → Softland → OC manual

   **🏆 FULL (2.5 semanas) - Production ready:**
   - **Semana 3**: Aprobación multinivel + Jobs automáticos
   - **Semana 4**: Notificaciones + Recepciones
   - **Semana 5**: UI completa + Testing E2E + Deploy
   - **🚀 PRODUCCIÓN**: Sistema completo en cliente

   Cada tarea tiene:
   - [ ] Checkbox para tildar al completar
   - Código de ejemplo
   - Criterios de aceptación
   - Estimación de tiempo

---

**Total estimado: 5 semanas (2.5 MVP + 2.5 Full)**

**Estrategia recomendada**:
- Implementar MVP primero (2.5 semanas)
- Demo al cliente
- Si aprueba → continuar con Full (2.5 semanas)
- Si no → pivotar según feedback sin haber invertido 5 semanas completas

**Siguiente acción**: Decidir arquitectura y confirmar acceso a Softland

---

**Documento creado**: 2025-11-29
**Autor**: Hub Development Team
**Estado**: ✅ Listo para decisión e implementación
