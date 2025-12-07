'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Edit, Trash2, X, ChevronDown, ChevronUp,
  Users, DollarSign, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/hooks/useApiClient';
import { useConfirmDialog } from '@/hooks/useConfirm';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Approver {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface ApprovalLevel {
  id: string;
  name: string;
  levelOrder: number;
  approvalMode: 'ANY' | 'ALL';
  levelType: 'GENERAL' | 'SPECIFICATIONS';
  approvers: Approver[];
}

interface ApprovalRule {
  id: string;
  name: string;
  documentType?: 'PURCHASE_REQUEST' | 'PURCHASE_ORDER';
  minAmount: number | null;
  maxAmount: number | null;
  purchaseType: string | null;
  priority: number;
  isActive: boolean;
  levels: ApprovalLevel[];
}

interface AvailableApprover {
  id: string;
  name: string;
  email: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE_REQUEST: 'Requerimientos de Compra',
  PURCHASE_ORDER: 'Órdenes de Compra',
};

const PURCHASE_TYPE_LABELS: Record<string, string> = {
  DIRECT: 'Compra Directa',
  WITH_QUOTE: 'Con Cotización',
  WITH_BID: 'Con Licitación',
  WITH_ADVANCE: 'Con Anticipo',
};

const MODE_LABELS: Record<string, { label: string; description: string }> = {
  ANY: { label: 'Cualquiera', description: 'Cualquier aprobador puede aprobar' },
  ALL: { label: 'Todos', description: 'Todos los aprobadores deben aprobar' },
};

const LEVEL_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General',
  SPECIFICATIONS: 'Especificaciones',
};

