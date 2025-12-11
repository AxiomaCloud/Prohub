'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentChat, DocumentChatType } from '@/hooks/useDocumentChat';
import { DocumentChatMessage } from './DocumentChatMessage';

interface DocumentChatDrawerProps {
  documentType: DocumentChatType;
  documentId: string;
  documentNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentChatDrawer: React.FC<DocumentChatDrawerProps> = ({
  documentType,
  documentId,
  documentNumber,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    conversation,
    documentInfo,
    isFromClient,
    loading,
    sending,
    error,
    sendMessage,
    markAsRead,
    refresh,
    unreadCount,
  } = useDocumentChat({
    documentType,
    documentId,
    enabled: isOpen,
  });

  // Scroll al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Marcar como leídos cuando se abre el drawer
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAsRead();
    }
  }, [isOpen, unreadCount, markAsRead]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const text = inputValue.trim();
    setInputValue('');

    const success = await sendMessage(text);
    if (!success) {
      // Restaurar el texto si falla
      setInputValue(text);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Obtener label del tipo de documento
  const getDocumentTypeLabel = () => {
    switch (documentType) {
      case 'document':
        return 'Documento';
      case 'purchase-order':
        return 'Orden de Compra';
      case 'purchase-request':
        return 'Requerimiento';
      case 'quotation':
        return 'Cotización';
      case 'payment':
        return 'Pago';
      default:
        return 'Documento';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 max-w-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-sm">Mensajes</h3>
              <p className="text-xs opacity-90 truncate max-w-[200px]">
                {documentNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Información del contexto */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              {getDocumentTypeLabel()}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${
                isFromClient
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}
            >
              {isFromClient ? 'Cliente' : 'Proveedor'}
            </span>
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
              <button
                onClick={refresh}
                className="mt-3 text-sm text-purple-600 hover:text-purple-700"
              >
                Reintentar
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay mensajes aún
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Envía el primer mensaje para iniciar la conversación
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <DocumentChatMessage
                  key={message.id}
                  message={message}
                  isFromClient={isFromClient}
                  currentUserId={user?.id || ''}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input de mensaje */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              disabled={sending || loading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// Badge para mostrar contador de mensajes no leídos
export const DocumentChatBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
};

export default DocumentChatDrawer;
