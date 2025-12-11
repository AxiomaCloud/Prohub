'use client';

import React from 'react';
import { Lightbulb, Sparkles, ArrowRight, X, BarChart2 } from 'lucide-react';

export interface RuleSuggestion {
  id: string;
  title: string;
  reason: string;
  confidence: number;
  suggestedPrompt: string;
  basedOn: {
    pattern: string;
    dataPoints: number;
  };
  suggestedRule: {
    name: string;
    documentType: string;
    minAmount?: number;
    maxAmount?: number;
    category?: string;
    approvers: Array<{ type: 'role' | 'user'; value: string }>;
  };
}

interface RuleSuggestionCardProps {
  suggestion: RuleSuggestion;
  onAccept: (suggestedPrompt: string) => void;
  onDismiss: (suggestionId: string) => void;
  compact?: boolean;
}

const patternLabels: Record<string, string> = {
  'frequent_approver': 'Aprobador frecuente',
  'high_amount_transactions': 'Transacciones de alto valor',
  'coverage_gap': 'Gap de cobertura',
  'category_concentration': 'Concentración por categoría'
};

export function RuleSuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
  compact = false
}: RuleSuggestionCardProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'Alta';
    if (confidence >= 60) return 'Media';
    return 'Baja';
  };

  if (compact) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-2">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">{suggestion.title}</p>
            <p className="text-xs text-amber-700 mt-1 line-clamp-2">{suggestion.reason}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onAccept(suggestion.suggestedPrompt)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded hover:bg-amber-200 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Crear regla
              </button>
              <button
                onClick={() => onDismiss(suggestion.id)}
                className="p-1 text-amber-400 hover:text-amber-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-amber-200 rounded-lg shadow-sm overflow-hidden my-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span className="font-medium text-amber-900">Sugerencia de Axio</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(suggestion.confidence)}`}>
            <BarChart2 className="w-3 h-3" />
            <span>Confianza: {getConfidenceLabel(suggestion.confidence)} ({suggestion.confidence}%)</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 text-base mb-2">
          {suggestion.title}
        </h4>

        <p className="text-sm text-gray-600 mb-3">
          {suggestion.reason}
        </p>

        {/* Basado en */}
        <div className="bg-gray-50 rounded-md p-3 mb-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <BarChart2 className="w-3 h-3" />
            <span>Basado en análisis de datos</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Patrón detectado: </span>
            <span className="font-medium text-gray-900">
              {patternLabels[suggestion.basedOn.pattern] || suggestion.basedOn.pattern}
            </span>
            <span className="text-gray-400 ml-2">
              ({suggestion.basedOn.dataPoints} datos analizados)
            </span>
          </div>
        </div>

        {/* Preview de la regla sugerida */}
        <div className="border border-dashed border-gray-300 rounded-md p-3 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Regla sugerida:</p>
          <p className="text-sm font-medium text-gray-900">{suggestion.suggestedRule.name}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
              {suggestion.suggestedRule.documentType === 'PURCHASE_REQUEST' ? 'Requerimientos' :
               suggestion.suggestedRule.documentType === 'PURCHASE_ORDER' ? 'OC' : 'Facturas'}
            </span>
            {suggestion.suggestedRule.minAmount && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">
                {`>$${(suggestion.suggestedRule.minAmount / 1000).toFixed(0)}K`}
              </span>
            )}
            {suggestion.suggestedRule.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                {suggestion.suggestedRule.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
        <button
          onClick={() => onAccept(suggestion.suggestedPrompt)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Crear esta regla
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        >
          Ignorar
        </button>
      </div>
    </div>
  );
}

export default RuleSuggestionCard;
