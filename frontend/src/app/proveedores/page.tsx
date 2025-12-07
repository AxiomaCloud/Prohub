'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  Filter,
  Building2,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  UserCheck,
  UserX,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface Supplier {
  id: string;
  nombre: string;
  nombreFantasia: string | null;
  cuit: string;
  email: string | null;
  telefono: string | null;
  status: string;
  condicionFiscal: string | null;
  completoOnboarding: boolean;
  createdAt: string;
  documentos: any[];
}

interface Stats {
  total: number;
  active: number;
  pending: number;
  invited: number;
  suspended: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  INVITED: {
    label: 'Invitado',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <Mail className="w-4 h-4" />,
  },
  PENDING_COMPLETION: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <Clock className="w-4 h-4" />,
  },
  PENDING_APPROVAL: {
    label: 'Por Aprobar',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  ACTIVE: {
    label: 'Activo',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  SUSPENDED: {
    label: 'Suspendido',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: <XCircle className="w-4 h-4" />,
  },
  REJECTED: {
    label: 'Rechazado',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    icon: <XCircle className="w-4 h-4" />,
  },
};

export default function ProveedoresPage() {
  const router = useRouter();
  const { token, currentTenant } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  useEffect(() => {
    if (currentTenant?.id) {
      fetchSuppliers();
      fetchStats();
    }
  }, [currentTenant?.id, search, statusFilter]);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        tenantId: currentTenant?.id || '',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`${API_URL}/suppliers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setSuppliers(data.proveedores || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/suppliers/stats/${currentTenant?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (supplierId: string) => {
    try {
      await fetch(`${API_URL}/suppliers/${supplierId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      fetchSuppliers();
      fetchStats();
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error approving supplier:', error);
    }
  };

  const handleSuspend = async (supplierId: string) => {
    const motivo = prompt('Motivo de la suspensión:');
    if (!motivo) return;

    try {
      await fetch(`${API_URL}/suppliers/${supplierId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ motivo }),
      });
      fetchSuppliers();
      fetchStats();
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error suspending supplier:', error);
    }
  };

  const handleReactivate = async (supplierId: string) => {
    try {
      await fetch(`${API_URL}/suppliers/${supplierId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      fetchSuppliers();
      fetchStats();
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error reactivating supplier:', error);
    }
  };

  const formatCuit = (cuit: string) => {
    if (!cuit) return '-';
    const clean = cuit.replace(/\D/g, '');
    if (clean.length !== 11) return cuit;
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-purple-600" />
            Proveedores
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tus proveedores y su onboarding
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Invitar Proveedor
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-green-600">Activos</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-orange-600">Por Aprobar</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-blue-600">Invitados</p>
            <p className="text-2xl font-bold text-blue-600">{stats.invited}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-red-600">Suspendidos</p>
            <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, CUIT o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="PENDING_APPROVAL">Por Aprobar</option>
              <option value="INVITED">Invitados</option>
              <option value="PENDING_COMPLETION">Pendientes</option>
              <option value="SUSPENDED">Suspendidos</option>
              <option value="REJECTED">Rechazados</option>
            </select>
          </div>

          <button
            onClick={fetchSuppliers}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-500">Cargando proveedores...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay proveedores</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              Invitar primer proveedor
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  CUIT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Onboarding
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {suppliers.map((supplier) => {
                const statusConfig = STATUS_CONFIG[supplier.status] || STATUS_CONFIG.INVITED;

                return (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => router.push(`/proveedores/${supplier.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {supplier.nombre}
                          </p>
                          {supplier.nombreFantasia && (
                            <p className="text-sm text-gray-500">{supplier.nombreFantasia}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-mono text-sm">
                      {formatCuit(supplier.cuit)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="w-3 h-3" />
                            {supplier.email}
                          </div>
                        )}
                        {supplier.telefono && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="w-3 h-3" />
                            {supplier.telefono}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {supplier.completoOnboarding ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Completo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-600 text-sm">
                          <Clock className="w-4 h-4" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setShowActionsMenu(showActionsMenu === supplier.id ? null : supplier.id)
                          }
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <MoreHorizontal className="w-5 h-5 text-gray-500" />
                        </button>

                        {showActionsMenu === supplier.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                            <button
                              onClick={() => router.push(`/proveedores/${supplier.id}`)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              Ver detalle
                            </button>

                            {supplier.status === 'PENDING_APPROVAL' && (
                              <button
                                onClick={() => handleApprove(supplier.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600"
                              >
                                <UserCheck className="w-4 h-4" />
                                Aprobar
                              </button>
                            )}

                            {supplier.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleSuspend(supplier.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                              >
                                <UserX className="w-4 h-4" />
                                Suspender
                              </button>
                            )}

                            {supplier.status === 'SUSPENDED' && (
                              <button
                                onClick={() => handleReactivate(supplier.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Reactivar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Invitación - Simplificado */}
      {showInviteModal && (
        <InviteSupplierModal
          tenantId={currentTenant?.id || ''}
          token={token || ''}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            fetchSuppliers();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

// Modal de invitación
function InviteSupplierModal({
  tenantId,
  token,
  onClose,
  onSuccess,
}: {
  tenantId: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    nombre: '',
    cuit: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  const formatCuit = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 10) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 10)}-${numbers.slice(10, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre || !formData.cuit) {
      setError('Nombre y CUIT son requeridos');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId,
          ...formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear proveedor');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Invitar Proveedor
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Razón Social *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Mi Proveedor SRL"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CUIT *
            </label>
            <input
              type="text"
              value={formData.cuit}
              onChange={(e) => setFormData({ ...formData, cuit: formatCuit(e.target.value) })}
              placeholder="30-12345678-9"
              maxLength={13}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email (para invitación)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contacto@proveedor.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Invitar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
