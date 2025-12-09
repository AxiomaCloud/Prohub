# ARQUITECTURA DE ROLES - HUB

Sistema de roles y permisos para la plataforma completa.

---

## 🎯 OBJETIVO

Definir una arquitectura de roles flexible que soporte:
- **Usuario Empresa**: Empleados del cliente que gestionan proveedores
- **Usuario Proveedor**: Proveedores que suben documentos y ven pagos
- **Usuario Cliente**: Clientes que consumen servicios (Oficina Virtual)
- **Usuario Comercial**: Gestores de cartera de clientes (Oficina Virtual)
- **Roles duales**: Un usuario puede tener múltiples roles simultáneamente

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

### 3. ROL CLIENTE (Oficina Virtual)

Cliente que consume servicios de la empresa (software, suscripciones, etc).

#### Subroles:

| Subrol | Descripción | Permisos |
|--------|-------------|----------|
| **Cliente Principal** | Dueño de la cuenta del cliente | Todos los permisos del cliente |
| **Usuario Cliente** | Empleado del cliente | Consultar servicios, facturas, pagos, crear gestiones |
| **Consulta Cliente** | Solo lectura | Ver servicios, facturas, pagos |

#### Permisos Detallados:

```typescript
interface PermisosCliente {
  // Servicios
  ver_mis_servicios: boolean;              // Ver servicios contratados
  ver_detalles_servicios: boolean;         // Ver características y uso
  solicitar_cambios: boolean;              // Solicitar upgrades/downgrades

  // Cuenta
  ver_estado_cuenta: boolean;              // Ver estado general
  ver_limite_credito: boolean;             // Ver límite si aplica

  // Facturas
  ver_mis_facturas: boolean;               // Ver facturas emitidas
  descargar_facturas: boolean;             // Descargar PDFs
  exportar_facturas: boolean;              // Exportar Excel/CSV

  // Pagos
  ver_mis_pagos: boolean;                  // Ver historial de pagos
  pagar_facturas: boolean;                 // Realizar pagos online
  descargar_comprobantes: boolean;         // Descargar recibos

  // Gestiones
  crear_gestiones: boolean;                // Crear tickets/solicitudes
  ver_mis_gestiones: boolean;              // Ver mis gestiones
  comentar_gestiones: boolean;             // Agregar comentarios
  adjuntar_archivos: boolean;              // Adjuntar documentos

  // Asistente IA
  usar_axio: boolean;                      // Acceder a asistente AXIO

  // Perfil
  ver_mi_perfil: boolean;                  // Ver datos de cuenta
  solicitar_cambio_datos: boolean;         // Solicitar modificaciones

  // Comunicaciones
  ver_notificaciones: boolean;             // Ver alertas
  configurar_notificaciones: boolean;      // Preferencias de notifs
  contactar_comercial: boolean;            // Enviar mensajes
}
```

---

### 4. ROL COMERCIAL (Oficina Virtual)

Ejecutivo comercial que gestiona cartera de clientes.

#### Subroles:

| Subrol | Descripción | Permisos |
|--------|-------------|----------|
| **Gerente Comercial** | Administrador del área | Todos los permisos comerciales |
| **Ejecutivo Comercial** | Gestiona su cartera | Ver y editar clientes asignados |
| **Asistente Comercial** | Soporte | Ver clientes, crear gestiones |

#### Permisos Detallados:

