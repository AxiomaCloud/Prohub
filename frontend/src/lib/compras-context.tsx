'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Usuario, Requerimiento, OrdenCompra, Proveedor, Adjunto, EstadoAdjunto, RolUsuario } from '@/types/compras';
import { usuariosMock, requerimientosMock, ordenesCompraMock, proveedoresMock } from '@/lib/mock';
import { useAuth } from '@/contexts/AuthContext';

interface ComprasContextType {
  // Usuario
  usuarioActual: Usuario;
  cambiarUsuario: (id: string) => void;
  usuarios: Usuario[];

  // Requerimientos
  requerimientos: Requerimiento[];
  agregarRequerimiento: (req: Requerimiento) => void;
  actualizarRequerimiento: (id: string, data: Partial<Requerimiento>) => void;

  // Ordenes de Compra
  ordenesCompra: OrdenCompra[];
  agregarOrdenCompra: (oc: OrdenCompra) => void;
  actualizarOrdenCompra: (id: string, data: Partial<OrdenCompra>) => void;

  // Proveedores
  proveedores: Proveedor[];

  // Aprobacion de adjuntos
  aprobarAdjunto: (requerimientoId: string, adjuntoId: string, aprobado: boolean, comentario?: string) => void;

  // Notificaciones (mock)
  notificaciones: Notificacion[];
  agregarNotificacion: (notif: Omit<Notificacion, 'id' | 'fecha'>) => void;
  marcarLeida: (id: string) => void;
}

interface Notificacion {
  id: string;
  tipo: 'APROBACION_PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'OC_GENERADA';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  requerimientoId?: string;
}

const ComprasContext = createContext<ComprasContextType | undefined>(undefined);

// Mapear roles del backend a roles del módulo de compras
function mapRolesToComprasRole(roles: string[]): RolUsuario {
  if (roles.includes('PURCHASE_ADMIN') || roles.includes('SUPER_ADMIN') || roles.includes('CLIENT_ADMIN')) {
    return 'ADMIN';
  }
  if (roles.includes('PURCHASE_APPROVER')) {
    return 'APROBADOR';
  }
  return 'SOLICITANTE';
}

