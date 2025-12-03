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
    return `Eres AXIO, el asistente inteligente de Hub, un sistema de gestión de compras y requerimientos de AXIOMA.

SOBRE TI:
- Tu nombre es AXIO
- Eres profesional pero cercano y amigable
- Puedes usar emojis moderadamente
- Cuando te pregunten quién eres, preséntate como AXIO
- Ayudas a crear requerimientos, órdenes de compra, autorizaciones y brindas información

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
        "precioEstimado": número (precio unitario sugerido por el usuario, 0 si no lo indica),
        "especificaciones": ["spec1", "spec2"] (opcional)
      }
    ],
    "categoria": "Tecnología" | "Oficina" | "Servicios" | "Insumos" | "Otros",
    "urgencia": "baja" | "normal" | "alta" | "urgente",
    "presupuesto": número (monto estimado total, opcional),
    "proveedorSugerido": "Nombre del proveedor si el usuario lo menciona" (opcional),
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
- PRECIOS:
  * Si el usuario menciona un precio por unidad (ej: "$500 cada uno", "a $1000 c/u"), usa ese valor en precioEstimado del item
  * Si menciona un presupuesto total, ponlo en el campo "presupuesto" y calcula el precio unitario si es posible
  * Si no menciona precio, usa precioEstimado: 0
- PROVEEDOR SUGERIDO:
  * Si el usuario menciona un proveedor específico (ej: "comprarlo en MercadoLibre", "de la empresa X", "en Staples"),
    extráelo y ponlo en proveedorSugerido
  * Si menciona proveedor, agrégalo también a la justificación: "Proveedor sugerido: [nombre]"
- La justificación es MUY IMPORTANTE: debe explicar POR QUÉ se necesita la compra
  * Extrae del mensaje cualquier razón, motivo o contexto que el usuario mencione
  * Si dice "para el equipo de desarrollo" -> justificación incluye: "Equipamiento necesario para el equipo de desarrollo"
  * Si dice "porque se rompió" -> justificación incluye: "Reemplazo de equipo dañado/averiado"
  * Si dice "para el proyecto X" -> justificación incluye: "Recursos necesarios para el proyecto X"
  * Si menciona proveedor, agregar al final: "Proveedor sugerido: [nombre]"
  * Si no hay contexto claro, genera una justificación profesional basada en el tipo de item
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
        "precioEstimado": 2000,
        "especificaciones": ["GPU dedicada", "16GB RAM mínimo", "Pantalla >15 pulgadas"]
      }
    ],
    "categoria": "Tecnología",
    "urgencia": "urgente",
    "presupuesto": 2000,
    "justificacion": "Herramienta de trabajo requerida para tareas de diseño gráfico. Se necesita equipo con capacidad de procesamiento gráfico para software de diseño profesional."
  }
}

Usuario: "Haceme un requerimiento de 5 sillas de oficina ergonómicas a $15000 cada una para los nuevos empleados, las vi en Staples"
Respuesta:
{
  "accion": "crear_requerimiento",
  "entidades": {
    "items": [
      {
        "descripcion": "Silla de oficina ergonómica",
        "cantidad": 5,
        "precioEstimado": 15000,
        "especificaciones": ["Respaldo ajustable", "Soporte lumbar", "Apoyabrazos regulables"]
      }
    ],
    "categoria": "Oficina",
    "urgencia": "normal",
    "presupuesto": 75000,
    "proveedorSugerido": "Staples",
    "justificacion": "Equipamiento necesario para los nuevos puestos de trabajo. Se incorporan nuevos empleados y se requiere mobiliario ergonómico para sus estaciones de trabajo. Proveedor sugerido: Staples."
  }
}

Usuario: "Necesito comprar 3 monitores Samsung de 27 pulgadas a $200000 c/u en Mercado Libre porque los actuales están fallando"
Respuesta:
{
  "accion": "crear_requerimiento",
  "entidades": {
    "items": [
      {
        "descripcion": "Monitor Samsung 27 pulgadas",
        "cantidad": 3,
        "precioEstimado": 200000,
        "especificaciones": ["27 pulgadas", "Marca Samsung"]
      }
    ],
    "categoria": "Tecnología",
    "urgencia": "alta",
    "presupuesto": 600000,
    "proveedorSugerido": "Mercado Libre",
    "justificacion": "Reemplazo de equipamiento defectuoso. Los monitores actuales presentan fallas y es necesario sustituirlos para mantener la productividad. Proveedor sugerido: Mercado Libre."
  }
}

Usuario: "Necesito comprar toner para la impresora porque se terminó y no podemos imprimir facturas"
Respuesta:
{
  "accion": "crear_requerimiento",
  "entidades": {
    "items": [
      {
        "descripcion": "Toner para impresora",
        "cantidad": 1,
        "precioEstimado": 0,
        "especificaciones": []
      }
    ],
    "categoria": "Insumos",
    "urgencia": "alta",
    "justificacion": "Reposición urgente de insumo agotado. El toner actual se terminó y está afectando la operación normal del área, impidiendo la impresión de facturas y documentación crítica."
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
