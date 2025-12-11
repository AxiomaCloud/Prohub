import { PrismaClient, ApprovalDocumentType } from '@prisma/client';

const prisma = new PrismaClient();

export interface PatternAnalysis {
  totalWorkflows: number;
  approvalRate: number;
  avgApprovalTime: number;
  topApprovers: Array<{
    userId: string;
    userName: string;
    approvalCount: number;
    avgResponseTime: number;
  }>;
  amountDistribution: Array<{
    range: string;
    count: number;
    avgApprovalTime: number;
  }>;
  categoryBreakdown: Record<string, number>;
}

export interface CoverageGap {
  type: 'no_rule' | 'partial_coverage' | 'conflicting_rules';
  description: string;
  documentType: ApprovalDocumentType;
  amountRange?: { min: number; max: number };
  affectedDocuments: number;
  suggestion: string;
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
    documentType: ApprovalDocumentType;
    minAmount?: number;
    maxAmount?: number;
    category?: string;
    approvers: Array<{ type: 'role' | 'user'; value: string }>;
  };
}

export interface RuleStats {
  ruleId: string;
  ruleName: string;
  totalWorkflows: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  avgApprovalTimeHours: number;
  lastUsed: Date | null;
  documentsCovered: number;
}

export class RuleAnalyzerService {
  /**
   * Analiza patrones históricos de aprobación
   */
  async analyzeApprovalPatterns(tenantId: string): Promise<PatternAnalysis> {
    // Obtener todos los workflows completados
    const workflows = await prisma.approvalWorkflow.findMany({
      where: {
        tenantId,
        status: { in: ['APPROVED', 'REJECTED'] }
      },
      include: {
        approvals: true
      }
    });

    const totalWorkflows = workflows.length;
    const approvedCount = workflows.filter(w => w.status === 'APPROVED').length;
    const approvalRate = totalWorkflows > 0 ? (approvedCount / totalWorkflows) * 100 : 0;

    // Calcular tiempo promedio de aprobación
    let totalApprovalTime = 0;
    let approvalTimeCount = 0;

    workflows.forEach(w => {
      if (w.completedAt && w.createdAt) {
        const timeDiff = w.completedAt.getTime() - w.createdAt.getTime();
        totalApprovalTime += timeDiff;
        approvalTimeCount++;
      }
    });

    const avgApprovalTime = approvalTimeCount > 0
      ? totalApprovalTime / approvalTimeCount / (1000 * 60 * 60) // En horas
      : 0;

    // Top aprobadores
    const approverStats: Record<string, { count: number; totalTime: number; name: string }> = {};

    for (const workflow of workflows) {
      for (const approval of workflow.approvals) {
        if (approval.decidedById && approval.decision === 'APPROVED') {
          if (!approverStats[approval.decidedById]) {
            approverStats[approval.decidedById] = {
              count: 0,
              totalTime: 0,
              name: approval.decidedByName || 'Usuario'
            };
          }
          approverStats[approval.decidedById].count++;

          if (approval.decidedAt && approval.createdAt) {
            const responseTime = approval.decidedAt.getTime() - approval.createdAt.getTime();
            approverStats[approval.decidedById].totalTime += responseTime;
          }
        }
      }
    }

    const topApprovers = Object.entries(approverStats)
      .map(([userId, stats]) => ({
        userId,
        userName: stats.name,
        approvalCount: stats.count,
        avgResponseTime: stats.count > 0 ? stats.totalTime / stats.count / (1000 * 60 * 60) : 0
      }))
      .sort((a, b) => b.approvalCount - a.approvalCount)
      .slice(0, 5);

    // Distribución por montos (obtener de requerimientos)
    const amountDistribution = await this.getAmountDistribution(tenantId);

    // Breakdown por categoría
    const categoryBreakdown = await this.getCategoryBreakdown(tenantId);

    return {
      totalWorkflows,
      approvalRate,
      avgApprovalTime,
      topApprovers,
      amountDistribution,
      categoryBreakdown
    };
  }

