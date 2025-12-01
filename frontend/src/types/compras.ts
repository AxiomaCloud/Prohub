// ============================================================================
// TIPOS PARA MVP DEMO - CIRCUITO DE COMPRAS
// ============================================================================

// --- Enums ---

export type RolUsuario = 'SOLICITANTE' | 'APROBADOR' | 'ADMIN';

export type EstadoRequerimiento =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'OC_GENERADA'
  | 'RECIBIDO';

export type Prioridad = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export type EstadoOC = 'PENDIENTE' | 'EN_PROCESO' | 'ENTREGADA';

export type Conformidad = 'CONFORME' | 'PARCIAL' | 'NO_CONFORME';

// --- Interfaces Base ---

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  departamento: string;
  avatar?: string;
}

export interface Adjunto {
  id: string;
  nombre: string;
  tipo: string; // MIME type
  tamanio: number; // bytes
  url: string;
  fechaSubida: Date;
}

export interface ItemRequerimiento {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  total: number;
}

export interface ItemOC {
  id: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  total: number;
}

// --- Interfaces Principales ---

export interface Requerimiento {
  id: string;
  numero: string; // REQ-2025-00001
  titulo: string;
  descripcion: string;

  // Solicitante
  solicitanteId: string;
  solicitante: Usuario;
  departamento: string;

  // Clasificacion
  centroCostos: string;
  categoria: string;
  prioridad: Prioridad;

  // Items
  items: ItemRequerimiento[];

  // Montos
  montoEstimado: number;
  moneda: string;

  // Fechas
  fechaCreacion: Date;
  fechaNecesaria?: Date;

  // Adjuntos
  adjuntos: Adjunto[];

  // Justificacion
  justificacion: string;

  // Estado
  estado: EstadoRequerimiento;

  // Aprobacion (si aplica)
  aprobadorId?: string;
  aprobador?: Usuario;
  fechaAprobacion?: Date;
  comentarioAprobacion?: string;

  // OC (si fue aprobado)
  ordenCompra?: OrdenCompra;

  // Recepcion (si aplica)
  recepcion?: Recepcion;
}

export interface OrdenCompra {
  id: string;
  numero: string; // OC-2025-00001
  requerimientoId: string;

  // Proveedor (mock)
  proveedor: {
    nombre: string;
    cuit: string;
  };

  // Items
  items: ItemOC[];

  // Montos
  subtotal: number;
  impuestos: number;
  total: number;
  moneda: string;

  // Fechas
  fechaEmision: Date;
  fechaEntregaEstimada: Date;

  // Estado
  estado: EstadoOC;
}

export interface Recepcion {
  id: string;
  requerimientoId: string;
  ordenCompraId: string;

  // Receptor
  receptorId: string;
  receptor: Usuario;

  // Datos
  fechaRecepcion: Date;
  conformidad: Conformidad;
  observaciones?: string;

  // Items recibidos
  itemsRecibidos: ItemRecibido[];
}

export interface ItemRecibido {
  descripcion: string;
  cantidadEsperada: number;
  cantidadRecibida: number;
}

// --- Interfaces para Formularios ---

export interface NuevoRequerimientoForm {
  titulo: string;
  descripcion: string;
  centroCostos: string;
  categoria: string;
  prioridad: Prioridad;
  fechaNecesaria?: Date;
  items: Omit<ItemRequerimiento, 'id'>[];
  justificacion: string;
  adjuntos: File[];
}

export interface AprobacionForm {
  aprobado: boolean;
  comentario?: string;
}

export interface RecepcionForm {
  fechaRecepcion: Date;
  conformidad: Conformidad;
  observaciones?: string;
  itemsRecibidos: ItemRecibido[];
}

// --- Interfaces para Parametros (selects) ---

export interface Parametro {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface CentroCostos extends Parametro {
  departamento?: string;
}

export interface Categoria extends Parametro {
  icono?: string;
}

// --- Interfaces para Timeline ---

export interface EventoTimeline {
  id: string;
  fecha: Date;
  tipo: 'CREACION' | 'APROBACION' | 'RECHAZO' | 'OC_GENERADA' | 'RECEPCION';
  descripcion: string;
  usuario?: string;
  completado: boolean;
}

// --- Tipos de utilidad ---

export type RequerimientoSinRelaciones = Omit<
  Requerimiento,
  'solicitante' | 'aprobador' | 'ordenCompra' | 'recepcion'
>;

export interface EstadisticasDashboard {
  misRequerimientos: number;
  pendientesAprobacion: number;
  aprobados: number;
  porRecibir: number;
}
