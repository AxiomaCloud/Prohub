'use client';

import { CheckCircle, XCircle, Clock, User, Users, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ApprovalInstance {
  id: string;
  decision: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'SKIPPED';
  comment?: string | null;
  decidedAt?: string | null;
  approver: {
    id: string;
    name: string;
    email: string;
  };
  delegatedFrom?: {
    id: string;
    name: string;
  } | null;
  level: {
    name: string;
    levelOrder: number;
    mode: 'ANY' | 'ALL';
    levelType: 'GENERAL' | 'SPECIFICATIONS';
  };
}

interface ApprovalWorkflow {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentLevelOrder: number;
  createdAt: string;
  completedAt?: string | null;
  rule: {
    name: string;
  };
  instances: ApprovalInstance[];
}

interface ApprovalTimelineProps {
  workflow: ApprovalWorkflow | null;
  compact?: boolean;
}

const DECISION_CONFIG = {
  PENDING: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
    label: 'Pendiente',
  },
  APPROVED: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    label: 'Aprobado',
  },
  REJECTED: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    label: 'Rechazado',
  },
  DELEGATED: {
    icon: Users,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
    label: 'Delegado',
  },
  SKIPPED: {
    icon: ArrowRight,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Omitido',
  },
};

const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-600 bg-yellow-50' },
  IN_PROGRESS: { label: 'En Progreso', color: 'text-blue-600 bg-blue-50' },
  APPROVED: { label: 'Aprobado', color: 'text-green-600 bg-green-50' },
  REJECTED: { label: 'Rechazado', color: 'text-red-600 bg-red-50' },
  CANCELLED: { label: 'Cancelado', color: 'text-gray-600 bg-gray-50' },
};

export function ApprovalTimeline({ workflow, compact = false }: ApprovalTimelineProps) {
  if (!workflow) {
    return (
      <div className="text-center py-4 text-gray-500">
        No hay workflow de aprobación activo
      </div>
    );
  }

  // Agrupar instancias por nivel
  const levelGroups: Record<number, ApprovalInstance[]> = {};
  workflow.instances.forEach((instance) => {
    const levelOrder = instance.level.levelOrder;
    if (!levelGroups[levelOrder]) {
      levelGroups[levelOrder] = [];
    }
    levelGroups[levelOrder].push(instance);
  });

  const sortedLevels = Object.keys(levelGroups)
    .map(Number)
    .sort((a, b) => a - b);

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {sortedLevels.map((levelOrder, index) => {
          const instances = levelGroups[levelOrder];
          const level = instances[0].level;
          const isCurrentLevel = levelOrder === workflow.currentLevelOrder;
          const isApproved = instances.some((i) => i.decision === 'APPROVED');
          const isRejected = instances.some((i) => i.decision === 'REJECTED');
          const allPending = instances.every((i) => i.decision === 'PENDING');

          let status: 'APPROVED' | 'REJECTED' | 'PENDING' = 'PENDING';
          if (isApproved && level.mode === 'ANY') status = 'APPROVED';
          if (isRejected) status = 'REJECTED';
          if (!allPending && !isApproved && !isRejected && level.mode === 'ALL') {
            const allApproved = instances.every((i) => i.decision === 'APPROVED');
            if (allApproved) status = 'APPROVED';
          }

          const config = DECISION_CONFIG[status];
          const Icon = config.icon;

          return (
            <div key={levelOrder} className="flex items-center">
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bgColor} ${config.color}`}
                title={`${level.name}: ${config.label}`}
              >
                <Icon className="h-3 w-3" />
                <span>{level.name}</span>
              </div>
              {index < sortedLevels.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-1 text-gray-400" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium text-gray-900">Flujo de Aprobación</h4>
          <p className="text-sm text-gray-500">{workflow.rule.name}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[workflow.status].color}`}
        >
          {STATUS_CONFIG[workflow.status].label}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {sortedLevels.map((levelOrder, levelIndex) => {
          const instances = levelGroups[levelOrder];
          const level = instances[0].level;
          const isCurrentLevel = levelOrder === workflow.currentLevelOrder;
          const isPastLevel = levelOrder < workflow.currentLevelOrder;

          return (
            <div key={levelOrder} className="relative pb-6 last:pb-0">
              {/* Connector line */}
              {levelIndex < sortedLevels.length - 1 && (
                <div
                  className={`absolute left-4 top-8 w-0.5 h-full ${
                    isPastLevel ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Level header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    isPastLevel
                      ? 'bg-green-500'
                      : isCurrentLevel
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                >
                  {levelOrder}
                </div>
                <div>
                  <span className="font-medium text-gray-900">{level.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({level.mode === 'ANY' ? 'Cualquiera' : 'Todos'})
                  </span>
                  {level.levelType === 'SPECIFICATIONS' && (
                    <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      Especificaciones
                    </span>
                  )}
                </div>
              </div>

              {/* Approvers */}
              <div className="ml-11 space-y-2">
                {instances.map((instance) => {
                  const config = DECISION_CONFIG[instance.decision];
                  const Icon = config.icon;

                  return (
                    <div
                      key={instance.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        instance.decision === 'PENDING' ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {instance.approver.name}
                          </p>
                          {instance.delegatedFrom && (
                            <p className="text-xs text-gray-500">
                              (delegado por {instance.delegatedFrom.name})
                            </p>
                          )}
                          {instance.comment && (
                            <p className="text-sm text-gray-600 mt-1">
                              &ldquo;{instance.comment}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        {instance.decidedAt && (
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(instance.decidedAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timestamps */}
      <div className="text-xs text-gray-500 pt-2 border-t">
        <p>
          Iniciado:{' '}
          {formatDistanceToNow(new Date(workflow.createdAt), {
            addSuffix: true,
            locale: es,
          })}
        </p>
        {workflow.completedAt && (
          <p>
            Completado:{' '}
            {formatDistanceToNow(new Date(workflow.completedAt), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
