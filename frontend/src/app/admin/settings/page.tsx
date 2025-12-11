'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Mail, Save, CheckCircle, Settings, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApiClient } from '@/hooks/useApiClient';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreference {
  id: string;
  eventType: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; description: string; category: string }> = {
  REQ_SUBMITTED: {
    label: 'Requerimiento Enviado',
    description: 'Cuando se envía un nuevo requerimiento de compra',
    category: 'Requerimientos'
  },
  REQ_APPROVED: {
    label: 'Requerimiento Aprobado',
    description: 'Cuando tu requerimiento es aprobado',
    category: 'Requerimientos'
  },
  REQ_REJECTED: {
    label: 'Requerimiento Rechazado',
    description: 'Cuando tu requerimiento es rechazado',
    category: 'Requerimientos'
  },
  REQ_NEEDS_APPROVAL: {
    label: 'Aprobación Requerida',
    description: 'Cuando tienes un requerimiento pendiente de aprobar',
    category: 'Requerimientos'
  },
  OC_GENERATED: {
    label: 'OC Generada',
    description: 'Cuando se genera una nueva orden de compra',
    category: 'Órdenes de Compra'
  },
  OC_NEEDS_APPROVAL: {
    label: 'Aprobación de OC Requerida',
    description: 'Cuando tienes una OC pendiente de aprobar',
    category: 'Órdenes de Compra'
  },
  OC_APPROVED: {
    label: 'OC Aprobada',
    description: 'Cuando una orden de compra es aprobada',
    category: 'Órdenes de Compra'
  },
  OC_REJECTED: {
    label: 'OC Rechazada',
    description: 'Cuando una orden de compra es rechazada',
    category: 'Órdenes de Compra'
  },
  RECEPTION_REGISTERED: {
    label: 'Recepción Registrada',
    description: 'Cuando se registra una recepción de mercadería',
    category: 'Recepciones'
  },
  RECEPTION_COMPLETE: {
    label: 'Recepción Completa',
    description: 'Cuando se completa la recepción de una OC',
    category: 'Recepciones'
  },
  DELEGATION_RECEIVED: {
    label: 'Delegación Recibida',
    description: 'Cuando te delegan aprobaciones',
    category: 'Delegaciones'
  },
  DELEGATION_EXPIRED: {
    label: 'Delegación Expirada',
    description: 'Cuando una delegación ha terminado',
    category: 'Delegaciones'
  },
};

const CATEGORIES = ['Requerimientos', 'Órdenes de Compra', 'Recepciones', 'Delegaciones'];

export default function SettingsPage() {
  const { tenant: currentTenant } = useAuth();
  const { get, put, post } = useApiClient();

  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);
      const response = await get('/api/notifications/preferences', { 'X-Tenant-Id': currentTenant.id });
      setPreferences(response as NotificationPreference[]);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Error cargando preferencias');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, get]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreference = async (eventType: string, field: 'emailEnabled' | 'inAppEnabled', value: boolean) => {
    if (!currentTenant?.id) return;

    // Actualizar estado local
    setPreferences(prev =>
      prev.map(p =>
        p.eventType === eventType ? { ...p, [field]: value } : p
      )
    );

    try {
      await put(`/api/notifications/preferences/${eventType}`, {
        emailEnabled: field === 'emailEnabled' ? value : preferences.find(p => p.eventType === eventType)?.emailEnabled,
        inAppEnabled: field === 'inAppEnabled' ? value : preferences.find(p => p.eventType === eventType)?.inAppEnabled,
      }, { 'X-Tenant-Id': currentTenant.id });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Error guardando preferencia');
      // Revertir cambio
      loadPreferences();
    }
  };

  const saveAllPreferences = async () => {
    if (!currentTenant?.id) return;

    setSaving(true);
    try {
      await put('/api/notifications/preferences/bulk', {
        preferences: preferences.map(p => ({
          eventType: p.eventType,
          emailEnabled: p.emailEnabled,
          inAppEnabled: p.inAppEnabled,
        }))
      }, { 'X-Tenant-Id': currentTenant.id });
      toast.success('Preferencias guardadas');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Error guardando preferencias');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Ingresa un email');
      return;
    }

    setSendingTest(true);
    try {
      await post('/api/notifications/test-email', { email: testEmail });
      toast.success('Email de prueba enviado');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Error enviando email de prueba');
    } finally {
      setSendingTest(false);
    }
  };

  const enableAllInCategory = (category: string) => {
    const categoryEvents = Object.entries(EVENT_TYPE_LABELS)
      .filter(([, info]) => info.category === category)
      .map(([eventType]) => eventType);

    setPreferences(prev =>
      prev.map(p =>
        categoryEvents.includes(p.eventType)
          ? { ...p, emailEnabled: true, inAppEnabled: true }
          : p
      )
    );
  };

  const disableAllInCategory = (category: string) => {
    const categoryEvents = Object.entries(EVENT_TYPE_LABELS)
      .filter(([, info]) => info.category === category)
      .map(([eventType]) => eventType);

    setPreferences(prev =>
      prev.map(p =>
        categoryEvents.includes(p.eventType)
          ? { ...p, emailEnabled: false, inAppEnabled: false }
          : p
      )
    );
  };

  const getPreferencesByCategory = (category: string) => {
    const categoryEvents = Object.entries(EVENT_TYPE_LABELS)
      .filter(([, info]) => info.category === category)
      .map(([eventType]) => eventType);

    return preferences.filter(p => categoryEvents.includes(p.eventType));
  };

  return (
    <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-6 w-6" />
              Configuración de Notificaciones
            </h1>
            <p className="text-gray-600 mt-1">
              Configura qué notificaciones deseas recibir y cómo
            </p>
          </div>
          <Button onClick={saveAllPreferences} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>

        {/* Test Email Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 flex items-center gap-2 mb-3">
            <TestTube className="h-5 w-5" />
            Probar Configuración de Email
          </h3>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="tu@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button onClick={sendTestEmail} disabled={sendingTest} variant="secondary">
              <Mail className="h-4 w-4 mr-2" />
              {sendingTest ? 'Enviando...' : 'Enviar Email de Prueba'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando preferencias...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map((category) => {
              const categoryPrefs = getPreferencesByCategory(category);
              if (categoryPrefs.length === 0) return null;

              return (
                <div key={category} className="bg-white rounded-lg shadow border">
                  <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => enableAllInCategory(category)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Habilitar todo
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => disableAllInCategory(category)}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Deshabilitar todo
                      </button>
                    </div>
                  </div>

                  <div className="divide-y">
                    {categoryPrefs.map((pref) => {
                      const info = EVENT_TYPE_LABELS[pref.eventType];
                      if (!info) return null;

                      return (
                        <div key={pref.eventType} className="px-6 py-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{info.label}</p>
                            <p className="text-sm text-gray-500">{info.description}</p>
                          </div>
                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pref.emailEnabled}
                                onChange={(e) => updatePreference(pref.eventType, 'emailEnabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">Email</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pref.inAppEnabled}
                                onChange={(e) => updatePreference(pref.eventType, 'inAppEnabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <Bell className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">En App</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
