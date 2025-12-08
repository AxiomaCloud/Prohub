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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BankDataForm } from '@/components/suppliers/BankDataForm';
import { CompanyDataForm } from '@/components/suppliers/CompanyDataForm';

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
                  onClick={() => setEditMode('bank')}
                  className="text-secondary hover:text-secondary-hover flex items-center gap-1 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              </div>

                {supplier.cbu ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoItem label="Banco" value={supplier.banco} />
                    <InfoItem label="Tipo de Cuenta" value={supplier.tipoCuenta?.replace('_', ' ')} />
                    <InfoItem label="Número de Cuenta" value={supplier.numeroCuenta} />
                    <InfoItem label="Moneda" value={supplier.monedaCuenta === 'ARS' ? 'Pesos Argentinos' : 'Dólares'} />
                    <InfoItem label="CBU/CVU" value={supplier.cbu} mono />
                    <InfoItem label="Alias" value={supplier.alias} />
                    <InfoItem label="Titular de la Cuenta" value={supplier.titularCuenta} />
                    <InfoItem label="CUIT del Titular" value={supplier.cuitTitular && formatCuit(supplier.cuitTitular)} />
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
