'use client';

import { CheckCircle, XCircle, Clock, AlertTriangle, Ban, LucideIcon } from 'lucide-react';

type WorkflowStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<
  WorkflowStatus,
  { label: string; bgColor: string; textColor: string; Icon: LucideIcon }
> = {
  PENDING: {
    label: 'Pendiente',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    Icon: Clock,
  },
  IN_PROGRESS: {
    label: 'En Aprobación',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    Icon: AlertTriangle,
  },
  APPROVED: {
    label: 'Aprobado',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    Icon: CheckCircle,
  },
  REJECTED: {
    label: 'Rechazado',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    Icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelado',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-500',
    Icon: Ban,
  },
};

export function WorkflowStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: WorkflowStatusBadgeProps) {
  const config = statusConfig[status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
    >
      {showIcon && <config.Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </span>
  );
}
