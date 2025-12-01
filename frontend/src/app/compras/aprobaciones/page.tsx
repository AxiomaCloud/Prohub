'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCompras } from '@/lib/compras-context';
import { PrioridadBadge } from '@/components/compras/PrioridadBadge';
import { AprobacionModal } from '@/components/compras/AprobacionModal';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Requerimiento } from '@/types/compras';
import { User, DollarSign, Calendar, Paperclip, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';

function formatMonto(monto: number, moneda: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

function formatFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha));
}

export default function AprobacionesPage() {
  const router = useRouter();
  const { requerimientos, usuarioActual, actualizarRequerimiento } = useCompras();

  const [selectedRequerimiento, setSelectedRequerimiento] =
    useState<Requerimiento | null>(null);
  const [modalTipo, setModalTipo] = useState<'aprobar' | 'rechazar' | null>(
    null
  );

  // Solo mostrar pendientes de aprobacion
  const pendientes = useMemo(() => {
    return requerimientos.filter((r) => r.estado === 'PENDIENTE_APROBACION');
  }, [requerimientos]);

  // Verificar que el usuario es aprobador
  if (usuarioActual.rol !== 'APROBADOR') {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-border p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-primary font-medium">
            No tienes permisos para acceder a esta seccion
          </p>
          <p className="text-text-secondary text-sm mt-2">
            Solo los aprobadores pueden ver esta pagina
          </p>
          <Button
            onClick={() => router.push('/compras/requerimientos')}
            className="mt-4"
          >
            Ir a Requerimientos
          </Button>
        </div>
      </div>
    );
  }

  const handleAprobar = (comentario: string) => {
    if (!selectedRequerimiento) return;

    actualizarRequerimiento(selectedRequerimiento.id, {
      estado: 'OC_GENERADA',
      aprobadorId: usuarioActual.id,
      aprobador: usuarioActual,
      fechaAprobacion: new Date(),
      comentarioAprobacion: comentario || 'Aprobado',
      ordenCompra: {
        id: `oc-${Date.now()}`,
        numero: `OC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
        requerimientoId: selectedRequerimiento.id,
        proveedor: {
          nombre: 'Proveedor Demo S.A.',
          cuit: '30-99999999-9',
        },
        items: selectedRequerimiento.items,
        subtotal: selectedRequerimiento.montoEstimado,
        impuestos: selectedRequerimiento.montoEstimado * 0.21,
        total: selectedRequerimiento.montoEstimado * 1.21,
        moneda: selectedRequerimiento.moneda,
        fechaEmision: new Date(),
        fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        estado: 'EN_PROCESO',
      },
    });

    setSelectedRequerimiento(null);
    setModalTipo(null);
  };

  const handleRechazar = (motivo: string) => {
    if (!selectedRequerimiento) return;

    actualizarRequerimiento(selectedRequerimiento.id, {
      estado: 'RECHAZADO',
      aprobadorId: usuarioActual.id,
      aprobador: usuarioActual,
      fechaAprobacion: new Date(),
      comentarioAprobacion: motivo,
    });

    setSelectedRequerimiento(null);
    setModalTipo(null);
  };

  const openModal = (req: Requerimiento, tipo: 'aprobar' | 'rechazar') => {
    setSelectedRequerimiento(req);
    setModalTipo(tipo);
  };

  const closeModal = () => {
    setSelectedRequerimiento(null);
    setModalTipo(null);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Aprobaciones Pendientes"
        subtitle={`${pendientes.length} requerimiento${pendientes.length !== 1 ? 's' : ''} pendiente${pendientes.length !== 1 ? 's' : ''} de aprobacion`}
      />

      {/* Lista */}
      <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
        {pendientes.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-text-primary font-medium">
              No hay requerimientos pendientes
            </p>
            <p className="text-text-secondary text-sm mt-2">
              Todos los requerimientos han sido procesados
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pendientes.map((req) => (
              <div
                key={req.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                {/* Header del card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {req.prioridad === 'URGENTE' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> URGENTE
                      </span>
                    )}
                    <div>
                      <p className="text-sm text-text-secondary">{req.numero}</p>
                      <h3 className="font-semibold text-text-primary text-lg">
                        {req.titulo}
                      </h3>
                    </div>
                  </div>
                  <PrioridadBadge prioridad={req.prioridad} size="sm" />
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-text-secondary">Solicitante</p>
                    <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                      <User className="w-4 h-4 text-text-secondary" /> {req.solicitante.nombre}
                    </p>
                    <p className="text-xs text-text-secondary">{req.departamento}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Monto</p>
                    <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-text-secondary" /> {formatMonto(req.montoEstimado, req.moneda)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Fecha Solicitado</p>
                    <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-text-secondary" /> {formatFecha(req.fechaCreacion)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary">Adjuntos</p>
                    <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                      <Paperclip className="w-4 h-4 text-text-secondary" /> {req.adjuntos.length} archivo
                      {req.adjuntos.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Descripcion breve */}
                <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                  "{req.descripcion}"
                </p>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Link
                    href={`/compras/requerimientos/${req.id}`}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium text-sm"
                  >
                    Ver Detalle
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openModal(req, 'rechazar')}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openModal(req, 'aprobar')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Aprobar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {pendientes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>Mostrando {pendientes.length} requerimiento{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedRequerimiento && modalTipo && (
        <AprobacionModal
          isOpen={true}
          onClose={closeModal}
          onConfirm={modalTipo === 'aprobar' ? handleAprobar : handleRechazar}
          requerimiento={selectedRequerimiento}
          tipo={modalTipo}
        />
      )}
    </div>
  );
}
