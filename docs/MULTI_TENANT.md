# ARQUITECTURA MULTI-TENANT

Sistema de autenticación y gestión multi-empresa para Hub.

---

## 🎯 PROBLEMA A RESOLVER

**❌ Competencia:**
- Si trabajás con 3 empresas, necesitás 3 usuarios y 3 contraseñas diferentes
- Login/logout repetido para cambiar de empresa
- Gestión de credenciales engorrosa
- No hay visibilidad consolidada

**Ejemplo problemático:**
```
Juan es proveedor de:
- Empresa A → juan_empresaA@proveedor.com / pass123
- Empresa B → juan_empresaB@proveedor.com / pass456
- Empresa C → juan_empresaC@proveedor.com / pass789

3 logins, 3 contraseñas, 3 sesiones separadas
```

**✅ Solución AXIOMA Hub:**
- **1 USUARIO = ACCESO A TODAS TUS EMPRESAS**
- Login único con JWT
- Selector de empresa en el header
- Switch instantáneo sin re-autenticación
- Permisos independientes por tenant
- Datos completamente aislados

**Ejemplo mejorado:**
```
Juan usa:
- juan@proveedor.com / password_unica

Accede a:
- Empresa A (como Proveedor)
- Empresa B (como Proveedor + Cliente)
- Empresa C (como Cliente)

1 login, cambio instantáneo entre empresas
```

---

## 🏗️ ARQUITECTURA

### Modelo de Datos

```
Usuario (User)
  ├─ Email (único globalmente)
  ├─ Password hash
  ├─ Perfil personal
  └─ TenantMemberships (N relaciones)
      │
      ├─ Tenant 1 (Empresa A)
      │   ├─ Role: PROVIDER
      │   └─ Permissions: [cargar_docs, ver_pagos]
      │
      ├─ Tenant 2 (Empresa B)
      │   ├─ Roles: [PROVIDER, CLIENT]
      │   └─ Permissions: [cargar_docs, aprobar_docs]
      │
      └─ Tenant 3 (Empresa C)
          ├─ Role: CLIENT
          └─ Permissions: [aprobar_docs, gestionar_usuarios]
```

### Diagrama de Relaciones

```
┌─────────────────────────────────────────────────┐
│                    User                         │
│  • id                                           │
│  • email (UNIQUE)                               │
│  • password_hash                                │
│  • name                                         │
│  • phone                                        │
├─────────────────────────────────────────────────┤
│  tenantMemberships: TenantMembership[]          │
└───────────────┬─────────────────────────────────┘
                │
                │ 1:N
                ▼
┌─────────────────────────────────────────────────┐
│             TenantMembership                    │
│  • id                                           │
│  • userId                                       │
│  • tenantId                                     │
│  • roles: Role[]                                │
│  • permissions: Permission[]                    │
│  • isActive                                     │
├─────────────────────────────────────────────────┤
│  user: User                                     │
│  tenant: Tenant                                 │
└───────────────┬─────────────────────────────────┘
                │
                │ N:1
                ▼
┌─────────────────────────────────────────────────┐
│                  Tenant                         │
│  • id                                           │
│  • name                                         │
│  • cuit/rut                                     │
│  • settings                                     │
│  • branding                                     │
├─────────────────────────────────────────────────┤
│  memberships: TenantMembership[]                │
│  documents: Document[]                          │
│  purchaseOrders: PurchaseOrder[]                │
└─────────────────────────────────────────────────┘
```

---

## 📊 SCHEMA DE BASE DE DATOS (Prisma)

