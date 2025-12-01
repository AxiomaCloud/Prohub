import {
  PrismaClient,
  ApprovalMode,
  ApprovalLevelType,
  ApprovalWorkflowStatus,
  ApprovalDecision,
  PurchaseType,
  ApprovalDocumentType,
} from '@prisma/client';
import { NotificationService } from './notificationService';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export class ApprovalWorkflowService {
  /**
   * Encuentra la regla de aprobación aplicable para un documento
   */
  static async findApplicableRule(
    tenantId: string,
    documentType: ApprovalDocumentType,
    amount: number | Decimal,
    purchaseType: PurchaseType
  ) {
    const amountNum = typeof amount === 'object' ? parseFloat(amount.toString()) : amount;

    // Buscar reglas activas del tenant ordenadas por prioridad
    const rules = await prisma.approvalRule.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        levels: {
          orderBy: { levelOrder: 'asc' },
          include: {
            approvers: true,
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    // Encontrar la primera regla que coincida
    for (const rule of rules) {
      // Verificar tipo de compra si está especificado
      if (rule.purchaseType && rule.purchaseType !== purchaseType) {
        continue;
      }

      // Verificar rango de monto
      if (rule.minAmount !== null && amountNum < parseFloat(rule.minAmount.toString())) {
        continue;
      }
      if (rule.maxAmount !== null && amountNum > parseFloat(rule.maxAmount.toString())) {
        continue;
      }

      return rule;
    }

    return null;
  }

  /**
   * Inicia un workflow de aprobación para un documento
   */
  static async startWorkflow(
    tenantId: string,
    documentType: ApprovalDocumentType,
    documentId: string,
    amount: number | Decimal,
    purchaseType: PurchaseType,
    requiresSpecApproval: boolean = false,
    initiatedBy: string
  ) {
    // Buscar regla aplicable
    const rule = await this.findApplicableRule(tenantId, documentType, amount, purchaseType);

    if (!rule) {
      console.log(`⚠️ [APPROVAL] No applicable rule found for ${documentType} ${documentId}`);
      return null;
    }

    // Filtrar niveles según si requiere aprobación de especificaciones
    let applicableLevels = rule.levels;
    if (!requiresSpecApproval) {
      applicableLevels = rule.levels.filter(l => l.levelType !== 'SPECIFICATIONS');
    }

    if (applicableLevels.length === 0) {
      console.log(`⚠️ [APPROVAL] No levels to process for ${documentType} ${documentId}`);
      return null;
    }

    // Crear el workflow
    const workflow = await prisma.approvalWorkflow.create({
      data: {
        tenantId,
        approvalRuleId: rule.id,
        documentType,
        documentId,
        status: 'IN_PROGRESS',
        currentLevel: 1,
        initiatedBy,
      },
    });

    // Crear la primera instancia de aprobación
    const firstLevel = applicableLevels[0];
    await this.createApprovalInstance(workflow.id, firstLevel, tenantId, documentId, documentType);

    console.log(`✅ [APPROVAL] Started workflow ${workflow.id} for ${documentType} ${documentId}`);
    return workflow;
  }

  /**
   * Crea una instancia de aprobación para un nivel
   */
  private static async createApprovalInstance(
    workflowId: string,
    level: any,
    tenantId: string,
    documentId: string,
    documentType: ApprovalDocumentType
  ) {
    // Obtener aprobadores potenciales
    const potentialApprovers: any[] = [];

    for (const approver of level.approvers) {
      if (approver.userId) {
        const user = await prisma.user.findUnique({
          where: { id: approver.userId },
          select: { id: true, name: true, email: true },
        });
        if (user) {
          potentialApprovers.push({
            userId: user.id,
            name: user.name,
            email: user.email,
          });
        }
      } else if (approver.role) {
        // Buscar usuarios con este rol en el tenant
        const memberships = await prisma.tenantMembership.findMany({
          where: {
            tenantId,
            roles: { has: approver.role },
            isActive: true,
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });
        for (const membership of memberships) {
          potentialApprovers.push({
            userId: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            role: approver.role,
          });
        }
      }
    }

    // Crear la instancia
    const instance = await prisma.approvalInstance.create({
      data: {
        workflowId,
        levelOrder: level.levelOrder,
        levelName: level.name,
        levelType: level.levelType,
        approvalMode: level.approvalMode,
        potentialApprovers: potentialApprovers,
        decision: 'PENDING',
      },
    });

    // Notificar a los aprobadores potenciales
    if (documentType === 'PURCHASE_REQUEST') {
      const pr = await prisma.purchaseRequest.findUnique({
        where: { id: documentId },
        include: { solicitante: { select: { name: true, email: true } } },
      });

      if (pr) {
        for (const approver of potentialApprovers) {
          await NotificationService.notifyApprovalNeeded(
            {
              ...pr,
              requester: { name: pr.solicitante.name, email: pr.solicitante.email },
            } as any,
            approver.email,
            level.name,
            tenantId
          );
        }
      }
    }

    return instance;
  }

  /**
   * Procesa una decisión de aprobación
   */
  static async processDecision(
    workflowId: string,
    approverId: string,
    decision: 'APPROVED' | 'REJECTED',
    comment?: string
  ): Promise<{ success: boolean; workflowComplete: boolean; finalStatus?: ApprovalWorkflowStatus }> {
    // Obtener el workflow con sus instancias
    const workflow = await prisma.approvalWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        approvals: {
          orderBy: { levelOrder: 'asc' },
        },
      },
    });

    if (!workflow) {
      return { success: false, workflowComplete: false };
    }

    // Obtener la regla para conocer los niveles
    const rule = await prisma.approvalRule.findUnique({
      where: { id: workflow.approvalRuleId },
      include: {
        levels: {
          orderBy: { levelOrder: 'asc' },
          include: { approvers: true },
        },
      },
    });

    if (!rule) {
      return { success: false, workflowComplete: false };
    }

    // Encontrar la instancia actual pendiente
    const currentInstance = workflow.approvals.find(
      a => a.levelOrder === workflow.currentLevel && a.decision === 'PENDING'
    );

    if (!currentInstance) {
      console.log(`⚠️ [APPROVAL] No pending instance found at level ${workflow.currentLevel}`);
      return { success: false, workflowComplete: false };
    }

    // Verificar que el aprobador está en la lista de potenciales
    const potentialApprovers = currentInstance.potentialApprovers as any[];
    const isAuthorized = potentialApprovers?.some((a: any) => a.userId === approverId);

    if (!isAuthorized) {
      console.log(`⚠️ [APPROVAL] User ${approverId} not authorized for this level`);
      return { success: false, workflowComplete: false };
    }

    // Obtener nombre del aprobador
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
      select: { name: true },
    });

    // Actualizar la instancia con la decisión
    await prisma.approvalInstance.update({
      where: { id: currentInstance.id },
      data: {
        decision: decision as ApprovalDecision,
        comment,
        decidedById: approverId,
        decidedByName: approver?.name,
        decidedAt: new Date(),
      },
    });

    // Si fue rechazado, terminar el workflow
    if (decision === 'REJECTED') {
      await this.completeWorkflow(workflowId, 'REJECTED', decision, comment);
      return { success: true, workflowComplete: true, finalStatus: 'REJECTED' };
    }

    // Si fue aprobado, verificar si hay más niveles
    const currentLevel = rule.levels.find(l => l.levelOrder === workflow.currentLevel);
    const nextLevel = rule.levels.find(l => l.levelOrder > workflow.currentLevel);

    if (nextLevel) {
      // Avanzar al siguiente nivel
      await prisma.approvalWorkflow.update({
        where: { id: workflowId },
        data: { currentLevel: nextLevel.levelOrder },
      });

      // Crear instancia para el siguiente nivel
      await this.createApprovalInstance(
        workflowId,
        nextLevel,
        workflow.tenantId,
        workflow.documentId,
        workflow.documentType
      );

      return { success: true, workflowComplete: false };
    } else {
      // Workflow completado exitosamente
      await this.completeWorkflow(workflowId, 'APPROVED', decision, comment);
      return { success: true, workflowComplete: true, finalStatus: 'APPROVED' };
    }
  }

  /**
   * Completa un workflow con el estado final
   */
  private static async completeWorkflow(
    workflowId: string,
    status: 'APPROVED' | 'REJECTED',
    finalDecision: ApprovalDecision,
    finalComment?: string
  ) {
    const workflow = await prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: {
        status,
        completedAt: new Date(),
        finalDecision,
        finalComment,
      },
    });

    // Actualizar el estado del documento asociado
    if (workflow.documentType === 'PURCHASE_REQUEST') {
      const newStatus = status === 'APPROVED' ? 'APROBADO' : 'RECHAZADO';
      await prisma.purchaseRequest.update({
        where: { id: workflow.documentId },
        data: { estado: newStatus },
      });
    }
  }

  /**
   * Obtiene el estado actual de un workflow
   */
  static async getWorkflowStatus(workflowId: string) {
    return await prisma.approvalWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        approvals: {
          orderBy: { levelOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Obtiene el workflow activo de un documento
   */
  static async getActiveWorkflow(
    documentType: ApprovalDocumentType,
    documentId: string
  ) {
    return await prisma.approvalWorkflow.findFirst({
      where: {
        documentType,
        documentId,
        status: 'IN_PROGRESS',
      },
      include: {
        approvals: {
          orderBy: { levelOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Obtiene los documentos pendientes de aprobación para un usuario
   */
  static async getPendingApprovals(userId: string, tenantId: string) {
    // Buscar workflows activos en el tenant
    const workflows = await prisma.approvalWorkflow.findMany({
      where: {
        tenantId,
        status: 'IN_PROGRESS',
      },
      include: {
        approvals: {
          where: { decision: 'PENDING' },
        },
      },
    });

    // Filtrar por aquellos donde el usuario es aprobador potencial
    const pendingForUser = [];

    for (const workflow of workflows) {
      for (const approval of workflow.approvals) {
        const potentialApprovers = approval.potentialApprovers as any[];
        if (potentialApprovers?.some((a: any) => a.userId === userId)) {
          // Obtener información del documento
          let document = null;
          if (workflow.documentType === 'PURCHASE_REQUEST') {
            document = await prisma.purchaseRequest.findUnique({
              where: { id: workflow.documentId },
              include: {
                solicitante: { select: { name: true, email: true } },
              },
            });
          }

          pendingForUser.push({
            workflow,
            approval,
            document,
          });
        }
      }
    }

    return pendingForUser;
  }

  /**
   * Cancela un workflow
   */
  static async cancelWorkflow(workflowId: string) {
    await prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    // Marcar todas las instancias pendientes como saltadas
    await prisma.approvalInstance.updateMany({
      where: {
        workflowId,
        decision: 'PENDING',
      },
      data: {
        decision: 'SKIPPED',
      },
    });
  }

  /**
   * Crea una delegación de aprobaciones
   */
  static async createDelegation(
    delegatorId: string,
    delegateId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date,
    reason?: string
  ) {
    // Obtener nombres de los usuarios
    const [delegator, delegate] = await Promise.all([
      prisma.user.findUnique({ where: { id: delegatorId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: delegateId }, select: { name: true, email: true } }),
    ]);

    // Verificar que no exista una delegación activa que se solape
    const existingDelegation = await prisma.approvalDelegation.findFirst({
      where: {
        delegatorId,
        tenantId,
        isActive: true,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (existingDelegation) {
      throw new Error('Ya existe una delegación activa para este período');
    }

    const delegation = await prisma.approvalDelegation.create({
      data: {
        delegatorId,
        delegatorName: delegator?.name || '',
        delegateId,
        delegateName: delegate?.name || '',
        tenantId,
        startDate,
        endDate,
        reason,
        isActive: true,
      },
    });

    // Notificar al delegado
    if (delegate?.email) {
      await NotificationService.notifyDelegationReceived(
        delegate.email,
        delegator?.name || 'Usuario',
        startDate,
        endDate,
        reason,
        tenantId
      );
    }

    return delegation;
  }

  /**
   * Cancela una delegación
   */
  static async cancelDelegation(delegationId: string) {
    await prisma.approvalDelegation.update({
      where: { id: delegationId },
      data: { isActive: false },
    });
  }

  /**
   * Obtiene las delegaciones de un usuario
   */
  static async getUserDelegations(userId: string, tenantId: string) {
    return await prisma.approvalDelegation.findMany({
      where: {
        OR: [
          { delegatorId: userId },
          { delegateId: userId },
        ],
        tenantId,
      },
      orderBy: { startDate: 'desc' },
    });
  }
}
