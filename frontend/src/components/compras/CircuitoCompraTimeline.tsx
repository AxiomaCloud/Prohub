'use client';

import { useMemo } from 'react';
import { Requerimiento, OrdenCompra, Recepcion } from '@/types/compras';
import {
  FileText,
  ShoppingCart,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  User,
  Calendar,
  Building2,
  DollarSign,
  Truck,
  ClipboardCheck,
  Send,
  FileCheck,
  PackageCheck,
  ChevronRight,
  FileSearch,
  Award,
} from 'lucide-react';

// Interface para RFQ en el circuito
interface RFQInfo {
  id: string;
  number: string;
  title: string;
  status: string;
  quotationsCount?: number;
  awardedSupplier?: string;
}

interface CircuitoCompraTimelineProps {
  requerimiento?: Requerimiento | null;
  rfq?: RFQInfo | null;
  ordenCompra?: OrdenCompra | null;
  recepcion?: Recepcion | null;
  // Punto de entrada - desde qué documento se abrió el timeline
  origen: 'requerimiento' | 'rfq' | 'ordenCompra' | 'recepcion';
}

// Configuración de estados con colores e iconos
const ESTADO_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
  // Estados de Requerimiento
  BORRADOR: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: FileText, label: 'Borrador' },
  PENDIENTE_APROBACION: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock, label: 'Pendiente Aprobación' },
  APROBADO: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle, label: 'Aprobado' },
  RECHAZADO: { color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle, label: 'Rechazado' },
  OC_GENERADA: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: ShoppingCart, label: 'OC Generada' },
  RECIBIDO: { color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: PackageCheck, label: 'Recibido' },
  CANCELADO: { color: 'text-gray-500', bgColor: 'bg-gray-100', icon: XCircle, label: 'Cancelado' },
  // Estados de RFQ
  DRAFT: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: FileSearch, label: 'Borrador' },
  PUBLISHED: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Send, label: 'Publicada' },
  IN_QUOTATION: { color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: FileSearch, label: 'En Cotización' },
  EVALUATION: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: ClipboardCheck, label: 'En Evaluación' },
  AWARDED: { color: 'text-green-600', bgColor: 'bg-green-100', icon: Award, label: 'Adjudicada' },
  CLOSED: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: CheckCircle, label: 'Cerrada' },
  CANCELLED: { color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle, label: 'Cancelada' },
  // Estados de OC
  PENDIENTE: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock, label: 'Pendiente' },
  EN_PROCESO: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Truck, label: 'En Proceso' },
  PARCIALMENTE_RECIBIDA: { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Package, label: 'Parcialmente Recibida' },
  ENTREGADA: { color: 'text-teal-600', bgColor: 'bg-teal-100', icon: PackageCheck, label: 'Entregada' },
  APROBADA: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle, label: 'Aprobada' },
  RECHAZADA: { color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle, label: 'Rechazada' },
  FINALIZADA: { color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle, label: 'Finalizada' },
};

