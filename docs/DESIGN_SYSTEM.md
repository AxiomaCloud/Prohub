# SISTEMA DE DISEÑO - ProHub

Sistema de diseño completo basado en AXIOMA Parse para mantener consistencia visual en toda la plataforma.

---

## 🎨 PALETA DE COLORES

### Colores Principales

```css
/* Dark Purple - Color de marca principal */
--sidebar: #352151
--text-primary: #352151

/* Purple - Color secundario */
--secondary: #8E6AAA
--sidebar-active: #8E6AAA

/* Cream/Yellow - Color de acento */
--primary: #FCE5B7
--accent-light: #FCE5B7

/* Pink - Color de acento adicional */
--accent: #F1ABB5

/* Background */
--background: #FAFAFA
```

### Paleta Completa

| Color | Hex | Uso | Preview |
|-------|-----|-----|---------|
| **Palette Dark** | `#352151` | Sidebar, títulos, texto principal | ![#352151](https://via.placeholder.com/100x30/352151/FFFFFF?text=352151) |
| **Palette Purple** | `#8E6AAA` | Botones secundarios, hover states | ![#8E6AAA](https://via.placeholder.com/100x30/8E6AAA/FFFFFF?text=8E6AAA) |
| **Palette Cream** | `#FCE5B7` | Botones primarios, highlights | ![#FCE5B7](https://via.placeholder.com/100x30/FCE5B7/000000?text=FCE5B7) |
| **Palette Pink** | `#F1ABB5` | Acentos, badges | ![#F1ABB5](https://via.placeholder.com/100x30/F1ABB5/000000?text=F1ABB5) |
| **Background** | `#FAFAFA` | Fondo general | ![#FAFAFA](https://via.placeholder.com/100x30/FAFAFA/000000?text=FAFAFA) |

### Colores de Estado

| Estado | Color | Hex |
|--------|-------|-----|
| **Success** | Verde | `#10B981` |
| **Warning** | Amarillo | `#F59E0B` |
| **Danger** | Rojo | `#EF4444` |
| **Info** | Azul | `#3B82F6` |

### Colores de Texto

| Jerarquía | Color | Hex |
|-----------|-------|-----|
| **Primary** | Púrpura oscuro | `#352151` |
| **Secondary** | Gris medio | `#64748B` |
| **Light** | Gris claro | `#94A3B8` |
| **White** | Blanco | `#FFFFFF` |

### Colores de Sidebar

| Elemento | Color | Hex |
|----------|-------|-----|
| **Base** | Púrpura oscuro | `#352151` |
| **Hover** | Púrpura medio | `#4A2D6B` |
| **Active** | Púrpura claro | `#8E6AAA` |

---

## 🔤 TIPOGRAFÍA

### Font Family

**Primary Font:** `Inter`

```css
font-family: 'Inter', system-ui, sans-serif;
```

**Google Fonts Import:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Font Weights

| Weight | Número | Uso |
|--------|--------|-----|
| Light | 300 | Texto secundario, subtítulos |
| Regular | 400 | Texto normal, párrafos |
| Medium | 500 | Botones, labels |
| Semibold | 600 | Subtítulos, headings |
| Bold | 700 | Títulos principales |

### Font Sizes

| Tamaño | rem | px | Line Height | Uso |
|--------|-----|----|--------------|----|
| xs | 0.75rem | 12px | 1rem | Badges, metadatos |
| sm | 0.875rem | 14px | 1.25rem | Texto secundario, labels |
| base | 1rem | 16px | 1.5rem | Texto principal |
| lg | 1.125rem | 18px | 1.75rem | Subtítulos |
| xl | 1.25rem | 20px | 1.75rem | Headings h3 |
| 2xl | 1.5rem | 24px | 2rem | Headings h2 |
| 3xl | 1.875rem | 30px | 2.25rem | Headings h1 |

### Escala Tipográfica

```tsx
// Heading 1
<h1 className="text-3xl font-bold text-text-primary">
  Portal de Proveedores
</h1>

// Heading 2
<h2 className="text-2xl font-semibold text-text-primary">
  Mis Facturas
</h2>

// Heading 3
<h3 className="text-xl font-semibold text-text-primary">
  Documentos Pendientes
</h3>

// Paragraph
<p className="text-base text-text-secondary">
  Texto de párrafo normal con altura de línea 1.5
</p>

// Small text
<span className="text-sm text-text-light">
  Metadata o texto secundario
</span>
```

---

## 📐 SPACING

### Sistema de Espaciado

Basado en múltiplos de 4px (0.25rem):

| Nombre | rem | px | Uso |
|--------|-----|----|----|
| 1 | 0.25rem | 4px | Espaciado mínimo |
| 2 | 0.5rem | 8px | Padding pequeño |
| 3 | 0.75rem | 12px | Spacing interno |
| 4 | 1rem | 16px | Spacing estándar |
| 6 | 1.5rem | 24px | Spacing grande |
| 8 | 2rem | 32px | Secciones |
| 12 | 3rem | 48px | Separación de secciones |
| 16 | 4rem | 64px | Márgenes grandes |

### Ejemplos de Uso

```tsx
// Padding interno de tarjeta
<Card className="p-4">

// Spacing entre elementos
<div className="space-y-4">

// Margen superior
<div className="mt-6">

// Gap en flex/grid
<div className="flex gap-3">
```

---

## 🎨 COMPONENTES UI

Todos los componentes están ubicados en `src/components/ui/` del proyecto Parse y deben ser reutilizados.

### 1. Button

**Variantes:**
- `primary` - Púrpura oscuro con texto crema
- `secondary` - Púrpura claro con texto blanco
- `outline` - Borde púrpura, fondo transparente
- `danger` - Rojo para acciones destructivas
- `ghost` - Sin fondo, solo texto
- `link` - Estilo de enlace

**Tamaños:**
- `sm` - Pequeño (padding: 0.5rem 1rem)
- `md` - Mediano (padding: 0.75rem 1.5rem) [default]
- `lg` - Grande (padding: 1rem 2rem)

**Ejemplo de Uso:**
```tsx
import { Button } from '@/components/ui/Button'

<Button variant="primary" size="md">
  Guardar
</Button>

<Button variant="outline" size="sm">
  Cancelar
</Button>

<Button variant="danger">
  Eliminar
</Button>
```

**Implementación:**
```tsx
// components/ui/Button.tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-sidebar text-primary hover:bg-sidebar-hover',
        secondary: 'bg-secondary text-white hover:bg-secondary-hover',
        outline: 'border-2 border-sidebar text-sidebar hover:bg-sidebar hover:text-white',
        danger: 'bg-danger text-white hover:bg-danger-hover',
        ghost: 'hover:bg-gray-100 text-text-primary',
        link: 'underline-offset-4 hover:underline text-sidebar',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6',
        lg: 'h-13 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)
```

### 2. Card

**Componentes:**
- `Card` - Contenedor principal
- `CardHeader` - Encabezado
- `CardTitle` - Título
- `CardDescription` - Descripción
- `CardContent` - Contenido principal

**Ejemplo:**
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

<Card>
  <CardHeader>
    <CardTitle>Mis Facturas</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Contenido de la tarjeta...</p>
  </CardContent>
</Card>
```

**Estilos:**
```tsx
// components/ui/Card.tsx
export const Card = ({ className, ...props }) => (
  <div
    className={cn(
      'rounded-lg border bg-white shadow-sm',
      className
    )}
    {...props}
  />
)

export const CardHeader = ({ className, ...props }) => (
  <div
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
)

export const CardTitle = ({ className, ...props }) => (
  <h3
    className={cn('text-2xl font-semibold text-text-primary', className)}
    {...props}
  />
)

export const CardContent = ({ className, ...props }) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
)
```

### 3. Input

**Variantes:**
- Text input
- Email
- Password
- Number
- Date
- Con label
- Con error
- Disabled

**Ejemplo:**
```tsx
import { Input } from '@/components/ui/Input'

<Input
  label="Número de Factura"
  type="text"
  placeholder="F-001-00012345"
  error="Campo requerido"
/>
```

**Implementación:**
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = ({ label, error, className, ...props }: InputProps) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <input
        className={cn(
          'flex h-11 w-full rounded-md border border-border bg-white px-3 py-2',
          'text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-sidebar focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-danger focus:ring-danger',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-danger">{error}</p>
      )}
    </div>
  )
}
```

### 4. Select

```tsx
import { Select } from '@/components/ui/Select'

<Select
  label="Estado"
  options={[
    { value: 'PRESENTED', label: 'Presentado' },
    { value: 'IN_REVIEW', label: 'En Revisión' },
    { value: 'APPROVED', label: 'Aprobado' },
  ]}
/>
```

### 5. Badge

**Variantes:**
- `default` - Gris
- `secondary` - Púrpura
- `outline` - Borde
- `destructive` - Rojo

**Estados de Documento:**
```tsx
import { Badge } from '@/components/ui/Badge'

// Presentado
<Badge variant="default">📤 Presentado</Badge>

// En Revisión
<Badge variant="secondary">👀 En Revisión</Badge>

// Aprobado
<Badge className="bg-success text-white">✅ Aprobado</Badge>

// Rechazado
<Badge variant="destructive">❌ Rechazado</Badge>
```

### 6. Modal

```tsx
import { Modal } from '@/components/ui/Modal'

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Detalle de Factura"
  size="lg"
>
  <div>
    Contenido del modal...
  </div>
</Modal>
```

**Tamaños:**
- `sm` - 400px
- `md` - 600px [default]
- `lg` - 800px
- `lgplus` - 900px
- `xl` - 1000px
- `2xl` - 1200px

### 7. Table

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/Table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Número</TableHead>
      <TableHead>Fecha</TableHead>
      <TableHead>Monto</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>F-001</TableCell>
      <TableCell>13/11/2025</TableCell>
      <TableCell>$60,500</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## 🎭 ICONOS

**Biblioteca:** Lucide React

```bash
npm install lucide-react
```

**Iconos Comunes:**
```tsx
import {
  Upload,
  FileText,
  DollarSign,
  ShoppingCart,
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash,
  Plus,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react'

<Upload className="h-5 w-5" />
```

**Tamaños Estándar:**
- `h-4 w-4` - Pequeño (16px)
- `h-5 w-5` - Mediano (20px) [default]
- `h-6 w-6` - Grande (24px)
- `h-8 w-8` - Extra grande (32px)

---

## 🎨 LAYOUT

### Sidebar

**Ancho:**
- Expandido: `256px` (w-64)
- Colapsado: `72px` (w-18)

**Estructura:**
```tsx
<div className="flex h-screen">
  {/* Sidebar */}
  <aside className="w-64 bg-sidebar">
    {/* Logo */}
    <div className="p-6">
      <Logo />
    </div>

    {/* Navigation */}
    <nav className="px-3">
      <NavItem icon={Upload} label="Documentos" href="/documentos" />
      <NavItem icon={FileText} label="Facturas" href="/facturas" />
      {/* ... */}
    </nav>

    {/* User section */}
    <div className="absolute bottom-0 w-full p-4">
      <UserMenu />
    </div>
  </aside>

  {/* Main content */}
  <main className="flex-1 overflow-auto bg-background">
    <div className="p-6">
      {children}
    </div>
  </main>
</div>
```

### Grid System

```tsx
// 2 columnas
<div className="grid grid-cols-2 gap-6">

// 3 columnas
<div className="grid grid-cols-3 gap-4">

// Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

---

## 🎬 ANIMACIONES

### Animaciones Disponibles

```css
/* Fade in */
animation: fade-in 0.2s ease-in-out

/* Slide in */
animation: slide-in 0.3s ease-out

/* Bounce soft */
animation: bounce-soft 0.6s ease-out

/* Slide up out */
animation: slide-up-out 0.3s ease-in forwards

/* Slide down in */
animation: slide-down-in 0.5s ease-out
```

### Uso en Componentes

```tsx
// Fade in al aparecer
<div className="animate-fade-in">

// Slide in desde la izquierda
<div className="animate-slide-in">

// Bounce suave
<button className="hover:animate-bounce-soft">
```

### Transiciones

```tsx
// Transición de color
<button className="transition-colors duration-200">

// Transición de opacidad
<div className="transition-opacity duration-300">

// Transición múltiple
<div className="transition-all duration-200">
```

---

## 📱 RESPONSIVE DESIGN

### Breakpoints

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

### Patrones Mobile-First

```tsx
// Stack en mobile, grid en desktop
<div className="flex flex-col md:grid md:grid-cols-2 gap-4">

// Sidebar colapsable
<aside className="
  fixed inset-y-0 left-0 z-50
  w-64
  transform transition-transform
  lg:relative lg:translate-x-0
  ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
">

// Texto responsive
<h1 className="text-2xl md:text-3xl lg:text-4xl">
```

---

## 🎯 ESTADOS Y FEEDBACK

### Loading States

```tsx
import { Loader2 } from 'lucide-react'

// Spinner
<Loader2 className="h-5 w-5 animate-spin" />

// Skeleton
<div className="h-4 w-full bg-gray-200 rounded animate-pulse" />

// Button loading
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Procesando...
</Button>
```

### Toast Notifications

```tsx
import { toast } from 'sonner'

// Success
toast.success('Documento guardado exitosamente')

// Error
toast.error('Error al procesar el documento')

// Info
toast.info('Procesando documento...')

// Warning
toast.warning('El documento excede el límite de tamaño')
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center p-12 text-center">
  <FileText className="h-16 w-16 text-gray-300 mb-4" />
  <h3 className="text-lg font-medium text-text-primary mb-2">
    No hay documentos
  </h3>
  <p className="text-sm text-text-secondary mb-6">
    Comienza subiendo tu primer documento
  </p>
  <Button>
    <Upload className="mr-2 h-4 w-4" />
    Subir Documento
  </Button>
</div>
```

---

## 🛠️ UTILITIES

### Tailwind Config Completo

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#fafafa',
        sidebar: '#352151',
        'sidebar-hover': '#4a2d6b',
        'sidebar-active': '#8E6AAA',
        primary: '#FCE5B7',
        'primary-hover': '#e6c41d',
        secondary: '#8E6AAA',
        'secondary-hover': '#7a5a95',
        accent: '#F1ABB5',
        'accent-light': '#FCE5B7',
        border: '#e5e7eb',
        'text-primary': '#352151',
        'text-secondary': '#64748b',
        'text-light': '#94a3b8',
        'text-white': '#ffffff',
        danger: '#ef4444',
        'danger-hover': '#dc2626',
        success: '#10b981',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' },
        },
      },
    },
  },
  plugins: [],
}
```

### Global CSS

```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-text-primary font-sans;
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

---

## 📚 RECURSOS

### Archivos de Referencia

Copiar estos archivos de Parse:
- `tailwind.config.js` → Configuración de Tailwind
- `src/app/globals.css` → Estilos globales
- `src/components/ui/` → Todos los componentes UI
- `public/axioma_logo.png` → Logo estándar
- `public/axioma_logo_invertido.png` → Logo invertido

### Dependencias NPM

```json
{
  "dependencies": {
    "tailwindcss": "^3.3.5",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.294.0",
    "sonner": "^1.2.0"
  }
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Setup Inicial
- [ ] Instalar Tailwind CSS
- [ ] Copiar tailwind.config.js de Parse
- [ ] Copiar globals.css
- [ ] Agregar fuente Inter de Google Fonts

### Componentes UI
- [ ] Copiar carpeta `/components/ui/` completa
- [ ] Instalar dependencias (CVA, clsx, etc.)
- [ ] Verificar imports

### Assets
- [ ] Copiar logos de AXIOMA
- [ ] Copiar paleta de colores

### Testing
- [ ] Verificar colores en todos los componentes
- [ ] Testear responsive design
- [ ] Verificar animaciones
- [ ] Validar accesibilidad

---

Esta es la base del sistema de diseño que garantiza consistencia visual con el resto de las aplicaciones AXIOMA.
