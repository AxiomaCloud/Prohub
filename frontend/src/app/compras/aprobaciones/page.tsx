'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCompras } from '@/lib/compras-context';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { AprobacionModal } from '@/components/compras/AprobacionModal';
import { EspecificacionesModal } from '@/components/compras/EspecificacionesModal';
import { RequerimientoModal } from '@/components/compras/RequerimientoModal';
import { EstadoRequerimiento, Prioridad, Requerimiento } from '@/types/compras';
import {
  Search,
  ClipboardList,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  Flag,
  X,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  GitBranch,
  FileText,
  ShoppingCart,
} from 'lucide-react';
import CircuitoCompraModal, { useCircuitoCompraModal } from '@/components/compras/CircuitoCompraModal';
import { PurchaseRequestChatButton, PurchaseRequestChatDrawer } from '@/components/chat';
import { usePurchaseRequestChatUnreadCounts } from '@/hooks/usePurchaseRequestChat';

// Tipos de documento
type TipoDocumento = 'TODOS' | 'REQUERIMIENTO' | 'ORDEN_COMPRA';

// Tipo unificado para documentos aprobables
interface DocumentoAprobable {
  id: string;
  tipo: 'REQUERIMIENTO' | 'ORDEN_COMPRA';
  numero: string;
  titulo: string;
  solicitante: string;
  estado: string;
  prioridad: string;
  monto: number;
  moneda: string;
  fecha: Date;
  // Campos específicos de requerimientos
  requiereAprobacionEspecificaciones?: boolean;
  especificacionesAprobadas?: boolean;
  creadoPorIA?: boolean;
  // Campos específicos de OCs
  proveedor?: string;
  // Datos originales para modales
  requerimientoOriginal?: Requerimiento;
  ocOriginal?: any;
}

