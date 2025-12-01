'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useCompras } from '@/lib/compras-context';
import { useParametros } from '@/hooks/compras';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { AdjuntosUpload } from '@/components/compras/AdjuntosUpload';
import { ItemsTable } from '@/components/compras/ItemsTable';
import { Prioridad, Requerimiento, ItemRequerimiento, Adjunto } from '@/types/compras';
import {
  X,
  Save,
  Send,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  Clock
} from 'lucide-react';

import type { AdjuntoFile } from '@/components/compras/AdjuntosUpload';

// Tabs del modal
type TabId = 'general' | 'items' | 'adjuntos' | 'justificacion' | 'ia';

const tabs: { id: TabId; label: string }[] = [
  { id: 'general', label: 'Informacion General' },
  { id: 'items', label: 'Items' },
  { id: 'adjuntos', label: 'Documentacion' },
  { id: 'justificacion', label: 'Justificacion' },
];

interface RequerimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  requerimiento?: Requerimiento | null;
  readOnly?: boolean;
  validateOnOpen?: boolean;
  // Modo aprobación
  approvalMode?: boolean;
  onAprobar?: () => void;
  onRechazar?: () => void;
}

export function RequerimientoModal({
  isOpen,
  onClose,
  onSuccess,
  requerimiento,
  readOnly = false,
  validateOnOpen = false,
  approvalMode = false,
  onAprobar,
  onRechazar,
}: RequerimientoModalProps) {
  const { agregarRequerimiento, actualizarRequerimiento, refreshRequerimientos } = useCompras();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const { centrosCostos, categorias, prioridades } = useParametros();
  const { token, tenant } = useAuth();

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
  const [requiereAprobacionEspecificaciones, setRequiereAprobacionEspecificaciones] = useState(false);
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
        justificacion: requerimiento.justificacion || '',
      });
      setItems(requerimiento.items.length > 0 ? requerimiento.items : [{
        id: 'item-1',
        descripcion: '',
        cantidad: 1,
        unidad: 'Unidad',
        precioUnitario: 0,
        total: 0,
      }]);
      // Convertir adjuntos existentes al formato del modal (ya están subidos)
      setAdjuntos(requerimiento.adjuntos.map(adj => ({
        id: adj.id,
        nombre: adj.nombre,
        tamanio: adj.tamanio,
        tipo: adj.tipo,
        url: adj.url,
        esEspecificacion: adj.esEspecificacion,
        estado: adj.estado,
        uploaded: true,  // Ya están en el servidor
      })));

      // Cargar el flag de especificaciones
      setRequiereAprobacionEspecificaciones(requerimiento.requiereAprobacionEspecificaciones || false);

      // Si se abre para enviar, validar inmediatamente para mostrar errores
      if (validateOnOpen) {
        setTimeout(() => {
          const newErrors: Record<string, string> = {};
          if (!requerimiento.titulo?.trim()) newErrors.titulo = 'Título';
          if (!requerimiento.descripcion?.trim()) newErrors.descripcion = 'Descripción';
          if (!requerimiento.centroCostos) newErrors.centroCostos = 'Centro de costos';
          if (!requerimiento.categoria) newErrors.categoria = 'Categoría';
          if (!requerimiento.justificacion?.trim()) newErrors.justificacion = 'Justificación';
          if (!requerimiento.items || requerimiento.items.length === 0 || requerimiento.items.every((i) => !i.descripcion)) {
            newErrors.items = 'Items';
          }
          setErrors(newErrors);
        }, 0);
      } else {
        setErrors({});
      }
    } else if (isOpen && !requerimiento) {
      resetForm();
    }
  }, [isOpen, requerimiento, validateOnOpen]);

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
    setRequiereAprobacionEspecificaciones(false);
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

  const validateForm = (): { valid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    if (!formData.titulo?.trim()) {
      newErrors.titulo = 'Título';
    }
    if (!formData.descripcion?.trim()) {
      newErrors.descripcion = 'Descripción';
    }
    if (!formData.centroCostos) {
      newErrors.centroCostos = 'Centro de costos';
    }
    if (!formData.categoria) {
      newErrors.categoria = 'Categoría';
    }
    if (!formData.justificacion?.trim()) {
      newErrors.justificacion = 'Justificación';
    }
    if (items.length === 0 || items.every((i) => !i.descripcion)) {
      newErrors.items = 'Items';
    }

    setErrors(newErrors);
    return { valid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleSubmit = async (enviar: boolean) => {
    if (enviar) {
      const validation = validateForm();
      if (!validation.valid) {
        const camposFaltantes = Object.values(validation.errors).join(', ');
        toast.error(`Complete los campos requeridos: ${camposFaltantes}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const adjuntosFinal: Adjunto[] = adjuntos.map((adj) => ({
        id: adj.id,
        nombre: adj.nombre,
        tipo: adj.tipo,
        tamanio: adj.tamanio,
        url: adj.url || `/mock/${adj.nombre}`,
        fechaSubida: new Date(),
        estado: 'PENDIENTE' as const,
        esEspecificacion: adj.esEspecificacion,
      }));

      const montoTotal = items.reduce((sum, item) => sum + item.total, 0);
      const itemsValidos = items.filter((i) => i.descripcion.trim() !== '');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      if (isEditing && requerimiento) {
        const datosActualizados = {
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          justificacion: formData.justificacion,
          centroCostos: formData.centroCostos,
          categoria: formData.categoria,
          prioridad: formData.prioridad,
          montoEstimado: montoTotal,
          fechaNecesidad: formData.fechaNecesaria || null,
          estado: enviar ? 'PENDIENTE_APROBACION' : requerimiento.estado,
          requiresSpecApproval: requiereAprobacionEspecificaciones,
          items: itemsValidos.map(item => ({
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            unidadMedida: item.unidad,
            precioEstimado: item.precioUnitario,
          })),
          // Incluir adjuntos en la actualización
          adjuntos: adjuntos.map(adj => ({
            id: adj.id,
            nombre: adj.nombre,
            tipo: adj.tipo,
            tamanio: adj.tamanio,
            url: adj.url || `/uploads/${adj.nombre}`,
            esEspecificacion: adj.esEspecificacion || false,
            estado: adj.estado || 'PENDIENTE',
          })),
        };

        const response = await fetch(`${apiUrl}/api/purchase-requests/${requerimiento.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(datosActualizados),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al actualizar el requerimiento');
        }

        toast.success(enviar ? 'Requerimiento enviado a aprobación' : 'Requerimiento guardado');
        await refreshRequerimientos();
      } else {
        const nuevoReq = {
          tenantId: tenant?.id,
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          justificacion: formData.justificacion,
          centroCostos: formData.centroCostos,
          categoria: formData.categoria || 'Otros',
          prioridad: formData.prioridad,
          montoEstimado: montoTotal,
          fechaNecesidad: formData.fechaNecesaria || null,
          items: itemsValidos.map(item => ({
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            unidadMedida: item.unidad,
            precioEstimado: item.precioUnitario,
          })),
        };

        const response = await fetch(`${apiUrl}/api/purchase-requests`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(nuevoReq),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error al crear el requerimiento');
        }

        const result = await response.json();
        toast.success(`Requerimiento ${result.numero} creado`);

        if (enviar && result.id) {
          await fetch(`${apiUrl}/api/purchase-requests/${result.id}/submit`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          toast.success('Requerimiento enviado a aprobación');
        }

        await refreshRequerimientos();
      }

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error al guardar requerimiento:', error);
      toast.error(error instanceof Error ? error.message : 'Error al guardar requerimiento');
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
            {/* Modo aprobación: mostrar botones Aprobar/Rechazar */}
            {approvalMode && requerimiento?.estado === 'PENDIENTE_APROBACION' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRechazar}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onAprobar}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
              </>
            )}
            {/* Modo edición: mostrar botones Guardar/Enviar */}
            {!isReadOnly && !approvalMode && (
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
                {(!isEditing || requerimiento?.estado === 'BORRADOR' || requerimiento?.estado === 'PENDIENTE_APROBACION') && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {requerimiento?.estado === 'PENDIENTE_APROBACION' ? 'Reenviar' : 'Enviar'}
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
          {tabs.map((tab) => {
            const tabErrors: Record<TabId, string[]> = {
              general: ['titulo', 'descripcion', 'centroCostos', 'categoria'],
              items: ['items'],
              adjuntos: [],
              justificacion: ['justificacion'],
              ia: [],
            };
            const hasError = tabErrors[tab.id].some((field) => errors[field]);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'text-palette-purple'
                    : hasError
                    ? 'text-red-600'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
                {hasError && (
                  <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-white text-xs rounded-full">
                    !
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${hasError ? 'bg-red-500' : 'bg-palette-purple'}`} />
                )}
              </button>
            );
          })}
          {/* Tab de IA - solo si fue creado por IA */}
          {requerimiento?.creadoPorIA && (
            <button
              onClick={() => setActiveTab('ia')}
              className={`px-6 py-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                activeTab === 'ia'
                  ? 'text-palette-purple'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Generado por IA
              {activeTab === 'ia' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-palette-purple" />
              )}
            </button>
          )}
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
              {/* Switch: Requiere aprobación de especificaciones */}
              <div className={`flex items-center justify-between p-4 rounded-lg border ${
                requiereAprobacionEspecificaciones
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${requiereAprobacionEspecificaciones ? 'bg-amber-100' : 'bg-gray-200'}`}>
                    <ShieldCheck className={`w-5 h-5 ${requiereAprobacionEspecificaciones ? 'text-amber-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      Requiere aprobación de especificaciones
                    </p>
                    <p className="text-xs text-text-secondary">
                      {requiereAprobacionEspecificaciones
                        ? 'Las especificaciones técnicas deben ser aprobadas antes de generar la OC'
                        : 'Los documentos adjuntos no requieren aprobación adicional'}
                    </p>
                  </div>
                </div>
                {!isReadOnly ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={requiereAprobacionEspecificaciones}
                    onClick={() => setRequiereAprobacionEspecificaciones(!requiereAprobacionEspecificaciones)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      requiereAprobacionEspecificaciones ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow ${
                        requiereAprobacionEspecificaciones ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                ) : (
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    requiereAprobacionEspecificaciones
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {requiereAprobacionEspecificaciones ? 'Sí' : 'No'}
                  </span>
                )}
              </div>

              {/* Estado de aprobación de especificaciones (solo lectura cuando aplica) */}
              {isReadOnly && requiereAprobacionEspecificaciones && requerimiento && (
                <div className={`p-3 rounded-lg border flex items-start gap-3 ${
                  requerimiento.especificacionesAprobadas
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  {requerimiento.especificacionesAprobadas ? (
                    <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      requerimiento.especificacionesAprobadas ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {requerimiento.especificacionesAprobadas
                        ? 'Especificaciones aprobadas'
                        : 'Especificaciones pendientes de aprobación'}
                    </p>
                    {requerimiento.especificacionesAprobadas && requerimiento.aprobadorEspecificaciones && (
                      <p className="text-xs text-green-600 mt-0.5">
                        Aprobado por {requerimiento.aprobadorEspecificaciones.nombre}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Lista de adjuntos */}
              <AdjuntosUpload
                adjuntos={adjuntos}
                onAdjuntosChange={setAdjuntos}
                purchaseRequestId={requerimiento?.id}
                readonly={isReadOnly}
              />
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

          {/* Tab: IA */}
          {activeTab === 'ia' && requerimiento?.creadoPorIA && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-purple-900">Requerimiento generado por IA</h4>
                  <p className="text-sm text-purple-700">Este requerimiento fue creado utilizando el asistente de inteligencia artificial.</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Prompt Original
                </label>
                <div className="p-4 bg-gray-50 rounded-lg border border-border">
                  <p className="text-sm text-text-primary whitespace-pre-wrap">
                    {requerimiento.promptOriginal || 'No se registró el prompt original.'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-text-secondary">
                <p>El asistente de IA interpretó este mensaje y generó automáticamente los datos del requerimiento.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
