'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import {
  Bell,
  Mail,
  Monitor,
  Save,
  Loader2,
  CheckCircle,
  ShoppingCart,
  FileText,
  Building2,
  DollarSign,
  Users,
} from 'lucide-react';

interface NotificationPreference {
  id: string;
  eventType: string;
  emailEnabled: boolean;
  portalEnabled: boolean;
}

const eventTypeLabels: Record<string, { label: string; description: string }> = {
  // Requerimientos
  REQ_SUBMITTED: {
    label: 'Requerimiento enviado',
    description: 'Cuando se envía un nuevo requerimiento para aprobación',
  },
  REQ_APPROVED: {
    label: 'Requerimiento aprobado',
    description: 'Cuando tu requerimiento es aprobado',
  },
  REQ_REJECTED: {
    label: 'Requerimiento rechazado',
    description: 'Cuando tu requerimiento es rechazado',
  },
  REQ_NEEDS_APPROVAL: {
    label: 'Aprobación pendiente',
    description: 'Cuando tienes un requerimiento pendiente de aprobación',
  },
  // Órdenes de compra
  OC_GENERATED: {
    label: 'OC generada',
    description: 'Cuando se genera una orden de compra',
  },
  OC_NEEDS_APPROVAL: {
    label: 'OC pendiente de aprobación',
    description: 'Cuando una OC requiere tu aprobación',
  },
  OC_APPROVED: {
    label: 'OC aprobada',
    description: 'Cuando una OC es aprobada',
  },
  OC_REJECTED: {
    label: 'OC rechazada',
    description: 'Cuando una OC es rechazada',
  },
  // Recepciones
  RECEPTION_REGISTERED: {
    label: 'Recepción registrada',
    description: 'Cuando se registra una recepción de mercadería',
  },
  RECEPTION_COMPLETE: {
    label: 'Recepción completa',
    description: 'Cuando una recepción se completa',
  },
  // Delegaciones
  DELEGATION_RECEIVED: {
    label: 'Delegación recibida',
    description: 'Cuando recibes una delegación de aprobación',
  },
  DELEGATION_EXPIRED: {
    label: 'Delegación expirada',
    description: 'Cuando una delegación expira',
  },
  // Documentos
  DOC_UPLOADED: {
    label: 'Documento recibido',
    description: 'Cuando se recibe un nuevo documento',
  },
  DOC_APPROVED: {
    label: 'Documento aprobado',
    description: 'Cuando tu documento es aprobado',
  },
  DOC_REJECTED: {
    label: 'Documento rechazado',
    description: 'Cuando tu documento es rechazado',
  },
  // Proveedores
  SUPPLIER_INVITED: {
    label: 'Invitación de proveedor',
    description: 'Cuando eres invitado como proveedor',
  },
  SUPPLIER_APPROVED: {
    label: 'Proveedor aprobado',
    description: 'Cuando tu registro es aprobado',
  },
  SUPPLIER_REJECTED: {
    label: 'Proveedor rechazado',
    description: 'Cuando tu registro es rechazado',
  },
  // Pagos
  PAYMENT_ISSUED: {
    label: 'Pago emitido',
    description: 'Cuando se emite un pago a tu favor',
  },
  PAYMENT_COMPLETED: {
    label: 'Pago completado',
    description: 'Cuando un pago es procesado',
  },
  PAYMENT_SCHEDULED: {
    label: 'Pago programado',
    description: 'Cuando tienes un pago programado próximo',
  },
};

const categoryIcons: Record<string, React.ReactNode> = {
  requerimientos: <ShoppingCart className="w-5 h-5" />,
  ordenesCompra: <FileText className="w-5 h-5" />,
  recepciones: <Building2 className="w-5 h-5" />,
  delegaciones: <Users className="w-5 h-5" />,
  documentos: <FileText className="w-5 h-5" />,
  proveedores: <Building2 className="w-5 h-5" />,
  pagos: <DollarSign className="w-5 h-5" />,
};

