import { PrismaClient, ApprovalDocumentType, PurchaseType, ApprovalMode, ApprovalLevelType } from '@prisma/client';
import { RuleAnalyzerService } from './ruleAnalyzerService';

const prisma = new PrismaClient();

// Tipos para las acciones de reglas
export interface RuleAction {
  accion: string;
  entidades?: {
    id?: string;
    nombre?: string;
    descripcion?: string;
    documentType?: string;
    condiciones?: {
      minAmount?: number | null;
      maxAmount?: number | null;
      purchaseType?: string | null;
      sector?: string | null;
    };
    niveles?: Array<{
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
    // Para confirmación/cancelación de reglas pendientes
    pendingRuleId?: string;
    confirmar?: boolean;
    regla?: any;
    reglaId?: string;
  };
  pendingRuleId?: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  requiresConfirmation?: boolean;
  pendingRule?: any;
  pendingRuleId?: string;
}

// Almacenamiento temporal de reglas pendientes de confirmación
const pendingRules: Map<string, { rule: any; userId: string; tenantId: string; expiresAt: Date; originalPrompt?: string }> = new Map();

// Limpiar reglas expiradas cada minuto
setInterval(() => {
  const now = new Date();
  for (const [id, pending] of pendingRules.entries()) {
    if (pending.expiresAt < now) {
      pendingRules.delete(id);
      console.log(`🗑️ [RULES] Regla pendiente ${id} expirada y eliminada`);
    }
  }
}, 60000);

export class RuleActionExecutor {
  private ruleAnalyzer: RuleAnalyzerService;

  constructor() {
    this.ruleAnalyzer = new RuleAnalyzerService();
  }

