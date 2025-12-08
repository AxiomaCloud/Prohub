'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  FileText,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Edit,
  UserCheck,
  UserX,
  Upload,
  Trash2,
  Download,
  Eye,
  Plus,
  Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BankDataForm } from '@/components/suppliers/BankDataForm';
import { CompanyDataForm } from '@/components/suppliers/CompanyDataForm';

interface SupplierBankAccount {
  id: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string | null;
  cbu: string;
  alias: string | null;
  titularCuenta: string;
  moneda: string;
  esPrincipal: boolean;
}

interface Supplier {
  id: string;
  nombre: string;
  nombreFantasia: string | null;
  cuit: string;
  status: string;
  condicionFiscal: string | null;
  tipoFactura: string | null;
  direccion: string | null;
  numero: string | null;
  piso: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  pais: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  emailFacturacion: string | null;
  contactoNombre: string | null;
  contactoCargo: string | null;
  banco: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
  cbu: string | null;
  alias: string | null;
  titularCuenta: string | null;
  cuitTitular: string | null;
  monedaCuenta: string | null;
  cuentasBancarias?: SupplierBankAccount[];
  notifEmail: boolean;
  notifWhatsapp: boolean;
  notifSms: boolean;
  notifDocStatus: boolean;
  notifPagos: boolean;
  notifComentarios: boolean;
  notifOC: boolean;
  completoOnboarding: boolean;
  invitadoAt: string | null;
  aprobadoAt: string | null;
  motivoRechazo: string | null;
  documentos: SupplierDocument[];
  createdAt: string;
}

