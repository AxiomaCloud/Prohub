'use client';

import { useState } from 'react';
import { OrdenCompra, Conformidad } from '@/types/compras';
import { X, CheckCircle, AlertTriangle, XCircle, PackageCheck } from 'lucide-react';

interface RecepcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    conformidad: Conformidad;
    observaciones: string;
    itemsRecibidos: {
      descripcion: string;
      cantidadEsperada: number;
      cantidadRecibida: number;
    }[];
  }) => void;
  ordenCompra: OrdenCompra;
}

export function RecepcionModal({
  isOpen,
  onClose,
  onConfirm,
  ordenCompra,
}: RecepcionModalProps) {
  const [conformidad, setConformidad] = useState<Conformidad>('CONFORME');
  const [observaciones, setObservaciones] = useState('');
  const [itemsRecibidos, setItemsRecibidos] = useState(
    ordenCompra.items.map((item) => ({
      descripcion: item.descripcion,
      cantidadEsperada: item.cantidad,
      cantidadRecibida: item.cantidad,
    }))
  );

  if (!isOpen) return null;

  const handleCantidadChange = (index: number, cantidad: number) => {
    const updated = [...itemsRecibidos];
    updated[index].cantidadRecibida = cantidad;
    setItemsRecibidos(updated);
  };

  const handleSubmit = () => {
    onConfirm({
      conformidad,
      observaciones,
      itemsRecibidos,
    });
  };

  const handleClose = () => {
    setConformidad('CONFORME');
    setObservaciones('');
    setItemsRecibidos(
      ordenCompra.items.map((item) => ({
        descripcion: item.descripcion,
        cantidadEsperada: item.cantidad,
        cantidadRecibida: item.cantidad,
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
                Items Recibidos
              </h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Item
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">
                        Esperado
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-24">
                        Recibido
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {itemsRecibidos.map((item, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {item.descripcion}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 text-center">
                          {item.cantidadEsperada}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max={item.cantidadEsperada}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conformidad */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Conformidad *
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="conformidad"
                    value="CONFORME"
                    checked={conformidad === 'CONFORME'}
                    onChange={() => setConformidad('CONFORME')}
                    className="text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        Conforme
                      </span>
                      <p className="text-xs text-gray-500">
                        Todo recibido correctamente
                      </p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="conformidad"
                    value="PARCIAL"
                    checked={conformidad === 'PARCIAL'}
                    onChange={() => setConformidad('PARCIAL')}
                    className="text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        Parcial
                      </span>
                      <p className="text-xs text-gray-500">
                        Recibido parcialmente
                      </p>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="conformidad"
                    value="NO_CONFORME"
                    checked={conformidad === 'NO_CONFORME'}
                    onChange={() => setConformidad('NO_CONFORME')}
                    className="text-blue-600"
                  />
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        No Conforme
                      </span>
                      <p className="text-xs text-gray-500">
                        Problemas con la entrega
                      </p>
                    </div>
                  </div>
                </label>
              </div>
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
