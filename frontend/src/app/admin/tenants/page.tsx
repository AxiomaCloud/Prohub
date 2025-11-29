'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApiClient } from '@/hooks/useApiClient';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search, Edit, Users, BarChart3, Building2, Eye, Ban, Trash2, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  country: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    memberships: number;
  };
}

interface TenantUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  emailVerified: boolean;
  roles: string[];
  membershipId: string;
}

interface AllUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  emailVerified: boolean;
}

export default function TenantsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { get, post, put, delete: del } = useApiClient();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    taxId: '',
    country: '',
    isActive: true
  });

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await get<{ tenants: Tenant[] }>('/api/tenants');
      setTenants(response.tenants || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Error al cargar tenants');
    } finally {
      setLoading(false);
    }
  };

  const loadTenantUsers = async (tenantId: string) => {
    try {
      const response = await get<{ users: TenantUser[] }>(`/api/tenants/${tenantId}/users`);
      setTenantUsers(response.users || []);
    } catch (error) {
      console.error('Error loading tenant users:', error);
      toast.error('Error al cargar usuarios del tenant');
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await get<{ users: AllUser[] }>('/api/users');
      setAllUsers(response.users || []);
    } catch (error) {
      console.error('Error loading all users:', error);
    }
  };

  useEffect(() => {
    fetchTenants();
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      loadTenantUsers(selectedTenant.id);
    }
  }, [selectedTenant]);

  // Solo superusers pueden gestionar tenants
  if (!user?.superuser) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Acceso Denegado
            </h1>
            <p className="text-gray-600 mb-4">
              Solo los superusuarios pueden gestionar tenants.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const openModal = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        legalName: tenant.legalName,
        taxId: tenant.taxId,
        country: tenant.country,
        isActive: tenant.isActive
      });
    } else {
      setEditingTenant(null);
      setFormData({
        name: '',
        legalName: '',
        taxId: '',
        country: '',
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTenant(null);
    setFormData({
      name: '',
      legalName: '',
      taxId: '',
      country: '',
      isActive: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingTenant) {
        await put(`/api/tenants/${editingTenant.id}`, formData);
        toast.success('Tenant actualizado exitosamente');
      } else {
        await post('/api/tenants', formData);
        toast.success('Tenant creado exitosamente');
      }

      closeModal();
      await fetchTenants();
    } catch (error: any) {
      console.error('Error guardando tenant:', error);
      toast.error(error.response?.data?.error || 'Error guardando tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    try {
      await put(`/api/tenants/${tenant.id}`, {
        isActive: !tenant.isActive
      });
      toast.success(`Tenant ${tenant.isActive ? 'desactivado' : 'activado'} exitosamente`);
      await fetchTenants();
    } catch (error: any) {
      console.error('Error cambiando estado del tenant:', error);
      toast.error(error.response?.data?.error || 'Error cambiando estado del tenant');
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`¿Está seguro de eliminar ${tenant.name}?`)) {
      return;
    }

    try {
      await del(`/api/tenants/${tenant.id}`);
      toast.success('Tenant eliminado exitosamente');
      await fetchTenants();
    } catch (error: any) {
      console.error('Error eliminando tenant:', error);
      toast.error(error.response?.data?.error || 'Error eliminando tenant');
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId || !selectedTenant) return;

    try {
      await post(`/api/tenants/${selectedTenant.id}/users`, {
        userId: selectedUserId,
        roles: [],
      });
      toast.success('Usuario asignado al tenant exitosamente');
      setIsUserModalOpen(false);
      setSelectedUserId('');
      loadTenantUsers(selectedTenant.id);
    } catch (error: any) {
      console.error('Error adding user to tenant:', error);
      toast.error(error.response?.data?.error || 'Error al asignar usuario');
    }
  };

  const handleRemoveUser = async (membershipId: string) => {
    if (!selectedTenant) return;
    if (!confirm('¿Estás seguro de remover este usuario del tenant?')) return;

    try {
      await del(`/api/tenants/${selectedTenant.id}/users/${membershipId}`);
      toast.success('Usuario removido del tenant exitosamente');
      loadTenantUsers(selectedTenant.id);
    } catch (error: any) {
      console.error('Error removing user from tenant:', error);
      toast.error(error.response?.data?.error || 'Error al remover usuario');
    }
  };

  // Filtrar tenants por búsqueda
  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.taxId.toLowerCase().includes(search.toLowerCase()) ||
    t.legalName.toLowerCase().includes(search.toLowerCase())
  );

  // Filtrar usuarios que no están asignados al tenant actual
  const availableUsers = allUsers.filter(
    u => !tenantUsers.some(tu => tu.id === u.id)
  );

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-palette-purple/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-palette-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Gestión de Tenants
              </h1>
              <p className="text-text-secondary mt-1">
                Administra las organizaciones del sistema
              </p>
            </div>
          </div>
          <Button onClick={() => openModal()} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Tenant
          </Button>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total Tenants</p>
                  <div className="text-2xl font-bold text-text-primary mt-1">
                    {tenants.length}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Activos</p>
                  <div className="text-2xl font-bold text-text-primary mt-1">
                    {tenants.filter(t => t.isActive).length}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total Usuarios</p>
                  <div className="text-2xl font-bold text-text-primary mt-1">
                    {tenants.reduce((acc, t) => acc + (t._count?.memberships || 0), 0)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-orange-50">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, razón social, CUIT..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Tenants Registrados</CardTitle>
          </CardHeader>
          <CardContent className="!p-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                <div className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Razón Social
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          CUIT
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          País
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Usuarios
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Creado
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border">
                      {filteredTenants.map((tenant) => (
                        <tr
                          key={tenant.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-text-primary font-medium">
                              {tenant.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-text-secondary">
                              {tenant.legalName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                              {tenant.taxId}
                            </code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-text-secondary">
                              {tenant.country}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-text-secondary">
                                {tenant._count?.memberships || 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={tenant.isActive ? "default" : "secondary"}
                            >
                              {tenant.isActive ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-text-secondary">
                              {formatDate(tenant.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setIsUserModalOpen(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-700 rounded"
                                title="Gestionar usuarios"
                              >
                                <Users className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openModal(tenant)}
                                className="p-1 text-green-600 hover:text-green-700 rounded"
                                title="Editar tenant"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(tenant)}
                                className={`p-1 rounded ${
                                  tenant.isActive
                                    ? 'text-orange-600 hover:text-orange-700'
                                    : 'text-blue-600 hover:text-blue-700'
                                }`}
                                title={tenant.isActive ? 'Desactivar tenant' : 'Activar tenant'}
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(tenant)}
                                className="p-1 text-red-600 hover:text-red-900 rounded"
                                title="Eliminar tenant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal de edición/creación de tenant */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-text-primary">
                  {editingTenant ? 'Editar Tenant' : 'Nuevo Tenant'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Nombre del tenant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón Social
                  </label>
                  <Input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                    required
                    placeholder="Razón social completa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CUIT
                  </label>
                  <Input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    required
                    placeholder="20-12345678-9"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    País
                  </label>
                  <Input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    placeholder="Argentina"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Activo
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving
                      ? 'Guardando...'
                      : editingTenant ? 'Actualizar' : 'Crear'
                    }
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal para gestionar usuarios del tenant */}
        {isUserModalOpen && selectedTenant && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
                <h3 className="text-lg font-semibold text-text-primary">
                  Usuarios de {selectedTenant.name}
                </h3>
                <button
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setSelectedTenant(null);
                    setSelectedUserId('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {/* Agregar usuario */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Asignar Usuario
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                    >
                      <option value="">Selecciona un usuario...</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.email}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={handleAddUser}
                      disabled={!selectedUserId}
                      className="bg-palette-purple hover:bg-palette-dark text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Asignar
                    </Button>
                  </div>
                  {availableUsers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Todos los usuarios ya están asignados a este tenant
                    </p>
                  )}
                </div>

                {/* Lista de usuarios asignados */}
                <div>
                  <h4 className="font-semibold text-text-primary mb-3">
                    Usuarios Asignados ({tenantUsers.length})
                  </h4>
                  {tenantUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay usuarios asignados a este tenant</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tenantUsers.map((tenantUser) => (
                        <div
                          key={tenantUser.membershipId}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-text-primary">{tenantUser.name}</p>
                            <p className="text-sm text-text-secondary">{tenantUser.email}</p>
                            {tenantUser.phone && (
                              <p className="text-xs text-text-tertiary mt-1">{tenantUser.phone}</p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleRemoveUser(tenantUser.membershipId)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:border-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0 border-t border-gray-200 sticky bottom-0 bg-white">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setSelectedTenant(null);
                    setSelectedUserId('');
                  }}
                  className="flex-1"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
