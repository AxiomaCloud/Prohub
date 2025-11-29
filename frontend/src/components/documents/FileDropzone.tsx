'use client';

import { useCallback, useState } from 'react';
import { Upload, X, FileText, Image, AlertCircle, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  maxSize?: number; // in MB
  selectedFiles: File[];
  multiple?: boolean;
  uploadProgress?: {[key: string]: { status: string; error?: boolean }};
}

export function FileDropzone({
  onFileSelect,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10,
  selectedFiles,
  multiple = true,
  uploadProgress = {}
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `El archivo es demasiado grande. Máximo ${maxSize}MB`;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileMimeType = file.type;

    const isValidExtension = acceptedTypes.some(type =>
      type.startsWith('.') ? fileExtension === type : fileMimeType.includes(type.replace('*', ''))
    );

    if (!isValidExtension) {
      return `Tipo de archivo no válido. Aceptado: ${accept}`;
    }

    return null;
  };

  const handleFiles = (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    const validFiles: File[] = [];

    for (const file of filesArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    setError(null);
    onFileSelect([...selectedFiles, ...validFiles]);
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [selectedFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFileSelect(newFiles);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-5 h-5 text-palette-purple" />;
    }
    return <FileText className="w-5 h-5 text-palette-purple" />;
  };

  return (
    <div className="w-full space-y-4">
      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {selectedFiles.map((file, index) => {
            const progress = uploadProgress[file.name];
            const isPending = progress && progress.status === 'Pendiente';
            const isProcessing = progress && progress.status === 'Subiendo...';
            const isSuccess = progress && progress.status.startsWith('✓');
            const isError = progress && progress.status.startsWith('✗');

            let cardClasses = "border rounded-md p-2 relative group transition-all duration-300";
            if (isPending) {
              cardClasses += " bg-yellow-50 border-yellow-300";
            } else if (isProcessing) {
              cardClasses += " bg-blue-50 border-blue-300 animate-pulse";
            } else if (isSuccess) {
              cardClasses += " bg-green-50 border-green-300";
            } else if (isError) {
              cardClasses += " bg-red-50 border-red-300";
            } else {
              cardClasses += " bg-gray-50 border-border";
            }

            return (
              <div key={index} className={cardClasses}>
                {!progress && (
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-1 right-1 p-0.5 bg-white hover:bg-red-50 rounded shadow-sm transition-colors"
                    title="Eliminar archivo"
                  >
                    <X className="w-3 h-3 text-gray-400 group-hover:text-red-500" />
                  </button>
                )}

                <div className="flex flex-col items-center text-center pt-1">
                  <div className="mb-2">
                    {getFileIcon(file)}
                  </div>

                  <p className="text-xs font-medium text-text-primary truncate w-full px-1">
                    {file.name}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatFileSize(file.size)}
                  </p>

                  {progress && (
                    <div className={`flex items-center gap-1.5 text-xs mt-2 px-2 py-1 rounded font-medium ${
                      isPending ? 'text-yellow-700 bg-yellow-100' :
                      isSuccess ? 'text-green-700 bg-green-100' :
                      isError ? 'text-red-700 bg-red-100' :
                      'text-blue-700 bg-blue-100'
                    }`}>
                      {isPending && <Clock className="w-3.5 h-3.5" />}
                      {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {isSuccess && <CheckCircle className="w-3.5 h-3.5" />}
                      {isError && <XCircle className="w-3.5 h-3.5" />}
                      <span>{progress.status}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(multiple || selectedFiles.length === 0) && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8
            transition-all duration-200 cursor-pointer
            ${isDragging
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-border hover:border-primary/50 hover:bg-gray-50'
            }
          `}
        >
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center justify-center text-center">
            <div className={`
              mb-4 p-4 rounded-full
              ${isDragging ? 'bg-primary/10' : 'bg-palette-dark/5'}
              transition-colors
            `}>
              <Upload className={`
                w-10 h-10
                ${isDragging ? 'text-primary' : 'text-palette-dark'}
                transition-colors
              `} />
            </div>

            <p className="text-lg font-medium text-text-primary mb-2">
              {isDragging
                ? 'Suelta los archivos aquí'
                : multiple
                  ? 'Arrastra archivos o haz clic para seleccionar'
                  : 'Arrastra un archivo o haz clic para seleccionar'
              }
            </p>

            <p className="text-sm text-text-secondary">
              Formatos aceptados: {accept.replace(/\./g, '').toUpperCase()}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              {multiple ? 'Puedes subir múltiples archivos • ' : ''}Tamaño máximo: {maxSize}MB por archivo
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
