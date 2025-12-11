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
  Plus,
  Trash2,
  Star,
} from 'lucide-react';

interface BankAccount {
  id?: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta?: string;
  cbu: string;
  alias?: string;
  titularCuenta: string;
  moneda: string;
  esPrincipal: boolean;
}

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
  cuentasBancarias: BankAccount[];
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

const bancos = [
  { value: 'BANCO_NACION', label: 'Banco de la Nación Argentina' },
  { value: 'BANCO_PROVINCIA', label: 'Banco de la Provincia de Buenos Aires' },
  { value: 'BANCO_CIUDAD', label: 'Banco de la Ciudad de Buenos Aires' },
  { value: 'BANCO_GALICIA', label: 'Banco Galicia' },
  { value: 'BANCO_SANTANDER', label: 'Banco Santander' },
  { value: 'BANCO_BBVA', label: 'BBVA Argentina' },
  { value: 'BANCO_MACRO', label: 'Banco Macro' },
  { value: 'BANCO_HSBC', label: 'HSBC Argentina' },
  { value: 'BANCO_ICBC', label: 'ICBC Argentina' },
  { value: 'BANCO_CREDICOOP', label: 'Banco Credicoop' },
  { value: 'BANCO_SUPERVIELLE', label: 'Banco Supervielle' },
  { value: 'BANCO_PATAGONIA', label: 'Banco Patagonia' },
  { value: 'BANCO_COMAFI', label: 'Banco Comafi' },
  { value: 'BANCO_HIPOTECARIO', label: 'Banco Hipotecario' },
  { value: 'BANCO_SAN_JUAN', label: 'Banco San Juan' },
  { value: 'BANCO_ENTRE_RIOS', label: 'Banco de Entre Ríos' },
  { value: 'BANCO_SANTA_FE', label: 'Banco de Santa Fe' },
  { value: 'BANCO_CORDOBA', label: 'Banco de Córdoba' },
  { value: 'BANCO_CHUBUT', label: 'Banco del Chubut' },
  { value: 'BRUBANK', label: 'Brubank' },
  { value: 'UALA', label: 'Ualá' },
  { value: 'MERCADOPAGO', label: 'Mercado Pago' },
  { value: 'NARANJA_X', label: 'Naranja X' },
  { value: 'OTRO', label: 'Otro' },
];

