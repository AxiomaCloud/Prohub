'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupplier } from '@/hooks/useSupplier';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  ShoppingCart,
  Eye,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  Package,
  Calendar,
  DollarSign,
  Loader2,
  X,
  AlertCircle,
  Check,
  FileUp,
  Search,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { DocumentChatDrawer } from '@/components/chat/DocumentChatDrawer';

interface OrdenCompra {
  id: string;
  numero: string;
  estado: string;
  total: number;
  moneda: string;
  fechaEmision: string;
  fechaEntregaEstimada?: string;
  condicionPago?: string;
  items: {
    id: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    precioUnitario: number;
    total: number;
  }[];
  facturas?: {
    id: string;
    numero: string;
    estado: string;
  }[];
}

interface FacturaParseada {
  numero: string;
  fecha: string;
  subtotal: number;
  iva: number;
  total: number;
  items: {
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
    matchedItemId?: string;
    matchScore?: number;
  }[];
}

interface MatchResult {
  ocItemId: string;
  ocDescripcion: string;
  ocCantidad: number;
  ocPrecio: number;
  facturaDescripcion: string;
  facturaCantidad: number;
  facturaPrecio: number;
  matchScore: number;
  diferenciaCantidad: number;
  diferenciaPrecio: number;
  aprobado: boolean;
}

const estadosOC: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDIENTE_APROBACION: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  APROBADA: { label: 'Aprobada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-blue-100 text-blue-700', icon: Package },
  ENTREGADA: { label: 'Entregada', color: 'bg-teal-100 text-teal-700', icon: Package },
  FINALIZADA: { label: 'Finalizada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
};

function formatMonto(monto: number, moneda: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);
}

function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return '-';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(fecha));
  } catch {
    return '-';
  }
}

