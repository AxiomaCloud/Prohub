'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeft,
  FileSearch,
  Calendar,
  Building2,
  Package,
  Clock,
  CheckCircle,
  Send,
  Save,
  AlertCircle,
  Info,
  DollarSign,
  Truck,
  FileText,
  Award,
  XCircle,
  Edit3,
  Eye,
} from 'lucide-react';

interface RFQItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  specifications?: string;
}

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
  budget?: number;
  items: RFQItem[];
  tenant: {
    id: string;
    name: string;
  };
}

interface QuotationItem {
  id?: string;
  requestItemId: string;
  unitPrice: string;
  quantity: string;
  brand?: string;
  model?: string;
  notes?: string;
}

interface MyQuotation {
  id: string;
  number: string;
  status: string;
  deliveryDays?: number;
  paymentTerms?: string;
  validUntil?: string;
  notes?: string;
  totalAmount: number;
  items: Array<{
    id: string;
    quotationRequestItemId: string;
    unitPrice: number;
    quantity: number;
    brand?: string;
    model?: string;
    notes?: string;
  }>;
}

// Estados del RFQ
const estadosRFQ: Record<string, { label: string; color: string; description: string }> = {
  PUBLISHED: { label: 'Abierta', color: 'bg-blue-100 text-blue-700', description: 'Puedes enviar tu cotizacion' },
  IN_QUOTATION: { label: 'En Cotizacion', color: 'bg-purple-100 text-purple-700', description: 'Puedes actualizar tu cotizacion' },
  EVALUATION: { label: 'En Evaluacion', color: 'bg-orange-100 text-orange-700', description: 'El comprador esta evaluando las cotizaciones' },
  AWARDED: { label: 'Adjudicada', color: 'bg-green-100 text-green-700', description: 'Esta solicitud fue adjudicada' },
  CANCELLED: { label: 'Cancelada', color: 'bg-red-100 text-red-700', description: 'Esta solicitud fue cancelada' },
  CLOSED: { label: 'Cerrada', color: 'bg-gray-100 text-gray-700', description: 'Esta solicitud fue cerrada' },
};

// Estados de mi cotizacion
const estadosCotizacion: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { label: 'Borrador', color: 'bg-gray-100 text-gray-700', icon: Edit3 },
  SUBMITTED: { label: 'Enviada', color: 'bg-blue-100 text-blue-700', icon: Send },
  UNDER_REVIEW: { label: 'En Revision', color: 'bg-purple-100 text-purple-700', icon: Eye },
  ACCEPTED: { label: 'Aceptada', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
  AWARDED: { label: 'Adjudicada', color: 'bg-emerald-100 text-emerald-700', icon: Award },
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto);
}

