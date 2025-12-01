import React from 'react';
import { ChatMessage as ChatMessageType } from '@/lib/chatService';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

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
