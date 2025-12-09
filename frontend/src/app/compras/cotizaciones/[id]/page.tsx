'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  FileSearch,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  FileText,
  Calendar,
  Building2,
  DollarSign,
  Package,
  Eye,
  BarChart3,
  AlertCircle,
  Play,
  Pause,
  Award,
  X,
  ShoppingCart,
  Loader2,
} from 'lucide-react';

// Modal de confirmación personalizado
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger' | 'success';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    default: 'bg-palette-purple hover:bg-palette-purple/90',
    danger: 'bg-red-600 hover:bg-red-700',
    success: 'bg-green-600 hover:bg-green-700',
  };

  const iconStyles = {
    default: 'bg-blue-100 text-blue-600',
    danger: 'bg-red-100 text-red-600',
    success: 'bg-green-100 text-green-600',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${iconStyles[variant]}`}>
              {variant === 'danger' ? (
                <AlertCircle className="w-6 h-6" />
              ) : variant === 'success' ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <AlertCircle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              <p className="text-text-secondary mt-1">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={variantStyles[variant]}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal de alerta/notificación
interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  variant?: 'success' | 'error' | 'info';
  onClose: () => void;
}

function AlertModal({ isOpen, title, message, variant = 'info', onClose }: AlertModalProps) {
  if (!isOpen) return null;

  const styles = {
    success: { bg: 'bg-green-100', text: 'text-green-600', icon: CheckCircle },
    error: { bg: 'bg-red-100', text: 'text-red-600', icon: XCircle },
    info: { bg: 'bg-blue-100', text: 'text-blue-600', icon: AlertCircle },
  };

  const Icon = styles[variant].icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${styles[variant].bg}`}>
              <Icon className={`w-6 h-6 ${styles[variant].text}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              <p className="text-text-secondary mt-1">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end px-6 py-4 bg-gray-50 rounded-b-xl">
          <Button onClick={onClose}>
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
}

interface RFQDetail {
  id: string;
  number: string;
  title: string;
  description?: string;
  status: string;
  deadline: string;
  deliveryDeadline?: string;
  paymentTerms?: string;
  currency: string;
  budget?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
  awardedAt?: string;
  purchaseRequest?: {
    id: string;
    numero: string;
    titulo: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  awardedTo?: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: string;
    specifications?: string;
  }>;
  invitedSuppliers: Array<{
    id: string;
    supplierId: string;
    supplier: {
      id: string;
      name?: string;
      nombre?: string;
      email: string;
      cuit?: string;
    };
    status: string;
    invitedAt?: string;
    viewedAt?: string;
    respondedAt?: string;
  }>;
  quotations: Array<{
    id: string;
    number: string;
    status: string;
    totalAmount: number;
    deliveryDays?: number;
    paymentTerms?: string;
    submittedAt?: string;
    supplier: {
      id: string;
      name?: string;
      nombre?: string;
      email: string;
    };
  }>;
}

const estadosRFQ: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: Clock },
  PUBLISHED: { label: 'Publicada', color: 'bg-blue-100 text-blue-700', icon: Send },
  IN_QUOTATION: { label: 'En Cotizacion', color: 'bg-purple-100 text-purple-700', icon: FileText },
  EVALUATION: { label: 'En Evaluacion', color: 'bg-orange-100 text-orange-700', icon: Users },
  AWARDED: { label: 'Adjudicada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  PO_GENERATED: { label: 'OC Generada', color: 'bg-emerald-100 text-emerald-700', icon: ShoppingCart },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
  CLOSED: { label: 'Cerrada', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  EXPIRED: { label: 'Expirada', color: 'bg-gray-100 text-gray-500', icon: Clock },
};

const estadosInvitacion: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-gray-100 text-gray-700' },
  INVITED: { label: 'Invitado', color: 'bg-blue-100 text-blue-700' },
  VIEWED: { label: 'Visto', color: 'bg-yellow-100 text-yellow-700' },
  QUOTED: { label: 'Cotizado', color: 'bg-green-100 text-green-700' },
  DECLINED: { label: 'Declinado', color: 'bg-red-100 text-red-700' },
  AWARDED: { label: 'Adjudicado', color: 'bg-purple-100 text-purple-700' },
  NOT_AWARDED: { label: 'No Adjudicado', color: 'bg-gray-100 text-gray-600' },
};

function formatMonto(monto: number, moneda: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

function formatFecha(fecha: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

function formatFechaHora(fecha: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fecha));
}

export default function RFQDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [rfq, setRfq] = useState<RFQDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'suppliers' | 'quotations'>('items');

  // Estados para modales
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'default' | 'danger' | 'success';
    action: () => void;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'error' | 'info';
    onClose?: () => void;
  }>({ isOpen: false, title: '', message: '', variant: 'info' });

  const showAlert = (title: string, message: string, variant: 'success' | 'error' | 'info' = 'info', onClose?: () => void) => {
    setAlertModal({ isOpen: true, title, message, variant, onClose });
  };

  const showConfirm = (
    title: string,
    message: string,
    action: () => void,
    options?: { confirmText?: string; variant?: 'default' | 'danger' | 'success' }
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: options?.confirmText,
      variant: options?.variant,
      action
    });
  };

  const fetchRFQ = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setRfq(data.rfq);
      } else {
        showAlert('Error', 'Error al cargar la solicitud de cotización', 'error', () => router.back());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchRFQ();
  }, [fetchRFQ]);

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${id}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchRFQ();
        showAlert('Éxito', 'Acción ejecutada correctamente', 'success');
      } else {
        const error = await response.json();
        showAlert('Error', error.error || 'Error al ejecutar la acción', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'Error al ejecutar la acción', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeGeneratePO = async () => {
    setActionLoading(true);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${id}/generate-po`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        showAlert(
          'Orden de Compra Generada',
          `${data.message || 'La Orden de Compra se generó exitosamente'}\n\nOC: ${data.purchaseOrder.numero}`,
          'success',
          () => router.push('/compras/cotizaciones')
        );
      } else {
        const error = await response.json();
        showAlert('Error', error.error || 'Error al generar la Orden de Compra', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showAlert('Error', 'Error al generar la Orden de Compra', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePO = () => {
    showConfirm(
      'Generar Orden de Compra',
      '¿Deseas generar una Orden de Compra a partir de esta cotización adjudicada?',
      executeGeneratePO,
      { confirmText: 'Generar OC', variant: 'success' }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="p-6 text-center">
        <p>RFQ no encontrada</p>
      </div>
    );
  }

  const estadoConfig = estadosRFQ[rfq.status] || estadosRFQ.DRAFT;
  const StatusIcon = estadoConfig.icon;
  const deadline = new Date(rfq.deadline);
  const diasRestantes = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const vencida = diasRestantes < 0;
  const porVencer = diasRestantes >= 0 && diasRestantes <= 3;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={rfq.number}
        subtitle={rfq.title}
        icon={FileSearch}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>

            {rfq.status === 'DRAFT' && (
              <Button onClick={() => handleAction('publish')} disabled={actionLoading}>
                <Send className="w-4 h-4 mr-2" />
                Publicar
              </Button>
            )}

            {['PUBLISHED', 'IN_QUOTATION'].includes(rfq.status) && (
              <Button onClick={() => handleAction('close')} disabled={actionLoading}>
                <Pause className="w-4 h-4 mr-2" />
                Cerrar Recepcion
              </Button>
            )}

            {rfq.status === 'EVALUATION' && rfq.quotations.length > 0 && (
              <Button onClick={() => router.push(`/compras/cotizaciones/${id}/comparar`)}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Comparar y Adjudicar
              </Button>
            )}

            {rfq.status === 'AWARDED' && (
              <Button onClick={handleGeneratePO} disabled={actionLoading}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Generar Orden de Compra
              </Button>
            )}

            {!['AWARDED', 'PO_GENERATED', 'CANCELLED', 'CLOSED'].includes(rfq.status) && (
              <Button
                variant="outline"
                onClick={() => {
                  showConfirm(
                    'Cancelar Solicitud',
                    '¿Estás seguro de que deseas cancelar esta solicitud de cotización? Esta acción no se puede deshacer.',
                    () => {
                      setConfirmModal(prev => ({ ...prev, isOpen: false }));
                      handleAction('cancel');
                    },
                    { confirmText: 'Sí, cancelar', variant: 'danger' }
                  );
                }}
                disabled={actionLoading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>
        }
      />

      {/* Status and summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${estadoConfig.color.split(' ')[0]}`}>
              <StatusIcon className={`w-5 h-5 ${estadoConfig.color.split(' ')[1]}`} />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Estado</p>
              <p className={`font-semibold ${estadoConfig.color.split(' ')[1]}`}>
                {estadoConfig.label}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${vencida ? 'bg-red-100' : porVencer ? 'bg-orange-100' : 'bg-blue-100'}`}>
              <Calendar className={`w-5 h-5 ${vencida ? 'text-red-600' : porVencer ? 'text-orange-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Vencimiento</p>
              <p className={`font-semibold ${vencida ? 'text-red-600' : porVencer ? 'text-orange-600' : 'text-text-primary'}`}>
                {formatFecha(rfq.deadline)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Proveedores</p>
              <p className="font-semibold text-text-primary">
                {rfq.invitedSuppliers.length} invitados
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Cotizaciones</p>
              <p className="font-semibold text-text-primary">
                {rfq.quotations.filter(q => q.status !== 'DRAFT').length} recibidas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Awarded banner */}
      {rfq.status === 'AWARDED' && rfq.awardedTo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                Adjudicada a: {rfq.awardedTo.name}
              </p>
              <p className="text-sm text-green-600">
                {rfq.awardedAt && `Adjudicada el ${formatFechaHora(rfq.awardedAt)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-border">
            <div className="border-b border-border">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('items')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === 'items'
                      ? 'border-palette-purple text-palette-purple'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Items ({rfq.items.length})
                </button>
                <button
                  onClick={() => setActiveTab('suppliers')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === 'suppliers'
                      ? 'border-palette-purple text-palette-purple'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Proveedores ({rfq.invitedSuppliers.length})
                </button>
                <button
                  onClick={() => setActiveTab('quotations')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === 'quotations'
                      ? 'border-palette-purple text-palette-purple'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Cotizaciones ({rfq.quotations.filter(q => q.status !== 'DRAFT').length})
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'items' && (
                <div className="space-y-4">
                  {rfq.items.map((item, index) => (
                    <div key={item.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-medium text-text-secondary">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{item.description}</p>
                          <div className="flex gap-4 mt-2 text-sm text-text-secondary">
                            <span>Cantidad: <strong>{item.quantity}</strong></span>
                            <span>Unidad: <strong>{item.unit}</strong></span>
                          </div>
                          {item.specifications && (
                            <p className="text-sm text-text-secondary mt-2">
                              Especificaciones: {item.specifications}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'suppliers' && (
                <div className="space-y-3">
                  {rfq.invitedSuppliers.map((inv) => {
                    const invStatus = estadosInvitacion[inv.status] || estadosInvitacion.PENDING;
                    return (
                      <div key={inv.id} className="flex items-center justify-between border border-border rounded-lg p-4">
                        <div>
                          <p className="font-medium text-text-primary">{inv.supplier.nombre || inv.supplier.name}</p>
                          <p className="text-sm text-text-secondary">{inv.supplier.email}</p>
                          {inv.supplier.cuit && (
                            <p className="text-xs text-text-secondary">CUIT: {inv.supplier.cuit}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${invStatus.color}`}>
                            {invStatus.label}
                          </span>
                          {inv.viewedAt && (
                            <p className="text-xs text-text-secondary mt-1">
                              Visto: {formatFechaHora(inv.viewedAt)}
                            </p>
                          )}
                          {inv.respondedAt && (
                            <p className="text-xs text-text-secondary">
                              Respondio: {formatFechaHora(inv.respondedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {rfq.invitedSuppliers.length === 0 && (
                    <p className="text-center text-text-secondary py-8">
                      No hay proveedores invitados
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'quotations' && (
                <div className="space-y-3">
                  {rfq.quotations.filter(q => q.status !== 'DRAFT').map((quot) => (
                    <div key={quot.id} className="flex items-center justify-between border border-border rounded-lg p-4">
                      <div>
                        <p className="font-medium text-text-primary">{quot.supplier.nombre || quot.supplier.name}</p>
                        <p className="text-sm text-text-secondary">{quot.number}</p>
                        {quot.submittedAt && (
                          <p className="text-xs text-text-secondary">
                            Enviada: {formatFechaHora(quot.submittedAt)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-text-primary">
                          {formatMonto(quot.totalAmount, rfq.currency)}
                        </p>
                        {quot.deliveryDays && (
                          <p className="text-sm text-text-secondary">
                            Entrega: {quot.deliveryDays} dias
                          </p>
                        )}
                        {quot.paymentTerms && (
                          <p className="text-xs text-text-secondary">
                            {quot.paymentTerms}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {rfq.quotations.filter(q => q.status !== 'DRAFT').length === 0 && (
                    <p className="text-center text-text-secondary py-8">
                      No hay cotizaciones recibidas
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h3 className="font-semibold text-text-primary mb-4">Informacion</h3>
            <div className="space-y-3 text-sm">
              {rfq.description && (
                <div>
                  <p className="text-text-secondary">Descripcion</p>
                  <p className="text-text-primary">{rfq.description}</p>
                </div>
              )}
              {rfq.budget && (
                <div>
                  <p className="text-text-secondary">Presupuesto estimado</p>
                  <p className="text-text-primary font-medium">
                    {formatMonto(rfq.budget, rfq.currency)}
                  </p>
                </div>
              )}
              {rfq.deliveryDeadline && (
                <div>
                  <p className="text-text-secondary">Fecha entrega requerida</p>
                  <p className="text-text-primary">{formatFecha(rfq.deliveryDeadline)}</p>
                </div>
              )}
              {rfq.paymentTerms && (
                <div>
                  <p className="text-text-secondary">Condiciones de pago</p>
                  <p className="text-text-primary">{rfq.paymentTerms}</p>
                </div>
              )}
              {rfq.purchaseRequest && (
                <div>
                  <p className="text-text-secondary">Requerimiento origen</p>
                  <button
                    onClick={() => router.push(`/compras/requerimientos/${rfq.purchaseRequest!.id}`)}
                    className="text-primary hover:underline"
                  >
                    {rfq.purchaseRequest.numero}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h3 className="font-semibold text-text-primary mb-4">Historial</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-sm text-text-primary">Creada</p>
                  <p className="text-xs text-text-secondary">
                    {formatFechaHora(rfq.createdAt)}
                    {rfq.createdBy && ` por ${rfq.createdBy.name}`}
                  </p>
                </div>
              </div>
              {rfq.publishedAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="text-sm text-text-primary">Publicada</p>
                    <p className="text-xs text-text-secondary">{formatFechaHora(rfq.publishedAt)}</p>
                  </div>
                </div>
              )}
              {rfq.closedAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-orange-500"></div>
                  <div>
                    <p className="text-sm text-text-primary">Cerrada</p>
                    <p className="text-xs text-text-secondary">{formatFechaHora(rfq.closedAt)}</p>
                  </div>
                </div>
              )}
              {rfq.awardedAt && (
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-purple-500"></div>
                  <div>
                    <p className="text-sm text-text-primary">Adjudicada</p>
                    <p className="text-xs text-text-secondary">{formatFechaHora(rfq.awardedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        loading={actionLoading}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onClose={() => {
          setAlertModal(prev => ({ ...prev, isOpen: false }));
          if (alertModal.onClose) alertModal.onClose();
        }}
      />
    </div>
  );
}