```prisma
// Usuario global del sistema
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  phone         String?
  avatar        String?
  emailVerified Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relación con tenants
  tenantMemberships TenantMembership[]

  // Actividad
  documentEvents    DocumentEvent[]
  comments          Comment[]

  @@index([email])
}

// Empresa/Organización (Tenant)
model Tenant {
  id          String   @id @default(cuid())
  name        String
  legalName   String
  taxId       String   @unique // CUIT, RUT, etc.
  country     String
  settings    Json     @default("{}")
  branding    Json?    // Logo, colores personalizados
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones
  memberships     TenantMembership[]

  // Como cliente (recibe documentos)
  documentsReceived Document[] @relation("ClientDocuments")
  purchaseOrders    PurchaseOrder[]
  paymentsIssued    Payment[]

  // Como proveedor (envía documentos)
  documentsSent   Document[] @relation("ProviderDocuments")
  paymentsReceived Payment[] @relation("ReceivedPayments")

  @@index([taxId])
  @@index([isActive])
}

// Relación Usuario-Tenant (Membership)
model TenantMembership {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  roles     Role[]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Metadata
  invitedBy String?
  invitedAt DateTime?
  joinedAt  DateTime?

  @@unique([userId, tenantId])
  @@index([userId])
  @@index([tenantId])
}

// Roles disponibles
enum Role {
  // Roles de Proveedor
  PROVIDER              // Puede cargar documentos

  // Roles de Cliente
  CLIENT_VIEWER         // Solo ver documentos
  CLIENT_APPROVER       // Aprobar/rechazar documentos
  CLIENT_ADMIN          // Gestión completa

  // Roles especiales
  SUPER_ADMIN           // Admin global del sistema
}

// Documento con multi-tenant
model Document {
  id              String   @id @default(cuid())
  number          String
  type            DocumentType
  status          DocumentStatus
  amount          Decimal
  taxAmount       Decimal
  totalAmount     Decimal

  // Multi-tenant: Proveedor y Cliente
  providerTenantId String
  providerTenant   Tenant @relation("ProviderDocuments", fields: [providerTenantId], references: [id])

  clientTenantId   String
  clientTenant     Tenant @relation("ClientDocuments", fields: [clientTenantId], references: [id])

  // Usuario que subió (debe ser member del providerTenant)
  uploadedBy       String
  uploader         User   @relation(fields: [uploadedBy], references: [id])

  uploadedAt       DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relaciones
  purchaseOrderId  String?
  purchaseOrder    PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
  timeline         DocumentEvent[]
  comments         Comment[]
  attachments      Attachment[]
  parseData        Json?

  @@unique([number, providerTenantId, clientTenantId])
  @@index([providerTenantId, clientTenantId, status])
  @@index([clientTenantId, status, uploadedAt])
}
```

---

## 🔐 AUTENTICACIÓN Y AUTORIZACIÓN

### Flujo de Login

```
1. Usuario ingresa email + password
   ↓
2. Sistema valida credenciales
   ↓
3. Busca todos los TenantMemberships del usuario
   ↓
4. Genera JWT con:
   - userId
   - Lista de tenants disponibles
   - Roles por tenant
   ↓
5. Retorna JWT + lista de tenants
   ↓
6. Frontend muestra selector de tenant
   ↓
7. Usuario selecciona tenant inicial
   ↓
8. Frontend almacena tenant seleccionado en estado global
```

### Estructura del JWT

```json
{
  "userId": "clx1234567890",
  "email": "juan@proveedor.com",
  "name": "Juan Pérez",
  "tenants": [
    {
      "tenantId": "tenant_empresa_a",
      "tenantName": "Empresa A SA",
      "roles": ["PROVIDER"],
      "membershipId": "mem_123"
    },
    {
      "tenantId": "tenant_empresa_b",
      "tenantName": "Empresa B SRL",
      "roles": ["PROVIDER", "CLIENT_APPROVER"],
      "membershipId": "mem_456"
    },
    {
      "tenantId": "tenant_empresa_c",
      "tenantName": "Empresa C Inc",
      "roles": ["CLIENT_ADMIN"],
      "membershipId": "mem_789"
    }
  ],
  "iat": 1699876543,
  "exp": 1699963000
}
```

### Middleware de Autorización

