'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  FileSearch,
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Send,
  Building2,
  Calendar,
  DollarSign,
  Package,
  Search,
  X,
  Check,
} from 'lucide-react';

interface Item {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  specifications?: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  cuit?: string;
}

interface PurchaseRequest {
  id: string;
  numero: string;
  titulo: string;
  items: Array<{
    id: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
  }>;
}

export default function NuevaRFQPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deliveryDeadline, setDeliveryDeadline] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [currency, setCurrency] = useState('ARS');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Supplier[]>([]);
  const [purchaseRequestId, setPurchaseRequestId] = useState('');

  // Suppliers search
  const [supplierSearch, setSupplierSearch] = useState('');
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);

  // Purchase Requests
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [showPRSearch, setShowPRSearch] = useState(false);

  const tenantId = typeof window !== 'undefined'
    ? localStorage.getItem('tenantId') || ''
    : '';

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!tenantId) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers?tenantId=${tenantId}&status=ACTIVE&limit=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setAvailableSuppliers(data.suppliers || []);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };
    fetchSuppliers();
  }, [tenantId]);

  // Fetch purchase requests
  useEffect(() => {
    const fetchPRs = async () => {
      if (!tenantId) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/purchase-requests?tenantId=${tenantId}&estado=APROBADO`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setPurchaseRequests(data || []);
        }
      } catch (error) {
        console.error('Error fetching PRs:', error);
      }
    };
    fetchPRs();
  }, [tenantId]);

  // Filter suppliers
  const filteredSuppliers = availableSuppliers.filter(s => {
    if (!supplierSearch) return true;
    const search = supplierSearch.toLowerCase();
    return s.name.toLowerCase().includes(search) ||
      s.email.toLowerCase().includes(search) ||
      (s.cuit && s.cuit.includes(search));
  }).filter(s => !selectedSuppliers.find(sel => sel.id === s.id));

  // Add item
  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unit: 'Unidad',
      specifications: ''
    }]);
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  // Update item
  const updateItem = (id: string, field: keyof Item, value: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  // Add supplier
  const addSupplier = (supplier: Supplier) => {
    setSelectedSuppliers([...selectedSuppliers, supplier]);
    setSupplierSearch('');
    setShowSupplierSearch(false);
  };

  // Remove supplier
  const removeSupplier = (id: string) => {
    setSelectedSuppliers(selectedSuppliers.filter(s => s.id !== id));
  };

  // Import from PR
  const importFromPR = (pr: PurchaseRequest) => {
    setTitle(pr.titulo);
    setPurchaseRequestId(pr.id);
    setItems(pr.items.map(item => ({
      id: item.id,
      description: item.descripcion,
      quantity: item.cantidad,
      unit: item.unidad || 'Unidad',
      specifications: ''
    })));
    setShowPRSearch(false);
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!title || !deadline) {
      alert('Titulo y fecha limite son requeridos');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tenantId,
            title,
            description,
            purchaseRequestId: purchaseRequestId || undefined,
            deadline,
            deliveryDeadline: deliveryDeadline || undefined,
            paymentTerms: paymentTerms || undefined,
            currency,
            estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : undefined,
            items: items.filter(i => i.description),
            supplierIds: selectedSuppliers.map(s => s.id)
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        router.push(`/compras/cotizaciones/${data.rfq.id}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Nueva Solicitud de Cotizacion"
        subtitle="Crea una nueva RFQ para solicitar cotizaciones a proveedores"
        icon={FileSearch}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button onClick={handleSaveDraft} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Guardando...' : 'Guardar Borrador'}
            </Button>
          </div>
        }
      />

      {/* Import from PR */}
      {purchaseRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Importar desde Requerimiento
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Puedes crear la RFQ a partir de un requerimiento aprobado
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPRSearch(!showPRSearch)}
            >
              <Package className="w-4 h-4 mr-2" />
              Seleccionar Requerimiento
            </Button>
          </div>
          {showPRSearch && (
            <div className="mt-4 bg-white rounded-lg border border-blue-200 max-h-60 overflow-y-auto">
              {purchaseRequests.map(pr => (
                <button
                  key={pr.id}
                  onClick={() => importFromPR(pr)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                >
                  <p className="font-medium text-text-primary">{pr.numero}</p>
                  <p className="text-sm text-text-secondary">{pr.titulo}</p>
                  <p className="text-xs text-text-secondary mt-1">{pr.items?.length || 0} items</p>
                </button>
              ))}
              {purchaseRequests.length === 0 && (
                <p className="p-4 text-sm text-text-secondary text-center">
                  No hay requerimientos aprobados disponibles
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Informacion General
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Titulo *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Suministros de oficina Q1 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Descripcion
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripcion detallada de la solicitud..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha limite cotizacion *
                  </label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha entrega requerida
                  </label>
                  <Input
                    type="date"
                    value={deliveryDeadline}
                    onChange={(e) => setDeliveryDeadline(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Presupuesto estimado
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-24 px-3 py-2 border border-border rounded-lg"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <Input
                      type="number"
                      value={estimatedBudget}
                      onChange={(e) => setEstimatedBudget(e.target.value)}
                      placeholder="0.00"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Condiciones de pago esperadas
                  </label>
                  <Input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Ej: 30 dias fecha factura"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Items a Cotizar
              </h2>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay items agregados</p>
                <Button variant="outline" size="sm" onClick={addItem} className="mt-2">
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar primer item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <span className="text-sm font-medium text-text-secondary mt-2">
                        {index + 1}.
                      </span>
                      <div className="flex-1 space-y-3">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Descripcion del item"
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">
                              Cantidad
                            </label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">
                              Unidad
                            </label>
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                              placeholder="Unidad"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">
                              Especificaciones
                            </label>
                            <Input
                              value={item.specifications || ''}
                              onChange={(e) => updateItem(item.id, 'specifications', e.target.value)}
                              placeholder="Opcional"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Suppliers */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              <Building2 className="w-5 h-5 inline mr-2" />
              Proveedores a Invitar
            </h2>

            {/* Selected suppliers */}
            {selectedSuppliers.length > 0 && (
              <div className="space-y-2 mb-4">
                {selectedSuppliers.map(supplier => (
                  <div
                    key={supplier.id}
                    className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{supplier.name}</p>
                      <p className="text-xs text-text-secondary">{supplier.email}</p>
                    </div>
                    <button
                      onClick={() => removeSupplier(supplier.id)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search suppliers */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
              <Input
                value={supplierSearch}
                onChange={(e) => {
                  setSupplierSearch(e.target.value);
                  setShowSupplierSearch(true);
                }}
                onFocus={() => setShowSupplierSearch(true)}
                placeholder="Buscar proveedor..."
                className="pl-10"
              />
            </div>

            {/* Supplier dropdown */}
            {showSupplierSearch && filteredSuppliers.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto border border-border rounded-lg">
                {filteredSuppliers.map(supplier => (
                  <button
                    key={supplier.id}
                    onClick={() => addSupplier(supplier)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-text-primary">{supplier.name}</p>
                    <p className="text-xs text-text-secondary">{supplier.email}</p>
                  </button>
                ))}
              </div>
            )}

            {selectedSuppliers.length === 0 && (
              <p className="text-sm text-text-secondary mt-4 text-center">
                Selecciona al menos un proveedor para enviar la solicitud
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Resumen
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Items:</span>
                <span className="font-medium">{items.filter(i => i.description).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Proveedores:</span>
                <span className="font-medium">{selectedSuppliers.length}</span>
              </div>
              {estimatedBudget && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Presupuesto:</span>
                  <span className="font-medium">
                    {currency} {parseFloat(estimatedBudget).toLocaleString('es-AR')}
                  </span>
                </div>
              )}
              {deadline && (
                <div className="flex justify-between">
                  <span className="text-text-secondary">Vencimiento:</span>
                  <span className="font-medium">
                    {new Date(deadline).toLocaleDateString('es-AR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
