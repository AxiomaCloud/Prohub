# 🗓️ Roadmap Final - Circuitos de Compras (Estrategia FULL)

**Proyecto**: Hub - Sistema de Gestión de Compras
**Versión**: 2.1 (Ajustado con decisiones de negocio)
**Fecha**: 30 Noviembre 2025
**Estrategia**: ✅ FULL - 17 semanas

---

## 📊 Resumen Ejecutivo

### Decisiones de Negocio Aplicadas

| Decisión | Impacto |
|----------|---------|
| ❌ Sin retenciones (ERP las calcula) | -28h |
| ❌ OCs se generan en ERP, no Hub | -12h |
| ❌ Sin cancelaciones parciales | -6h |
| ✅ Delegación de aprobaciones | +12h |
| ✅ Auto-registro de proveedores | +16h |
| ✅ Aprobación en cadena | +8h |
| **Balance** | **-10h** |

### Métricas Finales

| Métrica | Valor |
|---------|-------|
| **Duración Total** | 17 semanas |
| **Horas Estimadas** | ~660h |
| **Circuitos** | 6 |
| **Modelos de Datos** | 23 (eliminados 2 de retenciones) |
| **Formularios UI** | 16 |
| **Endpoints API** | 45 |

---

## 📅 Cronograma de 17 Semanas

```
FASE 1: FUNDACIÓN (Semanas 1-3)
├── Semana 1: Setup y modelos core
├── Semana 2: Auth, roles, permisos + delegación
└── Semana 3: Componentes UI base

FASE 2: CIRCUITO 1 - REQUERIMIENTOS (Semanas 4-5)
├── Semana 4: Backend requerimientos + aprobación en cadena
└── Semana 5: Frontend requerimientos

FASE 3: CIRCUITOS 2-4 - COTIZACIONES Y OCs (Semanas 6-9)
├── Semana 6: Backend cotizaciones
├── Semana 7: Backend OCs (recepción desde ERP)
├── Semana 8: Frontend cotizaciones
└── Semana 9: Frontend OCs

FASE 4: CIRCUITOS 5-6 - FACTURAS Y PAGOS (Semanas 10-11)
├── Semana 10: Backend facturas (sin retenciones) + conformes
└── Semana 11: Frontend facturas y pagos (visualización)

FASE 5: PORTAL PROVEEDOR (Semanas 12-14)
├── Semana 12: Backend portal + auto-registro
├── Semana 13: Frontend portal proveedor
└── Semana 14: Flujos de carga de factura y OC

FASE 6: INTEGRACIÓN ERP (Semanas 15-16)
├── Semana 15: Sync outbound (req, recepciones, facturas)
└── Semana 16: Sync inbound (OCs, estados, pagos)

FASE 7: TESTING Y DEPLOY (Semana 17)
└── Semana 17: QA, fixes y deploy
```

---

## 📅 FASE 1: FUNDACIÓN (3 semanas)

### Semana 1: Setup y Modelos Core

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 1.1 | Configurar estructura de carpetas módulo compras | 2h | `/src/app/(compras)/` |
| 1.2 | Crear enums en Prisma | 2h | Todos los enums definidos |
| 1.3 | Crear modelo Tenant y ConfiguracionTenant | 3h | Migración ejecutada |
| 1.4 | Crear modelo CentroCostos | 2h | Migración ejecutada |
| 1.5 | Crear modelo NivelAprobacion (con config por tenant) | 3h | Migración ejecutada |
| 1.6 | Crear modelo DelegacionAprobacion | 2h | Migración ejecutada |
| 1.7 | Crear modelo Proveedor (con auto-registro) | 4h | Migración ejecutada |
| 1.8 | Crear modelo UsuarioProveedor | 2h | Migración ejecutada |
| 1.9 | Crear modelo Adjunto (polimórfico) | 2h | Migración ejecutada |
| 1.10 | Crear modelo AuditLog | 1h | Migración ejecutada |
| 1.11 | Crear schemas Zod de validación | 4h | Validaciones listas |
| 1.12 | Crear tipos TypeScript compartidos | 3h | `/src/types/compras.ts` |

