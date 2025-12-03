'use client';

import React from 'react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string;
  itemData?: any;
}

export function DocumentViewerModal({ isOpen, onClose, documentId, itemData }: DocumentViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Visor de Documento</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="min-h-[400px] flex items-center justify-center text-gray-500">
          {documentId ? (
            <p>Documento: {documentId}</p>
          ) : (
            <p>No hay documento para mostrar</p>
          )}
        </div>
      </div>
    </div>
  );
}