```typescript
// middleware/auth.ts
export async function requireAuth(req: Request) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) throw new UnauthorizedError()

  const decoded = verifyJWT(token)
  return decoded
}

// middleware/tenant.ts
export async function requireTenant(req: Request) {
  const user = await requireAuth(req)
  const tenantId = req.headers['x-tenant-id'] || req.query.tenantId

  if (!tenantId) throw new BadRequestError('Tenant ID required')

  // Verificar que el usuario pertenece a este tenant
  const membership = user.tenants.find(t => t.tenantId === tenantId)
  if (!membership) throw new ForbiddenError('Not member of this tenant')

  return { user, tenantId, membership }
}

// middleware/permission.ts
export function requireRole(...allowedRoles: Role[]) {
  return async (req: Request) => {
    const { user, membership } = await requireTenant(req)

    const hasRole = membership.roles.some(role =>
      allowedRoles.includes(role)
    )

    if (!hasRole) {
      throw new ForbiddenError('Insufficient permissions')
    }

    return { user, membership }
  }
}
```

### Uso en API Routes

```typescript
// app/api/documents/route.ts
import { requireTenant, requireRole } from '@/middleware'

// Obtener documentos (cualquier rol con acceso al tenant)
export async function GET(req: NextRequest) {
  const { user, tenantId } = await requireTenant(req)

  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { providerTenantId: tenantId },
        { clientTenantId: tenantId }
      ]
    }
  })

  return Response.json(documents)
}

// Aprobar documento (solo aprobadores y admins)
export async function PATCH(req: NextRequest) {
  const { user, membership } = await requireRole(
    Role.CLIENT_APPROVER,
    Role.CLIENT_ADMIN
  )(req)

  // ... lógica de aprobación
}
```

---

## 🎨 INTERFAZ DE USUARIO

### Selector de Tenant (Header)

```
┌────────────────────────────────────────────────────────────┐
│  AXIOMA Hub                                             │
│                                                            │
│  ┌─────────────────────────┐   👤 Juan Pérez          ▼  │
│  │ 🏢 Empresa A SA      ▼  │                              │
│  └─────────────────────────┘                              │
└────────────────────────────────────────────────────────────┘
```

### Dropdown de Tenants

```
┌─────────────────────────────────────────────┐
│  Cambiar Empresa                            │
├─────────────────────────────────────────────┤
│                                             │
│  MIS EMPRESAS (Como Proveedor)              │
│  ─────────────────────────────────          │
│  ☑️ Empresa A SA                            │
│     Proveedor                               │
│     12 docs pendientes                      │
│                                             │
│  ☐ Empresa B SRL                            │
│     Proveedor + Cliente                     │
│     5 docs pendientes, 3 para aprobar       │
│                                             │
│  OTRAS EMPRESAS (Como Cliente)              │
│  ─────────────────────────────────          │
│  ☐ Empresa C Inc                            │
│     Cliente / Admin                         │
│     48 docs para revisar                    │
│                                             │
└─────────────────────────────────────────────┘
```

### Pantalla de Selección Inicial (Post-Login)

```
┌───────────────────────────────────────────────────────────┐
│  Bienvenido, Juan!                                        │
│  Seleccioná la empresa con la que querés trabajar:       │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────┐  ┌─────────────────────┐  │
│  │ 🏢 Empresa A SA          │  │ 🏢 Empresa B SRL    │  │
│  │                          │  │                     │  │
│  │ Rol: Proveedor           │  │ Roles: Proveedor +  │  │
│  │                          │  │        Cliente      │  │
│  │ Actividad reciente:      │  │                     │  │
│  │ • 12 docs presentados    │  │ Actividad reciente: │  │
│  │ • 5 en revisión          │  │ • 5 docs enviados   │  │
│  │ • 2 pagos nuevos         │  │ • 3 para aprobar    │  │
│  │                          │  │ • 1 pago emitido    │  │
│  │ [Acceder →]              │  │ [Acceder →]         │  │
│  └──────────────────────────┘  └─────────────────────┘  │
│                                                           │
│  ┌──────────────────────────┐                            │
│  │ 🏢 Empresa C Inc         │                            │
│  │                          │                            │
│  │ Rol: Cliente / Admin     │                            │
│  │                          │                            │
│  │ Actividad reciente:      │                            │
│  │ • 48 docs para revisar   │                            │
│  │ • 120 docs aprobados     │                            │
│  │ • 15 pagos programados   │                            │
│  │                          │                            │
│  │ [Acceder →]              │                            │
│  └──────────────────────────┘                            │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🔄 SWITCH DE CONTEXTO

### Contexto React

```typescript
// contexts/TenantContext.tsx
interface TenantContextType {
  currentTenant: Tenant | null
  availableTenants: Tenant[]
  switchTenant: (tenantId: string) => Promise<void>
  loading: boolean
}

