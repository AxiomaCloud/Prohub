'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCompras } from '@/lib/compras-context';
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
  Filter
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
  { id: 'PENDIENTE', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  { id: 'EN_PROCESO', label: 'En Proceso', color: 'bg-blue-100 text-blue-700', icon: Truck },
  { id: 'ENTREGADA', label: 'Entregada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
];

// Modal para crear nueva OC
function NuevaOCModal({
  isOpen,
  onClose,
  requerimientosAprobados,
  proveedores,
  onCrear,
}: {
  isOpen: boolean;
  onClose: () => void;
  requerimientosAprobados: Requerimiento[];
  proveedores: Proveedor[];
  onCrear: (oc: OrdenCompra) => void;
}) {
  const { usuarioActual } = useCompras();
  const [requerimientoId, setRequerimientoId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [condicionPago, setCondicionPago] = useState('30 días');
  const [lugarEntrega, setLugarEntrega] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<ItemOC[]>([]);

  const requerimientoSeleccionado = requerimientosAprobados.find(r => r.id === requerimientoId);
  const proveedorSeleccionado = proveedores.find(p => p.id === proveedorId);

  // Cargar items del requerimiento
  const handleRequerimientoChange = (id: string) => {
    setRequerimientoId(id);
    const req = requerimientosAprobados.find(r => r.id === id);
    if (req) {
      setItems(req.items.map(item => ({
        ...item,
        id: `oc-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })));
    } else {
      setItems([]);
    }
  };

  const handleItemChange = (index: number, field: keyof ItemOC, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'cantidad' || field === 'precioUnitario') {
      newItems[index].total = newItems[index].cantidad * newItems[index].precioUnitario;
    }
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const impuestos = subtotal * 0.21;
  const total = subtotal + impuestos;

  const handleSubmit = () => {
    if (!requerimientoId || !proveedorId || items.length === 0) {
      alert('Complete todos los campos requeridos');
      return;
    }

    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
    const numero = `OC-${year}-${randomNum}`;

    const nuevaOC: OrdenCompra = {
      id: `oc-${Date.now()}`,
      numero,
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
      estado: 'PENDIENTE',
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
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                >
                  <option value="">Seleccione un proveedor...</option>
                  {proveedores.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.nombre} - CUIT: {prov.cuit}
                    </option>
                  ))}
                </select>
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

              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Items de la Orden
                </label>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Descripcion</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-24">Cant.</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary uppercase w-24">Unidad</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase w-32">P. Unit.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary uppercase w-32">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.descripcion}
                              onChange={(e) => handleItemChange(index, 'descripcion', e.target.value)}
                              className="w-full px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple text-sm text-center"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-center">{item.unidad}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              value={item.precioUnitario}
                              onChange={(e) => handleItemChange(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple text-sm text-right"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium">
                            {formatMonto(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium">Subtotal:</td>
                        <td className="px-4 py-2 text-right text-sm font-medium">{formatMonto(subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium">IVA (21%):</td>
                        <td className="px-4 py-2 text-right text-sm font-medium">{formatMonto(impuestos)}</td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right text-sm font-bold">Total:</td>
                        <td className="px-4 py-2 text-right text-sm font-bold text-palette-purple">{formatMonto(total)}</td>
                      </tr>
                    </tfoot>
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
            disabled={!requerimientoId || !proveedorId || items.length === 0}
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

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [showNuevaOCModal, setShowNuevaOCModal] = useState(false);
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null);

  // Requerimientos aprobados disponibles para generar OC
  const requerimientosAprobados = useMemo(() => {
    return requerimientos.filter(r => r.estado === 'APROBADO');
  }, [requerimientos]);

  // Filtrar OC
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

  const handleCrearOC = (oc: OrdenCompra) => {
    agregarOrdenCompra(oc);
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
        title="Ordenes de Compra"
        subtitle={`${ordenesCompra.length} orden${ordenesCompra.length !== 1 ? 'es' : ''} en total`}
        action={
          <Button onClick={() => setShowNuevaOCModal(true)} disabled={requerimientosAprobados.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva OC
          </Button>
        }
      />

      {/* Info si hay requerimientos aprobados */}
      {requerimientosAprobados.length > 0 && (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Proveedor</th>
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
                      <td className="px-4 py-3 text-sm text-text-secondary">{formatFecha(oc.fechaEmision)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary text-right">
                        {formatMonto(oc.total, oc.moneda)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setSelectedOC(oc)}
                            className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
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
      />

      <DetalleOCModal
        isOpen={!!selectedOC}
        onClose={() => setSelectedOC(null)}
        ordenCompra={selectedOC}
      />
    </div>
  );
}
