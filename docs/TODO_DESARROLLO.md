# TODO - Plan de Desarrollo Hub

**Última actualización:** 2025-12-08 (Sesión 8)

---

## ESTADO GENERAL

| Módulo | Estado | Progreso |
|--------|--------|----------|
| Portal Documentos | Completado | 95% |
| AI Chatbot (Axio) | Completado | 100% |
| Onboarding Proveedores | Completado | 90% |
| Módulo de Pagos | Completado | 90% |
| Sistema de Roles | Parcial | 75% |
| MVP Compras | En progreso | 60% |
| Notificaciones | Completado | 90% |
| **Cotizaciones y Licitaciones** | **Completado** | **95%** |
| **Portal Proveedor** | **Completado** | **98%** |

---

## DETALLE POR MÓDULO

### 1. SISTEMA DE ROLES Y PERMISOS

#### Completado:
- [x] Schema Prisma con enum Role (PROVIDER, CLIENT_VIEWER, CLIENT_APPROVER, CLIENT_ADMIN, etc.)
- [x] TenantMembership para multi-tenant
- [x] Roles de compras (PURCHASE_REQUESTER, PURCHASE_APPROVER, PURCHASE_ADMIN)
- [x] **Middleware de autorización (`/backend/src/middleware/authorization.ts`)**:
  - loadUserRoles: Carga roles del usuario para el tenant actual
  - requireRole: Requiere rol específico
  - requirePermission: Requiere permiso específico
  - requireAllPermissions: Requiere todos los permisos
  - requireAdmin: Requiere CLIENT_ADMIN o SUPER_ADMIN
  - requireSuperAdmin: Solo SUPER_ADMIN
- [x] **Sistema de permisos granulares**:
  - documents:view/upload/approve/reject/delete/comment
  - suppliers:view/create/edit/approve/suspend/delete
  - purchases:view/create/approve/reject/admin
  - payments:view/create/approve/mark-paid
  - users:view/manage, tenant:admin, system:admin
- [x] **API de permisos** (`GET /api/users/me/permissions`)
- [x] **Hook usePermissions** (`/frontend/src/hooks/usePermissions.ts`):
  - hasPermission, hasAnyPermission, hasAllPermissions
  - hasRole, hasAnyRole, isAdmin
  - canApproveDocuments, canManageSuppliers, canApprovePurchases
- [x] **PermissionGate component** (`/frontend/src/components/auth/PermissionGate.tsx`):
  - PermissionGate: Renderiza condicionalmente por permiso/rol
  - RequireAdmin, RequireSuperAdmin
  - CanView, CanCreate, CanApprove

#### Pendiente:
- [ ] Selector de empresa en UI (multi-tenant)
- [ ] Panel de gestión de roles (admin)

---

### 2. ONBOARDING DE PROVEEDORES

**Documentación:** `/docs/ONBOARDING_PROVEEDOR_DESIGN.md`

#### Completado:
- [x] Schema Prisma expandido (Supplier con datos bancarios, fiscales, estado)
- [x] Modelos: SupplierDocument, TenantSupplierConfig
- [x] Enums: SupplierStatus, CondicionFiscal, TipoFactura, TipoCuentaBancaria
- [x] API Backend completa (`/backend/src/routes/suppliers.ts`):
  - GET /api/suppliers (listado con filtros y paginación)
  - GET /api/suppliers/:id (detalle con documentos)
  - GET /api/suppliers/pending-approval
  - GET /api/suppliers/stats/:tenantId
  - POST /api/suppliers (crear/invitar)
  - PUT /api/suppliers/:id (actualizar)
  - POST /api/suppliers/:id/complete-bank-data
  - POST /api/suppliers/:id/complete-company-data
  - POST /api/suppliers/:id/complete-onboarding
  - POST /api/suppliers/:id/approve
  - POST /api/suppliers/:id/reject
  - POST /api/suppliers/:id/suspend
  - POST /api/suppliers/:id/reactivate
  - POST/GET/DELETE /api/suppliers/:id/documents
  - GET/PUT /api/suppliers/config/:tenantId
