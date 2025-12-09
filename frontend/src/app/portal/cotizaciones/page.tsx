'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  FileSearch,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Calendar,
  Building2,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Award,
  ThumbsDown,
  Edit3,
  Package,
} from 'lucide-react';

interface Invitation {
  id: string;
  status: string;
  invitedAt: string;
  viewedAt?: string;
  respondedAt?: string;
  rfq: {
    id: string;
    number: string;
    title: string;
    status: string;
    deadline: string;
    deliveryDeadline?: string;
    currency: string;
    tenant: {
      id: string;
      name: string;
    };
    itemCount: number;
  };
  myQuotation?: {
    id: string;
    number: string;
    status: string;
    totalAmount: number;
    submittedAt?: string;
  };
}

// Estados de la invitacion
const estadosInvitacion: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pendiente', color: 'bg-gray-100 text-gray-700', icon: Clock },
  INVITED: { label: 'Invitado', color: 'bg-blue-100 text-blue-700', icon: Send },
  VIEWED: { label: 'Vista', color: 'bg-purple-100 text-purple-700', icon: Eye },
  DECLINED: { label: 'Declinada', color: 'bg-red-100 text-red-700', icon: XCircle },
};

// Estados de la cotizacion del proveedor
const estadosCotizacion: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: Edit3 },
  SUBMITTED: { label: 'Enviada', color: 'bg-blue-100 text-blue-700', icon: Send },
  UNDER_REVIEW: { label: 'En Revision', color: 'bg-purple-100 text-purple-700', icon: Eye },
  ACCEPTED: { label: 'Aceptada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
  AWARDED: { label: 'Adjudicada', color: 'bg-emerald-100 text-emerald-700', icon: Award },
};

// Estados del RFQ
const estadosRFQ: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: 'Abierta', color: 'bg-blue-100 text-blue-700' },
  IN_QUOTATION: { label: 'En Cotizacion', color: 'bg-purple-100 text-purple-700' },
  EVALUATION: { label: 'En Evaluacion', color: 'bg-orange-100 text-orange-700' },
  AWARDED: { label: 'Adjudicada', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'Cerrada', color: 'bg-gray-100 text-gray-700' },
};

