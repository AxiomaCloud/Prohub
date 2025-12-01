# 📋 Decisiones de Negocio - Circuitos de Compras

**Proyecto**: Hub - Sistema de Gestión de Compras
**Fecha**: 30 Noviembre 2025
**Estado**: ✅ Confirmado

---

## 🎯 Resumen de Decisiones

Este documento registra las decisiones de negocio tomadas para la implementación del sistema de compras. Estas decisiones simplifican el alcance y definen claramente qué se implementa y qué no.

---

## 1. Niveles de Aprobación

### Decisiones Confirmadas

| Pregunta | Decisión |
|----------|----------|
| ¿Los umbrales son configurables? | ✅ **SÍ** - Configurables por tenant |
| ¿Aprobación secuencial o en cadena? | ✅ **EN CADENA** - Múltiples aprobadores pueden aprobar simultáneamente |
| ¿Hay delegación de aprobaciones? | ✅ **SÍ** - Se implementa delegación (vacaciones, ausencias) |

### Implicaciones Técnicas

```typescript
// Modelo de NivelAprobacion debe incluir:
interface NivelAprobacion {
  tenantId: string;           // Configurable por tenant
  nivel: number;
  montoMinimo: number;
  montoMaximo?: number;

  // Aprobación en cadena
  requiereTodos: boolean;     // false = cualquiera puede aprobar
  aprobadoresSimultaneos: boolean; // true = pueden aprobar en paralelo

  // Delegación
  permiteDelegacion: boolean;
}

// Modelo de Delegación
interface DelegacionAprobacion {
  aprobadorOriginalId: string;
  aprobadorDelegadoId: string;
  fechaInicio: Date;
  fechaFin: Date;
  motivo: string;             // "Vacaciones", "Licencia", etc.
  activa: boolean;
}
```

### Funcionalidades a Implementar

- [x] Configuración de umbrales por tenant
- [x] Aprobación en cadena (paralela)
- [x] Sistema de delegación de aprobaciones
- [x] UI para configurar delegaciones
- [x] Notificaciones a delegados

---

## 2. Retenciones

### Decisión: ❌ NO IMPLEMENTAR

| Aspecto | Decisión |
|---------|----------|
| Cálculo de retenciones | ❌ **NO** - Se calcula en el ERP |
| Certificados de retención | ❌ **NO** - Se genera en el ERP |
| Integración AFIP | ❌ **NO** - No aplica |

### Motivo

> Todo lo relacionado a la factura del proveedor se ejecuta/calcula en el ERP. En Hub solo se sube el documento, se extraen los datos con Parse y se sincronizan con el ERP. Este proceso ya está desarrollado.

### Implicaciones Técnicas

**Se elimina del alcance:**
- Modelo `Retencion`
- Servicio de cálculo de retenciones
- Generador de certificados PDF
- Configuración de regímenes
- ~20 horas de desarrollo eliminadas

**Se mantiene:**
- Carga de factura con Parse
- Extracción de datos con IA
- Sincronización con ERP
- Visualización de estado

### Flujo Simplificado de Facturas

```
Proveedor sube factura → Parse extrae datos → Sync a ERP → ERP calcula retenciones
                                                              ↓
                           Hub muestra estado ← ERP notifica pago
```

---

## 3. Portal Proveedor

### Decisiones Confirmadas

| Pregunta | Decisión |
|----------|----------|
| ¿Cómo se registran proveedores? | ✅ **AUTO-REGISTRO** + confirmación del tenant |
| ¿Pueden cargar facturas? | ✅ **SÍ** - Y asociarlas a OCs pendientes |
| ¿Ven estado de documentos? | ✅ **SÍ** - Todos sus documentos |

### Flujo de Registro de Proveedor

```
1. Proveedor se auto-registra (datos básicos + documentación)
           ↓
2. Sistema notifica al tenant
           ↓
3. Tenant revisa y aprueba/rechaza
           ↓
4. Si aprobado: Proveedor puede crear usuarios adicionales
           ↓
5. Tenant habilita usuarios específicos
```

### Funcionalidades del Portal

**Para el Proveedor:**
- Auto-registro con datos y documentación
- Crear usuarios de su empresa
- Ver solicitudes de cotización recibidas
- Enviar cotizaciones
- Ver OCs recibidas (aceptar/rechazar)
- Subir facturas y asociar a OC
- Ver estado de todos sus documentos
- Ver pagos recibidos

