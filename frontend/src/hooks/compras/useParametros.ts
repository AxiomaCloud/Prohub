'use client';

import { useMemo } from 'react';
import { CentroCostos, Categoria, Prioridad } from '@/types/compras';

// Datos estáticos para parámetros
const centrosCostosData: CentroCostos[] = [
  { id: 'cc-1', codigo: 'ADM', nombre: 'Administración', activo: true },
  { id: 'cc-2', codigo: 'COM', nombre: 'Comercial', activo: true },
  { id: 'cc-3', codigo: 'OPS', nombre: 'Operaciones', activo: true },
  { id: 'cc-4', codigo: 'TEC', nombre: 'Tecnología', activo: true },
  { id: 'cc-5', codigo: 'FIN', nombre: 'Finanzas', activo: true },
  { id: 'cc-6', codigo: 'RRHH', nombre: 'Recursos Humanos', activo: true },
  { id: 'cc-7', codigo: 'MKT', nombre: 'Marketing', activo: true },
  { id: 'cc-8', codigo: 'LEG', nombre: 'Legal', activo: true },
];

const categoriasData: Categoria[] = [
  { id: 'cat-1', codigo: 'INS', nombre: 'Insumos de Oficina', activo: true },
  { id: 'cat-2', codigo: 'TEC', nombre: 'Tecnología', activo: true },
  { id: 'cat-3', codigo: 'MOB', nombre: 'Mobiliario', activo: true },
  { id: 'cat-4', codigo: 'SRV', nombre: 'Servicios', activo: true },
  { id: 'cat-5', codigo: 'LIM', nombre: 'Limpieza', activo: true },
  { id: 'cat-6', codigo: 'SEG', nombre: 'Seguridad', activo: true },
  { id: 'cat-7', codigo: 'MNT', nombre: 'Mantenimiento', activo: true },
  { id: 'cat-8', codigo: 'VEH', nombre: 'Vehículos', activo: true },
];

interface Unidad {
  id: string;
  codigo: string;
  nombre: string;
}

const unidadesData: Unidad[] = [
  { id: 'un-1', codigo: 'UN', nombre: 'Unidad' },
  { id: 'un-2', codigo: 'CJ', nombre: 'Caja' },
  { id: 'un-3', codigo: 'PQ', nombre: 'Paquete' },
  { id: 'un-4', codigo: 'KG', nombre: 'Kilogramo' },
  { id: 'un-5', codigo: 'LT', nombre: 'Litro' },
  { id: 'un-6', codigo: 'MT', nombre: 'Metro' },
  { id: 'un-7', codigo: 'M2', nombre: 'Metro cuadrado' },
  { id: 'un-8', codigo: 'HR', nombre: 'Hora' },
  { id: 'un-9', codigo: 'SR', nombre: 'Servicio' },
];

interface PrioridadOption {
  id: string;
  valor: Prioridad;
  nombre: string;
  color: string;
}

const prioridadesData: PrioridadOption[] = [
  { id: 'pri-1', valor: 'BAJA', nombre: 'Baja', color: 'gray' },
  { id: 'pri-2', valor: 'NORMAL', nombre: 'Normal', color: 'blue' },
  { id: 'pri-3', valor: 'ALTA', nombre: 'Alta', color: 'orange' },
  { id: 'pri-4', valor: 'URGENTE', nombre: 'Urgente', color: 'red' },
];

export function useParametros() {
  const centrosCostos = useMemo(() => {
    return centrosCostosData.filter((cc) => cc.activo);
  }, []);

  const categorias = useMemo(() => {
    return categoriasData.filter((cat) => cat.activo);
  }, []);

  const unidades = useMemo(() => {
    return unidadesData;
  }, []);

  const prioridades = useMemo(() => {
    return prioridadesData;
  }, []);

  return {
    centrosCostos,
    categorias,
    unidades,
    prioridades,
  };
}