export default function ApprovalRulesPage() {
  const { tenant: currentTenant } = useAuth();
  const { get, post, put, delete: del } = useApiClient();
  const { confirm } = useConfirmDialog();

  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [availableApprovers, setAvailableApprovers] = useState<AvailableApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [expandedRules, setExpandedRules] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    documentType: 'PURCHASE_REQUEST' as 'PURCHASE_REQUEST' | 'PURCHASE_ORDER',
    minAmount: '',
    maxAmount: '',
    purchaseType: '' as string,
    priority: 1,
    levels: [] as Array<{
      name: string;
      mode: 'ANY' | 'ALL';
      levelType: 'GENERAL' | 'SPECIFICATIONS';
      approverIds: string[];
    }>,
  });

  const loadRules = useCallback(async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);
      const response = await get('/api/approval-rules', { 'X-Tenant-Id': currentTenant.id });
      setRules(response as ApprovalRule[]);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast.error('Error cargando reglas');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, get]);

  const loadApprovers = useCallback(async () => {
    if (!currentTenant?.id) return;

    try {
      const response = await get('/api/approval-rules/approvers/available', { 'X-Tenant-Id': currentTenant.id });
      setAvailableApprovers(response as AvailableApprover[]);
    } catch (error) {
      console.error('Error loading approvers:', error);
    }
  }, [currentTenant?.id, get]);

  useEffect(() => {
    loadRules();
    loadApprovers();
  }, [loadRules, loadApprovers]);

  const resetForm = () => {
    setFormData({
      name: '',
      documentType: 'PURCHASE_REQUEST',
      minAmount: '',
      maxAmount: '',
      purchaseType: '',
      priority: 1,
      levels: [],
    });
    setEditingRule(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowRuleModal(true);
  };

  const openEditModal = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      documentType: rule.documentType || 'PURCHASE_REQUEST',
      minAmount: rule.minAmount?.toString() || '',
      maxAmount: rule.maxAmount?.toString() || '',
      purchaseType: rule.purchaseType || '',
      priority: rule.priority,
      levels: rule.levels?.map(l => ({
        name: l.name,
        mode: l.approvalMode || 'ANY',
        levelType: l.levelType || 'GENERAL',
        approverIds: l.approvers?.map(a => a.userId) || [],
      })) || [],
    });
    setShowRuleModal(true);
  };

  const addLevel = () => {
    setFormData(prev => ({
      ...prev,
      levels: [
        ...prev.levels,
        {
          name: `Nivel ${prev.levels.length + 1}`,
          mode: 'ANY',
          levelType: 'GENERAL',
          approverIds: [],
        },
      ],
    }));
  };

  const removeLevel = (index: number) => {
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.filter((_, i) => i !== index),
    }));
  };

  const updateLevel = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.map((level, i) =>
        i === index ? { ...level, [field]: value } : level
      ),
    }));
  };

  const setPurchaseType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      purchaseType: prev.purchaseType === type ? '' : type,
    }));
  };

  const toggleApprover = (levelIndex: number, approverId: string) => {
    setFormData(prev => ({
      ...prev,
      levels: prev.levels.map((level, i) =>
        i === levelIndex
          ? {
              ...level,
              approverIds: level.approverIds.includes(approverId)
                ? level.approverIds.filter(id => id !== approverId)
                : [...level.approverIds, approverId],
            }
          : level
      ),
    }));
  };

  const saveRule = async () => {
    console.log('🔵 saveRule llamado');
    console.log('🔵 currentTenant:', currentTenant);
    console.log('🔵 formData:', formData);

    if (!currentTenant?.id) {
      console.log('❌ No hay tenant');
      toast.error('No hay tenant seleccionado');
      return;
    }

    if (!formData.name.trim()) {
      console.log('❌ No hay nombre');
      toast.error('El nombre es requerido');
      return;
    }

    if (formData.levels.length === 0) {
      console.log('❌ No hay niveles');
      toast.error('Debe agregar al menos un nivel de aprobación');
      return;
    }

    for (const level of formData.levels) {
      if (level.approverIds.length === 0) {
        console.log('❌ Nivel sin aprobadores:', level.name);
        toast.error(`El nivel "${level.name}" debe tener al menos un aprobador`);
        return;
      }
    }

    console.log('✅ Validaciones pasadas, enviando...');

    try {
      const payload = {
        name: formData.name,
        documentType: formData.documentType,
        minAmount: formData.minAmount ? parseFloat(formData.minAmount) : null,
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
        purchaseType: formData.purchaseType || null,
        priority: formData.priority,
        levels: formData.levels,
      };

      if (editingRule) {
        await put(`/api/approval-rules/${editingRule.id}`, payload, { 'X-Tenant-Id': currentTenant.id });
        toast.success('Regla actualizada');
      } else {
        await post('/api/approval-rules', payload, { 'X-Tenant-Id': currentTenant.id });
        toast.success('Regla creada');
      }

      setShowRuleModal(false);
      resetForm();
      loadRules();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Error guardando regla');
    }
  };

  const deleteRule = async (ruleId: string) => {
    const confirmed = await confirm(
      '¿Estás seguro de eliminar esta regla de aprobación?\n\nEsta acción no se puede deshacer.',
      'Eliminar Regla',
      'danger'
    );

    if (!confirmed) return;

    try {
      await del(`/api/approval-rules/${ruleId}`, { 'X-Tenant-Id': currentTenant?.id || '' });
      toast.success('Regla eliminada');
      loadRules();
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      if (error.activeWorkflows) {
        toast.error(`No se puede eliminar: hay ${error.activeWorkflows} workflows activos`);
      } else {
        toast.error('Error eliminando regla');
      }
    }
  };

  const toggleRuleExpanded = (ruleId: string) => {
    setExpandedRules(prev =>
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const toggleRuleActive = async (rule: ApprovalRule) => {
    try {
      await put(`/api/approval-rules/${rule.id}`, {
        isActive: !rule.isActive,
      }, { 'X-Tenant-Id': currentTenant?.id || '' });
      toast.success(rule.isActive ? 'Regla desactivada' : 'Regla activada');
      loadRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Error cambiando estado');
    }
  };

  const formatAmount = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  return (
    <ProtectedRoute requiredRoles={['CLIENT_ADMIN', 'SUPER_ADMIN']}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Reglas de Aprobación
            </h1>
            <p className="text-gray-600 mt-1">
              Configura los flujos de aprobación por monto, tipo de compra y niveles
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Regla
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando reglas...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No hay reglas configuradas</h3>
            <p className="text-gray-500 mt-1">Crea tu primera regla de aprobación</p>
            <Button onClick={openCreateModal} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Crear Regla
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white rounded-lg shadow border">
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRuleExpanded(rule.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      <p className="text-sm text-gray-500">
                        {rule.documentType ? DOCUMENT_TYPE_LABELS[rule.documentType] : 'Todos'} |
                        {rule.minAmount !== null && ` Desde ${formatAmount(rule.minAmount)}`}
                        {rule.maxAmount !== null && ` hasta ${formatAmount(rule.maxAmount)}`}
                        {rule.minAmount === null && rule.maxAmount === null && ' Cualquier monto'}
                        {rule.purchaseType && ` | ${PURCHASE_TYPE_LABELS[rule.purchaseType]}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{(rule.levels || []).length} nivel(es)</span>
                    {expandedRules.includes(rule.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedRules.includes(rule.id) && (
                  <div className="px-6 pb-4 border-t">
                    <div className="mt-4 space-y-3">
                      {(rule.levels || []).map((level, idx) => (
                        <div key={level.id || idx} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                                Nivel {level.levelOrder || idx + 1}
                              </span>
                              <span className="font-medium">{level.name}</span>
                              {level.levelType === 'SPECIFICATIONS' && (
                                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                                  Especificaciones
                                </span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              level.approvalMode === 'ANY' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {MODE_LABELS[level.approvalMode]?.label || level.approvalMode || 'ANY'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(level.approvers || []).map((approver) => (
                              <span
                                key={approver.userId}
                                className="inline-flex items-center gap-1 bg-white border px-2 py-1 rounded text-sm"
                              >
                                <Users className="h-3 w-3 text-gray-400" />
                                {approver.user?.name || 'Usuario'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRuleActive(rule);
                        }}
                      >
                        {rule.isActive ? (
                          <>
                            <XCircle className="h-4 w-4 mr-1" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Activar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(rule);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRule(rule.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rule Modal */}
        {showRuleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-semibold">
                  {editingRule ? 'Editar Regla' : 'Nueva Regla de Aprobación'}
                </h2>
                <button onClick={() => setShowRuleModal(false)}>
                  <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la Regla *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Aprobación hasta $100,000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Documento
                    </label>
                    <select
                      value={formData.documentType}
                      onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value as any }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PURCHASE_REQUEST">Requerimientos de Compra</option>
                      <option value="PURCHASE_ORDER">Órdenes de Compra</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Menor número = mayor prioridad</p>
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Rango de Monto (opcional)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        value={formData.minAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, minAmount: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Monto mínimo"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={formData.maxAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Monto máximo"
                      />
                    </div>
                  </div>
                </div>

                {/* Purchase Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipos de Compra (opcional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(PURCHASE_TYPE_LABELS).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPurchaseType(type)}
                        className={`px-3 py-1 rounded-full border text-sm ${
                          formData.purchaseType === type
                            ? 'bg-blue-100 border-blue-500 text-blue-800'
                            : 'bg-white border-gray-300 text-gray-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Si no seleccionas ninguno, aplica a todos los tipos
                  </p>
                </div>

                {/* Approval Levels */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Niveles de Aprobación *
                    </label>
                    <Button type="button" variant="secondary" size="sm" onClick={addLevel}>
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Nivel
                    </Button>
                  </div>

                  {formData.levels.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed">
                      <AlertTriangle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Agrega al menos un nivel de aprobación</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.levels.map((level, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1 grid grid-cols-3 gap-3">
                              <input
                                type="text"
                                value={level.name}
                                onChange={(e) => updateLevel(index, 'name', e.target.value)}
                                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Nombre del nivel"
                              />
                              <select
                                value={level.mode}
                                onChange={(e) => updateLevel(index, 'mode', e.target.value)}
                                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="ANY">Cualquiera (OR)</option>
                                <option value="ALL">Todos (AND)</option>
                              </select>
                              <select
                                value={level.levelType}
                                onChange={(e) => updateLevel(index, 'levelType', e.target.value)}
                                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="GENERAL">General</option>
                                <option value="SPECIFICATIONS">Especificaciones</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLevel(index)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          <label className="block text-sm text-gray-600 mb-2">Aprobadores:</label>
                          <div className="flex flex-wrap gap-2">
                            {availableApprovers.map((approver) => (
                              <button
                                key={approver.id}
                                type="button"
                                onClick={() => toggleApprover(index, approver.id)}
                                className={`px-3 py-1 rounded-full border text-sm flex items-center gap-1 ${
                                  level.approverIds.includes(approver.id)
                                    ? 'bg-blue-100 border-blue-500 text-blue-800'
                                    : 'bg-white border-gray-300 text-gray-600'
                                }`}
                              >
                                <Users className="h-3 w-3" />
                                {approver.name}
                              </button>
                            ))}
                          </div>
                          {level.approverIds.length === 0 && (
                            <p className="text-xs text-red-500 mt-2">
                              Selecciona al menos un aprobador
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
                <Button variant="secondary" onClick={() => setShowRuleModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveRule}>
                  {editingRule ? 'Guardar Cambios' : 'Crear Regla'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