export const TenantProvider = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([])

  // Cargar tenants desde JWT al montar
  useEffect(() => {
    const user = getUserFromToken()
    setAvailableTenants(user.tenants)

    // Recuperar último tenant usado de localStorage
    const lastTenantId = localStorage.getItem('lastTenantId')
    if (lastTenantId) {
      const tenant = user.tenants.find(t => t.tenantId === lastTenantId)
      if (tenant) setCurrentTenant(tenant)
    } else {
      // Por defecto, primer tenant
      setCurrentTenant(user.tenants[0])
    }
  }, [])

  const switchTenant = async (tenantId: string) => {
    const tenant = availableTenants.find(t => t.tenantId === tenantId)
    if (!tenant) throw new Error('Tenant not found')

    setCurrentTenant(tenant)
    localStorage.setItem('lastTenantId', tenantId)

    // Opcional: Re-fetch datos del nuevo tenant
    // mutate('/api/documents')
    // router.push('/dashboard')
  }

  return (
    <TenantContext.Provider value={{
      currentTenant,
      availableTenants,
      switchTenant,
      loading
    }}>
      {children}
    </TenantContext.Provider>
  )
}

// Hook de uso
export const useTenant = () => {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useTenant must be used within TenantProvider')
  return context
}
```

### Uso en Componentes

```typescript
// components/DocumentList.tsx
import { useTenant } from '@/contexts/TenantContext'

export const DocumentList = () => {
  const { currentTenant } = useTenant()

  const { data: documents } = useSWR(
    currentTenant ? `/api/documents?tenantId=${currentTenant.tenantId}` : null
  )

  return (
    <div>
      <h1>Documentos de {currentTenant?.tenantName}</h1>
      {/* ... */}
    </div>
  )
}
```

### Cliente HTTP con Tenant

```typescript
// lib/api-client.ts
import { getTenantFromContext } from '@/contexts/TenantContext'