export default function PortalCotizacionDetallePage() {
  const router = useRouter();
  const params = useParams();
  const rfqId = params.id as string;

  const [rfq, setRfq] = useState<RFQ | null>(null);
  const [myQuotation, setMyQuotation] = useState<MyQuotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estado del formulario
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const fetchRFQ = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/supplier-portal/${rfqId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRfq(data.rfq);
        setMyQuotation(data.myQuotation);

        // Inicializar formulario
        if (data.myQuotation) {
          // Cargar datos existentes
          setDeliveryDays(data.myQuotation.deliveryDays?.toString() || '');
          setPaymentTerms(data.myQuotation.paymentTerms || '');
          setValidUntil(data.myQuotation.validUntil ? data.myQuotation.validUntil.split('T')[0] : '');
          setNotes(data.myQuotation.notes || '');

          // Mapear items existentes
          const existingItems = data.rfq.items.map((item: RFQItem) => {
            const quoted = data.myQuotation.items.find(
              (q: any) => q.quotationRequestItemId === item.id
            );
            return {
              requestItemId: item.id,
              unitPrice: quoted?.unitPrice?.toString() || '',
              quantity: quoted?.quantity?.toString() || item.quantity.toString(),
              brand: quoted?.brand || '',
              model: quoted?.model || '',
              notes: quoted?.notes || '',
            };
          });
          setQuotationItems(existingItems);
        } else {
          // Inicializar items vacios
          const emptyItems = data.rfq.items.map((item: RFQItem) => ({
            requestItemId: item.id,
            unitPrice: '',
            quantity: item.quantity.toString(),
            brand: '',
            model: '',
            notes: '',
          }));
          setQuotationItems(emptyItems);
        }
      } else if (response.status === 401) {
        // Token expirado - limpiar y redirigir a login
        localStorage.removeItem('token');
        localStorage.removeItem('hub_token');
        router.push('/login');
        return;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar la solicitud');
      }
    } catch (err) {
      console.error('Error fetching RFQ:', err);
      setError('Error de conexion');
    } finally {
      setLoading(false);
    }
  }, [rfqId, router]);

  useEffect(() => {
    if (rfqId) {
      fetchRFQ();
    }
  }, [rfqId, fetchRFQ]);

  const updateItemField = (itemId: string, field: keyof QuotationItem, value: string) => {
    setQuotationItems(items =>
      items.map(item =>
        item.requestItemId === itemId
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  // Calcular total
  const calculateTotal = (): number => {
    return quotationItems.reduce((sum, item) => {
      const price = parseFloat(item.unitPrice) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);
  };

  const handleSave = async (submit: boolean) => {
    // Validaciones
    if (submit) {
      const allPricesFilled = quotationItems.every(item => parseFloat(item.unitPrice) > 0);
      if (!allPricesFilled) {
        setError('Debes ingresar el precio de todos los items');
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/supplier-portal/${rfqId}/quotation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: quotationItems.map(item => ({
              requestItemId: item.requestItemId,
              unitPrice: parseFloat(item.unitPrice) || 0,
              quantity: parseFloat(item.quantity) || 0,
              brand: item.brand || null,
              model: item.model || null,
              notes: item.notes || null,
            })),
            deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
            paymentTerms: paymentTerms || null,
            validUntil: validUntil || null,
            notes: notes || null,
            submit,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        setMyQuotation(data.quotation);

        if (submit) {
          // Volver al listado despues de enviar
          setTimeout(() => {
            router.push('/portal/cotizaciones');
          }, 2000);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al guardar');
      }
    } catch (err) {
      console.error('Error saving quotation:', err);
      setError('Error de conexion');
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('¿Estas seguro de que no deseas participar en esta solicitud?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/supplier-portal/${rfqId}/decline`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: 'No participare en esta solicitud',
          }),
        }
      );

      if (response.ok) {
        setSuccess('Has declinado participar en esta solicitud');
        setTimeout(() => {
          router.push('/portal/cotizaciones');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al declinar');
      }
    } catch (err) {
      console.error('Error declining:', err);
      setError('Error de conexion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !rfq) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/portal/cotizaciones')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  if (!rfq) return null;

  const rfqEstado = estadosRFQ[rfq.status] || { label: rfq.status, color: 'bg-gray-100 text-gray-700', description: '' };
  const deadline = new Date(rfq.deadline);
  const diasRestantes = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const vencida = diasRestantes < 0;
  const porVencer = diasRestantes >= 0 && diasRestantes <= 3;
  const puedeCotizar = ['PUBLISHED', 'IN_QUOTATION'].includes(rfq.status) && !vencida;
  const esEditable = puedeCotizar && (!myQuotation || myQuotation.status === 'DRAFT' || myQuotation.status === 'SUBMITTED');

  const miCotEstado = myQuotation
    ? estadosCotizacion[myQuotation.status]
    : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/portal/cotizaciones')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <FileSearch className="w-6 h-6 text-palette-purple" />
              <h1 className="text-2xl font-bold text-text-primary">{rfq.number}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${rfqEstado.color}`}>
                {rfqEstado.label}
              </span>
            </div>
            <p className="text-text-secondary mt-1">{rfq.title}</p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Banner de estado */}
      <div className={`rounded-lg p-4 ${
        myQuotation?.status === 'AWARDED'
          ? 'bg-green-50 border border-green-200'
          : myQuotation?.status === 'REJECTED'
          ? 'bg-red-50 border border-red-200'
          : 'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex items-start gap-3">
          <Info className={`w-5 h-5 mt-0.5 ${
            myQuotation?.status === 'AWARDED'
              ? 'text-green-600'
              : myQuotation?.status === 'REJECTED'
              ? 'text-red-600'
              : 'text-blue-600'
          }`} />
          <div>
            <p className={`font-medium ${
              myQuotation?.status === 'AWARDED'
                ? 'text-green-800'
                : myQuotation?.status === 'REJECTED'
                ? 'text-red-800'
                : 'text-blue-800'
            }`}>
              {myQuotation?.status === 'AWARDED'
                ? 'Felicitaciones! Tu cotizacion fue adjudicada'
                : myQuotation?.status === 'REJECTED'
                ? 'Tu cotizacion no fue seleccionada'
                : rfqEstado.description}
            </p>
            {puedeCotizar && (
              <p className="text-sm text-blue-600 mt-1">
                Fecha limite: {formatFecha(rfq.deadline)} {porVencer && '- Vence pronto!'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info de la solicitud */}
        <div className="lg:col-span-1 space-y-6">
          {/* Datos generales */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Datos de la Solicitud</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm text-text-secondary">Empresa</p>
                  <p className="font-medium">{rfq.tenant.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${vencida ? 'text-red-500' : porVencer ? 'text-orange-500' : 'text-text-secondary'}`} />
                <div>
                  <p className="text-sm text-text-secondary">Fecha Limite</p>
                  <p className={`font-medium ${vencida ? 'text-red-600' : porVencer ? 'text-orange-600' : ''}`}>
                    {formatFecha(rfq.deadline)}
                    {!vencida && puedeCotizar && (
                      <span className="text-sm text-text-secondary ml-2">
                        ({diasRestantes === 0 ? 'Vence hoy' : `${diasRestantes} dias`})
                      </span>
                    )}
                    {vencida && <span className="text-sm text-red-500 ml-2">(Vencida)</span>}
                  </p>
                </div>
              </div>

              {rfq.deliveryDeadline && (
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text-secondary">Entrega Requerida</p>
                    <p className="font-medium">{formatFecha(rfq.deliveryDeadline)}</p>
                  </div>
                </div>
              )}

              {rfq.paymentTerms && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text-secondary">Condicion de Pago</p>
                    <p className="font-medium">{rfq.paymentTerms}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm text-text-secondary">Items Solicitados</p>
                  <p className="font-medium">{rfq.items.length} items</p>
                </div>
              </div>
            </div>

            {rfq.description && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-sm text-text-secondary mb-2">Descripcion</p>
                <p className="text-sm">{rfq.description}</p>
              </div>
            )}
          </div>

          {/* Mi cotizacion - resumen */}
          {myQuotation && (
            <div className="bg-white rounded-lg shadow-sm border border-border p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Mi Cotizacion</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Numero</span>
                  <span className="font-medium">{myQuotation.number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Estado</span>
                  {miCotEstado && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${miCotEstado.color}`}>
                      <miCotEstado.icon className="w-3 h-3" />
                      {miCotEstado.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Total</span>
                  <span className="font-bold text-lg">{formatMonto(myQuotation.totalAmount, rfq.currency)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Formulario de cotizacion */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">
                {esEditable ? 'Cotizar Items' : 'Items Cotizados'}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {esEditable
                  ? 'Ingresa el precio unitario para cada item solicitado'
                  : 'Detalle de tu cotizacion enviada'}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Descripcion</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase w-24">Cantidad</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase w-20">Unidad</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase w-44">Precio Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase w-40">Subtotal</th>
                    {esEditable && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase w-32">Marca/Modelo</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rfq.items.map((item, index) => {
                    const quotedItem = quotationItems.find(q => q.requestItemId === item.id);
                    const unitPrice = parseFloat(quotedItem?.unitPrice || '0');
                    const quantity = parseFloat(quotedItem?.quantity || '0');
                    const subtotal = unitPrice * quantity;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-text-primary">{item.description}</p>
                          {item.specifications && (
                            <p className="text-xs text-text-secondary mt-1">{item.specifications}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium">{item.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm text-text-secondary">{item.unit}</span>
                        </td>
                        <td className="px-4 py-3">
                          {esEditable ? (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                              <input
                                type="number"
                                value={quotedItem?.unitPrice || ''}
                                onChange={(e) => updateItemField(item.id, 'unitPrice', e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full pl-7 pr-2 py-1.5 text-right border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          ) : (
                            <p className="text-right text-sm font-medium">{formatMonto(unitPrice, rfq.currency)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-medium">{formatMonto(subtotal, rfq.currency)}</span>
                        </td>
                        {esEditable && (
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={quotedItem?.brand || ''}
                              onChange={(e) => updateItemField(item.id, 'brand', e.target.value)}
                              placeholder="Marca"
                              className="w-full px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-border">
                  <tr>
                    <td colSpan={esEditable ? 4 : 4} className="px-4 py-4 text-right font-semibold text-text-primary">
                      Total
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-lg font-bold text-palette-purple">
                        {formatMonto(calculateTotal(), rfq.currency)}
                      </span>
                    </td>
                    {esEditable && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Campos adicionales */}
            {esEditable && (
              <div className="p-6 border-t border-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Plazo de Entrega (dias)
                    </label>
                    <input
                      type="number"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      placeholder="Ej: 15"
                      min="1"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Condicion de Pago
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      placeholder="Ej: 30 dias FF"
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Validez de la Cotizacion
                    </label>
                    <input
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Observaciones
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
              </div>
            )}

            {/* Botones */}
            {esEditable && (
              <div className="p-6 border-t border-border bg-gray-50 rounded-b-lg">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handleDecline}
                    disabled={saving}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    No Participar
                  </Button>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleSave(false)}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Borrador
                    </Button>
                    <Button
                      onClick={() => handleSave(true)}
                      disabled={saving}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Cotizacion
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
