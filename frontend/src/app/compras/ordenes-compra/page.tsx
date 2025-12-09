'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCompras } from '@/lib/compras-context';
import { useSupplier } from '@/hooks/useSupplier';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { OrdenCompra, Requerimiento, Proveedor, ItemOC } from '@/types/compras';
import {
  Plus,
  Search,
  ShoppingCart,
  Eye,
  FileText,
  Truck,
  CheckCircle,
  Clock,
  Package,
  Building2,
  Calendar,
  DollarSign,
  X,
  ChevronDown,
  Filter,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  FileCheck,
} from 'lucide-react';
import CircuitoCompraModal, { useCircuitoCompraModal } from '@/components/compras/CircuitoCompraModal';
import { ProveedorSelector } from '@/components/ui/ProveedorSelector';

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
  { id: 'PENDIENTE_APROBACION', label: 'Pendiente Aprobacion', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  { id: 'APROBADA', label: 'Aprobada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { id: 'RECHAZADA', label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: Clock },
  { id: 'EN_PROCESO', label: 'En Proceso', color: 'bg-blue-100 text-blue-700', icon: Truck },
  { id: 'PARCIALMENTE_RECIBIDA', label: 'Parcialmente Recibida', color: 'bg-orange-100 text-orange-700', icon: Package },
  { id: 'ENTREGADA', label: 'Entregada', color: 'bg-teal-100 text-teal-700', icon: Package },
  { id: 'FINALIZADA', label: 'Finalizada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
];

const getPrioridadBadge = (prioridad: string | undefined) => {
  const config: Record<string, { label: string; className: string }> = {
    BAJA: { label: 'Baja', className: 'bg-gray-100 text-gray-600' },
    NORMAL: { label: 'Normal', className: 'bg-blue-100 text-blue-600' },
    ALTA: { label: 'Alta', className: 'bg-orange-100 text-orange-600' },
    URGENTE: { label: 'Urgente', className: 'bg-red-100 text-red-600' },
  };
  const key = (prioridad || 'NORMAL').toUpperCase();
  return config[key] || { label: prioridad || 'Normal', className: 'bg-gray-100 text-gray-600' };
};

// Interfaz para item con selección
interface ItemSeleccionable {
  id: string; // ID del item del requerimiento
  descripcion: string;
  cantidad: number; // Cantidad pendiente disponible para esta OC
  cantidadOriginal?: number; // Cantidad original del requerimiento
  cantidadAsignada?: number; // Cantidad ya asignada a otras OCs
  unidad: string;
  precioUnitario: number;
  total: number;
  seleccionado: boolean;
  tieneOC: boolean; // Si ya tiene toda la cantidad asignada a OCs
}

// Modal para crear nueva OC
function NuevaOCModal({
  isOpen,
  onClose,
  requerimientosAprobados,
  proveedores,
  onCrear,
  ordenesCompraExistentes,
}: {
  isOpen: boolean;
  onClose: () => void;
  requerimientosAprobados: Requerimiento[];
  proveedores: Proveedor[];
  onCrear: (oc: Omit<OrdenCompra, 'id' | 'numero'>) => void;
  ordenesCompraExistentes: OrdenCompra[];
}) {
  const { usuarioActual } = useCompras();
  const [requerimientoId, setRequerimientoId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [condicionPago, setCondicionPago] = useState('30 días');
  const [lugarEntrega, setLugarEntrega] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [itemsSeleccionables, setItemsSeleccionables] = useState<ItemSeleccionable[]>([]);

  const requerimientoSeleccionado = requerimientosAprobados.find(r => r.id === requerimientoId);
  const proveedorSeleccionado = proveedores.find(p => p.id === proveedorId);

  // Verificar si el requerimiento requiere aprobación de especificaciones
  const requiereAprobacionEspec = requerimientoSeleccionado?.requiereAprobacionEspecificaciones || false;
  const especificacionesAprobadas = requerimientoSeleccionado?.especificacionesAprobadas || false;
  const puedeGenerarOC = !requiereAprobacionEspec || especificacionesAprobadas;

  // Items seleccionados para la OC
  const items = useMemo(() => {
    return itemsSeleccionables
      .filter(item => item.seleccionado)
      .map(item => ({
        id: `oc-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        purchaseRequestItemId: item.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidad,
        precioUnitario: item.precioUnitario,
        total: item.total,
      }));
  }, [itemsSeleccionables]);

  // Obtener cantidad ya asignada a OCs para cada item del requerimiento
  const getCantidadesAsignadas = (reqId: string): Map<string, number> => {
    const cantidadesAsignadas = new Map<string, number>();
    ordenesCompraExistentes
      .filter(oc => oc.requerimientoId === reqId)
      .forEach(oc => {
        oc.items.forEach(item => {
          if (item.purchaseRequestItemId) {
            const cantidadActual = cantidadesAsignadas.get(item.purchaseRequestItemId) || 0;
            cantidadesAsignadas.set(item.purchaseRequestItemId, cantidadActual + item.cantidad);
          }
        });
      });
    return cantidadesAsignadas;
  };

  // Cargar items del requerimiento con cantidad pendiente
  const handleRequerimientoChange = (id: string) => {
    setRequerimientoId(id);
    const req = requerimientosAprobados.find(r => r.id === id);
    if (req) {
      const cantidadesAsignadas = getCantidadesAsignadas(id);
      setItemsSeleccionables(req.items.map(item => {
        const cantidadAsignada = cantidadesAsignadas.get(item.id) || 0;
        const cantidadPendiente = Math.max(0, item.cantidad - cantidadAsignada);
        const tieneOCCompleta = cantidadPendiente <= 0;

        return {
          id: item.id,
          descripcion: item.descripcion,
          cantidad: cantidadPendiente, // Mostrar solo la cantidad pendiente
          cantidadOriginal: item.cantidad, // Guardar la cantidad original para referencia
          cantidadAsignada: cantidadAsignada, // Cantidad ya en OCs
          unidad: item.unidad,
          precioUnitario: item.precioUnitario,
          total: cantidadPendiente * item.precioUnitario,
          seleccionado: !tieneOCCompleta && cantidadPendiente > 0,
          tieneOC: tieneOCCompleta,
        };
      }));
    } else {
      setItemsSeleccionables([]);
    }
  };

  // Toggle selección de item
  const toggleItemSeleccion = (itemId: string) => {
    setItemsSeleccionables(prev => prev.map(item =>
      item.id === itemId && !item.tieneOC
        ? { ...item, seleccionado: !item.seleccionado }
        : item
    ));
  };

  // Actualizar cantidad o precio de un item
  const handleItemChange = (itemId: string, field: 'cantidad' | 'precioUnitario', value: number) => {
    setItemsSeleccionables(prev => prev.map(item => {
      if (item.id !== itemId || item.tieneOC) return item;
      const updated = { ...item, [field]: value };
      updated.total = updated.cantidad * updated.precioUnitario;
      return updated;
    }));
  };

  // Seleccionar/deseleccionar todos los items disponibles
  const toggleTodosLosItems = () => {
    const itemsDisponibles = itemsSeleccionables.filter(i => !i.tieneOC);
    const todosSeleccionados = itemsDisponibles.every(i => i.seleccionado);
    setItemsSeleccionables(prev => prev.map(item =>
      !item.tieneOC
        ? { ...item, seleccionado: !todosSeleccionados }
        : item
    ));
  };

  // Contadores de items
  const itemsDisponibles = itemsSeleccionables.filter(i => !i.tieneOC);
  const itemsSeleccionados = itemsSeleccionables.filter(i => i.seleccionado);

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const impuestos = 0; // OC sin impuestos
  const total = subtotal;

  const handleSubmit = () => {
    if (!requerimientoId || !proveedorId || items.length === 0) {
      toast.error('Seleccione un requerimiento, proveedor y al menos un item');
      return;
    }

    if (!puedeGenerarOC) {
      toast.error('No se puede generar la OC: las especificaciones técnicas aún no han sido aprobadas');
      return;
    }

    const nuevaOC: Omit<OrdenCompra, 'id' | 'numero'> = {
      requerimientoId,
      proveedorId,
      proveedor: proveedorSeleccionado!,
      items,
      subtotal,
      impuestos,
      total,
      moneda: requerimientoSeleccionado?.moneda || 'ARS',
      condicionPago,
      lugarEntrega,
      observaciones,
      fechaEmision: new Date(),
      fechaEntregaEstimada: fechaEntrega ? new Date(fechaEntrega) : undefined,
      estado: 'PENDIENTE_APROBACION',
      creadoPorId: usuarioActual.id,
      creadoPor: usuarioActual,
    };

    onCrear(nuevaOC);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Nueva Orden de Compra</h2>
            <p className="text-sm text-text-secondary">Generar OC desde un requerimiento aprobado</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Seleccion de Requerimiento */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Requerimiento Aprobado <span className="text-red-500">*</span>
            </label>
            <select
              value={requerimientoId}
              onChange={(e) => handleRequerimientoChange(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
            >
              <option value="">Seleccione un requerimiento...</option>
              {requerimientosAprobados.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.numero} - {req.titulo} ({formatMonto(req.montoEstimado, req.moneda)})
                </option>
              ))}
            </select>
          </div>

          {requerimientoSeleccionado && (
            <>
              {/* Alerta si requiere aprobación de especificaciones */}
              {requiereAprobacionEspec && (
                <div className={`rounded-lg p-4 flex items-start gap-3 ${
                  especificacionesAprobadas
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  {especificacionesAprobadas ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Especificaciones técnicas aprobadas
                        </p>
                        <p className="text-xs text-green-600 mt-0.5">
                          Este requerimiento tiene sus especificaciones aprobadas y puede generar OC
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          Especificaciones técnicas pendientes de aprobación
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          No se puede generar la OC hasta que las especificaciones sean aprobadas
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Info del requerimiento */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-text-primary mb-2">Detalle del Requerimiento</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-text-secondary">Solicitante</p>
                    <p className="font-medium">{requerimientoSeleccionado.solicitante.nombre}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Departamento</p>
                    <p className="font-medium">{requerimientoSeleccionado.departamento}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Centro de Costos</p>
                    <p className="font-medium">{requerimientoSeleccionado.centroCostos}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary">Fecha Necesaria</p>
                    <p className="font-medium">
                      {requerimientoSeleccionado.fechaNecesaria
                        ? formatFecha(requerimientoSeleccionado.fechaNecesaria)
                        : 'No especificada'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Seleccion de Proveedor */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Proveedor <span className="text-red-500">*</span>
                </label>
                <ProveedorSelector
                  proveedores={proveedores}
                  value={proveedorId}
                  onChange={setProveedorId}
                  placeholder="Buscar proveedor por nombre, ID o CUIT..."
                />
              </div>

              {proveedorSeleccionado && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Datos del Proveedor
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600">Direccion</p>
                      <p className="font-medium text-blue-900">{proveedorSeleccionado.direccion || '-'}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Telefono</p>
                      <p className="font-medium text-blue-900">{proveedorSeleccionado.telefono || '-'}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Contacto</p>
                      <p className="font-medium text-blue-900">{proveedorSeleccionado.contacto || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Condiciones */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Condicion de Pago
                  </label>
                  <select
                    value={condicionPago}
                    onChange={(e) => setCondicionPago(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                  >
                    <option value="Contado">Contado</option>
                    <option value="15 días">15 días</option>
                    <option value="30 días">30 días</option>
                    <option value="45 días">45 días</option>
                    <option value="60 días">60 días</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Fecha Entrega Estimada
                  </label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Lugar de Entrega
                  </label>
                  <input
                    type="text"
                    value={lugarEntrega}
                    onChange={(e) => setLugarEntrega(e.target.value)}
                    placeholder="Ej: Oficina Central"
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                  />
                </div>
              </div>

              {/* Items con selección */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text-primary">
                    Items del Requerimiento <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-secondary">
                      {itemsSeleccionados.length} de {itemsDisponibles.length} disponibles seleccionados
                    </span>
                    {itemsDisponibles.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleTodosLosItems}
                        className="text-palette-purple hover:underline text-xs"
                      >
                        {itemsSeleccionados.length === itemsDisponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Alerta de items con OC existente */}
                {itemsSeleccionables.some(i => i.tieneOC || (i.cantidadAsignada && i.cantidadAsignada > 0)) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 flex items-start gap-2">
                    <FileCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700">
                      Este requerimiento ya tiene OCs generadas. Se muestra solo la cantidad pendiente de cada item.
                      Los items con cantidad completa aparecen deshabilitados.
                    </p>
                  </div>
                )}

                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary uppercase w-12">
                          <input
                            type="checkbox"
                            checked={itemsDisponibles.length > 0 && itemsSeleccionados.length === itemsDisponibles.length}
                            onChange={toggleTodosLosItems}
                            disabled={itemsDisponibles.length === 0}
                            className="w-4 h-4 text-palette-purple rounded border-gray-300 focus:ring-palette-purple"
                          />
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Descripcion</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-20">Cant.</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-20">Unidad</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase w-28">P. Unit.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase w-28">Total</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-20">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {itemsSeleccionables.map((item) => (
                        <tr
                          key={item.id}
                          className={`${item.tieneOC ? 'bg-gray-50 opacity-60' : item.seleccionado ? 'bg-green-50' : ''}`}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={item.seleccionado}
                              onChange={() => toggleItemSeleccion(item.id)}
                              disabled={item.tieneOC}
                              className="w-4 h-4 text-palette-purple rounded border-gray-300 focus:ring-palette-purple disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm">{item.descripcion}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.cantidad}
                              onChange={(e) => handleItemChange(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                              disabled={item.tieneOC}
                              className="w-full px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple text-sm text-center disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-center">{item.unidad}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.precioUnitario}
                              onChange={(e) => handleItemChange(item.id, 'precioUnitario', parseFloat(e.target.value) || 0)}
                              disabled={item.tieneOC}
                              className="w-full px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple text-sm text-right disabled:bg-gray-100 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{formatMonto(item.total)}</td>
                          <td className="px-4 py-2 text-center">
                            {item.tieneOC ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <FileCheck className="w-3 h-3 mr-1" />
                                Completo
                              </span>
                            ) : item.cantidadAsignada && item.cantidadAsignada > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700" title={`${item.cantidadAsignada} de ${item.cantidadOriginal} ya asignados`}>
                                Parcial ({item.cantidadAsignada}/{item.cantidadOriginal})
                              </span>
                            ) : item.seleccionado ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Incluido
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                Disponible
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-right text-sm font-medium">Subtotal seleccionado:</td>
                          <td className="px-4 py-2 text-right text-sm font-medium">{formatMonto(subtotal)}</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-right text-sm font-medium">IVA (21%):</td>
                          <td className="px-4 py-2 text-right text-sm font-medium">{formatMonto(impuestos)}</td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-right text-sm font-bold">Total OC:</td>
                          <td className="px-4 py-2 text-right text-sm font-bold text-palette-purple">{formatMonto(total)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
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
                  placeholder="Observaciones adicionales para el proveedor..."
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!requerimientoId || !proveedorId || items.length === 0 || !puedeGenerarOC}
            title={!puedeGenerarOC ? 'Las especificaciones técnicas deben ser aprobadas primero' : ''}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Generar OC
          </Button>
        </div>
      </div>
    </div>
  );
}

// Modal para ver detalle de OC
function DetalleOCModal({
  isOpen,
  onClose,
  ordenCompra,
}: {
  isOpen: boolean;
  onClose: () => void;
  ordenCompra: OrdenCompra | null;
}) {
  if (!isOpen || !ordenCompra) return null;

  const estadoConfig = estadosOC.find(e => e.id === ordenCompra.estado);
  const Icon = estadoConfig?.icon || Clock;

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

export default function OrdenesCompraPage() {
  const router = useRouter();
  const { ordenesCompra, requerimientos, proveedores, agregarOrdenCompra, usuarioActual } = useCompras();
  const { isSupplier, supplierId, loading: supplierLoading } = useSupplier();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [showNuevaOCModal, setShowNuevaOCModal] = useState(false);
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null);

  // Hook para el modal de circuito de compra
  const circuitoModal = useCircuitoCompraModal();

  // Requerimientos disponibles para generar OC (aprobados o con OC parcial)
  // Excluir los que tienen RFQ activa (deben generar OC desde la RFQ adjudicada)
  const requerimientosAprobados = useMemo(() => {
    return requerimientos.filter(r => {
      // Incluir APROBADO y OC_GENERADA para permitir OCs parciales
      if (r.estado !== 'APROBADO' && r.estado !== 'OC_GENERADA') return false;

      // Excluir si tiene RFQ activa (no cancelada/cerrada)
      // Los requerimientos con RFQ deben generar OC desde la RFQ adjudicada
      if (r.tieneRFQ) {
        const rfqActivas = r.quotationRequests?.filter((rfq: any) =>
          !['CANCELLED', 'CLOSED'].includes(rfq.status)
        );
        if (rfqActivas && rfqActivas.length > 0) {
          return false;
        }
      }

      // Verificar si aún tiene items sin OC
      const itemsConOC = new Set<string>();
      ordenesCompra
        .filter(oc => oc.requerimientoId === r.id)
        .forEach(oc => {
          oc.items.forEach(item => {
            if (item.purchaseRequestItemId) {
              itemsConOC.add(item.purchaseRequestItemId);
            }
          });
        });

      // Solo incluir si tiene al menos un item sin OC
      const tieneItemsSinOC = r.items.some(item => !itemsConOC.has(item.id));
      return tieneItemsSinOC;
    });
  }, [requerimientos, ordenesCompra]);

  // Filtrar OC (si es proveedor, solo ver las suyas)
  const ordenesCompraFiltradas = useMemo(() => {
    return ordenesCompra.filter((oc) => {
      // Si es proveedor, solo mostrar OCs donde él es el proveedor
      if (isSupplier && supplierId) {
        if (oc.proveedorId !== supplierId) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchNumero = oc.numero.toLowerCase().includes(query);
        const matchProveedor = oc.proveedor.nombre.toLowerCase().includes(query);
        if (!matchNumero && !matchProveedor) return false;
      }
      if (filtroEstado && oc.estado !== filtroEstado) return false;
      return true;
    });
  }, [ordenesCompra, searchQuery, filtroEstado, isSupplier, supplierId]);

  // Calcular progreso de recepción para una OC
  const calcularProgresoRecepcion = (oc: OrdenCompra) => {
    const totalSolicitado = oc.items.reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
    const totalRecibido = oc.items.reduce((sum, item) => sum + Number(item.cantidadRecibida || 0), 0);
    const porcentajeCalculado = totalSolicitado > 0 ? Math.round((totalRecibido / totalSolicitado) * 100) : 0;
    return {
      porcentaje: Math.min(porcentajeCalculado, 100), // Nunca mostrar más de 100%
      recibido: Math.round(totalRecibido * 100) / 100, // Redondear a 2 decimales
      total: Math.round(totalSolicitado * 100) / 100,
    };
  };

  const [creandoOC, setCreandoOC] = useState(false);

  const handleCrearOC = async (ocData: Omit<OrdenCompra, 'id' | 'numero'>) => {
    setCreandoOC(true);
    try {
      const result = await agregarOrdenCompra(ocData);
      if (result) {
        console.log('OC creada exitosamente:', result.numero);
        toast.success(`Orden de compra ${result.numero} creada exitosamente`);
      } else {
        toast.error('Error al crear la orden de compra');
      }
    } catch (error: any) {
      console.error('Error creando OC:', error);
      toast.error(error.message || 'Error al crear la orden de compra');
    } finally {
      setCreandoOC(false);
    }
  };

  // Loading state mientras se verifica si es proveedor
  if (supplierLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-palette-purple"></div>
      </div>
    );
  }

  // Verificar permisos (permitir proveedores para ver sus OCs)
  const tieneAcceso = usuarioActual.rol === 'APROBADOR' || usuarioActual.rol === 'ADMIN' || isSupplier;
  if (!tieneAcceso) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-border p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary font-medium">
            No tienes permisos para acceder a esta seccion
          </p>
          <p className="text-text-secondary text-sm mt-2">
            Solo los aprobadores pueden gestionar ordenes de compra
          </p>
          <Button
            onClick={() => router.push('/compras/requerimientos')}
            className="mt-4"
          >
            Ir a Requerimientos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={isSupplier ? "Mis Órdenes de Compra" : "Ordenes de Compra"}
        subtitle={isSupplier
          ? `${ordenesCompraFiltradas.length} orden${ordenesCompraFiltradas.length !== 1 ? 'es' : ''} recibida${ordenesCompraFiltradas.length !== 1 ? 's' : ''}`
          : `${ordenesCompra.length} orden${ordenesCompra.length !== 1 ? 'es' : ''} en total`
        }
        icon={ShoppingCart}
        action={
          !isSupplier && (
            <Button onClick={() => setShowNuevaOCModal(true)} disabled={requerimientosAprobados.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva OC
            </Button>
          )
        }
      />

      {/* Info si hay requerimientos aprobados (solo para compradores) */}
      {!isSupplier && requerimientosAprobados.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                {requerimientosAprobados.length} requerimiento{requerimientosAprobados.length !== 1 ? 's' : ''} aprobado{requerimientosAprobados.length !== 1 ? 's' : ''} disponible{requerimientosAprobados.length !== 1 ? 's' : ''} para generar OC
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
              {requerimientosAprobados.length > 0
                ? 'Genera una OC desde un requerimiento aprobado'
                : 'Aprueba requerimientos para generar ordenes de compra'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Numero</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Titulo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Proveedor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Creado Por</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Recepcion</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Prioridad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ordenesCompraFiltradas.map((oc) => {
                  const estadoConfig = estadosOC.find(e => e.id === oc.estado);
                  const Icon = estadoConfig?.icon || Clock;
                  const prioridadBadge = getPrioridadBadge(oc.requerimiento?.prioridad);
                  const progreso = calcularProgresoRecepcion(oc);
                  return (
                    <tr key={oc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-palette-purple">{oc.numero}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{oc.requerimiento?.titulo || '-'}</p>
                        <p className="text-xs text-text-secondary">{oc.requerimiento?.numero || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-text-primary">{oc.proveedor.nombre}</p>
                        {oc.proveedor.cuit && !oc.proveedor.cuit.startsWith('TEMP-') && (
                          <p className="text-xs text-text-secondary">CUIT: {oc.proveedor.cuit}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {oc.creadoPor?.nombre || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoConfig?.color}`}>
                          <Icon className="w-3 h-3" />
                          {estadoConfig?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-16">
                          <div className="flex items-center justify-center text-xs mb-1">
                            <span className={`font-medium ${
                              progreso.porcentaje === 100 ? 'text-green-600' :
                              progreso.porcentaje > 0 ? 'text-orange-600' :
                              'text-gray-500'
                            }`}>
                              {progreso.porcentaje}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prioridadBadge.className}`}>
                          {prioridadBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {oc.requerimiento?.categoria || '-'}
                      </td>
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
                          <button
                            onClick={() => circuitoModal.openFromOrdenCompra(oc.id)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Ver circuito de compra"
                          >
                            <GitBranch className="w-4 h-4" />
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

      {/* Modales */}
      <NuevaOCModal
        isOpen={showNuevaOCModal}
        onClose={() => setShowNuevaOCModal(false)}
        requerimientosAprobados={requerimientosAprobados}
        proveedores={proveedores}
        onCrear={handleCrearOC}
        ordenesCompraExistentes={ordenesCompra}
      />

      <DetalleOCModal
        isOpen={!!selectedOC}
        onClose={() => setSelectedOC(null)}
        ordenCompra={selectedOC}
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
