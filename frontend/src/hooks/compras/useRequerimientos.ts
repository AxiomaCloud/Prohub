'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Requerimiento,
  NuevoRequerimientoForm,
  EstadoRequerimiento,
  AprobacionForm,
  EstadisticasDashboard,
} from '@/types/compras';
import {
  requerimientosMock,
  ordenesCompraMock,
  usuarioActualMock,
} from '@/lib/mock';

// Generador de ID simple
function generarId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generador de numero de requerimiento
function generarNumeroRequerimiento(total: number): string {
  const year = new Date().getFullYear();
  const numero = (total + 1).toString().padStart(5, '0');
  return `REQ-${year}-${numero}`;
}

export function useRequerimientos(usuarioId?: string) {
  const [requerimientos, setRequerimientos] =
    useState<Requerimiento[]>(requerimientosMock);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrar por usuario si se especifica
  const requerimientosUsuario = useMemo(() => {
    if (!usuarioId) return requerimientos;
    return requerimientos.filter((r) => r.solicitanteId === usuarioId);
  }, [requerimientos, usuarioId]);

  // Requerimientos pendientes de aprobacion
  const pendientesAprobacion = useMemo(() => {
    return requerimientos.filter((r) => r.estado === 'PENDIENTE_APROBACION');
  }, [requerimientos]);

  // Estadisticas para dashboard
  const estadisticas = useMemo((): EstadisticasDashboard => {
    const misReqs = requerimientos.filter(
      (r) => r.solicitanteId === usuarioActualMock.id
    );
    return {
      misRequerimientos: misReqs.length,
      pendientesAprobacion: pendientesAprobacion.length,
      aprobados: misReqs.filter(
        (r) => r.estado === 'APROBADO' || r.estado === 'OC_GENERADA'
      ).length,
      porRecibir: misReqs.filter((r) => r.estado === 'OC_GENERADA').length,
    };
  }, [requerimientos, pendientesAprobacion]);

  // Obtener requerimiento por ID
  const getRequerimiento = useCallback(
    (id: string): Requerimiento | undefined => {
      return requerimientos.find((r) => r.id === id);
    },
    [requerimientos]
  );

  // Crear nuevo requerimiento
  const crearRequerimiento = useCallback(
    (data: NuevoRequerimientoForm, enviar: boolean = false) => {
      setLoading(true);
      setError(null);

      try {
        const nuevoRequerimiento: Requerimiento = {
          id: generarId(),
          numero: generarNumeroRequerimiento(requerimientos.length),
          titulo: data.titulo,
          descripcion: data.descripcion,
          solicitanteId: usuarioActualMock.id,
          solicitante: usuarioActualMock,
          departamento: usuarioActualMock.departamento,
          centroCostos: data.centroCostos,
          categoria: data.categoria,
          prioridad: data.prioridad,
          items: data.items.map((item, index) => ({
            ...item,
            id: `item-new-${index}`,
          })),
          montoEstimado: data.items.reduce((sum, item) => sum + item.total, 0),
          moneda: 'ARS',
          fechaCreacion: new Date(),
          fechaNecesaria: data.fechaNecesaria,
          adjuntos: [], // En un caso real, procesariamos los archivos
          justificacion: data.justificacion,
          estado: enviar ? 'PENDIENTE_APROBACION' : 'BORRADOR',
        };

        setRequerimientos((prev) => [nuevoRequerimiento, ...prev]);

        return nuevoRequerimiento;
      } catch (err) {
        setError('Error al crear el requerimiento');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [requerimientos.length]
  );

  // Enviar a aprobacion
  const enviarAprobacion = useCallback((id: string) => {
    setRequerimientos((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, estado: 'PENDIENTE_APROBACION' as const } : r
      )
    );
  }, []);

  // Aprobar requerimiento
  const aprobarRequerimiento = useCallback(
    (id: string, data: AprobacionForm) => {
      setRequerimientos((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;

          // Simular generacion de OC
          const ordenCompra = {
            id: `oc-${Date.now()}`,
            numero: `OC-${new Date().getFullYear()}-${Math.random().toString().substr(2, 5)}`,
            requerimientoId: id,
            proveedor: {
              nombre: 'Proveedor Demo S.A.',
              cuit: '30-99999999-9',
            },
            items: r.items.map((item) => ({
              ...item,
              id: `oc-item-${item.id}`,
            })),
            subtotal: r.montoEstimado,
            impuestos: r.montoEstimado * 0.21,
            total: r.montoEstimado * 1.21,
            moneda: r.moneda,
            fechaEmision: new Date(),
            fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 dias
            estado: 'EN_PROCESO' as const,
          };

          return {
            ...r,
            estado: 'OC_GENERADA' as EstadoRequerimiento,
            aprobadorId: usuarioActualMock.id,
            aprobador: usuarioActualMock,
            fechaAprobacion: new Date(),
            comentarioAprobacion: data.comentario,
            ordenCompra,
          };
        })
      );
    },
    []
  );

  // Rechazar requerimiento
  const rechazarRequerimiento = useCallback(
    (id: string, data: AprobacionForm) => {
      setRequerimientos((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                estado: 'RECHAZADO' as EstadoRequerimiento,
                aprobadorId: usuarioActualMock.id,
                aprobador: usuarioActualMock,
                fechaAprobacion: new Date(),
                comentarioAprobacion: data.comentario,
              }
            : r
        )
      );
    },
    []
  );

  // Confirmar recepcion
  const confirmarRecepcion = useCallback(
    (
      id: string,
      data: {
        conformidad: 'CONFORME' | 'PARCIAL' | 'NO_CONFORME';
        observaciones?: string;
        itemsRecibidos: {
          descripcion: string;
          cantidadEsperada: number;
          cantidadRecibida: number;
        }[];
      }
    ) => {
      setRequerimientos((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;

          const recepcion = {
            id: `rec-${Date.now()}`,
            requerimientoId: id,
            ordenCompraId: r.ordenCompra?.id || '',
            receptorId: usuarioActualMock.id,
            receptor: usuarioActualMock,
            fechaRecepcion: new Date(),
            conformidad: data.conformidad,
            observaciones: data.observaciones,
            itemsRecibidos: data.itemsRecibidos,
          };

          return {
            ...r,
            estado: 'RECIBIDO' as EstadoRequerimiento,
            recepcion,
            ordenCompra: r.ordenCompra
              ? { ...r.ordenCompra, estado: 'ENTREGADA' as const }
              : undefined,
          };
        })
      );
    },
    []
  );

  return {
    requerimientos: requerimientosUsuario,
    todosLosRequerimientos: requerimientos,
    pendientesAprobacion,
    estadisticas,
    loading,
    error,
    getRequerimiento,
    crearRequerimiento,
    enviarAprobacion,
    aprobarRequerimiento,
    rechazarRequerimiento,
    confirmarRecepcion,
  };
}
