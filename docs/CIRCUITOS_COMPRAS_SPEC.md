# 📋 Especificación Técnica Completa: Circuitos de Compras

**Proyecto**: Hub - Sistema de Gestión de Compras
**Versión**: 2.0
**Fecha**: 29 Noviembre 2025
**Estado**: ✅ Especificación Final

---

## 📊 Resumen Ejecutivo

Sistema completo de gestión de compras institucional compuesto por **6 circuitos interconectados**, **79 pasos totales** y **7 roles de usuario**.

### Métricas del Sistema

| Métrica | Valor |
|---------|-------|
| Circuitos | 6 |
| Pasos Totales | 79 |
| Roles/Actores | 7 |
| Formularios UI | 18+ |
| Endpoints API | 45+ |
| Modelos de Datos | 25+ |

---

## 🎭 Roles y Permisos del Sistema

### 1. SOLICITANTE (REQUESTER)
Cualquier empleado que necesita bienes o servicios.

**Permisos:**
- Crear requerimientos de compra
- Ver sus propios requerimientos
- Dar conforme de entrega
- Ver estado de sus pedidos

### 2. APROBADOR (APPROVER)
Supervisor, Gerente o Director según nivel jerárquico y monto.

**Permisos:**
- Ver requerimientos pendientes de su área
- Aprobar/Rechazar requerimientos
- Aprobar/Rechazar facturas sin OC
- Configurar delegaciones

### 3. REVISOR TÉCNICO (TECHNICAL_REVIEWER)
Especialista de TI u Obras/Proyectos.

**Permisos:**
- Ver requerimientos que requieren revisión técnica
- Completar especificaciones técnicas
- Aprobar/Rechazar técnicamente
- Evaluar cotizaciones técnicamente

### 4. COMPRAS (PURCHASER)
Personal del área de Adquisiciones.

**Permisos:**
- Ver todos los requerimientos aprobados
- Crear solicitudes de cotización
- Gestionar cotizaciones de proveedores
- Crear órdenes de compra
- Seleccionar proveedores

### 5. PROVEEDOR (SUPPLIER)
Usuario externo - vendedor/proveedor.

**Permisos:**
- Ver solicitudes de cotización recibidas
- Enviar cotizaciones
- Ver órdenes de compra
- Cargar facturas
- Ver estado de pagos
- Descargar certificados de retención

### 6. PAGO A PROVEEDORES (ACCOUNTS_PAYABLE)
Personal de Tesorería/Pagos.

**Permisos:**
- Recibir y cargar facturas
- Validar factura vs OC vs conforme
- Calcular retenciones
- Generar órdenes de pago
- Ejecutar pagos
- Emitir certificados de retención

### 7. ADMINISTRADOR (ADMIN)
Administrador del sistema.

**Permisos:**
- Configurar niveles de aprobación
- Gestionar usuarios y roles
- Configurar umbrales de montos
- Configurar centros de costos
- Ver reportes y auditoría
- Gestionar catálogo de proveedores

---

## 🔄 Circuito 1: Pedidos y Requerimientos

**Tipo**: Operación Base
**Pasos**: 6
**Actores**: Solicitante, Aprobador, Revisor Técnico, Sistema

### Flujo del Proceso

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Crear      │────▶│  ¿Revisión  │────▶│  Revisión   │────▶│  Aprobación │
│  Requerim.  │     │  Técnica?   │     │  Técnica    │     │  Jerárquica │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                                       │
                           │ NO                                    ▼
                           └──────────────────────────────▶ ┌─────────────┐
                                                           │ Requerim.   │
                                                           │ Aprobado    │
                                                           └─────────────┘
```

### Formulario: Crear Requerimiento

```typescript
interface RequerimientoForm {
  // Datos básicos
  titulo: string;                    // Título descriptivo
  descripcion: string;               // Descripción detallada
  tipoRequerimiento: TipoRequerimiento; // BIEN | SERVICIO | MIXTO

  // Items del requerimiento
  items: RequerimientoItem[];

  // Clasificación
  categoria: string;                 // Categoría del gasto
  centroCostos: string;              // Centro de costos asignado
  proyecto?: string;                 // Proyecto asociado (opcional)

  // Urgencia y fechas
  prioridad: Prioridad;              // BAJA | NORMAL | ALTA | URGENTE
  fechaNecesaria?: Date;             // Fecha requerida de entrega

  // Revisión técnica
  requiereRevisionTecnica: boolean;
  tipoRevision?: TipoRevision;       // TI | OBRAS_PROYECTOS | SEGURIDAD

  // Justificación
  justificacion: string;             // Motivo de la compra

  // Adjuntos
  adjuntos?: Adjunto[];              // Especificaciones, imágenes, etc.
}

interface RequerimientoItem {
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  especificacionesTecnicas?: string;
  montoEstimado?: number;
  moneda: string;                    // ARS | USD
}
```

### Estados del Requerimiento

```typescript
enum EstadoRequerimiento {
  BORRADOR = 'BORRADOR',                    // Creado, no enviado
  PENDIENTE_REVISION_TECNICA = 'PENDIENTE_REVISION_TECNICA',
  EN_REVISION_TECNICA = 'EN_REVISION_TECNICA',
  REVISION_TECNICA_APROBADA = 'REVISION_TECNICA_APROBADA',
  REVISION_TECNICA_RECHAZADA = 'REVISION_TECNICA_RECHAZADA',
  PENDIENTE_APROBACION = 'PENDIENTE_APROBACION',
  EN_APROBACION = 'EN_APROBACION',          // En proceso multinivel
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  EN_COMPRAS = 'EN_COMPRAS',                // Pasó a área de compras
  EN_COTIZACION = 'EN_COTIZACION',
  OC_GENERADA = 'OC_GENERADA',
  EN_ENTREGA = 'EN_ENTREGA',
  ENTREGADO = 'ENTREGADO',
  CERRADO = 'CERRADO',
  CANCELADO = 'CANCELADO'
}
```

### Formulario: Revisión Técnica

```typescript
interface RevisionTecnicaForm {
  requerimientoId: string;

  // Evaluación
  cumpleEspecificaciones: boolean;
  viabilidadTecnica: boolean;

  // Ajustes a especificaciones
  especificacionesAjustadas?: string;
  recomendacionesTecnicas?: string;

  // Decisión
  decision: DecisionRevision;        // APROBADO | RECHAZADO | REQUIERE_CAMBIOS
  observaciones: string;

  // Proveedores sugeridos (opcional)
  proveedoresSugeridos?: string[];
}
```

### Formulario: Aprobación de Requerimiento

```typescript
interface AprobacionRequerimientoForm {
  requerimientoId: string;
  nivelAprobacion: number;           // 1, 2, 3...

  // Verificaciones
  disponibilidadPresupuestaria: boolean;
  justificacionValida: boolean;

  // Decisión
  decision: DecisionAprobacion;      // APROBADO | RECHAZADO | REQUIERE_CAMBIOS
  comentarios?: string;

  // Si requiere cambios
  cambiosSolicitados?: string;
}
```

### Configuración de Niveles de Aprobación

```typescript
interface NivelAprobacion {
  nivel: number;
  montoMinimo: number;
  montoMaximo?: number;              // null = sin límite
  roles: string[];                   // Roles que pueden aprobar
  requiereTodos: boolean;            // Si requiere todos o cualquiera
  descripcion: string;               // "Supervisor", "Gerente", etc.
}

// Ejemplo de configuración:
const nivelesAprobacion: NivelAprobacion[] = [
  {
    nivel: 1,
    montoMinimo: 0,
    montoMaximo: 50000,
    roles: ['RESPONSABLE_SEDE'],
    requiereTodos: false,
    descripcion: 'Responsable de Sede'
  },
  {
    nivel: 2,
    montoMinimo: 50001,
    montoMaximo: 200000,
    roles: ['GERENTE_AREA'],
    requiereTodos: false,
    descripcion: 'Gerente de Área'
  },
  {
    nivel: 3,
    montoMinimo: 200001,
    montoMaximo: null,
    roles: ['DIRECTOR', 'GERENTE_GENERAL'],
    requiereTodos: false,
    descripcion: 'Dirección'
  }
];
```

---

## 🔄 Circuito 2: Compra con Cotización/Licitación

**Tipo**: Tipo de Compra
**Pasos**: 18
**Actores**: Compras, Proveedor, Revisor Técnico, Aprobador

### Flujo del Proceso

```
Requerimiento    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
Aprobado ───────▶│ Crear Solic.  │───▶│ Enviar a      │───▶│ Recibir       │
                 │ Cotización    │    │ Proveedores   │    │ Cotizaciones  │
                 └───────────────┘    └───────────────┘    └───────────────┘
                                                                  │
