import { PrismaClient, PurchaseRequestPriority } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Action Executor Service
 *
 * Ejecuta las acciones identificadas por el AI Assistant
 * (crear requerimientos, consultas, aprobaciones, etc.)
 */

interface AIAction {
  accion: 'crear_requerimiento' | 'consultar_estado' | 'aprobar_documento' | 'unknown';
  entidades?: any;
  error?: string;
}

interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class ActionExecutorService {

  /**
   * Ejecuta una acción identificada por la IA
   */
  async executeAction(
    action: AIAction,
    userId: string,
    tenantId: string,
    originalPrompt?: string
  ): Promise<ExecutionResult> {
    try {
      console.log(`\n⚙️  [Action Executor] Ejecutando: ${action.accion}`);

      switch (action.accion) {
        case 'crear_requerimiento':
          return await this.crearRequerimiento(action, userId, tenantId, originalPrompt);

        case 'consultar_estado':
          return await this.consultarEstado(action, userId, tenantId);

        case 'aprobar_documento':
          return await this.aprobarDocumento(action, userId, tenantId);

        case 'unknown':
          return {
            success: false,
            message: 'No pude entender el comando. ¿Podés reformularlo?',
            error: action.error || 'Comando no reconocido'
          };

        default:
          return {
            success: false,
            message: `Acción "${action.accion}" no implementada`,
            error: 'Acción no soportada'
          };
      }

    } catch (error) {
      console.error('❌ [Action Executor] Error:', error);
      return {
        success: false,
        message: 'Ocurrió un error al ejecutar la acción',
        error: (error as Error).message
      };
    }
  }

  /**
   * Crea un requerimiento de compra
   */
  private async crearRequerimiento(
    action: AIAction,
    userId: string,
    tenantId: string,
    originalPrompt?: string
  ): Promise<ExecutionResult> {
    try {
      const { items, categoria, urgencia, presupuesto, justificacion } = action.entidades || {};

      // Validaciones básicas
      if (!items || items.length === 0) {
        return {
          success: false,
          message: 'No se especificaron items para el requerimiento',
          error: 'Items requeridos'
        };
      }

      // Generar número de requerimiento
      const numero = await this.generarNumeroRequerimiento(tenantId);

      // Mapear urgencia a prioridad
      const prioridad = this.mapUrgenciaToPrioridad(urgencia);

      // Crear título a partir del primer item
      const titulo = items[0].descripcion.substring(0, 100);

      console.log(`📝 Creando requerimiento ${numero}...`);

      // Crear el requerimiento
      const requerimiento = await prisma.purchaseRequest.create({
        data: {
          numero,
          titulo,
          estado: 'BORRADOR',
          prioridad,
          categoria: categoria || 'Otros',
          justificacion: justificacion || 'Requerimiento creado por asistente IA',
          montoEstimado: presupuesto ? parseFloat(presupuesto.toString()) : null,
          currency: 'ARS',
          tenantId,
          solicitanteId: userId,
          creadoPorIA: true,
          promptOriginal: originalPrompt,
          items: {
            create: items.map((item: any) => ({
              descripcion: item.descripcion,
              cantidad: item.cantidad || 1,
              especificaciones: item.especificaciones
                ? JSON.stringify(item.especificaciones)
                : null,
              unidadMedida: 'unidad',
              precioEstimado: item.precioEstimado ? parseFloat(item.precioEstimado.toString()) : 0
            }))
          }
        },
        include: {
          items: true,
          solicitante: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      console.log(`✅ Requerimiento ${numero} creado exitosamente`);

      // Construir mensaje de respuesta
      const mensaje = this.construirMensajeRequerimiento(requerimiento);

      return {
        success: true,
        message: mensaje,
        data: requerimiento
      };

    } catch (error) {
      console.error('❌ Error creando requerimiento:', error);
      return {
        success: false,
        message: 'No se pudo crear el requerimiento',
        error: (error as Error).message
      };
    }
  }

  /**
   * Consulta estado de documentos/requerimientos
   */
  private async consultarEstado(
    action: AIAction,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    try {
      const { filtro, tipo } = action.entidades || {};

      // Por ahora solo mostramos requerimientos
      const where: any = {
        tenantId,
        solicitanteId: userId
      };

      // Aplicar filtro de estado
      if (filtro === 'pendientes') {
        where.estado = { in: ['BORRADOR', 'ENVIADO', 'EN_REVISION'] };
      } else if (filtro === 'aprobados') {
        where.estado = 'APROBADO';
      }

      const requerimientos = await prisma.purchaseRequest.findMany({
        where,
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      const mensaje = this.construirMensajeConsulta(requerimientos, filtro);

      return {
        success: true,
        message: mensaje,
        data: requerimientos
      };

    } catch (error) {
      console.error('❌ Error consultando estado:', error);
      return {
        success: false,
        message: 'No se pudo consultar el estado',
        error: (error as Error).message
      };
    }
  }

  /**
   * Aprueba un documento (placeholder por ahora)
   */
  private async aprobarDocumento(
    action: AIAction,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    return {
      success: false,
      message: 'La funcionalidad de aprobación estará disponible próximamente',
      error: 'No implementado aún'
    };
  }

  /**
   * Genera número de requerimiento único
   */
  private async generarNumeroRequerimiento(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;

    // Obtener el último número
    const ultimo = await prisma.purchaseRequest.findFirst({
      where: {
        tenantId,
        numero: {
          startsWith: prefix
        }
      },
      orderBy: {
        numero: 'desc'
      }
    });

    let nextNumber = 1;
    if (ultimo) {
      const parts = ultimo.numero.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      nextNumber = lastNum + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Mapea urgencia a prioridad de Prisma
   */
  private mapUrgenciaToPrioridad(urgencia?: string): PurchaseRequestPriority {
    const map: Record<string, PurchaseRequestPriority> = {
      'baja': 'BAJA',
      'normal': 'NORMAL',
      'alta': 'ALTA',
      'urgente': 'URGENTE'
    };

    return map[urgencia || 'normal'] || 'NORMAL';
  }

  /**
   * Construye mensaje de confirmación para requerimiento creado
   */
  private construirMensajeRequerimiento(requerimiento: any): string {
    const itemsText = requerimiento.items
      .map((item: any, i: number) => `${i + 1}. ${item.descripcion} (x${item.cantidad})`)
      .join('\n');

    return `✅ **Requerimiento ${requerimiento.numero} creado exitosamente**

📋 **Resumen:**
• **Categoría:** ${requerimiento.categoria}
• **Prioridad:** ${requerimiento.prioridad}
• **Estado:** ${requerimiento.estado}
${requerimiento.montoEstimado ? `• **Presupuesto:** $${requerimiento.montoEstimado}` : ''}

📦 **Items:**
${itemsText}

${requerimiento.justificacion ? `📝 **Justificación:** ${requerimiento.justificacion}` : ''}

💡 **¿Qué podés hacer ahora?**
1. Ver el detalle completo del requerimiento
2. Editar y agregar más información
3. Enviar a aprobación cuando esté listo`;
  }

  /**
   * Construye mensaje de consulta de estado
   */
  private construirMensajeConsulta(requerimientos: any[], filtro?: string): string {
    if (requerimientos.length === 0) {
      return `No se encontraron requerimientos${filtro ? ` ${filtro}` : ''}.`;
    }

    const lista = requerimientos
      .map((req, i) => {
        const totalItems = req.items.reduce((sum: number, item: any) => sum + item.cantidad, 0);
        return `${i + 1}. **${req.numero}** - ${req.titulo}
   Estado: ${req.estado} | Prioridad: ${req.prioridad} | Items: ${totalItems}`;
      })
      .join('\n\n');

    return `📊 **Requerimientos encontrados:** ${requerimientos.length}

${lista}

💡 **Tip:** Podés pedirme "ver detalles del requerimiento REQ-2025-XXXXX"`;
  }
}

export default ActionExecutorService;