**Para el Tenant (Admin):**
- Aprobar/rechazar proveedores registrados
- Habilitar/deshabilitar usuarios del proveedor
- Ver documentación del proveedor
- Gestionar categorías del proveedor

### Modelo de Datos Ajustado

```typescript
// Proveedor con auto-registro
interface Proveedor {
  // ... datos existentes ...

  // Estado de registro
  estadoRegistro: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  fechaRegistro: Date;
  aprobadoPorId?: string;
  fechaAprobacion?: Date;
  motivoRechazo?: string;

  // Usuarios del proveedor
  usuarios: UsuarioProveedor[];
}

interface UsuarioProveedor {
  id: string;
  proveedorId: string;
  email: string;
  nombre: string;
  cargo?: string;
  activo: boolean;
  habilitadoPorTenant: boolean;  // El tenant lo habilita
}
```

---

## 4. Integración ERP

### Decisiones Confirmadas

| Pregunta | Decisión |
|----------|----------|
| ¿Qué va al ERP? | Requerimientos aprobados, OCs aprobadas, Recepciones, Facturas |
| ¿Quién genera las OCs? | ✅ **EL ERP** - Hub las recibe por sincronización |
| ¿Hay discrepancias? | ❌ **NO** - ERP es fuente de verdad |

### Flujo de Sincronización

```
HUB → ERP (Outbound):
├── Requerimientos APROBADOS
├── Recepciones CONFIRMADAS
└── Facturas CARGADAS (con datos de Parse)

ERP → HUB (Inbound):
├── Órdenes de Compra GENERADAS
├── Estados de OC actualizados
└── Estados de Pago
```

### Implicación Importante: OCs se Generan en ERP

Esto cambia el flujo del Circuito 2 y 4:

**Antes (diseño original):**
```
Requerimiento → Cotización → Hub genera OC → Envía a proveedor
```

**Ahora (ajustado):**
```
Requerimiento → Cotización → Sync a ERP → ERP genera OC → Sync a Hub → Hub notifica proveedor
```

### Modelo Simplificado

```typescript
// OrdenCompra viene del ERP
interface OrdenCompra {
  // ... datos existentes ...

  // Origen
  origenERP: boolean;           // Siempre true
  numeroERP: string;            // Número en Softland
  fechaSyncERP: Date;

  // No se edita en Hub, solo se visualiza y se gestiona estado
}
```

### Tablas de Sincronización

```sql
-- Lo que va al ERP
sync.requerimientos_outbound    -- Requerimientos aprobados
sync.recepciones_outbound       -- Recepciones confirmadas
sync.facturas_outbound          -- Facturas cargadas

-- Lo que viene del ERP
sync.ordenes_compra_inbound     -- OCs generadas
sync.estados_oc_inbound         -- Actualizaciones de estado
sync.pagos_inbound              -- Pagos realizados
```

---

## 5. Flujos Alternativos

### Decisiones Confirmadas

| Pregunta | Decisión |
|----------|----------|
| Proveedor rechaza OC | ✅ Se sincroniza el rechazo con ERP |
| Devoluciones | ⏳ **DIFERIDO** - Documentar para implementar después |
| Cancelaciones parciales de OC | ❌ **NO** - Se cancela completa |

### Flujo de Rechazo de OC

```
1. Proveedor rechaza OC en Hub (con motivo)
           ↓
2. Hub registra rechazo
           ↓
3. Sync envía rechazo al ERP
           ↓
4. ERP actualiza estado
           ↓
5. Hub notifica a Compras del rechazo
```

### Devoluciones (Documentado para Futuro)

> **NOTA**: Este flujo se implementará en una fase posterior.

```
Flujo propuesto (no implementar ahora):

1. Almacén detecta problema en mercadería recibida
2. Crea solicitud de devolución
3. Aprobador autoriza devolución
4. Se genera nota de crédito o reposición
5. Sync con ERP
6. Proveedor recibe notificación
```

### Cancelación de OC

```typescript
// Solo cancelación total
interface CancelacionOC {
  ordenCompraId: string;
  motivo: string;
  canceladoPorId: string;
  fechaCancelacion: Date;

  // No hay cancelación parcial
  // cantidadCancelada: number;  // NO EXISTE
}
```