- [x] Componente BankDataForm.tsx (datos bancarios)
- [x] Componente CompanyDataForm.tsx (datos empresa + notificaciones)
- [x] Página /proveedores (listado con stats, filtros, búsqueda)
- [x] Página /proveedores/[id] (detalle con tabs: info, bank, docs)
- [x] Modal de invitación de proveedor
- [x] Acciones: aprobar, suspender, reactivar, rechazar
- [x] Upload de documentos con tipos (CBU, AFIP, IIBB, etc.)

#### Pendiente:
- [ ] Página /proveedores/onboarding (wizard paso a paso para proveedor)
- [ ] Panel admin aprobación masiva
- [ ] Configuración de campos requeridos (admin UI)
- [ ] Email de invitación (template + envío)
- [ ] Email de aprobación/rechazo (template + envío)

---

### 3. PORTAL DE DOCUMENTOS

**Documentación:** `/docs/PORTAL_DOCUMENTOS_DESIGN.md`

#### Completado:
- [x] Página /documentos (tabla responsive)
- [x] DocumentStatusBadge (colores por estado)
- [x] FileDropzone (drag & drop)
- [x] DocumentUploadModal (upload con Parse + paso de revisión)
- [x] Página /documentos/[id] (detalle)
- [x] DocumentoParseView (tabs cabecera/items/impuestos)
- [x] Timeline de eventos
- [x] Paginación, búsqueda, filtros
- [x] **Paso de revisión pre-envío (ver PDF + editar datos Parse antes de guardar)**
- [x] **Sistema de comentarios funcional (backend + frontend)**
- [x] **Endpoint PATCH /api/documents/:id para actualizar datos**
- [x] **Endpoints POST/DELETE /api/documents/:id/comments para comentarios**

#### Pendiente:
- [ ] Campos adicionales configurables por tenant
- [ ] Adjuntar documentos adicionales a uno existente

---

### 4. MÓDULO DE PAGOS

**Documentación:** `/docs/PAGOS_DESIGN.md`

#### Completado:
- [x] Schema Prisma (Payment, PaymentItem)
- [x] **API Backend pagos (`/backend/src/routes/payments.ts`)**:
  - GET /api/payments (listado con filtros y paginación)
  - GET /api/payments/stats/:tenantId (estadísticas)
  - GET /api/payments/:id (detalle con facturas y retenciones)
  - GET /api/payments/:id/download-all (descarga ZIP)
  - POST /api/payments (crear pago)
  - PUT /api/payments/:id (actualizar pago)
  - POST /api/payments/:id/mark-paid (marcar como pagado)
  - POST /api/payments/:id/retentions (agregar retención)
- [x] **Página /pagos (listado con cards resumen, filtros, paginación)**
- [x] **Página /pagos/[id] (detalle con facturas, retenciones, timeline)**
- [x] **Descarga masiva (.zip) de comprobantes**
- [x] **Visor de PDFs integrado**

#### Pendiente:
- [ ] Exportación Excel/CSV/PDF

---

### 5. MVP COMPRAS DEMO

**Documentación:** `/docs/MVP_DEMO.md`

#### Completado:
- [x] Schema Prisma (PurchaseRequest, PurchaseRequestItem, PurchaseOrderCircuit, etc.)
- [x] API Backend requerimientos (`/backend/src/routes/purchaseRequests.ts`)
- [x] API Backend órdenes de compra (`/backend/src/routes/purchaseOrders.ts`)
- [x] API Backend recepciones (`/backend/src/routes/receptions.ts`)
- [x] Página /compras (dashboard)
- [x] Página /compras/requerimientos (listado)
- [x] Página /compras/requerimientos/nuevo (formulario)
- [x] Página /compras/requerimientos/[id] (detalle)
- [x] Página /compras/aprobaciones (panel aprobador)
- [x] Página /compras/ordenes-compra (listado OC)
- [x] Página /compras/ordenes-compra/[id] (detalle OC)
- [x] Página /compras/recepcion (confirmación)