// Configuracion de estados para el filtro
const estadosConfig: { id: EstadoRequerimiento; label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'PENDIENTE_APROBACION', label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Clock },
  { id: 'APROBADO', label: 'Aprobado', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  { id: 'RECHAZADO', label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
];

const defaultEstados: EstadoRequerimiento[] = ['PENDIENTE_APROBACION'];
const allEstados: EstadoRequerimiento[] = ['PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO'];

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

export default function AprobacionesPage() {
  const router = useRouter();
  const { usuarioActual, requerimientos, refreshRequerimientos, ordenesCompra, refreshOrdenesCompra } = useCompras();
  const { token, tenant } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstados, setFiltroEstados] = useState<EstadoRequerimiento[]>(defaultEstados);
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento>('TODOS');
  const [showFiltroEstados, setShowFiltroEstados] = useState(false);
  const [selectedRequerimiento, setSelectedRequerimiento] = useState<Requerimiento | null>(null);
  const [selectedOC, setSelectedOC] = useState<any | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [showAprobacionModal, setShowAprobacionModal] = useState(false);
  const [modalTipo, setModalTipo] = useState<'aprobar' | 'rechazar'>('aprobar');
  const [showEspecificacionesModal, setShowEspecificacionesModal] = useState(false);
  const [especificacionesTipo, setEspecificacionesTipo] = useState<'aprobar' | 'rechazar'>('aprobar');
  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<DocumentoAprobable | null>(null);

  // Hook para el modal de circuito de compra
  const circuitoModal = useCircuitoCompraModal();

  // Estados para el chat
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [selectedChatReq, setSelectedChatReq] = useState<Requerimiento | null>(null);

  // Verificar que el usuario es aprobador o admin
  const puedeAprobar = usuarioActual.rol === 'APROBADOR' || usuarioActual.rol === 'ADMIN';

  // Refrescar datos al cargar
  useEffect(() => {
    refreshOrdenesCompra();
  }, []);

  // Combinar requerimientos y OCs en lista unificada
  const documentosAprobables = useMemo(() => {
    const docs: DocumentoAprobable[] = [];

    // Agregar requerimientos
    requerimientos
      .filter(r => ['PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO'].includes(r.estado))
      .forEach(req => {
        docs.push({
          id: req.id,
          tipo: 'REQUERIMIENTO',
          numero: req.numero,
          titulo: req.titulo,
          solicitante: req.solicitante?.nombre || 'N/A',
          estado: req.estado,
          prioridad: req.prioridad || 'NORMAL',
          monto: req.montoEstimado || 0,
          moneda: req.moneda || 'ARS',
          fecha: req.fechaCreacion,
          requiereAprobacionEspecificaciones: req.requiereAprobacionEspecificaciones,
          especificacionesAprobadas: req.especificacionesAprobadas,
          creadoPorIA: req.creadoPorIA,
          requerimientoOriginal: req,
        });
      });

    // Agregar OCs
    (ordenesCompra || [])
      .filter((oc: any) => ['PENDIENTE_APROBACION', 'APROBADA', 'RECHAZADA'].includes(oc.estado))
      .forEach((oc: any) => {
        // Mapear estados de OC a formato común
        let estadoComun = oc.estado;
        if (oc.estado === 'APROBADA') estadoComun = 'APROBADO';
        if (oc.estado === 'RECHAZADA') estadoComun = 'RECHAZADO';

        docs.push({
          id: oc.id,
          tipo: 'ORDEN_COMPRA',
          numero: oc.numero,
          titulo: oc.requerimiento?.titulo || 'Orden de Compra',
          solicitante: oc.creadoPor?.nombre || oc.requerimiento?.solicitante?.nombre || 'N/A',
          estado: estadoComun,
          prioridad: oc.requerimiento?.prioridad || 'NORMAL',
          monto: oc.total || 0,
          moneda: oc.moneda || 'ARS',
          fecha: oc.fechaEmision || oc.createdAt,
          proveedor: oc.proveedor?.nombre,
          ocOriginal: oc,
        });
      });

    // Ordenar por fecha descendente
    docs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return docs;
  }, [requerimientos, ordenesCompra]);

  // Aplicar filtros
  const documentosFiltrados = useMemo(() => {
    return documentosAprobables.filter((doc) => {
      // Filtro de búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitulo = doc.titulo.toLowerCase().includes(query);
        const matchNumero = doc.numero.toLowerCase().includes(query);
        const matchSolicitante = doc.solicitante.toLowerCase().includes(query);
        const matchProveedor = doc.proveedor?.toLowerCase().includes(query);
        if (!matchTitulo && !matchNumero && !matchSolicitante && !matchProveedor) {
          return false;
        }
      }

      // Filtro de tipo de documento
      if (filtroTipo !== 'TODOS' && doc.tipo !== filtroTipo) {
        return false;
      }

      // Filtro de estado
      if (!filtroEstados.includes(doc.estado as EstadoRequerimiento)) {
        return false;
      }

      return true;
    });
  }, [documentosAprobables, searchQuery, filtroTipo, filtroEstados]);

  // Obtener IDs de requerimientos para contadores de chat
  const reqIds = useMemo(() =>
    documentosFiltrados
      .filter(d => d.tipo === 'REQUERIMIENTO')
      .map(d => d.id),
    [documentosFiltrados]
  );
  const { counts: chatUnreadCounts, refresh: refreshChatUnreadCounts } = usePurchaseRequestChatUnreadCounts(reqIds);

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

  // Helpers para mostrar estado y prioridad
  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { label: string; className: string }> = {
      PENDIENTE_APROBACION: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700' },
      APROBADO: { label: 'Aprobado', className: 'bg-green-100 text-green-700' },
      RECHAZADO: { label: 'Rechazado', className: 'bg-red-100 text-red-700' },
    };
    return config[estado] || { label: estado, className: 'bg-gray-100 text-gray-700' };
  };

  const getPrioridadBadge = (prioridad: Prioridad | string) => {
    const config: Record<string, { label: string; className: string }> = {
      BAJA: { label: 'Baja', className: 'bg-gray-100 text-gray-600' },
      NORMAL: { label: 'Normal', className: 'bg-blue-100 text-blue-600' },
      ALTA: { label: 'Alta', className: 'bg-orange-100 text-orange-600' },
      URGENTE: { label: 'Urgente', className: 'bg-red-100 text-red-600' },
    };
    const key = (prioridad || 'NORMAL').toUpperCase();
    return config[key] || { label: prioridad, className: 'bg-gray-100 text-gray-600' };
  };

  const getTipoBadge = (tipo: 'REQUERIMIENTO' | 'ORDEN_COMPRA') => {
    if (tipo === 'REQUERIMIENTO') {
      return {
        label: 'REQ',
        className: 'bg-blue-100 text-blue-700 border border-blue-200',
        icon: FileText,
        fullLabel: 'Requerimiento',
      };
    }
    return {
      label: 'OC',
      className: 'bg-purple-100 text-purple-700 border border-purple-200',
      icon: ShoppingCart,
      fullLabel: 'Orden de Compra',
    };
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

  // Acciones
  const handleVerDetalle = (doc: DocumentoAprobable) => {
    if (doc.tipo === 'REQUERIMIENTO' && doc.requerimientoOriginal) {
      setSelectedRequerimiento(doc.requerimientoOriginal);
      setShowDetalleModal(true);
    } else if (doc.tipo === 'ORDEN_COMPRA' && doc.ocOriginal) {
      // Para OCs, abrir el circuito de compra
      circuitoModal.openFromOrdenCompra(doc.id);
    }
  };

  const handleOpenAprobacion = (doc: DocumentoAprobable, tipo: 'aprobar' | 'rechazar') => {
    setDocumentoSeleccionado(doc);
    if (doc.tipo === 'REQUERIMIENTO' && doc.requerimientoOriginal) {
      setSelectedRequerimiento(doc.requerimientoOriginal);
    } else if (doc.tipo === 'ORDEN_COMPRA' && doc.ocOriginal) {
      setSelectedOC(doc.ocOriginal);
    }
    setModalTipo(tipo);
    setShowDetalleModal(false);
    setShowAprobacionModal(true);
  };

  const handleAprobar = async (comentario: string) => {
    if (!documentoSeleccionado) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      let endpoint = '';
      if (documentoSeleccionado.tipo === 'REQUERIMIENTO') {
        endpoint = `/api/purchase-requests/${documentoSeleccionado.id}/approve`;
      } else {
        endpoint = `/api/approval-workflows/document/PURCHASE_ORDER/${documentoSeleccionado.id}/approve`;
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: documentoSeleccionado.tipo === 'REQUERIMIENTO' ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenant?.id || '',
        },
        body: JSON.stringify({ comentario }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'NO_ATTACHMENTS') {
          toast.error('El requerimiento requiere aprobación de especificaciones pero no tiene documentos adjuntos');
        } else if (errorData.code === 'SPECS_NOT_APPROVED') {
          toast.error('Debe aprobar las especificaciones técnicas antes de aprobar el requerimiento');
        } else {
          toast.error(errorData.error || 'Error al aprobar');
        }
        return;
      }

      const tipoLabel = documentoSeleccionado.tipo === 'REQUERIMIENTO' ? 'Requerimiento' : 'Orden de Compra';
      toast.success(`${tipoLabel} ${documentoSeleccionado.numero} aprobado`);
      await refreshRequerimientos();
      await refreshOrdenesCompra();
    } catch (error) {
      console.error('Error aprobando:', error);
      toast.error('Error al aprobar');
    }

    setShowAprobacionModal(false);
    setDocumentoSeleccionado(null);
    setSelectedRequerimiento(null);
    setSelectedOC(null);
  };

  const handleRechazar = async (motivo: string) => {
    if (!documentoSeleccionado) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      let endpoint = '';
      if (documentoSeleccionado.tipo === 'REQUERIMIENTO') {
        endpoint = `/api/purchase-requests/${documentoSeleccionado.id}/reject`;
      } else {
        endpoint = `/api/approval-workflows/document/PURCHASE_ORDER/${documentoSeleccionado.id}/reject`;
      }

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: documentoSeleccionado.tipo === 'REQUERIMIENTO' ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenant?.id || '',
        },
        body: JSON.stringify({ comentario: motivo }),
      });

      if (!response.ok) {
        throw new Error('Error al rechazar');
      }

      const tipoLabel = documentoSeleccionado.tipo === 'REQUERIMIENTO' ? 'Requerimiento' : 'Orden de Compra';
      toast.success(`${tipoLabel} ${documentoSeleccionado.numero} rechazado`);
      await refreshRequerimientos();
      await refreshOrdenesCompra();
    } catch (error) {
      console.error('Error rechazando:', error);
      toast.error('Error al rechazar');
    }

    setShowAprobacionModal(false);
    setDocumentoSeleccionado(null);
    setSelectedRequerimiento(null);
    setSelectedOC(null);
  };

  const handleAprobarDirecto = (doc: DocumentoAprobable) => {
    handleOpenAprobacion(doc, 'aprobar');
  };

  const handleRechazarDirecto = (doc: DocumentoAprobable) => {
    handleOpenAprobacion(doc, 'rechazar');
  };

  // Especificaciones (solo para requerimientos)
  const handleOpenAprobarEspecificaciones = (doc: DocumentoAprobable) => {
    if (doc.requerimientoOriginal) {
      setSelectedRequerimiento(doc.requerimientoOriginal);
      setEspecificacionesTipo('aprobar');
      setShowEspecificacionesModal(true);
    }
  };

  const handleOpenRechazarEspecificaciones = (doc: DocumentoAprobable) => {
    if (doc.requerimientoOriginal) {
      setSelectedRequerimiento(doc.requerimientoOriginal);
      setEspecificacionesTipo('rechazar');
      setShowEspecificacionesModal(true);
    }
  };

  const handleConfirmEspecificaciones = async (comentario: string) => {
    if (!selectedRequerimiento) return;

    const endpoint = especificacionesTipo === 'aprobar' ? 'approve-specs' : 'reject-specs';

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/purchase-requests/${selectedRequerimiento.id}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comentario }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setShowEspecificacionesModal(false);
        setSelectedRequerimiento(null);
        setTimeout(() => {
          if (errorData.code === 'NO_ATTACHMENTS') {
            toast.error('El requerimiento no tiene documentos adjuntos.');
          } else {
            toast.error(errorData.error || `Error al ${especificacionesTipo} las especificaciones`);
          }
        }, 100);
        return;
      }

      if (especificacionesTipo === 'aprobar') {
        toast.success(`Especificaciones de ${selectedRequerimiento.numero} aprobadas`);
      } else {
        toast.success(`Especificaciones de ${selectedRequerimiento.numero} rechazadas`);
      }
      await refreshRequerimientos();
      setShowEspecificacionesModal(false);
      setSelectedRequerimiento(null);
    } catch (error) {
      console.error(`Error ${especificacionesTipo} especificaciones:`, error);
      toast.error(`Error al ${especificacionesTipo} las especificaciones`);
      setShowEspecificacionesModal(false);
      setSelectedRequerimiento(null);
    }
  };

  // Si no tiene permisos
  if (!puedeAprobar) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-border p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary font-medium">
            No tienes permisos para acceder a esta sección
          </p>
          <p className="text-text-secondary text-sm mt-2">
            Solo los aprobadores y administradores pueden ver esta página
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

  const pendientesCount = documentosAprobables.filter(d => d.estado === 'PENDIENTE_APROBACION').length;
  const reqPendientes = documentosAprobables.filter(d => d.tipo === 'REQUERIMIENTO' && d.estado === 'PENDIENTE_APROBACION').length;
  const ocPendientes = documentosAprobables.filter(d => d.tipo === 'ORDEN_COMPRA' && d.estado === 'PENDIENTE_APROBACION').length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Aprobaciones"
        subtitle={`${pendientesCount} documento${pendientesCount !== 1 ? 's' : ''} pendiente${pendientesCount !== 1 ? 's' : ''} de aprobación`}
        icon={CheckCircle}
      />

      {/* Contadores rápidos */}
      <div className="flex gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-border p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{reqPendientes}</p>
            <p className="text-sm text-gray-500">Requerimientos</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{ocPendientes}</p>
            <p className="text-sm text-gray-500">Órdenes de Compra</p>
          </div>
        </div>
      </div>

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
                placeholder="Buscar por número, título, solicitante o proveedor..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">Filtros:</span>
            </div>

            {/* Filtro tipo documento */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setFiltroTipo('TODOS')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtroTipo === 'TODOS' ? 'bg-palette-purple text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroTipo('REQUERIMIENTO')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l flex items-center gap-1 ${
                  filtroTipo === 'REQUERIMIENTO' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                REQ
              </button>
              <button
                onClick={() => setFiltroTipo('ORDEN_COMPRA')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l flex items-center gap-1 ${
                  filtroTipo === 'ORDEN_COMPRA' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                OC
              </button>
            </div>

            {/* Botón filtro estados */}
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
            {(filtroEstados.length !== defaultEstados.length || filtroEstados[0] !== defaultEstados[0] || filtroTipo !== 'TODOS') && (
              <button
                onClick={() => {
                  setFiltroEstados(defaultEstados);
                  setFiltroTipo('TODOS');
                }}
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
        {documentosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-text-secondary mx-auto mb-4" />
            {searchQuery || filtroEstados.length < allEstados.length || filtroTipo !== 'TODOS' ? (
              <>
                <p className="text-text-primary font-medium">
                  No se encontraron documentos
                </p>
                <p className="text-text-secondary text-sm mt-2">
                  Intenta ajustar los filtros de búsqueda
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFiltroEstados(defaultEstados);
                    setFiltroTipo('TODOS');
                  }}
                  className="mt-4 text-palette-purple hover:text-palette-dark font-medium"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-text-primary font-medium">
                  No hay documentos pendientes
                </p>
                <p className="text-text-secondary text-sm mt-2">
                  Todos los documentos han sido procesados
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Título / Proveedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Estado
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
                {documentosFiltrados.map((doc) => {
                  const estadoBadge = getEstadoBadge(doc.estado);
                  const tipoBadge = getTipoBadge(doc.tipo);
                  const TipoIcon = tipoBadge.icon;
                  const canApprove = doc.estado === 'PENDIENTE_APROBACION';
                  const tieneEspecificaciones = doc.requiereAprobacionEspecificaciones || false;

                  return (
                    <tr key={`${doc.tipo}-${doc.id}`} className="hover:bg-gray-50 transition-colors">
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${tipoBadge.className}`}
                          title={tipoBadge.fullLabel}
                        >
                          <TipoIcon className="w-3.5 h-3.5" />
                          {tipoBadge.label}
                        </span>
                      </td>
                      {/* Número */}
                      <td className="px-4 py-3 text-sm font-medium text-palette-purple">
                        <div className="flex items-center gap-2">
                          {doc.numero}
                          {doc.creadoPorIA && (
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 bg-purple-100 rounded-full"
                              title="Generado por IA"
                            >
                              <Sparkles className="w-3 h-3 text-purple-600" />
                            </span>
                          )}
                          {tieneEspecificaciones && !doc.especificacionesAprobadas && (
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 bg-amber-100 rounded-full"
                              title="Requiere aprobación de especificaciones"
                            >
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Título / Proveedor */}
                      <td className="px-4 py-3 text-sm text-text-primary max-w-xs">
                        <div className="truncate">{doc.titulo}</div>
                        {doc.proveedor && (
                          <div className="text-xs text-gray-500 truncate">
                            Proveedor: {doc.proveedor}
                          </div>
                        )}
                      </td>
                      {/* Solicitante */}
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {doc.solicitante}
                      </td>
                      {/* Estado */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoBadge.className}`}>
                          {estadoBadge.label}
                        </span>
                      </td>
                      {/* Monto */}
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">
                        {formatCurrency(doc.monto, doc.moneda)}
                      </td>
                      {/* Fecha */}
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {formatDate(doc.fecha)}
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          {/* Ver detalle */}
                          <button
                            onClick={() => handleVerDetalle(doc)}
                            className="p-1.5 text-gray-500 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Ver circuito */}
                          <button
                            onClick={() => doc.tipo === 'REQUERIMIENTO'
                              ? circuitoModal.openFromRequerimiento(doc.id)
                              : circuitoModal.openFromOrdenCompra(doc.id)
                            }
                            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Ver circuito de compra"
                          >
                            <GitBranch className="w-4 h-4" />
                          </button>

                          {/* Chat (solo requerimientos) */}
                          {doc.tipo === 'REQUERIMIENTO' && doc.requerimientoOriginal && (
                            <PurchaseRequestChatButton
                              purchaseRequestId={doc.id}
                              purchaseRequestNumber={doc.numero}
                              unreadCount={chatUnreadCounts[doc.id] || 0}
                              onClick={() => {
                                setSelectedChatReq(doc.requerimientoOriginal!);
                                setChatDrawerOpen(true);
                              }}
                            />
                          )}

                          {/* Aprobar especificaciones (solo requerimientos) */}
                          {canApprove && doc.tipo === 'REQUERIMIENTO' && tieneEspecificaciones && !doc.especificacionesAprobadas && (
                            <>
                              <button
                                onClick={() => handleOpenAprobarEspecificaciones(doc)}
                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Aprobar especificaciones técnicas"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenRechazarEspecificaciones(doc)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Rechazar especificaciones técnicas"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Aprobar */}
                          {canApprove && (
                            <button
                              onClick={() => handleAprobarDirecto(doc)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Aprobar"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                          )}

                          {/* Rechazar */}
                          {canApprove && (
                            <button
                              onClick={() => handleRechazarDirecto(doc)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Rechazar"
                            >
                              <ThumbsDown className="w-4 h-4" />
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
      {documentosFiltrados.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              Mostrando {documentosFiltrados.length} documento{documentosFiltrados.length !== 1 ? 's' : ''}
              {filtroTipo !== 'TODOS' && ` (${filtroTipo === 'REQUERIMIENTO' ? 'Requerimientos' : 'Órdenes de Compra'})`}
            </span>
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

      {/* Modal detalle requerimiento */}
      <RequerimientoModal
        isOpen={showDetalleModal}
        onClose={() => {
          setShowDetalleModal(false);
          setSelectedRequerimiento(null);
        }}
        requerimiento={selectedRequerimiento}
        readOnly={true}
        approvalMode={true}
        onAprobar={() => {
          if (selectedRequerimiento) {
            const doc = documentosAprobables.find(d => d.id === selectedRequerimiento.id);
            if (doc) handleOpenAprobacion(doc, 'aprobar');
          }
        }}
        onRechazar={() => {
          if (selectedRequerimiento) {
            const doc = documentosAprobables.find(d => d.id === selectedRequerimiento.id);
            if (doc) handleOpenAprobacion(doc, 'rechazar');
          }
        }}
      />

      {/* Modal aprobación/rechazo */}
      {documentoSeleccionado && showAprobacionModal && selectedRequerimiento && (
        <AprobacionModal
          isOpen={showAprobacionModal}
          onClose={() => {
            setShowAprobacionModal(false);
            setDocumentoSeleccionado(null);
            setSelectedRequerimiento(null);
            setSelectedOC(null);
          }}
          onConfirm={modalTipo === 'aprobar' ? handleAprobar : handleRechazar}
          requerimiento={selectedRequerimiento}
          tipo={modalTipo}
        />
      )}

      {/* Modal aprobación OC (simple) */}
      {documentoSeleccionado && showAprobacionModal && selectedOC && !selectedRequerimiento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {modalTipo === 'aprobar' ? 'Aprobar' : 'Rechazar'} Orden de Compra
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                {modalTipo === 'aprobar'
                  ? `¿Confirma la aprobación de la OC ${documentoSeleccionado.numero}?`
                  : `¿Confirma el rechazo de la OC ${documentoSeleccionado.numero}?`
                }
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm"><strong>Número:</strong> {documentoSeleccionado.numero}</p>
                <p className="text-sm"><strong>Proveedor:</strong> {documentoSeleccionado.proveedor}</p>
                <p className="text-sm"><strong>Monto:</strong> {formatCurrency(documentoSeleccionado.monto, documentoSeleccionado.moneda)}</p>
              </div>
              <textarea
                id="comentario-oc"
                placeholder={modalTipo === 'aprobar' ? 'Comentario (opcional)' : 'Motivo del rechazo (requerido)'}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="secondary" onClick={() => {
                setShowAprobacionModal(false);
                setDocumentoSeleccionado(null);
                setSelectedOC(null);
              }}>
                Cancelar
              </Button>
              <Button
                variant={modalTipo === 'aprobar' ? 'primary' : 'danger'}
                onClick={() => {
                  const comentario = (document.getElementById('comentario-oc') as HTMLTextAreaElement)?.value || '';
                  if (modalTipo === 'rechazar' && !comentario.trim()) {
                    toast.error('Debe indicar el motivo del rechazo');
                    return;
                  }
                  if (modalTipo === 'aprobar') {
                    handleAprobar(comentario);
                  } else {
                    handleRechazar(comentario);
                  }
                }}
              >
                {modalTipo === 'aprobar' ? 'Aprobar' : 'Rechazar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal circuito de compra */}
      <CircuitoCompraModal
        isOpen={circuitoModal.modalState.isOpen}
        onClose={circuitoModal.close}
        requerimientoId={circuitoModal.modalState.requerimientoId}
        ordenCompraId={circuitoModal.modalState.ordenCompraId}
        recepcionId={circuitoModal.modalState.recepcionId}
      />

      {/* Modal especificaciones */}
      {selectedRequerimiento && showEspecificacionesModal && (
        <EspecificacionesModal
          isOpen={showEspecificacionesModal}
          onClose={() => {
            setShowEspecificacionesModal(false);
            setSelectedRequerimiento(null);
          }}
          onConfirm={handleConfirmEspecificaciones}
          requerimiento={selectedRequerimiento}
          tipo={especificacionesTipo}
        />
      )}

      {/* Chat drawer */}
      {selectedChatReq && (
        <PurchaseRequestChatDrawer
          purchaseRequestId={selectedChatReq.id}
          purchaseRequestNumber={selectedChatReq.numero}
          isOpen={chatDrawerOpen}
          onClose={() => {
            setChatDrawerOpen(false);
            setSelectedChatReq(null);
            refreshChatUnreadCounts();
          }}
        />
      )}
    </div>
  );
}
