'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupplier } from '@/hooks/useSupplier';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Shield,
  Crown,
} from 'lucide-react';

interface SupplierUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  createdAt: string;
  roles: string[];
  membershipId: string | null;
  isMainUser: boolean;
}

export default function UsuariosProveedorPage() {
  const router = useRouter();
  const { isSupplier, supplierId, loading: supplierLoading } = useSupplier();
  const [users, setUsers] = useState<SupplierUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!supplierLoading && isSupplier) {
      fetchUsers();
    } else if (!supplierLoading && !isSupplier) {
      setLoading(false);
    }
  }, [supplierLoading, isSupplier]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/suppliers/me/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        toast.error('Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!newUserEmail) {
      toast.error('El email es requerido');
      return;
    }

    try {
      setInviting(true);
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/suppliers/me/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Usuario invitado correctamente');
        setShowInviteModal(false);
        setNewUserEmail('');
        setNewUserName('');
        fetchUsers();
      } else {
        toast.error(data.error || 'Error al invitar usuario');
      }
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Error de conexión');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de desactivar este usuario?')) return;

    try {
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/suppliers/me/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Usuario desactivado');
        fetchUsers();
      } else {
        toast.error(data.error || 'Error al desactivar usuario');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Error de conexión');
    }
  };

  // Loading state
  if (supplierLoading || loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-palette-purple" />
      </div>
    );
  }

  // Si no es proveedor
  if (!isSupplier) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-border p-12 text-center">
          <Users className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary font-medium">No tienes acceso a esta sección</p>
          <p className="text-text-secondary text-sm mt-2">
            Esta página es solo para proveedores registrados
          </p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona los usuarios que pueden acceder al portal de tu empresa"
        icon={Users}
        action={
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar Usuario
          </Button>
        }
      />

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Todos los usuarios invitados tendrán acceso completo al portal del proveedor
          (cotizaciones, documentos, pagos, etc.)
        </p>
      </div>

      {/* Lista de usuarios */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-secondary">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-palette-purple/10 rounded-full flex items-center justify-center">
                          <span className="text-palette-purple font-medium">
                            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                            {user.name || 'Sin nombre'}
                            {user.isMainUser && (
                              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                <Crown className="w-3 h-3" />
                                Principal
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Desde {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm text-text-primary">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                        <Shield className="w-3 h-3" />
                        Proveedor
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {!user.isMainUser && (
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Desactivar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de invitación */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">Invitar Usuario</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Nombre (opcional)
                </label>
                <Input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nombre del usuario"
                />
              </div>
              <p className="text-xs text-text-secondary">
                Se enviará un email al usuario con las credenciales de acceso.
              </p>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInvite} disabled={inviting || !newUserEmail}>
                {inviting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Invitar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
