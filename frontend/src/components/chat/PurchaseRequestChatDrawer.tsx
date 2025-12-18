'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle, AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseRequestChat, ChatMessage, ChatParticipant } from '@/hooks/usePurchaseRequestChat';

interface PurchaseRequestChatDrawerProps {
  purchaseRequestId: string;
  purchaseRequestNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

// Componente para un mensaje individual
const PRChatMessage: React.FC<{
  message: ChatMessage;
  currentUserId: string;
}> = ({ message, currentUserId }) => {
  const isOwn = message.senderId === currentUserId;
  const formattedTime = new Date(message.createdAt).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = new Date(message.createdAt).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] ${
          isOwn
            ? 'bg-purple-600 text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-xl rounded-tr-xl rounded-br-xl'
        } px-4 py-2 shadow-sm`}
      >
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              {message.senderName}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              message.senderRole === 'SOLICITANTE'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {message.senderRole === 'SOLICITANTE' ? 'Solicitante' : 'Aprobador'}
            </span>
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <p
          className={`text-xs mt-1 ${
            isOwn ? 'text-purple-200' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {formattedDate} {formattedTime}
        </p>
      </div>
    </div>
  );
};

export const PurchaseRequestChatDrawer: React.FC<PurchaseRequestChatDrawerProps> = ({
  purchaseRequestId,
  purchaseRequestNumber,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    participants,
    purchaseRequest,
    loading,
    sending,
    error,
    unreadCount,
    sendMessage,
    markAsRead,
    refresh,
  } = usePurchaseRequestChat({
    purchaseRequestId,
    enabled: isOpen,
  });

  // Obtener los otros participantes (para mostrar "Enviando a:")
  const otherParticipants = participants.filter(p => p.userId !== user?.id);

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

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - z-30 para que Axio quede visible por encima */}
      <div
        className="fixed inset-0 bg-black/30 z-30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer - Deja espacio para el botón flotante de Axio */}
      <div className="fixed right-4 top-4 h-[600px] max-h-[calc(100vh-120px)] w-96 max-w-[calc(100%-2rem)] bg-white dark:bg-gray-900 shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Header - Colores invertidos respecto a Axio */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-sm">Chat del Requerimiento</h3>
              <p className="text-xs opacity-90 truncate max-w-[200px]">
                {purchaseRequestNumber}
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

        {/* Participantes / Enviando a: */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">
              Enviando a:
            </span>
            <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
              {otherParticipants.length > 0
                ? otherParticipants.map(p => p.name).join(', ')
                : 'Sin participantes'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {participants.map(p => (
              <span
                key={p.userId}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  p.role === 'SOLICITANTE'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                } ${p.userId === user?.id ? 'ring-2 ring-purple-500' : ''}`}
              >
                {p.name.split(' ')[0]}
              </span>
            ))}
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
                Inicia la conversación con el {otherParticipants[0]?.role === 'SOLICITANTE' ? 'solicitante' : 'aprobador'}
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <PRChatMessage
                  key={message.id}
                  message={message}
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

export default PurchaseRequestChatDrawer;