```typescript
interface PermisosComercial {
  // Clientes
  ver_mis_clientes: boolean;               // Ver clientes asignados
  ver_todos_clientes: boolean;             // Ver cartera completa
  crear_clientes: boolean;                 // Dar de alta nuevos
  editar_clientes: boolean;                // Modificar datos
  asignar_clientes: boolean;               // Reasignar a otro comercial

  // Servicios y Contratos
  ver_servicios_clientes: boolean;         // Ver servicios contratados
  modificar_servicios: boolean;            // Cambiar planes
  crear_servicios: boolean;                // Contratar nuevos servicios
  cancelar_servicios: boolean;             // Dar de baja
  aplicar_descuentos: boolean;             // Descuentos especiales
  modificar_precios: boolean;              // Ajustar precios

  // Facturas
  ver_facturas_clientes: boolean;          // Ver facturas emitidas
  crear_facturas: boolean;                 // Generar nuevas facturas
  modificar_facturas: boolean;             // Editar facturas (con auditoría)
  anular_facturas: boolean;                // Anular facturas
  crear_nc_nd: boolean;                    // Notas de crédito/débito

  // Cuenta Corriente
  ver_cuenta_corriente: boolean;           // Ver movimientos
  registrar_pagos_manuales: boolean;       // Registrar pagos offline
  modificar_limite_credito: boolean;       // Ajustar límites
  exportar_cc: boolean;                    // Exportar estado de cuenta

  // Gestiones
  ver_gestiones_clientes: boolean;         // Ver tickets de clientes
  atender_gestiones: boolean;              // Responder y resolver
  crear_gestiones: boolean;                // Crear gestiones internas
  asignar_gestiones: boolean;              // Reasignar a otros
  cerrar_gestiones: boolean;               // Marcar como resueltas

  // Reportes
  ver_reportes_cartera: boolean;           // Métricas de cartera
  ver_reportes_facturacion: boolean;       // Reportes de ventas
  exportar_reportes: boolean;              // Exportar datos

  // Comunicaciones
  enviar_emails_clientes: boolean;         // Enviar comunicaciones
  enviar_whatsapp: boolean;                // WhatsApp Business
  ver_historial_comunicaciones: boolean;   // Ver historial

  // Configuración
  configurar_campos_custom: boolean;       // Campos adicionales
  gestionar_usuarios_clientes: boolean;    // CRUD usuarios del cliente
}
```

---

### 5. ROLES DUALES Y MÚLTIPLES

Un usuario puede tener **múltiples roles simultáneamente**.

#### Ejemplos de Combinaciones:

| Usuario | Roles | Casos de Uso |
|---------|-------|--------------|
| Juan Pérez | Comprador + Comercial | Gestiona compras internas Y atiende clientes externos |
| María González | Proveedor + Cliente | Provee servicios a Empresa A Y consume servicios de Empresa B |
| Pedro Ruiz | Aprobador + Comercial | Aprueba compras Y gestiona cartera de clientes |
| Ana Torres | Cliente + Proveedor | Consume HUB como cliente Y provee servicios a otros clientes de HUB |

#### Implementación:

```typescript
interface UsuarioMultiRol {
  userId: string;
  email: string;
  name: string;

  // Roles activos
  roles: {
    // Portal de Compras
    compras?: {
      role: 'SOLICITANTE' | 'APROBADOR' | 'COMPRAS' | 'ADMIN';
      tenantId: string;
      permissions: PermisosCompras;
    };

    // Portal de Proveedores
    proveedor?: {
      role: 'PROVEEDOR_PRINCIPAL' | 'USUARIO_PROVEEDOR';
      companyId: string;
      clientes: string[];  // IDs de empresas a las que provee
      permissions: PermisosProveedor;
    };

    // Oficina Virtual - Cliente
    cliente?: {
      role: 'CLIENTE_PRINCIPAL' | 'USUARIO_CLIENTE';
      accountId: string;
      permissions: PermisosCliente;
    };

    // Oficina Virtual - Comercial
    comercial?: {
      role: 'GERENTE_COMERCIAL' | 'EJECUTIVO_COMERCIAL';
      tenantId: string;
      clientesAsignados?: string[];  // IDs de clientes
      permissions: PermisosComercial;
    };
  };

  // Contexto activo (qué rol está usando en este momento)
  contextoActivo: 'compras' | 'proveedor' | 'cliente' | 'comercial';
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
  // Roles Empresa (Compras)
  ADMIN_EMPRESA
  APROBADOR
  CONSULTA_EMPRESA
  PAGADOR

  // Roles Proveedor
  PROVEEDOR_PRINCIPAL
  USUARIO_PROVEEDOR
  CONSULTA_PROVEEDOR

  // Roles Oficina Virtual - Cliente
  CLIENTE_PRINCIPAL
  USUARIO_CLIENTE
  CONSULTA_CLIENTE

  // Roles Oficina Virtual - Comercial
  GERENTE_COMERCIAL
  EJECUTIVO_COMERCIAL
  ASISTENTE_COMERCIAL
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

### Dashboard - ROL CLIENTE

```
┌────────────────────────────────────────────────────────┐
│ [SIDEBAR]    Mi Oficina Virtual                        │
│              ═══════════════════                       │
│                                                        │
│ Menú:                                                  │
│ • 📊 Dashboard                                         │
│ • 📋 Mis Servicios                                     │
│ • 💳 Mis Facturas                                      │
│ • 💰 Mis Pagos                                         │
│ • 📝 Gestiones                                         │
│ • 🤖 Asistente AXIO                                    │
│ • ⚙️ Mi Perfil                                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Dashboard - ROL COMERCIAL

