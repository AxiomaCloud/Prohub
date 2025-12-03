'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useCompras } from '@/lib/compras-context';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { OrdenCompra } from '@/types/compras';
import {
  Search,
  ShoppingCart,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Package,
  Building2,
  Calendar,
  Filter,
  X,
  FileText,
  User,
  AlertTriangle,
  ClipboardCheck,
} from 'lucide-react';

function formatMonto(monto: number, moneda: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

function formatFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

const estadosOC = [
  { id: 'PENDIENTE_APROBACION', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  { id: 'APROBADA', label: 'Aprobada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { id: 'RECHAZADA', label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
  { id: 'EN_PROCESO', label: 'En Proceso', color: 'bg-blue-100 text-blue-700', icon: Truck },
  { id: 'ENTREGADA', label: 'Entregada', color: 'bg-emerald-100 text-emerald-700', icon: Package },
];

// Modal para ver detalle de OC y aprobar/rechazar
function DetalleOCModal({
  isOpen,
  onClose,
  ordenCompra,
  onAprobar,
  onRechazar,
}: {
  isOpen: boolean;
  onClose: () => void;
  ordenCompra: OrdenCompra | null;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  if (!isOpen || !ordenCompra) return null;

  const estadoConfig = estadosOC.find(e => e.id === ordenCompra.estado);
  const Icon = estadoConfig?.icon || Clock;
  const puedeAprobar = ordenCompra.estado === 'PENDIENTE_APROBACION';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{ordenCompra.numero}</h2>
            <p className="text-sm text-text-secondary">Orden de Compra</p>
          </div>
          <div className="flex items-center gap-3">
            {puedeAprobar && (
              <>
                <Button
                  variant="outline"
                  onClick={onRechazar}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  onClick={onAprobar}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
              </>
            )}
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${estadoConfig?.color}`}>
              <Icon className="w-4 h-4" />
              {estadoConfig?.label}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Info general */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-text-secondary">Fecha Emision</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4 text-text-secondary" />
                {formatFecha(ordenCompra.fechaEmision)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Entrega Estimada</p>
              <p className="text-sm font-medium">
                {ordenCompra.fechaEntregaEstimada
                  ? formatFecha(ordenCompra.fechaEntregaEstimada)
                  : 'No especificada'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Condicion Pago</p>
              <p className="text-sm font-medium">{ordenCompra.condicionPago || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Lugar Entrega</p>
              <p className="text-sm font-medium">{ordenCompra.lugarEntrega || '-'}</p>
            </div>
          </div>

          {/* Creado por */}
          {ordenCompra.creadoPor && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-text-primary mb-2 flex items-center gap-2">
                <User className="w-4 h-4" /> Creado por
              </h4>
              <div className="text-sm">
                <p className="font-medium">{ordenCompra.creadoPor.nombre}</p>
                <p className="text-text-secondary">{ordenCompra.creadoPor.email}</p>
              </div>
            </div>
          )}

          {/* Proveedor */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Proveedor
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-600">Razon Social</p>
                <p className="font-medium text-blue-900">{ordenCompra.proveedor.nombre}</p>
              </div>
              <div>
                <p className="text-blue-600">CUIT</p>
                <p className="font-medium text-blue-900">{ordenCompra.proveedor.cuit}</p>
              </div>
              <div>
                <p className="text-blue-600">Contacto</p>
                <p className="font-medium text-blue-900">{ordenCompra.proveedor.contacto || '-'}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <h4 className="font-medium text-text-primary mb-2">Items</h4>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Descripcion</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase">Cantidad</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase">P. Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ordenCompra.items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm">{index + 1}</td>
                      <td className="px-4 py-2 text-sm">{item.descripcion}</td>
                      <td className="px-4 py-2 text-sm text-center">{item.cantidad} {item.unidad}</td>
                      <td className="px-4 py-2 text-sm text-right">{formatMonto(item.precioUnitario)}</td>
                      <td className="px-4 py-2 text-sm text-right font-medium">{formatMonto(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium">Subtotal:</td>
                    <td className="px-4 py-2 text-right text-sm font-medium">{formatMonto(ordenCompra.subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium">IVA (21%):</td>
                    <td className="px-4 py-2 text-right text-sm font-medium">{formatMonto(ordenCompra.impuestos)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-sm font-bold">Total:</td>
                    <td className="px-4 py-2 text-right text-sm font-bold text-palette-purple">{formatMonto(ordenCompra.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Observaciones */}
          {ordenCompra.observaciones && (
            <div>
              <h4 className="font-medium text-text-primary mb-2">Observaciones</h4>
              <p className="text-sm text-text-secondary bg-gray-50 rounded-lg p-3">
                {ordenCompra.observaciones}
              </p>
            </div>
          )}

          {/* Info de aprobacion si ya fue procesada */}
          {ordenCompra.aprobadorOC && (
            <div className={`rounded-lg p-4 ${
              ordenCompra.estado === 'RECHAZADA' ? 'bg-red-50' : 'bg-green-50'
            }`}>
              <h4 className={`font-medium mb-2 flex items-center gap-2 ${
                ordenCompra.estado === 'RECHAZADA' ? 'text-red-800' : 'text-green-800'
              }`}>
                {ordenCompra.estado === 'RECHAZADA' ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {ordenCompra.estado === 'RECHAZADA' ? 'Rechazada' : 'Aprobada'} por
              </h4>
              <div className="text-sm">
                <p className={`font-medium ${
                  ordenCompra.estado === 'RECHAZADA' ? 'text-red-900' : 'text-green-900'
                }`}>
                  {ordenCompra.aprobadorOC.nombre}
                </p>
                {ordenCompra.fechaAprobacionOC && (
                  <p className={ordenCompra.estado === 'RECHAZADA' ? 'text-red-600' : 'text-green-600'}>
                    {formatFecha(ordenCompra.fechaAprobacionOC)}
                  </p>
                )}
                {ordenCompra.comentarioAprobacionOC && (
                  <p className={`mt-2 ${
                    ordenCompra.estado === 'RECHAZADA' ? 'text-red-700' : 'text-green-700'
                  }`}>
                    "{ordenCompra.comentarioAprobacionOC}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal de confirmacion para aprobar/rechazar
function ConfirmacionModal({
  isOpen,
  onClose,
  onConfirm,
  tipo,
  numero,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comentario: string) => void;
  tipo: 'aprobar' | 'rechazar';
  numero: string;
}) {
  const [comentario, setComentario] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(comentario);
    setComentario('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            tipo === 'aprobar' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {tipo === 'aprobar' ? (
              <ThumbsUp className="w-6 h-6 text-green-600" />
            ) : (
              <ThumbsDown className="w-6 h-6 text-red-600" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {tipo === 'aprobar' ? 'Aprobar' : 'Rechazar'} Orden de Compra
          </h3>
          <p className="text-sm text-text-secondary mb-4">
            {tipo === 'aprobar'
              ? `¿Esta seguro que desea aprobar la orden de compra ${numero}?`
              : `¿Esta seguro que desea rechazar la orden de compra ${numero}?`}
          </p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-1">
              Comentario {tipo === 'rechazar' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder={tipo === 'rechazar' ? 'Motivo del rechazo...' : 'Comentario opcional...'}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={tipo === 'rechazar' && !comentario.trim()}
              className={tipo === 'aprobar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {tipo === 'aprobar' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AprobacionesOCPage() {
  const { ordenesCompra, actualizarOrdenCompra, usuarioActual } = useCompras();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('PENDIENTE_APROBACION');
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    tipo: 'aprobar' | 'rechazar';
    oc: OrdenCompra | null;
  }>({ isOpen: false, tipo: 'aprobar', oc: null });

  // Filtrar OC para aprobacion
  const ordenesCompraFiltradas = useMemo(() => {
    return ordenesCompra.filter((oc) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchNumero = oc.numero.toLowerCase().includes(query);
        const matchProveedor = oc.proveedor.nombre.toLowerCase().includes(query);
        if (!matchNumero && !matchProveedor) return false;
      }
      if (filtroEstado && oc.estado !== filtroEstado) return false;
      return true;
    });
  }, [ordenesCompra, searchQuery, filtroEstado]);

  // Contar pendientes
  const pendientesCount = useMemo(() => {
    return ordenesCompra.filter(oc => oc.estado === 'PENDIENTE_APROBACION').length;
  }, [ordenesCompra]);

  const handleAprobar = (oc: OrdenCompra) => {
    setConfirmModal({ isOpen: true, tipo: 'aprobar', oc });
  };

  const handleRechazar = (oc: OrdenCompra) => {
    setConfirmModal({ isOpen: true, tipo: 'rechazar', oc });
  };

  const handleConfirmacion = async (comentario: string) => {
    if (!confirmModal.oc) return;

    const nuevoEstado = confirmModal.tipo === 'aprobar' ? 'APROBADA' : 'RECHAZADA';

    try {
      await actualizarOrdenCompra(confirmModal.oc.id, {
        estado: nuevoEstado,
        aprobadorOCId: usuarioActual.id,
        aprobadorOC: usuarioActual,
        fechaAprobacionOC: new Date(),
        comentarioAprobacionOC: comentario || undefined,
      });

      toast.success(confirmModal.tipo === 'aprobar'
        ? `Orden ${confirmModal.oc.numero} aprobada correctamente`
        : `Orden ${confirmModal.oc.numero} rechazada`
      );
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar la orden de compra');
    }

    setSelectedOC(null);
    setConfirmModal({ isOpen: false, tipo: 'aprobar', oc: null });
  };

  // Verificar permisos
  if (usuarioActual.rol !== 'APROBADOR' && usuarioActual.rol !== 'ADMIN') {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-border p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary font-medium">
            No tienes permisos para acceder a esta seccion
          </p>
          <p className="text-text-secondary text-sm mt-2">
            Solo los aprobadores pueden aprobar ordenes de compra
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Aprobaciones de Ordenes de Compra"
        subtitle={`${pendientesCount} orden${pendientesCount !== 1 ? 'es' : ''} pendiente${pendientesCount !== 1 ? 's' : ''} de aprobacion`}
        icon={ClipboardCheck}
      />

      {/* Alerta de pendientes */}
      {pendientesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Tienes {pendientesCount} orden{pendientesCount !== 1 ? 'es' : ''} de compra pendiente{pendientesCount !== 1 ? 's' : ''} de aprobacion
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Revisa y aprueba o rechaza las ordenes para continuar con el proceso de compras
              </p>
            </div>
          </div>
        </div>
      )}

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
                placeholder="Buscar por numero o proveedor..."
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
                <option value="">Todos los estados</option>
                {estadosOC.map((estado) => (
                  <option key={estado.id} value={estado.id}>{estado.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {ordenesCompraFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">
              No hay ordenes de compra
            </p>
            <p className="text-text-secondary text-sm mt-2">
              {filtroEstado === 'PENDIENTE_APROBACION'
                ? 'No hay ordenes pendientes de aprobacion'
                : 'Cambia los filtros para ver otras ordenes'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Creado por</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Fecha</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ordenesCompraFiltradas.map((oc) => {
                  const estadoConfig = estadosOC.find(e => e.id === oc.estado);
                  const Icon = estadoConfig?.icon || Clock;
                  const puedeAprobar = oc.estado === 'PENDIENTE_APROBACION';
                  return (
                    <tr key={oc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-palette-purple">{oc.numero}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{oc.proveedor.nombre}</p>
                        {oc.proveedor.cuit && !oc.proveedor.cuit.startsWith('TEMP-') && (
                          <p className="text-xs text-text-secondary">CUIT: {oc.proveedor.cuit}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{oc.creadoPor?.nombre || '-'}</p>
                        <p className="text-xs text-text-secondary">{oc.creadoPor?.departamento || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoConfig?.color}`}>
                          <Icon className="w-3 h-3" />
                          {estadoConfig?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatFecha(oc.fechaEmision)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary text-right">
                        {formatMonto(oc.total, oc.moneda)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedOC(oc)}
                            className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {puedeAprobar && (
                            <>
                              <button
                                onClick={() => handleAprobar(oc)}
                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Aprobar"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRechazar(oc)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Rechazar"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </>
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
      <DetalleOCModal
        isOpen={!!selectedOC}
        onClose={() => setSelectedOC(null)}
        ordenCompra={selectedOC}
        onAprobar={() => selectedOC && handleAprobar(selectedOC)}
        onRechazar={() => selectedOC && handleRechazar(selectedOC)}
      />

      {/* Modal de confirmacion */}
      <ConfirmacionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, tipo: 'aprobar', oc: null })}
        onConfirm={handleConfirmacion}
        tipo={confirmModal.tipo}
        numero={confirmModal.oc?.numero || ''}
      />
    </div>
  );
}