**Total Semana 1: ~30h**

### Semana 2: Auth, Roles y Permisos

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 2.1 | Definir matriz de permisos (7 roles) | 3h | Documento de permisos |
| 2.2 | Crear middleware de autorización | 4h | `authMiddleware.ts` |
| 2.3 | Crear helper `checkPermission()` | 2h | Helper funcionando |
| 2.4 | Crear helper `requireRole()` | 2h | Helper funcionando |
| 2.5 | Implementar sistema de delegación | 6h | Delegación funcionando |
| 2.6 | API CRUD delegaciones | 4h | Endpoints listos |
| 2.7 | Extender AuthContext para compras | 3h | Context actualizado |
| 2.8 | Crear ComprasContext | 4h | Estado global módulo |
| 2.9 | Crear hooks (`usePermisos`, `useRol`, `useDelegacion`) | 4h | Hooks listos |
| 2.10 | Tests unitarios de permisos | 4h | Tests pasando |

**Total Semana 2: ~36h**

### Semana 3: Componentes UI Base

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 3.1 | Crear `EstadoBadge` (colores por estado) | 2h | Componente listo |
| 3.2 | Crear `PrioridadBadge` | 1h | Componente listo |
| 3.3 | Crear `MontoDisplay` (formato moneda) | 2h | Componente listo |
| 3.4 | Crear `FileUpload` (drag & drop) | 4h | Componente listo |
| 3.5 | Crear `FileList` (lista adjuntos) | 2h | Componente listo |
| 3.6 | Crear `Timeline` (historial eventos) | 4h | Componente listo |
| 3.7 | Crear `AprobacionCard` | 3h | Componente listo |
| 3.8 | Crear `DelegacionBanner` | 2h | Componente listo |
| 3.9 | Crear layout módulo Compras | 3h | Layout listo |
| 3.10 | Crear sidebar menú compras | 3h | Navegación lista |
| 3.11 | Crear `DataTable` genérico | 4h | Tabla reutilizable |
| 3.12 | Crear `PageHeader` y breadcrumbs | 2h | Headers listos |

**Total Semana 3: ~32h**

---

## 📅 FASE 2: CIRCUITO 1 - REQUERIMIENTOS (2 semanas)

### Semana 4: Backend Requerimientos

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 4.1 | Crear modelo Requerimiento | 3h | Migración ejecutada |
| 4.2 | Crear modelo RequerimientoItem | 2h | Migración ejecutada |
| 4.3 | Crear modelo RevisionTecnica | 2h | Migración ejecutada |
| 4.4 | Crear modelo Aprobacion (soporta cadena) | 3h | Migración ejecutada |
| 4.5 | Servicio de numeración automática | 2h | `REQ-2025-XXXXX` |
| 4.6 | GET /api/v1/requerimientos | 3h | Endpoint listo |
| 4.7 | POST /api/v1/requerimientos | 3h | Endpoint listo |
| 4.8 | GET /api/v1/requerimientos/:id | 2h | Endpoint listo |
| 4.9 | PATCH /api/v1/requerimientos/:id | 2h | Endpoint listo |
| 4.10 | POST /api/v1/requerimientos/:id/enviar | 2h | Endpoint listo |
| 4.11 | POST /api/v1/requerimientos/:id/revision-tecnica | 3h | Endpoint listo |
| 4.12 | Lógica de aprobación en cadena | 4h | Múltiples aprobadores |
| 4.13 | POST /api/v1/requerimientos/:id/aprobar | 3h | Endpoint listo |
| 4.14 | POST /api/v1/requerimientos/:id/rechazar | 2h | Endpoint listo |

**Total Semana 4: ~36h**

### Semana 5: Frontend Requerimientos

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 5.1 | Pantalla lista de requerimientos | 4h | Pantalla lista |
| 5.2 | Formulario crear/editar requerimiento | 6h | Formulario listo |
| 5.3 | Componente items del requerimiento | 4h | Tabla editable |
| 5.4 | Pantalla detalle de requerimiento | 4h | Detalle listo |
| 5.5 | Componente timeline de estados | 3h | Timeline listo |
| 5.6 | Modal de revisión técnica | 3h | Modal listo |
| 5.7 | Modal de aprobación (muestra delegación si aplica) | 4h | Modal listo |
| 5.8 | Panel "Mis aprobaciones pendientes" | 4h | Panel listo |
| 5.9 | Configuración de delegación (UI) | 3h | UI delegación |
| 5.10 | Tests E2E circuito 1 | 4h | Tests pasando |

