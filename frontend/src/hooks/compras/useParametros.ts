'use client';

import { useMemo } from 'react';
import {
  centrosCostosMock,
  categoriasMock,
  unidadesMock,
  prioridadesMock,
} from '@/lib/mock';

export function useParametros() {
  const centrosCostos = useMemo(() => {
    return centrosCostosMock.filter((cc) => cc.activo);
  }, []);

  const categorias = useMemo(() => {
    return categoriasMock.filter((cat) => cat.activo);
  }, []);

  const unidades = useMemo(() => {
    return unidadesMock;
  }, []);

  const prioridades = useMemo(() => {
    return prioridadesMock;
  }, []);

  return {
    centrosCostos,
    categorias,
    unidades,
    prioridades,
  };
}
