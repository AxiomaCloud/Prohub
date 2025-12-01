# AXIOMA Hub - Portal de Proveedores

## 🎯 Visión General

Hub es el portal de proveedores de AXIOMA que permite a las empresas gestionar de forma centralizada toda la relación con sus proveedores: documentos, facturas, órdenes de compra, pagos y comunicaciones.

**Hub se integra completamente con Axioma Parse** para ofrecer una experiencia superior en la gestión de documentos.

---

## 🚀 MEJORAS CLAVE vs COMPETENCIA

### 1. **Carga Inteligente de Documentos** (Integración con Parse)
**❌ Competencia:** El proveedor debe completar múltiples campos requeridos manualmente.
**✅ AXIOMA Hub:**
- **1 CLICK = 1 DOCUMENTO PROCESADO**
- El proveedor simplemente arrastra/sube el documento
- Parse escanea, clasifica y extrae datos automáticamente
- Sin formularios, sin campos requeridos
- IA hace el trabajo pesado

### 2. **Multi-Tenant Inteligente**
**❌ Competencia:** Si trabajás con 3 empresas, necesitás 3 usuarios y 3 contraseñas diferentes.
**✅ AXIOMA Hub:**
- **1 USUARIO = ACCESO A TODAS TUS EMPRESAS**
- Login único con selector de empresa
- Cambio entre tenants sin re-login
- Gestión centralizada de permisos

### 3. **Formatos de Archivo Flexibles**
**❌ Competencia:** Solo acepta PDF.
**✅ AXIOMA Hub:**
- PDF, JPG, PNG, JPEG, WebP
- Cualquier formato de imagen
- Conversión automática si es necesario
- OCR sobre cualquier tipo de documento

### 4. **Vista de Estados Visual (Pipeline/Kanban)**
**❌ Competencia:** Estado mostrado como un campo de texto simple.
**✅ AXIOMA Hub:**
- Vista tipo Kanban/Pipeline visual
- Arrastrar y soltar documentos entre estados
- Timeline de cambios de estado
- Notificaciones en tiempo real
- Filtros y búsqueda avanzada

### 5. **Virtualización de Documentos (Axioma Docs)**
**❌ Competencia:** PDFs estáticos que hay que descargar.
**✅ AXIOMA Hub:**
- Visor de documentos integrado
- Zoom, rotación, anotaciones
- Descarga opcional
- Vista previa rápida
- Historial de versiones

### 6. **Comunicación Omnicanal**
**❌ Competencia:** Solo mensajes dentro del portal.
**✅ AXIOMA Hub:**
- WhatsApp integrado
- Notificaciones push
- Email automático
- SMS (opcional)
- Chat en tiempo real
- Todo centralizado en un solo lugar

### 7. **Roles Duales (Proveedor + Cliente)**
**❌ Competencia:** Usuario separado si sos proveedor y cliente.
**✅ AXIOMA Hub:**
- Un usuario puede ser PROVEEDOR y CLIENTE simultáneamente
- Switch de contexto inteligente
- Buzón de entrada y salida
- Permisos granulares por rol

---

## 📦 MÓDULOS PRINCIPALES

### **1. Buzón de Documentos** (con Parse)
- Carga de documentos en 1 click
- Escaneo y clasificación automática con IA
- Soporte para múltiples formatos
- Vista previa instantánea

### **2. Facturas**
- Estado de facturas en tiempo real
- Vista tipo Kanban/Pipeline
- Historial de cambios
- Exportación a Excel/CSV
- Filtros avanzados

### **3. Pagos**
- Ver pagos emitidos
- Certificados de retención virtualizados
- Detalle de documentos asociados
- Filtros por fecha, monto, estado
- Exportación de datos

### **4. Órdenes de Compra**
- Visualización de OCs publicadas
- Visor de documentos integrado (Axioma Docs)
- Impresión directa
- Búsqueda y filtros
- Vinculación automática con facturas

### **5. Comunicaciones**
- WhatsApp Business integrado
- Notificaciones push en tiempo real
- Email automático
- Chat interno
- Historial completo de conversaciones

### **6. Panel de Control (Admin)**
- Dashboard con métricas clave
- Aceptar/rechazar facturas
- Gestión de usuarios ilimitados
- Permisos granulares
- Reportes y estadísticas
- Notificaciones masivas (pop-ups, emails)

---

## 👥 ROLES Y PERMISOS

### **Proveedores**
- Cargar documentos (facturas, notas de crédito/débito)
- Ver estado de sus documentos
- Consultar pagos y retenciones
- Ver órdenes de compra
- Comunicarse con la empresa
- Exportar sus datos

### **Clientes** (Empresas que reciben documentos)
- Recibir documentos de proveedores
- Aprobar/rechazar facturas
- Emitir órdenes de pago
- Gestionar comunicaciones
- Ver reportes consolidados

### **Administradores de Empresa**
- Acceso total al panel de control
- Gestión de usuarios y permisos
- Configuración de flujos de aprobación
- Reportes y analytics
- Notificaciones masivas

### **Usuarios Duales** (Proveedor + Cliente)
- Acceso a ambos contextos
- Switch rápido entre roles
- Buzones separados (entrada/salida)
- Permisos independientes por rol

---

## 🛠️ STACK TECNOLÓGICO

### **Frontend**
- Next.js 14+ (App Router)
- React 18+ con TypeScript
- Tailwind CSS v3/v4
- Lucide React (iconos)
- React Hook Form + Zod
- SWR o TanStack Query para data fetching

### **Backend**
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- JWT Authentication con multi-tenant
- Redis (caché y real-time)

