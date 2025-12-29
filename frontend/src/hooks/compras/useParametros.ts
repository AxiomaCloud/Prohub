'use client';

import { useState, useEffect, useMemo } from 'react';
import { CentroCostos, Categoria, Prioridad } from '@/types/compras';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Interfaz para Sector
interface Sector {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

// Datos de fallback (se usan si la API no responde)
const sectoresFallback: Sector[] = [
  { id: 'sec-1', codigo: 'ADM', nombre: 'Administración', activo: true },
  { id: 'sec-2', codigo: 'COM', nombre: 'Comercial', activo: true },
  { id: 'sec-3', codigo: 'OPS', nombre: 'Operaciones', activo: true },
  { id: 'sec-4', codigo: 'PROD', nombre: 'Producción', activo: true },
  { id: 'sec-5', codigo: 'FIN', nombre: 'Finanzas', activo: true },
  { id: 'sec-6', codigo: 'RRHH', nombre: 'Recursos Humanos', activo: true },
  { id: 'sec-7', codigo: 'CONT', nombre: 'Contaduría', activo: true },
];

const centrosCostosFallback: CentroCostos[] = [
  { id: 'cc-1', codigo: 'ADM', nombre: 'Administración', activo: true },
  { id: 'cc-2', codigo: 'COM', nombre: 'Comercial', activo: true },
  { id: 'cc-3', codigo: 'OPS', nombre: 'Operaciones', activo: true },
  { id: 'cc-4', codigo: 'TEC', nombre: 'Tecnología', activo: true },
  { id: 'cc-5', codigo: 'FIN', nombre: 'Finanzas', activo: true },
  { id: 'cc-6', codigo: 'RRHH', nombre: 'Recursos Humanos', activo: true },
];

const categoriasFallback: Categoria[] = [
  { id: 'cat-1', codigo: 'INS', nombre: 'Insumos de Oficina', activo: true },
  { id: 'cat-2', codigo: 'TEC', nombre: 'Tecnología', activo: true },
  { id: 'cat-3', codigo: 'MOB', nombre: 'Mobiliario', activo: true },
  { id: 'cat-4', codigo: 'SRV', nombre: 'Servicios', activo: true },
  { id: 'cat-5', codigo: 'MNT', nombre: 'Mantenimiento', activo: true },
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

interface ParametroMaestro {
  id: number | string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  activo?: boolean;
}

/**
 * Hook para obtener parámetros maestros desde Parse API
 * Con fallback a datos locales si la API no está disponible
 */
export function useParametros() {
  const [categoriasData, setCategoriasData] = useState<Categoria[]>(categoriasFallback);
  const [centrosCostosData, setCentrosCostosData] = useState<CentroCostos[]>(centrosCostosFallback);
  const [sectoresData, setSectoresData] = useState<Sector[]>(sectoresFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParametros = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch categorías, centros de costo y sectores en paralelo
        const [categoriasRes, centrosCostosRes, sectoresRes] = await Promise.all([
          fetch(`${API_URL}/api/parametros/categorias`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_URL}/api/parametros/centros-costo`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }).catch(() => null), // Opcional, puede no existir
          fetch(`${API_URL}/api/parametros/sectores`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
        ]);

        // Procesar categorías
        if (categoriasRes.ok) {
          const categoriasJson = await categoriasRes.json();
          const categorias = (categoriasJson.data || []).map((p: ParametroMaestro) => ({
            id: String(p.id),
            codigo: p.codigo || '',
            nombre: p.nombre || '',
            activo: p.activo !== false,
          }));
          if (categorias.length > 0) {
            setCategoriasData(categorias);
            console.log(`✅ Cargadas ${categorias.length} categorías desde Parse`);
          }
        }

        // Procesar centros de costo (opcional)
        if (centrosCostosRes?.ok) {
          const centrosCostosJson = await centrosCostosRes.json();
          const centrosCostos = (centrosCostosJson.data || []).map((p: ParametroMaestro) => ({
            id: String(p.id),
            codigo: p.codigo || '',
            nombre: p.nombre || '',
            activo: p.activo !== false,
          }));
          if (centrosCostos.length > 0) {
            setCentrosCostosData(centrosCostos);
            console.log(`✅ Cargados ${centrosCostos.length} centros de costo desde Parse`);
          }
        }

        // Procesar sectores
        if (sectoresRes.ok) {
          const sectoresJson = await sectoresRes.json();
          const sectores = (sectoresJson.data || []).map((p: ParametroMaestro) => ({
            id: String(p.id),
            codigo: p.codigo || '',
            nombre: p.nombre || '',
            activo: p.activo !== false,
          }));
          if (sectores.length > 0) {
            setSectoresData(sectores);
            console.log(`✅ Cargados ${sectores.length} sectores desde Parse`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Error cargando parámetros desde Parse, usando fallback:', err);
        setError('Error cargando parámetros');
      } finally {
        setLoading(false);
      }
    };

    fetchParametros();
  }, []);

  const categorias = useMemo(() => {
    return categoriasData.filter((cat) => cat.activo);
  }, [categoriasData]);

  const centrosCostos = useMemo(() => {
    return centrosCostosData.filter((cc) => cc.activo);
  }, [centrosCostosData]);

  const sectores = useMemo(() => {
    return sectoresData.filter((s) => s.activo);
  }, [sectoresData]);

  const unidades = useMemo(() => {
    return unidadesData;
  }, []);

  const prioridades = useMemo(() => {
    return prioridadesData;
  }, []);

  return {
    categorias,
    centrosCostos,
    sectores,
    unidades,
    prioridades,
    loading,
    error,
  };
}

/**
 * Hook simple para obtener solo categorías (útil para reglas de aprobación)
 */
export function useCategorias() {
  const { categorias, loading, error } = useParametros();
  return { categorias, loading, error };
}

/**
 * Hook simple para obtener solo centros de costo
 */
export function useCentrosCostos() {
  const { centrosCostos, loading, error } = useParametros();
  return { centrosCostos, loading, error };
}

/**
 * Hook simple para obtener solo sectores (útil para reglas de aprobación)
 */
export function useSectores() {
  const { sectores, loading, error } = useParametros();
  return { sectores, loading, error };
}