interface SupplierDocument {
  id: string;
  tipo: string;
  nombre: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  INVITED: {
    label: 'Invitado',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  PENDING_COMPLETION: {
    label: 'Pendiente de Completar',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  PENDING_APPROVAL: {
    label: 'Pendiente de Aprobación',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  ACTIVE: {
    label: 'Activo',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  SUSPENDED: {
    label: 'Suspendido',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  REJECTED: {
    label: 'Rechazado',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  CONSTANCIA_CBU: 'Constancia de CBU',
  CONSTANCIA_AFIP: 'Constancia de AFIP',
  CONSTANCIA_IIBB: 'Constancia de IIBB',
  CERTIFICADO_RETENCION: 'Certificado de Retención',
  OTRO: 'Otro',
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'bank' | 'docs'>('info');
  const [editMode, setEditMode] = useState<'none' | 'bank' | 'company'>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<SupplierBankAccount | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const supplierId = params.id as string;

  useEffect(() => {
    fetchSupplier();
  }, [supplierId]);

  const fetchSupplier = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSupplier(data.proveedor);
    } catch (error) {
      console.error('Error fetching supplier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBankData = async (data: any) => {
    setIsSaving(true);
    try {
      await fetch(`${API_URL}/api/suppliers/${supplierId}/complete-bank-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      await fetchSupplier();
      setEditMode('none');
    } catch (error) {
      console.error('Error saving bank data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCompanyData = async (data: any) => {
    setIsSaving(true);
    try {
      await fetch(`${API_URL}/api/suppliers/${supplierId}/complete-company-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      await fetchSupplier();
      setEditMode('none');
    } catch (error) {
      console.error('Error saving company data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      await fetch(`${API_URL}/api/suppliers/${supplierId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSupplier();
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async () => {
    const motivo = prompt('Motivo del rechazo:');
    if (!motivo) return;

    try {
      await fetch(`${API_URL}/api/suppliers/${supplierId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ motivo }),
      });
      await fetchSupplier();
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  const handleUploadDocument = async (file: File, tipo: string) => {
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', tipo);

      await fetch(`${API_URL}/api/suppliers/${supplierId}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      await fetchSupplier();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('¿Eliminar este documento?')) return;

    try {
      await fetch(`${API_URL}/api/suppliers/${supplierId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchSupplier();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const formatCuit = (cuit: string) => {
    if (!cuit) return '-';
    const clean = cuit.replace(/\D/g, '');
    if (clean.length !== 11) return cuit;
    return `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
  };

  // Funciones para manejo de cuentas bancarias
  const handleAddBankAccount = () => {
    setEditingBankAccount(null);
    setShowBankModal(true);
  };

  const handleEditBankAccount = (cuenta: SupplierBankAccount) => {
    setEditingBankAccount(cuenta);
    setShowBankModal(true);
  };

  const handleDeleteBankAccount = async (cuentaId: string) => {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return;

    try {
      const cuentasActuales = supplier?.cuentasBancarias || [];
      const nuevasCuentas = cuentasActuales.filter(c => c.id !== cuentaId);

      await fetch(`${API_URL}/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cuentasBancarias: nuevasCuentas }),
      });
      await fetchSupplier();
    } catch (error) {
      console.error('Error deleting bank account:', error);
    }
  };

  const handleSetPrincipal = async (cuentaId: string) => {
    try {
      const cuentasActuales = supplier?.cuentasBancarias || [];
      const nuevasCuentas = cuentasActuales.map(c => ({
        ...c,
        esPrincipal: c.id === cuentaId,
      }));

      await fetch(`${API_URL}/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cuentasBancarias: nuevasCuentas }),
      });
      await fetchSupplier();
    } catch (error) {
      console.error('Error setting principal account:', error);
    }
  };

  const handleSaveBankAccount = async (data: any) => {
    setIsSaving(true);
    try {
      const cuentasActuales = supplier?.cuentasBancarias || [];
      let nuevasCuentas;

      if (editingBankAccount) {
        // Editar cuenta existente
        nuevasCuentas = cuentasActuales.map(c =>
          c.id === editingBankAccount.id ? { ...c, ...data } : c
        );
      } else {
        // Agregar nueva cuenta
        const nuevaCuenta = {
          ...data,
          id: `temp-${Date.now()}`, // ID temporal, el backend lo reemplazará
          esPrincipal: cuentasActuales.length === 0, // Primera cuenta es principal
        };
        nuevasCuentas = [...cuentasActuales, nuevaCuenta];
      }

      // Si la nueva cuenta es principal, desmarcar las demás
      if (data.esPrincipal) {
        nuevasCuentas = nuevasCuentas.map(c => ({
          ...c,
          esPrincipal: editingBankAccount ? c.id === editingBankAccount.id : c.id === nuevasCuentas[nuevasCuentas.length - 1].id,
        }));
      }

      await fetch(`${API_URL}/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cuentasBancarias: nuevasCuentas }),
      });

      await fetchSupplier();
      setShowBankModal(false);
      setEditingBankAccount(null);
    } catch (error) {
      console.error('Error saving bank account:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Proveedor no encontrado</p>
        <button
          onClick={() => router.push('/proveedores')}
          className="mt-4 text-secondary hover:text-secondary-hover"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[supplier.status] || STATUS_CONFIG.INVITED;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/proveedores')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {supplier.nombre}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            {supplier.nombreFantasia && (
              <p className="text-gray-500 mt-1">{supplier.nombreFantasia}</p>
            )}
            <p className="text-gray-500 font-mono">{formatCuit(supplier.cuit)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {supplier.status === 'PENDING_APPROVAL' && (
            <>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Aprobar
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
              >
                <UserX className="w-4 h-4" />
                Rechazar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Datos de Empresa
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'bank'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Datos Bancarios
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'docs'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Documentos ({supplier.documentos?.length || 0})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Información de la Empresa
                </h2>
                <button
                  onClick={() => setEditMode('company')}
                  className="text-secondary hover:text-secondary-hover flex items-center gap-1 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoItem label="Condición Fiscal" value={supplier.condicionFiscal?.replace('_', ' ')} />
                  <InfoItem label="Tipo de Factura" value={supplier.tipoFactura ? `Factura ${supplier.tipoFactura}` : null} />

                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Domicilio Fiscal
                    </h3>
                    <p className="text-gray-900 dark:text-white">
                      {[supplier.direccion, supplier.numero, supplier.piso].filter(Boolean).join(' ')}
                      {supplier.localidad && `, ${supplier.localidad}`}
                      {supplier.provincia && `, ${supplier.provincia}`}
                      {supplier.codigoPostal && ` (${supplier.codigoPostal})`}
                      {!supplier.direccion && '-'}
                    </p>
                  </div>

                  <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Contacto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoItem label="Email" value={supplier.email} icon={<Mail className="w-4 h-4" />} />
                      <InfoItem label="Email Facturación" value={supplier.emailFacturacion} />
                      <InfoItem label="Teléfono" value={supplier.telefono} icon={<Phone className="w-4 h-4" />} />
                      <InfoItem label="WhatsApp" value={supplier.whatsapp} />
                      <InfoItem label="Contacto" value={supplier.contactoNombre} />
                      <InfoItem label="Cargo" value={supplier.contactoCargo} />
                    </div>
                  </div>
                </div>
              </div>
          </div>
        )}

        {/* Bank Tab */}
        {activeTab === 'bank' && (
          <div>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Datos Bancarios
                </h2>
                <button
                  onClick={handleAddBankAccount}
                  className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Cuenta
                </button>
              </div>

              {/* Mostrar grilla de cuentas bancarias si hay múltiples */}
              {supplier.cuentasBancarias && supplier.cuentasBancarias.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Banco</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">CBU/CVU</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Alias</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Titular</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Moneda</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Principal</th>
                        <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplier.cuentasBancarias.map((cuenta) => (
                        <tr
                          key={cuenta.id}
                          className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                            cuenta.esPrincipal ? 'bg-green-50 dark:bg-green-900/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {cuenta.banco}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                            {cuenta.tipoCuenta.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">
                            {cuenta.cbu}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                            {cuenta.alias || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {cuenta.titularCuenta}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                            {cuenta.moneda === 'ARS' ? 'ARS' : 'USD'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {cuenta.esPrincipal ? (
                              <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <button
                                onClick={() => handleSetPrincipal(cuenta.id)}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                title="Marcar como principal"
                              >
                                <Star className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEditBankAccount(cuenta)}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => handleDeleteBankAccount(cuenta.id)}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : supplier.cbu ? (
                /* Fallback para datos bancarios legacy (una sola cuenta) */
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Banco</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Tipo</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">CBU/CVU</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Alias</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Titular</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Moneda</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {supplier.banco || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                          {supplier.tipoCuenta?.replace('_', ' ') || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">
                          {supplier.cbu}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                          {supplier.alias || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {supplier.titularCuenta || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                          {supplier.monedaCuenta === 'ARS' ? 'ARS' : supplier.monedaCuenta === 'USD' ? 'USD' : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No hay datos bancarios cargados</p>
                  <button
                    onClick={() => setEditMode('bank')}
                    className="text-secondary hover:text-secondary-hover font-medium"
                  >
                    Cargar datos bancarios
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Docs Tab */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Documentos del Proveedor
              </h2>
              <DocumentUploadButton
                onUpload={handleUploadDocument}
                isLoading={uploadingDoc}
              />
            </div>

            {supplier.documentos?.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay documentos cargados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {supplier.documentos?.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-secondary" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{doc.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {DOC_TYPE_LABELS[doc.tipo] || doc.tipo} • {(doc.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`${API_URL.replace('/api/v1', '')}${doc.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </a>
                      <a
                        href={`${API_URL.replace('/api/v1', '')}${doc.fileUrl}`}
                        download
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4 text-gray-500" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para editar datos de empresa */}
      {editMode === 'company' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <CompanyDataForm
                initialData={supplier as any}
                razonSocial={supplier.nombre}
                cuit={formatCuit(supplier.cuit)}
                onSubmit={handleSaveCompanyData}
                onCancel={() => setEditMode('none')}
                isLoading={isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar datos bancarios */}
      {editMode === 'bank' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <BankDataForm
                initialData={supplier as any}
                onSubmit={handleSaveBankData}
                onCancel={() => setEditMode('none')}
                isLoading={isSaving}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar/editar cuenta bancaria individual */}
      {showBankModal && (
        <BankAccountModal
          cuenta={editingBankAccount}
          onSave={handleSaveBankAccount}
          onCancel={() => {
            setShowBankModal(false);
            setEditingBankAccount(null);
          }}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}

// Helper components
function InfoItem({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}

function DocumentUploadButton({
  onUpload,
  isLoading,
}: {
  onUpload: (file: File, tipo: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState('');

  const handleTypeSelect = (tipo: string) => {
    setSelectedType(tipo);
    setShowMenu(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedType) {
      await onUpload(file, selectedType);
      e.target.value = '';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isLoading}
        className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
      >
        <Upload className="w-4 h-4" />
        {isLoading ? 'Subiendo...' : 'Subir Documento'}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
          {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handleTypeSelect(key)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

// Lista de bancos de Argentina
const BANCOS_ARGENTINA = [
  { value: 'BANCO_NACION', label: 'Banco de la Nación Argentina' },
  { value: 'BANCO_PROVINCIA', label: 'Banco de la Provincia de Buenos Aires' },
  { value: 'BANCO_CIUDAD', label: 'Banco de la Ciudad de Buenos Aires' },
  { value: 'BANCO_GALICIA', label: 'Banco Galicia' },
  { value: 'BANCO_SANTANDER', label: 'Banco Santander' },
  { value: 'BANCO_BBVA', label: 'BBVA Argentina' },
  { value: 'BANCO_MACRO', label: 'Banco Macro' },
  { value: 'BANCO_HSBC', label: 'HSBC Argentina' },
  { value: 'BANCO_ICBC', label: 'ICBC Argentina' },
  { value: 'BANCO_SUPERVIELLE', label: 'Banco Supervielle' },
  { value: 'BANCO_PATAGONIA', label: 'Banco Patagonia' },
  { value: 'BANCO_HIPOTECARIO', label: 'Banco Hipotecario' },
  { value: 'BANCO_CREDICOOP', label: 'Banco Credicoop' },
  { value: 'BANCO_COMAFI', label: 'Banco Comafi' },
  { value: 'BANCO_ITAU', label: 'Banco Itaú Argentina' },
  { value: 'BANCO_COLUMBIA', label: 'Banco Columbia' },
  { value: 'BANCO_SAN_JUAN', label: 'Banco San Juan' },
  { value: 'BANCO_ENTRE_RIOS', label: 'Nuevo Banco de Entre Ríos' },
  { value: 'BANCO_SANTA_FE', label: 'Nuevo Banco de Santa Fe' },
  { value: 'BANCO_CHUBUT', label: 'Banco del Chubut' },
  { value: 'BANCO_TIERRA_DEL_FUEGO', label: 'Banco de Tierra del Fuego' },
  { value: 'BANCO_CORRIENTES', label: 'Nuevo Banco de Corrientes' },
  { value: 'BANCO_MUNICIPAL_ROSARIO', label: 'Banco Municipal de Rosario' },
  { value: 'BANCO_ROELA', label: 'Banco Roela' },
  { value: 'BANCO_MARIVA', label: 'Banco Mariva' },
  { value: 'BANCO_BICA', label: 'Banco Bica' },
  { value: 'BANCO_COINAG', label: 'Banco Coinag' },
  { value: 'BANCO_PIANO', label: 'Banco Piano' },
  { value: 'BRUBANK', label: 'Brubank' },
  { value: 'UALALA', label: 'Uala' },
  { value: 'MERCADOPAGO', label: 'Mercado Pago' },
  { value: 'NARANJA_X', label: 'Naranja X' },
  { value: 'CUENTA_DNI', label: 'Cuenta DNI' },
  { value: 'OTRO', label: 'Otro' },
];

const TIPOS_CUENTA = [
  { value: 'CUENTA_CORRIENTE', label: 'Cuenta Corriente' },
  { value: 'CAJA_AHORRO', label: 'Caja de Ahorro' },
  { value: 'CUENTA_UNICA', label: 'Cuenta Única' },
  { value: 'CVU', label: 'CVU (Virtual)' },
];

function BankAccountModal({
  cuenta,
  onSave,
  onCancel,
  isLoading,
}: {
  cuenta: SupplierBankAccount | null;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    banco: cuenta?.banco || '',
    tipoCuenta: cuenta?.tipoCuenta || 'CUENTA_CORRIENTE',
    numeroCuenta: cuenta?.numeroCuenta || '',
    cbu: cuenta?.cbu || '',
    alias: cuenta?.alias || '',
    titularCuenta: cuenta?.titularCuenta || '',
    moneda: cuenta?.moneda || 'ARS',
    esPrincipal: cuenta?.esPrincipal || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.banco) {
      alert('Seleccione un banco');
      return;
    }
    if (!formData.cbu || formData.cbu.replace(/\s/g, '').length !== 22) {
      alert('El CBU debe tener 22 dígitos');
      return;
    }
    if (!formData.titularCuenta) {
      alert('Ingrese el titular de la cuenta');
      return;
    }

    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {cuenta ? 'Editar Cuenta Bancaria' : 'Agregar Cuenta Bancaria'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Banco */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Banco *
              </label>
              <select
                value={formData.banco}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Seleccionar banco...</option>
                {BANCOS_ARGENTINA.map((banco) => (
                  <option key={banco.value} value={banco.value}>
                    {banco.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de cuenta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Cuenta *
              </label>
              <select
                value={formData.tipoCuenta}
                onChange={(e) => setFormData({ ...formData, tipoCuenta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {TIPOS_CUENTA.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Número de cuenta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Número de Cuenta
              </label>
              <input
                type="text"
                value={formData.numeroCuenta}
                onChange={(e) => setFormData({ ...formData, numeroCuenta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Opcional"
              />
            </div>

            {/* CBU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CBU/CVU *
              </label>
              <input
                type="text"
                value={formData.cbu}
                onChange={(e) => setFormData({ ...formData, cbu: e.target.value.replace(/\D/g, '').slice(0, 22) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                placeholder="22 dígitos"
                maxLength={22}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.cbu.length}/22 dígitos</p>
            </div>

            {/* Alias */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alias
              </label>
              <input
                type="text"
                value={formData.alias}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Ej: MI.ALIAS.CUENTA"
              />
            </div>

            {/* Titular */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titular de la Cuenta *
              </label>
              <input
                type="text"
                value={formData.titularCuenta}
                onChange={(e) => setFormData({ ...formData, titularCuenta: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nombre del titular"
                required
              />
            </div>

            {/* Moneda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Moneda
              </label>
              <select
                value={formData.moneda}
                onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="ARS">Pesos Argentinos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>

            {/* Cuenta Principal */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="esPrincipal"
                checked={formData.esPrincipal}
                onChange={(e) => setFormData({ ...formData, esPrincipal: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="esPrincipal" className="text-sm text-gray-700 dark:text-gray-300">
                Marcar como cuenta principal
              </label>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : cuenta ? 'Guardar Cambios' : 'Agregar Cuenta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