---

## 📊 Impacto en el Alcance

### Funcionalidades Eliminadas

| Funcionalidad | Horas Ahorradas | Motivo |
|---------------|-----------------|--------|
| Cálculo de retenciones | ~20h | Se hace en ERP |
| Certificados de retención | ~8h | Se genera en ERP |
| Generación de OC en Hub | ~12h | ERP genera OCs |
| Cancelaciones parciales | ~6h | No requerido |
| **Total** | **~46h** | |

### Funcionalidades Agregadas

| Funcionalidad | Horas Estimadas | Motivo |
|---------------|-----------------|--------|
| Delegación de aprobaciones | ~12h | Requerido |
| Auto-registro de proveedores | ~16h | Nuevo flujo |
| Aprobación en cadena | ~8h | Ajuste al modelo |
| Sync de rechazo de OC | ~4h | Nuevo flujo |
| **Total** | **~40h** | |

### Balance Neto

```
Horas eliminadas:  -46h
Horas agregadas:   +40h
─────────────────────────
Diferencia:         -6h (ligeramente menos trabajo)
```

---

## 📅 Actualización de Estimaciones

### Antes (estimación original)
- **Full**: 18 semanas (~700h)
- **MVP**: 8 semanas

### Después (con decisiones)
- **Full**: 17 semanas (~660h)
- **MVP**: 8 semanas (sin cambios)

La reducción es menor porque se agregan funcionalidades (delegación, auto-registro) pero se eliminan otras (retenciones, generación OC).

---

## ✅ Checklist de Confirmación

- [x] Niveles de aprobación configurables por tenant
- [x] Aprobación en cadena (paralela)
- [x] Delegación de aprobaciones
- [x] NO implementar retenciones (ERP las calcula)
- [x] Auto-registro de proveedores
- [x] Proveedores cargan facturas
- [x] OCs se generan en ERP, no en Hub
- [x] NO hay discrepancias (ERP es fuente de verdad)
- [x] Rechazo de OC se sincroniza con ERP
- [x] Devoluciones diferidas a fase posterior
- [x] NO hay cancelaciones parciales de OC

---

## 📝 Notas Adicionales

### Parse y Facturas

El proceso de facturas con Parse **ya está desarrollado**:
1. Proveedor sube factura (PDF/imagen)
2. Parse extrae datos automáticamente
3. Datos se sincronizan con ERP
4. ERP procesa (retenciones, pago, etc.)
5. Hub solo muestra estado

### ERP como Fuente de Verdad

Para evitar conflictos:
- Hub NO modifica datos que vienen del ERP
- Hub solo puede agregar información (comentarios, adjuntos)
- Cualquier cambio de estado viene del ERP
- Si hay duda, el ERP tiene razón

---

## 6. Adjuntos en Requerimientos

### Decisiones Confirmadas

| Aspecto | Decisión |
|---------|----------|
| ¿Se pueden adjuntar archivos? | ✅ **SÍ** - Documentación de especificaciones |
| ¿Límite de archivos? | ✅ **CONFIGURABLE** por tenant |
| ¿Tamaño máximo? | ✅ **CONFIGURABLE** por tenant |
| ¿Formatos permitidos? | ✅ **LISTA CONFIGURABLE** por tenant |

### Propósito

El solicitante adjunta documentación para que el aprobador tenga toda la información necesaria:
- Especificaciones técnicas
- Catálogos de productos
- Imágenes de referencia
- Cotizaciones previas
- Cualquier documento que justifique la compra

### Configuración por Tenant

```typescript
interface ConfiguracionAdjuntos {
  tenantId: string;

  // Límites
  maxArchivos: number;              // Ej: 10
  maxTamanioArchivo: number;        // Bytes. Ej: 10485760 (10MB)
  maxTamanioTotal: number;          // Bytes. Ej: 52428800 (50MB)

  // Formatos permitidos (MIME types)
  formatosPermitidos: string[];     // Ej: ['application/pdf', 'image/jpeg', 'image/png', ...]
}

// Ejemplo de configuración
const configDefault: ConfiguracionAdjuntos = {
  tenantId: 'xxx',
  maxArchivos: 10,
  maxTamanioArchivo: 10 * 1024 * 1024,    // 10 MB
  maxTamanioTotal: 50 * 1024 * 1024,      // 50 MB
  formatosPermitidos: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
};
```

