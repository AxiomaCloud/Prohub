'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCompras } from '@/lib/compras-context';
import { EstadoBadge } from '@/components/compras/EstadoBadge';
import { PrioridadBadge } from '@/components/compras/PrioridadBadge';
import { ItemsTable } from '@/components/compras/ItemsTable';
import { AprobacionModal } from '@/components/compras/AprobacionModal';
import { RecepcionModal } from '@/components/compras/RecepcionModal';
import { PurchaseRequestChatButton, PurchaseRequestChatDrawer } from '@/components/chat';
import { usePurchaseRequestChat } from '@/hooks/usePurchaseRequestChat';

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
    className="w-4 h-4"
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

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function DetalleRequerimientoPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { requerimientos, usuarioActual, actualizarRequerimiento } = useCompras();

  const [showAprobacionModal, setShowAprobacionModal] = useState(false);
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [showRecepcionModal, setShowRecepcionModal] = useState(false);

  // Estado para el chat
  const [chatOpen, setChatOpen] = useState(false);

  // Detectar ?chat=open en URL
  useEffect(() => {
    if (searchParams.get('chat') === 'open') {
      setChatOpen(true);
    }
  }, [searchParams]);

  const requerimiento = useMemo(() => {
    return requerimientos.find((r) => r.id === params.id);
  }, [requerimientos, params.id]);

  // Hook para obtener unreadCount del chat (solo si hay requerimiento)
  const { unreadCount } = usePurchaseRequestChat({
    purchaseRequestId: params.id as string,
    enabled: !!params.id,
  });

  if (!requerimiento) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-gray-500 mb-4">Requerimiento no encontrado</p>
        <Link href="/compras/requerimientos" className="text-blue-600 hover:text-blue-800">
          Volver a mis requerimientos
        </Link>
      </div>
    );
  }

  const esAprobador = usuarioActual.rol === 'APROBADOR';
  const esSolicitante = requerimiento.solicitanteId === usuarioActual.id;
  const puedeAprobar =
    esAprobador && requerimiento.estado === 'PENDIENTE_APROBACION';
  const puedeConfirmarRecepcion =
    esSolicitante && requerimiento.estado === 'OC_GENERADA';

  const handleAprobar = (comentario: string) => {
    actualizarRequerimiento(requerimiento.id, {
      estado: 'OC_GENERADA',
      aprobadorId: usuarioActual.id,
      aprobador: usuarioActual,
      fechaAprobacion: new Date(),
      comentarioAprobacion: comentario || 'Aprobado',
      ordenCompra: {
        id: `oc-${Date.now()}`,
        numero: `OC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
        requerimientoId: requerimiento.id,
        proveedorId: 'prov-demo',
        proveedor: {
          id: 'prov-demo',
          nombre: 'Proveedor Demo S.A.',
          cuit: '30-99999999-9',
        },
        items: requerimiento.items.map((item, idx) => ({
          id: `item-oc-${idx}`,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precioUnitario: item.precioUnitario,
          total: item.total,
        })),
        subtotal: requerimiento.montoEstimado,
        impuestos: requerimiento.montoEstimado * 0.21,
        total: requerimiento.montoEstimado * 1.21,
        moneda: requerimiento.moneda,
        fechaEmision: new Date(),
        fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estado: 'EN_PROCESO',
        creadoPorId: usuarioActual.id,
        creadoPor: usuarioActual,
      },
    });
    setShowAprobacionModal(false);
  };

  const handleRechazar = (motivo: string) => {
    actualizarRequerimiento(requerimiento.id, {
      estado: 'RECHAZADO',
      aprobadorId: usuarioActual.id,
      aprobador: usuarioActual,
      fechaAprobacion: new Date(),
      comentarioAprobacion: motivo,
    });
    setShowRechazoModal(false);
  };

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
        ordenCompraId: requerimiento.ordenCompra?.id || '',
        receptorId: usuarioActual.id,
        receptor: usuarioActual,
        fechaRecepcion: new Date(),
        tipoRecepcion: data.tipoRecepcion,
        observaciones: data.observaciones,
        itemsRecibidos: data.itemsRecibidos,
      },
      ordenCompra: requerimiento.ordenCompra
        ? { ...requerimiento.ordenCompra, estado: 'FINALIZADA' }
        : undefined,
    });
    setShowRecepcionModal(false);
  };

  const getFileIcon = (tipo: string): string => {
    if (tipo.includes('pdf')) return '📄';
    if (tipo.includes('word') || tipo.includes('document')) return '📝';
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return '📊';
    if (tipo.includes('image')) return '🖼️';
    return '📎';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={esAprobador ? '/compras/aprobaciones' : '/compras/requerimientos'}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeftIcon />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{requerimiento.numero}</span>
              <EstadoBadge estado={requerimiento.estado} />
              <PurchaseRequestChatButton
                purchaseRequestId={requerimiento.id}
                purchaseRequestNumber={requerimiento.numero}
                unreadCount={unreadCount}
                onClick={() => setChatOpen(true)}
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              {requerimiento.titulo}
            </h1>
          </div>
        </div>
        <PrioridadBadge prioridad={requerimiento.prioridad} />
      </div>

      <div className="space-y-6">
        {/* Info Grid */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Info General */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Información General
              </h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Centro de Costos:</dt>
                  <dd className="text-sm text-gray-900">{requerimiento.centroCostos}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Categoría:</dt>
                  <dd className="text-sm text-gray-900">{requerimiento.categoria}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Fecha Creación:</dt>
                  <dd className="text-sm text-gray-900">
                    {formatFecha(requerimiento.fechaCreacion)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Fecha Necesaria:</dt>
                  <dd className="text-sm text-gray-900">
                    {formatFecha(requerimiento.fechaNecesaria)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Solicitante */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3">
                Solicitante
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {requerimiento.solicitante.nombre.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {requerimiento.solicitante.nombre}
                  </p>
                  <p className="text-sm text-gray-500">
                    {requerimiento.solicitante.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    {requerimiento.departamento}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {requerimiento.descripcion}
          </p>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Items Solicitados
          </h3>
          <ItemsTable items={requerimiento.items} onItemsChange={() => {}} readonly />
        </div>

        {/* Adjuntos */}
        {requerimiento.adjuntos.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Documentación Adjunta
            </h3>
            <div className="space-y-2">
              {requerimiento.adjuntos.map((adj) => (
                <div
                  key={adj.id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getFileIcon(adj.tipo)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {adj.nombre}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(adj.tamanio)}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <DownloadIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Justificación */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Justificación
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap">
            {requerimiento.justificacion}
          </p>
        </div>

        {/* Info de Aprobación (si aplica) */}
        {requerimiento.aprobador && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {requerimiento.estado === 'RECHAZADO'
                ? 'Información del Rechazo'
                : 'Información de Aprobación'}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {requerimiento.estado === 'RECHAZADO' ? 'Rechazado por:' : 'Aprobado por:'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {requerimiento.aprobador.nombre}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Fecha:</span>
                <span className="text-sm text-gray-900">
                  {formatFecha(requerimiento.fechaAprobacion)}
                </span>
              </div>
              {requerimiento.comentarioAprobacion && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Comentario:</p>
                  <p className="text-sm text-gray-900 mt-1">
                    {requerimiento.comentarioAprobacion}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-4 pb-8">
          {puedeAprobar && (
            <>
              <button
                onClick={() => setShowRechazoModal(true)}
                className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium"
              >
                Rechazar
              </button>
              <button
                onClick={() => setShowAprobacionModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Aprobar
              </button>
            </>
          )}

          {puedeConfirmarRecepcion && (
            <>
              <Link
                href={`/compras/ordenes-compra/${requerimiento.ordenCompra?.id}`}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Ver OC
              </Link>
              <button
                onClick={() => setShowRecepcionModal(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Confirmar Recepción
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      <AprobacionModal
        isOpen={showAprobacionModal}
        onClose={() => setShowAprobacionModal(false)}
        onConfirm={handleAprobar}
        requerimiento={requerimiento}
        tipo="aprobar"
      />

      <AprobacionModal
        isOpen={showRechazoModal}
        onClose={() => setShowRechazoModal(false)}
        onConfirm={handleRechazar}
        requerimiento={requerimiento}
        tipo="rechazar"
      />

      {requerimiento.ordenCompra && (
        <RecepcionModal
          isOpen={showRecepcionModal}
          onClose={() => setShowRecepcionModal(false)}
          onConfirm={handleConfirmarRecepcion}
          ordenCompra={requerimiento.ordenCompra}
        />
      )}

      {/* Chat drawer */}
      <PurchaseRequestChatDrawer
        purchaseRequestId={requerimiento.id}
        purchaseRequestNumber={requerimiento.numero}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
