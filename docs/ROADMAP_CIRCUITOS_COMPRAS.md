# 🗓️ Roadmap de Implementación - Circuitos de Compras

**Proyecto**: Hub - Sistema de Gestión de Compras
**Versión**: 2.1
**Fecha**: 02 Diciembre 2025
**Estado**: 🚧 En Desarrollo (MVP Fase 2)

---

## 📊 Resumen Ejecutivo

### Alcance Total del Proyecto

| Métrica | Valor |
|---------|-------|
| **Circuitos** | 6 |
| **Modelos de Datos** | 25 |
| **Formularios UI** | 18+ |
| **Endpoints API** | 50+ |
| **Pantallas** | 25+ |
| **Roles de Usuario** | 7 |

### Estimación de Tiempo Total

| Fase | Duración | Descripción |
|------|----------|-------------|
| **Fase 1: Fundación** | 3 semanas | Setup, modelos, auth, UI base |
| **Fase 2: Circuito 1** | 2 semanas | Requerimientos y aprobaciones |
| **Fase 3: Circuitos 2-4** | 4 semanas | Cotizaciones y OCs |
| **Fase 4: Circuitos 5-6** | 3 semanas | Facturas y pagos |
| **Fase 5: Portal Proveedor** | 2 semanas | Interfaz proveedor |
| **Fase 6: Integración ERP** | 2 semanas | Sincronización Softland |
| **Fase 7: Testing y Deploy** | 2 semanas | QA y producción |
| **TOTAL** | **18 semanas** | ~4.5 meses |

### Alternativa: Estrategia MVP + Full

| Estrategia | Duración | Alcance |
|------------|----------|---------|
| **MVP** | 8 semanas | Circuitos 1 + 4 + 6 básico |
| **Full** | +10 semanas | Circuitos 2, 3, 5, Portal, ERP |

---

## ✅ ESTADO ACTUAL DE IMPLEMENTACIÓN (v1.2.0)

### Circuito 1: Requerimientos ✅ COMPLETADO
- ✅ Modelo PurchaseRequest y PurchaseRequestItem
- ✅ CRUD completo de requerimientos
- ✅ Sistema de aprobación multinivel
- ✅ Estados: BORRADOR → EN_REVISION → APROBADO/RECHAZADO → OC_GENERADA → RECIBIDO
- ✅ Vista lista con filtros y búsqueda
- ✅ Modal de creación/edición con items
- ✅ Vista Kanban con drag & drop
- ✅ Indicador de progreso OC (% items cubiertos)
- ✅ Soporte para múltiples OCs por requerimiento

### Circuito 4: Órdenes de Compra ✅ COMPLETADO
- ✅ Modelo PurchaseOrder y PurchaseOrderItem
- ✅ Generación de OC desde requerimiento aprobado
- ✅ OCs parciales (selección de items específicos)
- ✅ Cálculo de cantidades pendientes
- ✅ Campos editables (cantidad, precio unitario)
- ✅ Soporte de decimales (Decimal(18,4))
- ✅ Sistema de aprobación de OC
- ✅ Vista detalle de OC con timeline
- ✅ Indicador de progreso recepción (% recibido)

### Circuito 6: Recepciones ✅ COMPLETADO (Básico)
- ✅ Modelo Reception y ReceptionItem
- ✅ Recepción total y parcial
- ✅ Múltiples recepciones por OC
- ✅ Trazabilidad completa (modal con todas las recepciones)
- ✅ Indicador de progreso (% completado)
- ✅ Columnas: Título, Creado Por, Prioridad, Categoría

### Funcionalidades Transversales ✅
- ✅ Chatbot con IA (Claude) para crear requerimientos
- ✅ Toast notifications
- ✅ Multi-tenancy con aislamiento de datos
- ✅ Roles y permisos (SOLICITANTE, APROBADOR, COMPRADOR)
- ✅ Numeración automática (REQ-YYYY-XXXXX, OC-YYYY-XXXXX)

### Próximos Pasos (v1.3.0)
- 🔲 Generador PDF de OC
- 🔲 Integración con proveedores (envío de OC)
- 🔲 Portal de proveedores básico
- 🔲 Validación tripartita (OC + Factura + Conforme)
- 🔲 Sistema de facturas

