'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupplier } from '@/hooks/useSupplier';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Bell,
  Save,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface SupplierData {
  id: string;
  nombre: string;
  nombreFantasia?: string;
  cuit: string;
  condicionFiscal?: string;
  tipoFactura?: string;
  direccion?: string;
  numero?: string;
  piso?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  telefono?: string;
  whatsapp?: string;
  email?: string;
  emailFacturacion?: string;
  contactoNombre?: string;
  contactoCargo?: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  cbu?: string;
  alias?: string;
  titularCuenta?: string;
  notifEmail: boolean;
  notifWhatsapp: boolean;
  notifDocStatus: boolean;
  notifPagos: boolean;
  notifComentarios: boolean;
  notifOC: boolean;
}

const condicionesFiscales = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
];

const tiposFactura = [
  { value: 'A', label: 'Factura A' },
  { value: 'B', label: 'Factura B' },
  { value: 'C', label: 'Factura C' },
  { value: 'E', label: 'Factura E (Exportación)' },
];

const tiposCuenta = [
  { value: 'CUENTA_CORRIENTE', label: 'Cuenta Corriente' },
  { value: 'CAJA_AHORRO', label: 'Caja de Ahorro' },
];

export default function MiEmpresaPage() {
  const router = useRouter();
  const { isSupplier, supplier, supplierId, loading: supplierLoading, refetch } = useSupplier();
  const [supplierData, setSupplierData] = useState<SupplierData | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'contacto' | 'bancario' | 'notificaciones'>('general');

  // Cargar datos del supplier desde el hook
  useEffect(() => {
    if (supplier) {
      console.log('🏢 [MiEmpresa] Cargando datos del supplier:', supplier);
      setSupplierData({
        id: supplier.id,
        nombre: supplier.nombre || '',
        nombreFantasia: supplier.nombreFantasia || '',
        cuit: supplier.cuit || '',
        condicionFiscal: supplier.condicionFiscal || '',
        tipoFactura: supplier.tipoFactura || '',
        direccion: supplier.direccion || '',
        numero: supplier.numero || '',
        piso: supplier.piso || '',
        localidad: supplier.localidad || '',
        provincia: supplier.provincia || '',
        codigoPostal: supplier.codigoPostal || '',
        telefono: supplier.telefono || '',
        whatsapp: supplier.whatsapp || '',
        email: supplier.email || '',
        emailFacturacion: supplier.emailFacturacion || '',
        contactoNombre: supplier.contactoNombre || '',
        contactoCargo: supplier.contactoCargo || '',
        banco: supplier.banco || '',
        tipoCuenta: supplier.tipoCuenta || '',
        numeroCuenta: supplier.numeroCuenta || '',
        cbu: supplier.cbu || '',
        alias: supplier.alias || '',
        titularCuenta: supplier.titularCuenta || '',
        notifEmail: supplier.notifEmail ?? true,
        notifWhatsapp: supplier.notifWhatsapp ?? false,
        notifDocStatus: supplier.notifDocStatus ?? true,
        notifPagos: supplier.notifPagos ?? true,
        notifComentarios: supplier.notifComentarios ?? true,
        notifOC: supplier.notifOC ?? true,
      } as SupplierData);
    }
  }, [supplier]);

  const loading = supplierLoading;

  const handleChange = (field: keyof SupplierData, value: any) => {
    if (supplierData) {
      setSupplierData({ ...supplierData, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!supplierData) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token') || localStorage.getItem('hub_token');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${supplierId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(supplierData),
        }
      );

      if (response.ok) {
        toast.success('Datos guardados correctamente');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving supplier data:', error);
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (supplierLoading || loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-palette-purple" />
      </div>
    );
  }

  // Si no es proveedor, redirigir
  if (!isSupplier) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary font-medium">
            No tienes acceso a esta sección
          </p>
          <p className="text-text-secondary text-sm mt-2">
            Esta página es solo para proveedores registrados
          </p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (!supplierData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">No se pudieron cargar los datos de la empresa</p>
          <Button onClick={() => refetch()} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Datos Generales', icon: Building2 },
    { id: 'contacto', label: 'Contacto', icon: Phone },
    { id: 'bancario', label: 'Datos Bancarios', icon: CreditCard },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Mi Empresa"
        subtitle="Gestiona los datos de tu empresa"
        icon={Building2}
        action={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        }
      />

      {/* Estado del proveedor */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600" />
        <div>
          <p className="text-sm font-medium text-green-800">Proveedor Activo</p>
          <p className="text-xs text-green-600">CUIT: {supplierData.cuit}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="border-b border-border">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-palette-purple text-palette-purple bg-palette-purple/5'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {/* Tab: Datos Generales */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Razón Social
                </label>
                <input
                  type="text"
                  value={supplierData.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Nombre de Fantasía
                </label>
                <input
                  type="text"
                  value={supplierData.nombreFantasia || ''}
                  onChange={(e) => handleChange('nombreFantasia', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  CUIT
                </label>
                <input
                  type="text"
                  value={supplierData.cuit}
                  disabled
                  className="w-full px-4 py-2 border border-border rounded-lg bg-gray-100 text-text-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Condición Fiscal
                </label>
                <select
                  value={supplierData.condicionFiscal || ''}
                  onChange={(e) => handleChange('condicionFiscal', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                >
                  <option value="">Seleccionar...</option>
                  {condicionesFiscales.map((cf) => (
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
                  value={supplierData.tipoFactura || ''}
                  onChange={(e) => handleChange('tipoFactura', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                >
                  <option value="">Seleccionar...</option>
                  {tiposFactura.map((tf) => (
                    <option key={tf.value} value={tf.value}>
                      {tf.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Domicilio Fiscal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs text-text-secondary mb-1">Dirección</label>
                    <input
                      type="text"
                      value={supplierData.direccion || ''}
                      onChange={(e) => handleChange('direccion', e.target.value)}
                      placeholder="Calle"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Número</label>
                    <input
                      type="text"
                      value={supplierData.numero || ''}
                      onChange={(e) => handleChange('numero', e.target.value)}
                      placeholder="N°"
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Piso/Depto</label>
                    <input
                      type="text"
                      value={supplierData.piso || ''}
                      onChange={(e) => handleChange('piso', e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Localidad</label>
                    <input
                      type="text"
                      value={supplierData.localidad || ''}
                      onChange={(e) => handleChange('localidad', e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Provincia</label>
                    <input
                      type="text"
                      value={supplierData.provincia || ''}
                      onChange={(e) => handleChange('provincia', e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Contacto */}
          {activeTab === 'contacto' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Principal
                </label>
                <input
                  type="email"
                  value={supplierData.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Facturación
                </label>
                <input
                  type="email"
                  value={supplierData.emailFacturacion || ''}
                  onChange={(e) => handleChange('emailFacturacion', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={supplierData.telefono || ''}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={supplierData.whatsapp || ''}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Nombre del Contacto
                </label>
                <input
                  type="text"
                  value={supplierData.contactoNombre || ''}
                  onChange={(e) => handleChange('contactoNombre', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Cargo del Contacto
                </label>
                <input
                  type="text"
                  value={supplierData.contactoCargo || ''}
                  onChange={(e) => handleChange('contactoCargo', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>
            </div>
          )}

          {/* Tab: Datos Bancarios */}
          {activeTab === 'bancario' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Banco
                </label>
                <input
                  type="text"
                  value={supplierData.banco || ''}
                  onChange={(e) => handleChange('banco', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Tipo de Cuenta
                </label>
                <select
                  value={supplierData.tipoCuenta || ''}
                  onChange={(e) => handleChange('tipoCuenta', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                >
                  <option value="">Seleccionar...</option>
                  {tiposCuenta.map((tc) => (
                    <option key={tc.value} value={tc.value}>
                      {tc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={supplierData.numeroCuenta || ''}
                  onChange={(e) => handleChange('numeroCuenta', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  CBU
                </label>
                <input
                  type="text"
                  value={supplierData.cbu || ''}
                  onChange={(e) => handleChange('cbu', e.target.value)}
                  maxLength={22}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Alias CBU
                </label>
                <input
                  type="text"
                  value={supplierData.alias || ''}
                  onChange={(e) => handleChange('alias', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Titular de la Cuenta
                </label>
                <input
                  type="text"
                  value={supplierData.titularCuenta || ''}
                  onChange={(e) => handleChange('titularCuenta', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-palette-purple"
                />
              </div>
            </div>
          )}

          {/* Tab: Notificaciones */}
          {activeTab === 'notificaciones' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary mb-6">
                Configura qué notificaciones deseas recibir
              </p>

              {[
                { key: 'notifEmail', label: 'Recibir notificaciones por email', desc: 'Recibirás emails sobre cambios importantes' },
                { key: 'notifWhatsapp', label: 'Recibir notificaciones por WhatsApp', desc: 'Mensajes directos a tu número de WhatsApp' },
                { key: 'notifDocStatus', label: 'Cambios en estado de documentos', desc: 'Cuando tus facturas cambien de estado' },
                { key: 'notifPagos', label: 'Notificaciones de pagos', desc: 'Cuando se programe o realice un pago' },
                { key: 'notifComentarios', label: 'Comentarios en documentos', desc: 'Cuando agreguen comentarios a tus documentos' },
                { key: 'notifOC', label: 'Órdenes de compra', desc: 'Cuando recibas nuevas órdenes de compra' },
              ].map((notif) => (
                <label
                  key={notif.key}
                  className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={supplierData[notif.key as keyof SupplierData] as boolean}
                    onChange={(e) => handleChange(notif.key as keyof SupplierData, e.target.checked)}
                    className="w-5 h-5 mt-0.5 rounded border-border text-palette-purple focus:ring-palette-purple"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{notif.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{notif.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
