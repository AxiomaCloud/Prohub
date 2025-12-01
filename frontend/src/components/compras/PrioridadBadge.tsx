'use client';

import { Prioridad } from '@/types/compras';
import { ArrowDown, ArrowRight, ArrowUp, AlertCircle, LucideIcon } from 'lucide-react';

interface PrioridadBadgeProps {
  prioridad: Prioridad;
  size?: 'sm' | 'md';
}

const prioridadConfig: Record<
  Prioridad,
  { label: string; bgColor: string; textColor: string; Icon: LucideIcon }
> = {
  BAJA: {
    label: 'Baja',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    Icon: ArrowDown,
  },
  NORMAL: {
    label: 'Normal',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    Icon: ArrowRight,
  },
  ALTA: {
    label: 'Alta',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    Icon: ArrowUp,
  },
  URGENTE: {
    label: 'Urgente',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    Icon: AlertCircle,
  },
};

export function PrioridadBadge({ prioridad, size = 'md' }: PrioridadBadgeProps) {
  const config = prioridadConfig[prioridad];
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