#### Pendiente:
- [ ] Integración con chatbot (crear requerimiento vía IA) - parcial
- [ ] Mejorar UX del formulario de requerimiento
- [ ] Adjuntos de especificaciones con aprobación
- [ ] Templates de email para notificaciones
- [ ] Dashboard con KPIs reales

---

### 6. AI CHATBOT (AXIO)

**Documentación:** `/docs/AI_CHATBOT_SETUP.md`

#### Completado:
- [x] ChatWidget.tsx (widget flotante)
- [x] ChatMessage.tsx (mensajes)
- [x] API Backend chat (`/backend/src/routes/chat.ts`)
- [x] AIAssistantService (integración Claude)
- [x] ActionExecutorService (ejecutar acciones)
- [x] Crear requerimientos con lenguaje natural
- [x] Subir documentos vía chat con Parse

#### Pendiente:
- [ ] Historial de conversaciones persistente
- [ ] Más acciones (consultar estado, aprobar)
- [ ] Sugerencias contextuales
- [ ] Mejorar prompts del sistema

---

### 7. NOTIFICACIONES

**Documentación:** Incluido en varios docs

#### Completado:
- [x] Schema Prisma (Notification, EmailQueue, EmailTemplate, UserNotificationPreference)
- [x] Enums de eventos de notificación
- [x] **EmailService (`/backend/src/services/emailService.ts`)**:
  - Envío directo con nodemailer
  - Soporte para templates con variables
  - Cola de emails (queue/process)
  - Email de prueba
- [x] **NotificationService (`/backend/src/services/notificationService.ts`)**:
  - Notificaciones de requerimientos
  - Notificaciones de documentos
  - Notificaciones de proveedores
  - Notificaciones de pagos
  - Preferencias de usuario
- [x] **API de Notificaciones (`/backend/src/routes/notifications.ts`)**:
  - GET/PUT /api/notifications/preferences
  - PUT /api/notifications/preferences/bulk
  - GET/PUT /api/notifications/templates
  - POST /api/notifications/test-email
  - GET /api/notifications/queue
  - POST /api/notifications/process-queue
- [x] **Templates HTML de Email** (seed script en `/backend/prisma/seed-templates.ts`):
  - REQ_SUBMITTED, REQ_APPROVED, REQ_REJECTED, REQ_NEEDS_APPROVAL
  - DOC_UPLOADED, DOC_APPROVED, DOC_REJECTED
  - SUPPLIER_INVITED, SUPPLIER_APPROVED, SUPPLIER_REJECTED
  - PAYMENT_ISSUED, PAYMENT_COMPLETED, PAYMENT_SCHEDULED
- [x] **Componente NotificationBell** (`/frontend/src/components/notifications/NotificationBell.tsx`):
  - Icono con contador de no leídas
  - Dropdown con lista de notificaciones
  - Marcar como leída/todas leídas
- [x] **Página de Preferencias** (`/frontend/src/app/configuracion/notificaciones/page.tsx`):
  - Toggles por email y portal
  - Agrupado por categoría

#### Pendiente:
- [ ] Push notifications (opcional)
- [ ] Integración WhatsApp (opcional)
- [ ] Cron job para procesar cola automáticamente

---

### 8. COTIZACIONES Y LICITACIONES (RFQ)

**Documentación:** `/docs/RFQ_LICITACIONES_DESIGN.md` (pendiente crear)

#### 8.1 Schema y Modelos (COMPLETADO)
- [x] Modelo `QuotationRequest` (Solicitud de Cotización/RFQ)
  - id, number, title, description
  - purchaseRequestId (origen desde requerimiento aprobado)
  - tenantId, createdById
  - status: DRAFT, PUBLISHED, IN_QUOTATION, EVALUATION, AWARDED, CANCELLED, CLOSED
  - deadline (fecha límite respuesta)
  - deliveryDeadline (fecha entrega requerida)
  - paymentTerms (condiciones de pago esperadas)
  - currency, estimatedBudget (presupuesto estimado, opcional)
