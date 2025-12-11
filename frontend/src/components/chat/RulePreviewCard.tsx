'use client';

import React from 'react';
import { CheckCircle, XCircle, Shield, Users, DollarSign, Tag, FileText, Clock } from 'lucide-react';

interface RuleLevel {
  nombre: string;
  orden: number;
  modo: 'ANY' | 'ALL';
  tipo: 'GENERAL' | 'SPECIFICATIONS';
  aprobadores: Array<{
    tipo: 'usuario' | 'rol';
    id?: string;
    nombre?: string;
  }>;
}

interface PendingRule {
  nombre: string;
  descripcion?: string;
  documentType: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  purchaseType?: string | null;
  category?: string | null;
  priority: number;
  isActive: boolean;
  niveles: RuleLevel[];
}

interface RulePreviewCardProps {
  rule: PendingRule;
  pendingRuleId: string;
  onConfirm: (pendingRuleId: string) => void;
  onCancel: (pendingRuleId: string) => void;
  isLoading?: boolean;
  expiresAt?: Date;
}

const documentTypeLabels: Record<string, string> = {
  'PURCHASE_REQUEST': 'Requerimientos de Compra',
  'PURCHASE_ORDER': 'Órdenes de Compra',
  'INVOICE': 'Facturas'
};

const purchaseTypeLabels: Record<string, string> = {
  'DIRECT': 'Compra Directa',
  'WITH_QUOTE': 'Con Cotización',
  'WITH_BID': 'Con Licitación',
  'WITH_ADVANCE': 'Con Anticipo'
};

const roleLabels: Record<string, string> = {
  'PURCHASE_ADMIN': 'Gerente de Compras',
  'PURCHASE_APPROVER': 'Aprobador de Compras',
  'CLIENT_ADMIN': 'Administrador'
};

export function RulePreviewCard({
  rule,
  pendingRuleId,
  onConfirm,
  onCancel,
  isLoading = false,
  expiresAt
}: RulePreviewCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTimeRemaining = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const diff = new Date(expiresAt).getTime() - now.getTime();
    if (diff <= 0) return 'Expirado';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden my-3">
      {/* Header */}
      <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Vista previa de regla</span>
          </div>
          {expiresAt && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <Clock className="w-3 h-3" />
              <span>Expira en {getTimeRemaining()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Nombre y descripción */}
        <div>
          <h4 className="font-semibold text-gray-900 text-lg">{rule.nombre}</h4>
          {rule.descripcion && (
            <p className="text-sm text-gray-600 mt-1">{rule.descripcion}</p>
          )}
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Tipo de documento */}
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <span className="text-gray-500">Aplica a:</span>
              <p className="font-medium text-gray-900">
                {documentTypeLabels[rule.documentType] || rule.documentType}
              </p>
            </div>
          </div>

          {/* Prioridad */}
          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <span className="text-gray-500">Prioridad:</span>
              <p className="font-medium text-gray-900">{rule.priority}</p>
            </div>
          </div>

          {/* Rango de montos */}
          {(rule.minAmount || rule.maxAmount) && (
            <div className="flex items-start gap-2 col-span-2">
              <DollarSign className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500">Rango de montos:</span>
                <p className="font-medium text-gray-900">
                  {rule.minAmount && rule.maxAmount
                    ? `${formatCurrency(rule.minAmount)} - ${formatCurrency(rule.maxAmount)}`
                    : rule.minAmount
                    ? `Mayor a ${formatCurrency(rule.minAmount)}`
                    : `Hasta ${formatCurrency(rule.maxAmount!)}`}
                </p>
              </div>
            </div>
          )}

          {/* Tipo de compra */}
          {rule.purchaseType && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500">Tipo de compra:</span>
                <p className="font-medium text-gray-900">
                  {purchaseTypeLabels[rule.purchaseType] || rule.purchaseType}
                </p>
              </div>
            </div>
          )}

          {/* Categoría */}
          {rule.category && (
            <div className="flex items-start gap-2">
              <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <span className="text-gray-500">Categoría:</span>
                <p className="font-medium text-gray-900">{rule.category}</p>
              </div>
            </div>
          )}
        </div>

        {/* Niveles de aprobación */}
        <div className="border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-700">Niveles de Aprobación</span>
          </div>
          <div className="space-y-2">
            {rule.niveles.map((nivel, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-md p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900">
                    {idx + 1}. {nivel.nombre}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                    {nivel.modo === 'ALL' ? 'Todos deben aprobar' : 'Cualquiera aprueba'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {nivel.aprobadores.map((aprobador, aIdx) => (
                    <span
                      key={aIdx}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                    >
                      {aprobador.tipo === 'rol'
                        ? roleLabels[aprobador.nombre || ''] || aprobador.nombre
                        : aprobador.nombre || aprobador.id}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Estado:</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
            rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {rule.isActive ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
        <button
          onClick={() => onConfirm(pendingRuleId)}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          {isLoading ? 'Creando...' : 'Confirmar y Crear'}
        </button>
        <button
          onClick={() => onCancel(pendingRuleId)}
          disabled={isLoading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default RulePreviewCard;
