'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useCompras } from '@/lib/compras-context';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Requerimiento, EstadoRequerimiento } from '@/types/compras';
import {
  Plus,
  ClipboardList,
  FileCheck,
  PackageCheck,
  Clock,
  CheckCircle,
  XCircle,
  Flag,
  DollarSign,
  Calendar,
  User,
  AlertCircle,
  X,
  ArrowRight,
  Building2,
  FileText,
  ExternalLink,
  FileEdit,
  Filter,
  Check,
} from 'lucide-react';

// Tipos de documentos en el circuito
type TipoDocumento = 'REQUERIMIENTO' | 'ORDEN_COMPRA' | 'RECEPCION';

// Estados para el Kanban
type EstadoKanban = 'BORRADOR' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'FINALIZADO';

interface DocumentoKanban {
  id: string;
  tipo: TipoDocumento;
  numero: string;
  titulo: string;
  descripcion?: string;
  monto: number;
  moneda: string;
  fecha: Date;
  solicitante: string;
  estadoOriginal: string;
  prioridad?: string;
  requerimientoId?: string;
  centroCostos?: string;
  categoria?: string;
  items?: Array<{ descripcion: string; cantidad: number; unidad: string; total: number }>;
}

// Mapeo de estados del requerimiento a estados Kanban
function mapEstadoToKanban(estado: EstadoRequerimiento): EstadoKanban {
  switch (estado) {
    case 'BORRADOR':
      return 'BORRADOR';
    case 'PENDIENTE_APROBACION':
      return 'PENDIENTE';
    case 'APROBADO':
    case 'OC_GENERADA':
      return 'APROBADO';
    case 'RECHAZADO':
      return 'RECHAZADO';
    case 'RECIBIDO':
      return 'FINALIZADO';
    default:
      return 'BORRADOR';
  }
}

// Mapeo de estado Kanban a estado del requerimiento
function getNextEstadoRequerimiento(currentEstado: EstadoRequerimiento, targetKanban: EstadoKanban): EstadoRequerimiento | null {
  // Definir transiciones validas
  const transitions: Record<EstadoRequerimiento, Partial<Record<EstadoKanban, EstadoRequerimiento>>> = {
    'BORRADOR': { 'PENDIENTE': 'PENDIENTE_APROBACION' },
    'PENDIENTE_APROBACION': { 'APROBADO': 'APROBADO', 'RECHAZADO': 'RECHAZADO', 'BORRADOR': 'BORRADOR' },
    'APROBADO': { 'APROBADO': 'OC_GENERADA' },
    'OC_GENERADA': { 'FINALIZADO': 'RECIBIDO' },
    'RECHAZADO': { 'BORRADOR': 'BORRADOR' },
    'RECIBIDO': {},
  };

  return transitions[currentEstado]?.[targetKanban] || null;
}

// Configuracion de columnas Kanban
const columnasKanban: { id: EstadoKanban; titulo: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: 'BORRADOR',
    titulo: 'Borrador',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50 border-gray-200',
    icon: FileEdit
  },
  {
    id: 'PENDIENTE',
    titulo: 'Pendiente',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: Clock
  },
  {
    id: 'APROBADO',
    titulo: 'Aprobado',
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle
  },
  {
    id: 'RECHAZADO',
    titulo: 'Rechazado',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: XCircle
  },
  {
    id: 'FINALIZADO',
    titulo: 'Finalizado',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: Flag
  },
];

// Configuracion de tipos de documento
const tipoDocumentoConfig: Record<TipoDocumento, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  REQUERIMIENTO: {
    label: 'Requerimiento',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: ClipboardList,
  },
  ORDEN_COMPRA: {
    label: 'Orden de Compra',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: FileCheck,
  },
  RECEPCION: {
    label: 'Recepcion',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    icon: PackageCheck,
  },
};

// Siguiente estado por tipo de documento
function getNextState(doc: DocumentoKanban): { kanban: EstadoKanban; label: string } | null {
  if (doc.tipo === 'REQUERIMIENTO') {
    switch (doc.estadoOriginal) {
      case 'BORRADOR':
        return { kanban: 'PENDIENTE', label: 'Enviar a Aprobacion' };
      case 'PENDIENTE_APROBACION':
        return { kanban: 'APROBADO', label: 'Aprobar' };
      case 'APROBADO':
        return { kanban: 'APROBADO', label: 'Generar OC' };
      case 'OC_GENERADA':
        return { kanban: 'FINALIZADO', label: 'Confirmar Recepcion' };
      default:
        return null;
    }
  } else if (doc.tipo === 'ORDEN_COMPRA') {
    if (doc.estadoOriginal === 'EN_PROCESO') {
      return { kanban: 'FINALIZADO', label: 'Marcar Entregada' };
    }
  }
  return null;
}

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
    month: 'short',
  }).format(new Date(fecha));
}

