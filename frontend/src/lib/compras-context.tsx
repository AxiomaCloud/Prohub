'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Usuario, Requerimiento, EstadoRequerimiento } from '@/types/compras';
import { usuariosMock, requerimientosMock } from '@/lib/mock';

interface ComprasContextType {
  // Usuario
  usuarioActual: Usuario;
  cambiarUsuario: (id: string) => void;
  usuarios: Usuario[];

  // Requerimientos
  requerimientos: Requerimiento[];
  agregarRequerimiento: (req: Requerimiento) => void;
  actualizarRequerimiento: (id: string, data: Partial<Requerimiento>) => void;

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

export function ComprasProvider({ children }: { children: React.ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<Usuario>(usuariosMock[0]);
  const [requerimientos, setRequerimientos] =
    useState<Requerimiento[]>(requerimientosMock);
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
    const usuario = usuariosMock.find((u) => u.id === id);
    if (usuario) {
      setUsuarioActual(usuario);
    }
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

  return (
    <ComprasContext.Provider
      value={{
        usuarioActual,
        cambiarUsuario,
        usuarios: usuariosMock,
        requerimientos,
        agregarRequerimiento,
        actualizarRequerimiento,
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