const categoryLabels: Record<string, string> = {
  requerimientos: 'Requerimientos de Compra',
  ordenesCompra: 'Órdenes de Compra',
  recepciones: 'Recepciones',
  delegaciones: 'Delegaciones',
  documentos: 'Documentos',
  proveedores: 'Proveedores',
  pagos: 'Pagos',
};

export default function NotificacionesConfigPage() {
  const { tenant } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [changedPreferences, setChangedPreferences] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tenant?.id) {
      fetchPreferences();
    }
  }, [tenant?.id]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('hub_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/preferences`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-Id': tenant?.id || '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (eventType: string, field: 'emailEnabled' | 'portalEnabled') => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.eventType === eventType ? { ...p, [field]: !p[field] } : p
      )
    );
    setChangedPreferences((prev) => new Set(prev).add(eventType));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('hub_token');

      const prefsToUpdate = preferences.filter((p) =>
        changedPreferences.has(p.eventType)
      );

      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/preferences/bulk`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Tenant-Id': tenant?.id || '',
          },
          body: JSON.stringify({
            preferences: prefsToUpdate.map((p) => ({
              eventType: p.eventType,
              emailEnabled: p.emailEnabled,
              inAppEnabled: p.portalEnabled,
            })),
          }),
        }
      );

      setChangedPreferences(new Set());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const groupByCategory = () => {
    const grouped: Record<string, NotificationPreference[]> = {
      requerimientos: [],
      ordenesCompra: [],
      recepciones: [],
      delegaciones: [],
      documentos: [],
      proveedores: [],
      pagos: [],
    };

    preferences.forEach((pref) => {
      if (pref.eventType.startsWith('REQ_')) {
        grouped.requerimientos.push(pref);
      } else if (pref.eventType.startsWith('OC_')) {
        grouped.ordenesCompra.push(pref);
      } else if (pref.eventType.startsWith('RECEPTION_')) {
        grouped.recepciones.push(pref);
      } else if (pref.eventType.startsWith('DELEGATION_')) {
        grouped.delegaciones.push(pref);
      } else if (pref.eventType.startsWith('DOC_')) {
        grouped.documentos.push(pref);
      } else if (pref.eventType.startsWith('SUPPLIER_')) {
        grouped.proveedores.push(pref);
      } else if (pref.eventType.startsWith('PAYMENT_')) {
        grouped.pagos.push(pref);
      }
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const grouped = groupByCategory();

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Preferencias de Notificaciones"
        subtitle="Configura cómo y cuándo recibir notificaciones"
        action={
          <Button
            onClick={handleSave}
            disabled={saving || changedPreferences.size === 0}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Guardado
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar cambios
              </>
            )}
          </Button>
        }
      />

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Monitor className="w-4 h-4" />
            <span>Portal</span>
          </div>
        </div>
      </div>

      {/* Preferences by Category */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, prefs]) => {
          if (prefs.length === 0) return null;

          return (
            <div
              key={category}
              className="bg-white rounded-lg shadow-sm border border-border overflow-hidden"
            >
              {/* Category Header */}
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-border">
                <div className="text-primary">{categoryIcons[category]}</div>
                <h3 className="font-semibold text-gray-900">
                  {categoryLabels[category]}
                </h3>
              </div>

              {/* Preferences List */}
              <div className="divide-y divide-gray-100">
                {prefs.map((pref) => {
                  const info = eventTypeLabels[pref.eventType] || {
                    label: pref.eventType,
                    description: '',
                  };

                  return (
                    <div
                      key={pref.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{info.label}</p>
                        <p className="text-sm text-gray-500">{info.description}</p>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Email Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.emailEnabled}
                            onChange={() => handleToggle(pref.eventType, 'emailEnabled')}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Mail className="w-4 h-4 text-gray-400" />
                        </label>

                        {/* Portal Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pref.portalEnabled}
                            onChange={() => handleToggle(pref.eventType, 'portalEnabled')}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Monitor className="w-4 h-4 text-gray-400" />
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
    </div>
  );
}
