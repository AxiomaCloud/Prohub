import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Assistant Service
 *
 * Servicio para procesar comandos de lenguaje natural
 * y ejecutar acciones en Hub (crear requerimientos, consultas, etc.)
 */

interface AIAction {
  accion:
    | 'crear_requerimiento'
    | 'consultar_estado'
    | 'aprobar_documento'
    | 'subir_factura'
    // Acciones de reglas de autorización
    | 'crear_regla_aprobacion'
    | 'modificar_regla_aprobacion'
    | 'eliminar_regla_aprobacion'
    | 'listar_reglas_aprobacion'
    | 'sugerir_reglas'
    | 'explicar_regla'
    | 'confirmar_regla_pendiente'
    | 'cancelar_regla_pendiente'
    | 'unknown';
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
    // Para subir_factura
    tipoDocumento?: 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO' | 'REMITO' | 'AUTO';
    proveedorNombre?: string;
    // Para reglas de aprobación
    regla?: {
      nombre: string;
      descripcion?: string;
      documentType: 'PURCHASE_REQUEST' | 'PURCHASE_ORDER' | 'INVOICE';
      condiciones: {
        minAmount?: number;
        maxAmount?: number;
        purchaseType?: 'DIRECT' | 'WITH_QUOTE' | 'WITH_BID';
        category?: string;
      };
      niveles: Array<{
        nombre: string;
        orden: number;
        modo: 'ANY' | 'ALL';
        tipo: 'GENERAL' | 'SPECIFICATIONS';
        aprobadores: Array<{
          tipo: 'usuario' | 'rol';
          id?: string;
          nombre?: string;
        }>;
      }>;
      prioridad?: number;
      activa?: boolean;
    };
    reglaId?: string;
    pendingRuleId?: string;
    confirmar?: boolean;
  };
  error?: string;
  // Flag para indicar que se requiere acción del usuario (ej: seleccionar archivo)
  requiresUserAction?: 'file_upload' | 'confirm_rule';
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
    return `Eres Axio, el asistente inteligente de Hub, un sistema de gestión de compras y requerimientos de AXIOMA.

SOBRE TI:
- Tu nombre es Axio
- Eres profesional pero cercano y amigable
- Puedes usar emojis moderadamente
- Cuando te pregunten quién eres, preséntate como Axio
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
4. "subir_factura" - Subir y procesar una factura o documento fiscal
5. "crear_regla_aprobacion" - Crear una nueva regla de autorización/aprobación
6. "modificar_regla_aprobacion" - Modificar una regla existente
7. "eliminar_regla_aprobacion" - Eliminar una regla de autorización
8. "listar_reglas_aprobacion" - Mostrar las reglas de autorización existentes
9. "sugerir_reglas" - Analizar patrones y sugerir reglas
10. "explicar_regla" - Explicar una regla en lenguaje natural
11. "confirmar_regla_pendiente" - Confirmar creación/modificación de regla pendiente
12. "cancelar_regla_pendiente" - Cancelar una regla pendiente
13. "unknown" - Cuando no puedas identificar la acción

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

Para "subir_factura":
{
  "accion": "subir_factura",
  "entidades": {
    "tipoDocumento": "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO" | "REMITO" | "AUTO",
    "proveedorNombre": "Nombre del proveedor si lo menciona" (opcional)
  },
  "requiresUserAction": "file_upload"
}

Para "unknown":
{
  "accion": "unknown",
  "error": "Explicación de por qué no se pudo interpretar"
}

Para "crear_regla_aprobacion":
{
  "accion": "crear_regla_aprobacion",
  "entidades": {
    "regla": {
      "nombre": "Nombre descriptivo de la regla",
      "descripcion": "Descripción detallada (opcional)",
      "documentType": "PURCHASE_REQUEST" | "PURCHASE_ORDER" | "INVOICE",
      "condiciones": {
        "minAmount": número mínimo (null si no aplica),
        "maxAmount": número máximo (null si no aplica),
        "purchaseType": "DIRECT" | "WITH_QUOTE" | "WITH_BID" | null,
        "category": "Categoría específica" | null
      },
      "niveles": [
        {
          "nombre": "Nombre del nivel (ej: Aprobación Gerencial)",
          "orden": 1,
          "modo": "ANY" (cualquier aprobador) | "ALL" (todos deben aprobar),
          "tipo": "GENERAL" (aprobación general) | "SPECIFICATIONS" (solo especificaciones),
          "aprobadores": [
            { "tipo": "usuario", "id": "userId", "nombre": "Nombre Usuario" },
            { "tipo": "rol", "nombre": "PURCHASE_ADMIN" | "PURCHASE_APPROVER" | "CLIENT_ADMIN" }
          ]
        }
      ],
      "prioridad": número (mayor = más prioritaria, default 0),
      "activa": true | false
    }
  },
  "requiresUserAction": "confirm_rule"
}

Para "modificar_regla_aprobacion":
{
  "accion": "modificar_regla_aprobacion",
  "entidades": {
    "reglaId": "ID de la regla a modificar",
    "regla": {
      // Solo los campos que se quieren modificar
      "nombre": "Nuevo nombre (opcional)",
      "condiciones": { ... campos a modificar ... },
      "niveles": [ ... nuevos niveles si se modifican ... ]
    }
  },
  "requiresUserAction": "confirm_rule"
}

Para "eliminar_regla_aprobacion":
{
  "accion": "eliminar_regla_aprobacion",
  "entidades": {
    "reglaId": "ID de la regla a eliminar"
  },
  "requiresUserAction": "confirm_rule"
}

Para "listar_reglas_aprobacion":
{
  "accion": "listar_reglas_aprobacion",
  "entidades": {
    "documentType": "PURCHASE_REQUEST" | "PURCHASE_ORDER" | "INVOICE" | null (todas)
  }
}

Para "sugerir_reglas":
{
  "accion": "sugerir_reglas",
  "entidades": {}
}

Para "explicar_regla":
{
  "accion": "explicar_regla",
  "entidades": {
    "reglaId": "ID de la regla a explicar"
  }
}

Para "confirmar_regla_pendiente":
{
  "accion": "confirmar_regla_pendiente",
  "entidades": {
    "pendingRuleId": "ID de la regla pendiente",
    "confirmar": true
  }
}

Para "cancelar_regla_pendiente":
{
  "accion": "cancelar_regla_pendiente",
  "entidades": {
    "pendingRuleId": "ID de la regla pendiente"
  }
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

REGLAS PARA GESTIÓN DE REGLAS DE AUTORIZACIÓN:
- SOLO usuarios con rol CLIENT_ADMIN o PURCHASE_ADMIN pueden gestionar reglas
- Siempre usa requiresUserAction: "confirm_rule" para crear, modificar o eliminar reglas
- Los roles válidos para aprobadores son: "PURCHASE_ADMIN", "PURCHASE_APPROVER", "CLIENT_ADMIN"
- Los tipos de documento son: "PURCHASE_REQUEST" (requerimientos), "PURCHASE_ORDER" (órdenes de compra), "INVOICE" (facturas)
- Si el usuario dice "gerente", "jefe" o "director", usa rol "PURCHASE_ADMIN"
- Si el usuario dice "compras", "comprador" o "encargado", usa rol "PURCHASE_APPROVER"
- Si no especifica tipo de documento, asume "PURCHASE_REQUEST"
- Si menciona "montos altos" sin especificar, usa minAmount: 500000
- Si menciona "montos bajos" sin especificar, usa maxAmount: 50000
- Para rangos de monto: interpreta "mayor a $X" como minAmount, "menor a $X" como maxAmount

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

Usuario: "Quiero subir una factura"
Respuesta:
{
  "accion": "subir_factura",
  "entidades": {
    "tipoDocumento": "AUTO"
  },
  "requiresUserAction": "file_upload"
}

Usuario: "Necesito cargar la factura de Telecom"
Respuesta:
{
  "accion": "subir_factura",
  "entidades": {
    "tipoDocumento": "FACTURA",
    "proveedorNombre": "Telecom"
  },
  "requiresUserAction": "file_upload"
}

Usuario: "Tengo una nota de crédito para subir al sistema"
Respuesta:
{
  "accion": "subir_factura",
  "entidades": {
    "tipoDocumento": "NOTA_CREDITO"
  },
  "requiresUserAction": "file_upload"
}

Usuario: "Quiero crear una regla para que las compras de más de 500 mil pesos las apruebe el gerente"
Respuesta:
{
  "accion": "crear_regla_aprobacion",
  "entidades": {
    "regla": {
      "nombre": "Aprobación Gerencial +$500K",
      "descripcion": "Compras mayores a $500,000 requieren aprobación gerencial",
      "documentType": "PURCHASE_REQUEST",
      "condiciones": {
        "minAmount": 500000,
        "maxAmount": null,
        "purchaseType": null,
        "category": null
      },
      "niveles": [
        {
          "nombre": "Aprobación Gerencial",
          "orden": 1,
          "modo": "ANY",
          "tipo": "GENERAL",
          "aprobadores": [
            { "tipo": "rol", "nombre": "PURCHASE_ADMIN" }
          ]
        }
      ],
      "prioridad": 10,
      "activa": true
    }
  },
  "requiresUserAction": "confirm_rule"
}

Usuario: "Crea una regla para órdenes de compra donde cualquier compra de tecnología necesite aprobación del jefe de IT y del gerente de compras"
Respuesta:
{
  "accion": "crear_regla_aprobacion",
  "entidades": {
    "regla": {
      "nombre": "Aprobación OC Tecnología",
      "descripcion": "Órdenes de compra de categoría Tecnología requieren doble aprobación",
      "documentType": "PURCHASE_ORDER",
      "condiciones": {
        "minAmount": null,
        "maxAmount": null,
        "purchaseType": null,
        "category": "Tecnología"
      },
      "niveles": [
        {
          "nombre": "Aprobación Doble",
          "orden": 1,
          "modo": "ALL",
          "tipo": "GENERAL",
          "aprobadores": [
            { "tipo": "rol", "nombre": "PURCHASE_ADMIN" },
            { "tipo": "rol", "nombre": "PURCHASE_APPROVER" }
          ]
        }
      ],
      "prioridad": 5,
      "activa": true
    }
  },
  "requiresUserAction": "confirm_rule"
}

Usuario: "Mostrame las reglas de aprobación que tenemos"
Respuesta:
{
  "accion": "listar_reglas_aprobacion",
  "entidades": {
    "documentType": null
  }
}

Usuario: "Qué reglas tenemos para facturas?"
Respuesta:
{
  "accion": "listar_reglas_aprobacion",
  "entidades": {
    "documentType": "INVOICE"
  }
}

Usuario: "Sugerí reglas basadas en el historial"
Respuesta:
{
  "accion": "sugerir_reglas",
  "entidades": {}
}

Usuario: "Explícame la regla de montos altos"
Respuesta:
{
  "accion": "explicar_regla",
  "entidades": {
    "reglaId": "buscar_por_nombre:montos altos"
  }
}

Usuario: "Sí, creá la regla" (después de una confirmación pendiente)
Respuesta:
{
  "accion": "confirmar_regla_pendiente",
  "entidades": {
    "confirmar": true
  }
}

Usuario: "No, cancelá" (después de una confirmación pendiente)
Respuesta:
{
  "accion": "cancelar_regla_pendiente",
  "entidades": {}
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

    // Validación para crear regla de aprobación
    if (action.accion === 'crear_regla_aprobacion') {
      if (!action.entidades?.regla) {
        errors.push('Se requiere información de la regla');
      } else {
        const regla = action.entidades.regla;

        if (!regla.nombre || regla.nombre.trim() === '') {
          errors.push('Nombre de regla requerido');
        }

        if (!regla.documentType) {
          errors.push('Tipo de documento requerido');
        } else if (!['PURCHASE_REQUEST', 'PURCHASE_ORDER', 'INVOICE'].includes(regla.documentType)) {
          errors.push('Tipo de documento inválido');
        }

        if (!regla.niveles || regla.niveles.length === 0) {
          errors.push('Se requiere al menos un nivel de aprobación');
        } else {
          regla.niveles.forEach((nivel, index) => {
            if (!nivel.nombre || nivel.nombre.trim() === '') {
              errors.push(`Nivel ${index + 1}: nombre requerido`);
            }
            if (!nivel.aprobadores || nivel.aprobadores.length === 0) {
              errors.push(`Nivel ${index + 1}: se requiere al menos un aprobador`);
            }
            if (!['ANY', 'ALL'].includes(nivel.modo)) {
              errors.push(`Nivel ${index + 1}: modo debe ser ANY o ALL`);
            }
          });
        }
      }
    }

    // Validación para modificar regla
    if (action.accion === 'modificar_regla_aprobacion') {
      if (!action.entidades?.reglaId) {
        errors.push('Se requiere ID de la regla a modificar');
      }
    }

    // Validación para eliminar regla
    if (action.accion === 'eliminar_regla_aprobacion') {
      if (!action.entidades?.reglaId) {
        errors.push('Se requiere ID de la regla a eliminar');
      }
    }

    // Validación para explicar regla
    if (action.accion === 'explicar_regla') {
      if (!action.entidades?.reglaId) {
        errors.push('Se requiere ID de la regla a explicar');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default AIAssistantService;