```
┌────────────────────────────────────────────────────────┐
│ [SIDEBAR]    Panel Comercial                           │
│              ════════════════                          │
│                                                        │
│ Menú:                                                  │
│ • 📊 Dashboard                                         │
│ • 👥 Mis Clientes                                      │
│ • 💳 Facturas                                          │
│ • 📊 Cuenta Corriente                                  │
│ • 📝 Gestiones                                         │
│ • 📄 Contratos                                         │
│ • 📈 Reportes                                          │
│ • ⚙️ Configuración                                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Switch de Contexto (Roles Múltiples)

```
┌──────────────────────────────────────────────────────────────────┐
│ juan@empresa.com                          [Switch Context]   [▼] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Selecciona tu contexto:                                          │
│                                                                  │
│ ┌───────────────────┐  ┌───────────────────┐                   │
│ │ 🛒 Compras        │  │ 📤 Proveedor      │                   │
│ │                   │  │                   │                   │
│ │ Gestiono compras  │  │ Proveo servicios  │                   │
│ │ en Empresa A      │  │ a 3 clientes      │                   │
│ │                   │  │                   │                   │
│ │ [Acceder →]       │  │ [Acceder →]       │                   │
│ └───────────────────┘  └───────────────────┘                   │
│                                                                  │
│ ┌───────────────────┐  ┌───────────────────┐                   │
│ │ 🏢 Mi Cuenta      │  │ 👔 Comercial      │                   │
│ │                   │  │                   │                   │
│ │ Consumo HUB como  │  │ Gestiono cartera  │                   │
│ │ cliente           │  │ de 24 clientes    │                   │
│ │                   │  │                   │                   │
│ │ [Acceder →]       │  │ [Acceder →]       │                   │
│ └───────────────────┘  └───────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Roles Base (Completado)
- [x] Schema Prisma con roles Empresa y Proveedor
- [x] CRUD de usuarios
- [x] CRUD de empresas
- [x] Asignación de roles

### Fase 2: Permisos Base (Completado)
- [x] Definir permisos por rol Empresa/Proveedor
- [x] Middleware de autorización
- [x] API route protection
- [x] Frontend guards

### Fase 3: Multi-Tenant (Completado)
- [x] UserCompany relationship
- [x] Selector de empresa
- [x] Aislamiento de datos por companyId
- [x] Switch de contexto

### Fase 4: Oficina Virtual - Roles Cliente y Comercial (Próxima Iteración)
- [ ] Ampliar enum Role con CLIENTE_* y COMERCIAL_*
- [ ] Definir permisos Cliente
- [ ] Definir permisos Comercial
- [ ] Modelo de datos para Cuentas de Cliente
- [ ] Modelo de datos para Servicios Contratados
- [ ] Middleware para roles Cliente/Comercial
- [ ] API route protection por rol
- [ ] Frontend guards por rol

### Fase 5: Roles Múltiples
- [ ] Un usuario puede tener múltiples roles
- [ ] Switch de contexto entre 4 roles
- [ ] UI mejorada con selector de contexto
- [ ] Permisos combinados según contexto activo
- [ ] Data scoping por contexto y rol

---

## 📚 PRÓXIMOS PASOS

Ver también:
- `/docs/PORTAL_DOCUMENTOS_DESIGN.md` - Módulo de documentos (Proveedores)
- `/docs/PAGOS_DESIGN.md` - Módulo de pagos (Proveedores)
- `/docs/ONBOARDING_PROVEEDOR_DESIGN.md` - Alta de proveedores
- `/docs/OFICINA_VIRTUAL_DESIGN.md` - Portal de Cliente y Panel Comercial (Próxima iteración)
- `/docs/MULTI_TENANT.md` - Arquitectura multi-tenant existente
