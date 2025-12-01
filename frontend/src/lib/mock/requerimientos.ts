import { Requerimiento, OrdenCompra, Recepcion } from '@/types/compras';
import { usuariosMock } from './usuarios';

const juan = usuariosMock[0];
const maria = usuariosMock[1];
const carlos = usuariosMock[2];

// Ordenes de Compra Mock
export const ordenesCompraMock: OrdenCompra[] = [
  {
    id: 'oc-1',
    numero: 'OC-2025-00015',
    requerimientoId: 'req-3',
    proveedor: {
      nombre: 'Adobe Systems Argentina S.A.',
      cuit: '30-12345678-9',
    },
    items: [
      {
        id: 'oc-item-1',
        descripcion: 'Licencia Adobe Creative Cloud Team',
        cantidad: 10,
        unidad: 'Unidad',
        precioUnitario: 18000,
        total: 180000,
      },
    ],
    subtotal: 180000,
    impuestos: 37800,
    total: 217800,
    moneda: 'ARS',
    fechaEmision: new Date('2025-11-22'),
    fechaEntregaEstimada: new Date('2025-12-05'),
    estado: 'EN_PROCESO',
  },
  {
    id: 'oc-2',
    numero: 'OC-2025-00016',
    requerimientoId: 'req-4',
    proveedor: {
      nombre: 'Staples Argentina S.A.',
      cuit: '30-98765432-1',
    },
    items: [
      {
        id: 'oc-item-2',
        descripcion: 'Resma de papel A4 75gr',
        cantidad: 50,
        unidad: 'Caja',
        precioUnitario: 800,
        total: 40000,
      },
      {
        id: 'oc-item-3',
        descripcion: 'Lapiceras BIC azul x50',
        cantidad: 2,
        unidad: 'Caja',
        precioUnitario: 2500,
        total: 5000,
      },
    ],
    subtotal: 45000,
    impuestos: 9450,
    total: 54450,
    moneda: 'ARS',
    fechaEmision: new Date('2025-11-26'),
    fechaEntregaEstimada: new Date('2025-12-01'),
    estado: 'ENTREGADA',
  },
];

// Recepciones Mock
export const recepcionesMock: Recepcion[] = [
  {
    id: 'rec-1',
    requerimientoId: 'req-4',
    ordenCompraId: 'oc-2',
    receptorId: juan.id,
    receptor: juan,
    fechaRecepcion: new Date('2025-12-01'),
    conformidad: 'CONFORME',
    observaciones: 'Todo recibido correctamente',
    itemsRecibidos: [
      {
        descripcion: 'Resma de papel A4 75gr',
        cantidadEsperada: 50,
        cantidadRecibida: 50,
      },
      {
        descripcion: 'Lapiceras BIC azul x50',
        cantidadEsperada: 2,
        cantidadRecibida: 2,
      },
    ],
  },
];

