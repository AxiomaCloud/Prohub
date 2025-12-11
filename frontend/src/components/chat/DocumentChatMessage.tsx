'use client';

import React from 'react';
import { User, Building2, Paperclip, Download } from 'lucide-react';
import { ChatMessage } from '@/hooks/useDocumentChat';

interface DocumentChatMessageProps {
  message: ChatMessage;
  isFromClient: boolean;
  currentUserId: string;
}

export const DocumentChatMessage: React.FC<DocumentChatMessageProps> = ({
  message,
  isFromClient,
  currentUserId,
}) => {
  const isOwnMessage = message.senderId === currentUserId;

  // Determinar si el mensaje es del tenant o del proveedor
  const isFromTenant = message.senderTenantId && isFromClient
    ? message.senderTenantId === message.senderTenantId // mismo tenant = es del cliente
    : false;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div
      className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isOwnMessage
            ? 'bg-purple-100 dark:bg-purple-900/30'
            : 'bg-gray-100 dark:bg-gray-800'
        }`}
      >
        {isOwnMessage ? (
          <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        ) : (
          <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </div>

      {/* Contenido del mensaje */}
      <div
        className={`flex flex-col max-w-[75%] ${
          isOwnMessage ? 'items-end' : 'items-start'
        }`}
      >
        {/* Nombre del remitente */}
        <div
          className={`flex items-center gap-2 mb-1 ${
            isOwnMessage ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {message.senderName || 'Usuario'}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(message.createdAt)} {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Burbuja del mensaje */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwnMessage
              ? 'bg-purple-600 text-white rounded-tr-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.text}
          </p>
        </div>

        {/* Adjuntos */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((attachment, index) => (
              <a
                key={index}
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isOwnMessage
                    ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-100'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Paperclip className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[150px]">
                  {attachment.fileName}
                </span>
                <span className="text-xs opacity-70">
                  {formatFileSize(attachment.fileSize)}
                </span>
                <Download className="w-3 h-3 flex-shrink-0" />
              </a>
            ))}
          </div>
        )}

        {/* Indicador de leído */}
        {isOwnMessage && message.readAt && (
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Leído
          </span>
        )}
      </div>
    </div>
  );
};

export default DocumentChatMessage;
