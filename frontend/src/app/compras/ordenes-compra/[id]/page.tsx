'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCompras } from '@/lib/compras-context';
import { RecepcionModal } from '@/components/compras/RecepcionModal';
import { ItemsTable } from '@/components/compras/ItemsTable';

const ChevronLeftIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 19l-7-7 7-7"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

function formatMonto(monto: number, moneda: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

function formatFecha(fecha: Date | undefined): string {
  if (!fecha) return '-';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

function formatFechaCorta(fecha: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(fecha));
}

export default function OrdenCompraPage() {
  const params = useParams();
  const router = useRouter();
  const { requerimientos, usuarioActual, actualizarRequerimiento } = useCompras();

  const [showRecepcionModal, setShowRecepcionModal] = useState(false);

  // Buscar el requerimiento que tiene esta OC
  const requerimiento = useMemo(() => {
    return requerimientos.find((r) => r.ordenCompra?.id === params.id);
  }, [requerimientos, params.id]);

  const ordenCompra = requerimiento?.ordenCompra;

  if (!requerimiento || !ordenCompra) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-gray-500 mb-4">Orden de compra no encontrada</p>
        <Link href="/compras" className="text-blue-600 hover:text-blue-800">
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const esSolicitante = requerimiento.solicitanteId === usuarioActual.id;
  const puedeConfirmarRecepcion =
    esSolicitante && requerimiento.estado === 'OC_GENERADA';

  const handleConfirmarRecepcion = (data: {
    tipoRecepcion: 'TOTAL' | 'PARCIAL';
    observaciones: string;
    itemsRecibidos: {
      id: string;
      itemOCId: string;
      descripcion: string;
      unidad: string;
      cantidadEsperada: number;
      cantidadRecibida: number;
      cantidadPendiente: number;
    }[];
  }) => {
    actualizarRequerimiento(requerimiento.id, {
      estado: 'RECIBIDO',
      recepcion: {
        id: `rec-${Date.now()}`,
        numero: `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        requerimientoId: requerimiento.id,
        ordenCompraId: ordenCompra.id,
        receptorId: usuarioActual.id,
        receptor: usuarioActual,
        fechaRecepcion: new Date(),
        tipoRecepcion: data.tipoRecepcion,
        observaciones: data.observaciones,
        itemsRecibidos: data.itemsRecibidos,
      },
      ordenCompra: { ...ordenCompra, estado: 'FINALIZADA' },
    });
    setShowRecepcionModal(false);
    router.push('/compras/requerimientos');
  };

  const getEstadoOC = () => {
    switch (ordenCompra.estado) {
      case 'PENDIENTE_APROBACION':
        return { label: 'Pendiente Aprobación', color: 'bg-yellow-100 text-yellow-700' };
      case 'APROBADA':
        return { label: 'Aprobada', color: 'bg-green-100 text-green-700' };
      case 'EN_PROCESO':
        return { label: 'En Proceso', color: 'bg-blue-100 text-blue-700' };
      case 'PARCIALMENTE_RECIBIDA':
        return { label: 'Parcialmente Recibida', color: 'bg-orange-100 text-orange-700' };
      case 'ENTREGADA':
        return { label: 'Entregada', color: 'bg-teal-100 text-teal-700' };
      case 'FINALIZADA':
        return { label: 'Finalizada', color: 'bg-emerald-100 text-emerald-700' };
      default:
        return { label: ordenCompra.estado, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const estadoOC = getEstadoOC();

  // Timeline
  const timelineEvents = [
    {
      fecha: requerimiento.fechaCreacion,
      descripcion: `Requerimiento creado por ${requerimiento.solicitante.nombre}`,
      completado: true,
    },
    {
      fecha: requerimiento.fechaAprobacion,
      descripcion: `Aprobado por ${requerimiento.aprobador?.nombre}`,
      completado: !!requerimiento.fechaAprobacion,
    },
    {
      fecha: ordenCompra.fechaEmision,
      descripcion: 'OC generada',
      completado: true,
    },
    {
      fecha: ordenCompra.fechaEntregaEstimada,
      descripcion: 'Entrega estimada',
      completado: ordenCompra.estado === 'ENTREGADA',
      esEstimado: ordenCompra.estado !== 'ENTREGADA',
    },
    {
      fecha: requerimiento.recepcion?.fechaRecepcion,
      descripcion: 'Confirmación de recepción',
      completado: !!requerimiento.recepcion,
      pendiente: !requerimiento.recepcion,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/compras/requerimientos/${requerimiento.id}`}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon />
          </Link>
          <div>
            <p className="text-sm text-gray-500">{ordenCompra.numero}</p>
            <h1 className="text-2xl font-bold text-gray-900">Orden de Compra</h1>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${estadoOC.color}`}
        >
          🔵 {estadoOC.label}
        </span>
      </div>

      <div className="space-y-6">
        {/* Info Grid */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Datos OC */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Datos de la OC
              </h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Número:</dt>
                  <dd className="text-sm text-gray-900 font-medium">
                    {ordenCompra.numero}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Requerimiento:</dt>
                  <dd className="text-sm text-gray-900">
                    <Link
                      href={`/compras/requerimientos/${requerimiento.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {requerimiento.numero}
                    </Link>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Fecha Emisión:</dt>
                  <dd className="text-sm text-gray-900">
                    {formatFecha(ordenCompra.fechaEmision)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Entrega Estimada:</dt>
                  <dd className="text-sm text-gray-900">
                    {formatFecha(ordenCompra.fechaEntregaEstimada)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Proveedor */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Proveedor
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-lg">
                  🏢
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ordenCompra.proveedor.nombre}
                  </p>
                  <p className="text-sm text-gray-500">
                    CUIT: {ordenCompra.proveedor.cuit}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descripción
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
                {ordenCompra.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {item.descripcion}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {item.cantidad}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatMonto(item.precioUnitario, ordenCompra.moneda)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {formatMonto(item.total, ordenCompra.moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-500">
                    Subtotal:
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900">
                    {formatMonto(ordenCompra.subtotal, ordenCompra.moneda)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-500">
                    IVA (21%):
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-gray-900">
                    {formatMonto(ordenCompra.impuestos, ordenCompra.moneda)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                    Total:
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                    {formatMonto(ordenCompra.total, ordenCompra.moneda)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>

          <div className="space-y-4">
            {timelineEvents.map((event, index) => (
              <div key={index} className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                    event.completado
                      ? 'bg-green-100 text-green-600'
                      : event.pendiente
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {event.completado ? '✓' : event.pendiente ? '○' : '○'}
                </div>
                <div>
                  <p className="text-sm text-gray-900">
                    {event.fecha && !event.pendiente && (
                      <span className="text-gray-500 mr-2">
                        {formatFechaCorta(new Date(event.fecha))}
                      </span>
                    )}
                    {event.descripcion}
                    {event.esEstimado && (
                      <span className="text-gray-400 ml-1">(estimado)</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-4 pb-8">
          <button
            onClick={() => alert('Descarga de PDF simulada')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            <DownloadIcon />
            Descargar PDF
          </button>

          {puedeConfirmarRecepcion && (
            <button
              onClick={() => setShowRecepcionModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              ✅ Confirmar Recepción
            </button>
          )}
        </div>
      </div>

      {/* Modal Recepción */}
      <RecepcionModal
        isOpen={showRecepcionModal}
        onClose={() => setShowRecepcionModal(false)}
        onConfirm={handleConfirmarRecepcion}
        ordenCompra={ordenCompra}
      />
    </div>
  );
}
