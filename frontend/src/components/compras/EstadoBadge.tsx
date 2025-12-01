'use client';

import { EstadoRequerimiento } from '@/types/compras';
import { FileEdit, Clock, CheckCircle, XCircle, FileText, PackageCheck, LucideIcon } from 'lucide-react';

interface EstadoBadgeProps {
  estado: EstadoRequerimiento;
  size?: 'sm' | 'md';
}

const estadoConfig: Record<
  EstadoRequerimiento,
  { label: string; bgColor: string; textColor: string; Icon: LucideIcon }
> = {
  BORRADOR: {
    label: 'Borrador',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    Icon: FileEdit,
  },
  PENDIENTE_APROBACION: {
    label: 'Pend. Aprobacion',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    Icon: Clock,
  },
  APROBADO: {
    label: 'Aprobado',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    Icon: CheckCircle,
  },
  RECHAZADO: {
    label: 'Rechazado',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    Icon: XCircle,
  },
  OC_GENERADA: {
    label: 'OC Generada',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    Icon: FileText,
  },
  RECIBIDO: {
    label: 'Recibido',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    Icon: PackageCheck,
  },
};

export function EstadoBadge({ estado, size = 'md' }: EstadoBadgeProps) {
  const config = estadoConfig[estado];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses}`}
    >
      <config.Icon className={iconSize} />
      <span>{config.label}</span>
    </span>
  );
}
