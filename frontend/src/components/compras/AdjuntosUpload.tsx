'use client';

import { useState, useRef } from 'react';
import { Upload, Trash2, FileText, FileSpreadsheet, Image, Paperclip } from 'lucide-react';

interface AdjuntoFile {
  id: string;
  file: File;
  nombre: string;
  tamanio: number;
  tipo: string;
}

interface AdjuntosUploadProps {
  adjuntos: AdjuntoFile[];
  onAdjuntosChange: (adjuntos: AdjuntoFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // bytes
  acceptedTypes?: string[];
  readonly?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function AdjuntosUpload({
  adjuntos,
  onAdjuntosChange,
  maxFiles = 10,
  maxFileSize = 10485760, // 10MB
  acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
  ],
  readonly = false,
}: AdjuntosUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (files: FileList) => {
    setError(null);
    const newAdjuntos: AdjuntoFile[] = [];

    for (const file of Array.from(files)) {
      // Validar cantidad
      if (adjuntos.length + newAdjuntos.length >= maxFiles) {
        setError(`Maximo ${maxFiles} archivos permitidos`);
        break;
      }

      // Validar tamano
      if (file.size > maxFileSize) {
        setError(
          `El archivo "${file.name}" excede el tamano maximo de ${formatFileSize(maxFileSize)}`
        );
        continue;
      }

      // Validar tipo
      if (!acceptedTypes.includes(file.type)) {
        setError(`Tipo de archivo no permitido: ${file.name}`);
        continue;
      }

      newAdjuntos.push({
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        nombre: file.name,
        tamanio: file.size,
        tipo: file.type,
      });
    }

    if (newAdjuntos.length > 0) {
      onAdjuntosChange([...adjuntos, ...newAdjuntos]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleRemove = (id: string) => {
    onAdjuntosChange(adjuntos.filter((adj) => adj.id !== id));
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (tipo.includes('word') || tipo.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (tipo.includes('image')) return <Image className="w-5 h-5 text-purple-500" />;
    return <Paperclip className="w-5 h-5 text-gray-500" />;
  };

  // Vista de solo lectura
  if (readonly) {
    return (
      <div className="space-y-4">
        {adjuntos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Paperclip className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No hay documentos adjuntos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {adjuntos.map((adj) => (
              <div
                key={adj.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(adj.tipo)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {adj.nombre}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(adj.tamanio)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Upload className="w-8 h-8" />
          <p className="font-medium">
            Arrastra archivos aqui o hace click para seleccionar
          </p>
          <p className="text-sm">
            PDF, DOC, XLS, JPG, PNG - Max {formatFileSize(maxFileSize)} por
            archivo
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      {/* Lista de adjuntos */}
      {adjuntos.length > 0 && (
        <div className="space-y-2">
          {adjuntos.map((adj) => (
            <div
              key={adj.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(adj.tipo)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {adj.nombre}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(adj.tamanio)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(adj.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