┌───────────────┐    ┌───────────────┐    ┌───────────────┐      │
│ Generar OC    │◀───│ Aprobación    │◀───│ Selección     │◀─────┘
│               │    │ Final         │    │ Proveedor     │
└───────────────┘    └───────────────┘    └───────────────┘
        │
        ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Entrega       │───▶│ Conforme      │───▶│ Factura       │───▶ Circuito 6
│ Proveedor     │    │ Recepción     │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

### Formulario: Solicitud de Cotización

```typescript
interface SolicitudCotizacionForm {
  // Referencia
  requerimientoId: string;
  numeroSolicitud: string;           // Auto-generado: SC-2025-XXXXX

  // Tipo de proceso
  tipoProceso: TipoProceso;          // COTIZACION | LICITACION_PRIVADA | LICITACION_PUBLICA

  // Contenido de la solicitud
  titulo: string;
  descripcionGeneral: string;
  especificacionesTecnicas: string;

  // Items a cotizar
  items: ItemCotizacion[];

  // Condiciones
  condicionesEntrega: string;
  lugarEntrega: string;
  plazoEntregaRequerido: string;     // "30 días", "Inmediato", etc.
  condicionesPago: string;           // "30 días", "Contado", etc.

  // Fechas del proceso
  fechaPublicacion: Date;
  fechaLimiteCotizacion: Date;
  fechaApertura?: Date;              // Para licitaciones formales

  // Proveedores invitados
  proveedoresInvitados: string[];    // IDs de proveedores

  // Documentos adjuntos
  pliegos?: Adjunto[];               // Para licitaciones
  especificacionesAdjuntas?: Adjunto[];

  // Criterios de evaluación
  criteriosEvaluacion: CriterioEvaluacion[];
}

interface ItemCotizacion {
  numero: number;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  especificaciones?: string;
}

interface CriterioEvaluacion {
  criterio: string;                  // "Precio", "Plazo", "Calidad", etc.
  peso: number;                      // Porcentaje: 40, 30, 30
}
```

### Formulario: Cotización del Proveedor (Portal Proveedor)

```typescript
interface CotizacionProveedorForm {
  solicitudCotizacionId: string;

  // Datos del proveedor (prellenados)
  proveedorId: string;

  // Items cotizados
  itemsCotizados: ItemCotizado[];

  // Totales
  subtotal: number;
  impuestos: number;
  total: number;
  moneda: string;                    // ARS | USD

  // Condiciones ofrecidas
  plazoEntrega: string;              // "15 días hábiles"
  validezOferta: number;             // Días de validez
  condicionesPago: string;           // "30 días", "50% anticipo", etc.
  garantia?: string;                 // Garantía ofrecida

  // Documentación
  cotizacionPDF?: Adjunto;
  especificacionesTecnicas?: Adjunto;
  certificaciones?: Adjunto[];

  // Observaciones
  observaciones?: string;
  exclusiones?: string;              // Qué no incluye
}

interface ItemCotizado {
  itemSolicitudId: string;           // Referencia al item solicitado
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  marca?: string;
  modelo?: string;
  origen?: string;
}
```

### Formulario: Comparativo de Cotizaciones

```typescript
interface ComparativoCotizacionesForm {
  solicitudCotizacionId: string;

  // Cotizaciones recibidas
  cotizaciones: ResumenCotizacion[];

  // Evaluación técnica (si aplica)
  evaluacionTecnica?: {
    cotizacionId: string;
    cumpleEspecificaciones: boolean;
    puntajeTecnico: number;
    observaciones: string;
  }[];

  // Evaluación comercial
  evaluacionComercial: {
    cotizacionId: string;
    puntajePrecio: number;
    puntajePlazo: number;
    puntajeCondiciones: number;
    puntajeTotal: number;
  }[];

  // Selección
  cotizacionSeleccionada: string;    // ID de cotización ganadora
  justificacionSeleccion: string;

  // Proveedores no seleccionados
  motivosNoSeleccion: {
    cotizacionId: string;
    motivo: string;
  }[];
}

interface ResumenCotizacion {
  id: string;
  proveedor: string;
  total: number;
  moneda: string;
  plazoEntrega: string;
  cumpleTecnicamente: boolean;
}
```

### Formulario: Orden de Compra

```typescript
interface OrdenCompraForm {
  // Referencias
  requerimientoId?: string;
  cotizacionId?: string;
  solicitudCotizacionId?: string;

  // Número de OC
  numeroOC: string;                  // Auto: OC-2025-XXXXX

  // Proveedor
  proveedorId: string;
  datosProveedor: {
    razonSocial: string;
    cuit: string;
    direccion: string;
    contacto: string;
    email: string;
    telefono: string;
  };

  // Items de la OC
  items: ItemOC[];

  // Totales
  subtotal: number;
  descuento?: number;
  impuestos: number;
  total: number;
  moneda: string;

  // Condiciones
  condicionesPago: CondicionPago;
  plazoEntrega: string;
  lugarEntrega: string;
  contactoEntrega: string;

  // Anticipo (si aplica)
  requiereAnticipo: boolean;
  montoAnticipo?: number;
  porcentajeAnticipo?: number;
  condicionesAnticipo?: string;

  // Centro de costos
  centroCostos: string;
  proyecto?: string;

  // Observaciones
  observaciones?: string;
  condicionesEspeciales?: string;

  // Adjuntos
  documentosAdjuntos?: Adjunto[];
}

interface ItemOC {
  numero: number;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  precioTotal: number;
  especificaciones?: string;
}

enum CondicionPago {
  CONTADO = 'CONTADO',
  CUENTA_CORRIENTE_15 = 'CUENTA_CORRIENTE_15',
  CUENTA_CORRIENTE_30 = 'CUENTA_CORRIENTE_30',
  CUENTA_CORRIENTE_60 = 'CUENTA_CORRIENTE_60',
  CON_ANTICIPO = 'CON_ANTICIPO',
  SEGUN_CONTRATO = 'SEGUN_CONTRATO'
}
```

### Estados de Orden de Compra

```typescript
enum EstadoOC {
  BORRADOR = 'BORRADOR',
  PENDIENTE_APROBACION = 'PENDIENTE_APROBACION',
  APROBADA = 'APROBADA',
  ENVIADA_PROVEEDOR = 'ENVIADA_PROVEEDOR',
  ACEPTADA_PROVEEDOR = 'ACEPTADA_PROVEEDOR',
  RECHAZADA_PROVEEDOR = 'RECHAZADA_PROVEEDOR',
  PENDIENTE_ANTICIPO = 'PENDIENTE_ANTICIPO',
  ANTICIPO_PAGADO = 'ANTICIPO_PAGADO',
  EN_PROCESO = 'EN_PROCESO',
  ENTREGA_PARCIAL = 'ENTREGA_PARCIAL',
  ENTREGADA = 'ENTREGADA',
  FACTURADA = 'FACTURADA',
  PAGADA = 'PAGADA',
  CERRADA = 'CERRADA',
  CANCELADA = 'CANCELADA'
}
```

---

## 🔄 Circuito 3: Compra con Anticipo

**Tipo**: Tipo de Compra
**Pasos**: 12
**Actores**: Compras, Aprobador, Pago a Proveedores, Proveedor, Solicitante

### Flujo del Proceso

```
OC con Anticipo ──▶ Aprobación ──▶ Factura ──▶ Pago ──▶ Entrega ──▶ Factura ──▶ Pago
                   Anticipo       Anticipo    Anticipo           Saldo      Saldo
```

### Formulario: Configuración de Anticipo