---

## 📅 FASE 1: FUNDACIÓN (3 semanas)

**Objetivo**: Establecer la base técnica del proyecto

### Semana 1: Setup y Modelos de Datos

#### Día 1-2: Configuración del Proyecto

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 1.1 | Configurar estructura de carpetas para módulo compras | 2h |
| 1.2 | Configurar Prisma para multi-schema (public + sync) | 2h |
| 1.3 | Crear archivo de tipos TypeScript compartidos | 3h |
| 1.4 | Configurar validaciones con Zod | 2h |

**Entregable**: Proyecto configurado con estructura lista

#### Día 3-5: Modelos Prisma Core

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 1.5 | Crear enums en Prisma | 2h |
| 1.6 | Crear modelo Tenant y ConfiguracionTenant | 2h |
| 1.7 | Crear modelo CentroCostos | 1h |
| 1.8 | Crear modelo NivelAprobacion | 2h |
| 1.9 | Crear modelo User (extender existente) | 2h |
| 1.10 | Crear modelo Proveedor completo | 3h |
| 1.11 | Crear modelo Adjunto (polimórfico) | 2h |
| 1.12 | Crear modelo AuditLog | 1h |
| 1.13 | Ejecutar migraciones | 1h |
| 1.14 | Generar Prisma Client | 0.5h |

**Entregable**: Modelos base creados y migrados

### Semana 2: Autenticación y Roles

#### Día 1-3: Sistema de Roles y Permisos

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 2.1 | Definir matriz de permisos por rol | 3h |
| 2.2 | Crear middleware de autorización | 4h |
| 2.3 | Crear helper `checkPermission()` | 2h |
| 2.4 | Crear helper `requireRole()` | 2h |
| 2.5 | Tests unitarios de permisos | 3h |

#### Día 4-5: Contextos React

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 2.6 | Extender AuthContext para roles compras | 3h |
| 2.7 | Crear ComprasContext (estado global del módulo) | 4h |
| 2.8 | Crear hooks personalizados (`usePermisos`, `useRol`) | 3h |

**Entregable**: Sistema de autenticación y roles funcionando

### Semana 3: Componentes UI Base

#### Día 1-3: Componentes Reutilizables

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 3.1 | Crear componente `EstadoBadge` (estados con colores) | 2h |
| 3.2 | Crear componente `PrioridadBadge` | 1h |
| 3.3 | Crear componente `MontoDisplay` (formato moneda) | 2h |
| 3.4 | Crear componente `FileUpload` (drag & drop) | 4h |
| 3.5 | Crear componente `FileList` (lista de adjuntos) | 2h |
| 3.6 | Crear componente `Timeline` (historial de eventos) | 4h |
| 3.7 | Crear componente `AprobacionCard` | 3h |

#### Día 4-5: Layouts y Navegación

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 3.8 | Crear layout del módulo Compras | 3h |
| 3.9 | Crear sidebar con menú de compras | 3h |
| 3.10 | Crear breadcrumbs dinámicos | 2h |
| 3.11 | Crear componente `PageHeader` | 1h |
| 3.12 | Crear componente `DataTable` genérico | 4h |

**Entregable**: Librería de componentes UI lista

---

## 📅 FASE 2: CIRCUITO 1 - REQUERIMIENTOS (2 semanas)

**Objetivo**: Implementar el circuito base de pedidos y requerimientos

### Semana 4: Backend Requerimientos

#### Día 1-2: Modelos y Validaciones

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 4.1 | Crear modelo Requerimiento | 2h |
| 4.2 | Crear modelo RequerimientoItem | 1h |
| 4.3 | Crear modelo RevisionTecnica | 2h |
| 4.4 | Crear modelo Aprobacion | 2h |
| 4.5 | Ejecutar migraciones | 0.5h |
| 4.6 | Crear schemas Zod de validación | 3h |

