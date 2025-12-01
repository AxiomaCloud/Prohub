'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface Item {
  id?: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  total: number;
}

interface ItemsTableProps {
  items: Item[];
  onItemsChange: (items: Item[]) => void;
  readonly?: boolean;
}

function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

const unidadesOptions = [
  'Unidad',
  'Kilogramo',
  'Litro',
  'Metro',
  'Caja',
  'Pack',
  'Hora',
  'Mes',
];

export function ItemsTable({
  items,
  onItemsChange,
  readonly = false,
}: ItemsTableProps) {
  const handleAddItem = () => {
    const newItem: Item = {
      id: `item-${Date.now()}`,
      descripcion: '',
      cantidad: 1,
      unidad: 'Unidad',
      precioUnitario: 0,
      total: 0,
    };
    onItemsChange([...items, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof Item, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    // Recalcular total
    if (field === 'cantidad' || field === 'precioUnitario') {
      const cantidad = field === 'cantidad' ? value : updatedItems[index].cantidad;
      const precio = field === 'precioUnitario' ? value : updatedItems[index].precioUnitario;
      updatedItems[index].total = cantidad * precio;
    }

    onItemsChange(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    onItemsChange(updatedItems);
  };

  const totalGeneral = items.reduce((sum, item) => sum + item.total, 0);

  if (readonly) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Descripcion
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Cantidad
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                P. Unitario
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={item.id || index}>
                <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.descripcion}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-center">
                  {item.cantidad} {item.unidad}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  {formatMonto(item.precioUnitario)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                  {formatMonto(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td
                colSpan={4}
                className="px-4 py-3 text-right text-sm font-medium text-gray-900"
              >
                Total:
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                {formatMonto(totalGeneral)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Descripcion
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                Cant.
              </th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase w-28">
                Unidad
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                P. Unit.
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                Total
              </th>
              <th className="px-3 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={item.id || index}>
                <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={item.descripcion}
                    onChange={(e) =>
                      handleUpdateItem(index, 'descripcion', e.target.value)
                    }
                    placeholder="Descripcion del item"
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) =>
                      handleUpdateItem(index, 'cantidad', parseInt(e.target.value) || 0)
                    }
                    className="w-full px-2 py-1 text-sm text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={item.unidad}
                    onChange={(e) =>
                      handleUpdateItem(index, 'unidad', e.target.value)
                    }
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {unidadesOptions.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    value={item.precioUnitario}
                    onChange={(e) =>
                      handleUpdateItem(
                        index,
                        'precioUnitario',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                  {formatMonto(item.total)}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td
                colSpan={5}
                className="px-4 py-3 text-right text-sm font-medium text-gray-900"
              >
                Total Estimado:
              </td>
              <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                {formatMonto(totalGeneral)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button
        type="button"
        onClick={handleAddItem}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Agregar Item
      </button>
    </div>
  );
}
