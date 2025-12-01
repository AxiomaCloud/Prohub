'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCompras } from '@/lib/compras-context';
import { PrioridadBadge } from '@/components/compras/PrioridadBadge';
import { AprobacionModal } from '@/components/compras/AprobacionModal';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Requerimiento, Adjunto, EstadoAdjunto } from '@/types/compras';
import {
  User,
  DollarSign,
  Calendar,
  Paperclip,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  FileText,
  FileSpreadsheet,
  Image,
  XCircle,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from 'lucide-react';

function formatMonto(monto: number, moneda: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

function formatFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(tipo: string) {
  if (tipo.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (tipo.includes('word') || tipo.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
  if (tipo.includes('excel') || tipo.includes('spreadsheet')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  if (tipo.includes('image')) return <Image className="w-5 h-5 text-purple-500" />;
  return <Paperclip className="w-5 h-5 text-gray-500" />;
}

function getEstadoAdjuntoBadge(estado: EstadoAdjunto) {
  const config: Record<EstadoAdjunto, { label: string; className: string; icon: React.ReactNode }> = {
    PENDIENTE: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
    APROBADO: { label: 'Aprobado', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
    RECHAZADO: { label: 'Rechazado', className: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  };
  return config[estado];
}

// Componente para mostrar adjuntos con aprobacion individual
function AdjuntosAprobacion({
  adjuntos,
  requerimientoId,
  onAprobarAdjunto,
}: {
  adjuntos: Adjunto[];
  requerimientoId: string;
  onAprobarAdjunto: (adjuntoId: string, aprobado: boolean, comentario?: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [adjuntoSeleccionado, setAdjuntoSeleccionado] = useState<Adjunto | null>(null);
  const [comentario, setComentario] = useState('');

  if (adjuntos.length === 0) {
    return (
      <div className="text-sm text-text-secondary italic">
        Sin adjuntos
      </div>
    );
  }

  const pendientes = adjuntos.filter(a => a.estado === 'PENDIENTE').length;
  const aprobados = adjuntos.filter(a => a.estado === 'APROBADO').length;
  const rechazados = adjuntos.filter(a => a.estado === 'RECHAZADO').length;

  return (
    <div className="space-y-3">
      {/* Resumen */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-4">
          <Paperclip className="w-5 h-5 text-text-secondary" />
          <span className="font-medium text-text-primary">{adjuntos.length} adjunto{adjuntos.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2 text-sm">
            {pendientes > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
              </span>
            )}
            {aprobados > 0 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                {aprobados} aprobado{aprobados !== 1 ? 's' : ''}
              </span>
            )}
            {rechazados > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                {rechazados} rechazado{rechazados !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {expandido ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {/* Lista de adjuntos */}
      {expandido && (
        <div className="space-y-2 pl-2">
          {adjuntos.map((adj) => {
            const estadoBadge = getEstadoAdjuntoBadge(adj.estado);
            return (
              <div
                key={adj.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-white"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(adj.tipo)}
                  <div>
                    <p className="text-sm font-medium text-text-primary">{adj.nombre}</p>
                    <p className="text-xs text-text-secondary">{formatFileSize(adj.tamanio)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Estado */}
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoBadge.className}`}>
                    {estadoBadge.icon}
                    {estadoBadge.label}
                  </span>

                  {/* Acciones */}
                  {adj.estado === 'PENDIENTE' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setAdjuntoSeleccionado(adj);
                        }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver y aprobar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAprobarAdjunto(adj.id, true)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Aprobar"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onAprobarAdjunto(adj.id, false, 'Documento no válido')}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Rechazar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {adj.estado !== 'PENDIENTE' && adj.aprobador && (
                    <span className="text-xs text-text-secondary">
                      por {adj.aprobador.nombre}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de aprobacion de adjunto */}
      {adjuntoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAdjuntoSeleccionado(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Aprobar/Rechazar Adjunto
            </h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              {getFileIcon(adjuntoSeleccionado.tipo)}
              <div>
                <p className="font-medium text-text-primary">{adjuntoSeleccionado.nombre}</p>
                <p className="text-xs text-text-secondary">{formatFileSize(adjuntoSeleccionado.tamanio)}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Comentario (opcional)
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={3}
                placeholder="Agregue un comentario..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdjuntoSeleccionado(null);
                  setComentario('');
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAprobarAdjunto(adjuntoSeleccionado.id, false, comentario || 'Documento rechazado');
                  setAdjuntoSeleccionado(null);
                  setComentario('');
                }}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                Rechazar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onAprobarAdjunto(adjuntoSeleccionado.id, true, comentario);
                  setAdjuntoSeleccionado(null);
                  setComentario('');
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Aprobar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AprobacionesPage() {
  const router = useRouter();
  const { requerimientos, usuarioActual, actualizarRequerimiento, aprobarAdjunto } = useCompras();

  const [selectedRequerimiento, setSelectedRequerimiento] =
    useState<Requerimiento | null>(null);
  const [modalTipo, setModalTipo] = useState<'aprobar' | 'rechazar' | null>(
    null
  );

  // Solo mostrar pendientes de aprobacion
  const pendientes = useMemo(() => {
    return requerimientos.filter((r) => r.estado === 'PENDIENTE_APROBACION');
  }, [requerimientos]);

  // Verificar que el usuario es aprobador
  if (usuarioActual.rol !== 'APROBADOR') {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-border p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary font-medium">
            No tienes permisos para acceder a esta seccion
          </p>
          <p className="text-text-secondary text-sm mt-2">
            Solo los aprobadores pueden ver esta pagina
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

  const handleAprobar = (comentario: string) => {
    if (!selectedRequerimiento) return;

    // Solo aprobar si no hay adjuntos o todos los adjuntos estan aprobados
    const adjuntosPendientes = selectedRequerimiento.adjuntos.filter(a => a.estado === 'PENDIENTE');
    const adjuntosRechazados = selectedRequerimiento.adjuntos.filter(a => a.estado === 'RECHAZADO');

    if (adjuntosPendientes.length > 0) {
      alert('Debe aprobar o rechazar todos los adjuntos antes de aprobar el requerimiento');
      return;
    }

    if (adjuntosRechazados.length > 0) {
      const confirmar = window.confirm(
        `Hay ${adjuntosRechazados.length} adjunto(s) rechazado(s). ¿Desea aprobar el requerimiento de todas formas?`
      );
      if (!confirmar) return;
    }

    actualizarRequerimiento(selectedRequerimiento.id, {
      estado: 'APROBADO',
      aprobadorId: usuarioActual.id,
      aprobador: usuarioActual,
      fechaAprobacion: new Date(),
      comentarioAprobacion: comentario || 'Aprobado',
    });

    setSelectedRequerimiento(null);
    setModalTipo(null);
  };

  const handleRechazar = (motivo: string) => {
    if (!selectedRequerimiento) return;

    actualizarRequerimiento(selectedRequerimiento.id, {
      estado: 'RECHAZADO',
      aprobadorId: usuarioActual.id,
      aprobador: usuarioActual,
      fechaAprobacion: new Date(),
      comentarioAprobacion: motivo,
    });

    setSelectedRequerimiento(null);
    setModalTipo(null);
  };

  const handleAprobarAdjunto = (requerimientoId: string, adjuntoId: string, aprobado: boolean, comentario?: string) => {
    aprobarAdjunto(requerimientoId, adjuntoId, aprobado, comentario);
  };

  const openModal = (req: Requerimiento, tipo: 'aprobar' | 'rechazar') => {
    setSelectedRequerimiento(req);
    setModalTipo(tipo);
  };

  const closeModal = () => {
    setSelectedRequerimiento(null);
    setModalTipo(null);
  };

  // Verificar si un requerimiento puede ser aprobado
  const puedeAprobar = (req: Requerimiento) => {
    if (req.adjuntos.length === 0) return true;
    const pendientes = req.adjuntos.filter(a => a.estado === 'PENDIENTE');
    return pendientes.length === 0;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Aprobaciones Pendientes"
        subtitle={`${pendientes.length} requerimiento${pendientes.length !== 1 ? 's' : ''} pendiente${pendientes.length !== 1 ? 's' : ''} de aprobacion`}
      />

      {/* Alerta informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Aprobacion de Adjuntos</p>
            <p className="text-sm text-blue-700 mt-1">
              Puede aprobar o rechazar los adjuntos de forma individual antes de aprobar el requerimiento completo.
              Los adjuntos pendientes deben ser revisados antes de la aprobacion final.
            </p>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {pendientes.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-text-primary font-medium">
              No hay requerimientos pendientes
            </p>
            <p className="text-text-secondary text-sm mt-2">
              Todos los requerimientos han sido procesados
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendientes.map((req) => {
              const canAprobar = puedeAprobar(req);
              return (
                <div
                  key={req.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  {/* Header del card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      {req.prioridad === 'URGENTE' && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> URGENTE
                        </span>
                      )}
                      <div>
                        <p className="text-sm text-text-secondary">{req.numero}</p>
                        <h3 className="font-semibold text-text-primary text-lg">
                          {req.titulo}
                        </h3>
                      </div>
                    </div>
                    <PrioridadBadge prioridad={req.prioridad} size="sm" />
                  </div>

                  {/* Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-text-secondary">Solicitante</p>
                      <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                        <User className="w-4 h-4 text-text-secondary" /> {req.solicitante.nombre}
                      </p>
                      <p className="text-xs text-text-secondary">{req.departamento}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Monto</p>
                      <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-text-secondary" /> {formatMonto(req.montoEstimado, req.moneda)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Fecha Solicitado</p>
                      <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-text-secondary" /> {formatFecha(req.fechaCreacion)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Items</p>
                      <p className="text-sm font-medium text-text-primary">
                        {req.items.length} item{req.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Descripcion breve */}
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                    "{req.descripcion}"
                  </p>

                  {/* Adjuntos con aprobacion individual */}
                  <div className="mb-4">
                    <AdjuntosAprobacion
                      adjuntos={req.adjuntos}
                      requerimientoId={req.id}
                      onAprobarAdjunto={(adjuntoId, aprobado, comentario) =>
                        handleAprobarAdjunto(req.id, adjuntoId, aprobado, comentario)
                      }
                    />
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      {!canAprobar && (
                        <span className="text-sm text-yellow-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Revise los adjuntos pendientes antes de aprobar
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/compras/requerimientos/${req.id}`}
                        className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium text-sm"
                      >
                        Ver Detalle
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal(req, 'rechazar')}
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        Rechazar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openModal(req, 'aprobar')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!canAprobar}
                      >
                        Aprobar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {pendientes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>Mostrando {pendientes.length} requerimiento{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedRequerimiento && modalTipo && (
        <AprobacionModal
          isOpen={true}
          onClose={closeModal}
          onConfirm={modalTipo === 'aprobar' ? handleAprobar : handleRechazar}
          requerimiento={selectedRequerimiento}
          tipo={modalTipo}
        />
      )}
    </div>
  );
}