#### Día 3-5: API Endpoints

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 4.7 | GET /api/v1/requerimientos (listar con filtros) | 3h |
| 4.8 | POST /api/v1/requerimientos (crear) | 3h |
| 4.9 | GET /api/v1/requerimientos/:id (detalle) | 2h |
| 4.10 | PATCH /api/v1/requerimientos/:id (actualizar) | 2h |
| 4.11 | DELETE /api/v1/requerimientos/:id (eliminar borrador) | 1h |
| 4.12 | POST /api/v1/requerimientos/:id/enviar | 2h |
| 4.13 | POST /api/v1/requerimientos/:id/revision-tecnica | 3h |
| 4.14 | POST /api/v1/requerimientos/:id/aprobar | 4h |
| 4.15 | POST /api/v1/requerimientos/:id/rechazar | 2h |
| 4.16 | Servicio de numeración automática (REQ-YYYY-XXXXX) | 2h |

**Entregable**: API de requerimientos completa

### Semana 5: Frontend Requerimientos

#### Día 1-3: Pantallas CRUD

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 5.1 | Pantalla lista de requerimientos | 4h |
| 5.2 | Formulario crear/editar requerimiento | 6h |
| 5.3 | Componente items del requerimiento (tabla editable) | 4h |
| 5.4 | Pantalla detalle de requerimiento | 4h |
| 5.5 | Componente timeline de estados | 3h |

#### Día 4-5: Flujos de Aprobación

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 5.6 | Modal de revisión técnica | 3h |
| 5.7 | Modal de aprobación/rechazo | 3h |
| 5.8 | Panel "Mis aprobaciones pendientes" | 4h |
| 5.9 | Notificaciones de estado | 2h |
| 5.10 | Tests E2E del circuito 1 | 4h |

**Entregable**: Circuito 1 completo y testeado

---

## 📅 FASE 3: CIRCUITOS 2, 3, 4 - COTIZACIONES Y OCs (4 semanas)

### Semana 6: Backend Cotizaciones

#### Día 1-3: Modelos Cotización

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 6.1 | Crear modelo SolicitudCotizacion | 3h |
| 6.2 | Crear modelo SolicitudCotizacionItem | 1h |
| 6.3 | Crear modelo ProveedorInvitado | 1h |
| 6.4 | Crear modelo Cotizacion | 3h |
| 6.5 | Crear modelo CotizacionItem | 1h |
| 6.6 | Migraciones y Prisma Client | 1h |

#### Día 4-5: API Cotizaciones

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 6.7 | CRUD de solicitudes de cotización | 4h |
| 6.8 | Endpoint publicar solicitud | 2h |
| 6.9 | Endpoint invitar proveedores | 2h |
| 6.10 | Endpoint recibir cotización (proveedor) | 3h |
| 6.11 | Endpoint ver cotizaciones recibidas | 2h |
| 6.12 | Endpoint adjudicar proveedor | 3h |
| 6.13 | Servicio de notificaciones a proveedores | 3h |

**Entregable**: API de cotizaciones completa

### Semana 7: Backend Órdenes de Compra

#### Día 1-3: Modelos OC

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 7.1 | Crear modelo OrdenCompra | 3h |
| 7.2 | Crear modelo OrdenCompraItem | 2h |
| 7.3 | Migraciones | 1h |
| 7.4 | Crear schemas Zod | 2h |

#### Día 4-5: API Órdenes de Compra

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 7.5 | CRUD de órdenes de compra | 4h |
| 7.6 | Endpoint generar OC desde cotización | 3h |
| 7.7 | Endpoint generar OC simple (sin cotización) | 2h |
| 7.8 | Endpoint aprobar OC | 2h |
| 7.9 | Endpoint enviar OC a proveedor | 2h |
| 7.10 | Endpoint aceptar/rechazar OC (proveedor) | 2h |
| 7.11 | Lógica de anticipo (Circuito 3) | 4h |

**Entregable**: API de OCs completa

### Semana 8: Frontend Cotizaciones

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 8.1 | Pantalla lista de solicitudes de cotización | 4h |
| 8.2 | Formulario crear solicitud de cotización | 6h |
| 8.3 | Selector de proveedores a invitar | 3h |
| 8.4 | Pantalla ver cotizaciones recibidas | 4h |
| 8.5 | Componente comparativo de cotizaciones | 6h |
| 8.6 | Modal evaluación técnica | 3h |
| 8.7 | Modal adjudicación | 3h |
| 8.8 | Notificaciones del proceso | 2h |

