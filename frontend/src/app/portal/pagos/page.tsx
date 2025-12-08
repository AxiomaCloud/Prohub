'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSupplier } from '@/hooks/useSupplier';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Loader2,
  X,
  Search,
  Download,
  Calendar,
  TrendingUp,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Pago {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SCHEDULED' | 'PROCESSING' | 'PAID' | 'CANCELLED';
  issueDate: string;
  scheduledDate?: string;
  paidAt?: string;
  issuedByTenant: {
    id: string;
    name: string;
    legalName?: string;
    taxId?: string;
  };
  invoiceCount: number;
  retentionCount: number;
  items?: {
    id: string;
    amount: number;
    document?: {
      id: string;
      number: string;
      type: string;
      totalAmount: number;
      date: string;
    };
  }[];
  receiptUrl?: string;
  retentionUrls?: any[];
}

interface PaymentStats {
  totalReceived12m: number;
  totalReceivedThisMonth: number;
  monthlyVariation: number;
  pendingAmount: number;
  pendingCount: number;
  scheduledAmount: number;
  scheduledCount: number;
}

const estadosPago: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  SCHEDULED: { label: 'Programado', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  PROCESSING: { label: 'Procesando', color: 'bg-purple-100 text-purple-700', icon: Clock },
  PAID: { label: 'Pagado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle },
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

export default function MisPagosPage() {
  const router = useRouter();
  const { isSupplier, supplierId, loading: supplierLoading } = useSupplier();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal de detalle
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchPagos = useCallback(async () => {
    if (!supplierId) return;

    try {
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        supplierId,
      });

      if (searchQuery) params.append('search', searchQuery);
      if (filtroEstado) params.append('status', filtroEstado);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`${API_URL}/api/payments?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPagos(data.payments || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } else {
        toast.error('Error al cargar pagos');
      }
    } catch (error) {
      console.error('Error fetching pagos:', error);
      toast.error('Error de conexión');
    }
  }, [supplierId, page, searchQuery, filtroEstado, dateFrom, dateTo, API_URL]);

  const fetchStats = useCallback(async () => {
    if (!supplierId) return;

    try {
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/payments/stats/supplier/${supplierId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [supplierId, API_URL]);

  useEffect(() => {
    if (!supplierLoading && isSupplier && supplierId) {
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchPagos(), fetchStats()]);
        setLoading(false);
      };
      loadData();
    } else if (!supplierLoading && !isSupplier) {
      setLoading(false);
    }
  }, [supplierLoading, isSupplier, supplierId, fetchPagos, fetchStats]);

  // Refetch cuando cambian filtros
  useEffect(() => {
    if (isSupplier && supplierId && !loading) {
      fetchPagos();
    }
  }, [page, searchQuery, filtroEstado, dateFrom, dateTo]);

  const handleViewDetail = async (pago: Pago) => {
    setSelectedPago(pago);
    setLoadingDetail(true);

    try {
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payments/${pago.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedPago(data.payment);
      }
    } catch (error) {
      console.error('Error fetching payment detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadAll = async (paymentId: string) => {
    try {
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payments/${paymentId}/download-all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pago-${paymentId}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Error al descargar comprobantes');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Error al descargar');
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
          <CreditCard className="w-12 h-12 text-text-secondary mx-auto mb-4" />
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
        title="Mis Pagos"
        subtitle="Consulta los pagos recibidos por tus facturas"
        icon={CreditCard}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">
                {formatMonto(stats?.totalReceived12m || 0)}
              </p>
              <p className="text-sm text-text-secondary">Total (12 meses)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">
                {formatMonto(stats?.totalReceivedThisMonth || 0)}
              </p>
              <p className="text-sm text-text-secondary">Este mes</p>
              {stats?.monthlyVariation !== undefined && stats.monthlyVariation !== 0 && (
                <p className={`text-xs ${stats.monthlyVariation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.monthlyVariation >= 0 ? '+' : ''}{stats.monthlyVariation}% vs mes anterior
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600">
                {formatMonto(stats?.pendingAmount || 0)}
              </p>
              <p className="text-sm text-text-secondary">Pendiente de cobro</p>
              <p className="text-xs text-text-secondary">
                {stats?.pendingCount || 0} facturas aprobadas
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-purple-600">
                {formatMonto(stats?.scheduledAmount || 0)}
              </p>
              <p className="text-sm text-text-secondary">Pagos programados</p>
              <p className="text-xs text-text-secondary">
                {stats?.scheduledCount || 0} próximos pagos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por número de pago..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
              />
            </div>
          </div>

          {/* Filtro de estado */}
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            >
              <option value="">Todos los estados</option>
              {Object.entries(estadosPago).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Fecha desde */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary whitespace-nowrap">Desde:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            />
          </div>

          {/* Fecha hasta */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary whitespace-nowrap">Hasta:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            />
          </div>
        </div>
      </div>

      {/* Lista de pagos */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {pagos.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">No hay pagos registrados</p>
            <p className="text-text-secondary text-sm mt-2">
              Los pagos emitidos aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">N° Pago</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Emisor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Facturas</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Retenciones</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagos.map((pago) => {
                  const estadoConfig = estadosPago[pago.status] || estadosPago.PENDING;
                  const Icon = estadoConfig.icon;
                  return (
                    <tr key={pago.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-palette-purple">{pago.number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary">{pago.issuedByTenant.name}</p>
                          {pago.issuedByTenant.legalName && (
                            <p className="text-xs text-text-secondary">{pago.issuedByTenant.legalName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatFecha(pago.issueDate)}
                        {pago.paidAt && (
                          <p className="text-xs text-green-600">
                            Pagado: {formatFecha(pago.paidAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        {formatMonto(pago.amount, pago.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {pago.invoiceCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {pago.retentionCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.color}`}>
                          <Icon className="w-3 h-3" />
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleViewDetail(pago)}
                            className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadAll(pago.id)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Descargar comprobantes"
                          >
                            <Download className="w-4 h-4" />
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Mostrando {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} de {total} pagos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {selectedPago && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Pago {selectedPago.number}</h3>
                <p className="text-sm text-text-secondary">{formatFecha(selectedPago.issueDate)}</p>
              </div>
              <button
                onClick={() => setSelectedPago(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-palette-purple" />
                </div>
              ) : (
                <>
                  {/* Estado y Emisor */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-text-secondary mb-1">Estado</p>
                      {(() => {
                        const config = estadosPago[selectedPago.status];
                        const Icon = config.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                            <Icon className="w-4 h-4" />
                            {config.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div>
                      <p className="text-sm text-text-secondary mb-1">Emisor</p>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{selectedPago.issuedByTenant.name}</p>
                          {selectedPago.issuedByTenant.taxId && (
                            <p className="text-xs text-text-secondary">CUIT: {selectedPago.issuedByTenant.taxId}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700 mb-1">Monto Total</p>
                    <p className="text-3xl font-bold text-green-700">
                      {formatMonto(selectedPago.amount, selectedPago.currency)}
                    </p>
                  </div>

                  {/* Fechas */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-text-secondary">Fecha emisión</p>
                      <p className="font-medium">{formatFecha(selectedPago.issueDate)}</p>
                    </div>
                    {selectedPago.scheduledDate && (
                      <div>
                        <p className="text-sm text-text-secondary">Fecha programada</p>
                        <p className="font-medium text-blue-600">{formatFecha(selectedPago.scheduledDate)}</p>
                      </div>
                    )}
                    {selectedPago.paidAt && (
                      <div>
                        <p className="text-sm text-text-secondary">Fecha de pago</p>
                        <p className="font-medium text-green-600">{formatFecha(selectedPago.paidAt)}</p>
                      </div>
                    )}
                  </div>

                  {/* Facturas incluidas */}
                  {selectedPago.items && selectedPago.items.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-text-primary mb-3">
                        Facturas incluidas ({selectedPago.items.length})
                      </p>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Número</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Tipo</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Fecha</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-text-secondary">Monto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedPago.items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-3 py-2 font-medium text-palette-purple">
                                  {item.document?.number || '-'}
                                </td>
                                <td className="px-3 py-2 text-text-secondary">
                                  {item.document?.type || '-'}
                                </td>
                                <td className="px-3 py-2 text-text-secondary">
                                  {item.document?.date ? formatFecha(item.document.date) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {formatMonto(item.amount || item.document?.totalAmount || 0, selectedPago.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Retenciones */}
                  {selectedPago.retentionUrls && selectedPago.retentionUrls.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-text-primary mb-3">
                        Retenciones ({selectedPago.retentionUrls.length})
                      </p>
                      <div className="space-y-2">
                        {selectedPago.retentionUrls.map((ret, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium">{ret.type || 'Retención'}</p>
                                {ret.number && (
                                  <p className="text-xs text-text-secondary">N° {ret.number}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {ret.amount ? formatMonto(ret.amount, selectedPago.currency) : '-'}
                              </span>
                              {ret.fileUrl && (
                                <a
                                  href={ret.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => handleDownloadAll(selectedPago.id)}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar todo
              </Button>
              <Button onClick={() => setSelectedPago(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