export default function MisOrdenesPage() {
  const router = useRouter();
  const { isSupplier, supplierId, loading: supplierLoading } = useSupplier();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de detalle/cargar factura
  const [selectedOC, setSelectedOC] = useState<OrdenCompra | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Estado para chat
  const [chatOC, setChatOC] = useState<OrdenCompra | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [facturaParseada, setFacturaParseada] = useState<FacturaParseada | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (!supplierLoading && isSupplier && supplierId) {
      fetchOrdenes();
    } else if (!supplierLoading && !isSupplier) {
      setLoading(false);
    }
  }, [supplierLoading, isSupplier, supplierId]);

  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/suppliers/me/ordenes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrdenes(data.ordenes || []);
      } else {
        toast.error('Error al cargar órdenes de compra');
      }
    } catch (error) {
      console.error('Error fetching ordenes:', error);
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFacturaFile(file);
    setParsing(true);
    setFacturaParseada(null);
    setMatchResults([]);

    try {
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      // Parsear la factura
      const response = await fetch(`${API_URL}/api/documents/parse`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();

        // Construir factura parseada
        const factura: FacturaParseada = {
          numero: data.invoiceNumber || data.numero || '',
          fecha: data.invoiceDate || data.fecha || new Date().toISOString(),
          subtotal: data.subtotal || 0,
          iva: data.iva || data.tax || 0,
          total: data.total || 0,
          items: data.items || [],
        };

        setFacturaParseada(factura);

        // Hacer matching con items de la OC
        if (selectedOC) {
          const matches = matchItems(selectedOC.items, factura.items);
          setMatchResults(matches);
        }

        toast.success('Factura analizada correctamente');
      } else {
        toast.error('Error al analizar la factura');
      }
    } catch (error) {
      console.error('Error parsing factura:', error);
      toast.error('Error al procesar la factura');
    } finally {
      setParsing(false);
    }
  };

  // Función para hacer matching entre items de OC y factura
  const matchItems = (ocItems: OrdenCompra['items'], facturaItems: FacturaParseada['items']): MatchResult[] => {
    const results: MatchResult[] = [];

    ocItems.forEach(ocItem => {
      // Buscar el mejor match en la factura
      let bestMatch = {
        item: facturaItems[0],
        score: 0,
        index: 0,
      };

      facturaItems.forEach((factItem, index) => {
        // Calcular score de similitud
        const descScore = calculateSimilarity(
          ocItem.descripcion.toLowerCase(),
          factItem.descripcion.toLowerCase()
        );
        const cantidadMatch = ocItem.cantidad === factItem.cantidad ? 0.3 : 0;
        const precioMatch = Math.abs(ocItem.precioUnitario - factItem.precioUnitario) < 1 ? 0.2 : 0;

        const totalScore = descScore * 0.5 + cantidadMatch + precioMatch;

        if (totalScore > bestMatch.score) {
          bestMatch = { item: factItem, score: totalScore, index };
        }
      });

      results.push({
        ocItemId: ocItem.id,
        ocDescripcion: ocItem.descripcion,
        ocCantidad: ocItem.cantidad,
        ocPrecio: ocItem.precioUnitario,
        facturaDescripcion: bestMatch.item?.descripcion || '',
        facturaCantidad: bestMatch.item?.cantidad || 0,
        facturaPrecio: bestMatch.item?.precioUnitario || 0,
        matchScore: bestMatch.score,
        diferenciaCantidad: (bestMatch.item?.cantidad || 0) - ocItem.cantidad,
        diferenciaPrecio: (bestMatch.item?.precioUnitario || 0) - ocItem.precioUnitario,
        aprobado: bestMatch.score > 0.5,
      });
    });

    return results;
  };

  // Función simple de similitud de strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    let matches = 0;

    words1.forEach(w1 => {
      if (words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
        matches++;
      }
    });

    return matches / Math.max(words1.length, words2.length);
  };

  const handleSaveFactura = async () => {
    if (!selectedOC || !facturaParseada || !facturaFile) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('hub_token') || localStorage.getItem('token');

      // Primero subir el archivo
      const formData = new FormData();
      formData.append('file', facturaFile);
      formData.append('ordenCompraId', selectedOC.id);
      formData.append('numero', facturaParseada.numero);
      formData.append('fecha', facturaParseada.fecha);
      formData.append('subtotal', String(facturaParseada.subtotal));
      formData.append('iva', String(facturaParseada.iva));
      formData.append('total', String(facturaParseada.total));
      formData.append('items', JSON.stringify(matchResults));

      const response = await fetch(`${API_URL}/api/suppliers/me/facturas`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success('Factura guardada correctamente');
        setShowUploadModal(false);
        setSelectedOC(null);
        setFacturaParseada(null);
        setMatchResults([]);
        setFacturaFile(null);
        fetchOrdenes();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar la factura');
      }
    } catch (error) {
      console.error('Error saving factura:', error);
      toast.error('Error al guardar la factura');
    } finally {
      setSaving(false);
    }
  };

  const toggleMatchAprobado = (index: number) => {
    setMatchResults(prev => prev.map((m, i) =>
      i === index ? { ...m, aprobado: !m.aprobado } : m
    ));
  };

  // Actualizar campos editables del match
  const updateMatchField = (index: number, field: keyof MatchResult, value: any) => {
    setMatchResults(prev => prev.map((m, i) => {
      if (i !== index) return m;

      const updated = { ...m, [field]: value };

      // Recalcular diferencias si cambian cantidad o precio
      if (field === 'facturaCantidad') {
        updated.diferenciaCantidad = value - m.ocCantidad;
      }
      if (field === 'facturaPrecio') {
        updated.diferenciaPrecio = value - m.ocPrecio;
      }

      return updated;
    }));
  };

  const filteredOrdenes = ordenes.filter(oc => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return oc.numero.toLowerCase().includes(query);
  });

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
          <ShoppingCart className="w-12 h-12 text-text-secondary mx-auto mb-4" />
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
        title="Mis Órdenes de Compra"
        subtitle={`${ordenes.length} orden${ordenes.length !== 1 ? 'es' : ''} recibida${ordenes.length !== 1 ? 's' : ''}`}
        icon={ShoppingCart}
      />

      {/* Buscador */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número de OC..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
          />
        </div>
      </div>

      {/* Lista de órdenes */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {filteredOrdenes.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            <p className="text-text-primary font-medium">No hay órdenes de compra</p>
            <p className="text-text-secondary text-sm mt-2">
              Las órdenes de compra que recibas aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Facturas</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrdenes.map((oc) => {
                  const estadoConfig = estadosOC[oc.estado] || estadosOC.PENDIENTE_APROBACION;
                  const Icon = estadoConfig.icon;
                  return (
                    <tr key={oc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-palette-purple">{oc.numero}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatFecha(oc.fechaEmision)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.color}`}>
                          <Icon className="w-3 h-3" />
                          {estadoConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {oc.items.length} items
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right">
                        {formatMonto(oc.total, oc.moneda)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {oc.facturas && oc.facturas.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            {oc.facturas.length}
                          </span>
                        ) : (
                          <span className="text-xs text-text-secondary">-</span>
                        )}
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
                            onClick={() => setChatOC(oc)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Chat"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOC(oc);
                              setShowUploadModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Cargar factura"
                          >
                            <Upload className="w-4 h-4" />
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

      {/* Modal de detalle de OC */}
      {selectedOC && !showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">{selectedOC.numero}</h3>
                <p className="text-sm text-text-secondary">Orden de Compra</p>
              </div>
              <button
                onClick={() => setSelectedOC(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Info general */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-text-secondary">Fecha Emisión</p>
                  <p className="text-sm font-medium">{formatFecha(selectedOC.fechaEmision)}</p>
                </div>
                {selectedOC.fechaEntregaEstimada && (
                  <div>
                    <p className="text-xs text-text-secondary">Entrega Estimada</p>
                    <p className="text-sm font-medium">{formatFecha(selectedOC.fechaEntregaEstimada)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-text-secondary">Condición de Pago</p>
                  <p className="text-sm font-medium">{selectedOC.condicionPago || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Total</p>
                  <p className="text-sm font-bold text-palette-purple">{formatMonto(selectedOC.total, selectedOC.moneda)}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium text-text-primary mb-2">Items</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary">Descripción</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-text-secondary">Cantidad</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">P. Unit.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-text-secondary">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedOC.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm">{item.descripcion}</td>
                          <td className="px-4 py-2 text-sm text-center">{item.cantidad} {item.unidad}</td>
                          <td className="px-4 py-2 text-sm text-right">{formatMonto(item.precioUnitario)}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">{formatMonto(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setChatOC(selectedOC);
                  setSelectedOC(null);
                }}
                className="inline-flex items-center justify-center px-4 py-2 border border-purple-300 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </button>
              <Button variant="outline" onClick={() => setSelectedOC(null)}>
                Cerrar
              </Button>
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Cargar Factura
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de carga de factura */}
      {showUploadModal && selectedOC && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Cargar Factura</h3>
                <p className="text-sm text-text-secondary">OC: {selectedOC.numero}</p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setFacturaParseada(null);
                  setMatchResults([]);
                  setFacturaFile(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Mensaje informativo sobre extracción con Axio */}
              {!facturaParseada && !parsing && (
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Bot className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Extracción inteligente con Axio
                    </p>
                    <p className="text-xs text-text-secondary">
                      Los datos de la factura se extraerán automáticamente para tu revisión
                    </p>
                  </div>
                </div>
              )}

              {/* Área de carga */}
              {!facturaParseada && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="factura-upload"
                    disabled={parsing}
                  />
                  <label
                    htmlFor="factura-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {parsing ? (
                      <>
                        <Loader2 className="w-12 h-12 text-palette-purple animate-spin mb-4" />
                        <p className="text-text-primary font-medium">Analizando factura...</p>
                        <p className="text-sm text-text-secondary mt-1">
                          Extrayendo datos con Axio
                        </p>
                      </>
                    ) : (
                      <>
                        <FileUp className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-text-primary font-medium">
                          Arrastra o haz clic para subir la factura
                        </p>
                        <p className="text-sm text-text-secondary mt-1">
                          PDF, JPG o PNG (máx. 10MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* Datos extraídos y matching */}
              {facturaParseada && (
                <>
                  {/* Info de la factura */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-3">Datos extraídos de la factura (editables)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <p className="text-blue-600 text-xs mb-1">Número</p>
                        <input
                          type="text"
                          value={facturaParseada.numero}
                          onChange={(e) => setFacturaParseada({ ...facturaParseada, numero: e.target.value })}
                          className="w-full px-2 py-1.5 border border-blue-200 rounded bg-white text-blue-900 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-blue-600 text-xs mb-1">Fecha</p>
                        <input
                          type="date"
                          value={facturaParseada.fecha.split('T')[0]}
                          onChange={(e) => setFacturaParseada({ ...facturaParseada, fecha: e.target.value })}
                          className="w-full px-2 py-1.5 border border-blue-200 rounded bg-white text-blue-900 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-blue-600 text-xs mb-1">Subtotal</p>
                        <input
                          type="number"
                          step="0.01"
                          value={facturaParseada.subtotal}
                          onChange={(e) => {
                            const subtotal = parseFloat(e.target.value) || 0;
                            setFacturaParseada({
                              ...facturaParseada,
                              subtotal,
                              total: subtotal + facturaParseada.iva
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-blue-200 rounded bg-white text-blue-900 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-blue-600 text-xs mb-1">IVA</p>
                        <input
                          type="number"
                          step="0.01"
                          value={facturaParseada.iva}
                          onChange={(e) => {
                            const iva = parseFloat(e.target.value) || 0;
                            setFacturaParseada({
                              ...facturaParseada,
                              iva,
                              total: facturaParseada.subtotal + iva
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-blue-200 rounded bg-white text-blue-900 text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-blue-600 text-xs mb-1">Total</p>
                        <input
                          type="number"
                          step="0.01"
                          value={facturaParseada.total}
                          onChange={(e) => setFacturaParseada({ ...facturaParseada, total: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 border border-blue-200 rounded bg-white text-blue-900 text-sm font-semibold"
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="bg-blue-100 rounded px-3 py-1.5 w-full text-center">
                          <p className="text-xs text-blue-600">Diferencia vs OC</p>
                          <p className={`text-sm font-bold ${
                            Math.abs(facturaParseada.total - selectedOC.total) < 0.01
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {formatMonto(facturaParseada.total - selectedOC.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de matching */}
                  <div>
                    <h4 className="font-medium text-text-primary mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Comparación OC vs Factura (datos de factura editables)
                    </h4>
                    <div className="border border-border rounded-lg overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary" colSpan={3}>
                              <span className="text-gray-500">Orden de Compra</span>
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-blue-600 border-l-2 border-blue-200" colSpan={3}>
                              <span>Factura (editable)</span>
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">Match</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">OK</th>
                          </tr>
                          <tr className="bg-gray-100">
                            <th className="px-3 py-1 text-left text-xs font-medium text-text-secondary">Descripción</th>
                            <th className="px-3 py-1 text-center text-xs font-medium text-text-secondary w-20">Cant.</th>
                            <th className="px-3 py-1 text-right text-xs font-medium text-text-secondary w-24">Precio</th>
                            <th className="px-3 py-1 text-left text-xs font-medium text-blue-600 border-l-2 border-blue-200">Descripción</th>
                            <th className="px-3 py-1 text-center text-xs font-medium text-blue-600 w-24">Cant.</th>
                            <th className="px-3 py-1 text-right text-xs font-medium text-blue-600 w-28">Precio</th>
                            <th className="px-3 py-1"></th>
                            <th className="px-3 py-1"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {matchResults.map((match, index) => (
                            <tr key={match.ocItemId} className={match.aprobado ? 'bg-green-50' : 'bg-red-50'}>
                              {/* Datos OC (solo lectura) */}
                              <td className="px-3 py-2 text-xs text-gray-600 max-w-[150px]">
                                <div className="truncate" title={match.ocDescripcion}>{match.ocDescripcion}</div>
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">{match.ocCantidad}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{formatMonto(match.ocPrecio)}</td>

                              {/* Datos Factura (editables) */}
                              <td className="px-3 py-1 border-l-2 border-blue-200">
                                <input
                                  type="text"
                                  value={match.facturaDescripcion}
                                  onChange={(e) => updateMatchField(index, 'facturaDescripcion', e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-blue-200 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                  placeholder="Descripción"
                                />
                              </td>
                              <td className="px-3 py-1">
                                <div className="flex flex-col items-center">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={match.facturaCantidad}
                                    onChange={(e) => updateMatchField(index, 'facturaCantidad', parseFloat(e.target.value) || 0)}
                                    className={`w-20 px-2 py-1 text-xs text-center border rounded bg-white focus:ring-1 focus:outline-none ${
                                      match.diferenciaCantidad !== 0
                                        ? 'border-red-300 focus:ring-red-400'
                                        : 'border-blue-200 focus:ring-blue-400'
                                    }`}
                                  />
                                  {match.diferenciaCantidad !== 0 && (
                                    <span className="text-xs text-red-600 mt-0.5">
                                      {match.diferenciaCantidad > 0 ? '+' : ''}{match.diferenciaCantidad}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-1">
                                <div className="flex flex-col items-end">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={match.facturaPrecio}
                                    onChange={(e) => updateMatchField(index, 'facturaPrecio', parseFloat(e.target.value) || 0)}
                                    className={`w-24 px-2 py-1 text-xs text-right border rounded bg-white focus:ring-1 focus:outline-none ${
                                      match.diferenciaPrecio !== 0
                                        ? 'border-red-300 focus:ring-red-400'
                                        : 'border-blue-200 focus:ring-blue-400'
                                    }`}
                                  />
                                  {match.diferenciaPrecio !== 0 && (
                                    <span className="text-xs text-red-600 mt-0.5">
                                      {formatMonto(match.diferenciaPrecio)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-block w-12 text-center px-1 py-0.5 rounded text-xs font-medium ${
                                  match.matchScore > 0.7 ? 'bg-green-100 text-green-700' :
                                  match.matchScore > 0.4 ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {Math.round(match.matchScore * 100)}%
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => toggleMatchAprobado(index)}
                                  className={`p-1.5 rounded transition-colors ${
                                    match.aprobado
                                      ? 'text-green-600 bg-green-100 hover:bg-green-200'
                                      : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
                                  }`}
                                  title={match.aprobado ? 'Marcado como correcto' : 'Marcar como correcto'}
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      Puede editar los datos de la factura para corregir errores de extracción. Las diferencias se muestran en rojo.
                    </p>
                  </div>

                  {/* Resumen de diferencias */}
                  {matchResults.some(m => m.diferenciaCantidad !== 0 || m.diferenciaPrecio !== 0) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">
                            Se encontraron diferencias entre la OC y la Factura
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            Revise los items marcados y confirme si los datos son correctos antes de guardar.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadModal(false);
                  setFacturaParseada(null);
                  setMatchResults([]);
                  setFacturaFile(null);
                }}
              >
                Cancelar
              </Button>
              {facturaParseada && (
                <Button onClick={handleSaveFactura} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Guardar Factura
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Drawer */}
      {chatOC && (
        <DocumentChatDrawer
          documentType="purchase-order"
          documentId={chatOC.id}
          documentNumber={`OC ${chatOC.numero}`}
          isOpen={!!chatOC}
          onClose={() => setChatOC(null)}
        />
      )}
    </div>
  );
}
