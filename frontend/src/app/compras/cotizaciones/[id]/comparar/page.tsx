'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  BarChart3,
  ArrowLeft,
  Award,
  CheckCircle,
  DollarSign,
  Clock,
  Building2,
  TrendingDown,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface ComparisonData {
  comparison: {
    rfq: {
      id: string;
      number: string;
      title: string;
      currency: string;
      estimatedBudget?: number;
    };
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unit: string;
    }>;
    suppliers: Array<{
      quotationId: string;
      supplierId: string;
      supplierName: string;
      totalAmount: number;
      deliveryDays?: number;
      paymentTerms?: string;
      validUntil?: string;
      status: string;
      items: Array<{
        requestItemId: string;
        unitPrice: number;
        quantity: number;
        totalPrice: number;
        brand?: string;
        model?: string;
        notes?: string;
      }>;
    }>;
  };
  bestPrices: Record<string, { supplierId: string; price: number }>;
  bestTotal: { supplierId: string; amount: number };
}

function formatMonto(monto: number, moneda: string = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

export default function CompararCotizacionesPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);

  const fetchComparison = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${id}/comparison`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        alert('Error al cargar la comparacion');
        router.back();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const handleAward = async () => {
    if (!selectedSupplier || !data) return;

    const supplier = data.comparison.suppliers.find(s => s.supplierId === selectedSupplier);
    if (!supplier) return;

    if (!confirm(`¿Adjudicar a ${supplier.supplierName} por ${formatMonto(supplier.totalAmount, data.comparison.rfq.currency)}?`)) {
      return;
    }

    setAwarding(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${id}/award`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            supplierId: selectedSupplier,
            quotationId: supplier.quotationId,
          }),
        }
      );

      if (response.ok) {
        alert('Adjudicacion exitosa');
        router.push(`/compras/cotizaciones/${id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al adjudicar');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al adjudicar');
    } finally {
      setAwarding(false);
    }
  };

  const handleGeneratePO = async () => {
    if (!confirm('¿Generar Orden de Compra desde esta adjudicacion?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${id}/generate-po`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        router.push(`/compras/ordenes-compra/${result.purchaseOrder.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al generar OC');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar OC');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || data.comparison.suppliers.length === 0) {
    return (
      <div className="p-6">
        <PageHeader
          title="Comparar Cotizaciones"
          icon={BarChart3}
          action={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          }
        />
        <div className="mt-8 text-center">
          <FileText className="w-16 h-16 mx-auto text-text-secondary opacity-50" />
          <p className="mt-4 text-text-secondary">No hay cotizaciones para comparar</p>
        </div>
      </div>
    );
  }

  const { comparison, bestPrices, bestTotal } = data;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`Comparar Cotizaciones - ${comparison.rfq.number}`}
        subtitle={comparison.rfq.title}
        icon={BarChart3}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            {selectedSupplier && (
              <Button onClick={handleAward} disabled={awarding}>
                <Award className="w-4 h-4 mr-2" />
                {awarding ? 'Adjudicando...' : 'Adjudicar'}
              </Button>
            )}
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {comparison.suppliers.length}
              </p>
              <p className="text-sm text-text-secondary">Cotizaciones</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {formatMonto(bestTotal.amount, comparison.rfq.currency)}
              </p>
              <p className="text-sm text-text-secondary">Mejor Total</p>
            </div>
          </div>
        </div>

        {comparison.rfq.estimatedBudget && (
          <div className="bg-white rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">
                  {formatMonto(comparison.rfq.estimatedBudget, comparison.rfq.currency)}
                </p>
                <p className="text-sm text-text-secondary">Presupuesto Est.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selection info */}
      {selectedSupplier && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800">
              Proveedor seleccionado: <strong>
                {comparison.suppliers.find(s => s.supplierId === selectedSupplier)?.supplierName}
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase sticky left-0 bg-gray-50 z-10">
                  Item / Proveedor
                </th>
                {comparison.suppliers.map((supplier) => (
                  <th
                    key={supplier.supplierId}
                    className={`px-4 py-3 text-center text-xs font-semibold uppercase min-w-[180px] cursor-pointer transition-colors ${
                      selectedSupplier === supplier.supplierId
                        ? 'bg-green-100 text-green-800'
                        : supplier.supplierId === bestTotal.supplierId
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-text-secondary'
                    }`}
                    onClick={() => setSelectedSupplier(supplier.supplierId)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{supplier.supplierName}</span>
                      {supplier.supplierId === bestTotal.supplierId && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Mejor precio
                        </span>
                      )}
                      {selectedSupplier === supplier.supplierId && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Items */}
              {comparison.items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-gray-50">
                  <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-border">
                    <p className="font-medium text-text-primary text-sm">{item.description}</p>
                    <p className="text-xs text-text-secondary">
                      {item.quantity} {item.unit}
                    </p>
                  </td>
                  {comparison.suppliers.map((supplier) => {
                    const quotedItem = supplier.items.find(qi => qi.requestItemId === item.id);
                    const isBest = bestPrices[item.id]?.supplierId === supplier.supplierId;

                    return (
                      <td
                        key={supplier.supplierId}
                        className={`px-4 py-3 text-center ${
                          selectedSupplier === supplier.supplierId ? 'bg-green-50' : ''
                        }`}
                      >
                        {quotedItem ? (
                          <div className={`${isBest ? 'text-green-600 font-bold' : ''}`}>
                            <p className="text-sm">
                              {formatMonto(quotedItem.unitPrice, comparison.rfq.currency)}
                              <span className="text-xs text-text-secondary"> /u</span>
                            </p>
                            <p className="text-xs text-text-secondary">
                              Total: {formatMonto(quotedItem.totalPrice, comparison.rfq.currency)}
                            </p>
                            {quotedItem.brand && (
                              <p className="text-xs text-text-secondary mt-1">
                                {quotedItem.brand} {quotedItem.model}
                              </p>
                            )}
                            {isBest && (
                              <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                Mejor
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-secondary text-sm">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-gray-100 font-bold">
                <td className="px-4 py-4 sticky left-0 bg-gray-100 z-10 border-r border-border">
                  <span className="text-text-primary">TOTAL</span>
                </td>
                {comparison.suppliers.map((supplier) => (
                  <td
                    key={supplier.supplierId}
                    className={`px-4 py-4 text-center ${
                      supplier.supplierId === bestTotal.supplierId
                        ? 'text-green-600'
                        : selectedSupplier === supplier.supplierId
                        ? 'bg-green-100'
                        : ''
                    }`}
                  >
                    <p className="text-lg">
                      {formatMonto(supplier.totalAmount, comparison.rfq.currency)}
                    </p>
                  </td>
                ))}
              </tr>

              {/* Delivery days row */}
              <tr className="border-b border-border">
                <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-text-secondary" />
                    <span className="text-text-secondary text-sm">Plazo entrega</span>
                  </div>
                </td>
                {comparison.suppliers.map((supplier) => (
                  <td
                    key={supplier.supplierId}
                    className={`px-4 py-3 text-center text-sm ${
                      selectedSupplier === supplier.supplierId ? 'bg-green-50' : ''
                    }`}
                  >
                    {supplier.deliveryDays ? `${supplier.deliveryDays} dias` : '-'}
                  </td>
                ))}
              </tr>

              {/* Payment terms row */}
              <tr>
                <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-border">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-text-secondary" />
                    <span className="text-text-secondary text-sm">Cond. pago</span>
                  </div>
                </td>
                {comparison.suppliers.map((supplier) => (
                  <td
                    key={supplier.supplierId}
                    className={`px-4 py-3 text-center text-sm ${
                      selectedSupplier === supplier.supplierId ? 'bg-green-50' : ''
                    }`}
                  >
                    {supplier.paymentTerms || '-'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Instrucciones
            </p>
            <ul className="text-xs text-amber-600 mt-1 list-disc list-inside">
              <li>Haz clic en la columna del proveedor que deseas adjudicar</li>
              <li>Las celdas en verde indican el mejor precio por item</li>
              <li>Una vez adjudicado, podras generar la Orden de Compra automaticamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