### Flujo de Adjuntos

```
SOLICITANTE                              APROBADOR
     │                                        │
     │ 1. Crea requerimiento                  │
     │ 2. Adjunta documentos                  │
     │    📄 especificaciones.pdf             │
     │    📄 catalogo.pdf                     │
     │    🖼️ imagen-ref.jpg                   │
     │ 3. Envía a aprobación                  │
     │─────────────────────────────────────────▶
     │                                        │
     │                          4. Recibe notificación
     │                          5. Abre requerimiento
     │                          6. Revisa datos
     │                          7. Ve/descarga adjuntos
     │                             👁️ Ver PDF en línea
     │                             ⬇️ Descargar
     │                          8. Aprueba/Rechaza
     │◀─────────────────────────────────────────
     │                                        │
```

### Modelo de Datos

El modelo `Adjunto` ya existe en la especificación. Se agrega la configuración:

```prisma
// En ConfiguracionTenant agregar:
model ConfiguracionTenant {
  // ... campos existentes ...

  // Configuración de adjuntos
  adjuntosMaxArchivos       Int      @default(10)
  adjuntosMaxTamanioArchivo Int      @default(10485760)  // 10 MB
  adjuntosMaxTamanioTotal   Int      @default(52428800)  // 50 MB
  adjuntosFormatosPermitidos String[] @default(["application/pdf", "image/jpeg", "image/png"])
}
```

---

## 7. Parámetros Maestros (Reutilización de Parse)

### Decisión: Consulta Directa a BD de Parse

| Aspecto | Decisión |
|---------|----------|
| ¿De dónde vienen los parámetros? | ✅ **BD de Parse** - Consulta directa |
| ¿Parse tiene API para esto? | ❌ **NO** - No existe aún |
| ¿Parse tiene webhooks? | ❌ **NO** - No existen aún |
| ¿Estrategia temporal? | ✅ **Consulta directa a PostgreSQL** |
| ¿Estrategia futura? | ⏳ APIs + webhooks (a implementar después) |

### Motivo

Parse ya tiene la estructura de `parametros_maestros` y `atributos` que contiene:
- Centros de costos
- Categorías
- Condiciones de pago
- Unidades de medida
- etc.

No tiene sentido duplicar esta información. Hub consultará directamente la BD de Parse.

### Arquitectura Temporal

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                                │
│                                                              │
│  ┌────────────────────┐    ┌────────────────────┐          │
│  │  Schema: parse     │    │  Schema: hub       │          │
│  │                    │    │                    │          │
│  │  parametros_maestros    │  requerimientos    │          │
│  │  atributos         │    │  ordenes_compra    │          │
│  │  ...               │    │  ...               │          │
│  └────────────────────┘    └────────────────────┘          │
│            ▲                         │                      │
│            │                         │                      │
│            │    Consulta directa     │                      │
│            └─────────────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementación en Hub

```typescript
// lib/prisma.ts - Cliente Prisma con acceso a schema parse

// prisma/schema.prisma
// Definir modelos de Parse como "externos" (solo lectura)

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["hub", "parse", "sync"]
}

// Modelo de solo lectura desde Parse
model ParametroMaestro {
  id          String   @id
  tenantId    String   @map("tenant_id")
  tipo        String   // CENTRO_COSTOS, CATEGORIA, etc.
  codigo      String
  nombre      String
  descripcion String?
  activo      Boolean  @default(true)
  orden       Int?
  metadata    Json?

  @@schema("parse")
  @@map("parametros_maestros")
}

model Atributo {
  id                  String   @id
  parametroMaestroId  String   @map("parametro_maestro_id")
  clave               String
  valor               String

  @@schema("parse")
  @@map("atributos")
}
```

### Servicio de Parámetros