export const apiClient = {
  async get(url: string, options = {}) {
    const tenant = getTenantFromContext()

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${getToken()}`,
        'X-Tenant-ID': tenant.tenantId
      }
    })

    return response.json()
  },

  // post, put, delete...
}
```

---

## 👥 ROLES DUALES (Proveedor + Cliente)

### Caso de Uso

**Empresa A** y **Empresa B** trabajan entre sí:
- A le vende a B → A es PROVEEDOR de B
- B le vende a A → B es PROVEEDOR de A

**Usuario de Empresa A** necesita:
- **Como Proveedor**: Enviar facturas a B
- **Como Cliente**: Recibir y aprobar facturas de B

### Implementación

```prisma
model TenantMembership {
  // ...
  roles Role[] // Puede tener múltiples roles
}

enum Role {
  PROVIDER
  CLIENT_VIEWER
  CLIENT_APPROVER
  CLIENT_ADMIN
}
```

### UI para Cambio de Contexto

```
┌─────────────────────────────────────────────┐
│  Empresa A SA                           ▼   │
│  [Modo: PROVEEDOR] [🔄 Cambiar a Cliente]  │
└─────────────────────────────────────────────┘

Menú:
├─ 📤 Mis Facturas Enviadas (a Empresa B)
├─ 💰 Pagos Recibidos
└─ 📞 Comunicaciones
```

Al hacer click en "Cambiar a Cliente":

```
┌─────────────────────────────────────────────┐
│  Empresa A SA                           ▼   │
│  [Modo: CLIENTE] [🔄 Cambiar a Proveedor]  │
└─────────────────────────────────────────────┘

Menú:
├─ 📥 Facturas Recibidas (de Empresa B)
├─ ✅ Aprobar Documentos
├─ 💸 Pagos a Emitir
├─ 👥 Gestionar Proveedores
└─ 📊 Reportes
```

### Contexto de Rol

```typescript
// contexts/RoleContext.tsx
interface RoleContextType {
  currentRole: Role
  availableRoles: Role[]
  switchRole: (role: Role) => void
}

export const RoleProvider = ({ children }) => {
  const { currentTenant } = useTenant()
  const [currentRole, setCurrentRole] = useState<Role>(Role.PROVIDER)

  const availableRoles = currentTenant?.roles || []

  const switchRole = (role: Role) => {
    if (!availableRoles.includes(role)) {
      throw new Error('Role not available')
    }
    setCurrentRole(role)
    localStorage.setItem(`role_${currentTenant.tenantId}`, role)
  }

  return (
    <RoleContext.Provider value={{ currentRole, availableRoles, switchRole }}>
      {children}
    </RoleContext.Provider>
  )
}
```

### Sidebar Dinámico

```typescript
// components/Sidebar.tsx
export const Sidebar = () => {
  const { currentRole } = useRole()

  const menuItems = useMemo(() => {
    if (currentRole === Role.PROVIDER) {
      return [
        { icon: Upload, label: 'Subir Documentos', href: '/documentos/subir' },
        { icon: FileText, label: 'Mis Facturas', href: '/facturas' },
        { icon: DollarSign, label: 'Pagos', href: '/pagos' },
        { icon: ShoppingCart, label: 'Órdenes de Compra', href: '/ordenes' },
        { icon: MessageSquare, label: 'Comunicaciones', href: '/comunicaciones' },
      ]
    }

    if (currentRole === Role.CLIENT_APPROVER || currentRole === Role.CLIENT_ADMIN) {
      return [
        { icon: Inbox, label: 'Facturas Recibidas', href: '/facturas-recibidas' },
        { icon: CheckCircle, label: 'Aprobar Docs', href: '/aprobaciones' },
        { icon: DollarSign, label: 'Emitir Pagos', href: '/pagos/emitir' },
        { icon: Users, label: 'Proveedores', href: '/proveedores' },
        { icon: BarChart, label: 'Reportes', href: '/reportes' },
      ]
    }

    return []
  }, [currentRole])

  return (
    <nav>
      {menuItems.map(item => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  )
}
```

---

## 🔒 AISLAMIENTO DE DATOS

### Queries con Tenant Filter

Todos los queries DEBEN filtrar por tenant para evitar leaks de datos.

```typescript
// ❌ MAL - Sin filtro de tenant
const documents = await prisma.document.findMany()

// ✅ BIEN - Con filtro de tenant
const documents = await prisma.document.findMany({
  where: {
    OR: [
      { providerTenantId: currentTenantId },
      { clientTenantId: currentTenantId }
    ]
  }
})
```

### Middleware de Prisma (Row-Level Security)

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

export const createPrismaClient = (tenantId?: string) => {
  const prisma = new PrismaClient()

  if (tenantId) {
    // Middleware que filtra automáticamente por tenant
    prisma.$use(async (params, next) => {
      // Solo aplicar a modelos multi-tenant
      const multiTenantModels = ['Document', 'PurchaseOrder', 'Payment']

      if (multiTenantModels.includes(params.model || '')) {
        if (params.action === 'findMany' || params.action === 'findFirst') {
          params.args.where = {
            ...params.args.where,
            OR: [
              { providerTenantId: tenantId },
              { clientTenantId: tenantId }
            ]
          }
        }

        if (params.action === 'create' || params.action === 'update') {
          // Asegurar que el tenant es el correcto
          if (params.args.data.providerTenantId !== tenantId &&
              params.args.data.clientTenantId !== tenantId) {
            throw new Error('Invalid tenant')
          }
        }
      }

      return next(params)
    })
  }

  return prisma
}
```

---

## 📊 ONBOARDING DE USUARIOS

### Invitación de Usuarios a Tenant

```typescript
// Flujo de invitación
1. Admin de Tenant invita usuario
   - Ingresa email del usuario
   - Selecciona roles

2. Sistema verifica si usuario existe
   - Si existe: Crea TenantMembership
   - Si no existe: Crea User + TenantMembership

3. Envía email de invitación

4. Usuario acepta invitación
   - Si usuario nuevo: Define contraseña
   - Si usuario existente: Se agrega tenant a su lista
```

### Email de Invitación

```
Asunto: Invitación a Hub - Empresa A SA

Hola Juan!

Ana López te invitó a unirte a Empresa A SA en AXIOMA Hub.

Rol asignado: Proveedor

Con este rol podrás:
• Cargar documentos (facturas, notas de crédito)
• Ver el estado de tus documentos
• Consultar pagos
• Comunicarte con la empresa

[Aceptar Invitación →]

Este link expira en 7 días.
```

### Pantalla de Aceptación

```
┌───────────────────────────────────────────┐
│  Invitación a Empresa A SA                │
├───────────────────────────────────────────┤
│                                           │
│  Ana López te invitó a unirte como        │
│  PROVEEDOR a Empresa A SA                 │
│                                           │
│  Ya tenés una cuenta con: juan@prov.com   │
│                                           │
│  Al aceptar, Empresa A SA se agregará a   │
│  tu lista de empresas disponibles.        │
│                                           │
│  [✅ Aceptar Invitación]  [❌ Rechazar]   │
│                                           │
└───────────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTACIÓN

### Checklist de Desarrollo

#### Fase 1: Autenticación Base
- [ ] Schema de User, Tenant, TenantMembership
- [ ] JWT con lista de tenants
- [ ] Middleware de autenticación
- [ ] Login/Logout

#### Fase 2: Multi-Tenant Context
- [ ] TenantContext en React
- [ ] Selector de tenant en header
- [ ] Persistencia del tenant seleccionado
- [ ] Middleware de autorización por tenant

#### Fase 3: Roles y Permisos
- [ ] Sistema de roles
- [ ] Middleware de permisos
- [ ] Sidebar dinámico según rol
- [ ] Switch de contexto para roles duales

#### Fase 4: Aislamiento de Datos
- [ ] Filtros de tenant en todos los queries
- [ ] Middleware de Prisma (RLS)
- [ ] Tests de aislamiento

#### Fase 5: Invitaciones
- [ ] Sistema de invitaciones
- [ ] Emails de invitación
- [ ] Aceptación/rechazo de invitaciones
- [ ] Gestión de usuarios por tenant

---

## 🎯 TESTING

### Tests de Aislamiento

```typescript
describe('Tenant Isolation', () => {
  it('should not return documents from other tenants', async () => {
    const tenantA = await createTenant({ name: 'Tenant A' })
    const tenantB = await createTenant({ name: 'Tenant B' })

    const docA = await createDocument({ clientTenantId: tenantA.id })
    const docB = await createDocument({ clientTenantId: tenantB.id })

    const userA = await createUser({ tenantId: tenantA.id })

    const docs = await getDocuments(userA.id, tenantA.id)

    expect(docs).toHaveLength(1)
    expect(docs[0].id).toBe(docA.id)
    expect(docs.find(d => d.id === docB.id)).toBeUndefined()
  })

  it('should prevent cross-tenant data access', async () => {
    const userA = { tenantId: 'tenant-a' }
    const docB = { id: 'doc-b', clientTenantId: 'tenant-b' }

    await expect(
      updateDocument(userA, docB.id, { status: 'APPROVED' })
    ).rejects.toThrow('Forbidden')
  })
})
```

---

## 📚 RECURSOS ADICIONALES

- [Next.js Multi-Tenancy Guide](https://nextjs.org/docs)
- [Prisma Row Level Security](https://www.prisma.io/docs)
- [JWT Best Practices](https://auth0.com/blog/jwt-best-practices/)

---

## 🎯 PRÓXIMOS PASOS

Continuar con:
- `/docs/PARSE_INTEGRATION.md` - Integración con Parse
- `/docs/DESIGN_SYSTEM.md` - Sistema de diseño
- `/docs/WIREFRAMES.md` - Diseños completos de UI