```typescript
interface ConfiguracionAnticipoForm {
  ordenCompraId: string;

  // Tipo de anticipo
  tipoAnticipo: TipoAnticipo;        // PORCENTAJE | MONTO_FIJO

  // Monto
  porcentaje?: number;               // 30, 50, etc.
  montoFijo?: number;
  montoCalculado: number;            // Calculado automáticamente

  // Justificación
  justificacionAnticipo: string;     // Por qué se requiere

  // Condiciones
  condicionesLiberacion: string;     // Cuándo se libera el anticipo
  plazoEntregaPostAnticipo: string;  // "30 días después del anticipo"

  // Garantías
  requiereGarantia: boolean;
  tipoGarantia?: string;             // "Seguro de caución", "Pagaré"
  montoGarantia?: number;
}

enum TipoAnticipo {
  PORCENTAJE = 'PORCENTAJE',
  MONTO_FIJO = 'MONTO_FIJO'
}
```

### Formulario: Aprobación de Anticipo

```typescript
interface AprobacionAnticipoForm {
  ordenCompraId: string;

  // Verificaciones
  justificacionValida: boolean;
  proveedorConfiable: boolean;
  garantiasAdecuadas: boolean;
  presupuestoDisponible: boolean;

  // Decisión
  decision: DecisionAprobacion;
  observaciones?: string;
}
```

---

## 🔄 Circuito 4: Orden de Compra Simple

**Tipo**: Tipo de Compra
**Pasos**: 11
**Actores**: Compras, Proveedor, Solicitante, Sistema

### Características
- Compras bajo umbral de cotización
- Proveedor predefinido o único
- Proceso ágil sin licitación

### Flujo Simplificado

```
Requerimiento ──▶ Selección ──▶ OC Simple ──▶ Proveedor ──▶ Entrega ──▶ Conforme ──▶ Factura
Aprobado         Proveedor                    Acepta                              ↓
                                                                            Circuito 6
```

---

## 🔄 Circuito 5: Factura Directa (Sin OC)

**Tipo**: Tipo de Compra
**Pasos**: 11
**Actores**: Proveedor, Pago a Proveedores, Aprobador, Compras

### Casos de Uso
- Gastos menores urgentes
- Servicios recurrentes (luz, gas, teléfono)
- Reparaciones de emergencia
- Gastos de representación

### Formulario: Carga de Factura Sin OC

```typescript
interface FacturaSinOCForm {
  // Datos de la factura
  numeroFactura: string;
  fechaFactura: Date;
  fechaVencimiento: Date;

  // Proveedor
  proveedorId?: string;              // Si existe en sistema
  proveedorNuevo?: {
    razonSocial: string;
    cuit: string;
    direccion: string;
    email: string;
  };

  // Montos
  subtotal: number;
  iva: number;
  otrosImpuestos?: number;
  total: number;
  moneda: string;

  // Clasificación
  tipoGasto: TipoGasto;
  centroCostos: string;
  proyecto?: string;

  // Justificación (OBLIGATORIA)
  justificacion: string;
  motivoSinOC: MotivoSinOC;

  // Adjuntos
  facturaAdjunta: Adjunto;           // PDF de la factura
  documentacionSoporte?: Adjunto[];  // Remitos, tickets, etc.
}

enum TipoGasto {
  SERVICIOS_PUBLICOS = 'SERVICIOS_PUBLICOS',
  REPARACIONES_URGENTES = 'REPARACIONES_URGENTES',
  GASTOS_MENORES = 'GASTOS_MENORES',
  GASTOS_REPRESENTACION = 'GASTOS_REPRESENTACION',
  VIATICOS = 'VIATICOS',
  OTROS = 'OTROS'
}

enum MotivoSinOC {
  URGENCIA = 'URGENCIA',
  SERVICIO_RECURRENTE = 'SERVICIO_RECURRENTE',
  MONTO_MENOR = 'MONTO_MENOR',
  EXCEPCION_AUTORIZADA = 'EXCEPCION_AUTORIZADA'
}
```

### Formulario: Aprobación de Factura Sin OC

```typescript
interface AprobacionFacturaSinOCForm {
  facturaId: string;

  // Verificaciones
  gastoJustificado: boolean;
  montoRazonable: boolean;
  presupuestoDisponible: boolean;
  documentacionCompleta: boolean;

  // Decisión
  decision: DecisionAprobacion;
  observaciones?: string;

  // Forma de pago sugerida
  formaPagoSugerida: FormaPago;      // TARJETA | TRANSFERENCIA | CHEQUE
}

enum FormaPago {
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
  EFECTIVO = 'EFECTIVO'
}
```

---

## 🔄 Circuito 6: Pago a Proveedores

**Tipo**: Transversal
**Pasos**: 16
**Actores**: Pago a Proveedores, Compras, Aprobador, Proveedor

### Flujo del Proceso

```
Recepción    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
Factura ────▶│ ¿Tiene OC?    │───▶│ Validación    │───▶│ Aprobación    │
             │               │ SÍ │ Tripartita    │    │ Factura       │
             └───────────────┘    └───────────────┘    └───────────────┘
                    │ NO                                      │
                    ▼                                         ▼
             ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
             │ Circuito 5    │    │ Cálculo       │◀───│               │
             │ (Aprobación)  │    │ Retenciones   │    │               │
             └───────────────┘    └───────────────┘    └───────────────┘
                                         │
                                         ▼
             ┌───────────────┐    ┌───────────────┐    ┌───────────────┐
             │ Notificación  │◀───│ Ejecución     │◀───│ Orden de      │
             │ Proveedor     │    │ Pago          │    │ Pago          │
             └───────────────┘    └───────────────┘    └───────────────┘
                    │
                    ▼
             ┌───────────────┐
             │ Certificados  │
             │ Retención     │
             └───────────────┘
```

### Formulario: Carga de Factura

```typescript
interface CargaFacturaForm {
  // Datos básicos
  numeroFactura: string;
  tipoComprobante: TipoComprobante;  // FACTURA_A | FACTURA_B | FACTURA_C | etc.
  puntoVenta: string;
  fechaEmision: Date;
  fechaVencimiento: Date;

  // Proveedor
  proveedorId: string;
  cuitProveedor: string;

  // Referencia a OC (si existe)
  tieneOC: boolean;
  numeroOC?: string;
  ordenCompraId?: string;

  // Montos
  netoGravado: number;
  netoNoGravado?: number;
  netoExento?: number;
  iva21?: number;
  iva105?: number;
  iva27?: number;
  percepcionIVA?: number;
  percepcionIIBB?: number;
  percepcionGanancias?: number;
  otrosImpuestos?: number;
  total: number;
  moneda: string;
  tipoCambio?: number;               // Si es en USD

  // Adjuntos
  facturaAdjunta: Adjunto;

  // Validación AFIP
  cae?: string;
  fechaVencimientoCAE?: Date;
}

enum TipoComprobante {
  FACTURA_A = 'FACTURA_A',
  FACTURA_B = 'FACTURA_B',
  FACTURA_C = 'FACTURA_C',
  FACTURA_E = 'FACTURA_E',           // Exportación
  NOTA_CREDITO_A = 'NOTA_CREDITO_A',
  NOTA_CREDITO_B = 'NOTA_CREDITO_B',
  NOTA_DEBITO_A = 'NOTA_DEBITO_A',
  NOTA_DEBITO_B = 'NOTA_DEBITO_B',
  RECIBO = 'RECIBO'
}
```

### Formulario: Validación Tripartita

```typescript
interface ValidacionTripartitaForm {
  facturaId: string;
  ordenCompraId: string;
  conformeEntregaId: string;

  // Validación OC vs Factura
  validacionOC: {
    proveedorCoincide: boolean;
    montoCoincide: boolean;
    itemsCoinciden: boolean;
    discrepancias?: string;
  };

  // Validación Conforme vs Factura
  validacionConforme: {
    existeConforme: boolean;
    cantidadesCoinciden: boolean;
    fechaEntregaValida: boolean;
    discrepancias?: string;
  };

  // Resultado
  validacionExitosa: boolean;
  observaciones?: string;
  accionRequerida?: AccionValidacion;
}

enum AccionValidacion {
  APROBAR = 'APROBAR',
  RECHAZAR = 'RECHAZAR',
  SOLICITAR_NOTA_CREDITO = 'SOLICITAR_NOTA_CREDITO',
  SOLICITAR_CORRECCION = 'SOLICITAR_CORRECCION'
}
```

