'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupplier } from '@/hooks/useSupplier';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
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
} from 'lucide-react';

interface Factura {
  id: string;
  numero: string;
  fecha: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'PAGADA';
  subtotal: number;
  iva: number;
  total: number;
  moneda: string;
  ordenCompra?: {
    id: string;
    numero: string;
  };
  motivoRechazo?: string;
  fechaAprobacion?: string;
  fechaPago?: string;
  archivoUrl?: string;
}

const estadosFactura: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  APROBADA: { label: 'Aprobada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
  PAGADA: { label: 'Pagada', color: 'bg-emerald-100 text-emerald-700', icon: CreditCard },
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
  const { isSupplier, supplierId, loading: supplierLoading } = useSupplier();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Modal de detalle
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!supplierLoading && isSupplier && supplierId) {
      fetchFacturas();
    } else if (!supplierLoading && !isSupplier) {
      setLoading(false);
    }
  }, [supplierLoading, isSupplier, supplierId]);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/suppliers/me/facturas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFacturas(data.facturas || []);
      } else {
        toast.error('Error al cargar facturas');
      }
    } catch (error) {
      console.error('Error fetching facturas:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const filteredFacturas = facturas.filter(f => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!f.numero.toLowerCase().includes(query) &&
          !f.ordenCompra?.numero.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (filtroEstado && f.estado !== filtroEstado) {
      return false;
    }
    return true;
  });

  // Estadísticas
  const stats = {
    total: facturas.length,
    pendientes: facturas.filter(f => f.estado === 'PENDIENTE').length,
    aprobadas: facturas.filter(f => f.estado === 'APROBADA').length,
    rechazadas: facturas.filter(f => f.estado === 'RECHAZADA').length,
    pagadas: facturas.filter(f => f.estado === 'PAGADA').length,
    montoTotal: facturas.reduce((sum, f) => sum + f.total, 0),
    montoPendiente: facturas.filter(f => f.estado === 'APROBADA').reduce((sum, f) => sum + f.total, 0),
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
        subtitle={`${facturas.length} factura${facturas.length !== 1 ? 's' : ''} cargada${facturas.length !== 1 ? 's' : ''}`}
        icon={FileText}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.pendientes}</p>
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
              <p className="text-2xl font-bold text-text-primary">{stats.aprobadas}</p>
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
              <p className="text-2xl font-bold text-text-primary">{stats.pagadas}</p>
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
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            >
              <option value="">Todos los estados</option>
              {Object.entries(estadosFactura).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de facturas */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {filteredFacturas.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">No hay facturas</p>
            <p className="text-text-secondary text-sm mt-2">
              Las facturas que cargues aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
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
                {filteredFacturas.map((factura) => {
                  const estadoConfig = estadosFactura[factura.estado] || estadosFactura.PENDIENTE;
                  const Icon = estadoConfig.icon;
                  return (
                    <tr key={factura.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-palette-purple">{factura.numero}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatFecha(factura.fecha)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {factura.ordenCompra?.numero || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.color}`}>
                          <Icon className="w-3 h-3" />
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatMonto(factura.subtotal, factura.moneda)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatMonto(factura.iva, factura.moneda)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right">
                        {formatMonto(factura.total, factura.moneda)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedFactura(factura)}
                            className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {factura.archivoUrl && (
                            <a
                              href={factura.archivoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Descargar"
                            >
                              <Download className="w-4 h-4" />
                            </a>
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

      {/* Modal de detalle */}
      {selectedFactura && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Factura {selectedFactura.numero}</h3>
                <p className="text-sm text-text-secondary">{formatFecha(selectedFactura.fecha)}</p>
              </div>
              <button
                onClick={() => setSelectedFactura(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Estado */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Estado:</span>
                {(() => {
                  const config = estadosFactura[selectedFactura.estado];
                  const Icon = config.icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                      <Icon className="w-4 h-4" />
                      {config.label}
                    </span>
                  );
                })()}
              </div>

              {/* OC asociada */}
              {selectedFactura.ordenCompra && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Orden de Compra:</span>
                  <span className="text-sm font-medium">{selectedFactura.ordenCompra.numero}</span>
                </div>
              )}

              {/* Montos */}
              <div className="border-t border-b border-border py-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Subtotal:</span>
                  <span className="text-sm">{formatMonto(selectedFactura.subtotal, selectedFactura.moneda)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">IVA:</span>
                  <span className="text-sm">{formatMonto(selectedFactura.iva, selectedFactura.moneda)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total:</span>
                  <span className="text-lg font-bold text-palette-purple">{formatMonto(selectedFactura.total, selectedFactura.moneda)}</span>
                </div>
              </div>

              {/* Fechas adicionales */}
              {selectedFactura.fechaAprobacion && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Fecha aprobación:</span>
                  <span className="text-sm">{formatFecha(selectedFactura.fechaAprobacion)}</span>
                </div>
              )}

              {selectedFactura.fechaPago && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Fecha pago:</span>
                  <span className="text-sm text-green-600 font-medium">{formatFecha(selectedFactura.fechaPago)}</span>
                </div>
              )}

              {/* Motivo de rechazo */}
              {selectedFactura.estado === 'RECHAZADA' && selectedFactura.motivoRechazo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Motivo del rechazo</p>
                      <p className="text-sm text-red-600 mt-1">{selectedFactura.motivoRechazo}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              {selectedFactura.archivoUrl && (
                <a
                  href={selectedFactura.archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </a>
              )}
              <Button onClick={() => setSelectedFactura(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
