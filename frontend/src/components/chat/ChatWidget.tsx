'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { RulePreviewCard } from './RulePreviewCard';
import { chatService, ChatMessage as ChatMessageType } from '@/lib/chatService';

interface ChatWidgetProps {
  tenantId: string;
  token: string;
}

interface PendingRuleInfo {
  id: string;
  rule: any;
  expiresAt?: Date;
}

interface ExtendedChatMessage extends ChatMessageType {
  requiresUpload?: boolean;
  actionContext?: {
    tipoDocumento?: string;
    proveedorNombre?: string;
  };
  requiresConfirmation?: boolean;
  pendingRuleId?: string;
  pendingRule?: any;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ tenantId, token }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessageId, setUploadMessageId] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [pendingRule, setPendingRule] = useState<PendingRuleInfo | null>(null);
  const [isConfirmingRule, setIsConfirmingRule] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Configurar token al montar
  useEffect(() => {
    chatService.setToken(token);
    checkHealth();
  }, [token]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkHealth = async () => {
    const health = await chatService.checkHealth();
    setIsAvailable(health.available);

    if (!health.available) {
      console.warn('⚠️  AI Assistant no disponible');
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !isAvailable) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    // Agregar mensaje del usuario
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Llamar al backend
      const response = await chatService.sendMessage({
        message: userMessage.content,
        tenantId
      });

      // Agregar respuesta del asistente
      const messageId = (Date.now() + 1).toString();
      const assistantMessage: ExtendedChatMessage = {
        id: messageId,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        data: response.data,
        requiresUpload: response.requiresUserAction === 'file_upload',
        actionContext: response.actionContext,
        requiresConfirmation: response.requiresConfirmation || response.requiresUserAction === 'confirm_rule',
        pendingRuleId: response.pendingRuleId,
        pendingRule: response.pendingRule
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Si requiere upload, guardamos el ID del mensaje
      if (response.requiresUserAction === 'file_upload') {
        setUploadMessageId(messageId);
      }

      // Si requiere confirmación de regla, guardamos la info
      if ((response.requiresConfirmation || response.requiresUserAction === 'confirm_rule') && response.pendingRuleId) {
        setPendingRule({
          id: response.pendingRuleId,
          rule: response.pendingRule,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
        });
      }

      // Si hubo error, mostrar mensaje adicional
      if (!response.success && response.error) {
        console.error('Error del asistente:', response.error);
      }

    } catch (error) {
      console.error('Error enviando mensaje:', error);

      const errorMessage: ChatMessageType = {
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

  const handleConfirmRule = async (pendingRuleId: string) => {
    setIsConfirmingRule(true);

    try {
      const response = await chatService.confirmRule(pendingRuleId, true, tenantId);

      // Agregar respuesta al chat
      const resultMessage: ExtendedChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        data: response.data
      };

      setMessages(prev => [...prev, resultMessage]);
      setPendingRule(null);

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

      // Agregar mensaje de cancelación
      const cancelMessage: ExtendedChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Creación de regla cancelada. Si necesitás crear una regla diferente, decime.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, cancelMessage]);
      setPendingRule(null);

    } catch (error) {
      console.error('Error cancelando regla:', error);
    }
  };

  const handleFileSelect = async (file: File, messageId: string, actionContext?: ExtendedChatMessage['actionContext']) => {
    setIsUploading(true);

    // Mostrar mensaje de que se está subiendo
    const uploadingMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `📎 Subiendo: ${file.name}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, uploadingMessage]);

    try {
      const response = await chatService.uploadDocument(
        file,
        tenantId,
        actionContext?.tipoDocumento
      );

      // Agregar respuesta del procesamiento
      const resultMessage: ExtendedChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        data: response.data
      };

      setMessages(prev => [...prev, resultMessage]);

      // Limpiar estado de upload
      setUploadMessageId(null);

      // Marcar el mensaje original como ya no requiere upload
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, requiresUpload: false } : msg
        )
      );

    } catch (error) {
      console.error('Error subiendo archivo:', error);

      const errorMessage: ExtendedChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Hubo un error al subir el archivo. Por favor intentá nuevamente.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);

    // Mensaje de bienvenida al abrir por primera vez
    if (!isOpen && messages.length === 0) {
      const welcomeMessage: ExtendedChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `👋 ¡Hola! Soy **Axio**, tu asistente inteligente de Hub.

Puedo ayudarte a:
• Crear requerimientos de compra con lenguaje natural
• **Subir y procesar facturas** automáticamente
• Consultar el estado de tus documentos
• **Administrar reglas de autorización**

**Ejemplos:**
• "Necesito una notebook para diseño, presupuesto $2000"
• "Quiero subir una factura"
• "Crea una regla para que compras mayores a $500K las apruebe el gerente"
• "Mostrame las reglas de aprobación"`,
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-50"
          aria-label="Abrir chat de IA"
        >
          <Sparkles className="w-6 h-6" />
          {!isAvailable && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>
      )}

      {/* Panel de chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-800">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-semibold">Axio</h3>
                <p className="text-xs opacity-90">
                  {isAvailable ? 'Conectado' : 'No disponible'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleOpen}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
              aria-label="Cerrar chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map(message => (
              <ChatMessage
                key={message.id}
                message={message}
                showUploadButton={message.requiresUpload && message.id === uploadMessageId}
                onFileSelect={(file) => handleFileSelect(file, message.id, message.actionContext)}
                isUploading={isUploading && message.id === uploadMessageId}
              />
            ))}

            {/* Mostrar RulePreviewCard si hay regla pendiente */}
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
                <span>Procesando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            {!isAvailable && (
              <div className="mb-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-2 rounded">
                ⚠️ El asistente no está disponible. Verifica ANTHROPIC_API_KEY.
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isAvailable ? 'Escribe tu mensaje...' : 'Asistente no disponible'}
                disabled={isLoading || !isAvailable}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white disabled:opacity-50"
              />

              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || !isAvailable}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                aria-label="Enviar mensaje"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Powered by Claude AI
            </p>
          </div>
        </div>
      )}
    </>
  );
};
