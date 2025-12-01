# PRÓXIMOS PASOS - HUB

Plan de acción recomendado para comenzar el desarrollo.

---

## 🎯 FASE 1: SETUP INICIAL (1-2 días)

### 1.1 Inicializar Proyecto Next.js

```bash
npx create-next-app@latest hub --typescript --tailwind --app --src-dir
cd hub
```

**Opciones a seleccionar:**
- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ `src/` directory
- ✅ App Router
- ❌ Customize default import alias

### 1.2 Instalar Dependencias Core

```bash
# UI y Styling
npm install class-variance-authority clsx tailwind-merge lucide-react

# Formularios y Validación
npm install react-hook-form zod @hookform/resolvers

# Data Fetching
npm install swr axios

# Autenticación
npm install jose bcryptjs

# Base de Datos
npm install @prisma/client
npm install -D prisma

# Utilidades
npm install date-fns
```

### 1.3 Configurar Tailwind

Copiar configuración de Parse o usar la de `DESIGN_SYSTEM.md`:

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#352151',
        'sidebar-hover': '#4a2d6b',
        'sidebar-active': '#8E6AAA',
        primary: '#FCE5B7',
        secondary: '#8E6AAA',
        accent: '#F1ABB5',
        background: '#fafafa',
        // ... (ver DESIGN_SYSTEM.md para paleta completa)
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

### 1.4 Configurar Prisma

```bash
npx prisma init
```

Copiar schema completo de `TECHNICAL_SPECS.md` a `prisma/schema.prisma`

### 1.5 Variables de Entorno

Crear `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET_NAME="hub-documents"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Parse Integration
PARSE_API_URL="https://parse.axioma.com/api"
PARSE_API_KEY="..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 🎯 FASE 2: COMPONENTES UI (1-2 días)

### 2.1 Copiar Componentes de Parse

Si tienes acceso al código de Parse:

```bash
cp -r ../parse/src/components/ui ./src/components/ui
```

O implementar desde cero siguiendo `DESIGN_SYSTEM.md`:

- [ ] Button
- [ ] Card
- [ ] Input
- [ ] Select
- [ ] Badge
- [ ] Modal
- [ ] Table
- [ ] Spinner/Loader

### 2.2 Layout Components

- [ ] Sidebar
- [ ] Header
- [ ] TenantSelector
- [ ] UserMenu

---

## 🎯 FASE 3: AUTENTICACIÓN MULTI-TENANT (2-3 días)

### 3.1 Base de Datos

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Opcional: Crear seed data:

```bash
npx prisma db seed
```

### 3.2 API de Autenticación

Implementar endpoints (ver `TECHNICAL_SPECS.md`):

- [ ] `POST /api/auth/register`
- [ ] `POST /api/auth/login`
- [ ] `POST /api/auth/logout`
- [ ] `GET /api/auth/me`

### 3.3 Middleware de Autorización

- [ ] `requireAuth()` - Verifica JWT
- [ ] `requireTenant()` - Verifica tenant access
- [ ] `requireRole()` - Verifica permisos por rol

### 3.4 Contexts de React

- [ ] `AuthContext` - Usuario actual
- [ ] `TenantContext` - Tenant seleccionado

### 3.5 Pantallas de Auth

- [ ] Login (`/login`)
- [ ] Selector de Empresa (post-login)

---

## 🎯 FASE 4: DASHBOARD Y NAVEGACIÓN (1-2 días)

### 4.1 Estructura de Rutas

```
/app
├── (auth)
│   └── login/
│       └── page.tsx
├── (dashboard)
│   ├── layout.tsx
│   ├── page.tsx (dashboard)
│   ├── documentos/
│   ├── facturas/
│   ├── pagos/
│   ├── ordenes-compra/
│   └── comunicaciones/
└── api/
    ├── auth/
    └── tenants/
