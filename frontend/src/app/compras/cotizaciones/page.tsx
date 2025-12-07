'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  FileSearch,
  Plus,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Calendar,
  Building2,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  BarChart3,
} from 'lucide-react';

interface RFQ {
  id: string;
  number: string;
  title: string;
  description?: string;
  status: string;
  deadline: string;
  deliveryDeadline?: string;
  paymentTerms?: string;
  currency: string;
  estimatedBudget?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
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
  suppliersInvited: number;
  quotationsReceived: number;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit: string;
  }>;
}

interface Stats {
  total: number;
  draft: number;
  published: number;
  inQuotation: number;
  evaluation: number;
  awarded: number;
  cancelled: number;
  active: number;
  expiringSoon: number;
}

// Estados de RFQ
const estadosRFQ = [
  { id: 'DRAFT', label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: Clock },
  { id: 'PUBLISHED', label: 'Publicada', color: 'bg-blue-100 text-blue-700', icon: Send },
  { id: 'IN_QUOTATION', label: 'En Cotizacion', color: 'bg-purple-100 text-purple-700', icon: FileText },
  { id: 'EVALUATION', label: 'En Evaluacion', color: 'bg-orange-100 text-orange-700', icon: Users },
  { id: 'AWARDED', label: 'Adjudicada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { id: 'CANCELLED', label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
  { id: 'CLOSED', label: 'Cerrada', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  { id: 'EXPIRED', label: 'Expirada', color: 'bg-gray-100 text-gray-500', icon: Clock },
];

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

export default function CotizacionesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const tenantId = typeof window !== 'undefined'
    ? localStorage.getItem('tenantId') || ''
    : '';

  const fetchRFQs = useCallback(async () => {
    if (!tenantId) return;

    try {
      const params = new URLSearchParams({
        tenantId,
        page: page.toString(),
        limit: '20',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (filtroEstado) params.append('status', filtroEstado);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRfqs(data.rfqs);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching RFQs:', error);
    }
  }, [tenantId, page, searchQuery, filtroEstado]);

  const fetchStats = useCallback(async () => {
    if (!tenantId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/stats/${tenantId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [tenantId]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRFQs(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchRFQs, fetchStats]);

  // Refetch cuando cambian los filtros
  useEffect(() => {
    if (!loading) {
      fetchRFQs();
    }
  }, [searchQuery, filtroEstado, page]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta solicitud?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchRFQs();
        fetchStats();
      } else {
        const data = await response.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar la solicitud');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Cotizaciones y Licitaciones"
        subtitle={`${total} solicitud${total !== 1 ? 'es' : ''} de cotizacion`}
        icon={FileSearch}
        action={
          <Button onClick={() => router.push('/compras/cotizaciones/nueva')}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Solicitud
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSearch className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.total || 0}</p>
              <p className="text-sm text-text-secondary">Total RFQs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Send className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.active || 0}</p>
              <p className="text-sm text-text-secondary">Activas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.expiringSoon || 0}</p>
              <p className="text-sm text-text-secondary">Por Vencer</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats?.awarded || 0}</p>
              <p className="text-sm text-text-secondary">Adjudicadas</p>
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por numero o titulo..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-secondary" />
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos los estados</option>
                {estadosRFQ.map((estado) => (
                  <option key={estado.id} value={estado.id}>{estado.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {rfqs.length === 0 ? (
          <div className="p-12 text-center">
            <FileSearch className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">
              No hay solicitudes de cotizacion
            </p>
            <p className="text-text-secondary text-sm mt-2">
              Crea una nueva solicitud para comenzar el proceso de cotizacion
            </p>
            <Button
              onClick={() => router.push('/compras/cotizaciones/nueva')}
              className="mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Solicitud
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Titulo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Proveedores</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Cotizaciones</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Monto Est.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rfqs.map((rfq) => {
                  const estadoConfig = estadosRFQ.find(e => e.id === rfq.status);
                  const Icon = estadoConfig?.icon || Clock;
                  const deadline = new Date(rfq.deadline);
                  const diasRestantes = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const vencida = diasRestantes < 0;
                  const porVencer = diasRestantes >= 0 && diasRestantes <= 3;

                  return (
                    <tr key={rfq.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-palette-purple">{rfq.number}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{rfq.title}</p>
                        <p className="text-xs text-text-secondary">
                          {rfq.purchaseRequest ? `Req: ${rfq.purchaseRequest.numero}` : `Creada: ${formatFecha(rfq.createdAt)}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoConfig?.color}`}>
                          <Icon className="w-3 h-3" />
                          {estadoConfig?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 ${vencida ? 'text-red-500' : porVencer ? 'text-orange-500' : 'text-text-secondary'}`} />
                          <div>
                            <p className={`text-sm font-medium ${vencida ? 'text-red-600' : porVencer ? 'text-orange-600' : 'text-text-primary'}`}>
                              {formatFecha(rfq.deadline)}
                            </p>
                            {!vencida && ['PUBLISHED', 'IN_QUOTATION'].includes(rfq.status) && (
                              <p className={`text-xs ${porVencer ? 'text-orange-500' : 'text-text-secondary'}`}>
                                {diasRestantes === 0 ? 'Vence hoy' : `${diasRestantes} dias`}
                              </p>
                            )}
                            {vencida && ['PUBLISHED', 'IN_QUOTATION'].includes(rfq.status) && (
                              <p className="text-xs text-red-500">Vencida</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Building2 className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm font-medium">{rfq.suppliersInvited}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm font-medium">
                            {rfq.quotationsReceived}/{rfq.suppliersInvited}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {rfq.estimatedBudget ? (
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-4 h-4 text-text-secondary" />
                            <span className="text-sm font-medium">{formatMonto(rfq.estimatedBudget, rfq.currency)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/compras/cotizaciones/${rfq.id}`)}
                            className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {rfq.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => router.push(`/compras/cotizaciones/${rfq.id}/editar`)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(rfq.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {['EVALUATION'].includes(rfq.status) && rfq.quotationsReceived > 0 && (
                            <button
                              onClick={() => router.push(`/compras/cotizaciones/${rfq.id}/comparar`)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Comparar cotizaciones"
                            >
                              <BarChart3 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex items-center px-3 text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
