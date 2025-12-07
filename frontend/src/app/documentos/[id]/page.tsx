'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/hooks/useApiClient';
import { useConfirmDialog } from '@/hooks/useConfirm';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowLeft,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  MessageSquare,
  Send
} from 'lucide-react';
import { DocumentoParseView } from '@/components/documents/DocumentoParseView';

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
  fileType: string;
  fileSize: number;
  fileUrl: string;
  uploadedAt: string;
  date: string | null;
  dueDate: string | null;
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
  parseStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  parseDocumentId: string | null;
  parseData: any;
  parseError: string | null;
  parsedAt: string | null;
  timeline: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
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

const parseStatusLabels = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completado',
  ERROR: 'Error'
};

const parseStatusColors = {
  PENDING: 'bg-gray-100 text-gray-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  ERROR: 'bg-red-100 text-red-800'
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

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { get, post, delete: deleteApi } = useApiClient();
  const { confirm } = useConfirmDialog();
  const { user } = useAuth();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchDocument();
    }
  }, [params.id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const response = await get<Document>(`/api/documents/${params.id}`);
      setDocument(response);
    } catch (error) {
      console.error('Error fetching document:', error);
      await confirm(
        'No se pudo cargar el documento. Por favor, intenta nuevamente.',
        'Error',
        'danger'
      );
      router.push('/documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDocument();
    setRefreshing(false);
  };

  const handleAddComment = async () => {
    if (!document || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const comment = await post<any>(`/api/documents/${document.id}/comments`, {
        content: newComment.trim()
      });

      // Add the new comment to the document
      setDocument({
        ...document,
        comments: [comment, ...document.comments]
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      await confirm(
        'Hubo un error al agregar el comentario. Por favor, intenta nuevamente.',
        'Error',
        'danger'
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!document) return;

    const confirmed = await confirm(
      '¿Estás seguro de eliminar este comentario?',
      'Confirmar eliminación',
      'danger'
    );

    if (confirmed) {
      try {
        await deleteApi(`/api/documents/${document.id}/comments/${commentId}`);
        setDocument({
          ...document,
          comments: document.comments.filter(c => c.id !== commentId)
        });
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (!document) return;

    const confirmed = await confirm(
      `¿Estás seguro de eliminar el documento "${document.fileName}"?\n\nEsta acción no se puede deshacer.`,
      'Confirmar eliminación',
      'danger'
    );

    if (confirmed) {
      try {
        await deleteApi(`/api/documents/${document.id}`);
        router.push('/documentos');
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-text-secondary">Cargando documento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const StatusIcon = statusIcons[document.status];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={document.fileName}
        subtitle={`${documentTypeLabels[document.type]} - ${document.number}`}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/documentos')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Información General</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[document.status]}`}>
                  <StatusIcon className="w-4 h-4 mr-2" />
                  {documentStatusLabels[document.status]}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Tipo</label>
                <p className="text-text-primary">{documentTypeLabels[document.type]}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Número</label>
                <p className="text-text-primary font-mono">{document.number}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Fecha de Emisión</label>
                <p className="text-text-primary">{formatDate(document.date)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Fecha de Vencimiento</label>
                <p className="text-text-primary">{formatDate(document.dueDate)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Moneda</label>
                <p className="text-text-primary">{document.currency}</p>
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Montos</h2>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Subtotal</label>
                <p className="text-xl font-semibold text-text-primary">
                  {formatCurrency(document.amount, document.currency)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Impuestos</label>
                <p className="text-xl font-semibold text-text-primary">
                  {formatCurrency(document.taxAmount, document.currency)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Total</label>
                <p className="text-2xl font-bold text-palette-purple">
                  {formatCurrency(document.totalAmount, document.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Parse Status */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Estado de Procesamiento (Parse)</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Estado</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${parseStatusColors[document.parseStatus]}`}>
                  {parseStatusLabels[document.parseStatus]}
                </span>
              </div>

              {document.parseDocumentId && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Parse Document ID</label>
                  <p className="text-text-primary font-mono text-sm">{document.parseDocumentId}</p>
                </div>
              )}

              {document.parsedAt && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Procesado</label>
                  <p className="text-text-primary">{formatDateTime(document.parsedAt)}</p>
                </div>
              )}

              {document.parseError && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Error</label>
                  <p className="text-red-600 text-sm bg-red-50 p-3 rounded">{document.parseError}</p>
                </div>
              )}

              {document.parseData && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Datos Extraídos</label>
                  <DocumentoParseView parseData={document.parseData} />
                </div>
              )}
            </div>
          </div>

          {/* Organizations */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Organizaciones</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-palette-purple" />
                  <label className="text-sm font-medium text-text-secondary">Proveedor</label>
                </div>
                <p className="text-text-primary font-medium">{document.providerTenant.name}</p>
                <p className="text-text-secondary text-sm">{document.providerTenant.taxId}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-palette-blue" />
                  <label className="text-sm font-medium text-text-secondary">Cliente</label>
                </div>
                <p className="text-text-primary font-medium">{document.clientTenant.name}</p>
                <p className="text-text-secondary text-sm">{document.clientTenant.taxId}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Archivo</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Nombre</label>
                <p className="text-text-primary text-sm break-all">{document.fileName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Tipo</label>
                <p className="text-text-primary text-sm">{document.fileType}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Tamaño</label>
                <p className="text-text-primary text-sm">{formatFileSize(document.fileSize)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Subido</label>
                <p className="text-text-primary text-sm">{formatDateTime(document.uploadedAt)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Subido por</label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-text-secondary" />
                  <div>
                    <p className="text-text-primary text-sm">{document.uploader.name}</p>
                    <p className="text-text-secondary text-xs">{document.uploader.email}</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => window.open(`http://localhost:4000${document.fileUrl}`, '_blank')}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Archivo
              </Button>
            </div>
          </div>

          {/* Timeline */}
          {document.timeline && document.timeline.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Historial</h2>

              <div className="space-y-4">
                {document.timeline.map((event, index) => (
                  <div key={event.id} className="relative">
                    {index !== document.timeline.length - 1 && (
                      <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-border"></div>
                    )}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-4 h-4 rounded-full bg-palette-purple mt-1"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm font-medium text-text-primary">
                          {event.fromStatus ? `${event.fromStatus} → ` : ''}{event.toStatus}
                        </p>
                        {event.reason && (
                          <p className="text-sm text-text-secondary mt-1">{event.reason}</p>
                        )}
                        <p className="text-xs text-text-secondary mt-1">
                          {formatDateTime(event.createdAt)} • {event.user.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comentarios ({document.comments?.length || 0})
            </h2>

            {/* Add Comment Form */}
            <div className="mb-4">
              <div className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                  disabled={submittingComment}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {(!document.comments || document.comments.length === 0) ? (
                <p className="text-text-secondary text-sm text-center py-4">
                  No hay comentarios aún
                </p>
              ) : (
                document.comments.map((comment) => (
                  <div key={comment.id} className="border-b border-border pb-3 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-palette-purple/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-palette-purple" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {comment.user.name}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {formatDateTime(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                      {user?.id === comment.user.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-text-secondary hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar comentario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-text-primary mt-2 ml-10">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