### Formulario: Cálculo de Retenciones

```typescript
interface CalculoRetencionesForm {
  facturaId: string;
  proveedorId: string;

  // Datos para cálculo
  montoBase: number;

  // Retenciones calculadas
  retenciones: Retencion[];

  // Totales
  totalRetenciones: number;
  montoNeto: number;                 // Total - Retenciones
}

interface Retencion {
  tipo: TipoRetencion;
  regimen: string;                   // Régimen aplicable
  alicuota: number;                  // Porcentaje
  baseCalculo: number;
  montoRetenido: number;
  certificadoNumero?: string;        // Se genera al pagar
}

enum TipoRetencion {
  GANANCIAS = 'GANANCIAS',
  IVA = 'IVA',
  IIBB_CABA = 'IIBB_CABA',
  IIBB_PBA = 'IIBB_PBA',
  IIBB_OTRAS = 'IIBB_OTRAS',
  SUSS = 'SUSS'
}
```

### Formulario: Orden de Pago

```typescript
interface OrdenPagoForm {
  // Número auto-generado
  numeroOP: string;                  // OP-2025-XXXXX

  // Facturas incluidas
  facturas: {
    facturaId: string;
    numeroFactura: string;
    montoBruto: number;
    retenciones: number;
    montoNeto: number;
  }[];

  // Proveedor
  proveedorId: string;
  datosBancarios: {
    banco: string;
    tipoCuenta: string;
    cbu: string;
    alias?: string;
  };

  // Totales
  totalBruto: number;
  totalRetenciones: number;
  totalNeto: number;
  moneda: string;

  // Forma de pago
  formaPago: FormaPago;
  fechaProgramada: Date;

  // Aprobaciones
  aprobadoPor?: string;
  fechaAprobacion?: Date;
}
```

### Formulario: Conforme de Entrega (Recepción)

```typescript
interface ConformeEntregaForm {
  // Referencias
  ordenCompraId: string;
  requerimientoId?: string;

  // Número auto-generado
  numeroConforme: string;            // REC-2025-XXXXX

  // Datos de recepción
  fechaRecepcion: Date;
  recibidoPor: string;               // ID del usuario

  // Items recibidos
  itemsRecibidos: ItemRecibido[];

  // Evaluación
  tipoRecepcion: TipoRecepcion;      // TOTAL | PARCIAL
  conformidad: Conformidad;          // CONFORME | NO_CONFORME | PARCIAL

  // Documentación del proveedor
  numeroRemito?: string;
  remitoAdjunto?: Adjunto;

  // Observaciones
  observaciones?: string;
  discrepancias?: string;

  // Fotos (opcional)
  fotosRecepcion?: Adjunto[];
}

interface ItemRecibido {
  itemOCId: string;
  descripcion: string;
  cantidadOrdenada: number;
  cantidadRecibida: number;
  cantidadPendiente: number;
  estado: EstadoItemRecibido;
  observaciones?: string;
}

enum TipoRecepcion {
  TOTAL = 'TOTAL',
  PARCIAL = 'PARCIAL'
}

enum Conformidad {
  CONFORME = 'CONFORME',
  NO_CONFORME = 'NO_CONFORME',
  PARCIAL = 'PARCIAL'
}

enum EstadoItemRecibido {
  COMPLETO = 'COMPLETO',
  PARCIAL = 'PARCIAL',
  PENDIENTE = 'PENDIENTE',
  RECHAZADO = 'RECHAZADO'
}
```

---

## 📦 Modelo de Datos (Prisma Schema)

