'use client';

import { useMemo, useState } from 'react';
import { useCompras } from '@/lib/compras-context';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { OrdenCompra, Recepcion, ItemRecibido } from '@/types/compras';
import {
  Search,
  Package,
  Eye,
  ClipboardCheck,
  Clock,
  CheckCircle,
  Truck,
  Building2,
  Calendar,
  Filter,
  X,
  AlertTriangle,
  PackageCheck,
  PackageMinus,
  History,
  GitBranch,
} from 'lucide-react';
import CircuitoCompraModal, { useCircuitoCompraModal } from '@/components/compras/CircuitoCompraModal';

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

const estadosOCRecepcion = [
  { id: 'APROBADA', label: 'Pendiente Recepcion', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  { id: 'EN_PROCESO', label: 'En Proceso', color: 'bg-blue-100 text-blue-700', icon: Truck },
  { id: 'PARCIALMENTE_RECIBIDA', label: 'Parcialmente Recibida', color: 'bg-orange-100 text-orange-700', icon: PackageMinus },
  { id: 'ENTREGADA', label: 'Entregada', color: 'bg-teal-100 text-teal-700', icon: PackageCheck },
  { id: 'FINALIZADA', label: 'Finalizada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
];

// Modal para registrar recepcion
function RecepcionModal({
  isOpen,
  onClose,
  ordenCompra,
  onRegistrar,
}: {
  isOpen: boolean;
  onClose: () => void;
  ordenCompra: OrdenCompra | null;
  onRegistrar: (recepcion: Omit<Recepcion, 'id' | 'numero' | 'receptorId' | 'receptor'>) => void;
}) {
  const [fechaRecepcion, setFechaRecepcion] = useState(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');
  const [itemsRecepcion, setItemsRecepcion] = useState<{
    itemOCId: string;
    descripcion: string;
    unidad: string;
    cantidadEsperada: number;
    cantidadRecibida: number;
    cantidadPendiente: number;
    cantidadARecibir: number;
  }[]>([]);

  // Inicializar items cuando se abre el modal
  useState(() => {
    if (ordenCompra) {
      setItemsRecepcion(
        ordenCompra.items.map((item) => {
          const cantidadYaRecibida = item.cantidadRecibida || 0;
          const cantidadPendiente = item.cantidad - cantidadYaRecibida;
          return {
            itemOCId: item.id,
            descripcion: item.descripcion,
            unidad: item.unidad,
            cantidadEsperada: item.cantidad,
            cantidadRecibida: cantidadYaRecibida,
            cantidadPendiente,
            cantidadARecibir: cantidadPendiente, // Por defecto recibir todo lo pendiente
          };
        })
      );
    }
  });

  // Actualizar items cuando cambia la OC
  useMemo(() => {
    if (ordenCompra && isOpen) {
      setItemsRecepcion(
        ordenCompra.items.map((item) => {
          const cantidadYaRecibida = item.cantidadRecibida || 0;
          const cantidadPendiente = item.cantidad - cantidadYaRecibida;
          return {
            itemOCId: item.id,
            descripcion: item.descripcion,
            unidad: item.unidad,
            cantidadEsperada: item.cantidad,
            cantidadRecibida: cantidadYaRecibida,
            cantidadPendiente,
            cantidadARecibir: cantidadPendiente,
          };
        })
      );
      setObservaciones('');
      setFechaRecepcion(new Date().toISOString().split('T')[0]);
    }
  }, [ordenCompra, isOpen]);

  if (!isOpen || !ordenCompra) return null;

  const handleCantidadChange = (index: number, cantidad: number) => {
    setItemsRecepcion((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        // No permitir recibir más de lo pendiente ni menos de 0
        const cantidadValida = Math.max(0, Math.min(cantidad, item.cantidadPendiente));
        return { ...item, cantidadARecibir: cantidadValida };
      })
    );
  };

  const handleRecibirTodo = () => {
    setItemsRecepcion((prev) =>
      prev.map((item) => ({ ...item, cantidadARecibir: item.cantidadPendiente }))
    );
  };

  const handleRecibirNada = () => {
    setItemsRecepcion((prev) =>
      prev.map((item) => ({ ...item, cantidadARecibir: 0 }))
    );
  };

  const totalARecibir = itemsRecepcion.reduce((sum, item) => sum + item.cantidadARecibir, 0);
  const totalPendiente = itemsRecepcion.reduce((sum, item) => sum + item.cantidadPendiente, 0);
  const esRecepcionTotal = totalARecibir === totalPendiente && totalARecibir > 0;
  const esRecepcionParcial = totalARecibir > 0 && totalARecibir < totalPendiente;

  const handleSubmit = () => {
    if (totalARecibir === 0) {
      alert('Debe indicar al menos una cantidad a recibir');
      return;
    }

    const itemsRecibidos: ItemRecibido[] = itemsRecepcion
      .filter((item) => item.cantidadARecibir > 0)
      .map((item) => ({
        id: `ir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemOCId: item.itemOCId,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidadEsperada: item.cantidadPendiente,
        cantidadRecibida: item.cantidadARecibir,
        cantidadPendiente: item.cantidadPendiente - item.cantidadARecibir,
      }));

    onRegistrar({
      requerimientoId: ordenCompra.requerimientoId,
      ordenCompraId: ordenCompra.id,
      ordenCompra,
      fechaRecepcion: new Date(fechaRecepcion),
      tipoRecepcion: esRecepcionTotal ? 'TOTAL' : 'PARCIAL',
      observaciones: observaciones || undefined,
      itemsRecibidos,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Registrar Recepcion</h2>
            <p className="text-sm text-text-secondary">{ordenCompra.numero} - {ordenCompra.proveedor.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Info de la OC */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-blue-600">Proveedor</p>
                <p className="font-medium text-blue-900">{ordenCompra.proveedor.nombre}</p>
              </div>
              <div>
                <p className="text-blue-600">Fecha Emision</p>
                <p className="font-medium text-blue-900">{formatFecha(ordenCompra.fechaEmision)}</p>
              </div>
              <div>
                <p className="text-blue-600">Total OC</p>
                <p className="font-medium text-blue-900">{formatMonto(ordenCompra.total, ordenCompra.moneda)}</p>
              </div>
              <div>
                <p className="text-blue-600">Lugar Entrega</p>
                <p className="font-medium text-blue-900">{ordenCompra.lugarEntrega || '-'}</p>
              </div>
            </div>
          </div>

          {/* Fecha de recepcion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Fecha de Recepcion <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaRecepcion}
                onChange={(e) => setFechaRecepcion(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleRecibirTodo} className="flex-1">
                <PackageCheck className="w-4 h-4 mr-2" />
                Recibir Todo
              </Button>
              <Button variant="outline" onClick={handleRecibirNada} className="flex-1">
                <PackageMinus className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>

          {/* Items a recibir */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Items a Recibir
            </label>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Descripcion</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-24">Solicitado</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-24">Recibido</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-24">Pendiente</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-32">A Recibir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itemsRecepcion.map((item, index) => (
                    <tr key={item.itemOCId} className={item.cantidadPendiente === 0 ? 'bg-green-50' : ''}>
                      <td className="px-4 py-2">
                        <p className="text-sm font-medium text-text-primary">{item.descripcion}</p>
                        <p className="text-xs text-text-secondary">{item.unidad}</p>
                      </td>
                      <td className="px-4 py-2 text-sm text-center">{item.cantidadEsperada}</td>
                      <td className="px-4 py-2 text-sm text-center">
                        <span className={item.cantidadRecibida > 0 ? 'text-green-600 font-medium' : ''}>
                          {item.cantidadRecibida}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-center">
                        <span className={item.cantidadPendiente > 0 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                          {item.cantidadPendiente}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {item.cantidadPendiente > 0 ? (
                          <input
                            type="number"
                            min="0"
                            max={item.cantidadPendiente}
                            value={item.cantidadARecibir}
                            onChange={(e) => handleCantidadChange(index, parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple text-sm text-center"
                          />
                        ) : (
                          <span className="flex items-center justify-center text-green-600">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen */}
          <div className={`rounded-lg p-4 ${
            esRecepcionTotal ? 'bg-green-50 border border-green-200' :
            esRecepcionParcial ? 'bg-orange-50 border border-orange-200' :
            'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center gap-3">
              {esRecepcionTotal ? (
                <PackageCheck className="w-5 h-5 text-green-600" />
              ) : esRecepcionParcial ? (
                <PackageMinus className="w-5 h-5 text-orange-600" />
              ) : (
                <Package className="w-5 h-5 text-gray-500" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  esRecepcionTotal ? 'text-green-800' :
                  esRecepcionParcial ? 'text-orange-800' :
                  'text-gray-700'
                }`}>
                  {esRecepcionTotal ? 'Recepcion Total' :
                   esRecepcionParcial ? 'Recepcion Parcial' :
                   'Seleccione cantidades a recibir'}
                </p>
                <p className={`text-xs ${
                  esRecepcionTotal ? 'text-green-600' :
                  esRecepcionParcial ? 'text-orange-600' :
                  'text-gray-500'
                }`}>
                  {totalARecibir} de {totalPendiente} items pendientes seran recibidos
                  {esRecepcionParcial && ` (quedaran ${totalPendiente - totalARecibir} pendientes)`}
                </p>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Observaciones sobre la recepcion (daños, faltantes, etc.)..."
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={totalARecibir === 0}>
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Registrar Recepcion
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal para ver historial de recepciones
function HistorialRecepcionesModal({
  isOpen,
  onClose,
  ordenCompra,
}: {
  isOpen: boolean;
  onClose: () => void;
  ordenCompra: OrdenCompra | null;
}) {
  if (!isOpen || !ordenCompra) return null;

  const recepciones = ordenCompra.recepciones || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Historial de Recepciones</h2>
            <p className="text-sm text-text-secondary">{ordenCompra.numero}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4">
          {recepciones.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-text-secondary">No hay recepciones registradas</p>
            </div>
          ) : (
            recepciones.map((recepcion, index) => (
              <div key={recepcion.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      recepcion.tipoRecepcion === 'TOTAL'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {recepcion.tipoRecepcion === 'TOTAL' ? 'Total' : 'Parcial'}
                    </span>
                    <span className="text-sm font-medium text-text-primary">{recepcion.numero}</span>
                  </div>
                  <span className="text-sm text-text-secondary">
                    {formatFecha(recepcion.fechaRecepcion)}
                  </span>
                </div>
                <div className="text-sm text-text-secondary mb-2">
                  Recibido por: {recepcion.receptor?.nombre || 'Usuario'}
                </div>
                <div className="space-y-1">
                  {recepcion.itemsRecibidos.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm bg-gray-50 rounded px-3 py-1">
                      <span>{item.descripcion}</span>
                      <span className="font-medium">{item.cantidadRecibida} {item.unidad}</span>
                    </div>
                  ))}
                </div>
                {recepcion.observaciones && (
                  <p className="text-sm text-text-secondary mt-2 italic">
                    "{recepcion.observaciones}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RecepcionComprasPage() {
  const { ordenesCompra, agregarRecepcion, usuarioActual } = useCompras();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null);
  const [showHistorial, setShowHistorial] = useState<OrdenCompra | null>(null);

  // Hook para el modal de circuito de compra
  const circuitoModal = useCircuitoCompraModal();

  // Filtrar OC disponibles para recepcion (aprobadas, en proceso, parcialmente recibidas o finalizadas)
  const ordenesParaRecepcion = useMemo(() => {
    return ordenesCompra.filter((oc) => {
      // Mostrar OC que pueden recibir items o que ya están finalizadas (para historial)
      const estadosValidos = ['APROBADA', 'EN_PROCESO', 'PARCIALMENTE_RECIBIDA', 'ENTREGADA', 'FINALIZADA'];
      if (!estadosValidos.includes(oc.estado)) return false;

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

  // Contar pendientes de recepcion (excluye ENTREGADA y FINALIZADA)
  const pendientesCount = useMemo(() => {
    return ordenesCompra.filter(oc =>
      oc.estado === 'APROBADA' || oc.estado === 'EN_PROCESO' || oc.estado === 'PARCIALMENTE_RECIBIDA'
    ).length;
  }, [ordenesCompra]);

  // Contar finalizadas
  const finalizadasCount = useMemo(() => {
    return ordenesCompra.filter(oc => oc.estado === 'FINALIZADA').length;
  }, [ordenesCompra]);

  const [registrandoRecepcion, setRegistrandoRecepcion] = useState(false);

  const handleRegistrarRecepcion = async (recepcionData: Omit<Recepcion, 'id' | 'numero' | 'receptorId' | 'receptor'>) => {
    setRegistrandoRecepcion(true);
    try {
      const result = await agregarRecepcion({
        ordenCompraId: recepcionData.ordenCompraId,
        itemsRecibidos: recepcionData.itemsRecibidos.map(item => ({
          itemOCId: item.itemOCId,
          cantidadRecibida: item.cantidadRecibida,
        })),
        observaciones: recepcionData.observaciones,
      });
      if (result) {
        console.log('Recepción registrada exitosamente:', result.numero);
      } else {
        alert('Error al registrar la recepción');
      }
    } catch (error) {
      console.error('Error registrando recepción:', error);
      alert('Error al registrar la recepción');
    } finally {
      setRegistrandoRecepcion(false);
    }
  };

  // Calcular progreso de recepcion para una OC
  const calcularProgreso = (oc: OrdenCompra) => {
    const totalSolicitado = oc.items.reduce((sum, item) => sum + item.cantidad, 0);
    const totalRecibido = oc.items.reduce((sum, item) => sum + (item.cantidadRecibida || 0), 0);
    return {
      porcentaje: totalSolicitado > 0 ? Math.round((totalRecibido / totalSolicitado) * 100) : 0,
      recibido: totalRecibido,
      total: totalSolicitado,
    };
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Recepcion de Compras"
        subtitle={`${pendientesCount} orden${pendientesCount !== 1 ? 'es' : ''} pendiente${pendientesCount !== 1 ? 's' : ''} de recepcion`}
      />

      {/* Alerta de pendientes */}
      {pendientesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Tienes {pendientesCount} orden{pendientesCount !== 1 ? 'es' : ''} de compra pendiente{pendientesCount !== 1 ? 's' : ''} de recepcion
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Registra la recepcion de los productos cuando lleguen
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
                {estadosOCRecepcion.map((estado) => (
                  <option key={estado.id} value={estado.id}>{estado.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {ordenesParaRecepcion.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">
              No hay ordenes de compra para recepcionar
            </p>
            <p className="text-text-secondary text-sm mt-2">
              Las ordenes de compra aprobadas apareceran aqui
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Progreso</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Fecha OC</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ordenesParaRecepcion.map((oc) => {
                  const estadoConfig = estadosOCRecepcion.find(e => e.id === oc.estado);
                  const Icon = estadoConfig?.icon || Clock;
                  const progreso = calcularProgreso(oc);
                  // No se puede recepcionar si ya está ENTREGADA o FINALIZADA
                  const puedeRecibir = oc.estado !== 'ENTREGADA' && oc.estado !== 'FINALIZADA';
                  const tieneRecepciones = (oc.recepciones?.length || 0) > 0;

                  return (
                    <tr key={oc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-palette-purple">{oc.numero}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{oc.proveedor.nombre}</p>
                        <p className="text-xs text-text-secondary">CUIT: {oc.proveedor.cuit}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoConfig?.color}`}>
                          <Icon className="w-3 h-3" />
                          {estadoConfig?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-text-secondary">{progreso.recibido}/{progreso.total}</span>
                            <span className={`font-medium ${
                              progreso.porcentaje === 100 ? 'text-green-600' :
                              progreso.porcentaje > 0 ? 'text-orange-600' :
                              'text-gray-500'
                            }`}>
                              {progreso.porcentaje}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                progreso.porcentaje === 100 ? 'bg-green-500' :
                                progreso.porcentaje > 0 ? 'bg-orange-500' :
                                'bg-gray-300'
                              }`}
                              style={{ width: `${progreso.porcentaje}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatFecha(oc.fechaEmision)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary text-right">
                        {formatMonto(oc.total, oc.moneda)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Ver circuito */}
                          <button
                            onClick={() => circuitoModal.openFromOrdenCompra(oc.id)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Ver circuito de compra"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>
                          {tieneRecepciones && (
                            <button
                              onClick={() => setShowHistorial(oc)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver historial"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}
                          {puedeRecibir && (
                            <button
                              onClick={() => setSelectedOC(oc)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Registrar recepcion"
                            >
                              <ClipboardCheck className="w-4 h-4" />
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

      {/* Modal de recepcion */}
      <RecepcionModal
        isOpen={!!selectedOC}
        onClose={() => setSelectedOC(null)}
        ordenCompra={selectedOC}
        onRegistrar={handleRegistrarRecepcion}
      />

      {/* Modal de historial */}
      <HistorialRecepcionesModal
        isOpen={!!showHistorial}
        onClose={() => setShowHistorial(null)}
        ordenCompra={showHistorial}
      />

      {/* Modal circuito de compra */}
      <CircuitoCompraModal
        isOpen={circuitoModal.modalState.isOpen}
        onClose={circuitoModal.close}
        requerimientoId={circuitoModal.modalState.requerimientoId}
        ordenCompraId={circuitoModal.modalState.ordenCompraId}
        recepcionId={circuitoModal.modalState.recepcionId}
      />
    </div>
  );
}