```typescript
// services/parametrosMaestros.ts
import { prisma } from '@/lib/prisma';

// Caché en memoria simple (sin Redis por ahora)
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function getParametros(tenantId: string, tipo: string) {
  const cacheKey = `${tenantId}:${tipo}`;

  // Verificar caché
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Consultar BD (schema parse)
  const parametros = await prisma.parametroMaestro.findMany({
    where: {
      tenantId,
      tipo,
      activo: true,
    },
    orderBy: { orden: 'asc' },
  });

  // Guardar en caché
  cache.set(cacheKey, {
    data: parametros,
    expiry: Date.now() + CACHE_TTL,
  });

  return parametros;
}

// Funciones específicas
export const getCentrosCostos = (tenantId: string) =>
  getParametros(tenantId, 'CENTRO_COSTOS');

export const getCategorias = (tenantId: string) =>
  getParametros(tenantId, 'CATEGORIA_COMPRA');

export const getCondicionesPago = (tenantId: string) =>
  getParametros(tenantId, 'CONDICION_PAGO');

export const getUnidadesMedida = (tenantId: string) =>
  getParametros(tenantId, 'UNIDAD_MEDIDA');

// Invalidar caché manualmente (cuando sepamos que cambió algo)
export function invalidarCache(tenantId: string, tipo?: string) {
  if (tipo) {
    cache.delete(`${tenantId}:${tipo}`);
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(tenantId)) {
        cache.delete(key);
      }
    }
  }
}
```

### Hooks de React

```typescript
// hooks/useParametros.ts
import { useQuery } from '@tanstack/react-query';
import { useTenant } from './useTenant';

export function useCentrosCostos() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['parametros', 'centros_costos', tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/parametros/centros-costos`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useCategorias() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ['parametros', 'categorias', tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/parametros/categorias`);
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Uso en componentes
function RequerimientoForm() {
  const { data: centrosCostos, isLoading } = useCentrosCostos();

  if (isLoading) return <Spinner />;

  return (
    <Select name="centroCostos">
      {centrosCostos?.map(cc => (
        <option key={cc.id} value={cc.codigo}>
          {cc.nombre}
        </option>
      ))}
    </Select>
  );
}
```

### Tipos de Parámetros a Reutilizar

| Tipo en Parse | Uso en Hub | Formulario |
|---------------|------------|------------|
| `CENTRO_COSTOS` | Centro de costos del requerimiento | Requerimiento |
| `CATEGORIA_COMPRA` | Clasificación del requerimiento | Requerimiento |
| `CONDICION_PAGO` | Condiciones en OC | OC, Cotización |
| `UNIDAD_MEDIDA` | Unidad de items | Items de Req |
| `PRIORIDAD` | Prioridad del requerimiento | Requerimiento |
| `MONEDA` | Moneda de montos | Todos |
| `TIPO_REVISION` | TI, Obras, Seguridad | Requerimiento |

### Estrategia Futura (Post-MVP)

Cuando tengamos tiempo, mejorar la arquitectura:

1. **Parse expone API REST** para parámetros maestros
2. **Parse envía webhooks** cuando hay cambios
3. **Hub invalida caché** al recibir webhook
4. **Beneficio**: Desacoplamiento, Parse puede cambiar estructura interna

```
FUTURO:
┌─────────┐         ┌─────────┐
│  Parse  │◀──API───│   Hub   │
│         │         │         │
│         │──Hook──▶│         │
└─────────┘         └─────────┘
```

### Checklist

- [x] Hub consulta directamente BD de Parse (schema parse)
- [x] Caché en memoria de 5 minutos
- [x] No se duplican datos
- [x] Hooks de React para selects
- [ ] (Futuro) API en Parse
- [ ] (Futuro) Webhooks de Parse

---

## ✅ Checklist de Confirmación (Actualizado)

- [x] Niveles de aprobación configurables por tenant
- [x] Aprobación en cadena (paralela)
- [x] Delegación de aprobaciones
- [x] NO implementar retenciones (ERP las calcula)
- [x] Auto-registro de proveedores
- [x] Proveedores cargan facturas
- [x] OCs se generan en ERP, no en Hub
- [x] NO hay discrepancias (ERP es fuente de verdad)
- [x] Rechazo de OC se sincroniza con ERP
- [x] Devoluciones diferidas a fase posterior
- [x] NO hay cancelaciones parciales de OC
- [x] **Adjuntos configurables por tenant** (límites, formatos)
- [x] **Parámetros maestros desde BD de Parse** (consulta directa)

---

**Documento creado**: 30 Noviembre 2025
**Última actualización**: 30 Noviembre 2025
**Aprobado por**: [Pendiente]
**Próxima revisión**: Al iniciar desarrollo
