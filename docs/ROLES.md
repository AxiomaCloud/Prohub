# ARQUITECTURA DE ROLES - HUB

Sistema de roles y permisos para el portal de proveedores.

---

## 🎯 OBJETIVO

Definir una arquitectura de roles flexible que soporte:
- **Usuario Empresa**: Empleados del cliente que gestionan proveedores
- **Usuario Proveedor**: Proveedores que suben documentos y ven pagos
- **Usuario Cliente** (Futuro): Para roles duales (proveedor Y cliente)

---

## 👥 ROLES PRINCIPALES

### 1. ROL EMPRESA (Cliente)

Empleados de la empresa que usa HUB para gestionar sus proveedores.

#### Subroles:

| Subrol | Descripción | Permisos |
|--------|-------------|----------|
| **Admin Empresa** | Administrador total | Todos los permisos |
| **Aprobador** | Aprueba/rechaza documentos | Ver, aprobar, rechazar, comentar |
| **Consulta** | Solo lectura | Ver documentos, ver pagos, ver reportes |
| **Pagador** | Gestiona pagos | Ver docs aprobados, emitir pagos, subir retenciones |

#### Permisos Detallados:

```typescript
interface PermisosEmpresa {
  // Documentos
  ver_documentos_todos: boolean;           // Ver docs de todos los proveedores
  aprobar_documentos: boolean;             // Aprobar/Rechazar
  comentar_documentos: boolean;            // Agregar comentarios
  configurar_campos_adicionales: boolean;  // Config campos custom

  // Pagos
  ver_pagos: boolean;                      // Ver pagos emitidos
  emitir_pagos: boolean;                   // Crear nuevos pagos
  subir_retenciones: boolean;              // Upload de certificados

  // Proveedores
  invitar_proveedores: boolean;            // Enviar invitaciones
  aprobar_proveedores: boolean;            // Activar/rechazar alta
  editar_proveedores: boolean;             // Modificar datos
  suspender_proveedores: boolean;          // Desactivar temporalmente

  // Órdenes de Compra
  crear_oc: boolean;                       // Crear nuevas OC
  editar_oc: boolean;                      // Modificar OC
  publicar_oc: boolean;                    // Hacer visible a proveedor

  // Usuarios
  gestionar_usuarios: boolean;             // CRUD de usuarios empresa
  asignar_roles: boolean;                  // Asignar permisos

  // Configuración
  configurar_empresa: boolean;             // Settings generales
  ver_reportes: boolean;                   // Acceso a analytics
  exportar_datos: boolean;                 // Exportar a Excel/CSV

  // Comunicaciones
  enviar_notificaciones_masivas: boolean;  // Enviar pop-ups/emails masivos
  gestionar_comunicaciones: boolean;       // Ver/responder mensajes
}
```

---

### 2. ROL PROVEEDOR

Proveedores que trabajan con una o varias empresas.

#### Subroles:

| Subrol | Descripción | Permisos |
|--------|-------------|----------|
| **Proveedor Principal** | Dueño de la cuenta | Todos los permisos del proveedor |
| **Usuario Proveedor** | Empleado del proveedor | Subir docs, ver pagos, sin editar perfil |
| **Consulta Proveedor** | Solo lectura | Ver documentos propios, ver pagos |

#### Permisos Detallados:

```typescript
interface PermisosProveedor {
  // Documentos
  subir_documentos: boolean;               // Upload de facturas/NC/ND
  ver_mis_documentos: boolean;             // Ver solo mis docs
  editar_documentos_pendientes: boolean;   // Editar antes de aprobar
  comentar_documentos: boolean;            // Agregar comentarios
  adjuntar_archivos_adicionales: boolean;  // Agregar remitos, etc.

  // Pagos
  ver_mis_pagos: boolean;                  // Ver pagos recibidos
  descargar_comprobantes: boolean;         // Descargar recibos/retenciones
  exportar_mis_datos: boolean;             // Exportar a Excel/CSV

  // Órdenes de Compra
  ver_oc_asignadas: boolean;               // Ver OC del cliente
  descargar_oc: boolean;                   // Descargar PDF de OC
  facturar_contra_oc: boolean;             // Vincular factura a OC

  // Perfil
  ver_mi_perfil: boolean;                  // Ver datos propios
  editar_mi_perfil: boolean;               // Modificar datos (según aprobación)
  editar_datos_bancarios: boolean;         // Actualizar CBU/cuenta

  // Comunicaciones
  enviar_mensajes: boolean;                // Contactar al cliente
  ver_notificaciones: boolean;             // Ver alertas
  configurar_notificaciones: boolean;      // Preferencias de notifs
}
```

---