### **Integraciones**
- **Axioma Parse**: Escaneo y clasificación de documentos
- **Axioma Docs**: Virtualización de documentos
- **WhatsApp Business API**: Comunicaciones
- **ERP del cliente**: Sincronización de datos

### **Infraestructura**
- Vercel / AWS / Azure
- AWS S3 (almacenamiento de documentos)
- Redis Cloud (caché)
- PostgreSQL managed (RDS / Supabase)

---

## 📊 ARQUITECTURA MULTI-TENANT

```
Usuario: juan@proveedor.com
  ├─ Empresa A (Proveedor)
  │   ├─ Ver mis facturas enviadas
  │   ├─ Cargar nuevos documentos
  │   └─ Ver pagos recibidos
  ├─ Empresa B (Proveedor + Cliente)
  │   ├─ Como Proveedor: Enviar facturas
  │   └─ Como Cliente: Recibir documentos
  └─ Empresa C (Cliente)
      ├─ Aprobar facturas de proveedores
      └─ Emitir órdenes de pago
```

**Características:**
- 1 login = acceso a todos los tenants
- Selector de empresa en header
- Permisos independientes por tenant
- Datos completamente aislados
- Switch instantáneo sin re-autenticación

---

## 🎨 DISEÑO

### **Paleta de Colores AXIOMA**
- Primary Dark: `#352151` (Púrpura oscuro)
- Primary: `#8E6AAA` (Púrpura)
- Accent Yellow: `#FCE5B7` (Crema/amarillo)
- Accent Pink: `#F1ABB5` (Rosa)
- Background: `#FAFAFA` (Gris claro)

### **Componentes Reutilizables** (de Parse)
- Buttons, Cards, Inputs, Tables
- Modals, Badges, Forms
- Sidebar, Dashboard layouts
- File upload components

Ver documentación completa en `/docs/DESIGN_SYSTEM.md`

---

## 📁 ESTRUCTURA DEL PROYECTO

```
prohub/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── documentos/
│   │   │   ├── facturas/
│   │   │   ├── pagos/
│   │   │   ├── ordenes-compra/
│   │   │   ├── comunicaciones/
│   │   │   └── admin/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── documents/
│   │   │   ├── parse-integration/
│   │   │   └── tenants/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/ (de Parse)
│   │   ├── layout/
│   │   ├── documents/
│   │   ├── payments/
│   │   └── communications/
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── TenantContext.tsx
│   │   └── DocumentFlowContext.tsx
│   ├── hooks/
│   ├── lib/
│   │   ├── parse-client.ts
│   │   ├── whatsapp-client.ts
│   │   └── prisma.ts
│   └── types/
├── prisma/
│   └── schema.prisma
├── docs/
│   ├── DESIGN_SYSTEM.md
│   ├── MODULES.md
│   ├── DOCUMENT_FLOW.md
│   ├── MULTI_TENANT.md
│   ├── PARSE_INTEGRATION.md
│   ├── WIREFRAMES.md
│   └── TECHNICAL_SPECS.md
└── README.md (este archivo)
```

---

## 🚀 ROADMAP DE DESARROLLO

### **Fase 1: Core (MVP)**
- [ ] Autenticación multi-tenant
- [ ] Dashboard principal
- [ ] Módulo de documentos (integración Parse)
- [ ] Vista de facturas con estados
- [ ] Perfil de usuario

### **Fase 2: Funcionalidades Principales**
- [ ] Módulo de pagos
- [ ] Módulo de órdenes de compra
- [ ] Pipeline/Kanban de estados
- [ ] Virtualización de documentos (Axioma Docs)
- [ ] Exportación a Excel/CSV

### **Fase 3: Comunicaciones**
- [ ] Chat interno
- [ ] Integración WhatsApp
- [ ] Notificaciones push
- [ ] Email automático
- [ ] Panel de comunicaciones

### **Fase 4: Administración**
- [ ] Panel de control admin
- [ ] Gestión de usuarios
- [ ] Permisos granulares
- [ ] Reportes y analytics
- [ ] Notificaciones masivas

### **Fase 5: Optimizaciones**
- [ ] Performance optimization
- [ ] Mobile app (opcional)
- [ ] Búsqueda avanzada
- [ ] BI/Analytics dashboard
- [ ] Integraciones adicionales

---

## 📚 DOCUMENTACIÓN

Para más detalles, consultar:

- **[DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md)** - Sistema de diseño y componentes
- **[MODULES.md](./docs/MODULES.md)** - Detalle de cada módulo
- **[DOCUMENT_FLOW.md](./docs/DOCUMENT_FLOW.md)** - Flujo de documentos y estados
- **[MULTI_TENANT.md](./docs/MULTI_TENANT.md)** - Arquitectura multi-tenant
- **[PARSE_INTEGRATION.md](./docs/PARSE_INTEGRATION.md)** - Integración con Parse
- **[WIREFRAMES.md](./docs/WIREFRAMES.md)** - Diseños de pantallas
- **[TECHNICAL_SPECS.md](./docs/TECHNICAL_SPECS.md)** - Especificaciones técnicas

---

## 🎯 DIFERENCIADORES CLAVE

1. **IA-First**: Parse hace el trabajo pesado
2. **UX Superior**: 1 click vs múltiples formularios
3. **Multi-Tenant Real**: 1 usuario, N empresas
4. **Omnicanal**: WhatsApp, push, email, chat
5. **Visual**: Kanban/Pipeline vs tabla simple
6. **Flexible**: Cualquier formato de imagen
7. **Roles Duales**: Proveedor Y cliente simultáneamente

---

## 📞 CONTACTO

Desarrollado por AXIOMA