- [x] Modelo `QuotationRequestItem` (ítems de la solicitud)
  - quotationRequestId, description, quantity, unit
  - specifications
- [x] Modelo `QuotationRequestSupplier` (proveedores invitados)
  - quotationRequestId, supplierId
  - invitedAt, viewedAt, respondedAt
  - status: PENDING, INVITED, VIEWED, DECLINED
- [x] Modelo `SupplierQuotation` (cotización del proveedor)
  - quotationRequestId, supplierId
  - number, status: DRAFT, SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED, AWARDED
  - validUntil (vigencia de la cotización)
  - deliveryDays, paymentTerms
  - totalAmount, currency
  - notes
- [x] Modelo `SupplierQuotationItem` (ítems cotizados)
  - quotationId, requestItemId
  - unitPrice, quantity, totalPrice
  - brand, model, notes
- [x] Enums: RFQStatus, QuotationStatus, RFQInvitationStatus
- [x] **Menú "Cotizaciones" agregado al sidebar** (`/compras/cotizaciones`)
- [x] **Página básica de listado** (`/frontend/src/app/compras/cotizaciones/page.tsx`)
  - Stats cards (total, activas, por vencer, adjudicadas)
  - Tabla con filtros y búsqueda
  - Datos de ejemplo para visualización

#### 8.2 Backend API (COMPLETADO)
- [x] **CRUD Solicitudes de Cotización** (`/api/rfq`)
  - POST /api/rfq (crear desde requerimiento)
  - GET /api/rfq (listado con filtros y paginación)
  - GET /api/rfq/stats/:tenantId (estadísticas)
  - GET /api/rfq/:id (detalle con ítems y proveedores)
  - PUT /api/rfq/:id (actualizar)
  - DELETE /api/rfq/:id (solo si DRAFT)
- [x] **Gestión de proveedores invitados**
  - POST /api/rfq/:id/invite (invitar proveedores)
  - DELETE /api/rfq/:id/suppliers/:supplierId (quitar invitación)
  - POST /api/rfq/:id/publish (publicar/enviar a proveedores)
  - POST /api/rfq/:id/close (cerrar recepción)
  - POST /api/rfq/:id/cancel (cancelar RFQ)
- [x] **Portal Proveedor - Cotizaciones**
  - GET /api/rfq/supplier-portal/invitations (RFQs donde estoy invitado)
  - GET /api/rfq/supplier-portal/:id (detalle para cotizar)
  - POST /api/rfq/supplier-portal/:id/quotation (enviar/guardar cotización)
  - POST /api/rfq/supplier-portal/:id/decline (rechazar participar)
- [x] **Evaluación y Adjudicación**
  - GET /api/rfq/:id/quotations (todas las cotizaciones recibidas)
  - GET /api/rfq/:id/comparison (cuadro comparativo con mejores precios)
  - POST /api/rfq/:id/award (adjudicar a proveedor)
  - POST /api/rfq/:id/generate-po (generar OC desde adjudicación)

#### 8.3 Frontend - Comprador (Cliente) (COMPLETADO)
- [x] **Página /compras/cotizaciones** (listado de RFQs)
  - Tabla con número, título, estado, deadline, cotizaciones recibidas
  - Filtros por estado, búsqueda
  - Stats cards (Total, Activas, Por Vencer, Adjudicadas)
  - Botón "Nueva Solicitud"
  - Acciones: Ver, Editar, Eliminar, Comparar
- [x] **Página /compras/cotizaciones/nueva**
  - Crear desde requerimiento aprobado (selector)
  - O crear manualmente con ítems
  - Seleccionar proveedores a invitar (del padrón aprobado)
  - Fecha límite, condiciones, presupuesto
  - Guardar como borrador
- [x] **Página /compras/cotizaciones/[id]** (detalle)
  - Info general y estado
  - Tabs: Items, Proveedores, Cotizaciones
  - Timeline de historial
  - Acciones: Publicar, Cerrar, Cancelar
  - Banner de adjudicación si aplica
