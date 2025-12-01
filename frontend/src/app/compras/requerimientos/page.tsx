'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompras } from '@/lib/compras-context';
import { useParametros } from '@/hooks/compras';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { AdjuntosUpload } from '@/components/compras/AdjuntosUpload';
import { ItemsTable } from '@/components/compras/ItemsTable';
import { EstadoRequerimiento, Prioridad, Requerimiento, ItemRequerimiento, Adjunto } from '@/types/compras';
import {
  Plus,
  Search,
  ClipboardList,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Flag,
  X,
  Clock,
  FileEdit,
  FileCheck,
  PackageCheck,
  Save
} from 'lucide-react';

interface AdjuntoFile {
  id: string;
  file: File;
  nombre: string;
  tamanio: number;
  tipo: string;
}

// Configuracion de estados
const estadosConfig: { id: EstadoRequerimiento; label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'BORRADOR', label: 'Borrador', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: FileEdit },
  { id: 'PENDIENTE_APROBACION', label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  { id: 'APROBADO', label: 'Aprobado', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  { id: 'RECHAZADO', label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  { id: 'OC_GENERADA', label: 'OC Generada', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: FileCheck },
  { id: 'RECIBIDO', label: 'Recibido', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: PackageCheck },
];

const allEstados: EstadoRequerimiento[] = ['BORRADOR', 'PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'OC_GENERADA', 'RECIBIDO'];

// Modal de filtro de estados
function FiltroEstadosModal({
  isOpen,
  onClose,
  selectedEstados,
  onToggle,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedEstados: EstadoRequerimiento[];
  onToggle: (estado: EstadoRequerimiento) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Filtrar por Estado</h3>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {estadosConfig.map((estado) => {
            const Icon = estado.icon;
            const isSelected = selectedEstados.includes(estado.id);
            return (
              <label
                key={estado.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(estado.id)}
                  disabled={isSelected && selectedEstados.length === 1}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <div className={`p-2 rounded-lg ${estado.bgColor}`}>
                  <Icon className={`w-4 h-4 ${estado.color}`} />
                </div>
                <span className="text-sm font-medium text-text-primary">{estado.label}</span>
              </label>
            );
          })}
        </div>
        <div className="flex justify-end p-4 border-t border-border">
          <Button size="sm" onClick={onClose}>
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Tabs del modal
type TabId = 'general' | 'items' | 'adjuntos' | 'justificacion';

const tabs: { id: TabId; label: string }[] = [
  { id: 'general', label: 'Informacion General' },
  { id: 'items', label: 'Items' },
  { id: 'adjuntos', label: 'Documentacion' },
  { id: 'justificacion', label: 'Justificacion' },
];

// Modal de Requerimiento (Nuevo / Ver / Editar)
function RequerimientoModal({
  isOpen,
  onClose,
  onSuccess,
  requerimiento,
  readOnly = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requerimiento?: Requerimiento | null;
  readOnly?: boolean;
}) {
  const { usuarioActual, agregarRequerimiento, actualizarRequerimiento } = useCompras();
  const { centrosCostos, categorias, prioridades } = useParametros();

  const isEditing = !!requerimiento;
  const isReadOnly = readOnly || (isEditing && !['BORRADOR', 'PENDIENTE_APROBACION'].includes(requerimiento?.estado || ''));

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    centroCostos: '',
    categoria: '',
    prioridad: 'NORMAL' as Prioridad,
    fechaNecesaria: '',
    justificacion: '',
  });

  const [items, setItems] = useState<ItemRequerimiento[]>([
    {
      id: 'item-1',
      descripcion: '',
      cantidad: 1,
      unidad: 'Unidad',
      precioUnitario: 0,
      total: 0,
    },
  ]);

  const [adjuntos, setAdjuntos] = useState<AdjuntoFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Cargar datos del requerimiento cuando se abre el modal
  useEffect(() => {
    if (isOpen && requerimiento) {
      setFormData({
        titulo: requerimiento.titulo,
        descripcion: requerimiento.descripcion,
        centroCostos: requerimiento.centroCostos,
        categoria: requerimiento.categoria,
        prioridad: requerimiento.prioridad,
        fechaNecesaria: requerimiento.fechaNecesaria
          ? new Date(requerimiento.fechaNecesaria).toISOString().split('T')[0]
          : '',
        justificacion: requerimiento.justificacion,
      });
      setItems(requerimiento.items.length > 0 ? requerimiento.items : [{
        id: 'item-1',
        descripcion: '',
        cantidad: 1,
        unidad: 'Unidad',
        precioUnitario: 0,
        total: 0,
      }]);
      // Convertir adjuntos existentes al formato del modal
      setAdjuntos(requerimiento.adjuntos.map(adj => ({
        id: adj.id,
        file: new File([], adj.nombre),
        nombre: adj.nombre,
        tamanio: adj.tamanio,
        tipo: adj.tipo,
      })));
    } else if (isOpen && !requerimiento) {
      resetForm();
    }
  }, [isOpen, requerimiento]);

  const resetForm = () => {
    setActiveTab('general');
    setFormData({
      titulo: '',
      descripcion: '',
      centroCostos: '',
      categoria: '',
      prioridad: 'NORMAL',
      fechaNecesaria: '',
      justificacion: '',
    });
    setItems([{
      id: 'item-1',
      descripcion: '',
      cantidad: 1,
      unidad: 'Unidad',
      precioUnitario: 0,
      total: 0,
    }]);
    setAdjuntos([]);
    setErrors({});
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El titulo es requerido';
    }
    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripcion es requerida';
    }
    if (!formData.centroCostos) {
      newErrors.centroCostos = 'Seleccione un centro de costos';
    }
    if (!formData.categoria) {
      newErrors.categoria = 'Seleccione una categoria';
    }
    if (!formData.justificacion.trim()) {
      newErrors.justificacion = 'La justificacion es requerida';
    }
    if (items.length === 0 || items.every((i) => !i.descripcion)) {
      newErrors.items = 'Agregue al menos un item';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (enviar: boolean) => {
    if (enviar && !validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const adjuntosFinal: Adjunto[] = adjuntos.map((adj) => ({
        id: adj.id,
        nombre: adj.nombre,
        tipo: adj.tipo,
        tamanio: adj.tamanio,
        url: `/mock/${adj.nombre}`,
        fechaSubida: new Date(),
        estado: 'PENDIENTE' as const,
      }));

      const montoTotal = items.reduce((sum, item) => sum + item.total, 0);

      if (isEditing && requerimiento) {
        // Actualizar requerimiento existente
        const datosActualizados: Partial<Requerimiento> = {
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          centroCostos: formData.centroCostos,
          categoria: formData.categoria,
          prioridad: formData.prioridad,
          items: items.filter((i) => i.descripcion.trim() !== ''),
          montoEstimado: montoTotal,
          fechaNecesaria: formData.fechaNecesaria ? new Date(formData.fechaNecesaria) : undefined,
          adjuntos: adjuntosFinal,
          justificacion: formData.justificacion,
          estado: enviar ? 'PENDIENTE_APROBACION' : requerimiento.estado,
        };

        actualizarRequerimiento(requerimiento.id, datosActualizados);
      } else {
        // Crear nuevo requerimiento
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(5, '0');
        const numero = `REQ-${year}-${randomNum}`;

        const nuevoRequerimiento: Requerimiento = {
          id: `req-${Date.now()}`,
          numero,
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          solicitanteId: usuarioActual.id,
          solicitante: usuarioActual,
          departamento: usuarioActual.departamento,
          centroCostos: formData.centroCostos,
          categoria: formData.categoria,
          prioridad: formData.prioridad,
          items: items.filter((i) => i.descripcion.trim() !== ''),
          montoEstimado: montoTotal,
          moneda: 'ARS',
          fechaCreacion: new Date(),
          fechaNecesaria: formData.fechaNecesaria ? new Date(formData.fechaNecesaria) : undefined,
          adjuntos: adjuntosFinal,
          justificacion: formData.justificacion,
          estado: enviar ? 'PENDIENTE_APROBACION' : 'BORRADOR',
        };

        agregarRequerimiento(nuevoRequerimiento);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al guardar requerimiento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop con blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header con titulo y botones */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {isReadOnly
                  ? `Requerimiento ${requerimiento?.numero || ''}`
                  : isEditing
                    ? 'Editar Requerimiento'
                    : 'Nuevo Requerimiento'}
              </h2>
              <p className="text-sm text-text-secondary">
                {isReadOnly
                  ? 'Vista de solo lectura'
                  : isEditing
                    ? 'Modifique los datos del requerimiento'
                    : 'Complete los datos del requerimiento'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Guardar' : 'Borrador'}
                </Button>
                {(!isEditing || requerimiento?.estado === 'BORRADOR') && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </Button>
                )}
              </>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0 bg-gray-50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-palette-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-palette-purple" />
              )}
            </button>
          ))}
        </div>

        {/* Content - Scrollable con altura fija */}
        <div className="overflow-y-auto p-6 h-[450px]">
          {/* Tab: Informacion General */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Titulo */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Titulo {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  placeholder="Ej: Notebooks Dell XPS para equipo de desarrollo"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple ${
                    errors.titulo ? 'border-red-500' : 'border-border'
                  } ${isReadOnly ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : ''}`}
                />
                {errors.titulo && <p className="text-sm text-red-500 mt-1">{errors.titulo}</p>}
              </div>

              {/* Descripcion */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Descripcion {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  rows={3}
                  placeholder="Describa brevemente que necesita y por que"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple ${
                    errors.descripcion ? 'border-red-500' : 'border-border'
                  } ${isReadOnly ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : ''}`}
                />
                {errors.descripcion && <p className="text-sm text-red-500 mt-1">{errors.descripcion}</p>}
              </div>

              {/* Row: Centro de Costos y Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Centro de Costos {!isReadOnly && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="centroCostos"
                    value={formData.centroCostos}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple ${
                      errors.centroCostos ? 'border-red-500' : 'border-border'
                    } ${isReadOnly ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : ''}`}
                  >
                    <option value="">Seleccione...</option>
                    {centrosCostos.map((cc) => (
                      <option key={cc.id} value={cc.nombre}>{cc.nombre}</option>
                    ))}
                  </select>
                  {errors.centroCostos && <p className="text-sm text-red-500 mt-1">{errors.centroCostos}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Categoria {!isReadOnly && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple ${
                      errors.categoria ? 'border-red-500' : 'border-border'
                    } ${isReadOnly ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : ''}`}
                  >
                    <option value="">Seleccione...</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                    ))}
                  </select>
                  {errors.categoria && <p className="text-sm text-red-500 mt-1">{errors.categoria}</p>}
                </div>
              </div>

              {/* Row: Prioridad y Fecha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Prioridad {!isReadOnly && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="prioridad"
                    value={formData.prioridad}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    className={`w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple ${isReadOnly ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : ''}`}
                  >
                    {prioridades.map((p) => (
                      <option key={p.valor} value={p.valor}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Fecha Necesaria
                  </label>
                  <input
                    type="date"
                    name="fechaNecesaria"
                    value={formData.fechaNecesaria}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple ${isReadOnly ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Items */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <ItemsTable items={items} onItemsChange={setItems} readonly={isReadOnly} />
              {errors.items && <p className="text-sm text-red-500">{errors.items}</p>}
            </div>
          )}

          {/* Tab: Documentacion Adjunta */}
          {activeTab === 'adjuntos' && (
            <div className="space-y-4">
              <AdjuntosUpload adjuntos={adjuntos} onAdjuntosChange={setAdjuntos} readonly={isReadOnly} />
            </div>
          )}

          {/* Tab: Justificacion */}
          {activeTab === 'justificacion' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Justificacion {!isReadOnly && <span className="text-red-500">*</span>}
              </label>
              <textarea
                name="justificacion"
                value={formData.justificacion}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={8}
                placeholder="Explique por que es necesaria esta compra, que problema resuelve, etc."
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple ${
                  errors.justificacion ? 'border-red-500' : 'border-border'
                } ${isReadOnly ? 'bg-gray-50 text-text-secondary cursor-not-allowed' : ''}`}
              />
              {errors.justificacion && <p className="text-sm text-red-500 mt-1">{errors.justificacion}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequerimientosPage() {
  const router = useRouter();
  const { usuarioActual, requerimientos } = useCompras();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstados, setFiltroEstados] = useState<EstadoRequerimiento[]>(allEstados);
  const [showFiltroEstados, setShowFiltroEstados] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequerimiento, setSelectedRequerimiento] = useState<Requerimiento | null>(null);
  const [modalReadOnly, setModalReadOnly] = useState(false);

  // Abrir modal para nuevo requerimiento
  const handleNuevoRequerimiento = () => {
    setSelectedRequerimiento(null);
    setModalReadOnly(false);
    setShowModal(true);
  };

  // Abrir modal para ver requerimiento (solo lectura)
  const handleVerRequerimiento = (req: Requerimiento) => {
    setSelectedRequerimiento(req);
    setModalReadOnly(true);
    setShowModal(true);
  };

  // Abrir modal para editar requerimiento
  const handleEditarRequerimiento = (req: Requerimiento) => {
    setSelectedRequerimiento(req);
    setModalReadOnly(false);
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequerimiento(null);
    setModalReadOnly(false);
  };

  // Toggle estado en filtro
  const toggleEstadoFiltro = (estado: EstadoRequerimiento) => {
    setFiltroEstados(prev => {
      if (prev.includes(estado)) {
        if (prev.length === 1) return prev;
        return prev.filter(e => e !== estado);
      }
      return [...prev, estado];
    });
  };

  // Filtrar solo los requerimientos del usuario actual
  const misRequerimientos = useMemo(() => {
    return requerimientos.filter((r) => r.solicitanteId === usuarioActual.id);
  }, [requerimientos, usuarioActual.id]);

  // Aplicar filtros
  const requerimientosFiltrados = useMemo(() => {
    return misRequerimientos.filter((req) => {
      // Filtro de busqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitulo = req.titulo.toLowerCase().includes(query);
        const matchNumero = req.numero.toLowerCase().includes(query);
        const matchDescripcion = req.descripcion.toLowerCase().includes(query);
        if (!matchTitulo && !matchNumero && !matchDescripcion) {
          return false;
        }
      }

      // Filtro de estado (multi-select)
      if (!filtroEstados.includes(req.estado)) {
        return false;
      }

      return true;
    });
  }, [misRequerimientos, searchQuery, filtroEstados]);

  // Helpers para mostrar estado y prioridad
  const getEstadoBadge = (estado: EstadoRequerimiento) => {
    const config: Record<EstadoRequerimiento, { label: string; className: string }> = {
      BORRADOR: { label: 'Borrador', className: 'bg-gray-100 text-gray-700' },
      PENDIENTE_APROBACION: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700' },
      APROBADO: { label: 'Aprobado', className: 'bg-green-100 text-green-700' },
      RECHAZADO: { label: 'Rechazado', className: 'bg-red-100 text-red-700' },
      OC_GENERADA: { label: 'OC Generada', className: 'bg-blue-100 text-blue-700' },
      RECIBIDO: { label: 'Recibido', className: 'bg-purple-100 text-purple-700' },
    };
    return config[estado];
  };

  const getPrioridadBadge = (prioridad: Prioridad) => {
    const config: Record<Prioridad, { label: string; className: string }> = {
      BAJA: { label: 'Baja', className: 'bg-gray-100 text-gray-600' },
      NORMAL: { label: 'Normal', className: 'bg-blue-100 text-blue-600' },
      ALTA: { label: 'Alta', className: 'bg-orange-100 text-orange-600' },
      URGENTE: { label: 'Urgente', className: 'bg-red-100 text-red-600' },
    };
    return config[prioridad];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Mis Requerimientos"
        subtitle={`${misRequerimientos.length} requerimiento${misRequerimientos.length !== 1 ? 's' : ''} en total`}
        action={
          <Button onClick={handleNuevoRequerimiento}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Requerimiento
          </Button>
        }
      />

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por titulo, numero o descripcion..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">Filtros:</span>
            </div>

            {/* Boton filtro estados */}
            <button
              onClick={() => setShowFiltroEstados(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-gray-50 transition-colors"
            >
              <Flag className="w-4 h-4 text-text-secondary" />
              <span className="text-sm text-text-primary">Estados</span>
              <span className="px-1.5 py-0.5 bg-palette-purple/10 text-palette-purple text-xs font-medium rounded">
                {filtroEstados.length}
              </span>
            </button>

            {/* Limpiar filtros */}
            {filtroEstados.length < allEstados.length && (
              <button
                onClick={() => setFiltroEstados(allEstados)}
                className="text-xs text-text-secondary hover:text-palette-purple"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grilla */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {requerimientosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            {searchQuery || filtroEstados.length < allEstados.length ? (
              <>
                <p className="text-text-primary font-medium">
                  No se encontraron requerimientos
                </p>
                <p className="text-text-secondary text-sm mt-2">
                  Intenta ajustar los filtros de busqueda
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFiltroEstados(allEstados);
                  }}
                  className="mt-4 text-palette-purple hover:text-palette-dark font-medium"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <p className="text-text-primary font-medium">
                  No tienes requerimientos aun
                </p>
                <p className="text-text-secondary text-sm mt-2">
                  Comienza creando tu primer requerimiento
                </p>
                <Button
                  onClick={handleNuevoRequerimiento}
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Requerimiento
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requerimientosFiltrados.map((req) => {
                  const estadoBadge = getEstadoBadge(req.estado);
                  const prioridadBadge = getPrioridadBadge(req.prioridad);
                  const canEdit = req.estado === 'BORRADOR';
                  const canSend = req.estado === 'BORRADOR';
                  const canDelete = req.estado === 'BORRADOR';

                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-palette-purple">
                        {req.numero}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary max-w-xs truncate">
                        {req.titulo}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadge.className}`}>
                          {estadoBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${prioridadBadge.className}`}>
                          {prioridadBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {req.categoria}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">
                        {formatCurrency(req.montoEstimado, req.moneda)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatDate(req.fechaCreacion)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          {/* Ver detalle */}
                          <button
                            onClick={() => handleVerRequerimiento(req)}
                            className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          {canEdit && (
                            <button
                              onClick={() => handleEditarRequerimiento(req)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Enviar a aprobación */}
                          {canSend && (
                            <button
                              onClick={() => {
                                // TODO: implementar envío a aprobación
                                console.log('Enviar a aprobación:', req.id);
                              }}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Enviar a aprobación"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Eliminar */}
                          {canDelete && (
                            <button
                              onClick={() => {
                                // TODO: implementar eliminación
                                console.log('Eliminar:', req.id);
                              }}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Summary */}
      {requerimientosFiltrados.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>Mostrando {requerimientosFiltrados.length} requerimiento{requerimientosFiltrados.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Modal filtro estados */}
      <FiltroEstadosModal
        isOpen={showFiltroEstados}
        onClose={() => setShowFiltroEstados(false)}
        selectedEstados={filtroEstados}
        onToggle={toggleEstadoFiltro}
      />

      {/* Modal requerimiento (nuevo / ver / editar) */}
      <RequerimientoModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={() => {}}
        requerimiento={selectedRequerimiento}
        readOnly={modalReadOnly}
      />
    </div>
  );
}
