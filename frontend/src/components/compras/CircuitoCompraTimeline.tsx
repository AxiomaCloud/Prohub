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
} from 'lucide-react';

interface CircuitoCompraTimelineProps {
  requerimiento?: Requerimiento | null;
  ordenCompra?: OrdenCompra | null;
  recepcion?: Recepcion | null;
  // Punto de entrada - desde qué documento se abrió el timeline
  origen: 'requerimiento' | 'ordenCompra' | 'recepcion';
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
  // Estados de OC
  PENDIENTE: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock, label: 'Pendiente' },
  EN_PROCESO: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Truck, label: 'En Proceso' },
  PARCIALMENTE_RECIBIDA: { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: Package, label: 'Parcialmente Recibida' },
  ENTREGADA: { color: 'text-teal-600', bgColor: 'bg-teal-100', icon: PackageCheck, label: 'Entregada' },
  APROBADA: { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle, label: 'Aprobada' },
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
}: {
  tipo: 'requerimiento' | 'ordenCompra' | 'recepcion';
  activo: boolean;
  completado: boolean;
  data: Requerimiento | OrdenCompra | Recepcion | null;
  isHighlighted: boolean;
  onClick?: () => void;
}) {
  if (!data && !activo) {
    // Nodo pendiente/futuro
    return (
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
          {tipo === 'requerimiento' && <FileText className="w-6 h-6 text-gray-300" />}
          {tipo === 'ordenCompra' && <ShoppingCart className="w-6 h-6 text-gray-300" />}
          {tipo === 'recepcion' && <Package className="w-6 h-6 text-gray-300" />}
        </div>
        <span className="mt-2 text-xs text-gray-400 font-medium">
          {tipo === 'requerimiento' && 'Requerimiento'}
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
        className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${
          isHighlighted
            ? `${config.bgColor} border-current ${config.color} ring-4 ring-offset-2 ring-current/20`
            : completado
            ? `${config.bgColor} border-current ${config.color}`
            : 'bg-white border-gray-300'
        }`}
      >
        <Icon className={`w-6 h-6 ${isHighlighted || completado ? config.color : 'text-gray-400'}`} />
      </div>
      <span className={`mt-2 text-xs font-medium ${isHighlighted ? config.color : 'text-gray-700'}`}>
        {tipo === 'requerimiento' && 'Requerimiento'}
        {tipo === 'ordenCompra' && 'Orden de Compra'}
        {tipo === 'recepcion' && 'Recepción'}
      </span>
      {data && (
        <span className={`text-xs ${config.color}`}>
          {tipo === 'requerimiento' && (data as Requerimiento).numero}
          {tipo === 'ordenCompra' && (data as OrdenCompra).numero}
          {tipo === 'recepcion' && (data as Recepcion).numero}
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
  tipo: 'requerimiento' | 'ordenCompra' | 'recepcion';
  data: Requerimiento | OrdenCompra | Recepcion | null;
  isVisible: boolean;
}) {
  if (!data || !isVisible) return null;

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
  ordenCompra,
  recepcion,
  origen,
}: CircuitoCompraTimelineProps) {
  // Determinar el estado del flujo
  const tieneRequerimiento = !!requerimiento;
  const tieneOC = !!ordenCompra;
  const tieneRecepcion = !!recepcion || !!(ordenCompra?.recepciones && ordenCompra.recepciones.length > 0);

  // Obtener todas las recepciones
  const recepciones = useMemo(() => {
    if (recepcion) return [recepcion];
    if (ordenCompra?.recepciones) return ordenCompra.recepciones;
    if (requerimiento?.recepcion) return [requerimiento.recepcion];
    return [];
  }, [recepcion, ordenCompra, requerimiento]);

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Trazabilidad del Circuito de Compras</h3>
        <p className="text-sm text-gray-500 mt-1">
          Visualización completa del flujo desde el requerimiento hasta la recepción
        </p>
      </div>

      {/* Timeline visual */}
      <div className="flex items-center justify-center py-6">
        <NodoCircuito
          tipo="requerimiento"
          activo={tieneRequerimiento}
          completado={tieneRequerimiento}
          data={requerimiento || null}
          isHighlighted={origen === 'requerimiento'}
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
          data={recepciones[0] || null}
          isHighlighted={origen === 'recepcion'}
        />
      </div>

      {/* Indicador de progreso */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
          <span className="text-xs text-gray-500">Progreso:</span>
          <div className="flex gap-1">
            <div className={`w-3 h-3 rounded-full ${tieneRequerimiento ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${tieneOC ? 'bg-purple-500' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${tieneRecepcion ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          </div>
          <span className="text-xs font-medium text-gray-700">
            {tieneRecepcion ? '100%' : tieneOC ? '66%' : tieneRequerimiento ? '33%' : '0%'}
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

        {/* Orden de Compra */}
        {(tieneOC || requerimiento?.ordenCompra) && (
          <DetalleDocumento
            tipo="ordenCompra"
            data={ordenCompra || requerimiento?.ordenCompra || null}
            isVisible={true}
          />
        )}

        {/* Recepciones */}
        {recepciones.length > 0 && (
          <div className="space-y-3">
            {recepciones.length > 1 && (
              <p className="text-sm font-medium text-gray-700">
                {recepciones.length} recepciones registradas:
              </p>
            )}
            {recepciones.map((rec, idx) => (
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

      {/* Mensaje si el flujo está incompleto */}
      {!tieneRecepcion && tieneOC && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Esta orden de compra está pendiente de recepción
          </p>
        </div>
      )}

      {!tieneOC && tieneRequerimiento && requerimiento?.estado === 'APROBADO' && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <ShoppingCart className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            Este requerimiento está aprobado pero aún no tiene orden de compra generada
          </p>
        </div>
      )}
    </div>
  );
}