  /**
   * Detecta gaps en la cobertura de reglas
   */
  async detectCoverageGaps(tenantId: string): Promise<CoverageGap[]> {
    const gaps: CoverageGap[] = [];

    // Obtener reglas activas
    const rules = await prisma.approvalRule.findMany({
      where: { tenantId, isActive: true }
    });

    // Verificar si hay reglas para cada tipo de documento
    const documentTypes: ApprovalDocumentType[] = ['PURCHASE_REQUEST', 'PURCHASE_ORDER', 'INVOICE'];

    for (const docType of documentTypes) {
      const rulesForType = rules.filter(r => r.documentType === docType);

      if (rulesForType.length === 0) {
        const docTypeLabel = {
          'PURCHASE_REQUEST': 'requerimientos de compra',
          'PURCHASE_ORDER': 'órdenes de compra',
          'INVOICE': 'facturas'
        }[docType];

        // Contar documentos sin regla
        let affectedCount = 0;
        if (docType === 'PURCHASE_REQUEST') {
          affectedCount = await prisma.purchaseRequest.count({ where: { tenantId } });
        } else if (docType === 'PURCHASE_ORDER') {
          affectedCount = await prisma.purchaseOrderCircuit.count({ where: { tenantId } });
        }

        if (affectedCount > 0 || docType !== 'INVOICE') {
          gaps.push({
            type: 'no_rule',
            description: `No hay reglas de aprobación para ${docTypeLabel}`,
            documentType: docType,
            affectedDocuments: affectedCount,
            suggestion: `Crear una regla básica para aprobar ${docTypeLabel}`
          });
        }
      }

      // Verificar rangos de monto sin cobertura
      const montoRanges = this.analyzeAmountRanges(rulesForType);
      if (montoRanges.gaps.length > 0) {
        for (const gap of montoRanges.gaps) {
          gaps.push({
            type: 'partial_coverage',
            description: `Documentos con monto entre $${gap.min.toLocaleString()} y $${gap.max.toLocaleString()} no tienen regla`,
            documentType: docType,
            amountRange: gap,
            affectedDocuments: 0, // Requeriría query adicional
            suggestion: `Crear regla para montos de $${gap.min.toLocaleString()} a $${gap.max.toLocaleString()}`
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Genera sugerencias de reglas basadas en patrones
   */
  async generateRuleSuggestions(tenantId: string): Promise<RuleSuggestion[]> {
    const suggestions: RuleSuggestion[] = [];

    // Analizar patrones
    const patterns = await this.analyzeApprovalPatterns(tenantId);
    const gaps = await this.detectCoverageGaps(tenantId);

    // Sugerencia 1: Regla basada en top aprobador
    if (patterns.topApprovers.length > 0) {
      const topApprover = patterns.topApprovers[0];
      if (topApprover.approvalCount >= 5) {
        suggestions.push({
          id: `sug_${Date.now()}_1`,
          title: `Asignar ${topApprover.userName} como aprobador principal`,
          reason: `${topApprover.userName} ha aprobado ${topApprover.approvalCount} documentos con un tiempo promedio de ${topApprover.avgResponseTime.toFixed(1)} horas.`,
          confidence: Math.min(topApprover.approvalCount / 10, 1) * 100,
          suggestedPrompt: `Crea una regla donde ${topApprover.userName} apruebe todos los requerimientos`,
          basedOn: {
            pattern: 'frequent_approver',
            dataPoints: topApprover.approvalCount
          },
          suggestedRule: {
            name: `Aprobación por ${topApprover.userName}`,
            documentType: 'PURCHASE_REQUEST',
            approvers: [{ type: 'user', value: topApprover.userId }]
          }
        });
      }
    }

    // Sugerencia 2: Regla por rango de monto
    if (patterns.amountDistribution.length > 0) {
      const highAmountRange = patterns.amountDistribution.find(d => d.range.includes('alto'));
      if (highAmountRange && highAmountRange.count >= 3) {
        suggestions.push({
          id: `sug_${Date.now()}_2`,
          title: 'Aprobación gerencial para montos altos',
          reason: `Se detectaron ${highAmountRange.count} documentos con montos altos que podrían requerir aprobación especial.`,
          confidence: 75,
          suggestedPrompt: 'Crea una regla que requiera aprobación de gerente para compras mayores a $500,000',
          basedOn: {
            pattern: 'high_amount_transactions',
            dataPoints: highAmountRange.count
          },
          suggestedRule: {
            name: 'Aprobación Gerencial +$500K',
            documentType: 'PURCHASE_REQUEST',
            minAmount: 500000,
            approvers: [{ type: 'role', value: 'PURCHASE_ADMIN' }]
          }
        });
      }
    }

    // Sugerencia 3: Basada en gaps detectados
    for (const gap of gaps.slice(0, 2)) {
      if (gap.type === 'no_rule') {
        suggestions.push({
          id: `sug_${Date.now()}_gap_${gap.documentType}`,
          title: `Crear regla para ${gap.description.split(' para ')[1]}`,
          reason: gap.description,
          confidence: 90,
          suggestedPrompt: gap.suggestion,
          basedOn: {
            pattern: 'coverage_gap',
            dataPoints: gap.affectedDocuments
          },
          suggestedRule: {
            name: `Regla básica ${gap.documentType}`,
            documentType: gap.documentType,
            approvers: [{ type: 'role', value: 'PURCHASE_APPROVER' }]
          }
        });
      }
    }

    // Sugerencia 4: Por categoría frecuente
    const categories = Object.entries(patterns.categoryBreakdown)
      .sort(([, a], [, b]) => b - a);

    if (categories.length > 0 && categories[0][1] >= 5) {
      const [topCategory, count] = categories[0];
      suggestions.push({
        id: `sug_${Date.now()}_cat`,
        title: `Regla especializada para ${topCategory}`,
        reason: `La categoría "${topCategory}" tiene ${count} documentos y podría beneficiarse de una regla específica.`,
        confidence: 65,
        suggestedPrompt: `Crea una regla específica para compras de categoría ${topCategory}`,
        basedOn: {
          pattern: 'category_concentration',
          dataPoints: count
        },
        suggestedRule: {
          name: `Aprobación ${topCategory}`,
          documentType: 'PURCHASE_REQUEST',
          category: topCategory,
          approvers: [{ type: 'role', value: 'PURCHASE_APPROVER' }]
        }
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Obtiene estadísticas de uso de una regla
   */
  async getRuleStatistics(ruleId: string): Promise<RuleStats | null> {
    const rule = await prisma.approvalRule.findUnique({
      where: { id: ruleId }
    });

    if (!rule) return null;

    const workflows = await prisma.approvalWorkflow.findMany({
      where: { approvalRuleId: ruleId }
    });

    const approvedCount = workflows.filter(w => w.status === 'APPROVED').length;
    const rejectedCount = workflows.filter(w => w.status === 'REJECTED').length;
    const pendingCount = workflows.filter(w => w.status === 'IN_PROGRESS').length;

    // Calcular tiempo promedio de aprobación
    let totalTime = 0;
    let timeCount = 0;

    workflows.forEach(w => {
      if (w.status === 'APPROVED' && w.completedAt && w.createdAt) {
        totalTime += w.completedAt.getTime() - w.createdAt.getTime();
        timeCount++;
      }
    });

    const avgApprovalTimeHours = timeCount > 0 ? totalTime / timeCount / (1000 * 60 * 60) : 0;

    // Última vez usada
    const lastWorkflow = workflows
      .filter(w => w.createdAt)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return {
      ruleId,
      ruleName: rule.name,
      totalWorkflows: workflows.length,
      approvedCount,
      rejectedCount,
      pendingCount,
      avgApprovalTimeHours,
      lastUsed: lastWorkflow?.createdAt || null,
      documentsCovered: workflows.length
    };
  }

  // ============================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ============================================

  private async getAmountDistribution(tenantId: string): Promise<PatternAnalysis['amountDistribution']> {
    const requerimientos = await prisma.purchaseRequest.findMany({
      where: { tenantId },
      select: { montoEstimado: true, createdAt: true }
    });

    const ranges = [
      { label: 'Bajo (<$50K)', min: 0, max: 50000 },
      { label: 'Medio ($50K-$200K)', min: 50000, max: 200000 },
      { label: 'Alto ($200K-$500K)', min: 200000, max: 500000 },
      { label: 'Muy alto (>$500K)', min: 500000, max: Infinity }
    ];

    return ranges.map(range => {
      const docsInRange = requerimientos.filter(r => {
        const monto = Number(r.montoEstimado) || 0;
        return monto >= range.min && monto < range.max;
      });

      return {
        range: range.label,
        count: docsInRange.length,
        avgApprovalTime: 0 // Simplificado
      };
    });
  }

  private async getCategoryBreakdown(tenantId: string): Promise<Record<string, number>> {
    const requerimientos = await prisma.purchaseRequest.groupBy({
      by: ['categoria'],
      where: { tenantId },
      _count: true
    });

    const breakdown: Record<string, number> = {};
    requerimientos.forEach(r => {
      if (r.categoria) {
        breakdown[r.categoria] = r._count;
      }
    });

    return breakdown;
  }

  private analyzeAmountRanges(rules: any[]): { gaps: Array<{ min: number; max: number }> } {
    if (rules.length === 0) {
      return { gaps: [] };
    }

    // Ordenar reglas por monto mínimo
    const sortedRules = rules
      .filter(r => r.minAmount !== null || r.maxAmount !== null)
      .sort((a, b) => (Number(a.minAmount) || 0) - (Number(b.minAmount) || 0));

    const gaps: Array<{ min: number; max: number }> = [];

    // Si no hay reglas con monto, sugerir agregar
    if (sortedRules.length === 0) {
      return { gaps: [] };
    }

    // Verificar si hay gap al inicio (0 a primer monto mínimo)
    const firstMinAmount = Number(sortedRules[0].minAmount) || 0;
    if (firstMinAmount > 0) {
      gaps.push({ min: 0, max: firstMinAmount });
    }

    // Verificar gaps entre reglas
    for (let i = 0; i < sortedRules.length - 1; i++) {
      const currentMax = Number(sortedRules[i].maxAmount) || Infinity;
      const nextMin = Number(sortedRules[i + 1].minAmount) || 0;

      if (currentMax < nextMin) {
        gaps.push({ min: currentMax, max: nextMin });
      }
    }

    return { gaps };
  }
}
