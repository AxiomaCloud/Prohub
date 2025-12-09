'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { DocumentUploadModal } from '@/components/documents/DocumentUploadModal';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmDialog } from '@/hooks/useConfirm';
import { useSupplier } from '@/hooks/useSupplier';
import {
  Upload,
  FileText,
  Search,
  Eye,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Bot,
  Loader2
} from 'lucide-react';

interface Document {
  id: string;
  number: string;
  type: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RECEIPT';
  status: 'PROCESSING' | 'PRESENTED' | 'IN_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED';
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  fileName: string;
  fileUrl: string;
  date: string | null;
  uploadedAt: string;
  purchaseOrderId: string | null;
  parseData?: {
    metadata?: {
      metodoExtraccion?: string;
      confianza?: number;
    };
  };
  parseStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  providerTenant: {
    id: string;
    name: string;
    taxId: string;
  };
  clientTenant: {
    id: string;
    name: string;
    taxId: string;
  };
  uploader: {
    id: string;
    name: string;
    email: string;
  };
  purchaseOrder?: {
    numero: string;
  } | null;
  _count: {
    comments: number;
    attachments: number;
  };
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

export default function DocumentsPage() {
  const router = useRouter();
  const { get, delete: deleteApi, post } = useApiClient();
  const { user, tenant, isLoading: authLoading } = useAuth();
  const { confirm } = useConfirmDialog();
  const { isSupplier, supplierId, loading: supplierLoading } = useSupplier();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [extractingAI, setExtractingAI] = useState<Set<string>>(new Set()); // IDs de docs siendo procesados con IA

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // Solo cargar documentos si el usuario está autenticado y tiene tenant seleccionado
    if (!authLoading && !supplierLoading && user && tenant) {
      console.log('📄 [DocumentsPage] Cargando documentos para tenant:', tenant.id, tenant.name, isSupplier ? '(proveedor)' : '');
      fetchDocuments();
    }
  }, [statusFilter, typeFilter, authLoading, supplierLoading, user, tenant?.id, currentPage, isSupplier, supplierId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      // Filtrar por el tenant seleccionado
      if (tenant?.id) params.append('tenantId', tenant.id);
      // Si es proveedor, agregar filtro por supplierId
      if (isSupplier && supplierId) params.append('supplierId', supplierId);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      params.append('limit', itemsPerPage.toString());
      params.append('offset', ((currentPage - 1) * itemsPerPage).toString());

      const response = await get<{ documents: Document[]; total: number }>(
        `/api/documents?${params.toString()}`
      );

      setDocuments(response.documents);
      setTotal(response.total);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.providerTenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.clientTenant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const handleSelectDoc = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;

    const confirmed = await confirm(
      `¿Estás seguro de eliminar ${selectedDocs.size} documento${selectedDocs.size > 1 ? 's' : ''}?\n\nEsta acción no se puede deshacer.`,
      'Confirmar eliminación',
      'danger'
    );

    if (confirmed) {
      try {
        const deletePromises = Array.from(selectedDocs).map(id =>
          deleteApi(`/api/documents/${id}`)
        );
        await Promise.all(deletePromises);
        setSelectedDocs(new Set());
        await fetchDocuments();
      } catch (error) {
        console.error('Error deleting documents:', error);
        await confirm(
          'Hubo un error al eliminar algunos documentos. Por favor, intenta nuevamente.',
          'Error',
          'danger'
        );
      }
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  // Paginación
  const totalPages = Math.ceil(total / itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleDelete = async (doc: Document) => {
    const confirmed = await confirm(
      `¿Estás seguro de eliminar el documento "${doc.fileName}"?\n\nEsta acción no se puede deshacer.`,
      'Confirmar eliminación',
      'danger'
    );

    if (confirmed) {
      try {
        await deleteApi(`/api/documents/${doc.id}`);
        // Recargar la lista de documentos
        await fetchDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
        await confirm(
          'Hubo un error al eliminar el documento. Por favor, intenta nuevamente.',
          'Error',
          'danger'
        );
      }
    }
  };

  // Función para extraer datos con IA bajo demanda
  const handleExtractAI = async (doc: Document) => {
    // Marcar como en proceso
    setExtractingAI(prev => new Set(prev).add(doc.id));

    try {
      await post(`/api/documents/${doc.id}/parse-ai`, {});
      // Recargar documentos para ver los datos actualizados
      await fetchDocuments();
    } catch (error) {
      console.error('Error extracting with AI:', error);
      await confirm(
        'Hubo un error al extraer los datos con IA. Por favor, intenta nuevamente.',
        'Error',
        'danger'
      );
    } finally {
      // Quitar de la lista de procesando
      setExtractingAI(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  // Verificar si un documento fue procesado con extracción básica (sin IA)
  const isBasicExtraction = (doc: Document) => {
    return doc.parseData?.metadata?.metodoExtraccion === 'BASIC_REGEX';
  };

  // Loading mientras se verifica si es proveedor
  if (supplierLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={isSupplier ? "Mis Facturas" : "Documentos"}
        subtitle={isSupplier
          ? "Gestiona las facturas y comprobantes que enviaste"
          : "Gestiona facturas, notas de crédito y otros documentos"
        }
        action={
          <div className="flex items-center gap-3">
            {selectedDocs.size > 0 && (
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar ({selectedDocs.size})
              </Button>
            )}
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Cargar documento
            </Button>
          </div>
        }
      />

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-9 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los estados</option>
              {Object.entries(documentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(documentTypeFull).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Pagination Info */}
          {!loading && total > 0 && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span>{currentPage}/{totalPages}</span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-text-secondary">Cargando documentos...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">No se encontraron documentos</p>
            <p className="text-text-secondary text-sm mt-2">
              {searchTerm || statusFilter || typeFilter
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza subiendo tu primer documento'}
            </p>
            {!searchTerm && !statusFilter && !typeFilter && (
              <Button
                onClick={() => router.push('/documentos/subir')}
                className="mt-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Emisor
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Monto Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    OC
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedDocs.has(doc.id)}
                        onChange={() => handleSelectDoc(doc.id)}
                        className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DocumentStatusBadge status={doc.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium text-text-primary">
                        {documentTypeLabels[doc.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-text-primary">
                        {doc.number}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-text-secondary">
                        {formatDate(doc.date || doc.uploadedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const parseData = doc.parseData as any;
                        const emisor = parseData?.documento?.cabecera;
                        // Prioridad: 1) datos extraídos del PDF, 2) datos del supplier en parseData, 3) providerTenant
                        const razonSocial = emisor?.razonSocialEmisor || parseData?.supplierName || doc.providerTenant?.name || '-';
                        const cuit = emisor?.cuitEmisor || parseData?.supplierCuit || doc.providerTenant?.taxId || '';
                        return (
                          <div className="max-w-[200px]" title={`${razonSocial} - ${cuit}`}>
                            <div className="text-sm text-text-primary truncate">
                              {razonSocial}
                            </div>
                            {cuit && (
                              <div className="text-xs text-text-secondary">
                                {cuit}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-text-primary">
                        {formatCurrency(doc.totalAmount, doc.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {doc.purchaseOrder ? (
                        <span className="text-sm text-palette-purple font-medium">
                          {(doc.purchaseOrder as any).number || (doc.purchaseOrder as any).numero}
                        </span>
                      ) : (
                        <span className="text-sm text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Botón Extraer con IA - solo visible si es extracción básica y no es proveedor */}
                        {!isSupplier && isBasicExtraction(doc) && (
                          <button
                            onClick={() => handleExtractAI(doc)}
                            disabled={extractingAI.has(doc.id)}
                            className="text-purple-600 hover:text-purple-800 p-1.5 hover:bg-purple-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Extraer datos completos con IA"
                          >
                            {extractingAI.has(doc.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Bot className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/documentos/${doc.id}`)}
                          className="text-text-secondary hover:text-palette-purple p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Ver documento"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => window.open(`http://localhost:4000${doc.fileUrl}`, '_blank')}
                          className="text-text-secondary hover:text-palette-purple p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Descargar"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="text-text-secondary hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
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
        )}
      </div>

      {/* Summary */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, total)} de {total} documento{total !== 1 ? 's' : ''}
          </span>
          <span>Última actualización: {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          fetchDocuments();
        }}
      />
    </div>
  );
}
