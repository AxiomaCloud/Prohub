'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirmDialog } from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
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
  Upload,
  Paperclip,
  FileText,
  Loader2,
  Eye,
  User,
  Clock,
  AlertCircle,
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
  descripcion?: string;
  justificacion?: string;
  estado?: string;
  prioridad?: string;
  categoria?: string;
  montoEstimado?: number;
  moneda?: string;
  fechaCreacion?: string;
  fechaNecesidad?: string;
  solicitante?: {
    id: string;
    nombre: string;
    email: string;
  };
  items: Array<{
    id: string;
    descripcion: string;
    cantidad: number;
    unidad: string;
    precioEstimado?: number;
  }>;
}

interface Attachment {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploading?: boolean;
}

export default function NuevaRFQPage() {
  const router = useRouter();
  const { tenant, token } = useAuth();
  const { confirm } = useConfirmDialog();
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
  const [showPRModal, setShowPRModal] = useState(false);
  const [prSearchTerm, setPrSearchTerm] = useState('');
  const [selectedPRForPreview, setSelectedPRForPreview] = useState<PurchaseRequest | null>(null);
  const [tempSelectedPR, setTempSelectedPR] = useState<string>('');

  // Attachments
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const tenantId = tenant?.id || '';

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      if (!tenantId || !token) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers?tenantId=${tenantId}&status=ACTIVE&limit=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          // La API devuelve 'proveedores' no 'suppliers'
          const suppliers = (data.proveedores || []).map((p: any) => ({
            id: p.id,
            name: p.nombre || p.nombreFantasia,
            email: p.email || '',
            cuit: p.cuit
          }));
          setAvailableSuppliers(suppliers);
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };
    fetchSuppliers();
  }, [tenantId, token]);

  // Fetch purchase requests (aprobados y disponibles para cotizar)
  useEffect(() => {
    const fetchPRs = async () => {
      console.log('[RFQ Nueva] tenantId:', tenantId, 'token:', token ? 'exists' : 'missing');
      if (!tenantId || !token) {
        console.log('[RFQ Nueva] No hay tenantId o token, saltando fetch de PRs');
        return;
      }
      try {
        console.log('[RFQ Nueva] Fetching PRs para tenant:', tenantId);
        // Obtener todos los requerimientos y filtrar los disponibles para RFQ
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/purchase-requests?tenantId=${tenantId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          console.log('[RFQ Nueva] Respuesta PRs:', data.requerimientos?.length, 'requerimientos');
          console.log('[RFQ Nueva] Estados:', data.requerimientos?.map((r: any) => r.estado));
          // Filtrar requerimientos que pueden usarse para RFQ:
          // - Estado APROBADO y que NO tenga OC generada
          const reqs = (data.requerimientos || [])
            .filter((r: any) => r.estado === 'APROBADO' && !r.tieneOC)
            .map((r: any) => ({
              id: r.id,
              numero: r.numero,
              titulo: r.titulo,
              descripcion: r.descripcion,
              justificacion: r.justificacion,
              estado: r.estado,
              prioridad: r.prioridad,
              categoria: r.categoria,
              montoEstimado: r.montoEstimado,
              moneda: r.moneda || 'ARS',
              fechaCreacion: r.fechaCreacion,
              fechaNecesidad: r.fechaNecesidad || r.fechaNecesaria,
              solicitante: r.solicitante,
              items: (r.items || []).map((item: any) => ({
                id: item.id,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                unidad: item.unidad || item.unidadMedida || 'Unidad',
                precioEstimado: item.precioEstimado || item.precioUnitario
              }))
            }));
          console.log('[RFQ Nueva] PRs filtrados:', reqs.length);
          setPurchaseRequests(reqs);
        } else {
          console.log('[RFQ Nueva] Error response:', response.status);
        }
      } catch (error) {
        console.error('Error fetching PRs:', error);
      }
    };
    fetchPRs();
  }, [tenantId, token]);

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
    // Copiar descripción del requerimiento (justificacion es interna, no se copia)
    if (pr.descripcion) {
      setDescription(pr.descripcion);
    }
    // Copiar fecha de necesidad como fecha de entrega requerida
    if (pr.fechaNecesidad) {
      const fecha = new Date(pr.fechaNecesidad);
      setDeliveryDeadline(fecha.toISOString().split('T')[0]);
    }
    // Copiar monto estimado y moneda si existen
    if (pr.montoEstimado) {
      setEstimatedBudget(pr.montoEstimado.toString());
    }
    if (pr.moneda) {
      setCurrency(pr.moneda);
    }
    setItems(pr.items.map(item => ({
      id: item.id,
      description: item.descripcion,
      quantity: item.cantidad,
      unit: item.unidad || 'Unidad',
      specifications: ''
    })));
    setShowPRModal(false);
    setTempSelectedPR('');
    setPrSearchTerm('');
  };

  // Confirm PR selection from modal
  const confirmPRSelection = () => {
    const pr = purchaseRequests.find(p => p.id === tempSelectedPR);
    if (pr) {
      importFromPR(pr);
    }
  };

  // Open modal and set temp selection to current
  const openPRModal = () => {
    setTempSelectedPR(purchaseRequestId);
    setShowPRModal(true);
  };

  // Filter PRs by search term
  const filteredPRs = purchaseRequests.filter(pr => {
    if (!prSearchTerm) return true;
    const search = prSearchTerm.toLowerCase();
    return pr.numero.toLowerCase().includes(search) ||
      pr.titulo.toLowerCase().includes(search) ||
      pr.categoria?.toLowerCase().includes(search) ||
      pr.solicitante?.nombre.toLowerCase().includes(search);
  });

  // Format currency
  const formatCurrency = (amount: number | undefined, currency: string = 'ARS') => {
    if (!amount) return '-';
    return `${currency} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR');
  };

  // Get priority color
  const getPriorityColor = (priority: string | undefined) => {
    switch (priority?.toLowerCase()) {
      case 'urgente': return 'bg-red-100 text-red-700';
      case 'alta': return 'bg-orange-100 text-orange-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      case 'baja': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      // Validar tamaño (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`El archivo ${file.name} excede el tamaño máximo de 10MB`);
        continue;
      }

      // Agregar con estado uploading
      const tempAttachment: Attachment = {
        fileName: file.name,
        fileUrl: '',
        fileType: file.type,
        fileSize: file.size,
        uploading: true,
      };
      setAttachments(prev => [...prev, tempAttachment]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/attachments/upload-generic`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Reemplazar el temporal con el archivo subido
          setAttachments(prev =>
            prev.map(a =>
              a.fileName === file.name && a.uploading
                ? { ...data, uploading: false }
                : a
            )
          );
        } else {
          // Remover el archivo con error
          setAttachments(prev => prev.filter(a => !(a.fileName === file.name && a.uploading)));
          toast.error(`Error al subir ${file.name}`);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setAttachments(prev => prev.filter(a => !(a.fileName === file.name && a.uploading)));
        toast.error(`Error al subir ${file.name}`);
      }
    }
  };

  // Remove attachment
  const removeAttachment = (fileUrl: string) => {
    setAttachments(prev => prev.filter(a => a.fileUrl !== fileUrl));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Save as draft
  const handleSaveDraft = async () => {
    if (!title || !deadline) {
      toast.error('Título y fecha límite son requeridos');
      return;
    }

    setSaving(true);
    try {
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
            supplierIds: selectedSuppliers.map(s => s.id),
            attachments: attachments.filter(a => !a.uploading).map(a => ({
              fileName: a.fileName,
              fileUrl: a.fileUrl,
              fileType: a.fileType,
              fileSize: a.fileSize,
            }))
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        router.push(`/compras/cotizaciones/${data.rfq.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar la solicitud');
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">
              {purchaseRequestId ? 'Vinculado a Requerimiento' : 'Importar desde Requerimiento'}
            </p>
            {purchaseRequestId ? (
              <div className="mt-1">
                {(() => {
                  const pr = purchaseRequests.find(p => p.id === purchaseRequestId);
                  return pr ? (
                    <div className="flex items-center gap-3 text-xs text-blue-700">
                      <span className="font-semibold">{pr.numero}</span>
                      <span>|</span>
                      <span>{pr.titulo}</span>
                      <span>|</span>
                      <span>{pr.items?.length || 0} items</span>
                      {pr.montoEstimado && (
                        <>
                          <span>|</span>
                          <span>{formatCurrency(pr.montoEstimado, pr.moneda)}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-blue-600">ID: {purchaseRequestId}</span>
                  );
                })()}
              </div>
            ) : (
              <p className="text-xs text-blue-600 mt-0.5">
                Puedes crear la RFQ a partir de un requerimiento aprobado
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {purchaseRequestId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPurchaseRequestId('');
                  setTitle('');
                  setItems([]);
                }}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Desvincular
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={openPRModal}
            >
              <Package className="w-4 h-4 mr-2" />
              {purchaseRequestId ? 'Cambiar' : 'Seleccionar Requerimiento'}
            </Button>
          </div>
        </div>
      </div>

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

          {/* Attachments */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                <Paperclip className="w-5 h-5 inline mr-2" />
                Archivos Adjuntos
              </h2>
              <p className="text-xs text-text-secondary">
                Especificaciones, planos, referencias
              </p>
            </div>

            {/* Upload zone */}
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-1 text-sm text-gray-600">
                  <span className="font-medium">Click para subir</span> o arrastra archivos
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, XLS, JPG, PNG (Max. 10MB)
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
                  }
                  e.target.value = '';
                }}
              />
            </label>

            {/* File list */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={file.fileUrl || index}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      file.uploading ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {file.uploading ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.fileSize)}
                          {file.uploading && ' - Subiendo...'}
                        </p>
                      </div>
                    </div>
                    {!file.uploading && (
                      <button
                        type="button"
                        onClick={() => removeAttachment(file.fileUrl)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
              <div className="flex justify-between">
                <span className="text-text-secondary">Adjuntos:</span>
                <span className="font-medium">{attachments.filter(a => !a.uploading).length}</span>
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

      {/* Modal de selección de requerimientos */}
      {showPRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Seleccionar Requerimiento</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Selecciona un requerimiento aprobado para vincular a esta cotización
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPRModal(false);
                  setTempSelectedPR('');
                  setPrSearchTerm('');
                  setSelectedPRForPreview(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={prSearchTerm}
                  onChange={(e) => setPrSearchTerm(e.target.value)}
                  placeholder="Buscar por número, título, categoría o solicitante..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Grid de requerimientos */}
              <div className={`flex-1 overflow-auto ${selectedPRForPreview ? 'border-r border-gray-200' : ''}`}>
                {filteredPRs.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">

                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Número
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Título
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Prioridad
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Solicitante
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Monto Est.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          F. Necesidad
                        </th>
                        <th className="w-12 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">

                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPRs.map((pr) => (
                        <tr
                          key={pr.id}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            tempSelectedPR === pr.id ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => setTempSelectedPR(pr.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="radio"
                              name="selectedPR"
                              checked={tempSelectedPR === pr.id}
                              onChange={() => setTempSelectedPR(pr.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm font-medium text-gray-900">
                              {pr.numero}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900 line-clamp-1" title={pr.titulo}>
                              {pr.titulo}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Aprobado
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityColor(pr.prioridad)}`}>
                              {pr.prioridad || 'Normal'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {pr.categoria || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600" title={pr.solicitante?.email}>
                              {pr.solicitante?.nombre || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900 font-medium">
                              {formatCurrency(pr.montoEstimado, pr.moneda)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
                              {pr.items?.length || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {formatDate(pr.fechaNecesidad)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPRForPreview(selectedPRForPreview?.id === pr.id ? null : pr);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                selectedPRForPreview?.id === pr.id
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'hover:bg-gray-100 text-gray-500'
                              }`}
                              title="Ver detalle"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Package className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No hay requerimientos disponibles</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {prSearchTerm
                        ? 'No se encontraron resultados para tu búsqueda'
                        : 'Los requerimientos deben estar aprobados para aparecer aquí'}
                    </p>
                  </div>
                )}
              </div>

              {/* Panel de preview */}
              {selectedPRForPreview && (
                <div className="w-80 bg-gray-50 overflow-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">Detalle</h3>
                      <button
                        onClick={() => setSelectedPRForPreview(null)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Número</p>
                        <p className="font-mono font-semibold text-gray-900">{selectedPRForPreview.numero}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Título</p>
                        <p className="text-sm text-gray-900">{selectedPRForPreview.titulo}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Estado</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Aprobado
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Prioridad</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityColor(selectedPRForPreview.prioridad)}`}>
                            {selectedPRForPreview.prioridad || 'Normal'}
                          </span>
                        </div>
                      </div>

                      {selectedPRForPreview.solicitante && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Solicitante</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="w-3 h-3 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{selectedPRForPreview.solicitante.nombre}</p>
                              <p className="text-xs text-gray-500">{selectedPRForPreview.solicitante.email}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Monto Est.</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(selectedPRForPreview.montoEstimado, selectedPRForPreview.moneda)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">F. Necesidad</p>
                          <p className="text-sm text-gray-900">{formatDate(selectedPRForPreview.fechaNecesidad)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                          Items ({selectedPRForPreview.items?.length || 0})
                        </p>
                        <div className="space-y-2 max-h-48 overflow-auto">
                          {selectedPRForPreview.items?.map((item, idx) => (
                            <div key={item.id} className="bg-white rounded-lg p-2 border border-gray-200">
                              <p className="text-sm text-gray-900 line-clamp-2">{item.descripcion}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>{item.cantidad} {item.unidad}</span>
                                {item.precioEstimado && (
                                  <>
                                    <span>|</span>
                                    <span>{formatCurrency(item.precioEstimado, selectedPRForPreview.moneda)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                {filteredPRs.length} requerimiento{filteredPRs.length !== 1 ? 's' : ''} disponible{filteredPRs.length !== 1 ? 's' : ''}
                {tempSelectedPR && (
                  <span className="ml-2 text-blue-600 font-medium">
                    | 1 seleccionado
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPRModal(false);
                    setTempSelectedPR('');
                    setPrSearchTerm('');
                    setSelectedPRForPreview(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmPRSelection}
                  disabled={!tempSelectedPR}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar Selección
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
