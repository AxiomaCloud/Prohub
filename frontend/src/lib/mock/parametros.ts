import { CentroCostos, Categoria } from '@/types/compras';

export const centrosCostosMock: CentroCostos[] = [
  {
    id: 'cc-1',
    codigo: 'TI-SIS',
    nombre: 'TI - Sistemas',
    departamento: 'Tecnologia',
    activo: true,
  },
  {
    id: 'cc-2',
    codigo: 'TI-INF',
    nombre: 'TI - Infraestructura',
    departamento: 'Tecnologia',
    activo: true,
  },
  {
    id: 'cc-3',
    codigo: 'ADM-GRL',
    nombre: 'Administracion General',
    departamento: 'Administracion',
    activo: true,
  },
  {
    id: 'cc-4',
    codigo: 'VTA-COM',
    nombre: 'Ventas Comercial',
    departamento: 'Ventas',
    activo: true,
  },
  {
    id: 'cc-5',
    codigo: 'MKT-DIG',
    nombre: 'Marketing Digital',
    departamento: 'Marketing',
    activo: true,
  },
  {
    id: 'cc-6',
    codigo: 'RRHH-CAP',
    nombre: 'RRHH - Capacitacion',
    departamento: 'Recursos Humanos',
    activo: true,
  },
  {
    id: 'cc-7',
    codigo: 'DIS-CRE',
    nombre: 'Diseno Creativo',
    departamento: 'Diseno',
    activo: true,
  },
];

export const categoriasMock: Categoria[] = [
  {
    id: 'cat-1',
    codigo: 'EQ-IT',
    nombre: 'Equipamiento IT',
    icono: 'Laptop',
    activo: true,
  },
  {
    id: 'cat-2',
    codigo: 'SW-LIC',
    nombre: 'Software y Licencias',
    icono: 'Disc',
    activo: true,
  },
  {
    id: 'cat-3',
    codigo: 'MOB-OFI',
    nombre: 'Mobiliario de Oficina',
    icono: 'Armchair',
    activo: true,
  },
  {
    id: 'cat-4',
    codigo: 'MAT-OFI',
    nombre: 'Material de Oficina',
    icono: 'Paperclip',
    activo: true,
  },
  {
    id: 'cat-5',
    codigo: 'SRV-PRO',
    nombre: 'Servicios Profesionales',
    icono: 'Briefcase',
    activo: true,
  },
  {
    id: 'cat-6',
    codigo: 'MKT-PUB',
    nombre: 'Marketing y Publicidad',
    icono: 'Megaphone',
    activo: true,
  },
  {
    id: 'cat-7',
    codigo: 'CAP-FOR',
    nombre: 'Capacitacion y Formacion',
    icono: 'GraduationCap',
    activo: true,
  },
  {
    id: 'cat-8',
    codigo: 'MAN-REP',
    nombre: 'Mantenimiento y Reparaciones',
    icono: 'Wrench',
    activo: true,
  },
];

export const unidadesMock = [
  { id: 'u-1', codigo: 'UN', nombre: 'Unidad' },
  { id: 'u-2', codigo: 'KG', nombre: 'Kilogramo' },
  { id: 'u-3', codigo: 'LT', nombre: 'Litro' },
  { id: 'u-4', codigo: 'MT', nombre: 'Metro' },
  { id: 'u-5', codigo: 'CJ', nombre: 'Caja' },
  { id: 'u-6', codigo: 'PK', nombre: 'Pack' },
  { id: 'u-7', codigo: 'HR', nombre: 'Hora' },
  { id: 'u-8', codigo: 'MES', nombre: 'Mes' },
];

export const prioridadesMock = [
  { valor: 'BAJA', nombre: 'Baja', color: 'gray' },
  { valor: 'NORMAL', nombre: 'Normal', color: 'blue' },
  { valor: 'ALTA', nombre: 'Alta', color: 'orange' },
  { valor: 'URGENTE', nombre: 'Urgente', color: 'red' },
] as const;
