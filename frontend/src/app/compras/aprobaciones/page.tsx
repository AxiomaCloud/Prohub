'use client';

import React, { useState, useMemo } from 'react';
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
  AlertCircle,
  Filter,
  Flag,
  X,
  Clock,
  FileEdit,
  FileCheck,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  GitBranch,
} from 'lucide-react';
import CircuitoCompraModal, { useCircuitoCompraModal } from '@/components/compras/CircuitoCompraModal';

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
  const { usuarioActual, requerimientos, actualizarRequerimiento, refreshRequerimientos } = useCompras();
  const { token } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstados, setFiltroEstados] = useState<EstadoRequerimiento[]>(defaultEstados);
  const [showFiltroEstados, setShowFiltroEstados] = useState(false);
  const [selectedRequerimiento, setSelectedRequerimiento] = useState<Requerimiento | null>(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [showAprobacionModal, setShowAprobacionModal] = useState(false);
  const [modalTipo, setModalTipo] = useState<'aprobar' | 'rechazar'>('aprobar');
  const [showEspecificacionesModal, setShowEspecificacionesModal] = useState(false);
  const [especificacionesTipo, setEspecificacionesTipo] = useState<'aprobar' | 'rechazar'>('aprobar');

  // Hook para el modal de circuito de compra
  const circuitoModal = useCircuitoCompraModal();

  // Verificar que el usuario es aprobador o admin
  const puedeAprobar = usuarioActual.rol === 'APROBADOR' || usuarioActual.rol === 'ADMIN';

  // Filtrar requerimientos que pueden ser aprobados (no borradores, no del propio usuario en algunos casos)
  const requerimientosAprobables = useMemo(() => {
    return requerimientos.filter((r) =>
      ['PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO'].includes(r.estado)
    );
  }, [requerimientos]);

  // Aplicar filtros
  const requerimientosFiltrados = useMemo(() => {
    return requerimientosAprobables.filter((req) => {
      // Filtro de búsqueda
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitulo = req.titulo.toLowerCase().includes(query);
        const matchNumero = req.numero.toLowerCase().includes(query);
        const matchDescripcion = req.descripcion?.toLowerCase().includes(query);
        const matchSolicitante = req.solicitante?.nombre?.toLowerCase().includes(query);
        if (!matchTitulo && !matchNumero && !matchDescripcion && !matchSolicitante) {
          return false;
        }
      }

      // Filtro de estado
      if (!filtroEstados.includes(req.estado)) {
        return false;
      }

      return true;
    });
  }, [requerimientosAprobables, searchQuery, filtroEstados]);

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
  const getEstadoBadge = (estado: EstadoRequerimiento) => {
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
  const handleVerDetalle = (req: Requerimiento) => {
    setSelectedRequerimiento(req);
    setShowDetalleModal(true);
  };

  const handleOpenAprobacion = (req: Requerimiento, tipo: 'aprobar' | 'rechazar') => {
    setSelectedRequerimiento(req);
    setModalTipo(tipo);
    setShowDetalleModal(false);
    setShowAprobacionModal(true);
  };

  const handleAprobar = async (comentario: string) => {
    if (!selectedRequerimiento) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/purchase-requests/${selectedRequerimiento.id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comentario }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Mostrar mensaje de error específico según el código
        if (errorData.code === 'NO_ATTACHMENTS') {
          toast.error('El requerimiento requiere aprobación de especificaciones pero no tiene documentos adjuntos');
        } else if (errorData.code === 'NO_SPEC_ATTACHMENTS') {
          toast.error('El requerimiento no tiene documentos marcados como especificación técnica');
        } else if (errorData.code === 'SPECS_NOT_APPROVED') {
          toast.error('Debe aprobar las especificaciones técnicas antes de aprobar el requerimiento');
        } else {
          toast.error(errorData.error || 'Error al aprobar el requerimiento');
        }
        return;
      }

      toast.success(`Requerimiento ${selectedRequerimiento.numero} aprobado`);
      await refreshRequerimientos();
    } catch (error) {
      console.error('Error aprobando:', error);
      toast.error('Error al aprobar el requerimiento');
    }

    setShowAprobacionModal(false);
    setSelectedRequerimiento(null);
  };

  const handleRechazar = async (motivo: string) => {
    if (!selectedRequerimiento) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/purchase-requests/${selectedRequerimiento.id}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comentario: motivo }),
      });

      if (!response.ok) {
        throw new Error('Error al rechazar');
      }

      toast.success(`Requerimiento ${selectedRequerimiento.numero} rechazado`);
      await refreshRequerimientos();
    } catch (error) {
      console.error('Error rechazando:', error);
      toast.error('Error al rechazar el requerimiento');
    }

    setShowAprobacionModal(false);
    setSelectedRequerimiento(null);
  };

  const handleAprobarDirecto = async (req: Requerimiento) => {
    setSelectedRequerimiento(req);
    setModalTipo('aprobar');
    setShowAprobacionModal(true);
  };

  const handleRechazarDirecto = async (req: Requerimiento) => {
    setSelectedRequerimiento(req);
    setModalTipo('rechazar');
    setShowAprobacionModal(true);
  };

  // Abrir modal para aprobar especificaciones
  const handleOpenAprobarEspecificaciones = (req: Requerimiento) => {
    setSelectedRequerimiento(req);
    setEspecificacionesTipo('aprobar');
    setShowEspecificacionesModal(true);
  };

  // Abrir modal para rechazar especificaciones
  const handleOpenRechazarEspecificaciones = (req: Requerimiento) => {
    setSelectedRequerimiento(req);
    setEspecificacionesTipo('rechazar');
    setShowEspecificacionesModal(true);
  };

  // Confirmar acción de especificaciones
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
        // Cerrar modal primero
        setShowEspecificacionesModal(false);
        setSelectedRequerimiento(null);

        // Mostrar toast después de cerrar el modal
        setTimeout(() => {
          if (errorData.code === 'NO_ATTACHMENTS') {
            toast.error('El requerimiento no tiene documentos adjuntos. Debe subir al menos un archivo.');
          } else {
            toast.error(errorData.error || `Error al ${especificacionesTipo === 'aprobar' ? 'aprobar' : 'rechazar'} las especificaciones`);
          }
        }, 100);
        return;
      }

      if (especificacionesTipo === 'aprobar') {
        toast.success(`Especificaciones de ${selectedRequerimiento.numero} aprobadas`);
      } else {
        toast.success(`Especificaciones de ${selectedRequerimiento.numero} rechazadas. Requerimiento devuelto a borrador.`);
      }
      await refreshRequerimientos();
      setShowEspecificacionesModal(false);
      setSelectedRequerimiento(null);
    } catch (error) {
      console.error(`Error ${especificacionesTipo === 'aprobar' ? 'aprobando' : 'rechazando'} especificaciones:`, error);
      toast.error(`Error al ${especificacionesTipo === 'aprobar' ? 'aprobar' : 'rechazar'} las especificaciones`);
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

  const pendientesCount = requerimientosAprobables.filter(r => r.estado === 'PENDIENTE_APROBACION').length;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Aprobaciones de Requerimientos"
        subtitle={`${pendientesCount} requerimiento${pendientesCount !== 1 ? 's' : ''} pendiente${pendientesCount !== 1 ? 's' : ''} de aprobación`}
        icon={CheckCircle}
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
                placeholder="Buscar por título, número, descripción o solicitante..."
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
            {(filtroEstados.length !== defaultEstados.length || filtroEstados[0] !== defaultEstados[0]) && (
              <button
                onClick={() => setFiltroEstados(defaultEstados)}
                className="text-xs text-text-secondary hover:text-palette-purple"
              >
                Solo pendientes
              </button>
            )}

            {/* Ver todos */}
            {filtroEstados.length < allEstados.length && (
              <button
                onClick={() => setFiltroEstados(allEstados)}
                className="text-xs text-text-secondary hover:text-palette-purple"
              >
                Ver todos
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
                  Intenta ajustar los filtros de búsqueda
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFiltroEstados(defaultEstados);
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
                  No hay requerimientos pendientes
                </p>
                <p className="text-text-secondary text-sm mt-2">
                  Todos los requerimientos han sido procesados
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
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Solicitante
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Prioridad
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
                  const canApprove = req.estado === 'PENDIENTE_APROBACION';
                  // Verificar si requiere aprobación de especificaciones
                  const tieneEspecificaciones = req.requiereAprobacionEspecificaciones || false;

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
                          {tieneEspecificaciones && (
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 bg-amber-100 rounded-full"
                              title="Tiene especificaciones que requieren aprobación"
                            >
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary max-w-xs truncate">
                        {req.titulo}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {req.solicitante?.nombre || 'N/A'}
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
                            onClick={() => handleVerDetalle(req)}
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

                          {/* Aprobar especificaciones */}
                          {canApprove && tieneEspecificaciones && !req.especificacionesAprobadas && (
                            <>
                              <button
                                onClick={() => handleOpenAprobarEspecificaciones(req)}
                                className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Aprobar especificaciones técnicas"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenRechazarEspecificaciones(req)}
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
                              onClick={() => handleAprobarDirecto(req)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Aprobar"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                          )}

                          {/* Rechazar */}
                          {canApprove && (
                            <button
                              onClick={() => handleRechazarDirecto(req)}
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

      {/* Modal detalle (reutilizando RequerimientoModal en modo aprobación) */}
      <RequerimientoModal
        isOpen={showDetalleModal}
        onClose={() => {
          setShowDetalleModal(false);
          setSelectedRequerimiento(null);
        }}
        requerimiento={selectedRequerimiento}
        readOnly={true}
        approvalMode={true}
        onAprobar={() => handleOpenAprobacion(selectedRequerimiento!, 'aprobar')}
        onRechazar={() => handleOpenAprobacion(selectedRequerimiento!, 'rechazar')}
      />

      {/* Modal aprobación/rechazo */}
      {selectedRequerimiento && showAprobacionModal && (
        <AprobacionModal
          isOpen={showAprobacionModal}
          onClose={() => {
            setShowAprobacionModal(false);
            setSelectedRequerimiento(null);
          }}
          onConfirm={modalTipo === 'aprobar' ? handleAprobar : handleRechazar}
          requerimiento={selectedRequerimiento}
          tipo={modalTipo}
        />
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
    </div>
  );
}
