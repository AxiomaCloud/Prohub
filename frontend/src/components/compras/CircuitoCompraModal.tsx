'use client';

import { useEffect, useState, useCallback } from 'react';
import { useCompras } from '@/lib/compras-context';
import { Requerimiento, OrdenCompra, Recepcion } from '@/types/compras';
import CircuitoCompraTimeline from './CircuitoCompraTimeline';
import { X, GitBranch, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CircuitoCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Se puede abrir desde cualquier documento
  requerimientoId?: string;
  ordenCompraId?: string;
  recepcionId?: string;
}

export default function CircuitoCompraModal({
  isOpen,
  onClose,
  requerimientoId,
  ordenCompraId,
  recepcionId,
}: CircuitoCompraModalProps) {
  const { requerimientos, ordenesCompra, recepciones } = useCompras();

  const [loading, setLoading] = useState(true);
  const [circuitoData, setCircuitoData] = useState<{
    requerimiento: Requerimiento | null;
    ordenCompra: OrdenCompra | null;
    recepcion: Recepcion | null;
    origen: 'requerimiento' | 'ordenCompra' | 'recepcion';
  }>({
    requerimiento: null,
    ordenCompra: null,
    recepcion: null,
    origen: 'requerimiento',
  });

  // Buscar y construir el circuito completo
  const buildCircuito = useCallback(() => {
    setLoading(true);

    let requerimiento: Requerimiento | null = null;
    let ordenCompra: OrdenCompra | null = null;
    let recepcion: Recepcion | null = null;
    let origen: 'requerimiento' | 'ordenCompra' | 'recepcion' = 'requerimiento';

    // Si se abrió desde un requerimiento
    if (requerimientoId) {
      origen = 'requerimiento';
      requerimiento = requerimientos.find(r => r.id === requerimientoId) || null;

      if (requerimiento) {
        // Buscar OC asociada
        ordenCompra = requerimiento.ordenCompra ||
          ordenesCompra.find(oc => oc.requerimientoId === requerimientoId) ||
          null;

        // Buscar recepción asociada
        if (ordenCompra) {
          recepcion = ordenCompra.recepciones?.[0] ||
            recepciones.find(r => r.ordenCompraId === ordenCompra!.id) ||
            null;
        } else if (requerimiento.recepcion) {
          recepcion = requerimiento.recepcion;
        }
      }
    }
    // Si se abrió desde una orden de compra
    else if (ordenCompraId) {
      origen = 'ordenCompra';
      ordenCompra = ordenesCompra.find(oc => oc.id === ordenCompraId) || null;

      if (ordenCompra) {
        // Buscar requerimiento asociado
        requerimiento = requerimientos.find(r => r.id === ordenCompra!.requerimientoId) || null;

        // Buscar recepción asociada
        recepcion = ordenCompra.recepciones?.[0] ||
          recepciones.find(r => r.ordenCompraId === ordenCompraId) ||
          null;
      }
    }
    // Si se abrió desde una recepción
    else if (recepcionId) {
      origen = 'recepcion';
      recepcion = recepciones.find(r => r.id === recepcionId) || null;

      if (recepcion) {
        // Buscar OC asociada
        ordenCompra = recepcion.ordenCompra ||
          ordenesCompra.find(oc => oc.id === recepcion!.ordenCompraId) ||
          null;

        // Buscar requerimiento asociado
        if (ordenCompra) {
          requerimiento = requerimientos.find(r => r.id === ordenCompra!.requerimientoId) || null;
        } else if (recepcion.requerimientoId) {
          requerimiento = requerimientos.find(r => r.id === recepcion!.requerimientoId) || null;
        }
      }
    }

    setCircuitoData({ requerimiento, ordenCompra, recepcion, origen });
    setLoading(false);
  }, [requerimientoId, ordenCompraId, recepcionId, requerimientos, ordenesCompra, recepciones]);

  useEffect(() => {
    if (isOpen) {
      buildCircuito();
    }
  }, [isOpen, buildCircuito]);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <GitBranch className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Circuito de Compra</h2>
              <p className="text-sm text-gray-500">Trazabilidad completa del documento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/80 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
              <p className="text-gray-500">Cargando circuito...</p>
            </div>
          ) : circuitoData.requerimiento || circuitoData.ordenCompra || circuitoData.recepcion ? (
            <CircuitoCompraTimeline
              requerimiento={circuitoData.requerimiento}
              ordenCompra={circuitoData.ordenCompra}
              recepcion={circuitoData.recepcion}
              origen={circuitoData.origen}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <GitBranch className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-center">
                No se encontró información del circuito
              </p>
              <p className="text-sm text-gray-400 mt-1">
                El documento solicitado no existe o fue eliminado
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook para facilitar el uso del modal
export function useCircuitoCompraModal() {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    requerimientoId?: string;
    ordenCompraId?: string;
    recepcionId?: string;
  }>({
    isOpen: false,
  });

  const openFromRequerimiento = useCallback((id: string) => {
    setModalState({ isOpen: true, requerimientoId: id });
  }, []);

  const openFromOrdenCompra = useCallback((id: string) => {
    setModalState({ isOpen: true, ordenCompraId: id });
  }, []);

  const openFromRecepcion = useCallback((id: string) => {
    setModalState({ isOpen: true, recepcionId: id });
  }, []);

  const close = useCallback(() => {
    setModalState({ isOpen: false });
  }, []);

  return {
    modalState,
    openFromRequerimiento,
    openFromOrdenCompra,
    openFromRecepcion,
    close,
  };
}