```prisma
// ==========================================
// ENUMS
// ==========================================

enum TipoRequerimiento {
  BIEN
  SERVICIO
  MIXTO
}

enum Prioridad {
  BAJA
  NORMAL
  ALTA
  URGENTE
}

enum TipoRevision {
  TI
  OBRAS_PROYECTOS
  SEGURIDAD
  NINGUNA
}

enum EstadoRequerimiento {
  BORRADOR
  PENDIENTE_REVISION_TECNICA
  EN_REVISION_TECNICA
  REVISION_TECNICA_APROBADA
  REVISION_TECNICA_RECHAZADA
  PENDIENTE_APROBACION
  EN_APROBACION
  APROBADO
  RECHAZADO
  EN_COMPRAS
  EN_COTIZACION
  OC_GENERADA
  EN_ENTREGA
  ENTREGADO
  CERRADO
  CANCELADO
}

enum TipoProcesoCotizacion {
  COTIZACION_SIMPLE
  LICITACION_PRIVADA
  LICITACION_PUBLICA
}

enum EstadoSolicitudCotizacion {
  BORRADOR
  PUBLICADA
  EN_RECEPCION
  CERRADA
  EN_EVALUACION
  ADJUDICADA
  DESIERTA
  CANCELADA
}

enum EstadoCotizacion {
  BORRADOR
  ENVIADA
  RECIBIDA
  EN_EVALUACION
  APROBADA_TECNICAMENTE
  RECHAZADA_TECNICAMENTE
  SELECCIONADA
  NO_SELECCIONADA
}

enum EstadoOC {
  BORRADOR
  PENDIENTE_APROBACION
  APROBADA
  ENVIADA_PROVEEDOR
  ACEPTADA_PROVEEDOR
  RECHAZADA_PROVEEDOR
  PENDIENTE_ANTICIPO
  ANTICIPO_PAGADO
  EN_PROCESO
  ENTREGA_PARCIAL
  ENTREGADA
  FACTURADA_PARCIAL
  FACTURADA
  PAGADA_PARCIAL
  PAGADA
  CERRADA
  CANCELADA
}

enum CondicionPago {
  CONTADO
  CUENTA_CORRIENTE_15
  CUENTA_CORRIENTE_30
  CUENTA_CORRIENTE_60
  CON_ANTICIPO
  SEGUN_CONTRATO
}

enum TipoComprobante {
  FACTURA_A
  FACTURA_B
  FACTURA_C
  FACTURA_E
  NOTA_CREDITO_A
  NOTA_CREDITO_B
  NOTA_DEBITO_A
  NOTA_DEBITO_B
  RECIBO
}

enum EstadoFactura {
  BORRADOR
  PENDIENTE_OC
  PENDIENTE_CONFORME
  PENDIENTE_VALIDACION
  VALIDADA
  RECHAZADA
  PENDIENTE_APROBACION
  APROBADA
  EN_PROCESO_PAGO
  PAGADA_PARCIAL
  PAGADA
  ANULADA
}

enum TipoGasto {
  SERVICIOS_PUBLICOS
  REPARACIONES_URGENTES
  GASTOS_MENORES
  GASTOS_REPRESENTACION
  VIATICOS
  OTROS
}

enum FormaPago {
  TARJETA_CREDITO
  TRANSFERENCIA
  CHEQUE
  EFECTIVO
}

enum TipoRetencion {
  GANANCIAS
  IVA
  IIBB_CABA
  IIBB_PBA
  IIBB_OTRAS
  SUSS
}

enum EstadoOrdenPago {
  BORRADOR
  PENDIENTE_APROBACION
  APROBADA
  PROGRAMADA
  EJECUTADA
  ANULADA
}

enum TipoRecepcion {
  TOTAL
  PARCIAL
}

enum Conformidad {
  CONFORME
  NO_CONFORME
  PARCIAL
}

enum DecisionAprobacion {
  APROBADO
  RECHAZADO
  REQUIERE_CAMBIOS
}

// ==========================================
// MODELOS PRINCIPALES
// ==========================================

// Tenant (Multi-empresa)
model Tenant {
  id                    String   @id @default(cuid())
  nombre                String
  cuit                  String   @unique
  direccion             String?
  telefono              String?
  email                 String?
  logo                  String?
  activo                Boolean  @default(true)

  configuracion         ConfiguracionTenant?

  usuarios              User[]
  proveedores           Proveedor[]
  requerimientos        Requerimiento[]
  solicitudesCotizacion SolicitudCotizacion[]
  ordenesCompra         OrdenCompra[]
  facturas              Factura[]
  ordenesPago           OrdenPago[]
  centrosCostos         CentroCostos[]
  nivelesAprobacion     NivelAprobacion[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("tenants")
}

// Configuración del Tenant
model ConfiguracionTenant {
  id                    String   @id @default(cuid())
  tenantId              String   @unique
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  // Umbrales de montos
  umbralCotizacion      Decimal  @db.Decimal(18,2) @default(50000)
  umbralLicitacion      Decimal  @db.Decimal(18,2) @default(500000)
  montoMaximoSinOC      Decimal  @db.Decimal(18,2) @default(10000)

  // Configuración de retenciones
  aplicaRetencionGanancias Boolean @default(true)
  aplicaRetencionIVA       Boolean @default(true)
  aplicaRetencionIIBB      Boolean @default(true)
  jurisdiccionIIBB         String?

  // Configuración de pagos
  diasPagoDefault       Int      @default(30)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("configuraciones_tenant")
}

// Centro de Costos
model CentroCostos {
  id                    String   @id @default(cuid())
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  codigo                String
  nombre                String
  descripcion           String?
  responsableId         String?
  responsable           User?    @relation("ResponsableCentroCostos", fields: [responsableId], references: [id])

  presupuestoAnual      Decimal? @db.Decimal(18,2)
  presupuestoEjecutado  Decimal? @db.Decimal(18,2)

  activo                Boolean  @default(true)

  requerimientos        Requerimiento[]
  facturas              Factura[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([tenantId, codigo])
  @@map("centros_costos")
}

// Niveles de Aprobación
model NivelAprobacion {
  id                    String   @id @default(cuid())
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  nivel                 Int
  nombre                String               // "Supervisor", "Gerente", "Director"
  montoMinimo           Decimal  @db.Decimal(18,2)
  montoMaximo           Decimal? @db.Decimal(18,2)

  roles                 String[]             // Roles que pueden aprobar
  requiereTodos         Boolean  @default(false)

  activo                Boolean  @default(true)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([tenantId, nivel])
  @@map("niveles_aprobacion")
}

// Usuario
model User {
  id                    String   @id @default(cuid())
  email                 String   @unique
  nombre                String
  apellido              String
  passwordHash          String

  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  rol                   String               // SOLICITANTE, APROBADOR, REVISOR_TECNICO, COMPRAS, PAGOS, ADMIN
  departamento          String?
  cargo                 String?

  activo                Boolean  @default(true)

  // Relaciones como responsable
  centrosCostosResponsable CentroCostos[] @relation("ResponsableCentroCostos")

  // Relaciones de acciones
  requerimientosCreados    Requerimiento[] @relation("RequerimientoCreador")
  revisionesTecnicas       RevisionTecnica[]
  aprobaciones             Aprobacion[]
  cotizacionesRecibidas    Cotizacion[]
  conformesEntrega         ConformeEntrega[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("users")
}

// Proveedor
model Proveedor {
  id                    String   @id @default(cuid())
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  // Datos básicos
  razonSocial           String
  nombreFantasia        String?
  cuit                  String
  tipoContribuyente     String?              // RI, MONOTRIBUTO, EXENTO

  // Contacto
  direccion             String
  ciudad                String?
  provincia             String?
  codigoPostal          String?
  telefono              String?
  email                 String
  sitioWeb              String?

  // Contacto comercial
  contactoNombre        String?
  contactoTelefono      String?
  contactoEmail         String?

  // Datos bancarios
  banco                 String?
  tipoCuenta            String?
  cbu                   String?
  alias                 String?

  // Categorización
  categorias            String[]
  rubros                String[]

  // Calificación
  calificacion          Decimal? @db.Decimal(3,2)

  // Estado
  activo                Boolean  @default(true)
  aprobado              Boolean  @default(false)

  // Usuario portal (si tiene acceso)
  userPortalId          String?  @unique

  // Configuración retenciones
  exentoGanancias       Boolean  @default(false)
  exentoIVA             Boolean  @default(false)
  exentoIIBB            Boolean  @default(false)

  cotizaciones          Cotizacion[]
  ordenesCompra         OrdenCompra[]
  facturas              Factura[]
  ordenesPago           OrdenPago[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([tenantId, cuit])
  @@map("proveedores")
}

// ==========================================
// CIRCUITO 1: REQUERIMIENTOS
// ==========================================

model Requerimiento {
  id                    String   @id @default(cuid())
  numero                String   @unique          // REQ-2025-XXXXX

  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  // Datos básicos
  titulo                String
  descripcion           String   @db.Text
  tipo                  TipoRequerimiento

  // Clasificación
  categoria             String?
  centroCostosId        String
  centroCostos          CentroCostos @relation(fields: [centroCostosId], references: [id])
  proyecto              String?

  // Urgencia
  prioridad             Prioridad @default(NORMAL)
  fechaNecesaria        DateTime?

  // Revisión técnica
  requiereRevisionTecnica Boolean @default(false)
  tipoRevision          TipoRevision @default(NINGUNA)

  // Justificación
  justificacion         String   @db.Text

  // Montos estimados
  montoEstimado         Decimal? @db.Decimal(18,2)
  moneda                String   @default("ARS")

  // Estado
  estado                EstadoRequerimiento @default(BORRADOR)

  // Creador
  creadorId             String
  creador               User     @relation("RequerimientoCreador", fields: [creadorId], references: [id])

  // Relaciones
  items                 RequerimientoItem[]
  adjuntos              Adjunto[] @relation("RequerimientoAdjuntos")
  revisionTecnica       RevisionTecnica?
  aprobaciones          Aprobacion[]
  solicitudCotizacion   SolicitudCotizacion?
  ordenCompra           OrdenCompra?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, estado])
  @@index([tenantId, creadorId])
  @@map("requerimientos")
}

model RequerimientoItem {
  id                    String   @id @default(cuid())
  requerimientoId       String
  requerimiento         Requerimiento @relation(fields: [requerimientoId], references: [id], onDelete: Cascade)

  numero                Int
  descripcion           String
  cantidad              Decimal  @db.Decimal(18,4)
  unidadMedida          String
  especificaciones      String?  @db.Text
  montoEstimado         Decimal? @db.Decimal(18,2)
  moneda                String   @default("ARS")

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("requerimiento_items")
}

model RevisionTecnica {
  id                    String   @id @default(cuid())
  requerimientoId       String   @unique
  requerimiento         Requerimiento @relation(fields: [requerimientoId], references: [id])

  revisorId             String
  revisor               User     @relation(fields: [revisorId], references: [id])

  // Evaluación
  cumpleEspecificaciones Boolean?
  viabilidadTecnica     Boolean?

  // Ajustes
  especificacionesAjustadas String? @db.Text
  recomendaciones       String?  @db.Text
  proveedoresSugeridos  String[]

  // Decisión
  decision              DecisionAprobacion?
  observaciones         String?  @db.Text

  fechaRevision         DateTime?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("revisiones_tecnicas")
}

model Aprobacion {
  id                    String   @id @default(cuid())

  // Puede ser de requerimiento, OC o factura
  requerimientoId       String?
  requerimiento         Requerimiento? @relation(fields: [requerimientoId], references: [id])
  ordenCompraId         String?
  ordenCompra           OrdenCompra? @relation(fields: [ordenCompraId], references: [id])
  facturaId             String?
  factura               Factura? @relation(fields: [facturaId], references: [id])

  nivel                 Int

  aprobadorId           String
  aprobador             User     @relation(fields: [aprobadorId], references: [id])

  // Verificaciones
  disponibilidadPresupuestaria Boolean?
  justificacionValida   Boolean?

  // Decisión
  decision              DecisionAprobacion?
  comentarios           String?  @db.Text
  cambiosSolicitados    String?  @db.Text

  fechaAprobacion       DateTime?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("aprobaciones")
}

// ==========================================
// CIRCUITO 2: COTIZACIONES
// ==========================================

model SolicitudCotizacion {
  id                    String   @id @default(cuid())
  numero                String   @unique          // SC-2025-XXXXX

  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  requerimientoId       String   @unique
  requerimiento         Requerimiento @relation(fields: [requerimientoId], references: [id])

  // Tipo de proceso
  tipoProceso           TipoProcesoCotizacion @default(COTIZACION_SIMPLE)

  // Contenido
  titulo                String
  descripcionGeneral    String   @db.Text
  especificacionesTecnicas String @db.Text

  // Condiciones
  condicionesEntrega    String?
  lugarEntrega          String?
  plazoEntregaRequerido String?
  condicionesPago       String?

  // Fechas
  fechaPublicacion      DateTime?
  fechaLimiteCotizacion DateTime
  fechaApertura         DateTime?

  // Criterios de evaluación
  criteriosEvaluacion   Json?                // Array de {criterio, peso}

  // Estado
  estado                EstadoSolicitudCotizacion @default(BORRADOR)

  // Relaciones
  items                 SolicitudCotizacionItem[]
  proveedoresInvitados  ProveedorInvitado[]
  cotizaciones          Cotizacion[]
  adjuntos              Adjunto[] @relation("SolicitudCotizacionAdjuntos")

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, estado])
  @@map("solicitudes_cotizacion")
}

model SolicitudCotizacionItem {
  id                    String   @id @default(cuid())
  solicitudId           String
  solicitud             SolicitudCotizacion @relation(fields: [solicitudId], references: [id], onDelete: Cascade)

  numero                Int
  descripcion           String
  cantidad              Decimal  @db.Decimal(18,4)
  unidadMedida          String
  especificaciones      String?  @db.Text

  itemsCotizados        CotizacionItem[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("solicitud_cotizacion_items")
}

model ProveedorInvitado {
  id                    String   @id @default(cuid())
  solicitudId           String
  solicitud             SolicitudCotizacion @relation(fields: [solicitudId], references: [id], onDelete: Cascade)

  proveedorId           String
  proveedor             Proveedor @relation(fields: [proveedorId], references: [id])

  fechaInvitacion       DateTime @default(now())
  fechaVisualizacion    DateTime?

  @@unique([solicitudId, proveedorId])
  @@map("proveedores_invitados")
}

model Cotizacion {
  id                    String   @id @default(cuid())
  numero                String   @unique          // COT-2025-XXXXX

  solicitudId           String
  solicitud             SolicitudCotizacion @relation(fields: [solicitudId], references: [id])

  proveedorId           String
  proveedor             Proveedor @relation(fields: [proveedorId], references: [id])

  // Usuario que la cargó (puede ser proveedor o compras)
  cargadaPorId          String
  cargadaPor            User     @relation(fields: [cargadaPorId], references: [id])

  // Montos
  subtotal              Decimal  @db.Decimal(18,2)
  impuestos             Decimal  @db.Decimal(18,2)
  total                 Decimal  @db.Decimal(18,2)
  moneda                String   @default("ARS")

  // Condiciones
  plazoEntrega          String
  validezOferta         Int                      // Días
  condicionesPago       String
  garantia              String?

  // Observaciones
  observaciones         String?  @db.Text
  exclusiones           String?  @db.Text

  // Estado
  estado                EstadoCotizacion @default(BORRADOR)

  // Evaluación técnica
  cumpleTecnicamente    Boolean?
  puntajeTecnico        Decimal? @db.Decimal(5,2)
  observacionesTecnicas String?  @db.Text

  // Evaluación comercial
  puntajeComercial      Decimal? @db.Decimal(5,2)
  puntajeTotal          Decimal? @db.Decimal(5,2)

  // Si fue seleccionada
  seleccionada          Boolean  @default(false)
  motivoNoSeleccion     String?  @db.Text

  items                 CotizacionItem[]
  adjuntos              Adjunto[] @relation("CotizacionAdjuntos")

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([solicitudId])
  @@index([proveedorId])
  @@map("cotizaciones")
}

model CotizacionItem {
  id                    String   @id @default(cuid())
  cotizacionId          String
  cotizacion            Cotizacion @relation(fields: [cotizacionId], references: [id], onDelete: Cascade)

  itemSolicitudId       String
  itemSolicitud         SolicitudCotizacionItem @relation(fields: [itemSolicitudId], references: [id])

  descripcion           String
  cantidad              Decimal  @db.Decimal(18,4)
  precioUnitario        Decimal  @db.Decimal(18,4)
  precioTotal           Decimal  @db.Decimal(18,2)

  marca                 String?
  modelo                String?
  origen                String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("cotizacion_items")
}

// ==========================================
// CIRCUITO 3 y 4: ORDENES DE COMPRA
// ==========================================

model OrdenCompra {
  id                    String   @id @default(cuid())
  numero                String   @unique          // OC-2025-XXXXX

  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  // Referencias
  requerimientoId       String?  @unique
  requerimiento         Requerimiento? @relation(fields: [requerimientoId], references: [id])
  cotizacionId          String?

  // Proveedor
  proveedorId           String
  proveedor             Proveedor @relation(fields: [proveedorId], references: [id])

  // Montos
  subtotal              Decimal  @db.Decimal(18,2)
  descuento             Decimal? @db.Decimal(18,2)
  impuestos             Decimal  @db.Decimal(18,2)
  total                 Decimal  @db.Decimal(18,2)
  moneda                String   @default("ARS")
  tipoCambio            Decimal? @db.Decimal(18,4)

  // Condiciones
  condicionPago         CondicionPago @default(CUENTA_CORRIENTE_30)
  plazoEntrega          String
  lugarEntrega          String
  contactoEntrega       String?

  // Anticipo
  requiereAnticipo      Boolean  @default(false)
  montoAnticipo         Decimal? @db.Decimal(18,2)
  porcentajeAnticipo    Decimal? @db.Decimal(5,2)
  condicionesAnticipo   String?
  estadoAnticipo        String?              // PENDIENTE, FACTURADO, PAGADO

  // Centro de costos
  centroCostosId        String?
  proyecto              String?

  // Observaciones
  observaciones         String?  @db.Text
  condicionesEspeciales String?  @db.Text

  // Estado
  estado                EstadoOC @default(BORRADOR)

  // Fechas importantes
  fechaEmision          DateTime?
  fechaEnvioProveedor   DateTime?
  fechaAceptacion       DateTime?
  fechaEntregaEstimada  DateTime?
  fechaEntregaReal      DateTime?

  // Relaciones
  items                 OrdenCompraItem[]
  aprobaciones          Aprobacion[]
  conformesEntrega      ConformeEntrega[]
  facturas              Factura[]
  adjuntos              Adjunto[] @relation("OrdenCompraAdjuntos")

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, estado])
  @@index([proveedorId])
  @@map("ordenes_compra")
}

model OrdenCompraItem {
  id                    String   @id @default(cuid())
  ordenCompraId         String
  ordenCompra           OrdenCompra @relation(fields: [ordenCompraId], references: [id], onDelete: Cascade)

  numero                Int
  descripcion           String
  cantidad              Decimal  @db.Decimal(18,4)
  unidadMedida          String
  precioUnitario        Decimal  @db.Decimal(18,4)
  precioTotal           Decimal  @db.Decimal(18,2)

  especificaciones      String?  @db.Text

  // Control de entregas
  cantidadRecibida      Decimal  @db.Decimal(18,4) @default(0)
  cantidadPendiente     Decimal  @db.Decimal(18,4)

  itemsRecibidos        ConformeEntregaItem[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("orden_compra_items")
}

// ==========================================
// CIRCUITO 5 y 6: FACTURAS Y PAGOS
// ==========================================

model Factura {
  id                    String   @id @default(cuid())

  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  // Datos del comprobante
  tipoComprobante       TipoComprobante
  puntoVenta            String
  numeroFactura         String
  fechaEmision          Date
  fechaVencimiento      Date

  // Proveedor
  proveedorId           String
  proveedor             Proveedor @relation(fields: [proveedorId], references: [id])

  // Referencia a OC (si tiene)
  tieneOC               Boolean  @default(true)
  ordenCompraId         String?
  ordenCompra           OrdenCompra? @relation(fields: [ordenCompraId], references: [id])

  // Si no tiene OC
  tipoGasto             TipoGasto?
  justificacion         String?  @db.Text
  centroCostosId        String?
  centroCostos          CentroCostos? @relation(fields: [centroCostosId], references: [id])

  // Montos
  netoGravado           Decimal  @db.Decimal(18,2)
  netoNoGravado         Decimal? @db.Decimal(18,2)
  netoExento            Decimal? @db.Decimal(18,2)
  iva21                 Decimal? @db.Decimal(18,2)
  iva105                Decimal? @db.Decimal(18,2)
  iva27                 Decimal? @db.Decimal(18,2)
  percepcionIVA         Decimal? @db.Decimal(18,2)
  percepcionIIBB        Decimal? @db.Decimal(18,2)
  percepcionGanancias   Decimal? @db.Decimal(18,2)
  otrosImpuestos        Decimal? @db.Decimal(18,2)
  total                 Decimal  @db.Decimal(18,2)
  moneda                String   @default("ARS")
  tipoCambio            Decimal? @db.Decimal(18,4)

  // Validación AFIP
  cae                   String?
  fechaVencimientoCAE   Date?

  // Estado
  estado                EstadoFactura @default(BORRADOR)

  // Validación tripartita
  validacionOC          Boolean?
  validacionConforme    Boolean?

  // Retenciones calculadas
  retenciones           Retencion[]
  totalRetenciones      Decimal? @db.Decimal(18,2)
  montoNeto             Decimal? @db.Decimal(18,2)

  // Pago
  ordenPagoId           String?
  ordenPago             OrdenPago? @relation(fields: [ordenPagoId], references: [id])

  aprobaciones          Aprobacion[]
  adjuntos              Adjunto[] @relation("FacturaAdjuntos")

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([tenantId, tipoComprobante, puntoVenta, numeroFactura, proveedorId])
  @@index([tenantId, estado])
  @@index([proveedorId])
  @@map("facturas")
}

model Retencion {
  id                    String   @id @default(cuid())
  facturaId             String
  factura               Factura  @relation(fields: [facturaId], references: [id], onDelete: Cascade)

  tipo                  TipoRetencion
  regimen               String
  alicuota              Decimal  @db.Decimal(5,2)
  baseCalculo           Decimal  @db.Decimal(18,2)
  montoRetenido         Decimal  @db.Decimal(18,2)

  certificadoNumero     String?
  certificadoEmitido    Boolean  @default(false)
  fechaEmision          DateTime?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("retenciones")
}

model OrdenPago {
  id                    String   @id @default(cuid())
  numero                String   @unique          // OP-2025-XXXXX

  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  // Proveedor
  proveedorId           String
  proveedor             Proveedor @relation(fields: [proveedorId], references: [id])

  // Datos bancarios del pago
  banco                 String?
  tipoCuenta            String?
  cbu                   String?
  alias                 String?

  // Montos
  totalBruto            Decimal  @db.Decimal(18,2)
  totalRetenciones      Decimal  @db.Decimal(18,2)
  totalNeto             Decimal  @db.Decimal(18,2)
  moneda                String   @default("ARS")

  // Forma y fecha de pago
  formaPago             FormaPago @default(TRANSFERENCIA)
  fechaProgramada       Date
  fechaEjecucion        DateTime?

  // Referencia bancaria
  numeroTransferencia   String?
  numeroCheque          String?

  // Estado
  estado                EstadoOrdenPago @default(BORRADOR)

  // Aprobación
  aprobadoPorId         String?
  fechaAprobacion       DateTime?

  facturas              Factura[]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, estado])
  @@index([proveedorId])
  @@map("ordenes_pago")
}

// ==========================================
// CONFORMES DE ENTREGA
// ==========================================

model ConformeEntrega {
  id                    String   @id @default(cuid())
  numero                String   @unique          // REC-2025-XXXXX

  ordenCompraId         String
  ordenCompra           OrdenCompra @relation(fields: [ordenCompraId], references: [id])

  // Receptor
  recibidoPorId         String
  recibidoPor           User     @relation(fields: [recibidoPorId], references: [id])

  fechaRecepcion        Date

  // Tipo de recepción
  tipoRecepcion         TipoRecepcion @default(TOTAL)
  conformidad           Conformidad @default(CONFORME)

  // Documentación
  numeroRemito          String?

  observaciones         String?  @db.Text
  discrepancias         String?  @db.Text

  items                 ConformeEntregaItem[]
  adjuntos              Adjunto[] @relation("ConformeEntregaAdjuntos")

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([ordenCompraId])
  @@map("conformes_entrega")
}

model ConformeEntregaItem {
  id                    String   @id @default(cuid())
  conformeId            String
  conforme              ConformeEntrega @relation(fields: [conformeId], references: [id], onDelete: Cascade)

  itemOCId              String
  itemOC                OrdenCompraItem @relation(fields: [itemOCId], references: [id])

  descripcion           String
  cantidadOrdenada      Decimal  @db.Decimal(18,4)
  cantidadRecibida      Decimal  @db.Decimal(18,4)
  cantidadPendiente     Decimal  @db.Decimal(18,4)

  estado                String               // COMPLETO, PARCIAL, PENDIENTE, RECHAZADO
  observaciones         String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@map("conforme_entrega_items")
}

// ==========================================
// ADJUNTOS
// ==========================================

model Adjunto {
  id                    String   @id @default(cuid())

  nombre                String
  nombreOriginal        String
  tipo                  String               // MIME type
  tamanio               Int                  // Bytes
  url                   String

  // Relaciones polimórficas
  requerimientoId       String?
  requerimiento         Requerimiento? @relation("RequerimientoAdjuntos", fields: [requerimientoId], references: [id])

  solicitudCotizacionId String?
  solicitudCotizacion   SolicitudCotizacion? @relation("SolicitudCotizacionAdjuntos", fields: [solicitudCotizacionId], references: [id])

  cotizacionId          String?
  cotizacion            Cotizacion? @relation("CotizacionAdjuntos", fields: [cotizacionId], references: [id])

  ordenCompraId         String?
  ordenCompra           OrdenCompra? @relation("OrdenCompraAdjuntos", fields: [ordenCompraId], references: [id])

  facturaId             String?
  factura               Factura? @relation("FacturaAdjuntos", fields: [facturaId], references: [id])

  conformeEntregaId     String?
  conformeEntrega       ConformeEntrega? @relation("ConformeEntregaAdjuntos", fields: [conformeEntregaId], references: [id])

  createdAt             DateTime @default(now())

  @@map("adjuntos")
}

// ==========================================
// AUDITORÍA Y LOGS
// ==========================================

model AuditLog {
  id                    String   @id @default(cuid())

  tenantId              String
  userId                String?

  entidad               String               // requerimiento, oc, factura, etc.
  entidadId             String
  accion                String               // CREATE, UPDATE, DELETE, APPROVE, etc.

  datosAnteriores       Json?
  datosNuevos           Json?

  ip                    String?
  userAgent             String?

  createdAt             DateTime @default(now())

  @@index([tenantId, entidad, entidadId])
  @@index([tenantId, createdAt])
  @@map("audit_logs")
}
```

