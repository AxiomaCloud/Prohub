'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  User,
  CreditCard,
  FileText,
  Bell,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

// Tipos
interface SupplierData {
  id: string;
  nombre: string;
  nombreFantasia: string;
  cuit: string;
  condicionFiscal: string;
  tipoFactura: string;
  direccion: string;
  numero: string;
  piso: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  telefono: string;
  whatsapp: string;
  email: string;
  emailFacturacion: string;
  contactoNombre: string;
  contactoCargo: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  cbu: string;
  alias: string;
  titularCuenta: string;
  status: string;
}

interface UploadedDoc {
  id: string;
  tipo: string;
  nombre: string;
  url: string;
}

const STEPS = [
  { id: 'bienvenida', title: 'Bienvenida', icon: CheckCircle },
  { id: 'empresa', title: 'Datos de Empresa', icon: Building2 },
  { id: 'contacto', title: 'Contacto', icon: User },
  { id: 'bancarios', title: 'Datos Bancarios', icon: CreditCard },
  { id: 'documentos', title: 'Documentos', icon: FileText },
  { id: 'notificaciones', title: 'Notificaciones', icon: Bell },
  { id: 'confirmacion', title: 'Confirmacion', icon: CheckCircle },
];

const CONDICIONES_FISCALES = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' },
];

const TIPOS_FACTURA = [
  { value: 'A', label: 'Factura A' },
  { value: 'B', label: 'Factura B' },
  { value: 'C', label: 'Factura C' },
];

const TIPOS_CUENTA = [
  { value: 'CUENTA_CORRIENTE', label: 'Cuenta Corriente' },
  { value: 'CAJA_AHORRO', label: 'Caja de Ahorro' },
];

