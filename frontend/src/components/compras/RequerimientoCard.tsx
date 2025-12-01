'use client';

import Link from 'next/link';
import { Requerimiento } from '@/types/compras';
import { EstadoBadge } from './EstadoBadge';
import { PrioridadBadge } from './PrioridadBadge';
import { DollarSign, Calendar, Building2 } from 'lucide-react';

interface RequerimientoCardProps {
  requerimiento: Requerimiento;
  showActions?: boolean;
  onVerOC?: () => void;
  onConfirmarRecepcion?: () => void;
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
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

export function RequerimientoCard({
  requerimiento,
  showActions = true,
  onVerOC,
  onConfirmarRecepcion,
}: RequerimientoCardProps) {
  const { estado } = requerimiento;

  const getEstadoMensaje = () => {
    switch (estado) {
      case 'PENDIENTE_APROBACION':
        return `Esperando aprobacion de ${requerimiento.aprobador?.nombre || 'aprobador'}`;
      case 'APROBADO':
        return `Aprobado por ${requerimiento.aprobador?.nombre} el ${formatFecha(requerimiento.fechaAprobacion!)}`;
      case 'RECHAZADO':
        return `Rechazado: "${requerimiento.comentarioAprobacion}"`;
      case 'OC_GENERADA':
        return `${requerimiento.ordenCompra?.numero} generada - Entrega estimada: ${formatFecha(requerimiento.ordenCompra!.fechaEntregaEstimada)}`;
      case 'RECIBIDO':
        return `Recibido el ${formatFecha(requerimiento.recepcion!.fechaRecepcion)}`;
      default:
        return '';
    }
  };

  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm text-text-secondary">{requerimiento.numero}</span>
          <EstadoBadge estado={estado} size="sm" />
        </div>
        <h3 className="font-medium text-text-primary">
          {requerimiento.titulo}
        </h3>

        <div className="flex items-center gap-4 text-sm text-text-secondary mt-2">
          <span className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            {formatMonto(requerimiento.montoEstimado, requerimiento.moneda)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatFecha(requerimiento.fechaCreacion)}
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            {requerimiento.centroCostos}
          </span>
        </div>

        {getEstadoMensaje() && (
          <p className="text-sm text-text-secondary mt-2">{getEstadoMensaje()}</p>
        )}
      </div>

      {showActions && (
        <div className="flex items-center gap-2">
          <Link
            href={`/compras/requerimientos/${requerimiento.id}`}
            className="text-sm text-palette-purple hover:text-palette-dark font-medium"
          >
            Ver Detalle
          </Link>

          {estado === 'OC_GENERADA' && requerimiento.ordenCompra && (
            <>
              <Link
                href={`/compras/ordenes-compra/${requerimiento.ordenCompra.id}`}
                className="text-sm text-palette-purple hover:text-palette-dark font-medium"
              >
                Ver OC
              </Link>
              <button
                onClick={onConfirmarRecepcion}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                Confirmar Rec.
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