**Entregable**: UI de cotizaciones completa

### Semana 9: Frontend Órdenes de Compra

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 9.1 | Pantalla lista de OCs | 4h |
| 9.2 | Formulario crear/editar OC | 6h |
| 9.3 | Pantalla detalle de OC | 4h |
| 9.4 | Componente items de OC | 3h |
| 9.5 | Modal configuración de anticipo | 3h |
| 9.6 | Vista OC para proveedor (aceptar/rechazar) | 4h |
| 9.7 | Generador de PDF de OC | 4h |
| 9.8 | Tests E2E circuitos 2, 3, 4 | 4h |

**Entregable**: Circuitos 2, 3, 4 completos

---

## 📅 FASE 4: CIRCUITOS 5, 6 - FACTURAS Y PAGOS (3 semanas)

### Semana 10: Backend Conformes y Facturas

#### Día 1-2: Modelos Conforme de Entrega

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 10.1 | Crear modelo ConformeEntrega | 2h |
| 10.2 | Crear modelo ConformeEntregaItem | 2h |
| 10.3 | API CRUD conformes | 4h |
| 10.4 | Lógica de recepción parcial | 3h |

#### Día 3-5: Modelos Factura

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 10.5 | Crear modelo Factura | 3h |
| 10.6 | Crear modelo Retencion | 2h |
| 10.7 | API CRUD facturas | 4h |
| 10.8 | Endpoint cargar factura con OC | 2h |
| 10.9 | Endpoint cargar factura sin OC (Circuito 5) | 3h |
| 10.10 | Lógica validación tripartita (OC + Factura + Conforme) | 4h |
| 10.11 | Endpoint aprobar/rechazar factura | 2h |

**Entregable**: API de facturas y conformes

### Semana 11: Backend Pagos y Retenciones

#### Día 1-3: Sistema de Retenciones

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 11.1 | Servicio cálculo retención Ganancias | 4h |
| 11.2 | Servicio cálculo retención IVA | 3h |
| 11.3 | Servicio cálculo retención IIBB | 3h |
| 11.4 | Endpoint calcular retenciones de factura | 2h |
| 11.5 | Generador de certificados de retención (PDF) | 4h |

#### Día 4-5: Órdenes de Pago

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 11.6 | Crear modelo OrdenPago | 2h |
| 11.7 | API CRUD órdenes de pago | 4h |
| 11.8 | Endpoint generar OP desde facturas | 3h |
| 11.9 | Endpoint aprobar OP | 2h |
| 11.10 | Endpoint ejecutar pago | 2h |
| 11.11 | Servicio de notificación de pago | 2h |

**Entregable**: API de pagos y retenciones

### Semana 12: Frontend Facturas y Pagos

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 12.1 | Pantalla lista de conformes de entrega | 3h |
| 12.2 | Formulario crear conforme | 4h |
| 12.3 | Pantalla lista de facturas | 4h |
| 12.4 | Formulario cargar factura | 5h |
| 12.5 | Pantalla validación tripartita | 4h |
| 12.6 | Visualizador de retenciones calculadas | 3h |
| 12.7 | Pantalla lista de órdenes de pago | 3h |
| 12.8 | Formulario crear orden de pago | 4h |
| 12.9 | Pantalla detalle de pago | 3h |
| 12.10 | Descarga de certificados de retención | 2h |
| 12.11 | Tests E2E circuitos 5, 6 | 4h |

**Entregable**: Circuitos 5, 6 completos

---

## 📅 FASE 5: PORTAL PROVEEDOR (2 semanas)

### Semana 13: Backend Portal Proveedor

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 13.1 | Autenticación separada para proveedores | 4h |
| 13.2 | Middleware de permisos proveedor | 2h |
| 13.3 | API /portal/solicitudes-cotizacion | 3h |
| 13.4 | API /portal/cotizaciones (enviar/ver) | 4h |
| 13.5 | API /portal/ordenes-compra (mis OCs) | 3h |
| 13.6 | API /portal/facturas (cargar/ver) | 4h |
| 13.7 | API /portal/pagos (ver pagos recibidos) | 3h |
| 13.8 | API /portal/certificados (descargar) | 2h |
| 13.9 | Dashboard proveedor con métricas | 3h |

