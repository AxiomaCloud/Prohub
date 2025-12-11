'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupplier } from '@/hooks/useSupplier';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { DocumentUploadModal } from '@/components/documents/DocumentUploadModal';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import toast from 'react-hot-toast';
import {
  FileText,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Loader2,
  X,
  Search,
  Download,
  AlertCircle,
  CreditCard,
  Upload,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Send,
  FileEdit,
  MessageSquare,
} from 'lucide-react';
import { DocumentChatDrawer } from '@/components/chat/DocumentChatDrawer';

interface Document {
  id: string;
  number: string;
  type: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RECEIPT';
  status: 'PROCESSING' | 'PRESENTED' | 'IN_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED';
  submissionStatus: 'DRAFT' | 'SUBMITTED';
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  fileName: string;
  fileUrl: string;
  date: string | null;
  uploadedAt: string;
  purchaseOrderId: string | null;
  purchaseOrder?: {
    numero: string;
  } | null;
}

const documentTypeLabels: Record<Document['type'], string> = {
  INVOICE: 'FC',
  CREDIT_NOTE: 'NC',
  DEBIT_NOTE: 'ND',
  RECEIPT: 'REC'
};

const documentTypeFull: Record<Document['type'], string> = {
  INVOICE: 'Factura',
  CREDIT_NOTE: 'Nota de Crédito',
  DEBIT_NOTE: 'Nota de Débito',
  RECEIPT: 'Recibo'
};

const documentStatusLabels: Record<Document['status'], string> = {
  PROCESSING: 'Procesando',
  PRESENTED: 'Presentado',
  IN_REVIEW: 'En Revisión',
  APPROVED: 'Aprobado',
  PAID: 'Pagado',
  REJECTED: 'Rechazado'
};

function formatMonto(monto: number, moneda: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);
}

function formatFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