**Total Semana 5: ~39h**

---

## 📅 FASE 3: CIRCUITOS 2-4 - COTIZACIONES Y OCs (4 semanas)

### Semana 6: Backend Cotizaciones

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 6.1 | Crear modelo SolicitudCotizacion | 3h | Migración ejecutada |
| 6.2 | Crear modelo SolicitudCotizacionItem | 2h | Migración ejecutada |
| 6.3 | Crear modelo ProveedorInvitado | 2h | Migración ejecutada |
| 6.4 | Crear modelo Cotizacion | 3h | Migración ejecutada |
| 6.5 | Crear modelo CotizacionItem | 2h | Migración ejecutada |
| 6.6 | CRUD solicitudes de cotización | 4h | Endpoints listos |
| 6.7 | POST /solicitudes/:id/publicar | 2h | Endpoint listo |
| 6.8 | POST /solicitudes/:id/invitar-proveedores | 3h | Endpoint listo |
| 6.9 | API para proveedores (ver solicitudes) | 3h | Endpoint listo |
| 6.10 | POST /cotizaciones (enviar cotización) | 3h | Endpoint listo |
| 6.11 | GET /solicitudes/:id/cotizaciones | 2h | Endpoint listo |
| 6.12 | POST /solicitudes/:id/adjudicar | 3h | Endpoint listo |
| 6.13 | Servicio de notificaciones a proveedores | 3h | Notificaciones |

**Total Semana 6: ~35h**

### Semana 7: Backend OCs (Recibidas desde ERP)

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 7.1 | Crear modelo OrdenCompra (origen ERP) | 3h | Migración ejecutada |
| 7.2 | Crear modelo OrdenCompraItem | 2h | Migración ejecutada |
| 7.3 | GET /api/v1/ordenes-compra | 3h | Endpoint listo |
| 7.4 | GET /api/v1/ordenes-compra/:id | 2h | Endpoint listo |
| 7.5 | POST /ordenes-compra/:id/aceptar (proveedor) | 3h | Endpoint listo |
| 7.6 | POST /ordenes-compra/:id/rechazar (proveedor) | 3h | Sync con ERP |
| 7.7 | Endpoint para recibir OCs desde ERP | 4h | Inbound sync |
| 7.8 | Lógica de actualización de estados desde ERP | 4h | Sync estados |
| 7.9 | Crear modelo ConformeEntrega | 3h | Migración ejecutada |
| 7.10 | Crear modelo ConformeEntregaItem | 2h | Migración ejecutada |
| 7.11 | CRUD conformes de entrega | 4h | Endpoints listos |
| 7.12 | Lógica de recepción parcial/total | 3h | Validaciones |

**Total Semana 7: ~36h**

### Semana 8: Frontend Cotizaciones

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 8.1 | Pantalla lista solicitudes de cotización | 4h | Pantalla lista |
| 8.2 | Formulario crear solicitud de cotización | 6h | Formulario listo |
| 8.3 | Selector de proveedores a invitar | 3h | Selector listo |
| 8.4 | Pantalla ver cotizaciones recibidas | 4h | Pantalla lista |
| 8.5 | Componente comparativo de cotizaciones | 6h | Comparativo listo |
| 8.6 | Modal evaluación técnica | 3h | Modal listo |
| 8.7 | Modal adjudicación | 3h | Modal listo |
| 8.8 | Notificaciones del proceso | 2h | Notificaciones |
| 8.9 | Tests E2E cotizaciones | 4h | Tests pasando |

**Total Semana 8: ~35h**