// Requerimientos Mock
export const requerimientosMock: Requerimiento[] = [
  // REQ-2025-00005 - Pendiente aprobacion (el principal del demo)
  {
    id: 'req-5',
    numero: 'REQ-2025-00005',
    titulo: 'Notebooks Dell XPS para equipo de desarrollo',
    descripcion:
      'Necesitamos renovar los equipos del equipo de desarrollo. Los actuales tienen más de 4 años y no soportan las herramientas actuales de desarrollo (Docker, VS Code con extensiones pesadas, compiladores, etc.)',
    solicitanteId: juan.id,
    solicitante: juan,
    departamento: 'Tecnología',
    centroCostos: 'TI - Sistemas',
    categoria: 'Equipamiento IT',
    prioridad: 'URGENTE',
    items: [
      {
        id: 'item-5-1',
        descripcion: 'Notebook Dell XPS 15 (16GB RAM, 512GB SSD)',
        cantidad: 5,
        unidad: 'Unidad',
        precioUnitario: 400000,
        total: 2000000,
      },
      {
        id: 'item-5-2',
        descripcion: 'Mouse inalámbrico Logitech MX Master 3',
        cantidad: 5,
        unidad: 'Unidad',
        precioUnitario: 25000,
        total: 125000,
      },
      {
        id: 'item-5-3',
        descripcion: 'Teclado mecánico Keychron K2',
        cantidad: 5,
        unidad: 'Unidad',
        precioUnitario: 55000,
        total: 275000,
      },
    ],
    montoEstimado: 2400000,
    moneda: 'ARS',
    fechaCreacion: new Date('2025-11-28'),
    fechaNecesaria: new Date('2025-12-15'),
    adjuntos: [
      {
        id: 'adj-1',
        nombre: 'especificaciones-dell-xps.pdf',
        tipo: 'application/pdf',
        tamanio: 2411724, // ~2.3MB
        url: '/mock/especificaciones-dell-xps.pdf',
        fechaSubida: new Date('2025-11-28'),
      },
      {
        id: 'adj-2',
        nombre: 'comparativo-precios.xlsx',
        tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        tamanio: 148480, // ~145KB
        url: '/mock/comparativo-precios.xlsx',
        fechaSubida: new Date('2025-11-28'),
      },
    ],
    justificacion:
      'Los equipos actuales del equipo de desarrollo tienen más de 4 años y no soportan las últimas versiones de las herramientas de desarrollo (Docker, VS Code con extensiones, compiladores, etc.). La productividad del equipo se ve afectada por la lentitud de los equipos actuales.',
    estado: 'PENDIENTE_APROBACION',
  },

  // REQ-2025-00006 - Pendiente aprobacion (otro)
  {
    id: 'req-6',
    numero: 'REQ-2025-00006',
    titulo: 'Insumos de limpieza para oficina',
    descripcion:
      'Compra mensual de insumos de limpieza para las oficinas del piso 3.',
    solicitanteId: carlos.id,
    solicitante: carlos,
    departamento: 'Ventas',
    centroCostos: 'Administración General',
    categoria: 'Material de Oficina',
    prioridad: 'NORMAL',
    items: [
      {
        id: 'item-6-1',
        descripcion: 'Detergente multiuso 5L',
        cantidad: 4,
        unidad: 'Unidad',
        precioUnitario: 2500,
        total: 10000,
      },
      {
        id: 'item-6-2',
        descripcion: 'Papel higiénico (pack x24)',
        cantidad: 2,
        unidad: 'Pack',
        precioUnitario: 2500,
        total: 5000,
      },
    ],
    montoEstimado: 15000,
    moneda: 'ARS',
    fechaCreacion: new Date('2025-11-29'),
    adjuntos: [],
    justificacion: 'Compra mensual regular de insumos de limpieza.',
    estado: 'PENDIENTE_APROBACION',
  },

  // REQ-2025-00004 - Aprobado
  {
    id: 'req-4',
    numero: 'REQ-2025-00004',
    titulo: 'Material de oficina Q4',
    descripcion:
      'Reposición de material de oficina para el cuarto trimestre del año.',
    solicitanteId: juan.id,
    solicitante: juan,
    departamento: 'Tecnología',
    centroCostos: 'Administración General',
    categoria: 'Material de Oficina',
    prioridad: 'NORMAL',
    items: [
      {
        id: 'item-4-1',
        descripcion: 'Resma de papel A4 75gr',
        cantidad: 50,
        unidad: 'Caja',
        precioUnitario: 800,
        total: 40000,
      },
      {
        id: 'item-4-2',
        descripcion: 'Lapiceras BIC azul x50',
        cantidad: 2,
        unidad: 'Caja',
        precioUnitario: 2500,
        total: 5000,
      },
    ],
    montoEstimado: 45000,
    moneda: 'ARS',
    fechaCreacion: new Date('2025-11-25'),
    adjuntos: [],
    justificacion: 'Reposición trimestral de insumos de oficina.',
    estado: 'RECIBIDO',
    aprobadorId: maria.id,
    aprobador: maria,
    fechaAprobacion: new Date('2025-11-26'),
    comentarioAprobacion: 'Aprobado. Compra regular.',
    ordenCompra: ordenesCompraMock[1],
    recepcion: recepcionesMock[0],
  },

  // REQ-2025-00003 - OC Generada (esperando recepcion)
  {
    id: 'req-3',
    numero: 'REQ-2025-00003',
    titulo: 'Licencias Adobe Creative Cloud',
    descripcion:
      'Renovación de licencias Adobe Creative Cloud para el equipo de diseño.',
    solicitanteId: juan.id,
    solicitante: juan,
    departamento: 'Diseño',
    centroCostos: 'Diseño Creativo',
    categoria: 'Software y Licencias',
    prioridad: 'ALTA',
    items: [
      {
        id: 'item-3-1',
        descripcion: 'Licencia Adobe Creative Cloud Team',
        cantidad: 10,
        unidad: 'Unidad',
        precioUnitario: 18000,
        total: 180000,
      },
    ],
    montoEstimado: 180000,
    moneda: 'ARS',
    fechaCreacion: new Date('2025-11-20'),
    fechaNecesaria: new Date('2025-12-01'),
    adjuntos: [],
    justificacion:
      'Las licencias actuales vencen el 30/11. Necesitamos renovar para no interrumpir el trabajo del equipo de diseño.',
    estado: 'OC_GENERADA',
    aprobadorId: maria.id,
    aprobador: maria,
    fechaAprobacion: new Date('2025-11-21'),
    comentarioAprobacion: 'Aprobado. Renovación necesaria.',
    ordenCompra: ordenesCompraMock[0],
  },

  // REQ-2025-00002 - Rechazado
  {
    id: 'req-2',
    numero: 'REQ-2025-00002',
    titulo: 'Sillas ergonómicas para el equipo',
    descripcion:
      'Compra de sillas ergonómicas para mejorar el confort del equipo de desarrollo.',
    solicitanteId: juan.id,
    solicitante: juan,
    departamento: 'Tecnología',
    centroCostos: 'TI - Sistemas',
    categoria: 'Mobiliario de Oficina',
    prioridad: 'NORMAL',
    items: [
      {
        id: 'item-2-1',
        descripcion: 'Silla ergonómica Herman Miller Aeron',
        cantidad: 5,
        unidad: 'Unidad',
        precioUnitario: 70000,
        total: 350000,
      },
    ],
    montoEstimado: 350000,
    moneda: 'ARS',
    fechaCreacion: new Date('2025-11-15'),
    adjuntos: [],
    justificacion:
      'Varios miembros del equipo reportan molestias por las sillas actuales.',
    estado: 'RECHAZADO',
    aprobadorId: maria.id,
    aprobador: maria,
    fechaAprobacion: new Date('2025-11-16'),
    comentarioAprobacion:
      'Presupuesto agotado para este trimestre. Reprogramar para Q1 2026.',
  },

  // REQ-2025-00001 - Borrador (el mas antiguo)
  {
    id: 'req-1',
    numero: 'REQ-2025-00001',
    titulo: 'Monitor ultrawide para desarrollo',
    descripcion: 'Monitor ultrawide 34 pulgadas para mejorar productividad.',
    solicitanteId: juan.id,
    solicitante: juan,
    departamento: 'Tecnología',
    centroCostos: 'TI - Sistemas',
    categoria: 'Equipamiento IT',
    prioridad: 'BAJA',
    items: [
      {
        id: 'item-1-1',
        descripcion: 'Monitor LG 34" Ultrawide',
        cantidad: 1,
        unidad: 'Unidad',
        precioUnitario: 250000,
        total: 250000,
      },
    ],
    montoEstimado: 250000,
    moneda: 'ARS',
    fechaCreacion: new Date('2025-11-10'),
    adjuntos: [],
    justificacion: 'Para mejorar la productividad en desarrollo.',
    estado: 'BORRADOR',
  },
];

// Funciones helper
export function getRequerimientosByUsuario(usuarioId: string): Requerimiento[] {
  return requerimientosMock.filter((r) => r.solicitanteId === usuarioId);
}

export function getRequerimientosPendientesAprobacion(): Requerimiento[] {
  return requerimientosMock.filter((r) => r.estado === 'PENDIENTE_APROBACION');
}

export function getRequerimientoById(id: string): Requerimiento | undefined {
  return requerimientosMock.find((r) => r.id === id);
}

export function getOrdenCompraById(id: string): OrdenCompra | undefined {
  return ordenesCompraMock.find((oc) => oc.id === id);
}

export function getRequerimientoByNumero(
  numero: string
): Requerimiento | undefined {
  return requerimientosMock.find((r) => r.numero === numero);
}