export default function MisFacturasPage() {
  const router = useRouter();
  const { isSupplier, supplier, supplierId, loading: supplierLoading } = useSupplier();
  const { user, tenant } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal de detalle
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Estado para chat
  const [chatDocument, setChatDocument] = useState<Document | null>(null);

  // Estado para envío de documento
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!supplierLoading && isSupplier && supplierId && tenant) {
      fetchDocuments();
    } else if (!supplierLoading && !isSupplier) {
      setLoading(false);
    }
  }, [supplierLoading, isSupplier, supplierId, tenant?.id, currentPage, statusFilter, typeFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const params = new URLSearchParams();
      if (tenant?.id) params.append('tenantId', tenant.id);
      if (supplierId) params.append('supplierId', supplierId);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      params.append('limit', itemsPerPage.toString());
      params.append('offset', ((currentPage - 1) * itemsPerPage).toString());

      const response = await fetch(`${API_URL}/api/documents?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setTotal(data.total || 0);
      } else {
        toast.error('Error al cargar documentos');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!doc.number.toLowerCase().includes(query) &&
          !doc.purchaseOrder?.numero?.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Paginación
  const totalPages = Math.ceil(total / itemsPerPage);

  // Estadísticas
  const stats = {
    total: total,
    drafts: documents.filter(d => d.submissionStatus === 'DRAFT').length,
    processing: documents.filter(d => d.status === 'PROCESSING' && d.submissionStatus === 'SUBMITTED').length,
    presented: documents.filter(d => (d.status === 'PRESENTED' || d.status === 'IN_REVIEW') && d.submissionStatus === 'SUBMITTED').length,
    approved: documents.filter(d => d.status === 'APPROVED').length,
    paid: documents.filter(d => d.status === 'PAID').length,
    rejected: documents.filter(d => d.status === 'REJECTED').length,
    montoPendiente: documents.filter(d => d.status === 'APPROVED').reduce((sum, d) => sum + d.totalAmount, 0),
  };

  // Función para enviar documento (cambiar de DRAFT a SUBMITTED)
  const handleSubmitDocument = async (docId: string) => {
    try {
      setSubmittingId(docId);
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/documents/${docId}/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Documento enviado correctamente');
        fetchDocuments();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Error al enviar documento');
      }
    } catch (error) {
      console.error('Error submitting document:', error);
      toast.error('Error de conexión');
    } finally {
      setSubmittingId(null);
    }
  };

  // Estado para eliminar documento
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Función para eliminar documento borrador
  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('¿Estás seguro de eliminar este borrador? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setDeletingId(docId);
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Borrador eliminado');
        fetchDocuments();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Error al eliminar documento');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error de conexión');
    } finally {
      setDeletingId(null);
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
          <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
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
        title="Mis Facturas"
        subtitle={`${total} documento${total !== 1 ? 's' : ''} cargado${total !== 1 ? 's' : ''}`}
        icon={FileText}
        action={
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Cargar documento
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
              <p className="text-sm text-text-secondary">Total</p>
            </div>
          </div>
        </div>
        {stats.drafts > 0 && (
          <div className="bg-white rounded-lg shadow-sm border-2 border-orange-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileEdit className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.drafts}</p>
                <p className="text-sm text-orange-600 font-medium">Borradores</p>
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.presented}</p>
              <p className="text-sm text-text-secondary">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.approved}</p>
              <p className="text-sm text-text-secondary">Aprobadas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.paid}</p>
              <p className="text-sm text-text-secondary">Pagadas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatMonto(stats.montoPendiente)}</p>
              <p className="text-sm text-text-secondary">Por cobrar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por número de factura o OC..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            >
              <option value="">Todos los estados</option>
              {Object.entries(documentStatusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(documentTypeFull).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">No hay documentos</p>
            <p className="text-text-secondary text-sm mt-2">
              Los documentos que cargues aparecerán aquí
            </p>
            <Button onClick={() => setIsUploadModalOpen(true)} className="mt-4">
              <Upload className="w-4 h-4 mr-2" />
              Cargar documento
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">OC</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Subtotal</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">IVA</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {documentTypeLabels[doc.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-palette-purple">{doc.number || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {doc.date ? formatFecha(doc.date) : formatFecha(doc.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {doc.purchaseOrder?.numero || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {doc.submissionStatus === 'DRAFT' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                            <FileEdit className="w-3 h-3 mr-1" />
                            Borrador
                          </span>
                        ) : (
                          <DocumentStatusBadge status={doc.status} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatMonto(doc.amount, doc.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatMonto(doc.taxAmount, doc.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                      {formatMonto(doc.totalAmount, doc.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedDocument(doc)}
                          className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Descargar"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        {/* Chat solo para documentos enviados */}
                        {doc.submissionStatus === 'SUBMITTED' && (
                          <button
                            onClick={() => setChatDocument(doc)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Chat con cliente"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        {/* Acciones para borradores */}
                        {doc.submissionStatus === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => handleSubmitDocument(doc.id)}
                              disabled={submittingId === doc.id}
                              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Enviar al cliente"
                            >
                              {submittingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              disabled={deletingId === doc.id}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Eliminar borrador"
                            >
                              {deletingId === doc.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-text-secondary">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {documentTypeFull[selectedDocument.type]} {selectedDocument.number || ''}
                </h3>
                <p className="text-sm text-text-secondary">
                  {selectedDocument.date ? formatFecha(selectedDocument.date) : formatFecha(selectedDocument.uploadedAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Estado de envío */}
              {selectedDocument.submissionStatus === 'DRAFT' && (
                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <span className="text-sm text-orange-700 font-medium flex items-center gap-2">
                    <FileEdit className="w-4 h-4" />
                    Este documento es un borrador
                  </span>
                  <button
                    onClick={() => {
                      handleSubmitDocument(selectedDocument.id);
                      setSelectedDocument(null);
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Enviar
                  </button>
                </div>
              )}

              {/* Estado */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Estado:</span>
                {selectedDocument.submissionStatus === 'DRAFT' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                    Borrador
                  </span>
                ) : (
                  <DocumentStatusBadge status={selectedDocument.status} />
                )}
              </div>

              {/* Tipo */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Tipo:</span>
                <span className="text-sm font-medium">{documentTypeFull[selectedDocument.type]}</span>
              </div>

              {/* Archivo */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Archivo:</span>
                <span className="text-sm font-medium">{selectedDocument.fileName}</span>
              </div>

              {/* OC asociada */}
              {selectedDocument.purchaseOrder && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Orden de Compra:</span>
                  <span className="text-sm font-medium">{selectedDocument.purchaseOrder.numero}</span>
                </div>
              )}

              {/* Montos */}
              <div className="border-t border-b border-border py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Subtotal:</span>
                  <span className="text-sm">{formatMonto(selectedDocument.amount, selectedDocument.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">IVA:</span>
                  <span className="text-sm">{formatMonto(selectedDocument.taxAmount, selectedDocument.currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total:</span>
                  <span className="text-lg font-bold text-palette-purple">{formatMonto(selectedDocument.totalAmount, selectedDocument.currency)}</span>
                </div>
              </div>

              {/* Fecha de carga */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Fecha de carga:</span>
                <span className="text-sm">{formatFecha(selectedDocument.uploadedAt)}</span>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-between">
              {/* Botón eliminar solo para borradores */}
              <div>
                {selectedDocument.submissionStatus === 'DRAFT' && (
                  <button
                    onClick={() => {
                      handleDeleteDocument(selectedDocument.id);
                      setSelectedDocument(null);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar borrador
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                {/* Botón de chat solo para documentos enviados */}
                {selectedDocument.submissionStatus === 'SUBMITTED' && (
                  <button
                    onClick={() => {
                      setChatDocument(selectedDocument);
                      setSelectedDocument(null);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 border border-purple-300 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </button>
                )}
                {selectedDocument.fileUrl && (
                  <a
                    href={selectedDocument.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </a>
                )}
                <Button onClick={() => setSelectedDocument(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de carga de documentos */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchDocuments();
        }}
        supplierCuit={supplier?.cuit}
        clientTenantId={supplier?.tenantId}
      />

      {/* Chat Drawer */}
      {chatDocument && (
        <DocumentChatDrawer
          documentType="document"
          documentId={chatDocument.id}
          documentNumber={`${documentTypeFull[chatDocument.type]} ${chatDocument.number}`}
          isOpen={!!chatDocument}
          onClose={() => setChatDocument(null)}
        />
      )}
    </div>
  );
}