### Semana 9: Frontend OCs y Conformes

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 9.1 | Pantalla lista de OCs | 4h | Pantalla lista |
| 9.2 | Pantalla detalle de OC | 4h | Detalle listo |
| 9.3 | Vista OC para proveedor | 4h | Vista proveedor |
| 9.4 | Modal aceptar/rechazar OC | 3h | Modal listo |
| 9.5 | Generador de PDF de OC | 4h | PDF listo |
| 9.6 | Pantalla lista de conformes | 3h | Pantalla lista |
| 9.7 | Formulario crear conforme | 5h | Formulario listo |
| 9.8 | Componente items recibidos | 3h | Componente listo |
| 9.9 | Tests E2E OCs y conformes | 4h | Tests pasando |

**Total Semana 9: ~34h**

---

## 📅 FASE 4: CIRCUITOS 5-6 - FACTURAS Y PAGOS (2 semanas)

### Semana 10: Backend Facturas (Sin Retenciones)

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 10.1 | Crear modelo Factura (simplificado, sin retenciones) | 3h | Migración ejecutada |
| 10.2 | GET /api/v1/facturas | 3h | Endpoint listo |
| 10.3 | POST /api/v1/facturas (con Parse) | 4h | Integración Parse |
| 10.4 | GET /api/v1/facturas/:id | 2h | Endpoint listo |
| 10.5 | POST /facturas/:id/asociar-oc | 3h | Endpoint listo |
| 10.6 | Validación factura vs OC (sin tripartita compleja) | 3h | Validación básica |
| 10.7 | Crear modelo OrdenPago (solo visualización) | 2h | Migración ejecutada |
| 10.8 | GET /api/v1/ordenes-pago | 2h | Endpoint listo |
| 10.9 | Endpoint recibir pagos desde ERP | 4h | Inbound sync |
| 10.10 | Servicio de notificación de estado | 3h | Notificaciones |

**Total Semana 10: ~29h**

### Semana 11: Frontend Facturas y Pagos

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 11.1 | Pantalla lista de facturas | 4h | Pantalla lista |
| 11.2 | Formulario cargar factura (con Parse) | 5h | Integración Parse |
| 11.3 | Modal asociar factura a OC | 3h | Modal listo |
| 11.4 | Pantalla detalle de factura | 4h | Detalle listo |
| 11.5 | Pantalla lista de pagos | 3h | Pantalla lista |
| 11.6 | Pantalla detalle de pago | 3h | Detalle listo |
| 11.7 | Visualizador de estado ERP | 2h | Estado sincronizado |
| 11.8 | Tests E2E facturas y pagos | 4h | Tests pasando |

**Total Semana 11: ~28h**

---

## 📅 FASE 5: PORTAL PROVEEDOR (3 semanas)

### Semana 12: Backend Portal + Auto-registro

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 12.1 | Autenticación separada para proveedores | 4h | Auth proveedor |
| 12.2 | Flujo de auto-registro | 6h | Registro completo |
| 12.3 | API aprobar/rechazar proveedor (tenant) | 3h | Endpoint listo |
| 12.4 | CRUD usuarios del proveedor | 4h | Endpoints listos |
| 12.5 | API habilitar/deshabilitar usuario (tenant) | 2h | Endpoint listo |
| 12.6 | Middleware permisos proveedor | 3h | Middleware listo |
| 12.7 | GET /portal/solicitudes-cotizacion | 3h | Endpoint listo |
| 12.8 | POST /portal/cotizaciones | 3h | Endpoint listo |
| 12.9 | GET /portal/ordenes-compra | 3h | Endpoint listo |
| 12.10 | POST /portal/ordenes-compra/:id/aceptar | 2h | Endpoint listo |

**Total Semana 12: ~33h**

### Semana 13: Frontend Portal Proveedor (Parte 1)

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 13.1 | Layout y navegación portal proveedor | 4h | Layout listo |
| 13.2 | Pantalla de auto-registro | 6h | Formulario completo |
| 13.3 | Dashboard proveedor | 4h | Dashboard listo |
| 13.4 | Pantalla solicitudes de cotización recibidas | 4h | Pantalla lista |
| 13.5 | Formulario enviar cotización | 5h | Formulario listo |
| 13.6 | Pantalla mis cotizaciones | 3h | Pantalla lista |
| 13.7 | Gestión de usuarios (proveedor) | 4h | CRUD usuarios |