- [x] **Página /compras/cotizaciones/[id]/comparar** (cuadro comparativo)
  - Tabla comparativa de todas las cotizaciones
  - Columnas: Proveedor, precio unitario por ítem, total, plazo, condiciones
  - Destacar mejor precio por ítem y mejor total
  - Selección de proveedor para adjudicar
  - Botón "Adjudicar" + Generar OC

#### 8.4 Frontend - Proveedor (COMPLETADO)
- [x] **Página /portal/cotizaciones** (mis invitaciones)
  - RFQs donde fui invitado
  - Estado: Pendiente, Cotizado, Adjudicado, No adjudicado
  - Stats cards (Invitaciones, Por Cotizar, Cotizadas, Adjudicadas)
  - Filtros por estado
- [x] **Página /portal/cotizaciones/[id]** (ver y cotizar)
  - Detalle de lo solicitado
  - Formulario para ingresar precios por ítem
  - Plazo de entrega, condiciones
  - Guardar borrador / Enviar cotización
  - Botón "No Participar" para declinar
- [x] **Página /portal/dashboard** (dashboard proveedor)
  - Resumen de cotizaciones, órdenes, facturas, pagos
  - Acciones rápidas
- [x] **Notificación de adjudicación en UI**
  - Banner verde si ganó, rojo si no
  - Estado actualizado en listado
- [ ] **Adjuntar archivos** (catálogos, fichas técnicas) - pendiente

#### 8.5 Notificaciones (COMPLETADO)
- [x] Email: Invitación a cotizar (al proveedor) - NotificationService.notifyRFQInvitation
- [x] Email: Adjudicación ganador - NotificationService.notifyRFQAwarded
- [x] Email: Adjudicación no ganadores - NotificationService.notifyRFQNotAwarded
- [x] Email: Nueva cotización recibida (al comprador) - NotificationService.notifyQuotationReceived
- [x] Email: Recordatorio antes del cierre - NotificationService.notifyRFQDeadlineReminder
- [x] Tipos de evento agregados al schema Prisma (RFQ_INVITATION, RFQ_AWARDED, etc.)
- [ ] Notificaciones in-app (opcional)

#### 8.6 Integraciones
- [ ] Crear RFQ desde requerimiento aprobado (un click)
- [ ] Generar OC automáticamente desde adjudicación
- [ ] Vincular documentos/facturas a OC generadas
- [ ] Chatbot: "Crear solicitud de cotización para el requerimiento X"

#### 8.7 Reportes y Métricas
- [ ] Dashboard de cotizaciones (abiertas, cerradas, adjudicadas)
- [ ] Métricas: tiempo promedio de respuesta, tasa de participación
- [ ] Historial de precios por proveedor/producto
- [ ] Comparativo de ahorro vs presupuesto estimado

---

### 9. PORTAL PROVEEDOR

**Descripción:** Portal unificado para que los proveedores accedan a todas sus funcionalidades.

#### 9.1 Páginas del Portal (COMPLETADO)
- [x] **Página /portal/dashboard** - Dashboard del proveedor
  - Resumen de cotizaciones, órdenes, facturas, pagos
  - Stats cards con datos reales
  - Acciones rápidas
- [x] **Página /portal/cotizaciones** - Listado de invitaciones RFQ
  - Estados: Pendiente, Cotizado, Adjudicado, No adjudicado
  - Filtros y búsqueda
- [x] **Página /portal/cotizaciones/[id]** - Cotizar una RFQ
  - Ver detalle de solicitud
  - Formulario para ingresar precios
  - Guardar borrador / Enviar cotización
  - Declinar participación
- [x] **Página /portal/empresa** - Editar datos de mi empresa
  - Tabs: Datos Generales, Contacto, Datos Bancarios, Notificaciones
  - Formulario editable con validaciones
  - Guardar cambios

#### 9.2 Reutilización de Páginas Existentes (COMPLETADO)
En lugar de duplicar código, las siguientes páginas detectan si el usuario es proveedor y filtran los datos:

