# CONTEXTO DEL PROYECTO - HUB

## 🎯 QUÉ ES PROHUB

HUB es el **Portal de Proveedores de AXIOMA** que revoluciona la gestión de documentos, facturas, órdenes de compra y pagos entre empresas y sus proveedores.

## 🚀 DIFERENCIADORES CLAVE

### 1. IA-First (Integración con Parse)
- **1 CLICK = 1 DOCUMENTO PROCESADO**
- El proveedor sube el archivo (PDF, JPG, PNG, WebP)
- Parse escanea y extrae datos automáticamente con IA
- Proveedor solo confirma (sin formularios manuales)

### 2. Multi-Tenant Inteligente
- **1 USUARIO = ACCESO A N EMPRESAS**
- Login único, switch instantáneo entre empresas
- Sin múltiples contraseñas
- Permisos independientes por tenant

### 3. Roles Duales
- Un usuario puede ser **PROVEEDOR Y CLIENTE** simultáneamente
- Switch de contexto fluido
- Buzones separados

### 4. Pipeline Visual (Kanban)
- Vista tipo Trello/Jira para estados de documentos
- No solo tabla plana
- Timeline de eventos
- Notificaciones en tiempo real

### 5. Omnicanal
- WhatsApp Business integrado
- Email automático
- Push notifications
- Chat en vivo
- SMS (opcional)

### 6. Virtualización de Documentos
- Visor integrado (Axioma Docs)
- Sin necesidad de descargar
- Zoom, rotación, anotaciones

## 📊 ESTADOS DE DOCUMENTOS

1. **PRESENTADO** (Azul) - Recién cargado
2. **EN REVISIÓN** (Amarillo) - Admin revisando
3. **APROBADO** (Verde) - Listo para pago
4. **PAGADO** (Verde oscuro) - Pago emitido
5. **RECHAZADO** (Rojo) - Con motivo de rechazo

## 🏗️ ARQUITECTURA

### Frontend
- Next.js 14+ (App Router)
- React 18+ con TypeScript
- Tailwind CSS v3/v4
- Lucide React (iconos)
- React Hook Form + Zod
- SWR o TanStack Query

### Backend
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- JWT Authentication multi-tenant
- Redis (caché y real-time)

### Integraciones
- **Axioma Parse**: Escaneo de documentos con IA
- **Axioma Docs**: Virtualización de documentos
- **WhatsApp Business API**: Comunicaciones
- **ERP del cliente**: Sincronización de datos

### Infraestructura
- Vercel / AWS / Azure
- AWS S3 (almacenamiento)
- Redis Cloud (caché)
- PostgreSQL managed

## 🎨 DISEÑO

### Paleta de Colores AXIOMA
- Primary Dark: `#352151` (Púrpura oscuro)
- Primary: `#8E6AAA` (Púrpura)
- Accent Yellow: `#FCE5B7` (Crema/amarillo)
- Accent Pink: `#F1ABB5` (Rosa)
- Background: `#FAFAFA` (Gris claro)

### Tipografía
- Font: Inter
- Weights: 300, 400, 500, 600, 700

### Componentes
Reutilizar de Parse:
- Button, Card, Input, Select, Badge, Modal, Table
- Sidebar, Dashboard layouts
- File upload components

## 📦 MÓDULOS PRINCIPALES

1. **Buzón de Documentos** - Carga con Parse
2. **Facturas** - Vista Kanban/Pipeline
3. **Pagos** - Consulta de pagos y retenciones
4. **Órdenes de Compra** - Con Axioma Docs
5. **Comunicaciones** - Omnicanal
6. **Panel de Control** - Admin dashboard

## 🔐 MULTI-TENANT

### Modelo de Datos
- **User**: Email único global
- **Tenant**: Empresa/Organización
- **TenantMembership**: Relación User-Tenant con roles

### Roles
- `PROVIDER`: Puede cargar documentos
- `CLIENT_VIEWER`: Solo ver documentos
- `CLIENT_APPROVER`: Aprobar/rechazar documentos
- `CLIENT_ADMIN`: Gestión completa
- `SUPER_ADMIN`: Admin global

### JWT Structure
```json
{
  "userId": "...",
  "email": "...",
  "tenants": [
    {
      "tenantId": "...",
      "tenantName": "...",
      "roles": ["PROVIDER"],
      "membershipId": "..."
    }
  ]
}
```