**Total Semana 13: ~30h**

### Semana 14: Frontend Portal Proveedor (Parte 2)

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 14.1 | Pantalla mis órdenes de compra | 4h | Pantalla lista |
| 14.2 | Modal aceptar/rechazar OC | 3h | Modal listo |
| 14.3 | Pantalla mis facturas | 4h | Pantalla lista |
| 14.4 | Formulario cargar factura (proveedor) | 5h | Con Parse |
| 14.5 | Pantalla mis pagos | 3h | Pantalla lista |
| 14.6 | Panel de documentación (estado registro) | 3h | Panel listo |
| 14.7 | Admin: Lista proveedores pendientes | 3h | Pantalla admin |
| 14.8 | Admin: Aprobar/rechazar proveedor | 3h | Flujo admin |
| 14.9 | Tests E2E portal proveedor | 5h | Tests pasando |

**Total Semana 14: ~33h**

---

## 📅 FASE 6: INTEGRACIÓN ERP (2 semanas)

### Semana 15: Sync Outbound (Hub → ERP)

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 15.1 | Modelos Prisma tablas sync outbound | 3h | Migraciones |
| 15.2 | Servicio sync requerimientos aprobados | 4h | Sync funcionando |
| 15.3 | Servicio sync recepciones confirmadas | 4h | Sync funcionando |
| 15.4 | Servicio sync facturas cargadas | 4h | Sync funcionando |
| 15.5 | Servicio sync rechazo de OC | 3h | Sync funcionando |
| 15.6 | Job de sincronización (cron) | 4h | Job programado |
| 15.7 | Manejo de errores y reintentos | 4h | Retry logic |
| 15.8 | Logs de sincronización | 3h | Logs guardados |

**Total Semana 15: ~29h**

### Semana 16: Sync Inbound (ERP → Hub)

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 16.1 | Modelos Prisma tablas sync inbound | 3h | Migraciones |
| 16.2 | Endpoint recibir OCs desde ERP | 4h | Endpoint listo |
| 16.3 | Procesador de OCs entrantes | 4h | Procesador listo |
| 16.4 | Endpoint recibir estados desde ERP | 3h | Endpoint listo |
| 16.5 | Endpoint recibir pagos desde ERP | 3h | Endpoint listo |
| 16.6 | Pantalla configuración sync | 4h | UI configuración |
| 16.7 | Pantalla logs de sincronización | 3h | UI logs |
| 16.8 | Dashboard estado de sync | 3h | Dashboard |
| 16.9 | Tests de integración | 5h | Tests pasando |

**Total Semana 16: ~32h**

---

## 📅 FASE 7: TESTING Y DEPLOY (1 semana)

### Semana 17: QA y Deploy

| # | Tarea | Tiempo | Entregable |
|---|-------|--------|------------|
| 17.1 | Tests unitarios servicios | 6h | Cobertura >80% |
| 17.2 | Tests integración APIs | 6h | Tests pasando |
| 17.3 | Tests E2E flujos completos | 8h | Flujos validados |
| 17.4 | Corrección de bugs | 8h | Bugs resueltos |
| 17.5 | Deploy a staging | 3h | Staging up |
| 17.6 | Pruebas UAT | 4h | UAT aprobado |
| 17.7 | Deploy a producción | 3h | Producción up |
| 17.8 | Documentación de usuario | 4h | Docs listos |

**Total Semana 17: ~42h**

---

## 📊 Resumen por Fase

| Fase | Semanas | Horas | % del Total |
|------|---------|-------|-------------|
| 1. Fundación | 1-3 | 98h | 15% |
| 2. Circuito 1 | 4-5 | 75h | 11% |
| 3. Circuitos 2-4 | 6-9 | 140h | 21% |
| 4. Circuitos 5-6 | 10-11 | 57h | 9% |
| 5. Portal Proveedor | 12-14 | 96h | 15% |
| 6. Integración ERP | 15-16 | 61h | 9% |
| 7. Testing/Deploy | 17 | 42h | 6% |
| **Buffer (10%)** | - | ~67h | 10% |
| **TOTAL** | **17** | **~660h** | 100% |