- [x] **/compras/ordenes-compra** - Muestra solo OCs del proveedor
  - Título cambia a "Mis Órdenes de Compra"
  - Oculta botón de crear nueva OC
  - Filtra por proveedorId
- [x] **/documentos** - Muestra solo facturas del proveedor
  - Título cambia a "Mis Facturas"
  - Filtra por supplierId → tenant por CUIT
- [x] **/pagos** - Muestra solo pagos recibidos por el proveedor
  - Título cambia a "Mis Pagos"
  - Filtra por supplierId → tenant por CUIT

#### 9.3 Hook useSupplier (COMPLETADO)
- [x] **Hook `/frontend/src/hooks/useSupplier.ts`**
  - Detecta si el usuario actual es proveedor
  - Retorna: isSupplier, supplierId, supplier, loading, error
  - Usa endpoint GET /api/suppliers/me

#### 9.4 Backend - API Proveedor (COMPLETADO)
- [x] **GET /api/suppliers/me** - Obtener datos del proveedor actual
  - Busca por userId del token JWT
- [x] **GET /api/documents?supplierId=** - Filtrar documentos por proveedor
- [x] **GET /api/payments?supplierId=** - Filtrar pagos por proveedor
- [x] **GET /api/payments/stats/supplier/:supplierId** - Stats de pagos

#### 9.5 Menú del Portal (COMPLETADO)
- [x] **Script add-portal-menu.ts** - Agrega opciones de menú sin sobrescribir
  - Dashboard → /portal/dashboard
  - Cotizaciones → /portal/cotizaciones
  - Mis Órdenes → /compras/ordenes-compra (reutiliza)
  - Mis Facturas → /documentos (reutiliza)
  - Mis Pagos → /pagos (reutiliza)
  - Mi Empresa → /portal/empresa

#### 9.6 Mis Facturas - Portal Proveedor (COMPLETADO - SESIÓN 8)
- [x] **Página /portal/facturas** - Gestión de facturas del proveedor
  - Botón "Cargar documento" con DocumentUploadModal
  - Procesamiento con IA (Axioma Parse) para extracción automática
  - Paso de revisión y corrección de datos extraídos
  - Filtros por estado (Procesando, Presentado, En Revisión, Aprobado, Pagado, Rechazado)
  - Filtros por tipo (Factura, Nota Crédito, Nota Débito, Recibo)
  - Paginación con 10 items por página
  - Stats cards (Total, Pendientes, Aprobadas, Pagadas, Por cobrar)
  - Modal de detalle con información completa
  - Descarga de archivos

#### 9.7 Pendiente
- [ ] Notificaciones in-app para proveedores
- [ ] Upload de documentos propios (constancias, certificados)
- [ ] Historial de transacciones
- [ ] Comunicación bidireccional (chat con comprador)

---

## ARCHIVOS CLAVE

### Backend
```
backend/src/
├── routes/
│   ├── suppliers.ts      ← Onboarding proveedores
│   ├── documents.ts      ← Portal documentos (+ comentarios)
│   ├── payments.ts       ← Módulo pagos
│   ├── notifications.ts  ← Notificaciones
│   ├── chat.ts           ← AI Chatbot
│   ├── purchaseRequests.ts
│   ├── purchaseOrders.ts
│   └── receptions.ts
├── middleware/
│   ├── auth.ts           ← Autenticación JWT
│   └── authorization.ts  ← Autorización por permisos (NUEVO)
├── services/
│   ├── aiAssistant.ts    ← Integración Claude
│   ├── actionExecutor.ts
│   ├── emailService.ts   ← Envío de emails
│   ├── notificationService.ts ← Notificaciones
│   └── parseService.ts   ← Integración Parse
└── prisma/
    ├── schema.prisma     ← Schema actualizado
    └── seed-templates.ts ← Templates de email
```

