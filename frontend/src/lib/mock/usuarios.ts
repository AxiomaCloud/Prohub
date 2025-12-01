import { Usuario } from '@/types/compras';

export const usuariosMock: Usuario[] = [
  {
    id: 'user-1',
    nombre: 'Juan Pérez',
    email: 'juan.perez@empresa.com',
    rol: 'SOLICITANTE',
    departamento: 'Tecnología',
    avatar: '/avatars/juan.jpg',
  },
  {
    id: 'user-2',
    nombre: 'María García',
    email: 'maria.garcia@empresa.com',
    rol: 'APROBADOR',
    departamento: 'Administración',
    avatar: '/avatars/maria.jpg',
  },
  {
    id: 'user-3',
    nombre: 'Carlos López',
    email: 'carlos.lopez@empresa.com',
    rol: 'SOLICITANTE',
    departamento: 'Ventas',
    avatar: '/avatars/carlos.jpg',
  },
];

// Usuario actual para la sesion (mock)
export const usuarioActualMock: Usuario = usuariosMock[0]; // Juan Perez - Solicitante

// Funcion para cambiar de usuario (para probar diferentes roles)
export function getUsuarioById(id: string): Usuario | undefined {
  return usuariosMock.find((u) => u.id === id);
}

export function getAprobadores(): Usuario[] {
  return usuariosMock.filter((u) => u.rol === 'APROBADOR');
}

export function getSolicitantes(): Usuario[] {
  return usuariosMock.filter((u) => u.rol === 'SOLICITANTE');
}