### 3. ROL CLIENTE (Futuro)

Para implementar **roles duales**: un proveedor puede ser cliente de otro.

#### Contexto de Uso:

- Empresa A vende a Empresa B → A es proveedor de B
- Empresa B vende a Empresa A → B es proveedor de A
- Usuario de A necesita:
  - **Como Proveedor**: Subir docs a B
  - **Como Cliente**: Recibir docs de B

#### Permisos:

Combina permisos de **Empresa** y **Proveedor** según contexto activo.

```typescript
interface RolDual {
  contexto_activo: 'proveedor' | 'cliente';
  empresa_id: string;

  // Como Proveedor
  como_proveedor: {
    clientes: string[];  // IDs de empresas a las que provee
    permisos: PermisosProveedor;
  };

  // Como Cliente
  como_cliente: {
    proveedores: string[];  // IDs de proveedores
    permisos: PermisosEmpresa;
  };
}
```

---

## 🔐 MODELO DE DATOS

### Schema Prisma

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password      String   // Hashed
  name          String
  createdAt     DateTime @default(now())

  // Relaciones
  userRoles     UserRole[]
  companies     UserCompany[]  // Multi-empresa

  @@index([email])
}

model Company {
  id            String   @id @default(cuid())
  name          String
  cuit          String   @unique
  type          CompanyType  // CLIENTE | PROVEEDOR
  status        CompanyStatus // ACTIVE | SUSPENDED | PENDING

  // Configuración
  settings      Json?

  // Relaciones
  users         UserCompany[]
  documents     Document[]
  payments      Payment[]

  @@index([cuit, type])
}

enum CompanyType {
  CLIENTE      // Empresa que recibe documentos
  PROVEEDOR    // Empresa que envía documentos
}

enum CompanyStatus {
  PENDING      // Esperando aprobación
  ACTIVE       // Activo
  SUSPENDED    // Suspendido temporalmente
  REJECTED     // Rechazado
}

model UserCompany {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])

  // Rol en esta empresa
  role        Role
  permissions Json?    // Permisos custom por usuario

  // Multi-tenant
  isActive    Boolean  @default(true)

  @@unique([userId, companyId])
  @@index([userId])
  @@index([companyId])
}

enum Role {
  // Roles Empresa
  ADMIN_EMPRESA
  APROBADOR
  CONSULTA_EMPRESA
  PAGADOR

  // Roles Proveedor
  PROVEEDOR_PRINCIPAL
  USUARIO_PROVEEDOR
  CONSULTA_PROVEEDOR
}

model Permission {
  id          String   @id @default(cuid())
  code        String   @unique  // ver_documentos_todos
  name        String             // "Ver todos los documentos"
  description String?
  module      String             // documentos | pagos | proveedores

  @@index([module])
}

model RolePermission {
  id            String     @id @default(cuid())
  role          Role
  permissionId  String
  permission    Permission @relation(fields: [permissionId], references: [id])

  @@unique([role, permissionId])
}
```

---

## 🔄 FLUJOS DE AUTORIZACIÓN

### 1. Login y Selección de Empresa

```
Usuario: juan@empresa.com
  │
  ├─ Login exitoso
  │
  ├─ Buscar UserCompany
  │  ├─ Empresa A (ROL: PROVEEDOR_PRINCIPAL)
  │  ├─ Empresa B (ROL: APROBADOR)
  │  └─ Empresa C (ROL: ADMIN_EMPRESA)
  │
  ├─ Mostrar selector de empresa
  │
  └─ Usuario selecciona Empresa B
     │
     └─ Cargar permisos de ROL: APROBADOR
        ├─ ver_documentos_todos: true
        ├─ aprobar_documentos: true
        ├─ emitir_pagos: false
        └─ ...