### Frontend
```
frontend/src/
├── app/
│   ├── documentos/       ← Portal documentos (COMPLETO)
│   │   ├── page.tsx      ← Listado con filtros
│   │   └── [id]/page.tsx ← Detalle + comentarios
│   ├── compras/          ← Módulo compras (COMPLETO)
│   ├── proveedores/      ← Onboarding proveedores
│   │   ├── page.tsx      ← Listado con stats y filtros
│   │   └── [id]/page.tsx ← Detalle con tabs
│   ├── pagos/            ← Módulo pagos
│   │   ├── page.tsx      ← Listado con stats
│   │   └── [id]/page.tsx ← Detalle con facturas/retenciones
│   ├── portal/           ← Portal Proveedor (COMPLETO)
│   │   ├── dashboard/page.tsx   ← Dashboard proveedor
│   │   ├── cotizaciones/        ← RFQs del proveedor
│   │   ├── facturas/page.tsx    ← Mis Facturas con upload (SESIÓN 8)
│   │   └── empresa/page.tsx     ← Datos de mi empresa
│   └── configuracion/
│       └── notificaciones/page.tsx ← Preferencias de notificaciones
├── components/
│   ├── auth/             ← Autorización (NUEVO)
│   │   └── PermissionGate.tsx ← Guards de permisos
│   ├── documents/        ← Componentes documentos
│   │   ├── DocumentUploadModal.tsx  ← Con paso de revisión
│   │   ├── DocumentStatusBadge.tsx
│   │   └── FileDropzone.tsx
│   ├── notifications/    ← Componentes notificaciones
│   │   └── NotificationBell.tsx
│   ├── chat/             ← ChatWidget
│   └── suppliers/        ← Componentes onboarding
│       ├── BankDataForm.tsx
│       └── CompanyDataForm.tsx
├── hooks/
│   └── usePermissions.ts ← Hook de permisos (NUEVO)
└── lib/
    └── chatService.ts    ← Servicio chat
```

---

## PRÓXIMOS PASOS INMEDIATOS

1. **Cotizaciones y Licitaciones (85% COMPLETADO):**
   - [x] Schema Prisma (modelos RFQ) - COMPLETADO
   - [x] Menú en sidebar - COMPLETADO
   - [x] API Backend (`/api/rfq`) - CRUD completo - COMPLETADO
   - [x] Frontend comprador completo - COMPLETADO
   - [x] Frontend proveedor - COMPLETADO
     - `/portal/cotizaciones` - Listado de invitaciones
     - `/portal/cotizaciones/[id]` - Formulario de cotización
     - `/portal/dashboard` - Dashboard del proveedor
   - [x] Notificaciones RFQ (emails) - COMPLETADO
     - Invitación, Adjudicación, Recordatorio
   - [ ] Agregar opciones de menú Portal Proveedor (manual desde admin)
   - [ ] Adjuntar archivos a cotizaciones

2. **Portal Proveedor (95% COMPLETADO):**
   - [x] Dashboard con resumen
   - [x] Cotizaciones (listar, ver, cotizar)
   - [x] Mis Órdenes de Compra (reutiliza /compras/ordenes-compra con filtro)
   - [x] Mis Facturas (/portal/facturas) - **SESIÓN 8**
     - Botón "Cargar documento" con DocumentUploadModal
     - Procesamiento con IA (Axioma Parse)
     - Paso de revisión y corrección de datos
     - Filtros por estado y tipo de documento
     - Paginación
   - [x] Mis Pagos (reutiliza /pagos con filtro)
   - [x] Datos de Mi Empresa (/portal/empresa)

3. **Sistema de Roles (pendiente):**
   - [ ] Selector de empresa en UI (multi-tenant)
   - [ ] Panel de gestión de roles (admin)

4. **Mejoras menores:**
   - [ ] Exportación Excel/CSV en pagos
   - [ ] Wizard de onboarding para proveedores
   - [ ] Push notifications (opcional)
   - [ ] Cron job para procesar cola de emails

---

## NOTAS

- La migración de Prisma debe ejecutarse: `npx prisma migrate dev`
- El chatbot requiere ANTHROPIC_API_KEY en .env
- Parse debe estar configurado para procesamiento de documentos
- Ruta de pagos registrada en server.ts: `/api/payments`

---

**Documento generado automáticamente por Claude Code**
