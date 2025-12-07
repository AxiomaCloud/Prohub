import React, { useRef } from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/chatService';
import { User, Bot, Upload, FileText } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
  showUploadButton?: boolean;
  onFileSelect?: (file: File) => void;
  isUploading?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  showUploadButton = false,
  onFileSelect,
  isUploading = false
}) => {
  const isUser = message.role === 'user';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    // Reset input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      {/* Message content */}
      <div className={`max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
          }`}
        >
          {/* Renderizar markdown simple */}
          <div className="text-sm whitespace-pre-wrap">
            {message.content.split('\n').map((line, i) => {
              // Detectar listas con •
              if (line.trim().startsWith('•')) {
                return (
                  <div key={i} className="ml-2">
                    {line}
                  </div>
                );
              }

              // Detectar números de lista
              if (/^\d+\./.test(line.trim())) {
                return (
                  <div key={i} className="ml-2">
                    {line}
                  </div>
                );
              }

              // Detectar negritas con **
              const parts = line.split(/(\*\*[^*]+\*\*)/g);
              return (
                <div key={i}>
                  {parts.map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={j}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={j}>{part}</span>;
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón de upload si es necesario */}
        {showUploadButton && !isUser && (
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Seleccionar archivo</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 px-2 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <User className="w-5 h-5 text-gray-700" />
        </div>
      )}
    </div>
  );
};