const monedas = [
  { value: 'ARS', label: 'Pesos (ARS)' },
  { value: 'USD', label: 'Dólares (USD)' },
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

      // Mapear cuentas bancarias del supplier
      const cuentasBancarias: BankAccount[] = supplier.cuentasBancarias?.map((cuenta: any) => ({
        id: cuenta.id,
        banco: cuenta.banco || '',
        tipoCuenta: cuenta.tipoCuenta || 'CAJA_AHORRO',
        numeroCuenta: cuenta.numeroCuenta || '',
        cbu: cuenta.cbu || '',
        alias: cuenta.alias || '',
        titularCuenta: cuenta.titularCuenta || '',
        moneda: cuenta.moneda || 'ARS',
        esPrincipal: cuenta.esPrincipal || false,
      })) || [];

      // Si no hay cuentas pero hay datos legacy, crear una cuenta con esos datos
      if (cuentasBancarias.length === 0 && supplier.cbu) {
        cuentasBancarias.push({
          banco: supplier.banco || '',
          tipoCuenta: supplier.tipoCuenta || 'CAJA_AHORRO',
          numeroCuenta: supplier.numeroCuenta || '',
          cbu: supplier.cbu || '',
          alias: supplier.alias || '',
          titularCuenta: supplier.titularCuenta || '',
          moneda: 'ARS',
          esPrincipal: true,
        });
      }

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
        cuentasBancarias,
        notifEmail: supplier.notifEmail ?? true,
        notifWhatsapp: supplier.notifWhatsapp ?? false,
        notifDocStatus: supplier.notifDocStatus ?? true,
        notifPagos: supplier.notifPagos ?? true,
        notifComentarios: supplier.notifComentarios ?? true,
        notifOC: supplier.notifOC ?? true,
      });
    }
  }, [supplier]);

  const loading = supplierLoading;

  const handleChange = (field: keyof SupplierData, value: any) => {
    if (supplierData) {
      setSupplierData({ ...supplierData, [field]: value });
    }
  };

  // Funciones para manejar cuentas bancarias
  const addBankAccount = () => {
    if (!supplierData) return;
    const newAccount: BankAccount = {
      banco: '',
      tipoCuenta: 'CAJA_AHORRO',
      numeroCuenta: '',
      cbu: '',
      alias: '',
      titularCuenta: supplierData.nombre,
      moneda: 'ARS',
      esPrincipal: supplierData.cuentasBancarias.length === 0,
    };
    setSupplierData({
      ...supplierData,
      cuentasBancarias: [...supplierData.cuentasBancarias, newAccount],
    });
  };

  const removeBankAccount = (index: number) => {
    if (!supplierData) return;
    const updatedAccounts = supplierData.cuentasBancarias.filter((_, i) => i !== index);
    // Si eliminamos la cuenta principal y quedan cuentas, marcar la primera como principal
    if (supplierData.cuentasBancarias[index]?.esPrincipal && updatedAccounts.length > 0) {
      updatedAccounts[0].esPrincipal = true;
    }
    setSupplierData({
      ...supplierData,
      cuentasBancarias: updatedAccounts,
    });
  };

  const updateBankAccount = (index: number, field: keyof BankAccount, value: any) => {
    if (!supplierData) return;
    const updatedAccounts = [...supplierData.cuentasBancarias];
    updatedAccounts[index] = { ...updatedAccounts[index], [field]: value };

    // Si se marca como principal, desmarcar las demás
    if (field === 'esPrincipal' && value === true) {
      updatedAccounts.forEach((acc, i) => {
        if (i !== index) acc.esPrincipal = false;
      });
    }

    setSupplierData({
      ...supplierData,
      cuentasBancarias: updatedAccounts,
    });
  };

  const getBancoLabel = (value: string) => {
    return bancos.find(b => b.value === value)?.label || value;
  };

  const getTipoCuentaLabel = (value: string) => {
    return tiposCuenta.find(t => t.value === value)?.label || value;
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
            <div className="space-y-6">
              {/* Header con botón agregar */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-text-primary">Cuentas Bancarias</h3>
                  <p className="text-sm text-text-secondary">Gestiona las cuentas bancarias para recibir pagos</p>
                </div>
                <Button variant="outline" size="sm" onClick={addBankAccount}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Cuenta
                </Button>
              </div>

              {/* Lista de cuentas vacía */}
              {supplierData.cuentasBancarias.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <CreditCard className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                  <p className="text-text-secondary mb-2">No hay cuentas bancarias registradas</p>
                  <Button variant="outline" size="sm" onClick={addBankAccount}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar primera cuenta
                  </Button>
                </div>
              )}

              {/* Grilla de cuentas bancarias */}
              {supplierData.cuentasBancarias.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Banco</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">CBU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Alias</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Titular</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Moneda</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Principal</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {supplierData.cuentasBancarias.map((cuenta, index) => (
                        <tr key={index} className={cuenta.esPrincipal ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3">
                            <select
                              value={cuenta.banco}
                              onChange={(e) => updateBankAccount(index, 'banco', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple"
                            >
                              <option value="">Seleccionar...</option>
                              {bancos.map((b) => (
                                <option key={b.value} value={b.value}>{b.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={cuenta.tipoCuenta}
                              onChange={(e) => updateBankAccount(index, 'tipoCuenta', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple"
                            >
                              {tiposCuenta.map((tc) => (
                                <option key={tc.value} value={tc.value}>{tc.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={cuenta.cbu}
                              onChange={(e) => updateBankAccount(index, 'cbu', e.target.value)}
                              maxLength={22}
                              placeholder="0000000000000000000000"
                              className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple font-mono"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={cuenta.alias || ''}
                              onChange={(e) => updateBankAccount(index, 'alias', e.target.value)}
                              placeholder="mi.alias.cbu"
                              className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={cuenta.titularCuenta}
                              onChange={(e) => updateBankAccount(index, 'titularCuenta', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={cuenta.moneda}
                              onChange={(e) => updateBankAccount(index, 'moneda', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-palette-purple"
                            >
                              {monedas.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => updateBankAccount(index, 'esPrincipal', true)}
                              className={`p-1 rounded-full transition-colors ${
                                cuenta.esPrincipal
                                  ? 'text-yellow-500'
                                  : 'text-gray-300 hover:text-yellow-400'
                              }`}
                              title={cuenta.esPrincipal ? 'Cuenta principal' : 'Marcar como principal'}
                            >
                              <Star className={`w-5 h-5 ${cuenta.esPrincipal ? 'fill-current' : ''}`} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeBankAccount(index)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar cuenta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Nota informativa */}
              {supplierData.cuentasBancarias.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Star className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Cuenta Principal</p>
                    <p className="text-xs text-blue-600 mt-1">
                      La cuenta marcada con estrella será la predeterminada para recibir pagos.
                      Puedes cambiarla haciendo clic en la estrella de otra cuenta.
                    </p>
                  </div>
                </div>
              )}
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
