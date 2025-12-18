import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatParticipant {
  userId: string;
  name: string;
  email: string;
  role: 'SOLICITANTE' | 'APROBADOR';
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }> | null;
  createdAt: string;
}

export interface PurchaseRequestInfo {
  id: string;
  numero: string;
  titulo: string;
}

interface UsePurchaseRequestChatOptions {
  purchaseRequestId: string;
  enabled?: boolean;
}

interface UsePurchaseRequestChatReturn {
  messages: ChatMessage[];
  participants: ChatParticipant[];
  purchaseRequest: PurchaseRequestInfo | null;
  loading: boolean;
  sending: boolean;
  error: string | null;
  unreadCount: number;
  sendMessage: (text: string) => Promise<boolean>;
  markAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function usePurchaseRequestChat({
  purchaseRequestId,
  enabled = true,
}: UsePurchaseRequestChatOptions): UsePurchaseRequestChatReturn {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequestInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cargar chat
  const loadChat = useCallback(async () => {
    if (!enabled || !purchaseRequestId || !token) return;

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/pr-chat/${purchaseRequestId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar el chat');
      }

      const data = await response.json();
      setMessages(data.chat?.messages || []);
      setParticipants(data.participants || []);
      setPurchaseRequest(data.purchaseRequest || null);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error desconocido');
        console.error('Error loading PR chat:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [purchaseRequestId, token, enabled]);

  // Enviar mensaje
  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!token || !text.trim()) return false;

    setSending(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/pr-chat/${purchaseRequestId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar el mensaje');
      }

      const data = await response.json();

      // Agregar el nuevo mensaje a la lista
      setMessages(prev => [...prev, data.message]);

      return true;
    } catch (err: any) {
      setError(err.message || 'Error al enviar mensaje');
      console.error('Error sending message:', err);
      return false;
    } finally {
      setSending(false);
    }
  }, [token, purchaseRequestId]);

  // Marcar como leídos
  const markAsRead = useCallback(async () => {
    if (!purchaseRequestId || !token) return;

    try {
      await fetch(
        `${API_URL}/api/pr-chat/${purchaseRequestId}/read`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, [purchaseRequestId, token]);

  // Refresh
  const refresh = useCallback(async () => {
    await loadChat();
  }, [loadChat]);

  // Cargar al montar o cuando cambian las dependencias
  useEffect(() => {
    loadChat();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadChat]);

  return {
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
  };
}

/**
 * Hook para obtener contadores de no leídos para múltiples requerimientos
 */
export function usePurchaseRequestChatUnreadCounts(purchaseRequestIds: string[]) {
  const { token } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!token || purchaseRequestIds.length === 0) {
      setCounts({});
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/pr-chat/unread-counts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ purchaseRequestIds }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCounts(data.counts || {});
      }
    } catch (err) {
      console.error('Error fetching PR chat unread counts:', err);
    } finally {
      setLoading(false);
    }
  }, [token, JSON.stringify(purchaseRequestIds)]);

  useEffect(() => {
    fetchCounts();

    // Refrescar cada 30 segundos
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  return { counts, loading, refresh: fetchCounts };
}