function formatFechaLarga(fecha: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(fecha));
}

// Componente Modal de Detalle
function DocumentoDetailModal({
  documento,
  onClose,
  onAdvanceState,
  onNavigate,
}: {
  documento: DocumentoKanban;
  onClose: () => void;
  onAdvanceState: () => void;
  onNavigate: () => void;
}) {
  const config = tipoDocumentoConfig[documento.tipo];
  const IconTipo = config.icon;
  const nextState = getNextState(documento);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${config.bgColor} ${config.color}`}>
              <IconTipo className="w-4 h-4" />
              {config.label}
            </span>
            <span className="text-sm text-text-secondary">{documento.numero}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Titulo y prioridad */}
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">{documento.titulo}</h2>
            {documento.prioridad === 'URGENTE' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                <AlertCircle className="w-3 h-3" /> URGENTE
              </span>
            )}
          </div>

          {/* Descripcion */}
          {documento.descripcion && (
            <p className="text-text-secondary mb-6">{documento.descripcion}</p>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Monto</p>
                <p className="font-medium text-text-primary">{formatMonto(documento.monto, documento.moneda)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Fecha</p>
                <p className="font-medium text-text-primary">{formatFechaLarga(documento.fecha)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-text-secondary" />
              <div>
                <p className="text-xs text-text-secondary">Solicitante</p>
                <p className="font-medium text-text-primary">{documento.solicitante}</p>
              </div>
            </div>
            {documento.centroCostos && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-text-secondary" />
                <div>
                  <p className="text-xs text-text-secondary">Centro de Costos</p>
                  <p className="font-medium text-text-primary">{documento.centroCostos}</p>
                </div>
              </div>
            )}
          </div>

          {/* Estado actual */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-text-secondary mb-1">Estado Actual</p>
            <p className="font-medium text-text-primary">{documento.estadoOriginal.replace(/_/g, ' ')}</p>
          </div>

          {/* Items si los tiene */}
          {documento.items && documento.items.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Items
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 font-medium text-text-secondary">Descripcion</th>
                      <th className="text-right p-3 font-medium text-text-secondary">Cant.</th>
                      <th className="text-right p-3 font-medium text-text-secondary">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documento.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3 text-text-primary">{item.descripcion}</td>
                        <td className="p-3 text-right text-text-secondary">{item.cantidad} {item.unidad}</td>
                        <td className="p-3 text-right font-medium text-text-primary">{formatMonto(item.total, documento.moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-gray-50">
          <Button variant="outline" size="sm" onClick={onNavigate}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Ver Detalle Completo
          </Button>

          {nextState && (
            <Button size="sm" onClick={onAdvanceState}>
              {nextState.label}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta Kanban
function KanbanCard({
  documento,
  onClick,
  index,
}: {
  documento: DocumentoKanban;
  onClick: () => void;
  index: number;
}) {
  const config = tipoDocumentoConfig[documento.tipo];
  const IconTipo = config.icon;

  return (
    <Draggable draggableId={`${documento.tipo}-${documento.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-white rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
            snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
          }`}
          onClick={onClick}
        >
          {/* Header con tipo */}
          <div className="flex items-center justify-between mb-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
              <IconTipo className="w-3 h-3" />
              {config.label}
            </span>
            {documento.prioridad === 'URGENTE' && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" />
              </span>
            )}
          </div>

          {/* Numero y titulo */}
          <p className="text-xs text-text-secondary mb-1">{documento.numero}</p>
          <h4 className="text-sm font-medium text-text-primary line-clamp-2 mb-3">
            {documento.titulo}
          </h4>

          {/* Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <DollarSign className="w-3 h-3" />
              <span className="font-medium">{formatMonto(documento.monto, documento.moneda)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatFecha(documento.fecha)}</span>
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[80px]">{documento.solicitante}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// Componente de columna Kanban
function KanbanColumn({
  columna,
  documentos,
  onCardClick,
}: {
  columna: typeof columnasKanban[0];
  documentos: DocumentoKanban[];
  onCardClick: (doc: DocumentoKanban) => void;
}) {
  const Icon = columna.icon;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      {/* Header de columna */}
      <div className={`flex items-center gap-2 p-3 rounded-t-lg border ${columna.bgColor}`}>
        <Icon className={`w-5 h-5 ${columna.color}`} />
        <h3 className={`font-semibold ${columna.color}`}>{columna.titulo}</h3>
        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${columna.bgColor} ${columna.color}`}>
          {documentos.length}
        </span>
      </div>

      {/* Lista de tarjetas con Droppable */}
      <Droppable droppableId={columna.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 border border-t-0 border-border rounded-b-lg p-3 space-y-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto ${
              snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-gray-50'
            }`}
          >
            {documentos.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-8">
                Sin documentos
              </p>
            ) : (
              documentos.map((doc, index) => (
                <KanbanCard
                  key={`${doc.tipo}-${doc.id}`}
                  documento={doc}
                  index={index}
                  onClick={() => onCardClick(doc)}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// Todos los tipos de documento disponibles
const allTiposDocumento: TipoDocumento[] = ['REQUERIMIENTO', 'ORDEN_COMPRA', 'RECEPCION'];

// Todos los estados disponibles
const allEstadosKanban: EstadoKanban[] = ['BORRADOR', 'PENDIENTE', 'APROBADO', 'RECHAZADO', 'FINALIZADO'];

// Modal de filtro de tipos de documento
function FiltroTiposModal({
  isOpen,
  onClose,
  selectedTipos,
  onToggle,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedTipos: TipoDocumento[];
  onToggle: (tipo: TipoDocumento) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Tipos de Documento</h3>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {allTiposDocumento.map((tipo) => {
            const config = tipoDocumentoConfig[tipo];
            const Icon = config.icon;
            const isSelected = selectedTipos.includes(tipo);
            return (
              <label
                key={tipo}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(tipo)}
                  disabled={isSelected && selectedTipos.length === 1}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <span className="text-sm font-medium text-text-primary">{config.label}</span>
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

// Modal de filtro de estados
function FiltroEstadosModal({
  isOpen,
  onClose,
  selectedEstados,
  onToggle,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedEstados: EstadoKanban[];
  onToggle: (estado: EstadoKanban) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Estados</h3>
          <button
            onClick={onClose}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {columnasKanban.map((col) => {
            const Icon = col.icon;
            const isSelected = selectedEstados.includes(col.id);
            return (
              <label
                key={col.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(col.id)}
                  disabled={isSelected && selectedEstados.length === 1}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <div className={`p-2 rounded-lg ${col.bgColor}`}>
                  <Icon className={`w-4 h-4 ${col.color}`} />
                </div>
                <span className="text-sm font-medium text-text-primary">{col.titulo}</span>
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

export default function ComprasKanbanPage() {
  const router = useRouter();
  const { usuarioActual, requerimientos, actualizarRequerimiento } = useCompras();
  const [selectedDoc, setSelectedDoc] = useState<DocumentoKanban | null>(null);

  // Filtros
  const [filtroTipos, setFiltroTipos] = useState<TipoDocumento[]>(allTiposDocumento);
  const [filtroEstados, setFiltroEstados] = useState<EstadoKanban[]>(allEstadosKanban);

  // Modales de filtro
  const [showFiltroTipos, setShowFiltroTipos] = useState(false);
  const [showFiltroEstados, setShowFiltroEstados] = useState(false);

  // Toggle tipo de documento en filtro
  const toggleTipoFiltro = (tipo: TipoDocumento) => {
    setFiltroTipos(prev => {
      if (prev.includes(tipo)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== tipo);
      }
      return [...prev, tipo];
    });
  };

  // Toggle estado en filtro
  const toggleEstadoFiltro = (estado: EstadoKanban) => {
    setFiltroEstados(prev => {
      if (prev.includes(estado)) {
        if (prev.length === 1) return prev;
        return prev.filter(e => e !== estado);
      }
      return [...prev, estado];
    });
  };

  // Filtrar requerimientos del usuario actual y convertir a documentos Kanban
  const documentosKanban = useMemo(() => {
    const docs: DocumentoKanban[] = [];

    // Filtrar solo los del usuario actual
    const misRequerimientos = requerimientos.filter(
      (r) => r.solicitanteId === usuarioActual.id
    );

    misRequerimientos.forEach((req) => {
      // Agregar el requerimiento
      docs.push({
        id: req.id,
        tipo: 'REQUERIMIENTO',
        numero: req.numero,
        titulo: req.titulo,
        descripcion: req.descripcion,
        monto: req.montoEstimado,
        moneda: req.moneda,
        fecha: req.fechaCreacion,
        solicitante: req.solicitante.nombre,
        estadoOriginal: req.estado,
        prioridad: req.prioridad,
        centroCostos: req.centroCostos,
        categoria: req.categoria,
        items: req.items,
      });

      // Si tiene OC generada, agregar la OC
      if (req.ordenCompra) {
        docs.push({
          id: req.ordenCompra.id,
          tipo: 'ORDEN_COMPRA',
          numero: req.ordenCompra.numero,
          titulo: req.titulo,
          monto: req.ordenCompra.total,
          moneda: req.ordenCompra.moneda,
          fecha: req.ordenCompra.fechaEmision,
          solicitante: req.solicitante.nombre,
          estadoOriginal: req.ordenCompra.estado,
          requerimientoId: req.id,
          items: req.ordenCompra.items,
        });
      }

      // Si tiene recepcion, agregar la recepcion
      if (req.recepcion) {
        docs.push({
          id: req.recepcion.id,
          tipo: 'RECEPCION',
          numero: `REC-${req.numero.replace('REQ-', '')}`,
          titulo: req.titulo,
          monto: req.montoEstimado,
          moneda: req.moneda,
          fecha: req.recepcion.fechaRecepcion,
          solicitante: req.solicitante.nombre,
          estadoOriginal: req.recepcion.conformidad,
          requerimientoId: req.id,
        });
      }
    });

    return docs;
  }, [requerimientos, usuarioActual.id]);

  // Filtrar documentos segun filtros seleccionados
  const documentosFiltrados = useMemo(() => {
    return documentosKanban.filter(doc => {
      // Filtrar por tipo de documento
      if (!filtroTipos.includes(doc.tipo)) return false;

      // Determinar el estado Kanban del documento
      let estadoKanban: EstadoKanban;
      if (doc.tipo === 'REQUERIMIENTO') {
        estadoKanban = mapEstadoToKanban(doc.estadoOriginal as EstadoRequerimiento);
      } else if (doc.tipo === 'ORDEN_COMPRA') {
        estadoKanban = doc.estadoOriginal === 'ENTREGADA' ? 'FINALIZADO' : 'APROBADO';
      } else {
        estadoKanban = 'FINALIZADO';
      }

      // Filtrar por estado
      if (!filtroEstados.includes(estadoKanban)) return false;

      return true;
    });
  }, [documentosKanban, filtroTipos, filtroEstados]);

  // Agrupar documentos por estado Kanban
  const documentosPorColumna = useMemo(() => {
    const grupos: Record<EstadoKanban, DocumentoKanban[]> = {
      BORRADOR: [],
      PENDIENTE: [],
      APROBADO: [],
      RECHAZADO: [],
      FINALIZADO: [],
    };

    documentosFiltrados.forEach((doc) => {
      // Determinar el estado Kanban segun el tipo de documento
      let estadoKanban: EstadoKanban;

      if (doc.tipo === 'REQUERIMIENTO') {
        estadoKanban = mapEstadoToKanban(doc.estadoOriginal as EstadoRequerimiento);
      } else if (doc.tipo === 'ORDEN_COMPRA') {
        // OC: EN_PROCESO = Aprobado, ENTREGADA = Finalizado
        estadoKanban = doc.estadoOriginal === 'ENTREGADA' ? 'FINALIZADO' : 'APROBADO';
      } else {
        // Recepcion: siempre Finalizado
        estadoKanban = 'FINALIZADO';
      }

      grupos[estadoKanban].push(doc);
    });

    // Ordenar por fecha descendente en cada columna
    Object.keys(grupos).forEach((key) => {
      grupos[key as EstadoKanban].sort((a, b) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
    });

    return grupos;
  }, [documentosFiltrados]);

  // Funcion para avanzar estado del documento
  const advanceDocumentState = useCallback((doc: DocumentoKanban) => {
    if (doc.tipo === 'REQUERIMIENTO') {
      const currentEstado = doc.estadoOriginal as EstadoRequerimiento;

      switch (currentEstado) {
        case 'BORRADOR':
          actualizarRequerimiento(doc.id, { estado: 'PENDIENTE_APROBACION' });
          break;
        case 'PENDIENTE_APROBACION':
          // Para aprobar necesitamos datos adicionales - por ahora simplificado
          actualizarRequerimiento(doc.id, {
            estado: 'OC_GENERADA',
            aprobadorId: usuarioActual.id,
            aprobador: usuarioActual,
            fechaAprobacion: new Date(),
            comentarioAprobacion: 'Aprobado desde Kanban',
            ordenCompra: {
              id: `oc-${Date.now()}`,
              numero: `OC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
              requerimientoId: doc.id,
              proveedor: { nombre: 'Proveedor Demo S.A.', cuit: '30-99999999-9' },
              items: doc.items || [],
              subtotal: doc.monto,
              impuestos: doc.monto * 0.21,
              total: doc.monto * 1.21,
              moneda: doc.moneda,
              fechaEmision: new Date(),
              fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              estado: 'EN_PROCESO',
            },
          });
          break;
        case 'OC_GENERADA':
          actualizarRequerimiento(doc.id, {
            estado: 'RECIBIDO',
            recepcion: {
              id: `rec-${Date.now()}`,
              ordenCompraId: doc.requerimientoId || doc.id,
              fechaRecepcion: new Date(),
              recibidoPor: usuarioActual.nombre,
              conformidad: 'CONFORME',
              observaciones: 'Recepcion confirmada desde Kanban',
            },
          });
          break;
      }
    }
    setSelectedDoc(null);
  }, [actualizarRequerimiento, usuarioActual]);

  // Manejar drag and drop
  const handleDragEnd = useCallback((result: DropResult) => {
    const { draggableId, destination, source } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Parsear el draggableId para obtener tipo e id
    const [tipo, ...idParts] = draggableId.split('-');
    const id = idParts.join('-');

    const targetKanban = destination.droppableId as EstadoKanban;
    const doc = documentosKanban.find(d => d.tipo === tipo && d.id === id);

    if (!doc) return;

    // Solo permitir transiciones de requerimientos
    if (doc.tipo !== 'REQUERIMIENTO') return;

    const currentEstado = doc.estadoOriginal as EstadoRequerimiento;
    const newEstado = getNextEstadoRequerimiento(currentEstado, targetKanban);

    if (newEstado) {
      if (newEstado === 'BORRADOR') {
        actualizarRequerimiento(doc.id, {
          estado: 'BORRADOR',
          aprobadorId: undefined,
          aprobador: undefined,
          fechaAprobacion: undefined,
          comentarioAprobacion: undefined,
        });
      } else if (newEstado === 'PENDIENTE_APROBACION') {
        actualizarRequerimiento(doc.id, { estado: 'PENDIENTE_APROBACION' });
      } else if (newEstado === 'APROBADO' || newEstado === 'OC_GENERADA') {
        actualizarRequerimiento(doc.id, {
          estado: 'OC_GENERADA',
          aprobadorId: usuarioActual.id,
          aprobador: usuarioActual,
          fechaAprobacion: new Date(),
          comentarioAprobacion: 'Aprobado desde Kanban',
          ordenCompra: {
            id: `oc-${Date.now()}`,
            numero: `OC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
            requerimientoId: doc.id,
            proveedor: { nombre: 'Proveedor Demo S.A.', cuit: '30-99999999-9' },
            items: doc.items || [],
            subtotal: doc.monto,
            impuestos: doc.monto * 0.21,
            total: doc.monto * 1.21,
            moneda: doc.moneda,
            fechaEmision: new Date(),
            fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            estado: 'EN_PROCESO',
          },
        });
      } else if (newEstado === 'RECHAZADO') {
        actualizarRequerimiento(doc.id, {
          estado: 'RECHAZADO',
          aprobadorId: usuarioActual.id,
          aprobador: usuarioActual,
          fechaAprobacion: new Date(),
          comentarioAprobacion: 'Rechazado desde Kanban',
        });
      } else if (newEstado === 'RECIBIDO') {
        actualizarRequerimiento(doc.id, {
          estado: 'RECIBIDO',
          recepcion: {
            id: `rec-${Date.now()}`,
            ordenCompraId: doc.requerimientoId || doc.id,
            fechaRecepcion: new Date(),
            recibidoPor: usuarioActual.nombre,
            conformidad: 'CONFORME',
            observaciones: 'Recepcion confirmada desde Kanban',
          },
        });
      }
    }
  }, [documentosKanban, actualizarRequerimiento, usuarioActual]);

  // Navegar al detalle completo
  const navigateToDetail = useCallback((doc: DocumentoKanban) => {
    switch (doc.tipo) {
      case 'REQUERIMIENTO':
        router.push(`/compras/requerimientos/${doc.id}`);
        break;
      case 'ORDEN_COMPRA':
        router.push(`/compras/ordenes-compra/${doc.id}`);
        break;
      case 'RECEPCION':
        router.push(`/compras/recepciones/${doc.requerimientoId}`);
        break;
    }
  }, [router]);

  // Estadisticas
  const stats = useMemo(() => ({
    total: documentosFiltrados.length,
    borradores: documentosPorColumna.BORRADOR.length,
    pendientes: documentosPorColumna.PENDIENTE.length,
    aprobados: documentosPorColumna.APROBADO.length,
    rechazados: documentosPorColumna.RECHAZADO.length,
    finalizados: documentosPorColumna.FINALIZADO.length,
  }), [documentosFiltrados, documentosPorColumna]);

  // Columnas visibles segun filtro de estados
  const columnasVisibles = useMemo(() => {
    return columnasKanban.filter(col => filtroEstados.includes(col.id));
  }, [filtroEstados]);

  return (
    <div className="p-6 space-y-6 h-full">
      <PageHeader
        title="Circuito de Compras"
        subtitle={`${stats.total} documento${stats.total !== 1 ? 's' : ''} en el circuito`}
        action={
          <Button onClick={() => router.push('/compras/requerimientos/nuevo')}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Requerimiento
          </Button>
        }
      />

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">Filtros:</span>
          </div>

          {/* Boton filtro tipos */}
          <button
            onClick={() => setShowFiltroTipos(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-gray-50 transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-primary">Comprobantes</span>
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
              {filtroTipos.length}
            </span>
          </button>

          {/* Boton filtro estados */}
          <button
            onClick={() => setShowFiltroEstados(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-gray-50 transition-colors"
          >
            <Flag className="w-4 h-4 text-text-secondary" />
            <span className="text-sm text-text-primary">Estados</span>
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
              {filtroEstados.length}
            </span>
          </button>

          {/* Indicador de filtros activos */}
          {(filtroTipos.length < allTiposDocumento.length || filtroEstados.length < allEstadosKanban.length) && (
            <button
              onClick={() => {
                setFiltroTipos(allTiposDocumento);
                setFiltroEstados(allEstadosKanban);
              }}
              className="text-xs text-text-secondary hover:text-primary"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats cards - solo columnas visibles */}
      <div className={`grid grid-cols-2 gap-4 ${
        columnasVisibles.length <= 3 ? 'md:grid-cols-3' :
        columnasVisibles.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-5'
      }`}>
        {columnasVisibles.map((col) => {
          const Icon = col.icon;
          const count = documentosPorColumna[col.id].length;
          return (
            <div
              key={col.id}
              className={`bg-white rounded-lg border border-border p-4 flex items-center gap-3`}
            >
              <div className={`p-2 rounded-lg ${col.bgColor}`}>
                <Icon className={`w-5 h-5 ${col.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{count}</p>
                <p className="text-sm text-text-secondary">{col.titulo}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablero Kanban con DragDropContext */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="bg-white rounded-lg shadow-sm border border-border p-4 overflow-hidden">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columnasVisibles.map((columna) => (
              <KanbanColumn
                key={columna.id}
                columna={columna}
                documentos={documentosPorColumna[columna.id]}
                onCardClick={setSelectedDoc}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Leyenda */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <p className="text-xs text-text-secondary">
          Arrastra las tarjetas entre columnas para cambiar el estado del documento.
        </p>
      </div>

      {/* Modal de detalle */}
      {selectedDoc && (
        <DocumentoDetailModal
          documento={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onAdvanceState={() => advanceDocumentState(selectedDoc)}
          onNavigate={() => navigateToDetail(selectedDoc)}
        />
      )}

      {/* Modal filtro tipos */}
      <FiltroTiposModal
        isOpen={showFiltroTipos}
        onClose={() => setShowFiltroTipos(false)}
        selectedTipos={filtroTipos}
        onToggle={toggleTipoFiltro}
      />

      {/* Modal filtro estados */}
      <FiltroEstadosModal
        isOpen={showFiltroEstados}
        onClose={() => setShowFiltroEstados(false)}
        selectedEstados={filtroEstados}
        onToggle={toggleEstadoFiltro}
      />
    </div>
  );
}
