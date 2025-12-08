'use client';

import React, { useState } from 'react';
import {
  Building,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  Bell,
} from 'lucide-react';

interface CompanyData {
  nombreFantasia: string;
  condicionFiscal: string;
  tipoFactura: string;
  direccion: string;
  numero: string;
  piso: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  pais: string;
  telefono: string;
  whatsapp: string;
  email: string;
  emailFacturacion: string;
  contactoNombre: string;
  contactoCargo: string;
  notifEmail: boolean;
  notifWhatsapp: boolean;
  notifSms: boolean;
  notifDocStatus: boolean;
  notifPagos: boolean;
  notifComentarios: boolean;
  notifOC: boolean;
}

interface CompanyDataFormProps {
  initialData?: Partial<CompanyData>;
  razonSocial?: string;
  cuit?: string;
  onSubmit: (data: CompanyData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const CONDICIONES_FISCALES = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
];

const TIPOS_FACTURA = [
  { value: 'A', label: 'Factura A' },
  { value: 'B', label: 'Factura B' },
  { value: 'C', label: 'Factura C' },
  { value: 'E', label: 'Factura E (Exportación)' },
];

const PROVINCIAS_ARGENTINA = [
  'Buenos Aires',
  'Ciudad Autónoma de Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
];

export const CompanyDataForm: React.FC<CompanyDataFormProps> = ({
  initialData,
  razonSocial,
  cuit,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<CompanyData>({
    nombreFantasia: initialData?.nombreFantasia || '',
    condicionFiscal: initialData?.condicionFiscal || '',
    tipoFactura: initialData?.tipoFactura || '',
    direccion: initialData?.direccion || '',
    numero: initialData?.numero || '',
    piso: initialData?.piso || '',
    localidad: initialData?.localidad || '',
    provincia: initialData?.provincia || '',
    codigoPostal: initialData?.codigoPostal || '',
    pais: initialData?.pais || 'Argentina',
    telefono: initialData?.telefono || '',
    whatsapp: initialData?.whatsapp || '',
    email: initialData?.email || '',
    emailFacturacion: initialData?.emailFacturacion || '',
    contactoNombre: initialData?.contactoNombre || '',
    contactoCargo: initialData?.contactoCargo || '',
    notifEmail: initialData?.notifEmail ?? true,
    notifWhatsapp: initialData?.notifWhatsapp ?? false,
    notifSms: initialData?.notifSms ?? false,
    notifDocStatus: initialData?.notifDocStatus ?? true,
    notifPagos: initialData?.notifPagos ?? true,
    notifComentarios: initialData?.notifComentarios ?? true,
    notifOC: initialData?.notifOC ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof CompanyData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.condicionFiscal) {
      newErrors.condicionFiscal = 'Selecciona la condición fiscal';
    }
    if (!formData.tipoFactura) {
      newErrors.tipoFactura = 'Selecciona el tipo de factura';
    }
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.telefono) {
      newErrors.telefono = 'El teléfono es requerido';
    }
    if (!formData.contactoNombre) {
      newErrors.contactoNombre = 'El nombre del contacto es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header con datos fijos */}
      {(razonSocial || cuit) && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Datos de la empresa
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {razonSocial && (
              <div>
                <span className="text-xs text-gray-500">Razón Social</span>
                <p className="font-medium text-gray-900 dark:text-white">{razonSocial}</p>
              </div>
            )}
            {cuit && (
              <div>
                <span className="text-xs text-gray-500">CUIT</span>
                <p className="font-medium text-gray-900 dark:text-white">{cuit}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sección: Datos de la Empresa */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-secondary" />
          Datos de la Empresa
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre de Fantasía */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de Fantasía
            </label>
            <input
              type="text"
              value={formData.nombreFantasia}
              onChange={(e) => handleChange('nombreFantasia', e.target.value)}
              placeholder="Mi Empresa"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          {/* Condición Fiscal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Condición Fiscal *
            </label>
            <select
              value={formData.condicionFiscal}
              onChange={(e) => handleChange('condicionFiscal', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                errors.condicionFiscal ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Seleccionar...</option>
              {CONDICIONES_FISCALES.map((cf) => (
                <option key={cf.value} value={cf.value}>
                  {cf.label}
                </option>
              ))}
            </select>
            {errors.condicionFiscal && (
              <p className="text-red-500 text-xs mt-1">{errors.condicionFiscal}</p>
            )}
          </div>

          {/* Tipo de Factura */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Factura que emite *
            </label>
            <div className="flex flex-wrap gap-4">
              {TIPOS_FACTURA.map((tf) => (
                <label key={tf.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoFactura"
                    value={tf.value}
                    checked={formData.tipoFactura === tf.value}
                    onChange={(e) => handleChange('tipoFactura', e.target.value)}
                    className="w-4 h-4 text-secondary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{tf.label}</span>
                </label>
              ))}
            </div>
            {errors.tipoFactura && (
              <p className="text-red-500 text-xs mt-1">{errors.tipoFactura}</p>
            )}
          </div>
        </div>
      </div>

      {/* Sección: Domicilio Fiscal */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-secondary" />
          Domicilio Fiscal
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Calle
            </label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              placeholder="Av. Corrientes"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Número
            </label>
            <input
              type="text"
              value={formData.numero}
              onChange={(e) => handleChange('numero', e.target.value)}
              placeholder="1234"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Piso/Depto
            </label>
            <input
              type="text"
              value={formData.piso}
              onChange={(e) => handleChange('piso', e.target.value)}
              placeholder="5 A"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Código Postal
            </label>
            <input
              type="text"
              value={formData.codigoPostal}
              onChange={(e) => handleChange('codigoPostal', e.target.value)}
              placeholder="C1043"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Localidad/Ciudad
            </label>
            <input
              type="text"
              value={formData.localidad}
              onChange={(e) => handleChange('localidad', e.target.value)}
              placeholder="Ciudad Autónoma de Buenos Aires"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Provincia
            </label>
            <select
              value={formData.provincia}
              onChange={(e) => handleChange('provincia', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="">Seleccionar...</option>
              {PROVINCIAS_ARGENTINA.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              País
            </label>
            <input
              type="text"
              value={formData.pais}
              onChange={(e) => handleChange('pais', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Sección: Datos de Contacto */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-secondary" />
          Datos de Contacto
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Teléfono *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                placeholder="+54 11 4567-8900"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.telefono ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              WhatsApp
            </label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => handleChange('whatsapp', e.target.value)}
              placeholder="+54 9 11 2345-6789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Principal *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="contacto@miempresa.com"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Secundario (Facturación)
            </label>
            <input
              type="email"
              value={formData.emailFacturacion}
              onChange={(e) => handleChange('emailFacturacion', e.target.value)}
              placeholder="facturacion@miempresa.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Persona de Contacto *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.contactoNombre}
                onChange={(e) => handleChange('contactoNombre', e.target.value)}
                placeholder="Juan Pérez"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  errors.contactoNombre ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.contactoNombre && (
              <p className="text-red-500 text-xs mt-1">{errors.contactoNombre}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cargo
            </label>
            <input
              type="text"
              value={formData.contactoCargo}
              onChange={(e) => handleChange('contactoCargo', e.target.value)}
              placeholder="Gerente Administrativo"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Sección: Preferencias de Notificaciones */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-secondary" />
          Preferencias de Notificaciones
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quiero recibir notificaciones por:
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifEmail}
                  onChange={(e) => handleChange('notifEmail', e.target.checked)}
                  className="w-4 h-4 text-secondary rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifWhatsapp}
                  onChange={(e) => handleChange('notifWhatsapp', e.target.checked)}
                  className="w-4 h-4 text-secondary rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">WhatsApp</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifSms}
                  onChange={(e) => handleChange('notifSms', e.target.checked)}
                  className="w-4 h-4 text-secondary rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">SMS</span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notificarme cuando:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifDocStatus}
                  onChange={(e) => handleChange('notifDocStatus', e.target.checked)}
                  className="w-4 h-4 text-secondary rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Mi documento cambia de estado
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifPagos}
                  onChange={(e) => handleChange('notifPagos', e.target.checked)}
                  className="w-4 h-4 text-secondary rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Recibo un nuevo pago
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifComentarios}
                  onChange={(e) => handleChange('notifComentarios', e.target.checked)}
                  className="w-4 h-4 text-secondary rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Hay un comentario en mi documento
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notifOC}
                  onChange={(e) => handleChange('notifOC', e.target.checked)}
                  className="w-4 h-4 text-secondary rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Hay nuevas órdenes de compra
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Guardar datos de empresa
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CompanyDataForm;
