'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Edit, Trash2, X, Search, Mail, CheckCircle2, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/hooks/useApiClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Esquema de validación
const userSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().optional(),
  superuser: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface AvailableRole {
  value: string;
  label: string;
  description: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  emailVerified: boolean;
  superuser: boolean;
  createdAt: string;
  roles?: string[];
  membershipActive?: boolean;
  hasMembership?: boolean;
  tenantMemberships?: Array<{
    tenant: {
      id: string;
      name: string;
    };
    roles: string[];
  }>;
}

// Agrupar roles por categoría para el UI
const ROLE_CATEGORIES = {
  'Documentos': ['PROVIDER', 'CLIENT_VIEWER', 'CLIENT_APPROVER'],
  'Compras': ['PURCHASE_REQUESTER', 'PURCHASE_APPROVER', 'PURCHASE_ADMIN'],
  'Administración': ['CLIENT_ADMIN', 'SUPER_ADMIN'],
};

export default function UsersPage() {
  const { user: currentUser, isSuperuser, tenant: currentTenant } = useAuth();
  const { get, post, put, delete: del } = useApiClient();

  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(Object.keys(ROLE_CATEGORIES));

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  // Formulario para usuarios
  const userForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      phone: '',
      superuser: false,
    }
  });

  // Solo superusers pueden gestionar usuarios
  if (!isSuperuser) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Acceso Denegado
            </h1>
            <p className="text-gray-600 mb-4">
              Solo los superusuarios pueden gestionar usuarios.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  useEffect(() => {
    loadUsers();
  }, [currentTenant]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      if (currentTenant?.id) {
        const response = await get<{ users: User[], availableRoles: AvailableRole[] }>(`/api/users/with-roles?tenantId=${currentTenant.id}`);
        setUsers(response.users || []);
        setAvailableRoles(response.availableRoles || []);
      } else {
        const response = await get<{ users: User[] }>('/api/users');
        setUsers(response.users || []);
      }
    } catch (error) {
      toast.error('Error al cargar usuarios');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    userForm.reset({
      email: '',
      password: '',
      name: '',
      phone: '',
      superuser: false,
    });
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.reset({
      email: user.email,
      password: '',
      name: user.name,
      phone: user.phone || '',
      superuser: user.superuser || false,
    });
    setShowUserModal(true);
  };

  const handleManageRoles = (user: User) => {
    setSelectedUserForRoles(user);
    setSelectedRoles(user.roles || []);
    setShowRolesModal(true);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUserForRoles || !currentTenant?.id) return;

    try {
      setLoading(true);
      await put(`/api/users/${selectedUserForRoles.id}/roles`, {
        tenantId: currentTenant.id,
        roles: selectedRoles,
      });
      toast.success('Roles actualizados correctamente');
      setShowRolesModal(false);
      await loadUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al actualizar roles';
      toast.error(errorMessage);
      console.error('Error saving roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitUser = async (data: UserFormData) => {
    try {
      setLoading(true);

      const submitData: any = { ...data };
      if (editingUser && !data.password) {
        delete submitData.password;
      }

      if (editingUser) {
        await put(`/api/users/${editingUser.id}`, submitData);
        toast.success('Usuario actualizado correctamente');
      } else {
        await post('/api/users', submitData);
        toast.success('Usuario creado correctamente');
      }

      setShowUserModal(false);
      userForm.reset();
      await loadUsers();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al guardar usuario';
      toast.error(errorMessage);
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`¿Está seguro de eliminar ${user.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      await del(`/api/users/${user.id}`);
      await loadUsers();
      toast.success('Usuario eliminado correctamente');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al eliminar usuario';
      toast.error(errorMessage);
      console.error('Error deleting user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async (user: User) => {
    try {
      setLoading(true);
      await post(`/api/auth/resend-verification`, { email: user.email });
      toast.success(`Email de verificación enviado a ${user.email}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al enviar email de verificación';
      toast.error(errorMessage);
      console.error('Error resending verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailManually = async (user: User) => {
    if (!confirm(`¿Estás seguro de que quieres verificar manualmente el email de ${user.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      await put(`/api/users/${user.id}/verify-email`, {});
      toast.success('Email verificado correctamente');
      setUsers(prevUsers => prevUsers.map(u =>
        u.id === user.id ? { ...u, emailVerified: true } : u
      ));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error al verificar email';
      toast.error(errorMessage);
      console.error('Error verifying email manually:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (roleValue: string): string => {
    const role = availableRoles.find(r => r.value === roleValue);
    return role?.label || roleValue;
  };

  const getRoleBadgeColor = (role: string): string => {
    if (role.startsWith('PURCHASE_')) return 'bg-blue-100 text-blue-700';
    if (role.startsWith('CLIENT_')) return 'bg-green-100 text-green-700';
    if (role === 'PROVIDER') return 'bg-yellow-100 text-yellow-700';
    if (role === 'SUPER_ADMIN') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-palette-purple/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-palette-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Gestión de Usuarios
              </h1>
              <p className="text-text-secondary">
                Administra los usuarios y sus roles en {currentTenant?.name || 'el sistema'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="p-6 h-full flex flex-col">
            <div className="bg-white rounded-lg border border-border flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-text-primary">Usuarios</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Buscar usuarios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm w-64"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateUser}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Nuevo Usuario</span>
                </Button>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
                {loading && users.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-text-secondary">Cargando usuarios...</div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-text-secondary">
                      {searchTerm ? 'No se encontraron usuarios que coincidan con la búsqueda' : 'No hay usuarios registrados'}
                    </div>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Roles
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-text-primary font-medium">
                              {user.name}
                              {user.superuser && (
                                <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                  Superuser
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {user.phone || 'Sin teléfono'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-text-secondary">
                              {user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {user.roles && user.roles.length > 0 ? (
                                user.roles.map((role) => (
                                  <span
                                    key={role}
                                    className={`text-xs px-2 py-0.5 rounded ${getRoleBadgeColor(role)}`}
                                  >
                                    {getRoleLabel(role)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-text-secondary italic">Sin roles asignados</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user.emailVerified ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                                  <span className="text-sm text-green-700">Verificado</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                                  <span className="text-sm text-red-700">No verificado</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleManageRoles(user)}
                                className="p-1 text-blue-600 hover:text-blue-700 rounded"
                                title="Gestionar roles"
                              >
                                <Shield className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-1 text-green-600 hover:text-green-700 rounded"
                                title="Editar usuario"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {!user.emailVerified && (
                                <>
                                  <button
                                    onClick={() => handleResendVerification(user)}
                                    className="p-1 text-blue-600 hover:text-blue-700 rounded"
                                    title="Reenviar email de verificación"
                                  >
                                    <Mail className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleVerifyEmailManually(user)}
                                    className="p-1 text-green-600 hover:text-green-700 rounded"
                                    title="Verificar email manualmente"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-1 text-red-600 hover:text-red-900 rounded"
                                title="Eliminar usuario permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Usuario */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-text-primary">
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={userForm.handleSubmit(onSubmitUser)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Email
                  </label>
                  <input
                    {...userForm.register('email')}
                    type="email"
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  {userForm.formState.errors.email && (
                    <p className="text-red-500 text-sm mt-1">{userForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                  </label>
                  <input
                    {...userForm.register('password')}
                    type="password"
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  {userForm.formState.errors.password && (
                    <p className="text-red-500 text-sm mt-1">{userForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Nombre
                  </label>
                  <input
                    {...userForm.register('name')}
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                  {userForm.formState.errors.name && (
                    <p className="text-red-500 text-sm mt-1">{userForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    {...userForm.register('phone')}
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>

                {isSuperuser && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="superuser"
                      {...userForm.register('superuser')}
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                    />
                    <label htmlFor="superuser" className="text-sm font-medium text-text-primary">
                      Usuario Super Administrador
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Roles */}
        {showRolesModal && selectedUserForRoles && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    Gestionar Roles
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {selectedUserForRoles.name} - {currentTenant?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowRolesModal(false)}
                  className="text-text-secondary hover:text-text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <div className="space-y-4">
                  {Object.entries(ROLE_CATEGORIES).map(([category, roles]) => (
                    <div key={category} className="border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-medium text-text-primary">{category}</span>
                        {expandedCategories.includes(category) ? (
                          <ChevronUp className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-text-secondary" />
                        )}
                      </button>

                      {expandedCategories.includes(category) && (
                        <div className="p-3 space-y-2">
                          {roles.map((roleValue) => {
                            const role = availableRoles.find(r => r.value === roleValue);
                            if (!role) return null;

                            const isSelected = selectedRoles.includes(roleValue);

                            return (
                              <label
                                key={roleValue}
                                className={`flex items-start p-3 rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-primary/10 border border-primary'
                                    : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRole(roleValue)}
                                  className="w-4 h-4 mt-0.5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                                />
                                <div className="ml-3">
                                  <div className="font-medium text-text-primary">
                                    {role.label}
                                  </div>
                                  <div className="text-sm text-text-secondary">
                                    {role.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedRoles.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-text-primary mb-2">
                      Roles seleccionados ({selectedRoles.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedRoles.map((role) => (
                        <span
                          key={role}
                          className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(role)}`}
                        >
                          {getRoleLabel(role)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRolesModal(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveRoles} disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar Roles'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
