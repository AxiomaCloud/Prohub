'use client';

import { useState } from 'react';
import { Requerimiento } from '@/types/compras';
import { X, ShieldCheck, ShieldAlert, AlertTriangle, FileText } from 'lucide-react';

interface EspecificacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comentario: string) => void;
  requerimiento: Requerimiento;
  tipo: 'aprobar' | 'rechazar';
}

export function EspecificacionesModal({
  isOpen,
  onClose,
  onConfirm,
  requerimiento,
  tipo,
}: EspecificacionesModalProps) {
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
          <div className={`flex items-center justify-between p-4 border-b ${
            esAprobacion ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
          }`}>
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${
              esAprobacion ? 'text-amber-800' : 'text-red-800'
            }`}>
              {esAprobacion ? (
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-600" />
              )}
              {esAprobacion ? 'Aprobar' : 'Rechazar'} Especificaciones
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
            <div className="mb-4">
              <p className="text-sm text-gray-500">{requerimiento.numero}</p>
              <p className="font-medium text-gray-900">{requerimiento.titulo}</p>
            </div>

            {/* Adjuntos */}
            {requerimiento.adjuntos && requerimiento.adjuntos.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documentos adjuntos ({requerimiento.adjuntos.length})
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {requerimiento.adjuntos.slice(0, 3).map((adj) => (
                    <li key={adj.id} className="truncate">• {adj.nombre}</li>
                  ))}
                  {requerimiento.adjuntos.length > 3 && (
                    <li className="text-gray-400">y {requerimiento.adjuntos.length - 3} mas...</li>
                  )}
                </ul>
              </div>
            )}

            <hr className="mb-4" />

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
                    ? 'Agregue un comentario sobre las especificaciones...'
                    : 'Explique que debe corregir el solicitante...'
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  esAprobacion ? 'focus:ring-amber-500' : 'focus:ring-red-500'
                } ${error ? 'border-red-500' : 'border-gray-300'}`}
              />
              {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            </div>

            {/* Warning */}
            <div
              className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                esAprobacion ? 'bg-amber-50' : 'bg-red-50'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                esAprobacion ? 'text-amber-600' : 'text-red-600'
              }`} />
              <p className={`text-sm ${esAprobacion ? 'text-amber-700' : 'text-red-700'}`}>
                {esAprobacion
                  ? 'Al aprobar las especificaciones, el requerimiento podra ser aprobado para generar la Orden de Compra.'
                  : 'Al rechazar las especificaciones, el requerimiento volvera a estado Borrador para que el solicitante realice las correcciones.'}
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
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {esAprobacion ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
              {esAprobacion ? 'Aprobar Especificaciones' : 'Rechazar Especificaciones'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
