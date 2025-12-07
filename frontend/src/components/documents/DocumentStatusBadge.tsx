'use client';

type DocumentStatus = 'PROCESSING' | 'PRESENTED' | 'IN_REVIEW' | 'APPROVED' | 'EXPORTED' | 'PAID' | 'REJECTED';

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<DocumentStatus, { label: string; bgColor: string }> = {
  PROCESSING: {
    label: 'Procesando',
    bgColor: 'bg-gray-500',
  },
  PRESENTED: {
    label: 'Presentado',
    bgColor: 'bg-blue-500',
  },
  IN_REVIEW: {
    label: 'En Revisión',
    bgColor: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Aprobado',
    bgColor: 'bg-emerald-500',
  },
  EXPORTED: {
    label: 'Exportado',
    bgColor: 'bg-gray-900',
  },
  PAID: {
    label: 'Pagado',
    bgColor: 'bg-green-700',
  },
  REJECTED: {
    label: 'Rechazado',
    bgColor: 'bg-red-500',
  },
};

export function DocumentStatusBadge({ status, size = 'md' }: DocumentStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PROCESSING;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center rounded font-medium text-white ${config.bgColor} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}
