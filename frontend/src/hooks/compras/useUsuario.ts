'use client';

import { useState, useCallback } from 'react';
import { Usuario } from '@/types/compras';
import { usuariosMock, usuarioActualMock } from '@/lib/mock';

// Hook para manejar el usuario actual (mock)
export function useUsuario() {
  const [usuarioActual, setUsuarioActual] =
    useState<Usuario>(usuarioActualMock);

  // Cambiar de usuario (para testear diferentes roles)
  const cambiarUsuario = useCallback((usuarioId: string) => {
    const usuario = usuariosMock.find((u) => u.id === usuarioId);
    if (usuario) {
      setUsuarioActual(usuario);
    }
  }, []);

  const esSolicitante = usuarioActual.rol === 'SOLICITANTE';
  const esAprobador = usuarioActual.rol === 'APROBADOR';
  const esAdmin = usuarioActual.rol === 'ADMIN';

  return {
    usuarioActual,
    usuarios: usuariosMock,
    cambiarUsuario,
    esSolicitante,
    esAprobador,
    esAdmin,
  };
}