function formatFecha(fecha: Date | string | undefined): string {
  if (!fecha) return '-';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

function formatMonto(monto: number | undefined, moneda: string = 'ARS'): string {
  if (monto === undefined) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

// Componente para cada nodo del circuito
function NodoCircuito({
  tipo,
  activo,
  completado,
  data,
  isHighlighted,
  onClick,
  cantidadRecepciones,
}: {
  tipo: 'requerimiento' | 'rfq' | 'ordenCompra' | 'recepcion';
  activo: boolean;
  completado: boolean;
  data: Requerimiento | RFQInfo | OrdenCompra | Recepcion | null;
  isHighlighted: boolean;
  onClick?: () => void;
  cantidadRecepciones?: number;
}) {
  if (!data && !activo) {
    // Nodo pendiente/futuro
    return (
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
          {tipo === 'requerimiento' && <FileText className="w-5 h-5 text-gray-300" />}
          {tipo === 'rfq' && <FileSearch className="w-5 h-5 text-gray-300" />}
          {tipo === 'ordenCompra' && <ShoppingCart className="w-5 h-5 text-gray-300" />}
          {tipo === 'recepcion' && <Package className="w-5 h-5 text-gray-300" />}
        </div>
        <span className="mt-2 text-xs text-gray-400 font-medium text-center">
          {tipo === 'requerimiento' && 'Requerimiento'}
          {tipo === 'rfq' && 'Cotización'}
          {tipo === 'ordenCompra' && 'Orden de Compra'}
          {tipo === 'recepcion' && 'Recepción'}
        </span>
        <span className="text-xs text-gray-300">Pendiente</span>
      </div>
    );
  }

  const getConfig = () => {
    if (tipo === 'requerimiento') {
      const req = data as Requerimiento;
      return ESTADO_CONFIG[req?.estado] || ESTADO_CONFIG.BORRADOR;
    }
    if (tipo === 'rfq') {
      const rfq = data as RFQInfo;
      return ESTADO_CONFIG[rfq?.status] || ESTADO_CONFIG.DRAFT;
    }
    if (tipo === 'ordenCompra') {
      const oc = data as OrdenCompra;
      return ESTADO_CONFIG[oc?.estado] || ESTADO_CONFIG.PENDIENTE;
    }
    if (tipo === 'recepcion') {
      return ESTADO_CONFIG.ENTREGADA;
    }
    return ESTADO_CONFIG.BORRADOR;
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div
      className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${
        isHighlighted ? 'scale-110' : 'hover:scale-105'
      }`}
      onClick={onClick}
    >
      <div
        className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all ${
          isHighlighted
            ? `${config.bgColor} border-current ${config.color} ring-4 ring-offset-2 ring-current/20`
            : completado
            ? `${config.bgColor} border-current ${config.color}`
            : 'bg-white border-gray-300'
        }`}
      >
        <Icon className={`w-5 h-5 ${isHighlighted || completado ? config.color : 'text-gray-400'}`} />
      </div>
      <span className={`mt-2 text-xs font-medium text-center ${isHighlighted ? config.color : 'text-gray-700'}`}>
        {tipo === 'requerimiento' && 'Requerimiento'}
        {tipo === 'rfq' && 'Cotización'}
        {tipo === 'ordenCompra' && 'Orden de Compra'}
        {tipo === 'recepcion' && (cantidadRecepciones && cantidadRecepciones > 1 ? `${cantidadRecepciones} Recepciones` : 'Recepción')}
      </span>
      {data && (
        <span className={`text-xs ${config.color}`}>
          {tipo === 'requerimiento' && (data as Requerimiento).numero}
          {tipo === 'rfq' && (data as RFQInfo).number}
          {tipo === 'ordenCompra' && (data as OrdenCompra).numero}
          {tipo === 'recepcion' && (cantidadRecepciones && cantidadRecepciones > 1
            ? 'Ver detalle'
            : (data as Recepcion).numero)}
        </span>
      )}
    </div>
  );
}

// Conector entre nodos
function Conector({ activo }: { activo: boolean }) {
  return (
    <div className="flex items-center px-2">
      <div className={`h-0.5 w-8 ${activo ? 'bg-green-400' : 'bg-gray-200'}`} />
      <ChevronRight className={`w-5 h-5 ${activo ? 'text-green-400' : 'text-gray-300'}`} />
      <div className={`h-0.5 w-8 ${activo ? 'bg-green-400' : 'bg-gray-200'}`} />
    </div>
  );
}

// Panel de detalle para cada documento
function DetalleDocumento({
  tipo,
  data,
  isVisible,
}: {
  tipo: 'requerimiento' | 'rfq' | 'ordenCompra' | 'recepcion';
  data: Requerimiento | RFQInfo | OrdenCompra | Recepcion | null;
  isVisible: boolean;
}) {
  if (!data || !isVisible) return null;

  if (tipo === 'rfq') {
    const rfq = data as RFQInfo;
    const estadoConfig = ESTADO_CONFIG[rfq.status] || ESTADO_CONFIG.DRAFT;
    const EstadoIcon = estadoConfig.icon;

    return (
      <div className="bg-white rounded-lg border border-indigo-200 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-900">{rfq.number}</span>
            </div>
            <h4 className="text-sm font-medium text-gray-700 mt-1">{rfq.title}</h4>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.bgColor} ${estadoConfig.color}`}>
            <EstadoIcon className="w-3 h-3" />
            {estadoConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {rfq.quotationsCount !== undefined && (
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{rfq.quotationsCount} cotizaciones recibidas</span>
            </div>
          )}
          {rfq.awardedSupplier && (
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">Adjudicada a: <span className="font-medium">{rfq.awardedSupplier}</span></span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tipo === 'requerimiento') {
    const req = data as Requerimiento;
    const estadoConfig = ESTADO_CONFIG[req.estado] || ESTADO_CONFIG.BORRADOR;
    const EstadoIcon = estadoConfig.icon;

    return (
      <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">{req.numero}</span>
            </div>
            <h4 className="text-sm font-medium text-gray-700 mt-1">{req.titulo}</h4>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.bgColor} ${estadoConfig.color}`}>
            <EstadoIcon className="w-3 h-3" />
            {estadoConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{req.solicitante?.nombre || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{formatFecha(req.fechaCreacion)}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{formatMonto(req.montoEstimado, req.moneda)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{req.items?.length || 0} items</span>
          </div>
        </div>

        {req.aprobador && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-600">
                Aprobado por <span className="font-medium">{req.aprobador.nombre}</span> el {formatFecha(req.fechaAprobacion)}
              </span>
            </div>
            {req.comentarioAprobacion && (
              <p className="mt-1 text-xs text-gray-500 italic ml-6">"{req.comentarioAprobacion}"</p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (tipo === 'ordenCompra') {
    const oc = data as OrdenCompra;
    const estadoConfig = ESTADO_CONFIG[oc.estado] || ESTADO_CONFIG.PENDIENTE;
    const EstadoIcon = estadoConfig.icon;

    return (
      <div className="bg-white rounded-lg border border-purple-200 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">{oc.numero}</span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.bgColor} ${estadoConfig.color}`}>
            <EstadoIcon className="w-3 h-3" />
            {estadoConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{oc.proveedor?.nombre || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{formatFecha(oc.fechaEmision)}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 font-medium">{formatMonto(oc.total, oc.moneda)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{oc.items?.length || 0} items</span>
          </div>
        </div>

        {oc.lugarEntrega && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <Truck className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Entrega: {oc.lugarEntrega}</span>
            </div>
          </div>
        )}

        {/* Info de aprobación/rechazo de OC */}
        {oc.aprobadorOC && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              {oc.estado === 'RECHAZADA' ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              <span className="text-gray-600">
                {oc.estado === 'RECHAZADA' ? 'Rechazada' : 'Aprobada'} por{' '}
                <span className="font-medium">{oc.aprobadorOC.nombre}</span>
                {oc.fechaAprobacionOC && ` el ${formatFecha(oc.fechaAprobacionOC)}`}
              </span>
            </div>
            {oc.comentarioAprobacionOC && (
              <p className={`mt-1 text-xs italic ml-6 ${oc.estado === 'RECHAZADA' ? 'text-red-600' : 'text-gray-500'}`}>
                "{oc.comentarioAprobacionOC}"
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (tipo === 'recepcion') {
    const rec = data as Recepcion;

    return (
      <div className="bg-white rounded-lg border border-emerald-200 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-gray-900">{rec.numero}</span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            rec.tipoRecepcion === 'TOTAL' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
          }`}>
            <PackageCheck className="w-3 h-3" />
            {rec.tipoRecepcion === 'TOTAL' ? 'Total' : 'Parcial'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{rec.receptor?.nombre || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{formatFecha(rec.fechaRecepcion)}</span>
          </div>
        </div>

        {rec.itemsRecibidos && rec.itemsRecibidos.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Items recibidos:</p>
            <div className="space-y-1">
              {rec.itemsRecibidos.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs bg-gray-50 rounded px-2 py-1">
                  <span className="text-gray-600 truncate max-w-[60%]">{item.descripcion}</span>
                  <span className="text-emerald-600 font-medium">{item.cantidadRecibida} {item.unidad}</span>
                </div>
              ))}
              {rec.itemsRecibidos.length > 3 && (
                <p className="text-xs text-gray-400">+{rec.itemsRecibidos.length - 3} más...</p>
              )}
            </div>
          </div>
        )}

        {rec.observaciones && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 italic">"{rec.observaciones}"</p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function CircuitoCompraTimeline({
  requerimiento,
  rfq,
  ordenCompra,
  recepcion,
  origen,
}: CircuitoCompraTimelineProps) {
  // Determinar el estado del flujo
  const tieneRequerimiento = !!requerimiento;
  const tieneRFQ = !!rfq;
  const tieneOC = !!ordenCompra;
  const tieneRecepcion = !!recepcion || !!(ordenCompra?.recepciones && ordenCompra.recepciones.length > 0);

  // Obtener todas las recepciones - priorizar las de la OC que pueden ser múltiples
  const todasLasRecepciones = useMemo(() => {
    // Primero intentar obtener de la OC (pueden ser múltiples)
    if (ordenCompra?.recepciones && ordenCompra.recepciones.length > 0) {
      return ordenCompra.recepciones;
    }
    // Si hay una recepción individual pasada
    if (recepcion) return [recepcion];
    // Si hay una recepción en el requerimiento
    if (requerimiento?.recepcion) return [requerimiento.recepcion];
    return [];
  }, [recepcion, ordenCompra, requerimiento]);

  // Calcular progreso (4 pasos ahora)
  const calcularProgreso = () => {
    let pasos = 0;
    if (tieneRequerimiento) pasos++;
    if (tieneRFQ) pasos++;
    if (tieneOC) pasos++;
    if (tieneRecepcion) pasos++;
    return Math.round((pasos / 4) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Trazabilidad del Circuito de Compras</h3>
        <p className="text-sm text-gray-500 mt-1">
          Visualización completa del flujo desde el requerimiento hasta la recepción
        </p>
      </div>

      {/* Timeline visual - 4 nodos */}
      <div className="flex items-center justify-center py-6 overflow-x-auto">
        <NodoCircuito
          tipo="requerimiento"
          activo={tieneRequerimiento}
          completado={tieneRequerimiento}
          data={requerimiento || null}
          isHighlighted={origen === 'requerimiento'}
        />

        <Conector activo={tieneRFQ || tieneOC} />

        <NodoCircuito
          tipo="rfq"
          activo={tieneRFQ}
          completado={tieneRFQ}
          data={rfq || null}
          isHighlighted={origen === 'rfq'}
        />

        <Conector activo={tieneOC} />

        <NodoCircuito
          tipo="ordenCompra"
          activo={tieneOC}
          completado={tieneOC}
          data={ordenCompra || requerimiento?.ordenCompra || null}
          isHighlighted={origen === 'ordenCompra'}
        />

        <Conector activo={tieneRecepcion} />

        <NodoCircuito
          tipo="recepcion"
          activo={tieneRecepcion}
          completado={tieneRecepcion}
          data={todasLasRecepciones[0] || null}
          isHighlighted={origen === 'recepcion'}
          cantidadRecepciones={todasLasRecepciones.length}
        />
      </div>

      {/* Indicador de progreso */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
          <span className="text-xs text-gray-500">Progreso:</span>
          <div className="flex gap-1">
            <div className={`w-3 h-3 rounded-full ${tieneRequerimiento ? 'bg-blue-500' : 'bg-gray-300'}`} title="Requerimiento" />
            <div className={`w-3 h-3 rounded-full ${tieneRFQ ? 'bg-indigo-500' : 'bg-gray-300'}`} title="Cotización" />
            <div className={`w-3 h-3 rounded-full ${tieneOC ? 'bg-purple-500' : 'bg-gray-300'}`} title="Orden de Compra" />
            <div className={`w-3 h-3 rounded-full ${tieneRecepcion ? 'bg-emerald-500' : 'bg-gray-300'}`} title="Recepción" />
          </div>
          <span className="text-xs font-medium text-gray-700">
            {calcularProgreso()}%
          </span>
        </div>
      </div>

      {/* Detalles de cada documento */}
      <div className="space-y-4">
        {/* Requerimiento */}
        {tieneRequerimiento && (
          <DetalleDocumento
            tipo="requerimiento"
            data={requerimiento!}
            isVisible={true}
          />
        )}

        {/* RFQ / Solicitud de Cotización */}
        {tieneRFQ && (
          <DetalleDocumento
            tipo="rfq"
            data={rfq!}
            isVisible={true}
          />
        )}

        {/* Orden de Compra */}
        {(tieneOC || requerimiento?.ordenCompra) && (
          <DetalleDocumento
            tipo="ordenCompra"
            data={ordenCompra || requerimiento?.ordenCompra || null}
            isVisible={true}
          />
        )}

        {/* Recepciones */}
        {todasLasRecepciones.length > 0 && (
          <div className="space-y-3">
            {todasLasRecepciones.length > 1 && (
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                {todasLasRecepciones.length} recepciones registradas:
              </p>
            )}
            {todasLasRecepciones.map((rec, idx) => (
              <DetalleDocumento
                key={rec.id || idx}
                tipo="recepcion"
                data={rec}
                isVisible={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mensajes informativos según el estado del flujo */}
      {!tieneRecepcion && tieneOC && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Esta orden de compra está pendiente de recepción
          </p>
        </div>
      )}

      {!tieneOC && tieneRFQ && rfq?.status === 'AWARDED' && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <ShoppingCart className="w-5 h-5 text-purple-500 flex-shrink-0" />
          <p className="text-sm text-purple-700">
            La cotización fue adjudicada. Pendiente generar Orden de Compra.
          </p>
        </div>
      )}

      {!tieneOC && !tieneRFQ && tieneRequerimiento && requerimiento?.estado === 'APROBADO' && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <FileSearch className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Este requerimiento está aprobado. Puede crear una solicitud de cotización o generar OC directa.
          </p>
        </div>
      )}

      {tieneRFQ && !['AWARDED', 'CLOSED', 'CANCELLED'].includes(rfq?.status || '') && (
        <div className="flex items-center gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <Clock className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          <p className="text-sm text-indigo-700">
            La solicitud de cotización está en proceso. Esperando cotizaciones de proveedores.
          </p>
        </div>
      )}
    </div>
  );
}