## 🔄 FLUJO DE INTEGRACIÓN CON PARSE

1. Usuario sube archivo → S3
2. Sistema crea registro en BD (status: PROCESSING)
3. Envía a cola de Parse (BullMQ + Redis)
4. Worker llama a Parse API
5. Parse analiza documento con IA
6. Sistema recibe datos extraídos
7. Actualiza BD con datos (status: PRESENTED)
8. Notifica al frontend vía WebSocket
9. Usuario revisa y confirma datos
10. Sistema envía documento al cliente

## 📁 ESTRUCTURA DEL PROYECTO

```
hub/
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── documentos/
│   │   │   ├── facturas/
│   │   │   ├── pagos/
│   │   │   ├── ordenes-compra/
│   │   │   ├── comunicaciones/
│   │   │   └── admin/
│   │   └── api/
│   │       ├── auth/
│   │       ├── documents/
│   │       ├── parse-integration/
│   │       └── tenants/
│   ├── components/
│   │   ├── ui/ (de Parse)
│   │   ├── layout/
│   │   ├── documents/
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
├── prisma/schema.prisma
├── docs/ (documentación completa)
└── .claude/ (contexto de Claude)
```

## 🚀 ROADMAP DE DESARROLLO

### Fase 1: Core (MVP)
- [ ] Autenticación multi-tenant
- [ ] Dashboard principal
- [ ] Módulo de documentos (integración Parse)
- [ ] Vista de facturas con estados
- [ ] Perfil de usuario

### Fase 2: Funcionalidades Principales
- [ ] Módulo de pagos
- [ ] Módulo de órdenes de compra
- [ ] Pipeline/Kanban de estados
- [ ] Virtualización de documentos (Axioma Docs)
- [ ] Exportación a Excel/CSV

### Fase 3: Comunicaciones
- [ ] Chat interno
- [ ] Integración WhatsApp
- [ ] Notificaciones push
- [ ] Email automático
- [ ] Panel de comunicaciones

### Fase 4: Administración
- [ ] Panel de control admin
- [ ] Gestión de usuarios
- [ ] Permisos granulares
- [ ] Reportes y analytics
- [ ] Notificaciones masivas

### Fase 5: Optimizaciones
- [ ] Performance optimization
- [ ] Mobile app (opcional)
- [ ] Búsqueda avanzada
- [ ] BI/Analytics dashboard
- [ ] Integraciones adicionales

## 📚 DOCUMENTACIÓN DISPONIBLE

Toda la documentación está en `/docs/`:

- **README.md**: Visión general del proyecto
- **MODULES.md**: Detalle de cada módulo
- **DOCUMENT_FLOW.md**: Flujo de documentos y estados
- **MULTI_TENANT.md**: Arquitectura multi-tenant
- **PARSE_INTEGRATION.md**: Integración con Parse
- **DESIGN_SYSTEM.md**: Sistema de diseño
- **WIREFRAMES.md**: Diseños de pantallas
- **TECHNICAL_SPECS.md**: Especificaciones técnicas completas

## 🎯 PUNTOS CLAVE PARA EL DESARROLLO

1. **Siempre usar multi-tenant**: Todos los queries deben filtrar por tenantId
2. **Reutilizar componentes de Parse**: No reinventar la rueda
3. **Seguir el design system**: Colores, tipografía, espaciado
4. **Implementar Parse desde el principio**: Es el diferenciador clave
5. **Real-time updates**: WebSocket para notificaciones
6. **Mobile-first**: Diseño responsive desde el inicio
7. **Testing**: Unit, integration y E2E tests
8. **Seguridad**: JWT, CORS, validación, rate limiting

## ⚡ COMANDOS ÚTILES PARA CLAUDE

```bash
# Cuando necesites referencia de un módulo
"Lee MODULES.md y explícame el módulo de Facturas"

# Cuando necesites implementar algo
"Basándote en TECHNICAL_SPECS.md, implementa el schema de Prisma"

# Cuando necesites diseño
"Usando DESIGN_SYSTEM.md, crea el componente Button"

# Cuando necesites ver wireframes
"Siguiendo WIREFRAMES.md, implementa la pantalla de login"

# Cuando necesites integración
"Según PARSE_INTEGRATION.md, crea el endpoint de upload"
```

## 📞 CONTACTO

Desarrollado por AXIOMA

**Versión:** 1.0
**Última actualización:** Noviembre 2025
**Estado:** Listo para desarrollo