---

## 🎨 Especificación de Pantallas UI

### Dashboard Principal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏠 Dashboard de Compras                                              [User]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ Pendientes  │ │ En Proceso  │ │ Por Aprobar │ │ Por Pagar   │          │
│  │     12      │ │      8      │ │      5      │ │     23      │          │
│  │ Requerim.   │ │    OCs      │ │  Facturas   │ │  Facturas   │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Acciones Rápidas                                                      │ │
│  │                                                                       │ │
│  │ [+ Nuevo Requerimiento] [+ Cargar Factura] [Ver Mis Aprobaciones]    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Actividad Reciente                                                    │ │
│  │                                                                       │ │
│  │ • REQ-2025-00042 aprobado por María García          Hace 5 min      │ │
│  │ • OC-2025-00089 enviada a Proveedor ABC             Hace 15 min     │ │
│  │ • Factura #0001-00012345 cargada                    Hace 1 hora     │ │
│  │ • OP-2025-00034 ejecutada - $150,000                Hace 2 horas    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Lista de Requerimientos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 Requerimientos de Compra                              [+ Nuevo Requerim.]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔍 Buscar...                    [Estado ▼] [Prioridad ▼] [Fecha ▼]        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │ Número       │ Título                    │ Estado      │ Monto    │ ... │
│  ├─────────────────────────────────────────────────────────────────────────┤
│  │ REQ-2025-042 │ Notebooks para IT         │ 🟡 En Aprob │ $400,000 │ ... │
│  │ REQ-2025-041 │ Material de oficina       │ 🟢 Aprobado │ $15,000  │ ... │
│  │ REQ-2025-040 │ Servidores                │ 🔵 En Rev.T │ $850,000 │ ... │
│  │ REQ-2025-039 │ Insumos limpieza          │ 🟢 OC Gen.  │ $8,500   │ ... │
│  │ REQ-2025-038 │ Software licencias        │ 🔴 Rechazado│ $120,000 │ ... │
│  └─────────────────────────────────────────────────────────────────────────┘
│                                                                             │
│  Mostrando 1-10 de 42                           [< Anterior] [Siguiente >] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Formulario Nuevo Requerimiento

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📝 Nuevo Requerimiento de Compra                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Información General                                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Título *                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Notebooks Dell XPS para equipo de desarrollo                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Tipo *                          Prioridad *                                │
│  ┌───────────────────┐          ┌───────────────────┐                      │
│  │ Bien            ▼ │          │ Alta            ▼ │                      │
│  └───────────────────┘          └───────────────────┘                      │
│                                                                             │
│  Centro de Costos *              Fecha Necesaria                            │
│  ┌───────────────────┐          ┌───────────────────┐                      │
│  │ TI - Sistemas   ▼ │          │ 15/12/2025     📅 │                      │
│  └───────────────────┘          └───────────────────┘                      │
│                                                                             │
│  Items del Requerimiento                                      [+ Agregar]  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ # │ Descripción              │ Cantidad │ Unidad │ Monto Est. │ 🗑️  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ 1 │ Notebook Dell XPS 15     │ 5        │ Unidad │ $80,000    │ 🗑️  │  │
│  │ 2 │ Mouse inalámbrico        │ 5        │ Unidad │ $5,000     │ 🗑️  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Revisión Técnica                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [✓] Requiere revisión técnica                                             │
│                                                                             │
│  Tipo de Revisión *                                                         │
│  ┌───────────────────┐                                                     │
│  │ TI             ▼ │                                                      │
│  └───────────────────┘                                                     │
│                                                                             │
│  Justificación *                                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Renovación de equipos para el equipo de desarrollo.                   │ │
│  │ Los equipos actuales tienen más de 4 años y no soportan...            │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Adjuntos                                                    [📎 Adjuntar] │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  📄 especificaciones-tecncias.pdf (245 KB)                          [✕]   │
│                                                                             │
│                                                                             │
│                              [Cancelar]  [Guardar Borrador]  [Enviar]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