  /**
   * Prepara una regla para confirmación (no la guarda aún)
   */
  async prepararReglaAprobacion(
    action: RuleAction,
    userId: string,
    tenantId: string,
    originalPrompt?: string
  ): Promise<ExecutionResult> {
    try {
      const { entidades } = action;

      if (!entidades?.nombre) {
        return {
          success: false,
          message: 'El nombre de la regla es requerido.',
          error: 'MISSING_NAME'
        };
      }

      if (!entidades.niveles || entidades.niveles.length === 0) {
        return {
          success: false,
          message: 'La regla debe tener al menos un nivel de aprobación.',
          error: 'MISSING_LEVELS'
        };
      }

      // Validar que los niveles tengan aprobadores
      for (let i = 0; i < entidades.niveles.length; i++) {
        const nivel = entidades.niveles[i];
        if (!nivel.aprobadores || nivel.aprobadores.length === 0) {
          return {
            success: false,
            message: `El nivel ${i + 1} (${nivel.nombre}) debe tener al menos un aprobador.`,
            error: 'MISSING_APPROVERS'
          };
        }
      }

      // Generar ID temporal para la regla pendiente
      const pendingId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Mapear el tipo de documento
      const documentType = this.mapDocumentType(entidades.documentType);
      const purchaseType = entidades.condiciones?.purchaseType
        ? this.mapPurchaseType(entidades.condiciones.purchaseType)
        : null;

      // Construir la regla (sin guardar)
      const pendingRule = {
        nombre: entidades.nombre,
        descripcion: entidades.descripcion || null,
        documentType,
        purchaseType,
        minAmount: entidades.condiciones?.minAmount || null,
        maxAmount: entidades.condiciones?.maxAmount || null,
        sector: entidades.condiciones?.sector || null,
        priority: entidades.prioridad || 0,
        isActive: entidades.activa !== false,
        niveles: entidades.niveles.map((nivel, index) => ({
          nombre: nivel.nombre,
          levelOrder: nivel.orden || index + 1,
          approvalMode: nivel.modo === 'ALL' ? 'ALL' : 'ANY',
          levelType: nivel.tipo === 'SPECIFICATIONS' ? 'SPECIFICATIONS' : 'GENERAL',
          aprobadores: nivel.aprobadores
        }))
      };

      // Guardar en memoria con expiración de 5 minutos
      pendingRules.set(pendingId, {
        rule: pendingRule,
        userId,
        tenantId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        originalPrompt
      });

      console.log(`📋 [RULES] Regla pendiente creada: ${pendingId}`);

      return {
        success: true,
        message: this.buildPreviewMessage(pendingRule),
        requiresConfirmation: true,
        pendingRule,
        pendingRuleId: pendingId
      };
    } catch (error) {
      console.error('❌ [RULES] Error preparando regla:', error);
      return {
        success: false,
        message: 'Error al preparar la regla de aprobación.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Confirma y guarda una regla pendiente
   */
  async confirmarReglaAprobacion(
    action: RuleAction,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    try {
      const pendingRuleId = action.entidades?.pendingRuleId || action.pendingRuleId;

      if (!pendingRuleId) {
        return {
          success: false,
          message: 'No se especificó qué regla confirmar.',
          error: 'MISSING_PENDING_RULE_ID'
        };
      }

      const pending = pendingRules.get(pendingRuleId);

      if (!pending) {
        return {
          success: false,
          message: 'La regla pendiente expiró o no existe. Por favor, volvé a crear la regla.',
          error: 'PENDING_RULE_NOT_FOUND'
        };
      }

      // Verificar que el usuario y tenant coincidan
      if (pending.userId !== userId || pending.tenantId !== tenantId) {
        return {
          success: false,
          message: 'No tenés permisos para confirmar esta regla.',
          error: 'UNAUTHORIZED'
        };
      }

      const { rule, originalPrompt } = pending;

      // Crear la regla en la base de datos
      const createdRule = await prisma.approvalRule.create({
        data: {
          tenantId,
          name: rule.nombre,
          description: rule.descripcion,
          documentType: rule.documentType,
          purchaseType: rule.purchaseType,
          minAmount: rule.minAmount,
          maxAmount: rule.maxAmount,
          sector: rule.sector,
          priority: rule.priority,
          isActive: rule.isActive,
          creadoPorIA: true,
          promptOriginal: originalPrompt,
          creadoPorId: userId,
          levels: {
            create: rule.niveles.map((nivel: any) => ({
              name: nivel.nombre,
              levelOrder: nivel.levelOrder,
              approvalMode: nivel.approvalMode as ApprovalMode,
              levelType: nivel.levelType as ApprovalLevelType,
              approvers: {
                create: nivel.aprobadores.map((aprobador: any, idx: number) => ({
                  userId: aprobador.tipo === 'usuario' ? aprobador.id : null,
                  role: aprobador.tipo === 'rol' ? aprobador.nombre : null,
                  sequenceOrder: idx + 1
                }))
              }
            }))
          }
        },
        include: {
          levels: {
            include: { approvers: true }
          }
        }
      });

      // Eliminar de pendientes
      pendingRules.delete(pendingRuleId);

      console.log(`✅ [RULES] Regla ${createdRule.id} creada exitosamente`);

      return {
        success: true,
        message: this.buildSuccessMessage(createdRule),
        data: createdRule
      };
    } catch (error) {
      console.error('❌ [RULES] Error confirmando regla:', error);
      return {
        success: false,
        message: 'Error al guardar la regla de aprobación.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Cancela una regla pendiente
   */
  cancelarReglaPendiente(action: RuleAction, userId: string, tenantId: string): ExecutionResult {
    const pendingRuleId = action.entidades?.pendingRuleId || action.pendingRuleId;

    if (pendingRuleId && pendingRules.has(pendingRuleId)) {
      pendingRules.delete(pendingRuleId);
      return {
        success: true,
        message: 'Regla cancelada. ¿En qué más puedo ayudarte?'
      };
    }
    return {
      success: true,
      message: 'No hay regla pendiente para cancelar.'
    };
  }

  /**
   * Modifica una regla existente (prepara para confirmación)
   */
  async prepararModificacionRegla(
    action: RuleAction,
    userId: string,
    tenantId: string,
    originalPrompt?: string
  ): Promise<ExecutionResult> {
    try {
      const { entidades } = action;

      if (!entidades?.id) {
        return {
          success: false,
          message: 'Necesito saber qué regla querés modificar. ¿Podrías indicarme el nombre o ID?',
          error: 'MISSING_RULE_ID'
        };
      }

      // Buscar la regla existente
      const existingRule = await prisma.approvalRule.findFirst({
        where: {
          OR: [
            { id: entidades.id },
            { name: { contains: entidades.id, mode: 'insensitive' } }
          ],
          tenantId
        },
        include: {
          levels: {
            include: { approvers: true }
          }
        }
      });

      if (!existingRule) {
        return {
          success: false,
          message: `No encontré ninguna regla con el identificador "${entidades.id}".`,
          error: 'RULE_NOT_FOUND'
        };
      }

      // Preparar regla modificada
      const pendingId = `pending_mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const modifiedRule = {
        id: existingRule.id,
        nombre: entidades.nombre || existingRule.name,
        descripcion: entidades.descripcion !== undefined ? entidades.descripcion : existingRule.description,
        documentType: entidades.documentType
          ? this.mapDocumentType(entidades.documentType)
          : existingRule.documentType,
        purchaseType: entidades.condiciones?.purchaseType !== undefined
          ? this.mapPurchaseType(entidades.condiciones.purchaseType)
          : existingRule.purchaseType,
        minAmount: entidades.condiciones?.minAmount !== undefined
          ? entidades.condiciones.minAmount
          : existingRule.minAmount,
        maxAmount: entidades.condiciones?.maxAmount !== undefined
          ? entidades.condiciones.maxAmount
          : existingRule.maxAmount,
        sector: entidades.condiciones?.sector !== undefined
          ? entidades.condiciones.sector
          : existingRule.sector,
        priority: entidades.prioridad !== undefined ? entidades.prioridad : existingRule.priority,
        isActive: entidades.activa !== undefined ? entidades.activa : existingRule.isActive,
        niveles: entidades.niveles || existingRule.levels.map(l => ({
          nombre: l.name,
          levelOrder: l.levelOrder,
          approvalMode: l.approvalMode,
          levelType: l.levelType,
          aprobadores: l.approvers.map(a => ({
            tipo: a.userId ? 'usuario' : 'rol',
            id: a.userId,
            nombre: a.role
          }))
        })),
        originalRule: existingRule
      };

      pendingRules.set(pendingId, {
        rule: modifiedRule,
        userId,
        tenantId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        originalPrompt
      });

      return {
        success: true,
        message: this.buildModificationPreviewMessage(existingRule, modifiedRule),
        requiresConfirmation: true,
        pendingRule: modifiedRule,
        pendingRuleId: pendingId
      };
    } catch (error) {
      console.error('❌ [RULES] Error preparando modificación:', error);
      return {
        success: false,
        message: 'Error al preparar la modificación de la regla.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Confirma y aplica modificación de regla
   */
  async confirmarModificacionRegla(
    pendingRuleId: string,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    try {
      const pending = pendingRules.get(pendingRuleId);

      if (!pending) {
        return {
          success: false,
          message: 'La modificación expiró. Por favor, volvé a indicar los cambios.',
          error: 'PENDING_MODIFICATION_NOT_FOUND'
        };
      }

      if (pending.userId !== userId || pending.tenantId !== tenantId) {
        return {
          success: false,
          message: 'No tenés permisos para confirmar esta modificación.',
          error: 'UNAUTHORIZED'
        };
      }

      const { rule } = pending;

      // Actualizar la regla
      const updatedRule = await prisma.approvalRule.update({
        where: { id: rule.id },
        data: {
          name: rule.nombre,
          description: rule.descripcion,
          documentType: rule.documentType,
          purchaseType: rule.purchaseType,
          minAmount: rule.minAmount,
          maxAmount: rule.maxAmount,
          sector: rule.sector,
          priority: rule.priority,
          isActive: rule.isActive
        },
        include: {
          levels: {
            include: { approvers: true }
          }
        }
      });

      pendingRules.delete(pendingRuleId);

      return {
        success: true,
        message: `✅ **Regla "${updatedRule.name}" actualizada exitosamente**\n\nLos cambios ya están activos.`,
        data: updatedRule
      };
    } catch (error) {
      console.error('❌ [RULES] Error confirmando modificación:', error);
      return {
        success: false,
        message: 'Error al aplicar la modificación.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Prepara eliminación de regla (requiere confirmación)
   */
  async prepararEliminacionRegla(
    action: RuleAction,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    try {
      const { entidades } = action;

      if (!entidades?.id && !entidades?.nombre) {
        return {
          success: false,
          message: '¿Qué regla querés eliminar? Indicame el nombre o ID.',
          error: 'MISSING_IDENTIFIER'
        };
      }

      const searchTerm = entidades.id || entidades.nombre;

      const rule = await prisma.approvalRule.findFirst({
        where: {
          OR: [
            { id: searchTerm },
            { name: { contains: searchTerm, mode: 'insensitive' } }
          ],
          tenantId
        },
        include: {
          levels: true
        }
      });

      if (!rule) {
        return {
          success: false,
          message: `No encontré ninguna regla con "${searchTerm}".`,
          error: 'RULE_NOT_FOUND'
        };
      }

      // Verificar si hay workflows activos usando esta regla
      const activeWorkflows = await prisma.approvalWorkflow.count({
        where: {
          approvalRuleId: rule.id,
          status: 'IN_PROGRESS'
        }
      });

      const pendingId = `pending_del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      pendingRules.set(pendingId, {
        rule: { ...rule, action: 'delete' },
        userId,
        tenantId,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      let warningMessage = '';
      if (activeWorkflows > 0) {
        warningMessage = `\n\n⚠️ **Advertencia:** Esta regla tiene ${activeWorkflows} workflow(s) de aprobación en progreso. Eliminarla no afectará esos workflows, pero no se aplicará a nuevos documentos.`;
      }

      return {
        success: true,
        message: `🗑️ **¿Eliminar esta regla?**\n\n📋 **${rule.name}**\n• Niveles de aprobación: ${rule.levels.length}\n• Prioridad: ${rule.priority}\n• Estado: ${rule.isActive ? 'Activa' : 'Inactiva'}${warningMessage}\n\n**Esta acción no se puede deshacer.**`,
        requiresConfirmation: true,
        pendingRule: rule,
        pendingRuleId: pendingId
      };
    } catch (error) {
      console.error('❌ [RULES] Error preparando eliminación:', error);
      return {
        success: false,
        message: 'Error al buscar la regla.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Confirma y ejecuta eliminación de regla
   */
  async confirmarEliminacionRegla(
    pendingRuleId: string,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    try {
      const pending = pendingRules.get(pendingRuleId);

      if (!pending) {
        return {
          success: false,
          message: 'La solicitud de eliminación expiró.',
          error: 'PENDING_DELETION_NOT_FOUND'
        };
      }

      if (pending.userId !== userId || pending.tenantId !== tenantId) {
        return {
          success: false,
          message: 'No tenés permisos para eliminar esta regla.',
          error: 'UNAUTHORIZED'
        };
      }

      const { rule } = pending;

      // Eliminar aprobadores, niveles y regla
      await prisma.$transaction([
        prisma.approvalLevelApprover.deleteMany({
          where: {
            approvalLevel: {
              approvalRuleId: rule.id
            }
          }
        }),
        prisma.approvalLevel.deleteMany({
          where: { approvalRuleId: rule.id }
        }),
        prisma.approvalRule.delete({
          where: { id: rule.id }
        })
      ]);

      pendingRules.delete(pendingRuleId);

      return {
        success: true,
        message: `✅ **Regla "${rule.name}" eliminada exitosamente**`
      };
    } catch (error) {
      console.error('❌ [RULES] Error eliminando regla:', error);
      return {
        success: false,
        message: 'Error al eliminar la regla.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Lista las reglas de aprobación del tenant
   */
  async listarReglasAprobacion(
    action: RuleAction,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    try {
      const { entidades } = action;

      // Filtros opcionales
      const where: any = { tenantId };

      if (entidades?.documentType) {
        where.documentType = this.mapDocumentType(entidades.documentType);
      }

      const rules = await prisma.approvalRule.findMany({
        where,
        include: {
          levels: {
            include: { approvers: true },
            orderBy: { levelOrder: 'asc' }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { priority: 'desc' }
        ]
      });

      if (rules.length === 0) {
        return {
          success: true,
          message: '📋 **No hay reglas de aprobación configuradas**\n\n¿Querés que te ayude a crear una? Solo decime qué condiciones necesitás.',
          data: []
        };
      }

      const message = this.buildRulesListMessage(rules);

      return {
        success: true,
        message,
        data: rules
      };
    } catch (error) {
      console.error('❌ [RULES] Error listando reglas:', error);
      return {
        success: false,
        message: 'Error al obtener las reglas.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Obtiene sugerencias de reglas basadas en análisis
   */
  async sugerirReglas(
    action: RuleAction,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    try {
      const suggestions = await this.ruleAnalyzer.generateRuleSuggestions(tenantId);

      if (suggestions.length === 0) {
        return {
          success: true,
          message: '💡 **No tengo sugerencias en este momento**\n\nNecesito más datos históricos de aprobaciones para poder sugerir reglas. Seguí usando el sistema y pronto podré darte recomendaciones personalizadas.',
          data: []
        };
      }

      const message = this.buildSuggestionsMessage(suggestions);

      return {
        success: true,
        message,
        data: suggestions
      };
    } catch (error) {
      console.error('❌ [RULES] Error generando sugerencias:', error);
      return {
        success: false,
        message: 'Error al generar sugerencias.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Explica una regla en lenguaje natural
   */
  async explicarRegla(
    action: RuleAction,
    userId: string,
    tenantId: string
  ): Promise<ExecutionResult> {
    try {
      const { entidades } = action;
      const searchTerm = entidades?.id || entidades?.nombre;

      if (!searchTerm) {
        // Explicar todas las reglas activas
        const rules = await prisma.approvalRule.findMany({
          where: { tenantId, isActive: true },
          include: {
            levels: {
              include: { approvers: true },
              orderBy: { levelOrder: 'asc' }
            }
          },
          orderBy: { priority: 'desc' }
        });

        if (rules.length === 0) {
          return {
            success: true,
            message: '📖 **No hay reglas activas configuradas**\n\nActualmente los documentos no pasan por ningún proceso de aprobación.'
          };
        }

        const explanations = rules.map(r => this.buildRuleExplanation(r)).join('\n\n---\n\n');

        return {
          success: true,
          message: `📖 **Reglas de Aprobación Activas**\n\n${explanations}`,
          data: rules
        };
      }

      // Buscar regla específica
      const rule = await prisma.approvalRule.findFirst({
        where: {
          OR: [
            { id: searchTerm },
            { name: { contains: searchTerm, mode: 'insensitive' } }
          ],
          tenantId
        },
        include: {
          levels: {
            include: { approvers: true },
            orderBy: { levelOrder: 'asc' }
          }
        }
      });

      if (!rule) {
        return {
          success: false,
          message: `No encontré una regla con "${searchTerm}".`,
          error: 'RULE_NOT_FOUND'
        };
      }

      return {
        success: true,
        message: `📖 **Explicación de la Regla**\n\n${this.buildRuleExplanation(rule)}`,
        data: rule
      };
    } catch (error) {
      console.error('❌ [RULES] Error explicando regla:', error);
      return {
        success: false,
        message: 'Error al explicar la regla.',
        error: (error as Error).message
      };
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  private mapDocumentType(type?: string): ApprovalDocumentType {
    if (!type) return 'PURCHASE_REQUEST';
    const normalized = type.toUpperCase().replace(/\s+/g, '_');
    if (normalized.includes('INVOICE') || normalized.includes('FACTURA')) return 'INVOICE';
    if (normalized.includes('ORDER') || normalized.includes('OC') || normalized.includes('ORDEN')) return 'PURCHASE_ORDER';
    return 'PURCHASE_REQUEST';
  }

  private mapPurchaseType(type?: string | null): PurchaseType | null {
    if (!type) return null;
    const normalized = type.toUpperCase();
    if (normalized.includes('DIRECT') || normalized.includes('DIRECTA')) return 'DIRECT';
    if (normalized.includes('QUOTE') || normalized.includes('COTIZ')) return 'WITH_QUOTE';
    if (normalized.includes('BID') || normalized.includes('LICITA')) return 'WITH_BID';
    if (normalized.includes('ADVANCE') || normalized.includes('ANTICIP')) return 'WITH_ADVANCE';
    return null;
  }

  private buildPreviewMessage(rule: any): string {
    const docTypeLabels: Record<string, string> = {
      'PURCHASE_REQUEST': 'Requerimientos de Compra',
      'PURCHASE_ORDER': 'Órdenes de Compra',
      'INVOICE': 'Facturas'
    };
    const docTypeLabel = docTypeLabels[rule.documentType as string] || rule.documentType;

    let condiciones = [];
    if (rule.minAmount) condiciones.push(`Monto mínimo: $${Number(rule.minAmount).toLocaleString('es-AR')}`);
    if (rule.maxAmount) condiciones.push(`Monto máximo: $${Number(rule.maxAmount).toLocaleString('es-AR')}`);
    if (rule.purchaseType) condiciones.push(`Tipo de compra: ${rule.purchaseType}`);
    if (rule.sector) condiciones.push(`Sector: ${rule.sector}`);

    const nivelesText = rule.niveles.map((n: any, idx: number) => {
      const aprobadores = n.aprobadores.map((a: any) =>
        a.tipo === 'rol' ? `Rol: ${a.nombre}` : `Usuario: ${a.id}`
      ).join(', ');
      return `   ${idx + 1}. **${n.nombre}** (${n.approvalMode === 'ALL' ? 'Todos deben aprobar' : 'Cualquiera aprueba'}) → ${aprobadores}`;
    }).join('\n');

    return `📋 **Vista previa de la regla**

**Nombre:** ${rule.nombre}
${rule.descripcion ? `**Descripción:** ${rule.descripcion}\n` : ''}
**Aplica a:** ${docTypeLabel}
**Prioridad:** ${rule.priority}
**Estado:** ${rule.isActive ? '✅ Activa' : '❌ Inactiva'}

${condiciones.length > 0 ? `**Condiciones:**\n• ${condiciones.join('\n• ')}\n` : '**Condiciones:** Sin condiciones específicas (aplica a todos)\n'}
**Niveles de Aprobación:**
${nivelesText}

---
¿Confirmás la creación de esta regla?`;
  }

  private buildSuccessMessage(rule: any): string {
    return `✅ **Regla "${rule.name}" creada exitosamente**

📋 **Resumen:**
• **ID:** ${rule.id}
• **Niveles de aprobación:** ${rule.levels.length}
• **Prioridad:** ${rule.priority}
• **Estado:** ${rule.isActive ? 'Activa' : 'Inactiva'}

La regla ya está activa y se aplicará a los nuevos documentos que coincidan con las condiciones.

💡 **¿Qué podés hacer ahora?**
• "Mostrame las reglas activas"
• "Modificar la regla ${rule.name}"
• "Crear otra regla para..."`;
  }

  private buildModificationPreviewMessage(original: any, modified: any): string {
    const changes = [];

    if (original.name !== modified.nombre) {
      changes.push(`• Nombre: "${original.name}" → "${modified.nombre}"`);
    }
    if (original.description !== modified.descripcion) {
      changes.push(`• Descripción: actualizada`);
    }
    if (String(original.minAmount) !== String(modified.minAmount)) {
      changes.push(`• Monto mínimo: $${original.minAmount || 0} → $${modified.minAmount || 0}`);
    }
    if (String(original.maxAmount) !== String(modified.maxAmount)) {
      changes.push(`• Monto máximo: $${original.maxAmount || '∞'} → $${modified.maxAmount || '∞'}`);
    }
    if (original.priority !== modified.priority) {
      changes.push(`• Prioridad: ${original.priority} → ${modified.priority}`);
    }
    if (original.isActive !== modified.isActive) {
      changes.push(`• Estado: ${original.isActive ? 'Activa' : 'Inactiva'} → ${modified.isActive ? 'Activa' : 'Inactiva'}`);
    }

    return `✏️ **Modificación de regla: ${original.name}**

**Cambios detectados:**
${changes.length > 0 ? changes.join('\n') : '• Sin cambios detectados'}

¿Confirmás estos cambios?`;
  }

  private buildRulesListMessage(rules: any[]): string {
    const docTypeShort: Record<string, string> = {
      'PURCHASE_REQUEST': 'REQ',
      'PURCHASE_ORDER': 'OC',
      'INVOICE': 'FAC'
    };
    const rulesList = rules.map((rule, idx) => {
      const status = rule.isActive ? '✅' : '❌';
      const docType = docTypeShort[rule.documentType as string] || rule.documentType;

      let condicion = '';
      if (rule.minAmount || rule.maxAmount) {
        const min = rule.minAmount ? `$${Number(rule.minAmount).toLocaleString('es-AR')}` : '$0';
        const max = rule.maxAmount ? `$${Number(rule.maxAmount).toLocaleString('es-AR')}` : '∞';
        condicion = ` | ${min} - ${max}`;
      }

      return `${idx + 1}. ${status} **${rule.name}** [${docType}]${condicion} (${rule.levels.length} niveles)`;
    }).join('\n');

    return `📋 **Reglas de Aprobación** (${rules.length})\n\n${rulesList}\n\n💡 Decime el nombre de una regla para ver más detalles o modificarla.`;
  }

  private buildSuggestionsMessage(suggestions: any[]): string {
    const suggestionsList = suggestions.map((s, idx) =>
      `${idx + 1}. 💡 **${s.title}**\n   ${s.reason}\n   → "${s.suggestedPrompt}"`
    ).join('\n\n');

    return `💡 **Sugerencias basadas en tu historial**\n\n${suggestionsList}\n\n¿Querés que cree alguna de estas reglas?`;
  }

  private buildRuleExplanation(rule: any): string {
    const docTypeLabels: Record<string, string> = {
      'PURCHASE_REQUEST': 'requerimientos de compra',
      'PURCHASE_ORDER': 'órdenes de compra',
      'INVOICE': 'facturas'
    };
    const docTypeLabel = docTypeLabels[rule.documentType as string] || rule.documentType;

    let condicionText = 'todos los documentos';
    const condiciones = [];

    if (rule.minAmount && rule.maxAmount) {
      condiciones.push(`montos entre $${Number(rule.minAmount).toLocaleString('es-AR')} y $${Number(rule.maxAmount).toLocaleString('es-AR')}`);
    } else if (rule.minAmount) {
      condiciones.push(`montos mayores a $${Number(rule.minAmount).toLocaleString('es-AR')}`);
    } else if (rule.maxAmount) {
      condiciones.push(`montos hasta $${Number(rule.maxAmount).toLocaleString('es-AR')}`);
    }

    if (rule.purchaseType) {
      const tipoCompraLabels: Record<string, string> = {
        'DIRECT': 'compra directa',
        'WITH_QUOTE': 'con cotización',
        'WITH_BID': 'con licitación',
        'WITH_ADVANCE': 'con anticipo'
      };
      const tipoCompra = tipoCompraLabels[rule.purchaseType as string] || rule.purchaseType;
      condiciones.push(`tipo ${tipoCompra}`);
    }

    if (rule.sector) {
      condiciones.push(`sector "${rule.sector}"`);
    }

    if (condiciones.length > 0) {
      condicionText = condiciones.join(', ');
    }

    const nivelesExplicacion = rule.levels.map((level: any, idx: number) => {
      const aprobadores = level.approvers.map((a: any) => {
        if (a.role) return `usuarios con rol **${a.role}**`;
        return `usuario específico`;
      }).join(' o ');

      const modo = level.approvalMode === 'ALL'
        ? 'todos deben aprobar'
        : 'cualquiera puede aprobar';

      return `${idx + 1}. **${level.name}**: ${aprobadores} (${modo})`;
    }).join('\n');

    return `**${rule.name}** ${rule.isActive ? '(Activa)' : '(Inactiva)'}

Esta regla aplica a **${docTypeLabel}** con ${condicionText}.

**Proceso de aprobación:**
${nivelesExplicacion}

**Prioridad:** ${rule.priority} (mayor = se evalúa primero)`;
  }

  /**
   * Obtiene las reglas pendientes de confirmación para un usuario
   */
  getPendingRulesForUser(userId: string): Array<{ id: string; rule: any; expiresAt: Date }> {
    const userPendingRules: Array<{ id: string; rule: any; expiresAt: Date }> = [];
    const now = new Date();

    for (const [id, pending] of pendingRules.entries()) {
      if (pending.userId === userId && pending.expiresAt > now) {
        userPendingRules.push({
          id,
          rule: pending.rule,
          expiresAt: pending.expiresAt
        });
      }
    }

    return userPendingRules;
  }
}