**Entregable**: API del portal proveedor

### Semana 14: Frontend Portal Proveedor

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 14.1 | Layout y navegación portal proveedor | 4h |
| 14.2 | Dashboard proveedor | 4h |
| 14.3 | Pantalla solicitudes de cotización recibidas | 3h |
| 14.4 | Formulario enviar cotización | 5h |
| 14.5 | Pantalla mis órdenes de compra | 3h |
| 14.6 | Pantalla aceptar/rechazar OC | 3h |
| 14.7 | Pantalla mis facturas | 3h |
| 14.8 | Formulario cargar factura | 4h |
| 14.9 | Pantalla mis pagos | 3h |
| 14.10 | Pantalla certificados de retención | 2h |
| 14.11 | Tests E2E portal proveedor | 4h |

**Entregable**: Portal proveedor completo

---

## 📅 FASE 6: INTEGRACIÓN ERP (2 semanas)

### Semana 15: Sincronización Softland

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 15.1 | Modelos Prisma para tablas sync | 3h |
| 15.2 | Servicio de mapeo Hub → Softland | 4h |
| 15.3 | Servicio de mapeo Softland → Hub | 4h |
| 15.4 | Job sincronización de requerimientos aprobados | 4h |
| 15.5 | Job sincronización de OCs | 4h |
| 15.6 | Job sincronización de recepciones | 3h |
| 15.7 | Procesador de OCs desde Softland | 4h |
| 15.8 | Manejo de errores y reintentos | 3h |

**Entregable**: Sincronización Hub ↔ Softland

### Semana 16: Configuración y Monitoreo

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 16.1 | Pantalla configuración de sincronización | 4h |
| 16.2 | Pantalla logs de sincronización | 3h |
| 16.3 | Dashboard de estado de sync | 3h |
| 16.4 | Alertas de errores de sincronización | 3h |
| 16.5 | Documentación de integración | 4h |
| 16.6 | Tests de integración con Softland | 6h |

**Entregable**: Integración ERP completa

---

## 📅 FASE 7: TESTING Y DEPLOY (2 semanas)

### Semana 17: Testing Integral

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 17.1 | Tests unitarios de servicios | 8h |
| 17.2 | Tests de integración de APIs | 8h |
| 17.3 | Tests E2E de flujos completos | 12h |
| 17.4 | Tests de carga y performance | 4h |
| 17.5 | Corrección de bugs encontrados | 8h |

**Entregable**: Suite de tests completa

### Semana 18: Deployment

| Task | Descripción | Tiempo |
|------|-------------|--------|
| 18.1 | Configuración de ambiente staging | 4h |
| 18.2 | Deploy a staging y pruebas | 4h |
| 18.3 | Configuración de ambiente producción | 4h |
| 18.4 | Deploy a producción | 4h |
| 18.5 | Configuración de monitoreo | 4h |
| 18.6 | Documentación de usuario | 8h |
| 18.7 | Capacitación inicial | 8h |
| 18.8 | Soporte post-go-live | Variable |

**Entregable**: Sistema en producción

---

## 🎯 ESTRATEGIA MVP (8 semanas)

Si se necesita entregar valor más rápido, se puede implementar un MVP:

### Alcance MVP

| Circuito | Incluido | Notas |
|----------|----------|-------|
| 1. Requerimientos | ✅ Completo | Base del sistema |
| 2. Cotización/Licitación | ❌ | Fase Full |
| 3. Compra con Anticipo | ❌ | Fase Full |
| 4. OC Simple | ✅ Completo | Flujo básico |
| 5. Factura Directa | ✅ Básico | Sin validación tripartita compleja |
| 6. Pagos | ✅ Básico | Sin retenciones automáticas |
| Portal Proveedor | ❌ | Fase Full |
| Integración ERP | ✅ Básico | Solo OCs |