(Continúa en el roadmap con más pantallas...)

---

## 🔌 API Endpoints

### Requerimientos (Circuito 1)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/requerimientos` | Listar requerimientos con filtros |
| POST | `/api/v1/requerimientos` | Crear nuevo requerimiento |
| GET | `/api/v1/requerimientos/:id` | Obtener detalle |
| PATCH | `/api/v1/requerimientos/:id` | Actualizar requerimiento |
| DELETE | `/api/v1/requerimientos/:id` | Eliminar (solo borradores) |
| POST | `/api/v1/requerimientos/:id/enviar` | Enviar a aprobación |
| POST | `/api/v1/requerimientos/:id/revision-tecnica` | Registrar revisión técnica |
| POST | `/api/v1/requerimientos/:id/aprobar` | Aprobar requerimiento |
| POST | `/api/v1/requerimientos/:id/rechazar` | Rechazar requerimiento |

### Solicitudes de Cotización (Circuito 2)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/solicitudes-cotizacion` | Listar solicitudes |
| POST | `/api/v1/solicitudes-cotizacion` | Crear solicitud |
| GET | `/api/v1/solicitudes-cotizacion/:id` | Obtener detalle |
| PATCH | `/api/v1/solicitudes-cotizacion/:id` | Actualizar |
| POST | `/api/v1/solicitudes-cotizacion/:id/publicar` | Publicar solicitud |
| POST | `/api/v1/solicitudes-cotizacion/:id/invitar` | Invitar proveedores |
| GET | `/api/v1/solicitudes-cotizacion/:id/cotizaciones` | Ver cotizaciones recibidas |
| POST | `/api/v1/solicitudes-cotizacion/:id/adjudicar` | Adjudicar a proveedor |

