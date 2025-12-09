'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Save,
  RefreshCw,
  Eye,
  Edit3,
  X,
  Check,
  AlertTriangle,
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface EmailTemplate {
  id: string;
  eventType: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  isActive: boolean;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Configuración de tipos de evento
const EVENT_TYPE_CONFIG: Record<string, { label: string; category: string; description: string }> = {
  // Requerimientos
  REQ_SUBMITTED: {
    label: 'Requerimiento Enviado',
    category: 'Requerimientos',
    description: 'Se envía cuando un usuario crea un nuevo requerimiento',
  },
  REQ_APPROVED: {
    label: 'Requerimiento Aprobado',
    category: 'Requerimientos',
    description: 'Se envía al solicitante cuando su requerimiento es aprobado',
  },
  REQ_REJECTED: {
    label: 'Requerimiento Rechazado',
    category: 'Requerimientos',
    description: 'Se envía al solicitante cuando su requerimiento es rechazado',
  },
  REQ_NEEDS_APPROVAL: {
    label: 'Pendiente de Aprobación',
    category: 'Requerimientos',
    description: 'Se envía al aprobador cuando tiene un requerimiento pendiente',
  },
  // Documentos
  DOC_UPLOADED: {
    label: 'Documento Subido',
    category: 'Documentos',
    description: 'Se envía cuando se sube un nuevo documento',
  },
  DOC_APPROVED: {
    label: 'Documento Aprobado',
    category: 'Documentos',
    description: 'Se envía cuando un documento es aprobado',
  },
  DOC_REJECTED: {
    label: 'Documento Rechazado',
    category: 'Documentos',
    description: 'Se envía cuando un documento es rechazado',
  },
  // Proveedores
  SUPPLIER_INVITED: {
    label: 'Invitación a Proveedor',
    category: 'Proveedores',
    description: 'Se envía cuando se invita a un nuevo proveedor al portal',
  },
  SUPPLIER_APPROVED: {
    label: 'Proveedor Aprobado',
    category: 'Proveedores',
    description: 'Se envía cuando el registro del proveedor es aprobado',
  },
  SUPPLIER_REJECTED: {
    label: 'Proveedor Rechazado',
    category: 'Proveedores',
    description: 'Se envía cuando el registro del proveedor es rechazado',
  },
  SUPPLIER_PENDING_APPROVAL: {
    label: 'Proveedor Pendiente',
    category: 'Proveedores',
    description: 'Se envía al admin cuando hay un proveedor pendiente de aprobación',
  },
  // Pagos
  PAYMENT_ISSUED: {
    label: 'Pago Emitido',
    category: 'Pagos',
    description: 'Se envía cuando se emite un nuevo pago',
  },
  PAYMENT_COMPLETED: {
    label: 'Pago Completado',
    category: 'Pagos',
    description: 'Se envía cuando un pago es procesado',
  },
  PAYMENT_SCHEDULED: {
    label: 'Pago Programado',
    category: 'Pagos',
    description: 'Se envía para notificar un pago próximo',
  },
  // Cotizaciones (RFQ)
  RFQ_INVITATION: {
    label: 'Invitación a Cotizar',
    category: 'Cotizaciones',
    description: 'Se envía a proveedores cuando son invitados a cotizar',
  },
  RFQ_AWARDED: {
    label: 'RFQ Adjudicada',
    category: 'Cotizaciones',
    description: 'Se envía al proveedor ganador de una licitación',
  },
  RFQ_NOT_AWARDED: {
    label: 'RFQ No Adjudicada',
    category: 'Cotizaciones',
    description: 'Se envía a los proveedores no ganadores',
  },
  RFQ_DEADLINE_REMINDER: {
    label: 'Recordatorio de Cierre',
    category: 'Cotizaciones',
    description: 'Se envía antes del cierre de una cotización',
  },
  QUOTATION_RECEIVED: {
    label: 'Cotización Recibida',
    category: 'Cotizaciones',
    description: 'Se envía al comprador cuando recibe una cotización',
  },
};

const CATEGORIES = ['Requerimientos', 'Documentos', 'Proveedores', 'Pagos', 'Cotizaciones'];

export default function TemplatesPage() {
  const { token, tenant } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedTemplate, setEditedTemplate] = useState<Partial<EmailTemplate>>({});
  const [isSaving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(CATEGORIES);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (token) {
      fetchTemplates();
    }
  }, [token]);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/notifications/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '',
        },
      });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Error al cargar templates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      isActive: template.isActive,
    });
    setShowPreview(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editedTemplate),
      });

      if (!res.ok) throw new Error('Error al guardar');

      const updated = await res.json();
      setTemplates(templates.map(t => t.id === updated.id ? updated : t));
      setSelectedTemplate(updated);
      toast.success('Template guardado correctamente');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar template');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail || !selectedTemplate) return;

    setSendingTest(true);
    try {
      const res = await fetch(`${API_URL}/api/notifications/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: testEmail,
          templateId: selectedTemplate.id,
        }),
      });

      if (!res.ok) throw new Error('Error al enviar');

      toast.success(`Email de prueba enviado a ${testEmail}`);
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test:', error);
      toast.error('Error al enviar email de prueba');
    } finally {
      setSendingTest(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getTemplatesByCategory = (category: string) => {
    return templates.filter(t => {
      const config = EVENT_TYPE_CONFIG[t.eventType];
      return config?.category === category;
    });
  };

  const getEventConfig = (eventType: string) => {
    return EVENT_TYPE_CONFIG[eventType] || {
      label: eventType,
      category: 'Otros',
      description: '',
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Mail className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Templates de Email</h1>
            <p className="text-text-secondary">
              Personaliza los emails que se envían desde el sistema
            </p>
          </div>
        </div>

        <button
          onClick={fetchTemplates}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Lista de templates */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-500">Cargando templates...</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {CATEGORIES.map(category => {
                const categoryTemplates = getTemplatesByCategory(category);
                const isExpanded = expandedCategories.includes(category);

                if (categoryTemplates.length === 0) return null;

                return (
                  <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-900">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {categoryTemplates.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100">
                        {categoryTemplates.map(template => {
                          const config = getEventConfig(template.eventType);
                          const isSelected = selectedTemplate?.id === template.id;

                          return (
                            <button
                              key={template.id}
                              onClick={() => handleSelectTemplate(template)}
                              className={`w-full px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors ${
                                isSelected
                                  ? 'bg-purple-50 border-l-4 border-l-purple-500'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm ${isSelected ? 'text-purple-700 font-medium' : 'text-gray-700'}`}>
                                  {config.label}
                                </span>
                                {!template.isActive && (
                                  <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                    Inactivo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {template.subject}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main content - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedTemplate ? (
            <>
              {/* Template header */}
              <div className="p-6 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {getEventConfig(selectedTemplate.eventType).label}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {getEventConfig(selectedTemplate.eventType).description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editedTemplate.isActive ?? selectedTemplate.isActive}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, isActive: e.target.checked })}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Activo</span>
                    </label>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                        showPreview
                          ? 'bg-purple-100 text-purple-700'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      {showPreview ? 'Editor' : 'Vista Previa'}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Guardar
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor / Preview */}
              <div className="flex-1 overflow-y-auto p-6">
                {showPreview ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>Asunto:</strong> {editedTemplate.subject || selectedTemplate.subject}
                      </p>
                    </div>
                    <div
                      className="p-4"
                      dangerouslySetInnerHTML={{
                        __html: editedTemplate.bodyHtml || selectedTemplate.bodyHtml,
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Asunto del Email
                      </label>
                      <input
                        type="text"
                        value={editedTemplate.subject ?? selectedTemplate.subject}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Asunto del email..."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Variables disponibles: {'{{numero}}'}, {'{{titulo}}'}, {'{{proveedor}}'}, {'{{actionUrl}}'}
                      </p>
                    </div>

                    {/* Body HTML */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contenido HTML
                      </label>
                      <textarea
                        value={editedTemplate.bodyHtml ?? selectedTemplate.bodyHtml}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, bodyHtml: e.target.value })}
                        rows={20}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                        placeholder="HTML del email..."
                      />
                    </div>

                    {/* Variables info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Variables Disponibles</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <code className="bg-blue-100 px-2 py-1 rounded">{'{{numero}}'}</code>
                        <code className="bg-blue-100 px-2 py-1 rounded">{'{{titulo}}'}</code>
                        <code className="bg-blue-100 px-2 py-1 rounded">{'{{proveedor}}'}</code>
                        <code className="bg-blue-100 px-2 py-1 rounded">{'{{solicitante}}'}</code>
                        <code className="bg-blue-100 px-2 py-1 rounded">{'{{aprobador}}'}</code>
                        <code className="bg-blue-100 px-2 py-1 rounded">{'{{comentario}}'}</code>
                        <code className="bg-blue-100 px-2 py-1 rounded">{'{{actionUrl}}'}</code>
                        <code className="bg-blue-100 px-2 py-1 rounded">{'{{montoTotal}}'}</code>
                      </div>
                    </div>

                    {/* Test email */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Enviar Email de Prueba</h4>
                      <div className="flex gap-3">
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="email@ejemplo.com"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                        <button
                          onClick={handleSendTest}
                          disabled={sendingTest || !testEmail}
                          className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                          {sendingTest ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Enviar Prueba
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Selecciona un template para editarlo</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