export function ComprasProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, tenant: currentTenant } = useAuth();

  // Convertir el usuario autenticado al formato del módulo de compras
  const usuarioActual: Usuario = useMemo(() => {
    if (authUser) {
      // Obtener roles del tenant actual
      const membership = authUser.tenantMemberships?.find(
        (m) => m.tenantId === currentTenant?.id
      );
      const roles = membership?.roles || [];

      return {
        id: authUser.id,
        nombre: authUser.name,
        email: authUser.email,
        rol: mapRolesToComprasRole(roles),
        departamento: 'General', // TODO: Agregar departamento al modelo de usuario
        avatar: undefined,
      };
    }
    // Fallback a usuario mock si no hay usuario autenticado
    return usuariosMock[0];
  }, [authUser, currentTenant]);

  const [usuarioActualState, setUsuarioActual] = useState<Usuario>(usuariosMock[0]);
  const [requerimientos, setRequerimientos] =
    useState<Requerimiento[]>(requerimientosMock);
  const [ordenesCompra, setOrdenesCompra] =
    useState<OrdenCompra[]>(ordenesCompraMock);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([
    {
      id: 'notif-1',
      tipo: 'APROBACION_PENDIENTE',
      titulo: 'Nuevo requerimiento pendiente',
      mensaje:
        'Juan Pérez solicita aprobación para "Notebooks Dell XPS para equipo de desarrollo"',
      fecha: new Date('2025-11-28T10:30:00'),
      leida: false,
      requerimientoId: 'req-5',
    },
    {
      id: 'notif-2',
      tipo: 'APROBACION_PENDIENTE',
      titulo: 'Nuevo requerimiento pendiente',
      mensaje:
        'Carlos López solicita aprobación para "Insumos de limpieza para oficina"',
      fecha: new Date('2025-11-29T09:15:00'),
      leida: false,
      requerimientoId: 'req-6',
    },
  ]);

  const cambiarUsuario = useCallback((id: string) => {
    // Esta función ya no cambia el usuario, ya que ahora se obtiene del contexto de auth
    // Se mantiene por compatibilidad con el código existente
    console.log('cambiarUsuario es deprecado, el usuario se obtiene del contexto de autenticación');
  }, []);

  const agregarRequerimiento = useCallback((req: Requerimiento) => {
    setRequerimientos((prev) => [req, ...prev]);

    // Si se envio a aprobacion, crear notificacion para aprobadores
    if (req.estado === 'PENDIENTE_APROBACION') {
      setNotificaciones((prev) => [
        {
          id: `notif-${Date.now()}`,
          tipo: 'APROBACION_PENDIENTE',
          titulo: 'Nuevo requerimiento pendiente',
          mensaje: `${req.solicitante.nombre} solicita aprobación para "${req.titulo}"`,
          fecha: new Date(),
          leida: false,
          requerimientoId: req.id,
        },
        ...prev,
      ]);
    }
  }, []);

  const actualizarRequerimiento = useCallback(
    (id: string, data: Partial<Requerimiento>) => {
      setRequerimientos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data } : r))
      );

      // Crear notificaciones segun el estado
      const req = requerimientos.find((r) => r.id === id);
      if (req && data.estado) {
        if (data.estado === 'APROBADO' || data.estado === 'OC_GENERADA') {
          setNotificaciones((prev) => [
            {
              id: `notif-${Date.now()}`,
              tipo: 'APROBADO',
              titulo: 'Requerimiento aprobado',
              mensaje: `Tu requerimiento "${req.titulo}" ha sido aprobado`,
              fecha: new Date(),
              leida: false,
              requerimientoId: id,
            },
            ...prev,
          ]);
        } else if (data.estado === 'RECHAZADO') {
          setNotificaciones((prev) => [
            {
              id: `notif-${Date.now()}`,
              tipo: 'RECHAZADO',
              titulo: 'Requerimiento rechazado',
              mensaje: `Tu requerimiento "${req.titulo}" ha sido rechazado`,
              fecha: new Date(),
              leida: false,
              requerimientoId: id,
            },
            ...prev,
          ]);
        }
      }
    },
    [requerimientos]
  );

  const agregarNotificacion = useCallback(
    (notif: Omit<Notificacion, 'id' | 'fecha'>) => {
      setNotificaciones((prev) => [
        {
          ...notif,
          id: `notif-${Date.now()}`,
          fecha: new Date(),
        },
        ...prev,
      ]);
    },
    []
  );

  const marcarLeida = useCallback((id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  }, []);

  // Ordenes de Compra
  const agregarOrdenCompra = useCallback((oc: OrdenCompra) => {
    setOrdenesCompra((prev) => [oc, ...prev]);

    // Actualizar el requerimiento con la OC
    setRequerimientos((prev) =>
      prev.map((r) =>
        r.id === oc.requerimientoId
          ? { ...r, estado: 'OC_GENERADA', ordenCompra: oc }
          : r
      )
    );

    // Crear notificacion
    const req = requerimientos.find((r) => r.id === oc.requerimientoId);
    if (req) {
      setNotificaciones((prev) => [
        {
          id: `notif-${Date.now()}`,
          tipo: 'OC_GENERADA',
          titulo: 'Orden de Compra generada',
          mensaje: `Se generó la ${oc.numero} para "${req.titulo}"`,
          fecha: new Date(),
          leida: false,
          requerimientoId: req.id,
        },
        ...prev,
      ]);
    }
  }, [requerimientos]);

  const actualizarOrdenCompra = useCallback(
    (id: string, data: Partial<OrdenCompra>) => {
      setOrdenesCompra((prev) =>
        prev.map((oc) => (oc.id === id ? { ...oc, ...data } : oc))
      );
    },
    []
  );

  // Aprobacion de adjuntos individuales
  const aprobarAdjunto = useCallback(
    (requerimientoId: string, adjuntoId: string, aprobado: boolean, comentario?: string) => {
      setRequerimientos((prev) =>
        prev.map((r) => {
          if (r.id !== requerimientoId) return r;

          const adjuntosActualizados = r.adjuntos.map((adj) => {
            if (adj.id !== adjuntoId) return adj;
            return {
              ...adj,
              estado: aprobado ? 'APROBADO' : 'RECHAZADO' as EstadoAdjunto,
              aprobadorId: usuarioActual.id,
              aprobador: usuarioActual,
              fechaAprobacion: new Date(),
              comentarioAprobacion: comentario,
            };
          });

          return { ...r, adjuntos: adjuntosActualizados };
        })
      );
    },
    [usuarioActual]
  );

  return (
    <ComprasContext.Provider
      value={{
        usuarioActual,
        cambiarUsuario,
        usuarios: usuariosMock,
        requerimientos,
        agregarRequerimiento,
        actualizarRequerimiento,
        ordenesCompra,
        agregarOrdenCompra,
        actualizarOrdenCompra,
        proveedores: proveedoresMock,
        aprobarAdjunto,
        notificaciones,
        agregarNotificacion,
        marcarLeida,
      }}
    >
      {children}
    </ComprasContext.Provider>
  );
}

export function useCompras() {
  const context = useContext(ComprasContext);
  if (!context) {
    throw new Error('useCompras debe usarse dentro de ComprasProvider');
  }
  return context;
}
