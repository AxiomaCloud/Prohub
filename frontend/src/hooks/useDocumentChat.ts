import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type DocumentChatType =
  | 'document'
  | 'purchase-order'
  | 'purchase-request'
  | 'quotation'
  | 'payment';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string | null;
  senderTenantId: string | null;
  text: string;
  channel: string;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }> | null;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  subject: string;
  status: 'OPEN' | 'RESOLVED' | 'CLOSED';
  documentType: string;
  unreadCountProvider: number;
  unreadCountClient: number;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface DocumentInfo {
  id: string;
  number?: string;
  displayNumber: string;
  clientTenantId: string;
  providerTenantId?: string | null;
  clientTenant?: { id: string; name: string; email?: string | null };
  providerTenant?: { id: string; name: string; email?: string | null } | null;
  supplier?: { id: string; nombre: string; email?: string | null } | null;
}

interface UseDocumentChatOptions {
  documentType: DocumentChatType;
  documentId: string;
  enabled?: boolean;
}

interface UseDocumentChatReturn {
  messages: ChatMessage[];
  conversation: Conversation | null;
  documentInfo: DocumentInfo | null;
  isFromClient: boolean;
  loading: boolean;
  sending: boolean;
  error: string | null;
  sendMessage: (text: string, attachments?: File[]) => Promise<boolean>;
  markAsRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
  unreadCount: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useDocumentChat({
  documentType,
  documentId,
  enabled = true,
}: UseDocumentChatOptions): UseDocumentChatReturn {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [isFromClient, setIsFromClient] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cargar conversación inicial
  const loadConversation = useCallback(async () => {
    if (!enabled || !documentId || !token) return;

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/document-chat/${documentType}/${documentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar la conversación');
      }

      const data = await response.json();
      setConversation(data.conversation);
      setMessages(data.conversation?.messages || []);
      setDocumentInfo(data.documentInfo);
      setIsFromClient(data.isFromClient);
      setOffset(data.conversation?.messages?.length || 0);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error desconocido');
        console.error('Error loading conversation:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [documentType, documentId, token, enabled]);

  // Cargar más mensajes (paginación)
  const loadMore = useCallback(async () => {
    if (!conversation || !token || loading) return;

    try {
      const response = await fetch(
        `${API_URL}/api/document-chat/${documentType}/${documentId}/messages?offset=${offset}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar más mensajes');
      }

      const data = await response.json();
      setMessages(prev => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
      setOffset(prev => prev + data.messages.length);
    } catch (err: any) {
      console.error('Error loading more messages:', err);
    }
  }, [conversation, documentType, documentId, token, offset, loading]);

  // Enviar mensaje
  const sendMessage = useCallback(async (text: string, attachments?: File[]): Promise<boolean> => {
    if (!token || !text.trim()) return false;

    setSending(true);
    setError(null);

    try {
      // TODO: Implementar upload de attachments si se necesita
      const attachmentData = null;

      const response = await fetch(
        `${API_URL}/api/document-chat/${documentType}/${documentId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            attachments: attachmentData,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar el mensaje');
      }

      const data = await response.json();

      // Agregar el nuevo mensaje a la lista
      setMessages(prev => [...prev, data.message]);

      // Actualizar contadores de la conversación
      if (conversation) {
        setConversation({
          ...conversation,
          unreadCountClient: data.conversation.unreadCountClient,
          unreadCountProvider: data.conversation.unreadCountProvider,
        });
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Error al enviar mensaje');
      console.error('Error sending message:', err);
      return false;
    } finally {
      setSending(false);
    }
  }, [token, documentType, documentId, conversation]);

  // Marcar como leídos
  const markAsRead = useCallback(async () => {
    if (!conversation || !token) return;

    try {
      await fetch(
        `${API_URL}/api/document-chat/${conversation.id}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Actualizar contador local
      if (isFromClient) {
        setConversation(prev => prev ? { ...prev, unreadCountClient: 0 } : null);
      } else {
        setConversation(prev => prev ? { ...prev, unreadCountProvider: 0 } : null);
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, [conversation, token, isFromClient]);

  // Refresh
  const refresh = useCallback(async () => {
    await loadConversation();
  }, [loadConversation]);

  // Cargar al montar o cuando cambian las dependencias
  useEffect(() => {
    loadConversation();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadConversation]);

  // Calcular unread count
  const unreadCount = conversation
    ? isFromClient
      ? conversation.unreadCountClient
      : conversation.unreadCountProvider
    : 0;

  return {
    messages,
    conversation,
    documentInfo,
    isFromClient,
    loading,
    sending,
    error,
    sendMessage,
    markAsRead,
    loadMore,
    refresh,
    hasMore,
    unreadCount,
  };
}

// Hook para obtener el contador global de mensajes no leídos
export function useUnreadMessagesCount(tenantId: string | null) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!token || !tenantId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/document-chat/unread-count?tenantId=${tenantId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  useEffect(() => {
    fetchUnreadCount();

    // Refrescar cada 30 segundos
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return { unreadCount, loading, refresh: fetchUnreadCount };
}
