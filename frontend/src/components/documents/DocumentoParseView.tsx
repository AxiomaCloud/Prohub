'use client';

import React, { useState } from 'react';
import { FileText, Package, Receipt, ChevronDown, ChevronUp, Building2, Calendar, Hash, DollarSign, Percent } from 'lucide-react';

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

interface DocumentoParseViewProps {
  parseData: {
    documento?: {
      cabecera?: ParsedCabecera;
      items?: ParsedItem[];
      impuestos?: ParsedImpuesto[];
    };
    metadata?: {
      confianza?: number;
      processingTimeMs?: number;
    };
  } | null;
}

export const DocumentoParseView: React.FC<DocumentoParseViewProps> = ({ parseData }) => {
  const [activeTab, setActiveTab] = useState<'cabecera' | 'items' | 'impuestos'>('cabecera');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  if (!parseData?.documento) {
    return (
      <div className="text-center text-gray-500 py-8">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No hay datos extraídos disponibles</p>
      </div>
    );
  }

  const { cabecera, items = [], impuestos = [] } = parseData.documento;
  const metadata = parseData.metadata;

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return `$${value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return `${value}%`;
  };

  const toggleItemExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const tabs = [
    { id: 'cabecera', label: 'Cabecera', icon: FileText, count: null },
    { id: 'items', label: 'Items', icon: Package, count: items.length },
    { id: 'impuestos', label: 'Impuestos', icon: Receipt, count: impuestos.length },
  ] as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Tab Cabecera */}
        {activeTab === 'cabecera' && cabecera && (
          <div className="space-y-4">
            {/* Tipo y Número */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <FileText className="w-3 h-3" />
                  Tipo de Comprobante
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {cabecera.tipoComprobante || '-'}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Hash className="w-3 h-3" />
                  Número
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {cabecera.puntoVenta && cabecera.numeroComprobante
                    ? `${cabecera.puntoVenta}-${cabecera.numeroComprobante}`
                    : cabecera.numeroComprobante || '-'}
                </div>
              </div>
            </div>

            {/* Emisor */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <Building2 className="w-3 h-3" />
                Emisor
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {cabecera.razonSocialEmisor || '-'}
              </div>
              {cabecera.cuitEmisor && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  CUIT: {cabecera.cuitEmisor}
                </div>
              )}
            </div>

            {/* Fecha y CAE */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <Calendar className="w-3 h-3" />
                  Fecha
                </div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {cabecera.fecha || '-'}
                </div>
              </div>
              {cabecera.cae && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs mb-1">
                    <Hash className="w-3 h-3" />
                    CAE
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                    {cabecera.cae}
                  </div>
                </div>
              )}
            </div>

            {/* Montos */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Importes</h4>
              <div className="grid grid-cols-2 gap-3">
                {cabecera.subtotal !== undefined && (
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="font-medium">{formatCurrency(cabecera.subtotal)}</span>
                  </div>
                )}
                {cabecera.iva !== undefined && (
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">IVA</span>
                    <span className="font-medium">{formatCurrency(cabecera.iva)}</span>
                  </div>
                )}
                {cabecera.exento !== undefined && cabecera.exento > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-900 rounded">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Exento</span>
                    <span className="font-medium">{formatCurrency(cabecera.exento)}</span>
                  </div>
                )}
              </div>
              {cabecera.total !== undefined && (
                <div className="flex justify-between items-center py-3 px-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg mt-3">
                  <span className="font-medium text-purple-700 dark:text-purple-300">Total</span>
                  <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    {formatCurrency(cabecera.total)}
                  </span>
                </div>
              )}
            </div>

            {/* Metadata */}
            {metadata && (metadata.confianza || metadata.processingTimeMs) && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {metadata.confianza && (
                    <span className="flex items-center gap-1">
                      <Percent className="w-3 h-3" />
                      Confianza: {(metadata.confianza * 100).toFixed(0)}%
                    </span>
                  )}
                  {metadata.processingTimeMs && (
                    <span>Tiempo: {metadata.processingTimeMs}ms</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Items */}
        {activeTab === 'items' && (
          <div className="space-y-2">
            {items.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No se detectaron items</p>
              </div>
            ) : (
              items.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Item Header */}
                  <button
                    onClick={() => toggleItemExpanded(index)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 rounded text-xs font-medium">
                        {item.numero || index + 1}
                      </span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {item.descripcion || 'Sin descripción'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {item.cantidad} {item.unidad || 'u.'} × {formatCurrency(item.precioUnitario)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.totalLinea)}
                      </span>
                      {expandedItems.has(index) ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Item Details */}
                  {expandedItems.has(index) && (
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-3 text-sm">
                      {item.codigoProducto && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Código:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{item.codigoProducto}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Cantidad:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{item.cantidad} {item.unidad}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">P. Unitario:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{formatCurrency(item.precioUnitario)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</span>
                      </div>
                      {item.alicuotaIva !== undefined && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Alícuota IVA:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{formatPercent(item.alicuotaIva)}</span>
                        </div>
                      )}
                      {item.importeIva !== undefined && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">IVA:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{formatCurrency(item.importeIva)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Total Items */}
            {items.length > 0 && (
              <div className="flex justify-between items-center py-3 px-4 bg-gray-100 dark:bg-gray-900 rounded-lg mt-4">
                <span className="font-medium text-gray-700 dark:text-gray-300">Total Items</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(items.reduce((sum, item) => sum + (item.totalLinea || 0), 0))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab Impuestos */}
        {activeTab === 'impuestos' && (
          <div className="space-y-2">
            {impuestos.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No se detectaron impuestos</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Tipo</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Alícuota</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Base Imp.</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impuestos.map((imp, index) => (
                        <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="py-2 px-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {imp.tipo || imp.descripcion || 'Impuesto'}
                            </div>
                            {imp.descripcion && imp.tipo && (
                              <div className="text-xs text-gray-500">{imp.descripcion}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                            {formatPercent(imp.alicuota)}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                            {formatCurrency(imp.baseImponible)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-white">
                            {formatCurrency(imp.importe)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Impuestos */}
                <div className="flex justify-between items-center py-3 px-4 bg-gray-100 dark:bg-gray-900 rounded-lg mt-4">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Total Impuestos</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(impuestos.reduce((sum, imp) => sum + (imp.importe || 0), 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