```

### 2. Verificación de Permisos (Middleware)

```typescript
// Middleware de autenticación
async function checkPermission(
  userId: string,
  companyId: string,
  permissionCode: string
): Promise<boolean> {
  // 1. Obtener UserCompany
  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: { userId, companyId }
    },
    include: {
      company: true
    }
  });

  if (!userCompany || !userCompany.isActive) {
    return false;
  }

  // 2. Verificar estado de la empresa
  if (userCompany.company.status !== 'ACTIVE') {
    return false;
  }

  // 3. Verificar permiso del rol
  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      role: userCompany.role,
      permission: {
        code: permissionCode
      }
    }
  });

  if (!rolePermission) {
    return false;
  }

  // 4. Verificar permisos custom (override)
  if (userCompany.permissions) {
    const customPerms = userCompany.permissions as any;
    if (permissionCode in customPerms) {
      return customPerms[permissionCode];
    }
  }

  return true;
}
```

### 3. API Route Protection

```typescript
// /api/documents/[id]/approve
export async function POST(req: Request) {
  const session = await getSession();
  const { companyId } = session;

  // Verificar permiso
  const canApprove = await checkPermission(
    session.userId,
    companyId,
    'aprobar_documentos'
  );

  if (!canApprove) {
    return new Response('Forbidden', { status: 403 });
  }

  // Continuar con aprobación...
}
```

---

## 🌐 MULTI-TENANT

### Arquitectura

Cada usuario puede pertenecer a **múltiples empresas** con **roles diferentes**.

```
Usuario: juan@empresa.com
│
├─ Empresa A (Mi empresa - Proveedor)
│  ├─ Rol: PROVEEDOR_PRINCIPAL
│  └─ Acciones: Subir docs, ver mis pagos
│
├─ Empresa B (Cliente de A)
│  ├─ Rol: APROBADOR
│  └─ Acciones: Aprobar docs de proveedores
│
└─ Empresa C (Otro cliente)
   ├─ Rol: CONSULTA_EMPRESA
   └─ Acciones: Solo lectura
```

### Aislamiento de Datos

Todos los datos están aislados por `companyId`:

```typescript
// ❌ Incorrecto - Sin filtro de empresa
const documents = await prisma.document.findMany();

// ✅ Correcto - Con filtro de empresa
const documents = await prisma.document.findMany({
  where: {
    OR: [
      { providerId: companyId },  // Docs que envié
      { clientId: companyId }     // Docs que recibí
    ]
  }
});
```

---

## 🎨 UI POR ROL

### Dashboard - ROL EMPRESA

```
┌────────────────────────────────────────────────────────┐
│ [SIDEBAR]    Panel de Control - Empresa A SA          │
│              ══════════════════════════════            │
│                                                        │
│ Menú:                                                  │
│ • 📊 Dashboard                                         │
│ • 📥 Documentos Recibidos                              │
│ • 💰 Pagos a Proveedores                               │
│ • 📋 Órdenes de Compra                                 │
│ • 👥 Gestionar Proveedores                             │
│ • ⚙️ Configuración                                     │
│ • 📊 Reportes                                          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Dashboard - ROL PROVEEDOR

```
┌────────────────────────────────────────────────────────┐
│ [SIDEBAR]    Mi Empresa SRL                            │
│              ═══════════════                           │
│                                                        │
│ Menú:                                                  │
│ • 📊 Dashboard                                         │
│ • 📄 Mis Documentos                                    │
│ • 💰 Mis Pagos                                         │
│ • 📋 Órdenes de Compra                                 │
│ • 💬 Comunicaciones                                    │
│ • ⚙️ Mi Perfil                                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Switch de Contexto (Rol Dual - Futuro)

```
┌────────────────────────────────────────────────────────┐
│ juan@empresa.com                    [Switch Context]   │
│ Empresa A                                          [▼] │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Selecciona tu contexto:                                │
│                                                        │
│ ┌────────────────────┐  ┌────────────────────┐       │
│ │ 📤 Como Proveedor  │  │ 📥 Como Cliente    │       │
│ │                    │  │                    │       │
│ │ Envío docs a:      │  │ Recibo docs de:    │       │
│ │ • Empresa B        │  │ • Empresa C        │       │
│ │ • Empresa D        │  │ • Empresa E        │       │
│ │                    │  │                    │       │
│ │ [Acceder →]        │  │ [Acceder →]        │       │
│ └────────────────────┘  └────────────────────┘       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Roles Base
- [ ] Schema Prisma con roles
- [ ] CRUD de usuarios
- [ ] CRUD de empresas
- [ ] Asignación de roles

### Fase 2: Permisos
- [ ] Definir permisos por rol
- [ ] Middleware de autorización
- [ ] API route protection
- [ ] Frontend guards

### Fase 3: Multi-Tenant
- [ ] UserCompany relationship
- [ ] Selector de empresa
- [ ] Aislamiento de datos por companyId
- [ ] Switch de contexto

### Fase 4: Rol Dual (Futuro)
- [ ] Contexto proveedor/cliente
- [ ] UI de switch
- [ ] Permisos combinados
- [ ] Data scoping por contexto

---

## 📚 PRÓXIMOS PASOS

Ver también:
- `/docs/PORTAL_DOCUMENTOS_DESIGN.md` - Módulo de documentos
- `/docs/PAGOS_CUENTA_CORRIENTE_DESIGN.md` - Módulo de pagos
- `/docs/ONBOARDING_PROVEEDOR_DESIGN.md` - Alta de proveedores
- `/docs/MULTI_TENANT.md` - Arquitectura multi-tenant existente
