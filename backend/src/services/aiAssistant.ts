import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Assistant Service
 *
 * Servicio para procesar comandos de lenguaje natural
 * y ejecutar acciones en Hub (crear requerimientos, consultas, etc.)
 */

interface AIAction {
  accion: 'crear_requerimiento' | 'consultar_estado' | 'aprobar_documento' | 'unknown';
  entidades?: {
    items?: Array<{
      descripcion: string;
      cantidad: number;
      especificaciones?: string[];
    }>;
    categoria?: string;
    urgencia?: 'baja' | 'normal' | 'alta' | 'urgente';
    presupuesto?: number;
    justificacion?: string;
  };
  error?: string;
}

interface UserContext {
  userId: string;
  tenantId: string;
  userName: string;
  userEmail: string;
  userRole: string;
}

interface AIResponse {
  success: boolean;
  action: AIAction;
  rawResponse?: string;
  error?: string;
}

class AIAssistantService {
  private anthropic: Anthropic;
  private model: string = 'claude-sonnet-4-20250514';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  ANTHROPIC_API_KEY no configurada');
      throw new Error('ANTHROPIC_API_KEY no está configurada en .env');
    }

    this.anthropic = new Anthropic({ apiKey });
    console.log('✅ AI Assistant Service inicializado');
  }

  /**
   * Procesa un comando de lenguaje natural
   *
   * @param message - Mensaje del usuario
   * @param context - Contexto del usuario (tenant, rol, etc.)
   * @returns Acción estructurada para ejecutar
   */
  async processCommand(message: string, context: UserContext): Promise<AIResponse> {
    try {
      console.log('\n🤖 [AI Assistant] Procesando comando...');
      console.log(`   Usuario: ${context.userName} (${context.userEmail})`);
      console.log(`   Tenant: ${context.tenantId}`);
      console.log(`   Mensaje: "${message}"`);

      const systemPrompt = this.buildSystemPrompt(context);

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: message
        }]
      });

      const rawResponse = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      console.log(`📤 Respuesta de Claude recibida (${rawResponse.length} caracteres)`);

      // Parsear la respuesta JSON
      const action = this.parseAIResponse(rawResponse);

      console.log(`✅ Acción identificada: ${action.accion}`);

      return {
        success: true,
        action,
        rawResponse
      };

    } catch (error) {
      console.error('❌ Error procesando comando:', error);
      return {
        success: false,
        action: { accion: 'unknown', error: (error as Error).message },
        error: (error as Error).message
      };
    }
  }

  /**
   * Construye el prompt del sistema con instrucciones y contexto
   */
  private buildSystemPrompt(context: UserContext): string {
    return `Eres un asistente IA para ProHub, un sistema de gestión de compras y requerimientos.

TU MISIÓN:
Interpretar comandos en lenguaje natural del usuario y convertirlos en acciones estructuradas en formato JSON.

CONTEXTO DEL USUARIO:
- Nombre: ${context.userName}
- Email: ${context.userEmail}
- Rol: ${context.userRole}
- Empresa: ${context.tenantId}

ACCIONES DISPONIBLES:
1. "crear_requerimiento" - Crear un nuevo requerimiento de compra
2. "consultar_estado" - Consultar estado de documentos/requerimientos
3. "aprobar_documento" - Aprobar un documento pendiente
4. "unknown" - Cuando no puedas identificar la acción

FORMATO DE RESPUESTA (JSON estricto):
Para "crear_requerimiento":
{
  "accion": "crear_requerimiento",
  "entidades": {
    "items": [
      {
        "descripcion": "Descripción clara del producto/servicio",
        "cantidad": número entero positivo,
        "especificaciones": ["spec1", "spec2"] (opcional)
      }
    ],
    "categoria": "Tecnología" | "Oficina" | "Servicios" | "Insumos" | "Otros",
    "urgencia": "baja" | "normal" | "alta" | "urgente",
    "presupuesto": número (monto estimado total, opcional),
    "justificacion": "Razón clara de la necesidad"
  }
}

Para "consultar_estado":
{
  "accion": "consultar_estado",
  "entidades": {
    "filtro": "pendientes" | "aprobados" | "todos",
    "tipo": "requerimientos" | "ordenes" | "documentos"
  }
}

Para "aprobar_documento":
{
  "accion": "aprobar_documento",
  "entidades": {
    "documentoId": "ID del documento",
    "comentario": "Comentario opcional"
  }
}

Para "unknown":
{
  "accion": "unknown",
  "error": "Explicación de por qué no se pudo interpretar"
}

REGLAS IMPORTANTES:
- Responde SOLO con el JSON, sin texto adicional
- Si el usuario no especifica cantidad, asume 1
- Si no especifica categoría, intenta inferirla del contexto
- Si no puedes determinar la urgencia, usa "normal"
- La justificación debe ser clara y profesional
- Si el mensaje es ambiguo o falta información crítica, usa accion "unknown"

EJEMPLOS:
Usuario: "Necesito una notebook para diseño, presupuesto $2000, urgente"
Respuesta:
{
  "accion": "crear_requerimiento",
  "entidades": {
    "items": [
      {
        "descripcion": "Notebook para diseño gráfico",
        "cantidad": 1,
        "especificaciones": ["GPU dedicada", "16GB RAM mínimo", "Pantalla >15 pulgadas"]
      }
    ],
    "categoria": "Tecnología",
    "urgencia": "urgente",
    "presupuesto": 2000,
    "justificacion": "Herramienta de trabajo para diseño gráfico"
  }
}

Usuario: "Haceme un requerimiento de 5 sillas de oficina ergonómicas"
Respuesta:
{
  "accion": "crear_requerimiento",
  "entidades": {
    "items": [
      {
        "descripcion": "Silla de oficina ergonómica",
        "cantidad": 5,
        "especificaciones": ["Respaldo ajustable", "Soporte lumbar", "Apoyabrazos regulables"]
      }
    ],
    "categoria": "Oficina",
    "urgencia": "normal",
    "justificacion": "Equipamiento para puestos de trabajo"
  }
}

AHORA PROCESA EL MENSAJE DEL USUARIO Y RESPONDE SOLO CON EL JSON.`;
  }

  /**
   * Parsea la respuesta de Claude y extrae el JSON
   */
  private parseAIResponse(response: string): AIAction {
    try {
      // Buscar JSON en la respuesta (por si Claude agrega texto extra)
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.warn('⚠️  No se encontró JSON en la respuesta');
        return {
          accion: 'unknown',
          error: 'No se pudo parsear la respuesta de IA'
        };
      }

      const action: AIAction = JSON.parse(jsonMatch[0]);

      // Validar estructura básica
      if (!action.accion) {
        throw new Error('Respuesta sin campo "accion"');
      }

      return action;

    } catch (error) {
      console.error('❌ Error parseando respuesta de IA:', error);
      return {
        accion: 'unknown',
        error: `Error parseando respuesta: ${(error as Error).message}`
      };
    }
  }

  /**
   * Valida que una acción sea válida y tenga los datos mínimos requeridos
   */
  validateAction(action: AIAction): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (action.accion === 'crear_requerimiento') {
      if (!action.entidades?.items || action.entidades.items.length === 0) {
        errors.push('Se requiere al menos un item');
      }

      action.entidades?.items?.forEach((item, index) => {
        if (!item.descripcion || item.descripcion.trim() === '') {
          errors.push(`Item ${index + 1}: descripción requerida`);
        }
        if (!item.cantidad || item.cantidad <= 0) {
          errors.push(`Item ${index + 1}: cantidad debe ser mayor a 0`);
        }
      });

      if (!action.entidades?.categoria) {
        errors.push('Categoría requerida');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default AIAssistantService;
