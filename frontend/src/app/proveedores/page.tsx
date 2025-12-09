'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
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
  Eye,
  UserCheck,
  UserX,
  RefreshCw,
  CreditCard,
  FileText,
  Upload,
  Trash2,
  Download,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyDataForm } from '@/components/suppliers/CompanyDataForm';
import { BankDataForm } from '@/components/suppliers/BankDataForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import toast from 'react-hot-toast';

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
  const { token, tenant: currentTenant } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTab, setEditTab] = useState<'company' | 'bank' | 'docs' | 'conversation'>('company');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [supplierDocs, setSupplierDocs] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspendingSupplier, setSuspendingSupplier] = useState<Supplier | null>(null);
  const [suspendMotivo, setSuspendMotivo] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (currentTenant?.id && token) {
      fetchSuppliers();
      fetchStats();
    }
  }, [currentTenant?.id, token, search, statusFilter]);

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        tenantId: currentTenant?.id || '',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`${API_URL}/api/suppliers?${params}`, {
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
      const res = await fetch(`${API_URL}/api/suppliers/stats/${currentTenant?.id}`, {
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
      await fetch(`${API_URL}/api/suppliers/${supplierId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success('Proveedor aprobado correctamente');
      fetchSuppliers();
      fetchStats();
    } catch (error) {
      console.error('Error approving supplier:', error);
      toast.error('Error al aprobar proveedor');
    }
  };

  const openSuspendDialog = (supplier: Supplier) => {
    setSuspendingSupplier(supplier);
    setSuspendMotivo('');
    setShowSuspendDialog(true);
  };

  const handleSuspend = async () => {
    if (!suspendingSupplier || !suspendMotivo.trim()) {
      toast.error('Debe indicar un motivo para la suspensión');
      return;
    }

    try {
      await fetch(`${API_URL}/api/suppliers/${suspendingSupplier.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ motivo: suspendMotivo }),
      });
      toast.success('Proveedor suspendido correctamente');
      fetchSuppliers();
      fetchStats();
      setShowSuspendDialog(false);
      setSuspendingSupplier(null);
      setSuspendMotivo('');
    } catch (error) {
      console.error('Error suspending supplier:', error);
      toast.error('Error al suspender proveedor');
    }
  };

  const handleReactivate = async (supplierId: string) => {
    try {
      await fetch(`${API_URL}/api/suppliers/${supplierId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      toast.success('Proveedor reactivado correctamente');
      fetchSuppliers();
      fetchStats();
    } catch (error) {
      console.error('Error reactivating supplier:', error);
      toast.error('Error al reactivar proveedor');
    }
  };

  const openDeleteDialog = (supplier: Supplier) => {
    setDeletingSupplier(supplier);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingSupplier) return;

    try {
      const res = await fetch(`${API_URL}/api/suppliers/${deletingSupplier.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar proveedor');
      }

      toast.success('Proveedor eliminado correctamente');
      fetchSuppliers();
      fetchStats();
      setShowDeleteDialog(false);
      setDeletingSupplier(null);
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast.error(error.message || 'Error al eliminar proveedor');
    }
  };

  const handleResendInvitation = async (supplierId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/suppliers/${supplierId}/resend-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al reenviar invitación');
      }

      toast.success('Invitación reenviada correctamente');
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast.error(error.message || 'Error al reenviar invitación');
    }
  };

  const handleSaveCompanyData = async (data: any) => {
    if (!selectedSupplier) return;

    setIsSaving(true);
    try {
      await fetch(`${API_URL}/api/suppliers/${selectedSupplier.id}/complete-company-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      toast.success('Datos de empresa guardados');
      fetchSuppliers();
      fetchStats();
      // Pasar al siguiente tab
      setEditTab('bank');
    } catch (error) {
      console.error('Error saving company data:', error);
      toast.error('Error al guardar datos de empresa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBankData = async (data: any) => {
    if (!selectedSupplier) return;

    setIsSaving(true);
    try {
      await fetch(`${API_URL}/api/suppliers/${selectedSupplier.id}/complete-bank-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      toast.success('Datos bancarios guardados');
      fetchSuppliers();
      fetchStats();
      // Pasar al siguiente tab
      setEditTab('docs');
    } catch (error) {
      console.error('Error saving bank data:', error);
      toast.error('Error al guardar datos bancarios');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchSupplierDocs = async (supplierId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSupplierDocs(data.proveedor?.documentos || []);
    } catch (error) {
      console.error('Error fetching supplier docs:', error);
    }
  };

  const handleUploadDocument = async (file: File, tipo: string) => {
    if (!selectedSupplier) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);

      await fetch(`${API_URL}/api/suppliers/${selectedSupplier.id}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      toast.success('Documento subido correctamente');
      await fetchSupplierDocs(selectedSupplier.id);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir documento');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedSupplier) return;

    try {
      await fetch(`${API_URL}/api/suppliers/${selectedSupplier.id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Documento eliminado');
      await fetchSupplierDocs(selectedSupplier.id);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar documento');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSupplier || !message.trim()) return;

    setSendingMessage(true);
    try {
      await fetch(`${API_URL}/api/suppliers/${selectedSupplier.id}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          tenantId: currentTenant?.id,
        }),
      });
      setMessage('');
      toast.success('Mensaje enviado correctamente al proveedor');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatCuit = (cuit: string) => {
    if (!cuit) return '-';
    const clean = cuit.replace(/\D/g, '');
    if (clean.length !== 11) return cuit;
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-palette-yellow rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-palette-dark" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Proveedores
            </h1>
            <p className="text-text-secondary">
              Gestiona tus proveedores y su onboarding
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Invitar Proveedor
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">

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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-700 dark:text-white"
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
            <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-gray-500">Cargando proveedores...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay proveedores</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="mt-4 text-secondary hover:text-secondary-hover font-medium"
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
                        <div className="w-10 h-10 bg-palette-light/20 dark:bg-palette-purple/20 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-secondary" />
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSupplier(supplier);
                            setShowEditModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-yellow-600 text-sm hover:text-yellow-700 hover:underline"
                        >
                          <Clock className="w-4 h-4" />
                          Pendiente
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/proveedores/${supplier.id}`)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>

                        {supplier.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleApprove(supplier.id)}
                            className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                            title="Aprobar"
                          >
                            <UserCheck className="w-4 h-4 text-green-600" />
                          </button>
                        )}

                        {supplier.status === 'ACTIVE' && (
                          <button
                            onClick={() => openSuspendDialog(supplier)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                            title="Suspender"
                          >
                            <UserX className="w-4 h-4 text-red-600" />
                          </button>
                        )}

                        {supplier.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleReactivate(supplier.id)}
                            className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                            title="Reactivar"
                          >
                            <RefreshCw className="w-4 h-4 text-green-600" />
                          </button>
                        )}

                        {(supplier.status === 'INVITED' || supplier.status === 'PENDING_COMPLETION') && supplier.email && (
                          <button
                            onClick={() => handleResendInvitation(supplier.id)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                            title="Reenviar Invitación"
                          >
                            <Send className="w-4 h-4 text-blue-600" />
                          </button>
                        )}

                        <button
                          onClick={() => openDeleteDialog(supplier)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          title="Eliminar proveedor"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
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

      {/* Modal de Edición de Datos del Proveedor */}
      {showEditModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-palette-yellow rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-palette-dark" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Completar datos de {selectedSupplier.nombre}
                  </h2>
                  <p className="text-sm text-gray-500">
                    CUIT: {formatCuit(selectedSupplier.cuit)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSupplier(null);
                  setEditTab('company');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setEditTab('company')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  editTab === 'company'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Empresa
              </button>
              <button
                onClick={() => setEditTab('bank')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  editTab === 'bank'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Datos Bancarios
              </button>
              <button
                onClick={() => {
                  setEditTab('docs');
                  fetchSupplierDocs(selectedSupplier.id);
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  editTab === 'docs'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Documentos
              </button>
              <button
                onClick={() => setEditTab('conversation')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  editTab === 'conversation'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Conversación
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Tab: Empresa */}
              {editTab === 'company' && (
                <CompanyDataForm
                  initialData={selectedSupplier as any}
                  razonSocial={selectedSupplier.nombre}
                  cuit={formatCuit(selectedSupplier.cuit)}
                  onSubmit={handleSaveCompanyData}
                  onCancel={() => {
                    setShowEditModal(false);
                    setSelectedSupplier(null);
                  }}
                  isLoading={isSaving}
                />
              )}

              {/* Tab: Datos Bancarios */}
              {editTab === 'bank' && (
                <BankDataForm
                  initialData={{}}
                  onSubmit={handleSaveBankData}
                  onCancel={() => {
                    setShowEditModal(false);
                    setSelectedSupplier(null);
                  }}
                  isLoading={isSaving}
                />
              )}

              {/* Tab: Documentos */}
              {editTab === 'docs' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documentación del Proveedor
                    </h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Sube la documentación requerida para completar el onboarding.
                    </p>
                  </div>

                  {/* Documento: Constancia de CUIT */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Constancia de Inscripción AFIP
                      </span>
                      <label className="px-3 py-1.5 bg-secondary hover:bg-secondary-hover text-white text-sm rounded-lg cursor-pointer flex items-center gap-1">
                        <Upload className="w-4 h-4" />
                        Subir
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDocument(file, 'CONSTANCIA_AFIP');
                          }}
                          disabled={uploadingDoc}
                        />
                      </label>
                    </div>
                    {supplierDocs.filter(d => d.tipo === 'CONSTANCIA_AFIP').map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded p-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{doc.nombre}</span>
                        <div className="flex gap-2">
                          <a href={doc.url} target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                            <Download className="w-4 h-4 text-gray-500" />
                          </a>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Documento: Constancia CBU */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Constancia de CBU
                      </span>
                      <label className="px-3 py-1.5 bg-secondary hover:bg-secondary-hover text-white text-sm rounded-lg cursor-pointer flex items-center gap-1">
                        <Upload className="w-4 h-4" />
                        Subir
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDocument(file, 'CONSTANCIA_CBU');
                          }}
                          disabled={uploadingDoc}
                        />
                      </label>
                    </div>
                    {supplierDocs.filter(d => d.tipo === 'CONSTANCIA_CBU').map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded p-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{doc.nombre}</span>
                        <div className="flex gap-2">
                          <a href={doc.url} target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                            <Download className="w-4 h-4 text-gray-500" />
                          </a>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Documento: Otro */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Otros Documentos
                      </span>
                      <label className="px-3 py-1.5 bg-secondary hover:bg-secondary-hover text-white text-sm rounded-lg cursor-pointer flex items-center gap-1">
                        <Upload className="w-4 h-4" />
                        Subir
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadDocument(file, 'OTRO');
                          }}
                          disabled={uploadingDoc}
                        />
                      </label>
                    </div>
                    {supplierDocs.filter(d => d.tipo === 'OTRO').map(doc => (
                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded p-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{doc.nombre}</span>
                        <div className="flex gap-2">
                          <a href={doc.url} target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                            <Download className="w-4 h-4 text-gray-500" />
                          </a>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {uploadingDoc && (
                    <div className="text-center py-4">
                      <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-sm text-gray-500 mt-2">Subiendo documento...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Conversación */}
              {editTab === 'conversation' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Enviar mensaje al proveedor
                    </h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      El mensaje será enviado por email a {selectedSupplier.email || 'sin email configurado'}.
                    </p>
                  </div>

                  {!selectedSupplier.email ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Este proveedor no tiene un email configurado. Primero debe completar sus datos de contacto.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Mensaje
                        </label>
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Escribe tu mensaje aquí... Por ejemplo: Por favor actualiza tu constancia de CBU ya que la misma está vencida."
                          rows={6}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-700 dark:text-white resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !message.trim()}
                          className="px-6 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {sendingMessage ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Enviar mensaje
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Suspensión */}
      {showSuspendDialog && suspendingSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Suspender Proveedor
                </h2>
                <p className="text-sm text-gray-500">
                  {suspendingSupplier.nombre}
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Esta acción suspenderá al proveedor y no podrá participar en cotizaciones ni recibir órdenes de compra.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motivo de la suspensión *
                </label>
                <textarea
                  value={suspendMotivo}
                  onChange={(e) => setSuspendMotivo(e.target.value)}
                  placeholder="Indique el motivo de la suspensión..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
              <button
                onClick={() => {
                  setShowSuspendDialog(false);
                  setSuspendingSupplier(null);
                  setSuspendMotivo('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSuspend}
                disabled={!suspendMotivo.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Suspender
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminación */}
      {showDeleteDialog && deletingSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Eliminar Proveedor
                </h2>
                <p className="text-sm text-gray-500">
                  {deletingSupplier.nombre}
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  Se eliminarán todos los documentos y datos asociados al proveedor.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeletingSupplier(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
      const res = await fetch(`${API_URL}/api/suppliers`, {
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-700 dark:text-white"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-700 dark:text-white"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-700 dark:text-white"
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
              className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Invitar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