const TIPOS_DOCUMENTO = [
  { value: 'CONSTANCIA_CUIT', label: 'Constancia de CUIT/CUIL' },
  { value: 'CONSTANCIA_IIBB', label: 'Constancia de Ingresos Brutos' },
  { value: 'CONSTANCIA_CBU', label: 'Constancia de CBU' },
  { value: 'CERTIFICADO_FISCAL', label: 'Certificado Fiscal' },
  { value: 'OTRO', label: 'Otro documento' },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const supplierId = searchParams.get('id');

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Empresa
    nombre: '',
    nombreFantasia: '',
    cuit: '',
    condicionFiscal: '',
    tipoFactura: '',
    direccion: '',
    numero: '',
    piso: '',
    localidad: '',
    provincia: '',
    codigoPostal: '',
    // Contacto
    telefono: '',
    whatsapp: '',
    email: '',
    emailFacturacion: '',
    contactoNombre: '',
    contactoCargo: '',
    // Bancarios
    banco: '',
    tipoCuenta: '',
    numeroCuenta: '',
    cbu: '',
    alias: '',
    titularCuenta: '',
    // Notificaciones
    notifEmail: true,
    notifWhatsapp: false,
    notifDocStatus: true,
    notifPagos: true,
    notifComentarios: true,
    notifOC: true,
  });

  // Cargar datos del proveedor
  useEffect(() => {
    const loadSupplier = async () => {
      if (!supplierId) {
        setError('No se proporcionó ID de proveedor');
        setLoading(false);
        return;
      }

      try {
        const authToken = localStorage.getItem('token') || token;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${supplierId}`,
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          }
        );

        if (response.ok) {
          const data = await response.json();
          setSupplier(data);
          // Pre-llenar formulario con datos existentes
          setFormData(prev => ({
            ...prev,
            nombre: data.nombre || '',
            nombreFantasia: data.nombreFantasia || '',
            cuit: data.cuit || '',
            condicionFiscal: data.condicionFiscal || '',
            tipoFactura: data.tipoFactura || '',
            direccion: data.direccion || '',
            numero: data.numero || '',
            piso: data.piso || '',
            localidad: data.localidad || '',
            provincia: data.provincia || '',
            codigoPostal: data.codigoPostal || '',
            telefono: data.telefono || '',
            whatsapp: data.whatsapp || '',
            email: data.email || '',
            emailFacturacion: data.emailFacturacion || '',
            contactoNombre: data.contactoNombre || '',
            contactoCargo: data.contactoCargo || '',
            banco: data.banco || '',
            tipoCuenta: data.tipoCuenta || '',
            numeroCuenta: data.numeroCuenta || '',
            cbu: data.cbu || '',
            alias: data.alias || '',
            titularCuenta: data.titularCuenta || '',
          }));
          // Cargar documentos existentes
          if (data.documentos) {
            setUploadedDocs(data.documentos.map((d: any) => ({
              id: d.id,
              tipo: d.tipo,
              nombre: d.nombre,
              url: d.url,
            })));
          }
        } else {
          setError('No se pudo cargar la información del proveedor');
        }
      } catch (err) {
        console.error('Error loading supplier:', err);
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    loadSupplier();
  }, [supplierId, token]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveStep = async () => {
    setSaving(true);
    try {
      const authToken = localStorage.getItem('token') || token;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${supplierId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        toast.success('Datos guardados');
        handleNext();
      } else {
        toast.error('Error al guardar');
      }
    } catch (err) {
      console.error('Error saving:', err);
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, tipo: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('tipo', tipo);

      const authToken = localStorage.getItem('token') || token;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${supplierId}/documents`,
        {
          method: 'POST',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          body: formDataUpload,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUploadedDocs(prev => [...prev, {
          id: data.id,
          tipo: data.tipo,
          nombre: data.nombre,
          url: data.url,
        }]);
        toast.success('Documento subido');
      } else {
        toast.error('Error al subir documento');
      }
    } catch (err) {
      console.error('Error uploading:', err);
      toast.error('Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const authToken = localStorage.getItem('token') || token;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${supplierId}/documents/${docId}`,
        {
          method: 'DELETE',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }
      );

      if (response.ok) {
        setUploadedDocs(prev => prev.filter(d => d.id !== docId));
        toast.success('Documento eliminado');
      }
    } catch (err) {
      console.error('Error deleting doc:', err);
    }
  };

  const handleCompleteOnboarding = async () => {
    setSaving(true);
    try {
      const authToken = localStorage.getItem('token') || token;

      // Primero guardar datos finales
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${supplierId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(formData),
        }
      );

      // Luego marcar onboarding como completado
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${supplierId}/complete-onboarding`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        }
      );

      if (response.ok) {
        toast.success('Onboarding completado exitosamente');
        // Redirigir al portal o login
        router.push('/auth/login?onboarding=complete');
      } else {
        const err = await response.json();
        toast.error(err.error || 'Error al completar onboarding');
      }
    } catch (err) {
      console.error('Error completing onboarding:', err);
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-palette-purple mx-auto mb-4" />
          <p className="text-text-secondary">Cargando información...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-text-primary mb-2">Error</h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <Button onClick={() => router.push('/')}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const currentStepData = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Building2 className="w-10 h-10 text-palette-purple" />
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                Registro de Proveedor
              </h1>
              <p className="text-sm text-text-secondary">
                Complete sus datos para finalizar el registro
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-palette-purple text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-12 h-1 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-text-primary">
              {currentStepData.title}
            </p>
            <p className="text-xs text-text-secondary">
              Paso {currentStep + 1} de {STEPS.length}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-border p-6">
          {/* Step: Bienvenida */}
          {currentStep === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                Bienvenido, {supplier?.nombre}
              </h2>
              <p className="text-text-secondary max-w-lg mx-auto mb-8">
                Ha sido invitado a registrarse como proveedor. Complete los siguientes
                pasos para finalizar su registro y comenzar a operar.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800">
                  <strong>CUIT:</strong> {supplier?.cuit}
                </p>
              </div>
            </div>
          )}

          {/* Step: Datos de Empresa */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Datos de la Empresa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Razon Social *
                  </label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Nombre de Fantasia
                  </label>
                  <Input
                    value={formData.nombreFantasia}
                    onChange={(e) => handleChange('nombreFantasia', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    CUIT *
                  </label>
                  <Input
                    value={formData.cuit}
                    onChange={(e) => {
                      // Formatear CUIT: XX-XXXXXXXX-X
                      const value = e.target.value.replace(/\D/g, '');
                      let formatted = value;
                      if (value.length > 2) {
                        formatted = value.slice(0, 2) + '-' + value.slice(2);
                      }
                      if (value.length > 10) {
                        formatted = value.slice(0, 2) + '-' + value.slice(2, 10) + '-' + value.slice(10, 11);
                      }
                      handleChange('cuit', formatted);
                    }}
                    placeholder="XX-XXXXXXXX-X"
                    maxLength={13}
                    disabled={!!supplier?.cuit}
                    className={supplier?.cuit ? 'bg-gray-100' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Condicion Fiscal *
                  </label>
                  <select
                    value={formData.condicionFiscal}
                    onChange={(e) => handleChange('condicionFiscal', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    {CONDICIONES_FISCALES.map((cf) => (
                      <option key={cf.value} value={cf.value}>
                        {cf.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Tipo de Factura
                  </label>
                  <select
                    value={formData.tipoFactura}
                    onChange={(e) => handleChange('tipoFactura', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_FACTURA.map((tf) => (
                      <option key={tf.value} value={tf.value}>
                        {tf.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 className="text-md font-medium text-text-primary mt-6 mb-3">
                Domicilio Fiscal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Direccion
                  </label>
                  <Input
                    value={formData.direccion}
                    onChange={(e) => handleChange('direccion', e.target.value)}
                    placeholder="Calle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Numero
                  </label>
                  <Input
                    value={formData.numero}
                    onChange={(e) => handleChange('numero', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Piso/Depto
                  </label>
                  <Input
                    value={formData.piso}
                    onChange={(e) => handleChange('piso', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Localidad
                  </label>
                  <Input
                    value={formData.localidad}
                    onChange={(e) => handleChange('localidad', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Provincia
                  </label>
                  <Input
                    value={formData.provincia}
                    onChange={(e) => handleChange('provincia', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Contacto */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Datos de Contacto
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Email Principal *
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Email Facturacion
                  </label>
                  <Input
                    type="email"
                    value={formData.emailFacturacion}
                    onChange={(e) => handleChange('emailFacturacion', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Telefono
                  </label>
                  <Input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handleChange('telefono', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    WhatsApp
                  </label>
                  <Input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Nombre del Contacto
                  </label>
                  <Input
                    value={formData.contactoNombre}
                    onChange={(e) => handleChange('contactoNombre', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Cargo del Contacto
                  </label>
                  <Input
                    value={formData.contactoCargo}
                    onChange={(e) => handleChange('contactoCargo', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Datos Bancarios */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Datos Bancarios
              </h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  Estos datos se utilizaran para procesar sus pagos. Asegurese de que sean correctos.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Banco
                  </label>
                  <Input
                    value={formData.banco}
                    onChange={(e) => handleChange('banco', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Tipo de Cuenta
                  </label>
                  <select
                    value={formData.tipoCuenta}
                    onChange={(e) => handleChange('tipoCuenta', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_CUENTA.map((tc) => (
                      <option key={tc.value} value={tc.value}>
                        {tc.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Numero de Cuenta
                  </label>
                  <Input
                    value={formData.numeroCuenta}
                    onChange={(e) => handleChange('numeroCuenta', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    CBU *
                  </label>
                  <Input
                    value={formData.cbu}
                    onChange={(e) => handleChange('cbu', e.target.value)}
                    maxLength={22}
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Alias CBU
                  </label>
                  <Input
                    value={formData.alias}
                    onChange={(e) => handleChange('alias', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Titular de la Cuenta
                  </label>
                  <Input
                    value={formData.titularCuenta}
                    onChange={(e) => handleChange('titularCuenta', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Documentos */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Documentacion
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                Adjunte los documentos requeridos para validar su registro.
              </p>

              {/* Uploaded docs */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-2 mb-6">
                  <h3 className="text-sm font-medium text-text-primary">
                    Documentos cargados
                  </h3>
                  {uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-4 py-2 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {doc.nombre}
                          </p>
                          <p className="text-xs text-text-secondary">{doc.tipo}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TIPOS_DOCUMENTO.map((tipo) => {
                  const hasDoc = uploadedDocs.some((d) => d.tipo === tipo.value);
                  return (
                    <label
                      key={tipo.value}
                      className={`flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
                        hasDoc
                          ? 'border-green-300 bg-green-50'
                          : 'border-border hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleUploadDoc(e, tipo.value)}
                        className="hidden"
                        disabled={uploading}
                      />
                      {hasDoc ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Upload className="w-5 h-5 text-text-secondary" />
                      )}
                      <span className="text-sm">{tipo.label}</span>
                    </label>
                  );
                })}
              </div>

              {uploading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-palette-purple mr-2" />
                  <span className="text-sm text-text-secondary">Subiendo...</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Notificaciones */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                Preferencias de Notificaciones
              </h2>
              <p className="text-sm text-text-secondary mb-6">
                Configure como desea recibir las notificaciones.
              </p>

              <div className="space-y-4">
                {[
                  { key: 'notifEmail', label: 'Recibir notificaciones por email' },
                  { key: 'notifWhatsapp', label: 'Recibir notificaciones por WhatsApp' },
                  { key: 'notifDocStatus', label: 'Cambios en estado de documentos' },
                  { key: 'notifPagos', label: 'Notificaciones de pagos' },
                  { key: 'notifComentarios', label: 'Comentarios en documentos' },
                  { key: 'notifOC', label: 'Nuevas ordenes de compra' },
                ].map((notif) => (
                  <label
                    key={notif.key}
                    className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData[notif.key as keyof typeof formData] as boolean}
                      onChange={(e) => handleChange(notif.key, e.target.checked)}
                      className="w-5 h-5 rounded border-border text-palette-purple focus:ring-palette-purple"
                    />
                    <span className="text-sm text-text-primary">{notif.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step: Confirmacion */}
          {currentStep === 6 && (
            <div className="text-center py-8">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-text-primary mb-4">
                Confirmar Registro
              </h2>
              <p className="text-text-secondary max-w-lg mx-auto mb-8">
                Revise que todos los datos sean correctos. Al confirmar, su solicitud
                sera enviada para aprobacion.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto text-left">
                <div className="space-y-2 text-sm">
                  <p><strong>Empresa:</strong> {formData.nombre}</p>
                  <p><strong>CUIT:</strong> {formData.cuit}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>CBU:</strong> {formData.cbu || 'No informado'}</p>
                  <p><strong>Documentos:</strong> {uploadedDocs.length} cargados</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleSaveStep} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCompleteOnboarding} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Confirmar Registro
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-palette-purple mx-auto mb-4" />
            <p className="text-text-secondary">Cargando...</p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
