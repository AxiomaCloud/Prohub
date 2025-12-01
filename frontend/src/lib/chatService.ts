import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any; // Datos estructurados del backend
}

export interface ChatRequest {
  message: string;
  tenantId: string;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  debug?: any;
}

class ChatService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await axios.post<ChatResponse>(
        `${API_URL}/api/v1/chat`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` })
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Chat service error:', error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        message: 'Error de conexión con el servidor',
        error: error.message
      };
    }
  }

  async checkHealth(): Promise<{ available: boolean; service: string; model: string | null }> {
    try {
      const response = await axios.get(`${API_URL}/api/v1/chat/health`);
      return response.data;
    } catch (error) {
      return {
        available: false,
        service: 'AI Chat Assistant',
        model: null
      };
    }
  }
}

export const chatService = new ChatService();