---

## 📋 Hitos del Proyecto

| Hito | Semana | Entregable |
|------|--------|------------|
| **M1** | 3 | Fundación completa, modelos listos |
| **M2** | 5 | Circuito 1 (Requerimientos) funcionando |
| **M3** | 9 | Circuitos 2-4 funcionando |
| **M4** | 11 | Circuitos 5-6 funcionando |
| **M5** | 14 | Portal Proveedor completo |
| **M6** | 16 | Integración ERP completa |
| **M7** | 17 | Sistema en producción |

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Integración ERP diferente a esperado | Media | Alto | Validar estructura en semana 1 |
| Auto-registro complejo | Media | Medio | Definir campos mínimos requeridos |
| Delegación de aprobaciones edge cases | Media | Medio | Definir reglas claras antes de codificar |
| Parse no extrae bien facturas | Baja | Alto | Ya está funcionando, validar casos edge |

---

## ✅ Checklist Pre-Desarrollo

Antes de iniciar la Semana 1:

- [ ] Confirmar acceso a base de datos PostgreSQL
- [ ] Confirmar acceso a Parse (API keys)
- [ ] Definir campos requeridos para auto-registro de proveedor
- [ ] Definir estructura exacta de tablas sync con ERP
- [ ] Validar permisos y roles con stakeholders
- [ ] Configurar ambiente de desarrollo

---

**Documento creado**: 30 Noviembre 2025
**Estrategia**: FULL - 17 semanas
**Estado**: ✅ Listo para iniciar desarrollo

---

## 🔐 SISTEMA DE PERMISOS GRANULARES (Nueva Feature)

**Fecha agregado**: 11 Diciembre 2025
**Estado**: 📋 Planificado

### Contexto

El sistema actual de menú basado en roles (`allowedRoles` en `MenuItem`) controla el **acceso** a las páginas.
Ahora se necesita controlar **qué puede hacer** el usuario dentro de cada página (ver vs editar vs eliminar).

### Estrategia: Switch "Solo Lectura" por Rol/Opción de Menú

En lugar de crear permisos individuales (view, edit, delete) por cada recurso, se propone:

1. **Agregar campo `readOnly: boolean` a la relación rol-menú**
   - Si `readOnly = true`: El usuario puede ver pero NO puede crear/editar/eliminar
   - Si `readOnly = false`: El usuario tiene acceso completo

2. **Nuevo modelo en Prisma**:
   ```prisma
   model MenuItemRolePermission {
     id          String   @id @default(cuid())
     menuItemId  String
     menuItem    MenuItem @relation(fields: [menuItemId], references: [id])
     role        Role
     readOnly    Boolean  @default(false)

     @@unique([menuItemId, role])
   }
   ```

3. **Componentes Wrapper en Frontend**:
   - `ProtectedButton`: Oculta botones de acción si el usuario tiene `readOnly`
   - `ProtectedModal`: Deshabilita formularios de edición
   - `ProtectedDeleteAction`: Oculta opciones de eliminar

4. **API Backend**:
   - Nuevo endpoint: `GET /api/menu/permissions/:menuItemId`
   - Modificar endpoint de menú para incluir `readOnly` por item
   - Middleware que valida `readOnly` antes de operaciones de escritura

### UI de Configuración

En el panel de administración de permisos por rol (ya existente), agregar:
- Switch adicional "Solo Lectura" junto al switch de acceso
- Cuando acceso está activo, mostrar el switch de Solo Lectura
- Tooltip explicativo: "Si está activado, el usuario solo puede ver pero no modificar"

### Implementación Estimada

| Tarea | Horas |
|-------|-------|
| Modelo Prisma y migración | 2h |
| API Backend (endpoints + middleware) | 4h |
| Componentes ProtectedButton/Modal/Delete | 4h |
| UI de configuración en admin | 3h |
| Integración en páginas existentes | 6h |
| Testing | 3h |
| **Total** | **22h** |

### Prioridad

Media - Implementar después de estabilizar el sistema de menú actual.
