'use client';

import React, { useState } from 'react';
import { Building2, CreditCard, User, Hash, Wallet } from 'lucide-react';

interface BankData {
  banco: string;
  tipoCuenta: 'CUENTA_CORRIENTE' | 'CAJA_AHORRO';
  numeroCuenta: string;
  cbu: string;
  alias: string;
  titularCuenta: string;
  cuitTitular: string;
  monedaCuenta: 'ARS' | 'USD';
}

interface BankDataFormProps {
  initialData?: Partial<BankData>;
  onSubmit: (data: BankData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const BANCOS_ARGENTINA = [
  'Banco de la Nación Argentina',
  'Banco Provincia',
  'Banco Ciudad',
  'Banco Galicia',
  'Banco Santander',
  'BBVA',
  'Banco Macro',
  'Banco Patagonia',
  'HSBC',
  'Banco ICBC',
  'Banco Credicoop',
  'Banco Hipotecario',
  'Banco Comafi',
  'Banco Industrial',
  'Banco Supervielle',
  'Brubank',
  'Ualá',
  'Mercado Pago',
  'Naranja X',
  'Otro',
];

export const BankDataForm: React.FC<BankDataFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<BankData>({
    banco: initialData?.banco || '',
    tipoCuenta: initialData?.tipoCuenta || 'CAJA_AHORRO',
    numeroCuenta: initialData?.numeroCuenta || '',
    cbu: initialData?.cbu || '',
    alias: initialData?.alias || '',
    titularCuenta: initialData?.titularCuenta || '',
    cuitTitular: initialData?.cuitTitular || '',
    monedaCuenta: initialData?.monedaCuenta || 'ARS',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCBU = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 22);
  };

  const formatCUIT = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 10) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 10)}-${numbers.slice(10, 11)}`;
  };

  const handleChange = (field: keyof BankData, value: string) => {
    let formattedValue = value;

    if (field === 'cbu') {
      formattedValue = formatCBU(value);
    } else if (field === 'cuitTitular') {
      formattedValue = formatCUIT(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.banco) {
      newErrors.banco = 'Selecciona un banco';
    }
    if (!formData.cbu || formData.cbu.length !== 22) {
      newErrors.cbu = 'El CBU debe tener 22 dígitos';
    }
    if (!formData.titularCuenta) {
      newErrors.titularCuenta = 'El titular de la cuenta es requerido';
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Datos Bancarios para Pagos
        </h3>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          Necesitamos tus datos bancarios para poder efectuar los pagos.
        </p>
      </div>

      {/* Banco */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Banco *
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={formData.banco}
            onChange={(e) => handleChange('banco', e.target.value)}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
              errors.banco ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Seleccionar banco...</option>
            {BANCOS_ARGENTINA.map((banco) => (
              <option key={banco} value={banco}>
                {banco}
              </option>
            ))}
          </select>
        </div>
        {errors.banco && <p className="text-red-500 text-xs mt-1">{errors.banco}</p>}
      </div>

      {/* Tipo de Cuenta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tipo de Cuenta *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tipoCuenta"
              value="CUENTA_CORRIENTE"
              checked={formData.tipoCuenta === 'CUENTA_CORRIENTE'}
              onChange={(e) => handleChange('tipoCuenta', e.target.value as 'CUENTA_CORRIENTE')}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Cuenta Corriente</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tipoCuenta"
              value="CAJA_AHORRO"
              checked={formData.tipoCuenta === 'CAJA_AHORRO'}
              onChange={(e) => handleChange('tipoCuenta', e.target.value as 'CAJA_AHORRO')}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Caja de Ahorro</span>
          </label>
        </div>
      </div>

      {/* Número de Cuenta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Número de Cuenta
        </label>
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={formData.numeroCuenta}
            onChange={(e) => handleChange('numeroCuenta', e.target.value)}
            placeholder="0123456789"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* CBU/CVU */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          CBU/CVU *
        </label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={formData.cbu}
            onChange={(e) => handleChange('cbu', e.target.value)}
            placeholder="0170099220000012345678"
            maxLength={22}
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white font-mono ${
              errors.cbu ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{formData.cbu.length}/22 dígitos</p>
        {errors.cbu && <p className="text-red-500 text-xs mt-1">{errors.cbu}</p>}
      </div>

      {/* Alias */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Alias (opcional)
        </label>
        <input
          type="text"
          value={formData.alias}
          onChange={(e) => handleChange('alias', e.target.value.toUpperCase())}
          placeholder="MI.EMPRESA.PAGOS"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white uppercase"
        />
      </div>

      {/* Titular de la Cuenta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Titular de la Cuenta *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={formData.titularCuenta}
            onChange={(e) => handleChange('titularCuenta', e.target.value.toUpperCase())}
            placeholder="MI EMPRESA SRL"
            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white uppercase ${
              errors.titularCuenta ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Debe coincidir con la razón social</p>
        {errors.titularCuenta && <p className="text-red-500 text-xs mt-1">{errors.titularCuenta}</p>}
      </div>

      {/* CUIT del Titular */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          CUIT del Titular
        </label>
        <input
          type="text"
          value={formData.cuitTitular}
          onChange={(e) => handleChange('cuitTitular', e.target.value)}
          placeholder="30-12345678-9"
          maxLength={13}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
        />
      </div>

      {/* Moneda */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Moneda *
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="monedaCuenta"
              value="ARS"
              checked={formData.monedaCuenta === 'ARS'}
              onChange={(e) => handleChange('monedaCuenta', e.target.value as 'ARS')}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Pesos (ARS)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="monedaCuenta"
              value="USD"
              checked={formData.monedaCuenta === 'USD'}
              onChange={(e) => handleChange('monedaCuenta', e.target.value as 'USD')}
              className="w-4 h-4 text-purple-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Dólares (USD)</span>
          </label>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar datos bancarios'
          )}
        </button>
      </div>
    </form>
  );
};

export default BankDataForm;