### Cotizaciones (Portal Proveedor)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/cotizaciones/mis-solicitudes` | Solicitudes recibidas |
| POST | `/api/v1/cotizaciones` | Enviar cotización |
| GET | `/api/v1/cotizaciones/:id` | Ver mi cotización |
| PATCH | `/api/v1/cotizaciones/:id` | Actualizar cotización |

### Órdenes de Compra (Circuitos 2, 3, 4)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/ordenes-compra` | Listar OCs |
| POST | `/api/v1/ordenes-compra` | Crear OC |
| GET | `/api/v1/ordenes-compra/:id` | Obtener detalle |
| PATCH | `/api/v1/ordenes-compra/:id` | Actualizar OC |
| POST | `/api/v1/ordenes-compra/:id/aprobar` | Aprobar OC |
| POST | `/api/v1/ordenes-compra/:id/enviar` | Enviar a proveedor |
| POST | `/api/v1/ordenes-compra/:id/aceptar` | Aceptar (proveedor) |
| POST | `/api/v1/ordenes-compra/:id/rechazar` | Rechazar (proveedor) |

### Conformes de Entrega (Recepciones)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/conformes-entrega` | Listar conformes |
| POST | `/api/v1/conformes-entrega` | Crear conforme |
| GET | `/api/v1/conformes-entrega/:id` | Obtener detalle |
| GET | `/api/v1/ordenes-compra/:id/conformes` | Conformes de una OC |

### Facturas (Circuitos 5, 6)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/facturas` | Listar facturas |
| POST | `/api/v1/facturas` | Cargar factura |
| GET | `/api/v1/facturas/:id` | Obtener detalle |
| POST | `/api/v1/facturas/:id/validar` | Validar tripartita |
| POST | `/api/v1/facturas/:id/aprobar` | Aprobar factura |
| POST | `/api/v1/facturas/:id/rechazar` | Rechazar factura |
| GET | `/api/v1/facturas/:id/retenciones` | Calcular retenciones |

### Órdenes de Pago (Circuito 6)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/ordenes-pago` | Listar órdenes de pago |
| POST | `/api/v1/ordenes-pago` | Crear orden de pago |
| GET | `/api/v1/ordenes-pago/:id` | Obtener detalle |
| POST | `/api/v1/ordenes-pago/:id/aprobar` | Aprobar OP |
| POST | `/api/v1/ordenes-pago/:id/ejecutar` | Ejecutar pago |
| GET | `/api/v1/ordenes-pago/:id/certificados` | Generar certificados |

### Portal Proveedor

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/portal/solicitudes-cotizacion` | Mis solicitudes recibidas |
| GET | `/api/v1/portal/ordenes-compra` | Mis OCs |
| GET | `/api/v1/portal/facturas` | Mis facturas |
| GET | `/api/v1/portal/pagos` | Mis pagos recibidos |
| GET | `/api/v1/portal/certificados-retencion` | Mis certificados |

### Administración

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/admin/niveles-aprobacion` | Listar niveles |
| POST | `/api/v1/admin/niveles-aprobacion` | Crear nivel |
| PATCH | `/api/v1/admin/niveles-aprobacion/:id` | Actualizar nivel |
| GET | `/api/v1/admin/centros-costos` | Listar centros de costos |
| POST | `/api/v1/admin/centros-costos` | Crear centro de costos |
| GET | `/api/v1/admin/proveedores` | Gestión de proveedores |
| POST | `/api/v1/admin/proveedores` | Crear proveedor |
| GET | `/api/v1/admin/configuracion` | Configuración del tenant |
| PATCH | `/api/v1/admin/configuracion` | Actualizar configuración |

---

## 📊 Resumen de Componentes

| Categoría | Cantidad |
|-----------|----------|
| **Modelos Prisma** | 25 |
| **Enums** | 18 |
| **Formularios UI** | 18+ |
| **Endpoints API** | 50+ |
| **Pantallas** | 25+ |
| **Roles** | 7 |

---

**Documento creado**: 29 Noviembre 2025
**Versión**: 2.0
**Estado**: ✅ Especificación Completa
