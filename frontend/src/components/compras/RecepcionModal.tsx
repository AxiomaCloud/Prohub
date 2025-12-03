'use client';

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { OrdenCompra, ItemRecibido } from '@/types/compras';
import { X, PackageCheck, PackageMinus } from 'lucide-react';

interface RecepcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    tipoRecepcion: 'TOTAL' | 'PARCIAL';
    observaciones: string;
    itemsRecibidos: ItemRecibido[];
  }) => void;
  ordenCompra: OrdenCompra;
}

export function RecepcionModal({
  isOpen,
  onClose,
  onConfirm,
  ordenCompra,
}: RecepcionModalProps) {
  const [observaciones, setObservaciones] = useState('');
  const [itemsRecibidos, setItemsRecibidos] = useState(
    ordenCompra.items.map((item) => ({
      id: `ir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemOCId: item.id,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidadEsperada: item.cantidad,
      cantidadRecibida: item.cantidad - (item.cantidadRecibida || 0),
      cantidadPendiente: 0,
    }))
  );

  // Calcular tipo de recepcion automaticamente
  const tipoRecepcion = useMemo(() => {
    const totalEsperado = itemsRecibidos.reduce((sum, item) => sum + item.cantidadEsperada, 0);
    const totalRecibido = itemsRecibidos.reduce((sum, item) => sum + item.cantidadRecibida, 0);
    return totalRecibido >= totalEsperado ? 'TOTAL' : 'PARCIAL';
  }, [itemsRecibidos]);

  if (!isOpen) return null;

  const handleCantidadChange = (index: number, cantidad: number) => {
    const updated = [...itemsRecibidos];
    const maxCantidad = ordenCompra.items[index].cantidad - (ordenCompra.items[index].cantidadRecibida || 0);
    updated[index].cantidadRecibida = Math.min(Math.max(0, cantidad), maxCantidad);
    updated[index].cantidadPendiente = maxCantidad - updated[index].cantidadRecibida;
    setItemsRecibidos(updated);
  };

  const handleSubmit = () => {
    const itemsConRecepcion = itemsRecibidos.filter(item => item.cantidadRecibida > 0);
    if (itemsConRecepcion.length === 0) {
      toast.error('Debe indicar al menos una cantidad recibida');
      return;
    }
    onConfirm({
      tipoRecepcion,
      observaciones,
      itemsRecibidos: itemsConRecepcion,
    });
  };

  const handleClose = () => {
    setObservaciones('');
    setItemsRecibidos(
      ordenCompra.items.map((item) => ({
        id: `ir-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        itemOCId: item.id,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidadEsperada: item.cantidad,
        cantidadRecibida: item.cantidad - (item.cantidadRecibida || 0),
        cantidadPendiente: 0,
      }))
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-green-500" />
              Confirmar Recepcion
            </h3>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Info OC */}
            <div>
              <p className="font-medium text-gray-900">
                {ordenCompra.numero}
              </p>
              <p className="text-sm text-gray-500">
                Proveedor: {ordenCompra.proveedor.nombre}
              </p>
            </div>

            <hr />

            {/* Items */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Items a Recibir
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Item
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">
                        Pendiente
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">
                        A Recibir
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {itemsRecibidos.map((item, index) => {
                      const pendiente = ordenCompra.items[index].cantidad - (ordenCompra.items[index].cantidadRecibida || 0);
                      return (
                        <tr key={item.itemOCId}>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {item.descripcion}
                            <span className="text-gray-500 text-xs ml-1">({item.unidad})</span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-500 text-center">
                            {pendiente}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              max={pendiente}
                              value={item.cantidadRecibida}
                              onChange={(e) =>
                                handleCantidadChange(
                                  index,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tipo de Recepcion (automatico) */}
            <div className={`p-3 rounded-lg ${tipoRecepcion === 'TOTAL' ? 'bg-green-50' : 'bg-orange-50'}`}>
              <div className="flex items-center gap-2">
                {tipoRecepcion === 'TOTAL' ? (
                  <PackageCheck className="w-5 h-5 text-green-600" />
                ) : (
                  <PackageMinus className="w-5 h-5 text-orange-600" />
                )}
                <span className={`font-medium ${tipoRecepcion === 'TOTAL' ? 'text-green-800' : 'text-orange-800'}`}>
                  Recepcion {tipoRecepcion === 'TOTAL' ? 'Total' : 'Parcial'}
                </span>
              </div>
              <p className={`text-xs mt-1 ${tipoRecepcion === 'TOTAL' ? 'text-green-600' : 'text-orange-600'}`}>
                {tipoRecepcion === 'TOTAL'
                  ? 'Se recibiran todos los items pendientes'
                  : 'Quedaran items pendientes de recibir'}
              </p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Agregue observaciones sobre la recepcion..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
            >
              <PackageCheck className="w-4 h-4" />
              Confirmar Recepcion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