```

### 4.2 Dashboard Principal

Implementar según `WIREFRAMES.md`:

- [ ] Resumen de KPIs
- [ ] Actividad reciente
- [ ] Documentos pendientes
- [ ] Acciones rápidas

---

## 🎯 FASE 5: MÓDULO DE DOCUMENTOS + PARSE (3-4 días)

### 5.1 Upload de Documentos

- [ ] Componente de drag & drop
- [ ] Validación de formatos (PDF, JPG, PNG, WebP)
- [ ] Upload a S3
- [ ] Crear registro en BD

### 5.2 Integración con Parse

- [ ] Cliente de Parse API (`lib/parse-client.ts`)
- [ ] Cola de trabajos con BullMQ
- [ ] Worker de procesamiento
- [ ] Polling de resultados

### 5.3 WebSocket para Real-Time

- [ ] Socket.io server
- [ ] Notificaciones de progreso
- [ ] Updates de estado

### 5.4 Pantalla de Revisión de Datos

- [ ] Vista previa del documento
- [ ] Formulario con datos extraídos
- [ ] Confirmación y submit

---

## 🎯 FASE 6: VISTA DE FACTURAS (KANBAN) (2-3 días)

### 6.1 Componente Kanban

Implementar según `DOCUMENT_FLOW.md`:

- [ ] Columnas por estado
- [ ] Tarjetas de documentos
- [ ] Drag & drop (para admin)
- [ ] Filtros y búsqueda

### 6.2 Detalle de Documento (Modal)

- [ ] Vista previa (Axioma Docs)
- [ ] Información del documento
- [ ] Timeline de eventos
- [ ] Comentarios
- [ ] Acciones (aprobar, rechazar, etc.)

### 6.3 API de Documentos

- [ ] `GET /api/documents` - Con filtros
- [ ] `GET /api/documents/:id`
- [ ] `PATCH /api/documents/:id/status`
- [ ] `POST /api/documents/:id/comments`

---

## 🎯 FASE 7: MÓDULOS ADICIONALES (4-5 días)

### 7.1 Pagos

- [ ] Dashboard de pagos
- [ ] Lista de pagos recibidos
- [ ] Detalle de pago con documentos
- [ ] Descarga de comprobantes

### 7.2 Órdenes de Compra

- [ ] Lista de OCs
- [ ] Detalle de OC
- [ ] Visor de documentos (Axioma Docs)
- [ ] Vinculación con facturas

### 7.3 Panel de Admin

- [ ] Dashboard de métricas
- [ ] Gestión de usuarios
- [ ] Aprobación de documentos
- [ ] Reportes

---

## 🎯 FASE 8: COMUNICACIONES (3-4 días)

### 8.1 Chat Interno

- [ ] Lista de conversaciones
- [ ] Vista de conversación
- [ ] Enviar mensajes
- [ ] Adjuntar archivos

### 8.2 Notificaciones

- [ ] Sistema de notificaciones push
- [ ] Email automático
- [ ] Templates de emails

### 8.3 WhatsApp (Opcional Fase 1)

- [ ] Integración WhatsApp Business API
- [ ] Envío de notificaciones
- [ ] Recepción de mensajes

---

## 🎯 FASE 9: TESTING Y OPTIMIZACIÓN (2-3 días)

### 9.1 Testing

- [ ] Unit tests (Jest)
- [ ] Integration tests
- [ ] E2E tests (Playwright)

### 9.2 Optimización

- [ ] Caché con Redis
- [ ] Lazy loading
- [ ] Code splitting
- [ ] Image optimization

### 9.3 Mobile Responsive

- [ ] Verificar diseño móvil
- [ ] Touch interactions
- [ ] Navigation móvil

---

## 🎯 FASE 10: DEPLOYMENT (1-2 días)

### 10.1 Preparación

- [ ] Variables de entorno de producción
- [ ] Configurar S3 y Redis en cloud
- [ ] Configurar base de datos managed

### 10.2 Deploy

- [ ] Deploy a Vercel/AWS
- [ ] Verificar funcionalidad
- [ ] Monitoring setup

---

## 📋 ORDEN RECOMENDADO DE IMPLEMENTACIÓN

### Semana 1: Setup y Auth
1. Setup inicial del proyecto
2. Componentes UI básicos
3. Autenticación multi-tenant
4. Dashboard principal

### Semana 2: Documentos + Parse
5. Módulo de documentos
6. Integración con Parse
7. Vista Kanban de facturas

### Semana 3: Módulos Adicionales
8. Pagos
9. Órdenes de Compra
10. Panel de Admin

### Semana 4: Comunicaciones y Polish
11. Comunicaciones
12. Testing
13. Optimización
14. Deployment

---

## ⚠️ RECORDATORIOS IMPORTANTES

1. **Multi-tenant desde el inicio**: Todos los queries deben filtrar por tenantId
2. **Reutilizar componentes de Parse**: No reinventar
3. **Seguir el design system**: Consistencia visual
4. **Testing continuo**: No dejar para el final
5. **Documentar decisiones**: Actualizar este archivo

---

## 🤝 CÓMO USAR ESTA GUÍA

1. **Ir paso a paso**: No saltar fases
2. **Testear cada módulo**: Antes de continuar
3. **Actualizar progreso**: Marcar ✅ cuando completes
4. **Pedir ayuda a Claude**: Referenciar documentación específica

---

**Ejemplo de prompt para Claude:**

```
Estamos en la Fase 3: Autenticación Multi-Tenant.
Necesito que implementes el endpoint POST /api/auth/login
siguiendo las especificaciones de TECHNICAL_SPECS.md
y usando el schema de Prisma de MULTI_TENANT.md
```

---

**Última actualización:** 2025-11-15
