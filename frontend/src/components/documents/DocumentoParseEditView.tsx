'use client';

import React, { useState } from 'react';
import { FileText, Package, Receipt, Plus, Trash2, Building2, Calendar, Hash, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ParsedCabecera {
  tipoComprobante?: string;
  puntoVenta?: string;
  numeroComprobante?: string;
  fecha?: string;
  cuitEmisor?: string;
  razonSocialEmisor?: string;
  total?: number;
  subtotal?: number;
  iva?: number;
  exento?: number;
  moneda?: string;
  cae?: string;
  ordenCompra?: string;
}

interface ParsedItem {
  numero?: number;
  descripcion?: string;
  codigoProducto?: string;
  cantidad?: number;
  unidad?: string;
  precioUnitario?: number;
  subtotal?: number;
  alicuotaIva?: number;
  importeIva?: number;
  totalLinea?: number;
}

interface ParsedImpuesto {
  tipo?: string;
  descripcion?: string;
  alicuota?: number;
  baseImponible?: number;
  importe?: number;
}

interface ParseData {
  documento?: {
    cabecera?: ParsedCabecera;
    items?: ParsedItem[];
    impuestos?: ParsedImpuesto[];
  };
  metadata?: {
    confianza?: number;
    processingTimeMs?: number;
  };
}

interface DocumentoParseEditViewProps {
  parseData: ParseData | null;
  onChange: (parseData: ParseData) => void;
}

export const DocumentoParseEditView: React.FC<DocumentoParseEditViewProps> = ({ parseData, onChange }) => {
  const [activeTab, setActiveTab] = useState<'cabecera' | 'items' | 'impuestos'>('cabecera');

  if (!parseData?.documento) {
    return (
      <div className="text-center text-gray-500 py-8">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No hay datos extraídos disponibles</p>
      </div>
    );
  }

  const { cabecera = {}, items = [], impuestos = [] } = parseData.documento;

  const updateCabecera = (field: keyof ParsedCabecera, value: any) => {
    onChange({
      ...parseData,
      documento: {
        ...parseData.documento,
        cabecera: {
          ...cabecera,
          [field]: value
        }
      }
    });
  };

  const updateItem = (index: number, field: keyof ParsedItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({
      ...parseData,
      documento: {
        ...parseData.documento,
        items: newItems
      }
    });
  };

  const addItem = () => {
    const newItems = [...items, { numero: items.length + 1, descripcion: '', cantidad: 1, precioUnitario: 0, totalLinea: 0 }];
    onChange({
      ...parseData,
      documento: {
        ...parseData.documento,
        items: newItems
      }
    });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange({
      ...parseData,
      documento: {
        ...parseData.documento,
        items: newItems
      }
    });
  };

  const updateImpuesto = (index: number, field: keyof ParsedImpuesto, value: any) => {
    const newImpuestos = [...impuestos];
    newImpuestos[index] = { ...newImpuestos[index], [field]: value };
    onChange({
      ...parseData,
      documento: {
        ...parseData.documento,
        impuestos: newImpuestos
      }
    });
  };

  const addImpuesto = () => {
    const newImpuestos = [...impuestos, { tipo: 'IVA', alicuota: 21, baseImponible: 0, importe: 0 }];
    onChange({
      ...parseData,
      documento: {
        ...parseData.documento,
        impuestos: newImpuestos
      }
    });
  };

  const removeImpuesto = (index: number) => {
    const newImpuestos = impuestos.filter((_, i) => i !== index);
    onChange({
      ...parseData,
      documento: {
        ...parseData.documento,
        impuestos: newImpuestos
      }
    });
  };

  const tabs = [
    { id: 'cabecera', label: 'Cabecera', icon: FileText, count: null },
    { id: 'items', label: 'Items', icon: Package, count: items.length },
    { id: 'impuestos', label: 'Impuestos', icon: Receipt, count: impuestos.length },
  ] as const;

  const inputClass = "w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 h-[450px] overflow-y-auto">
        {/* Tab Cabecera */}
        {activeTab === 'cabecera' && (
          <div className="space-y-4 min-h-[400px]">
            {/* Tipo y Número */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Tipo Comprobante</label>
                <select
                  value={cabecera.tipoComprobante || ''}
                  onChange={(e) => updateCabecera('tipoComprobante', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  <option value="FACTURA A">Factura A</option>
                  <option value="FACTURA B">Factura B</option>
                  <option value="FACTURA C">Factura C</option>
                  <option value="NOTA DE CREDITO A">Nota de Crédito A</option>
                  <option value="NOTA DE CREDITO B">Nota de Crédito B</option>
                  <option value="NOTA DE CREDITO C">Nota de Crédito C</option>
                  <option value="NOTA DE DEBITO A">Nota de Débito A</option>
                  <option value="NOTA DE DEBITO B">Nota de Débito B</option>
                  <option value="RECIBO">Recibo</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Punto de Venta</label>
                <input
                  type="text"
                  value={cabecera.puntoVenta || ''}
                  onChange={(e) => updateCabecera('puntoVenta', e.target.value)}
                  placeholder="0001"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Número</label>
                <input
                  type="text"
                  value={cabecera.numeroComprobante || ''}
                  onChange={(e) => updateCabecera('numeroComprobante', e.target.value)}
                  placeholder="00000001"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Emisor */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  <Building2 className="w-3 h-3 inline mr-1" />
                  Razón Social Emisor
                </label>
                <input
                  type="text"
                  value={cabecera.razonSocialEmisor || ''}
                  onChange={(e) => updateCabecera('razonSocialEmisor', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>CUIT Emisor</label>
                <input
                  type="text"
                  value={cabecera.cuitEmisor || ''}
                  onChange={(e) => updateCabecera('cuitEmisor', e.target.value)}
                  placeholder="20-12345678-9"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Fecha y CAE */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Fecha
                </label>
                <input
                  type="date"
                  value={cabecera.fecha ? cabecera.fecha.split('T')[0] : ''}
                  onChange={(e) => updateCabecera('fecha', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>CAE</label>
                <input
                  type="text"
                  value={cabecera.cae || ''}
                  onChange={(e) => updateCabecera('cae', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Moneda</label>
                <select
                  value={cabecera.moneda || 'ARS'}
                  onChange={(e) => updateCabecera('moneda', e.target.value)}
                  className={inputClass}
                >
                  <option value="ARS">ARS - Peso Argentino</option>
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>

            {/* Montos */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Importes
              </h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>Subtotal</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cabecera.subtotal || ''}
                    onChange={(e) => updateCabecera('subtotal', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>IVA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cabecera.iva || ''}
                    onChange={(e) => updateCabecera('iva', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Exento</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cabecera.exento || ''}
                    onChange={(e) => updateCabecera('exento', parseFloat(e.target.value) || 0)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cabecera.total || ''}
                    onChange={(e) => updateCabecera('total', parseFloat(e.target.value) || 0)}
                    className={`${inputClass} font-semibold bg-purple-50`}
                  />
                </div>
              </div>
            </div>

            {/* Orden de Compra */}
            <div>
              <label className={labelClass}>Orden de Compra (opcional)</label>
              <input
                type="text"
                value={cabecera.ordenCompra || ''}
                onChange={(e) => updateCabecera('ordenCompra', e.target.value)}
                placeholder="OC-2025-00001"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* Tab Items */}
        {activeTab === 'items' && (
          <div className="space-y-3 min-h-[400px]">
            {items.length === 0 ? (
              <div className="text-center text-gray-500 py-6">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay items</p>
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Item {index + 1}</span>
                    <button
                      onClick={() => removeItem(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    <div className="col-span-3">
                      <label className={labelClass}>Descripción</label>
                      <input
                        type="text"
                        value={item.descripcion || ''}
                        onChange={(e) => updateItem(index, 'descripcion', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Cantidad</label>
                      <input
                        type="number"
                        value={item.cantidad || ''}
                        onChange={(e) => updateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>P. Unit.</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.precioUnitario || ''}
                        onChange={(e) => updateItem(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Total</label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.totalLinea || ''}
                        onChange={(e) => updateItem(index, 'totalLinea', parseFloat(e.target.value) || 0)}
                        className={`${inputClass} font-medium`}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" onClick={addItem} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Item
            </Button>
          </div>
        )}

        {/* Tab Impuestos */}
        {activeTab === 'impuestos' && (
          <div className="space-y-3 min-h-[400px]">
            {impuestos.length === 0 ? (
              <div className="text-center text-gray-500 py-6">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay impuestos</p>
              </div>
            ) : (
              impuestos.map((imp, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Impuesto {index + 1}</span>
                    <button
                      onClick={() => removeImpuesto(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <label className={labelClass}>Tipo</label>
                      <select
                        value={imp.tipo || ''}
                        onChange={(e) => updateImpuesto(index, 'tipo', e.target.value)}
                        className={inputClass}
                      >
                        <option value="IVA">IVA</option>
                        <option value="IIBB">IIBB</option>
                        <option value="Perc. IVA">Perc. IVA</option>
                        <option value="Perc. IIBB">Perc. IIBB</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Alícuota %</label>
                      <input
                        type="number"
                        step="0.01"
                        value={imp.alicuota || ''}
                        onChange={(e) => updateImpuesto(index, 'alicuota', parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Base Imp.</label>
                      <input
                        type="number"
                        step="0.01"
                        value={imp.baseImponible || ''}
                        onChange={(e) => updateImpuesto(index, 'baseImponible', parseFloat(e.target.value) || 0)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Importe</label>
                      <input
                        type="number"
                        step="0.01"
                        value={imp.importe || ''}
                        onChange={(e) => updateImpuesto(index, 'importe', parseFloat(e.target.value) || 0)}
                        className={`${inputClass} font-medium`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Descripción</label>
                      <input
                        type="text"
                        value={imp.descripcion || ''}
                        onChange={(e) => updateImpuesto(index, 'descripcion', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" size="sm" onClick={addImpuesto} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Impuesto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
