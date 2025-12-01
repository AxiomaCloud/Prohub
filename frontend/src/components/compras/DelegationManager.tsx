'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Calendar, Trash2, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

interface Delegation {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isActive: boolean;
  delegator: {
    id: string;
    name: string;
    email: string;
  };
  delegate: {
    id: string;
    name: string;
    email: string;
  };
}

interface AvailableDelegate {
  id: string;
  name: string;
  email: string;
}

export function DelegationManager() {
  const { tenant: currentTenant, user } = useAuth();
  const { get, post, delete: del } = useApiClient();

  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [availableDelegates, setAvailableDelegates] = useState<AvailableDelegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    delegateId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const loadDelegations = useCallback(async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);
      const response = await get('/api/approval-workflows/delegations', { 'X-Tenant-Id': currentTenant.id });
      setDelegations(response as Delegation[]);
    } catch (error) {
      console.error('Error loading delegations:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, get]);

  const loadAvailableDelegates = useCallback(async () => {
    if (!currentTenant?.id) return;

    try {
      const response = await get('/api/approval-workflows/delegations/available-delegates', { 'X-Tenant-Id': currentTenant.id });
      setAvailableDelegates(response as AvailableDelegate[]);
    } catch (error) {
      console.error('Error loading delegates:', error);
    }
  }, [currentTenant?.id, get]);

  useEffect(() => {
    loadDelegations();
    loadAvailableDelegates();
  }, [loadDelegations, loadAvailableDelegates]);

  const resetForm = () => {
    setFormData({
      delegateId: '',
      startDate: '',
      endDate: '',
      reason: '',
    });
  };

  const createDelegation = async () => {
    if (!currentTenant?.id) return;

    if (!formData.delegateId || !formData.startDate || !formData.endDate) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (isAfter(startDate, endDate)) {
      toast.error('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    try {
      await post(
        '/api/approval-workflows/delegations',
        {
          delegateId: formData.delegateId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          reason: formData.reason || undefined,
        },
        { 'X-Tenant-Id': currentTenant.id }
      );

      toast.success('Delegación creada');
      setShowModal(false);
      resetForm();
      loadDelegations();
    } catch (error: any) {
      console.error('Error creating delegation:', error);
      toast.error(error.response?.data?.error || 'Error creando delegación');
    }
  };

  const cancelDelegation = async (delegationId: string) => {
    if (!confirm('¿Cancelar esta delegación?')) return;

    try {
      await del(`/api/approval-workflows/delegations/${delegationId}`, { 'X-Tenant-Id': currentTenant?.id || '' });

      toast.success('Delegación cancelada');
      loadDelegations();
    } catch (error) {
      console.error('Error canceling delegation:', error);
      toast.error('Error cancelando delegación');
    }
  };

  const getDelegationStatus = (delegation: Delegation) => {
    const now = new Date();
    const startDate = new Date(delegation.startDate);
    const endDate = new Date(delegation.endDate);

    if (!delegation.isActive) {
      return { label: 'Cancelada', color: 'text-gray-500 bg-gray-100' };
    }

    if (isBefore(now, startDate)) {
      return { label: 'Programada', color: 'text-blue-600 bg-blue-50' };
    }

    if (isAfter(now, endDate)) {
      return { label: 'Expirada', color: 'text-orange-600 bg-orange-50' };
    }

    return { label: 'Activa', color: 'text-green-600 bg-green-50' };
  };

  const myDelegations = delegations.filter((d) => d.delegator.id === user?.id);
  const receivedDelegations = delegations.filter((d) => d.delegate.id === user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Delegaciones de Aprobación
          </h3>
          <p className="text-sm text-gray-500">
            Delega tus aprobaciones cuando no estés disponible
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Delegación
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <>
          {/* My Delegations */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Mis Delegaciones (las que yo creé)
            </h4>
            {myDelegations.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                No tienes delegaciones activas
              </p>
            ) : (
              <div className="space-y-2">
                {myDelegations.map((delegation) => {
                  const status = getDelegationStatus(delegation);

                  return (
                    <div
                      key={delegation.id}
                      className="flex items-center justify-between p-4 bg-white border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Delegado a: {delegation.delegate.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(delegation.startDate), 'dd/MM/yyyy')} -{' '}
                            {format(new Date(delegation.endDate), 'dd/MM/yyyy')}
                          </div>
                          {delegation.reason && (
                            <p className="text-sm text-gray-500 mt-1">
                              Motivo: {delegation.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {delegation.isActive && (
                          <button
                            onClick={() => cancelDelegation(delegation.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Cancelar delegación"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Received Delegations */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Delegaciones Recibidas
            </h4>
            {receivedDelegations.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                No tienes delegaciones recibidas
              </p>
            ) : (
              <div className="space-y-2">
                {receivedDelegations.map((delegation) => {
                  const status = getDelegationStatus(delegation);

                  return (
                    <div
                      key={delegation.id}
                      className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            De: {delegation.delegator.name}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(delegation.startDate), 'dd/MM/yyyy')} -{' '}
                            {format(new Date(delegation.endDate), 'dd/MM/yyyy')}
                          </div>
                          {delegation.reason && (
                            <p className="text-sm text-gray-600 mt-1">
                              Motivo: {delegation.reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Delegation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Nueva Delegación</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delegar a *
                </label>
                <select
                  value={formData.delegateId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, delegateId: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar usuario...</option>
                  {availableDelegates.map((delegate) => (
                    <option key={delegate.id} value={delegate.id}>
                      {delegate.name} ({delegate.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desde *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hasta *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (opcional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Ej: Vacaciones, licencia médica..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button onClick={createDelegation}>Crear Delegación</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
