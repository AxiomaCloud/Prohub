# ProHub - Instrucciones de Desarrollo

Este es el README técnico de desarrollo. Para la documentación completa del proyecto, ver `/docs/README.md`.

## 🚀 Setup Completado

El proyecto está configurado con:

- ✅ Next.js 14+ con App Router
- ✅ React 18+ con TypeScript
- ✅ Tailwind CSS con paleta de colores AXIOMA
- ✅ Prisma ORM
- ✅ ESLint configurado
- ✅ Todas las dependencias instaladas

## 📦 Dependencias Instaladas

### Core
- `next` - Framework
- `react` & `react-dom` - UI Library
- `typescript` - Type Safety

### UI y Styling
- `tailwindcss` - CSS Framework
- `class-variance-authority` - Variantes de componentes
- `clsx` & `tailwind-merge` - Utilidades de CSS
- `lucide-react` - Iconos

### Formularios y Validación
- `react-hook-form` - Manejo de formularios
- `zod` - Validación de schemas
- `@hookform/resolvers` - Integración RHF + Zod

### Data Fetching
- `swr` - Data fetching y caché
- `axios` - HTTP client

### Autenticación
- `jose` - JWT
- `bcryptjs` - Hash de passwords

### Base de Datos
- `@prisma/client` - Prisma Client
- `prisma` - Prisma CLI (dev)

### Utilidades
- `date-fns` - Manipulación de fechas

## 🏃 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo en http://localhost:3000

# Producción
npm run build        # Build para producción
npm start            # Inicia servidor de producción

# Linting
npm run lint         # Ejecuta ESLint
```

## 🗄️ Base de Datos (Prisma)

### Configurar Base de Datos

1. Actualiza `.env.local` con tu connection string:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/prohub"
```

2. Copia el schema completo de `/docs/TECHNICAL_SPECS.md` a `prisma/schema.prisma`

3. Ejecuta las migraciones:
```bash
npx prisma migrate dev --name init
```

4. Genera el Prisma Client:
```bash
npx prisma generate
```

5. (Opcional) Abre Prisma Studio:
```bash
npx prisma studio
```

## 🎨 Sistema de Diseño

Los colores de AXIOMA están configurados en `tailwind.config.ts`:

```tsx
// Ejemplo de uso
<div className="bg-sidebar text-primary">
  <h1 className="text-text-primary">Título</h1>
</div>
```

### Colores Disponibles
- `sidebar` - #352151 (Púrpura oscuro)
- `primary` - #FCE5B7 (Crema)
- `secondary` - #8E6AAA (Púrpura)
- `accent` - #F1ABB5 (Rosa)
- `background` - #FAFAFA
- `text-primary`, `text-secondary`, `text-light`
- `danger`, `success`, `warning`

Ver `/docs/DESIGN_SYSTEM.md` para más detalles.

## 📁 Estructura de Carpetas

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Layout root
│   ├── page.tsx           # Página principal
│   └── globals.css        # Estilos globales
├── components/            # Componentes React
│   └── ui/               # Componentes UI reutilizables (crear)
├── lib/                   # Librerías y utilidades
│   └── utils.ts          # Funciones helper
├── contexts/              # React Contexts
├── hooks/                 # Custom Hooks
└── types/                 # TypeScript types

prisma/
└── schema.prisma         # Schema de base de datos

docs/                      # Documentación completa del proyecto
.claude/                   # Contexto para Claude Code
```

## 🔄 Próximos Pasos

Ver `.claude/NEXT_STEPS.md` para el plan detallado de desarrollo.

### Fase 1: Componentes UI
Implementar componentes base siguiendo `/docs/DESIGN_SYSTEM.md`:
- Button
- Card
- Input
- Select
- Badge
- Modal
- Table

### Fase 2: Autenticación
Implementar sistema multi-tenant siguiendo `/docs/MULTI_TENANT.md`

### Fase 3: Módulos
Desarrollar módulos según `/docs/MODULES.md`

## 📚 Documentación

Toda la documentación del proyecto está en `/docs/`:

- `README.md` - Visión general del proyecto
- `TECHNICAL_SPECS.md` - Especificaciones técnicas completas
- `DESIGN_SYSTEM.md` - Sistema de diseño
- `MULTI_TENANT.md` - Arquitectura multi-tenant
- `PARSE_INTEGRATION.md` - Integración con Parse
- `MODULES.md` - Detalle de módulos
- `DOCUMENT_FLOW.md` - Flujo de documentos
- `WIREFRAMES.md` - Diseños de pantallas

## ⚠️ Variables de Entorno

Configura todas las variables en `.env.local` antes de empezar:

- `DATABASE_URL` - Connection string de PostgreSQL
- `JWT_SECRET` - Secret para JWT (cambiar en producción)
- Credenciales de AWS S3
- Credenciales de Parse API
- Credenciales de WhatsApp Business API (opcional para MVP)

## 🧪 Testing (Próximamente)

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 🚀 Deploy (Próximamente)

Ver `.claude/ROADMAP.md` Fase 10 para instrucciones de deployment.

---

**Desarrollado por AXIOMA**
