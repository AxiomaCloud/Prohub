'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmDialog } from '@/hooks/useConfirm';
import {
  Upload,
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2
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
  uploadedAt: string;
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
  _count: {
    comments: number;
    attachments: number;
  };
}

const documentTypeLabels: Record<Document['type'], string> = {
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

const statusColors: Record<Document['status'], string> = {
  PROCESSING: 'bg-blue-100 text-blue-800',
  PRESENTED: 'bg-purple-100 text-purple-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800'
};

const statusIcons: Record<Document['status'], React.ComponentType<{ className?: string }>> = {
  PROCESSING: Clock,
  PRESENTED: FileText,
  IN_REVIEW: AlertCircle,
  APPROVED: CheckCircle,
  PAID: CheckCircle,
  REJECTED: XCircle
};

export default function DocumentsPage() {
  const router = useRouter();
  const { get, delete: deleteApi } = useApiClient();
  const { user, tenant, isLoading: authLoading } = useAuth();
  const { confirm } = useConfirmDialog();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Solo cargar documentos si el usuario está autenticado y tiene tenant seleccionado
    if (!authLoading && user && tenant) {
      console.log('📄 [DocumentsPage] Cargando documentos para tenant:', tenant.id, tenant.name);
      fetchDocuments();
    }
  }, [statusFilter, typeFilter, authLoading, user, tenant?.id]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      // Filtrar por el tenant seleccionado
      if (tenant?.id) params.append('tenantId', tenant.id);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const response = await get<{ documents: Document[]; total: number }>(
        `/api/documents?${params.toString()}`
      );

      setDocuments(response.documents);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return { dateStr, timeStr };
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

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Documentos"
        subtitle="Gestiona facturas, notas de crédito y otros documentos"
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
            <Button onClick={() => router.push('/documentos/subir')}>
              <Upload className="w-4 h-4 mr-2" />
              Subir Documento
            </Button>
          </div>
        }
      />

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por número, proveedor o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los estados</option>
              {Object.entries(documentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
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
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {filteredDocuments.map((doc) => {
                  const StatusIcon = statusIcons[doc.status];
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedDocs.has(doc.id)}
                          onChange={() => handleSelectDoc(doc.id)}
                          className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-palette-purple mr-3" />
                          <div className="text-sm font-medium text-text-primary">
                            {doc.fileName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-text-primary">
                          {documentTypeLabels[doc.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-primary">{doc.providerTenant.name}</div>
                        <div className="text-xs text-text-secondary">{doc.providerTenant.taxId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-primary">{doc.clientTenant.name}</div>
                        <div className="text-xs text-text-secondary">{doc.clientTenant.taxId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text-primary">
                          {formatCurrency(doc.totalAmount, doc.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status]}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {documentStatusLabels[doc.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-primary">
                          {formatDate(doc.uploadedAt).dateStr}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {formatDate(doc.uploadedAt).timeStr}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/documentos/${doc.id}`)}
                            className="text-palette-purple hover:text-palette-purple/80 p-2 hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title="Ver documento"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>Mostrando {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
