'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCompras } from '@/lib/compras-context';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { RequerimientoModal } from '@/components/compras/RequerimientoModal';
import { EstadoRequerimiento, Prioridad, Requerimiento } from '@/types/compras';
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
  Filter,
  Flag,
  X,
  Clock,
  FileEdit,
  FileCheck,
  PackageCheck,
  Sparkles,
  GitBranch,
  MessageCircle,
} from 'lucide-react';
import CircuitoCompraModal, { useCircuitoCompraModal } from '@/components/compras/CircuitoCompraModal';
import { PurchaseRequestChatButton, PurchaseRequestChatDrawer } from '@/components/chat';
import { usePurchaseRequestChatUnreadCounts } from '@/hooks/usePurchaseRequestChat';

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

export default function RequerimientosPage() {
  const router = useRouter();
  const { usuarioActual, requerimientos, actualizarRequerimiento, refreshRequerimientos, ordenesCompra } = useCompras();
  const { token, tenant } = useAuth();

  // Calcular progreso de OC para un requerimiento
  const calcularProgresoOC = (req: Requerimiento) => {
    // Total de items del requerimiento
    const totalItems = req.items?.reduce((sum, item) => sum + Number(item.cantidad || 0), 0) || 0;

    // Buscar OCs de este requerimiento y sumar cantidades
    const ocsDelRequerimiento = ordenesCompra.filter(oc => oc.requerimientoId === req.id);
    const itemsEnOC = ocsDelRequerimiento.reduce((sum, oc) => {
      return sum + oc.items.reduce((s, item) => s + Number(item.cantidad || 0), 0);
    }, 0);

    // Obtener la última OC (más reciente)
    const ultimaOC = ocsDelRequerimiento.length > 0
      ? ocsDelRequerimiento.sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime())[0]
      : null;

    const porcentajeCalculado = totalItems > 0 ? Math.round((itemsEnOC / totalItems) * 100) : 0;
    return {
      porcentaje: Math.min(porcentajeCalculado, 100), // Nunca mostrar más de 100%
      enOC: Math.round(itemsEnOC * 100) / 100,
      total: Math.round(totalItems * 100) / 100,
      tieneOC: ocsDelRequerimiento.length > 0,
      ultimaOC,
      ocRechazada: ultimaOC?.estado === 'RECHAZADA',
      motivoRechazo: ultimaOC?.comentarioAprobacionOC,
    };
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstados, setFiltroEstados] = useState<EstadoRequerimiento[]>(allEstados);
  const [showFiltroEstados, setShowFiltroEstados] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequerimiento, setSelectedRequerimiento] = useState<Requerimiento | null>(null);
  const [modalReadOnly, setModalReadOnly] = useState(false);
  const [modalValidateOnOpen, setModalValidateOnOpen] = useState(false);

  // Hook para el modal de circuito de compra
  const circuitoModal = useCircuitoCompraModal();

  // Estados para el chat
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [selectedChatReq, setSelectedChatReq] = useState<Requerimiento | null>(null);

  // Validar requerimiento antes de enviar
  const validarRequerimiento = (req: Requerimiento): { valid: boolean; camposFaltantes: string[] } => {
    const camposFaltantes: string[] = [];

    if (!req.titulo?.trim()) camposFaltantes.push('Título');
    if (!req.descripcion?.trim()) camposFaltantes.push('Descripción');
    if (!req.centroCostos) camposFaltantes.push('Centro de costos');
    if (!req.categoria) camposFaltantes.push('Categoría');
    if (!req.justificacion?.trim()) camposFaltantes.push('Justificación');
    if (!req.items || req.items.length === 0 || req.items.every((i) => !i.descripcion)) {
      camposFaltantes.push('Items');
    }
    // Si requiere aprobación de especificaciones, debe tener adjuntos
    if (req.requiereAprobacionEspecificaciones && (!req.adjuntos || req.adjuntos.length === 0)) {
      camposFaltantes.push('Adjuntos (requeridos para aprobación de especificaciones)');
    }

    return { valid: camposFaltantes.length === 0, camposFaltantes };
  };

  // Enviar requerimiento a aprobación desde la grilla
  const handleEnviarAprobacion = async (req: Requerimiento) => {
    // Validar campos requeridos
    const validacion = validarRequerimiento(req);
    if (!validacion.valid) {
      toast.error(`Complete los campos requeridos: ${validacion.camposFaltantes.join(', ')}`);
      // Abrir el modal en modo edición con validación activa para mostrar errores
      setModalValidateOnOpen(true);
      setSelectedRequerimiento(req);
      setModalReadOnly(false);
      setShowModal(true);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/purchase-requests/${req.id}/submit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId: tenant?.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'NO_ATTACHMENTS_FOR_SPECS') {
          toast.error('El requerimiento requiere aprobación de especificaciones pero no tiene documentos adjuntos');
        } else {
          toast.error(errorData.error || 'Error al enviar a aprobación');
        }
        return;
      }

      toast.success(`Requerimiento ${req.numero} enviado a aprobación`);
      await refreshRequerimientos();
    } catch (error) {
      toast.error('Error al enviar a aprobación');
      console.error('Error:', error);
    }
  };

  // Eliminar requerimiento
  const handleEliminarRequerimiento = async (req: Requerimiento) => {
    if (!confirm(`¿Está seguro de eliminar el requerimiento ${req.numero}?`)) {
      return;
    }

    try {
      // TODO: Llamar al backend para eliminar
      // await fetch(`/api/purchase-requests/${req.id}`, { method: 'DELETE' });
      toast.success(`Requerimiento ${req.numero} eliminado`);
      refreshRequerimientos();
    } catch (error) {
      toast.error('Error al eliminar requerimiento');
      console.error('Error:', error);
    }
  };

  // Abrir modal para nuevo requerimiento
  const handleNuevoRequerimiento = () => {
    setModalValidateOnOpen(false);
    setSelectedRequerimiento(null);
    setModalReadOnly(false);
    setShowModal(true);
  };

  // Abrir modal para ver requerimiento (solo lectura)
  const handleVerRequerimiento = (req: Requerimiento) => {
    setModalValidateOnOpen(false);
    setSelectedRequerimiento(req);
    setModalReadOnly(true);
    setShowModal(true);
  };

  // Abrir modal para editar requerimiento
  const handleEditarRequerimiento = (req: Requerimiento) => {
    setModalValidateOnOpen(false);
    setSelectedRequerimiento(req);
    setModalReadOnly(false);
    setShowModal(true);
  };

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequerimiento(null);
    setModalReadOnly(false);
    setModalValidateOnOpen(false);
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

  // Determinar si el usuario es administrador de compras
  const esAdminCompras = usuarioActual.rol === 'ADMIN';

  // Filtrar requerimientos: Admin ve todos, otros usuarios solo los propios
  const misRequerimientos = useMemo(() => {
    if (esAdminCompras) {
      // Admin de compras ve todos los requerimientos
      return requerimientos;
    }
    // Usuarios normales solo ven sus propios requerimientos
    return requerimientos.filter((r) => r.solicitanteId === usuarioActual.id);
  }, [requerimientos, usuarioActual.id, esAdminCompras]);

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

  // IDs de requerimientos que no están en borrador (pueden tener chat)
  const reqIdsForChat = useMemo(() => {
    return requerimientosFiltrados
      .filter(r => r.estado !== 'BORRADOR')
      .map(r => r.id);
  }, [requerimientosFiltrados]);

  // Hook para contadores de mensajes no leídos
  const { counts: unreadCounts, refresh: refreshUnreadCounts } = usePurchaseRequestChatUnreadCounts(reqIdsForChat);

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

  const getPrioridadBadge = (prioridad: Prioridad | string) => {
    const config: Record<string, { label: string; className: string }> = {
      BAJA: { label: 'Baja', className: 'bg-gray-100 text-gray-600' },
      baja: { label: 'Baja', className: 'bg-gray-100 text-gray-600' },
      NORMAL: { label: 'Normal', className: 'bg-blue-100 text-blue-600' },
      normal: { label: 'Normal', className: 'bg-blue-100 text-blue-600' },
      ALTA: { label: 'Alta', className: 'bg-orange-100 text-orange-600' },
      alta: { label: 'Alta', className: 'bg-orange-100 text-orange-600' },
      URGENTE: { label: 'Urgente', className: 'bg-red-100 text-red-600' },
      urgente: { label: 'Urgente', className: 'bg-red-100 text-red-600' },
    };
    return config[prioridad] || { label: prioridad, className: 'bg-gray-100 text-gray-600' };
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
        title="Requerimientos"
        subtitle={esAdminCompras
          ? `${misRequerimientos.length} requerimiento${misRequerimientos.length !== 1 ? 's' : ''} de todos los usuarios`
          : `${misRequerimientos.length} requerimiento${misRequerimientos.length !== 1 ? 's' : ''} en total`
        }
        icon={ClipboardList}
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
                    OC
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
                  const canEdit = req.estado === 'BORRADOR' || req.estado === 'PENDIENTE_APROBACION';
                  const canSend = req.estado === 'BORRADOR';
                  const canDelete = req.estado === 'BORRADOR' || req.estado === 'PENDIENTE_APROBACION';

                  return (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-palette-purple">
                        <div className="flex items-center gap-2">
                          {req.numero}
                          {req.creadoPorIA && (
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 bg-purple-100 rounded-full"
                              title="Generado por IA"
                            >
                              <Sparkles className="w-3 h-3 text-purple-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-text-primary max-w-xs truncate">{req.titulo}</div>
                        {esAdminCompras && (
                          <div className="text-xs text-text-secondary mt-0.5">{req.solicitante?.nombre || 'N/A'}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadge.className}`}>
                          {estadoBadge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const progresoOC = calcularProgresoOC(req);
                          // Solo mostrar si el requerimiento está aprobado o tiene OC
                          if (req.estado === 'BORRADOR' || req.estado === 'PENDIENTE_APROBACION' || req.estado === 'RECHAZADO') {
                            return <span className="text-xs text-gray-400">-</span>;
                          }

                          // Mostrar si la última OC fue rechazada
                          if (progresoOC.ocRechazada) {
                            return (
                              <div className="relative group">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 cursor-help">
                                  <XCircle className="w-3 h-3" />
                                  Rechazada
                                </span>
                                {progresoOC.motivoRechazo && (
                                  <div className="absolute z-50 bottom-full left-0 mb-2 hidden group-hover:block w-56">
                                    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
                                      <p className="font-semibold mb-1">OC Rechazada:</p>
                                      <p>{progresoOC.motivoRechazo}</p>
                                      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div className="w-16">
                              <div className="flex items-center justify-center text-xs mb-1">
                                <span className={`font-medium ${
                                  progresoOC.porcentaje === 100 ? 'text-green-600' :
                                  progresoOC.porcentaje > 0 ? 'text-orange-600' :
                                  'text-gray-500'
                                }`}>
                                  {progresoOC.porcentaje}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    progresoOC.porcentaje === 100 ? 'bg-green-500' :
                                    progresoOC.porcentaje > 0 ? 'bg-orange-500' :
                                    'bg-gray-300'
                                  }`}
                                  style={{ width: `${progresoOC.porcentaje}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
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

                          {/* Ver circuito */}
                          <button
                            onClick={() => circuitoModal.openFromRequerimiento(req.id)}
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Ver circuito de compra"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>

                          {/* Chat - solo si no es borrador */}
                          {req.estado !== 'BORRADOR' && (
                            <PurchaseRequestChatButton
                              purchaseRequestId={req.id}
                              purchaseRequestNumber={req.numero}
                              unreadCount={unreadCounts[req.id] || 0}
                              onClick={() => {
                                setSelectedChatReq(req);
                                setChatDrawerOpen(true);
                              }}
                            />
                          )}

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
                              onClick={() => handleEnviarAprobacion(req)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Enviar a aprobación"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Eliminar */}
                          {canDelete && (
                            <button
                              onClick={() => handleEliminarRequerimiento(req)}
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
        validateOnOpen={modalValidateOnOpen}
      />

      {/* Modal circuito de compra */}
      <CircuitoCompraModal
        isOpen={circuitoModal.modalState.isOpen}
        onClose={circuitoModal.close}
        requerimientoId={circuitoModal.modalState.requerimientoId}
        ordenCompraId={circuitoModal.modalState.ordenCompraId}
        recepcionId={circuitoModal.modalState.recepcionId}
      />

      {/* Drawer de chat */}
      {selectedChatReq && (
        <PurchaseRequestChatDrawer
          purchaseRequestId={selectedChatReq.id}
          purchaseRequestNumber={selectedChatReq.numero}
          isOpen={chatDrawerOpen}
          onClose={() => {
            setChatDrawerOpen(false);
            setSelectedChatReq(null);
            // Refrescar contadores para actualizar el badge en la grilla
            refreshUnreadCounts();
          }}
        />
      )}
    </div>
  );
}