### Cronograma MVP

| Semana | Fase | Entregable |
|--------|------|------------|
| 1-2 | Fundación | Setup, modelos core, auth |
| 3-4 | Circuito 1 | Requerimientos completo |
| 5-6 | Circuito 4 | OC Simple completo |
| 7 | Circuito 6 básico | Facturas y pagos básicos |
| 8 | Testing + Deploy | MVP en producción |

### Funcionalidades MVP

**Incluidas:**
- ✅ Crear requerimientos de compra
- ✅ Aprobación multinivel
- ✅ Revisión técnica (opcional)
- ✅ Generar OC simple
- ✅ Conforme de entrega
- ✅ Cargar facturas
- ✅ Generar orden de pago
- ✅ Sync básico con ERP

**Excluidas (Fase Full):**
- ❌ Proceso de cotización/licitación
- ❌ Comparativo de ofertas
- ❌ Manejo de anticipos
- ❌ Cálculo automático de retenciones
- ❌ Portal de proveedores
- ❌ Certificados de retención automáticos
- ❌ Dashboard avanzado con analytics

---

## 📋 Resumen de Tareas por Fase

| Fase | Semanas | Tareas | Horas Est. |
|------|---------|--------|------------|
| 1. Fundación | 3 | 36 | 120h |
| 2. Circuito 1 | 2 | 26 | 80h |
| 3. Circuitos 2-4 | 4 | 48 | 160h |
| 4. Circuitos 5-6 | 3 | 34 | 120h |
| 5. Portal Proveedor | 2 | 20 | 80h |
| 6. Integración ERP | 2 | 14 | 60h |
| 7. Testing/Deploy | 2 | 16 | 80h |
| **TOTAL** | **18** | **194** | **~700h** |

---

## 🔢 Métricas de Complejidad

### Por Circuito

| Circuito | Modelos | Endpoints | Pantallas | Complejidad |
|----------|---------|-----------|-----------|-------------|
| 1. Requerimientos | 4 | 9 | 4 | Media |
| 2. Cotización | 5 | 8 | 5 | Alta |
| 3. Anticipo | 0* | 2* | 2 | Media |
| 4. OC Simple | 2 | 10 | 4 | Media |
| 5. Factura Directa | 2 | 6 | 3 | Media |
| 6. Pagos | 2 | 8 | 4 | Alta |
| Portal Proveedor | 0* | 9 | 8 | Media |

*Reutiliza modelos de otros circuitos

### Esfuerzo por Rol de Desarrollo

| Rol | Horas Estimadas | % del Total |
|-----|-----------------|-------------|
| Backend Developer | 350h | 50% |
| Frontend Developer | 280h | 40% |
| QA/Testing | 50h | 7% |
| DevOps | 20h | 3% |
| **TOTAL** | **700h** | 100% |

---

## ⚠️ Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad de retenciones | Alta | Alto | Consultar con contador, documentar reglas |
| Integración Softland diferente | Media | Alto | Validar estructura en semana 1 |
| Múltiples roles y permisos | Media | Medio | Definir matriz de permisos antes de codificar |
| Performance con muchos registros | Baja | Medio | Paginación, indexes, caché desde el inicio |
| Cambios de requerimientos | Alta | Alto | Validar con stakeholders cada circuito |

---

## 📝 Notas Importantes

1. **Las estimaciones son conservadoras** - Un desarrollador senior podría completar más rápido
2. **Incluye tiempo de testing** - Cada fase incluye tests básicos
3. **No incluye diseño UI/UX** - Se asume que los wireframes ya existen
4. **Dependencias entre circuitos** - El orden de las fases es importante
5. **Buffer incluido** - Cada semana tiene ~20% de buffer para imprevistos

---

## 🚀 Próximos Pasos

1. **Validar alcance** con stakeholders
2. **Definir prioridades** (MVP vs Full)
3. **Asignar equipo** de desarrollo
4. **Configurar ambiente** de desarrollo
5. **Comenzar Fase 1** - Fundación

---

**Documento creado**: 29 Noviembre 2025
**Versión**: 2.0
**Estado**: 📋 Pendiente Aprobación
