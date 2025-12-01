'use client';

import { useState } from 'react';
import { Requerimiento } from '@/types/compras';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface AprobacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comentario: string) => void;
  requerimiento: Requerimiento;
  tipo: 'aprobar' | 'rechazar';
}

function formatMonto(monto: number, moneda: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

export function AprobacionModal({
  isOpen,
  onClose,
  onConfirm,
  requerimiento,
  tipo,
}: AprobacionModalProps) {
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (tipo === 'rechazar' && !comentario.trim()) {
      setError('El motivo del rechazo es requerido');
      return;
    }
    onConfirm(comentario);
    setComentario('');
    setError('');
  };

  const handleClose = () => {
    setComentario('');
    setError('');
    onClose();
  };

  const esAprobacion = tipo === 'aprobar';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {esAprobacion ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              {esAprobacion ? 'Aprobar' : 'Rechazar'} Requerimiento
            </h3>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Info del requerimiento */}
            <div className="mb-6">
              <p className="text-sm text-gray-500">{requerimiento.numero}</p>
              <p className="font-medium text-gray-900">{requerimiento.titulo}</p>
              <p className="text-sm text-gray-600 mt-1">
                Monto: {formatMonto(requerimiento.montoEstimado, requerimiento.moneda)}
              </p>
            </div>

            <hr className="mb-6" />

            {/* Comentario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {esAprobacion ? 'Comentario (opcional)' : 'Motivo del rechazo *'}
              </label>
              <textarea
                value={comentario}
                onChange={(e) => {
                  setComentario(e.target.value);
                  setError('');
                }}
                rows={3}
                placeholder={
                  esAprobacion
                    ? 'Agregue un comentario opcional...'
                    : 'Explique el motivo del rechazo...'
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>

            {/* Warning */}
            <div
              className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                esAprobacion ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 mt-0.5 ${esAprobacion ? 'text-green-600' : 'text-red-600'}`} />
              <p
                className={`text-sm ${
                  esAprobacion ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {esAprobacion
                  ? 'Al aprobar, se notificara al solicitante y se generara la Orden de Compra correspondiente.'
                  : 'Al rechazar, se notificara al solicitante con el motivo.'}
              </p>
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
              className={`px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2 ${
                esAprobacion
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {esAprobacion ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {esAprobacion ? 'Confirmar Aprobacion' : 'Confirmar Rechazo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