function formatFecha(fecha: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

function formatMonto(monto: number, moneda: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

export default function PortalCotizacionesPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('No estás autenticado');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/supplier-portal/invitations`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      } else if (response.status === 401) {
        // Token inválido o expirado - limpiar y redirigir a login
        localStorage.removeItem('token');
        localStorage.removeItem('hub_token');
        router.push('/login');
        return;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar las invitaciones');
      }
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Filtrar invitaciones
  const filteredInvitations = invitations.filter(inv => {
    // Filtro de busqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !inv.rfq.number.toLowerCase().includes(query) &&
        !inv.rfq.title.toLowerCase().includes(query) &&
        !inv.rfq.tenant.name.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Filtro por estado
    if (filtroEstado) {
      if (filtroEstado === 'COTIZADO') {
        return inv.myQuotation && inv.myQuotation.status !== 'DRAFT';
      }
      if (filtroEstado === 'PENDIENTE') {
        return !inv.myQuotation || inv.myQuotation.status === 'DRAFT';
      }
      if (filtroEstado === 'ADJUDICADO') {
        return inv.myQuotation?.status === 'AWARDED';
      }
    }

    return true;
  });

  // Estadisticas
  const stats = {
    total: invitations.length,
    pendientes: invitations.filter(i => !i.myQuotation || i.myQuotation.status === 'DRAFT').length,
    cotizadas: invitations.filter(i => i.myQuotation && i.myQuotation.status !== 'DRAFT').length,
    adjudicadas: invitations.filter(i => i.myQuotation?.status === 'AWARDED').length,
    noAdjudicadas: invitations.filter(i => i.myQuotation?.status === 'REJECTED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">{error}</p>
          <p className="text-red-500 text-sm mt-2">
            Asegurate de estar registrado como proveedor para acceder a esta seccion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Mis Cotizaciones"
        subtitle="Solicitudes de cotizacion recibidas"
        icon={FileSearch}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSearch className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
              <p className="text-sm text-text-secondary">Invitaciones</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.pendientes}</p>
              <p className="text-sm text-text-secondary">Por Cotizar</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Send className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.cotizadas}</p>
              <p className="text-sm text-text-secondary">Cotizadas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.adjudicadas}</p>
              <p className="text-sm text-text-secondary">Adjudicadas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ThumbsDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.noAdjudicadas}</p>
              <p className="text-sm text-text-secondary">No Adjudicadas</p>
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
                placeholder="Buscar por numero, titulo o empresa..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-secondary" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todos</option>
                <option value="PENDIENTE">Por Cotizar</option>
                <option value="COTIZADO">Cotizadas</option>
                <option value="ADJUDICADO">Adjudicadas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de invitaciones */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {filteredInvitations.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">
              {invitations.length === 0
                ? 'No tienes invitaciones a cotizar'
                : 'No hay invitaciones que coincidan con el filtro'}
            </p>
            <p className="text-text-secondary text-sm mt-2">
              Las empresas te invitaran a cotizar cuando necesiten tus productos o servicios.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">RFQ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Empresa</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Estado RFQ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Vencimiento</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Mi Cotizacion</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Monto</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInvitations.map((inv) => {
                  const rfqEstado = estadosRFQ[inv.rfq.status] || { label: inv.rfq.status, color: 'bg-gray-100 text-gray-700' };
                  const deadline = new Date(inv.rfq.deadline);
                  const diasRestantes = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const vencida = diasRestantes < 0;
                  const porVencer = diasRestantes >= 0 && diasRestantes <= 3;
                  const puedeCotar = ['PUBLISHED', 'IN_QUOTATION'].includes(inv.rfq.status) && !vencida;

                  const miCotEstado = inv.myQuotation
                    ? estadosCotizacion[inv.myQuotation.status] || { label: inv.myQuotation.status, color: 'bg-gray-100 text-gray-700', icon: FileText }
                    : null;

                  return (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-palette-purple">{inv.rfq.number}</p>
                        <p className="text-xs text-text-secondary truncate max-w-[200px]">{inv.rfq.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm font-medium">{inv.rfq.tenant.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${rfqEstado.color}`}>
                          {rfqEstado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 ${vencida ? 'text-red-500' : porVencer ? 'text-orange-500' : 'text-text-secondary'}`} />
                          <div>
                            <p className={`text-sm font-medium ${vencida ? 'text-red-600' : porVencer ? 'text-orange-600' : 'text-text-primary'}`}>
                              {formatFecha(inv.rfq.deadline)}
                            </p>
                            {puedeCotar && (
                              <p className={`text-xs ${porVencer ? 'text-orange-500' : 'text-text-secondary'}`}>
                                {diasRestantes === 0 ? 'Vence hoy' : `${diasRestantes} dias`}
                              </p>
                            )}
                            {vencida && (
                              <p className="text-xs text-red-500">Vencida</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium">{inv.rfq.itemCount}</span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.myQuotation ? (
                          <div className="flex items-center gap-2">
                            {miCotEstado && (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${miCotEstado.color}`}>
                                <miCotEstado.icon className="w-3 h-3" />
                                {miCotEstado.label}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-text-secondary italic">Sin cotizar</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.myQuotation ? (
                          <span className="text-sm font-medium">
                            {formatMonto(inv.myQuotation.totalAmount, inv.rfq.currency)}
                          </span>
                        ) : (
                          <span className="text-sm text-text-secondary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/portal/cotizaciones/${inv.rfq.id}`)}
                            className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title={puedeCotar ? 'Cotizar' : 'Ver detalle'}
                          >
                            {puedeCotar && !inv.myQuotation ? (
                              <Edit3 className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
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
    </div>
  );
}
