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
  requiresUserAction?: 'file_upload' | 'confirm_rule';
  actionContext?: {
    tipoDocumento?: string;
    proveedorNombre?: string;
  };
  pendingRuleId?: string;
  pendingRule?: any;
  requiresConfirmation?: boolean;
}

export interface RuleSuggestion {
  id: string;
  title: string;
  reason: string;
  confidence: number;
  suggestedPrompt: string;
  basedOn: {
    pattern: string;
    dataPoints: number;
  };
  suggestedRule: {
    name: string;
    documentType: string;
    minAmount?: number;
    maxAmount?: number;
    category?: string;
    approvers: Array<{ type: 'role' | 'user'; value: string }>;
  };
}

export interface PendingRule {
  id: string;
  rule: any;
  expiresAt: Date;
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

  async uploadDocument(file: File, tenantId: string, tipoDocumento?: string): Promise<ChatResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', tenantId);
      if (tipoDocumento) {
        formData.append('tipoDocumento', tipoDocumento);
      }

      const response = await axios.post<ChatResponse>(
        `${API_URL}/api/v1/chat/upload-document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(this.token && { Authorization: `Bearer ${this.token}` })
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Upload document error:', error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        message: 'Error al subir el documento',
        error: error.message
      };
    }
  }

  /**
   * Obtiene sugerencias de reglas basadas en análisis de patrones
   */
  async getRuleSuggestions(tenantId: string): Promise<{ success: boolean; suggestions: RuleSuggestion[]; count: number }> {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/chat/rule-suggestions`,
        {
          params: { tenantId },
          headers: {
            ...(this.token && { Authorization: `Bearer ${this.token}` })
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Get rule suggestions error:', error);
      return {
        success: false,
        suggestions: [],
        count: 0
      };
    }
  }

  /**
   * Obtiene los patrones de aprobación analizados
   */
  async getApprovalPatterns(tenantId: string): Promise<{ success: boolean; patterns: any }> {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/chat/approval-patterns`,
        {
          params: { tenantId },
          headers: {
            ...(this.token && { Authorization: `Bearer ${this.token}` })
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Get approval patterns error:', error);
      return {
        success: false,
        patterns: null
      };
    }
  }

  /**
   * Detecta gaps en la cobertura de reglas
   */
  async getCoverageGaps(tenantId: string): Promise<{ success: boolean; gaps: any[]; count: number }> {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/chat/coverage-gaps`,
        {
          params: { tenantId },
          headers: {
            ...(this.token && { Authorization: `Bearer ${this.token}` })
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Get coverage gaps error:', error);
      return {
        success: false,
        gaps: [],
        count: 0
      };
    }
  }

  /**
   * Confirma o cancela una regla pendiente
   */
  async confirmRule(pendingRuleId: string, confirm: boolean, tenantId: string): Promise<ChatResponse> {
    try {
      const response = await axios.post<ChatResponse>(
        `${API_URL}/api/v1/chat/confirm-rule`,
        { pendingRuleId, confirm, tenantId },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.token && { Authorization: `Bearer ${this.token}` })
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Confirm rule error:', error);
      if (error.response?.data) {
        return error.response.data;
      }
      return {
        success: false,
        message: 'Error al confirmar la regla',
        error: error.message
      };
    }
  }

  /**
   * Obtiene las reglas pendientes de confirmación del usuario
   */
  async getPendingRules(): Promise<{ success: boolean; pendingRules: PendingRule[]; count: number }> {
    try {
      const response = await axios.get(
        `${API_URL}/api/v1/chat/pending-rules`,
        {
          headers: {
            ...(this.token && { Authorization: `Bearer ${this.token}` })
          }
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Get pending rules error:', error);
      return {
        success: false,
        pendingRules: [],
        count: 0
      };
    }
  }
}

export const chatService = new ChatService();
