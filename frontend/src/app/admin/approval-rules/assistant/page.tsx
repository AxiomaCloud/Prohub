'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Shield, Sparkles, Send, Loader2, Lightbulb, BarChart2, AlertTriangle, ArrowLeft, RefreshCw, Mic, MicOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { RulePreviewCard } from '@/components/chat/RulePreviewCard';
import { RuleSuggestionCard, RuleSuggestion } from '@/components/chat/RuleSuggestionCard';
import { chatService, ChatMessage as ChatMessageType } from '@/lib/chatService';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';

interface ExtendedChatMessage extends ChatMessageType {
  requiresConfirmation?: boolean;
  pendingRuleId?: string;
  pendingRule?: any;
}

interface PendingRuleInfo {
  id: string;
  rule: any;
  expiresAt?: Date;
}

interface CoverageGap {
  type: string;
  description: string;
  documentType: string;
  suggestion: string;
  affectedDocuments: number;
}

export default function RuleAssistantPage() {
  const { token, tenant } = useAuth();
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([]);
  const [gaps, setGaps] = useState<CoverageGap[]>([]);
  const [pendingRule, setPendingRule] = useState<PendingRuleInfo | null>(null);
  const [isConfirmingRule, setIsConfirmingRule] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tenantId = tenant?.id || '';

  // Hook de voz
  const {
    isListening,
    isSupported: isVoiceSupported,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceInput({
    language: 'es-AR',
    continuous: false,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        setInputValue(prev => prev + text);
      }
    },
    onError: (error) => {
      console.error('Error de voz:', error);
    },
    onEnd: () => {
      if (transcript) {
        setInputValue(prev => prev + transcript);
        resetTranscript();
      }
    }
  });

  useEffect(() => {
    if (token) {
      chatService.setToken(token);
    }
  }, [token]);

  useEffect(() => {
    if (tenantId) {
      loadSuggestions();
      loadGaps();
    }
  }, [tenantId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0 && inputRef.current) {
      // Mensaje de bienvenida
      const welcomeMessage: ExtendedChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `👋 ¡Hola! Soy **Axio**, tu asistente para gestionar reglas de autorización.

**Puedo ayudarte a:**
• Crear nuevas reglas de aprobación con lenguaje natural
• Modificar o eliminar reglas existentes
• Explicarte cómo funcionan las reglas actuales
• Sugerirte reglas basadas en patrones de tu empresa

**Ejemplos de lo que puedes decirme:**
• "Crea una regla para que compras mayores a $500.000 las apruebe el gerente"
• "Quiero que las OC de tecnología pasen por IT y compras"
• "Mostrame las reglas activas"
• "Explícame la regla de montos altos"

**¿En qué puedo ayudarte?**`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const result = await chatService.getRuleSuggestions(tenantId);
      if (result.success) {
        setSuggestions(result.suggestions.filter(s => !dismissedSuggestions.has(s.id)));
      }
    } catch (error) {
      console.error('Error cargando sugerencias:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const loadGaps = async () => {
    try {
      const result = await chatService.getCoverageGaps(tenantId);
      if (result.success) {
        setGaps(result.gaps);
      }
    } catch (error) {
      console.error('Error cargando gaps:', error);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatService.sendMessage({
        message: userMessage.content,
        tenantId
      });

      const assistantMessage: ExtendedChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        data: response.data,
        requiresConfirmation: response.requiresConfirmation || response.requiresUserAction === 'confirm_rule',
        pendingRuleId: response.pendingRuleId,
        pendingRule: response.pendingRule
      };

      setMessages(prev => [...prev, assistantMessage]);

      if ((response.requiresConfirmation || response.requiresUserAction === 'confirm_rule') && response.pendingRuleId) {
        setPendingRule({
          id: response.pendingRuleId,
          rule: response.pendingRule,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });
      }

      // Recargar sugerencias después de crear/modificar reglas
      if (response.success && response.data) {
        loadSuggestions();
        loadGaps();
      }

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      const errorMessage: ExtendedChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Hubo un error al procesar tu solicitud. Por favor intenta nuevamente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Manejar toggle del micrófono
  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleConfirmRule = async (pendingRuleId: string) => {
    setIsConfirmingRule(true);
    try {
      const response = await chatService.confirmRule(pendingRuleId, true, tenantId);
      const resultMessage: ExtendedChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        data: response.data
      };
      setMessages(prev => [...prev, resultMessage]);
      setPendingRule(null);
      loadSuggestions();
      loadGaps();
    } catch (error) {
      console.error('Error confirmando regla:', error);
      const errorMessage: ExtendedChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Hubo un error al crear la regla. Por favor intentá nuevamente.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsConfirmingRule(false);
    }
  };

  const handleCancelRule = async (pendingRuleId: string) => {
    try {
      await chatService.confirmRule(pendingRuleId, false, tenantId);
      const cancelMessage: ExtendedChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Creación de regla cancelada.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cancelMessage]);
      setPendingRule(null);
    } catch (error) {
      console.error('Error cancelando regla:', error);
    }
  };

  const handleAcceptSuggestion = (suggestedPrompt: string) => {
    setInputValue(suggestedPrompt);
    inputRef.current?.focus();
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/approval-rules"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Asistente de Reglas
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Gestiona reglas de autorización con Axio
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadSuggestions(); loadGaps(); }}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-200px)]">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-xl flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Axio - Asistente de Reglas</h3>
                <p className="text-xs opacity-90">Crea y gestiona reglas con lenguaje natural</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <ChatMessage
                  key={message.id}
                  message={message}
                />
              ))}

              {pendingRule && (
                <RulePreviewCard
                  rule={pendingRule.rule}
                  pendingRuleId={pendingRule.id}
                  onConfirm={handleConfirmRule}
                  onCancel={handleCancelRule}
                  isLoading={isConfirmingRule}
                  expiresAt={pendingRule.expiresAt}
                />
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Axio está pensando...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              {/* Indicador de escucha activa */}
              {isListening && (
                <div className="mb-2 text-xs text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 p-2 rounded flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span>Escuchando... {interimTranscript && `"${interimTranscript}"`}</span>
                </div>
              )}

              {/* Error de voz */}
              {voiceError && !isListening && (
                <div className="mb-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
                  {voiceError}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? 'Hablá...' : 'Describe la regla que quieres crear...'}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 ${
                    isListening
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />

                {/* Botón de micrófono */}
                {isVoiceSupported && (
                  <button
                    onClick={handleVoiceToggle}
                    disabled={isLoading}
                    className={`px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                    aria-label={isListening ? 'Detener micrófono' : 'Activar micrófono'}
                    title={isListening ? 'Clic para detener' : 'Clic para hablar'}
                  >
                    {isListening ? (
                      <MicOff className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                )}

                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Indicador de voz habilitada */}
              {isVoiceSupported && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  Voz habilitada - Clic en el micrófono para dictar
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sugerencias */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Sugerencias</h3>
              </div>

              {isLoadingSuggestions ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Analizando...
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.slice(0, 3).map(suggestion => (
                    <RuleSuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onAccept={handleAcceptSuggestion}
                      onDismiss={handleDismissSuggestion}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  No hay sugerencias disponibles
                </p>
              )}
            </div>

            {/* Gaps de cobertura */}
            {gaps.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Gaps de Cobertura</h3>
                </div>

                <div className="space-y-3">
                  {gaps.slice(0, 3).map((gap, idx) => (
                    <div
                      key={idx}
                      className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3"
                    >
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        {gap.description}
                      </p>
                      <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        {gap.suggestion}
                      </p>
                      <button
                        onClick={() => handleAcceptSuggestion(gap.suggestion)}
                        className="mt-2 text-xs text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200 font-medium"
                      >
                        Crear regla →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estadísticas rápidas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Accesos Rápidos</h3>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setInputValue('Mostrame las reglas de aprobación activas')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  📋 Ver reglas activas
                </button>
                <button
                  onClick={() => setInputValue('Sugerí reglas basadas en el historial')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  💡 Obtener sugerencias
                </button>
                <button
                  onClick={() => setInputValue('Qué reglas hay para órdenes de compra?')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  📄 Reglas de OC
                </button>
                <button
                  onClick={() => setInputValue('Qué reglas hay para facturas?')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  🧾 Reglas de Facturas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
