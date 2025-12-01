'use client';

import { useState, useRef } from 'react';
import { Upload, Trash2, FileText, FileSpreadsheet, Image, Paperclip, Loader2, Download, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface AdjuntoFile {
  id: string;
  file?: File;       // Solo para archivos nuevos que aún no se subieron
  nombre: string;
  tamanio: number;
  tipo: string;
  url?: string;      // URL del servidor una vez subido
  esEspecificacion?: boolean;
  estado?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  uploading?: boolean;
  uploaded?: boolean;
}

interface AdjuntosUploadProps {
  adjuntos: AdjuntoFile[];
  onAdjuntosChange: (adjuntos: AdjuntoFile[]) => void;
  purchaseRequestId?: string;  // Si existe, sube automáticamente al servidor
  maxFiles?: number;
  maxFileSize?: number;
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
  purchaseRequestId,
  maxFiles = 10,
  maxFileSize = 10485760,
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
  const { token } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Subir archivo al servidor
  const uploadFile = async (adjunto: AdjuntoFile): Promise<AdjuntoFile | null> => {
    if (!adjunto.file || !purchaseRequestId) return null;

    const formData = new FormData();
    formData.append('file', adjunto.file);
    formData.append('purchaseRequestId', purchaseRequestId);
    formData.append('esEspecificacion', String(adjunto.esEspecificacion || false));

    try {
      const response = await fetch(`${apiUrl}/api/attachments/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir archivo');
      }

      const data = await response.json();
      return {
        id: data.id,
        nombre: data.nombre,
        tipo: data.tipo,
        tamanio: data.tamanio,
        url: data.url,
        esEspecificacion: data.esEspecificacion,
        estado: data.estado,
        uploaded: true,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const processFiles = async (files: FileList) => {
    setError(null);
    const newAdjuntos: AdjuntoFile[] = [];

    for (const file of Array.from(files)) {
      if (adjuntos.length + newAdjuntos.length >= maxFiles) {
        setError(`Maximo ${maxFiles} archivos permitidos`);
        break;
      }

      if (file.size > maxFileSize) {
        setError(`El archivo "${file.name}" excede el tamano maximo de ${formatFileSize(maxFileSize)}`);
        continue;
      }

      if (!acceptedTypes.includes(file.type)) {
        setError(`Tipo de archivo no permitido: ${file.name}`);
        continue;
      }

      const tempId = `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const adjunto: AdjuntoFile = {
        id: tempId,
        file,
        nombre: file.name,
        tamanio: file.size,
        tipo: file.type,
        uploading: !!purchaseRequestId,
        uploaded: false,
      };

      newAdjuntos.push(adjunto);
    }

    if (newAdjuntos.length > 0) {
      // Agregar adjuntos inmediatamente (mostrando estado de carga)
      let currentAdjuntos = [...adjuntos, ...newAdjuntos];
      onAdjuntosChange(currentAdjuntos);

      // Si hay purchaseRequestId, subir al servidor
      if (purchaseRequestId) {
        for (const adjunto of newAdjuntos) {
          try {
            const uploaded = await uploadFile(adjunto);
            if (uploaded) {
              // Actualizar el adjunto con los datos del servidor
              currentAdjuntos = currentAdjuntos.map((a: AdjuntoFile) =>
                a.id === adjunto.id ? uploaded : a
              );
              onAdjuntosChange(currentAdjuntos);
            }
          } catch (err: any) {
            // Marcar como fallido
            currentAdjuntos = currentAdjuntos.map((a: AdjuntoFile) =>
              a.id === adjunto.id
                ? { ...a, uploading: false }
                : a
            );
            onAdjuntosChange(currentAdjuntos);
            setError(`Error al subir ${adjunto.nombre}: ${err.message}`);
          }
        }
      }
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
    // Reset input para permitir seleccionar el mismo archivo
    e.target.value = '';
  };

  const handleRemove = async (id: string) => {
    const adjunto = adjuntos.find((a) => a.id === id);

    // Si el archivo está en el servidor, eliminarlo
    if (adjunto?.uploaded && adjunto.url) {
      try {
        await fetch(`${apiUrl}/api/attachments/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Error deleting attachment:', error);
      }
    }

    onAdjuntosChange(adjuntos.filter((adj) => adj.id !== id));
  };

  const handleDownload = (adjunto: AdjuntoFile) => {
    if (!adjunto.url) return;

    // Construir URL completa si es relativa
    const downloadUrl = adjunto.url.startsWith('http')
      ? adjunto.url
      : `${apiUrl}${adjunto.url}`;

    // Abrir en nueva pestaña con token de auth
    window.open(`${downloadUrl}?token=${token}`, '_blank');
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (tipo.includes('word') || tipo.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (tipo.includes('image')) return <Image className="w-5 h-5 text-purple-500" />;
    return <Paperclip className="w-5 h-5 text-gray-500" />;
  };

  const getEstadoBadge = (estado?: string) => {
    switch (estado) {
      case 'APROBADO':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">Aprobado</span>;
      case 'RECHAZADO':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Rechazado</span>;
      case 'PENDIENTE':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pendiente</span>;
      default:
        return null;
    }
  };

  // Vista de solo lectura
  if (readonly) {
    // Separar especificaciones de otros adjuntos
    const especificaciones = adjuntos.filter(a => a.esEspecificacion);
    const otrosAdjuntos = adjuntos.filter(a => !a.esEspecificacion);

    return (
      <div className="space-y-4">
        {adjuntos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Paperclip className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No hay documentos adjuntos</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Sección de especificaciones técnicas */}
            {especificaciones.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Especificaciones Técnicas</span>
                </div>
                {especificaciones.map((adj) => (
                  <div
                    key={adj.id}
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      adj.estado === 'APROBADO' ? 'bg-green-50' :
                      adj.estado === 'RECHAZADO' ? 'bg-red-50' :
                      'bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(adj.tipo)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{adj.nombre}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{formatFileSize(adj.tamanio)}</span>
                          {getEstadoBadge(adj.estado)}
                        </div>
                      </div>
                    </div>
                    {adj.url && (
                      <button
                        onClick={() => handleDownload(adj)}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-palette-purple hover:bg-white rounded transition-colors"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Otros adjuntos */}
            {otrosAdjuntos.length > 0 && (
              <div className="space-y-2">
                {especificaciones.length > 0 && (
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Paperclip className="w-4 h-4" />
                    <span>Otros Documentos</span>
                  </div>
                )}
                {otrosAdjuntos.map((adj) => (
                  <div
                    key={adj.id}
                    className="flex items-center justify-between rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(adj.tipo)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{adj.nombre}</p>
                        <span className="text-xs text-gray-500">{formatFileSize(adj.tamanio)}</span>
                      </div>
                    </div>
                    {adj.url && (
                      <button
                        onClick={() => handleDownload(adj)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-palette-purple hover:text-palette-dark hover:bg-palette-purple/10 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Descargar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
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
            PDF, DOC, XLS, JPG, PNG - Max {formatFileSize(maxFileSize)} por archivo
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
              className={`flex items-center justify-between rounded-lg p-3 ${
                adj.uploading ? 'bg-blue-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {adj.uploading ? (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : (
                  getFileIcon(adj.tipo)
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{adj.nombre}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{formatFileSize(adj.tamanio)}</span>
                    {adj.uploading && (
                      <span className="text-xs text-blue-600">Subiendo...</span>
                    )}
                    {adj.uploaded && (
                      <span className="text-xs text-green-600">Subido</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {adj.url && !adj.uploading && (
                  <button
                    type="button"
                    onClick={() => handleDownload(adj)}
                    className="p-2 text-gray-400 hover:text-palette-purple hover:bg-palette-purple/10 rounded-lg transition-colors"
                    title="Descargar archivo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                {!adj.uploading && (
                  <button
                    type="button"
                    onClick={() => handleRemove(adj.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
