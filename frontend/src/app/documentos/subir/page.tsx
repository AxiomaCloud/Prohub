'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropzone } from '@/components/documents/FileDropzone';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/shared/PageHeader';
import { useConfirmDialog } from '@/hooks/useConfirm';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Upload, Loader2 } from 'lucide-react';

export default function UploadDocumentPage() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const { user } = useAuth();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: { status: string; error?: boolean }}>({});
  const [uploadCompleted, setUploadCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      await confirm('Por favor, selecciona al menos un archivo para subir', 'Error', 'danger');
      return;
    }

    setLoading(true);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Obtener token de localStorage
    const token = localStorage.getItem('prohub_token');
    if (!token) {
      await confirm('No hay sesión activa. Por favor, inicia sesión nuevamente.', 'Error', 'danger');
      router.push('/auth/login');
      setLoading(false);
      return;
    }

    // Obtener tenant IDs del usuario
    const tenants = user?.tenantMemberships?.map(m => m.tenant) || [];
    console.log('👤 User:', user);
    console.log('🏢 Tenants:', tenants);
    if (tenants.length === 0) {
      await confirm(
        'Necesitas pertenecer al menos a una organización para subir documentos.',
        'Error',
        'danger'
      );
      setLoading(false);
      return;
    }

    // Usar el primer tenant como proveedor
    // Si hay 2+ tenants, usar el segundo como cliente; sino, usar el mismo
    const providerTenantId = tenants[0].id;
    const clientTenantId = tenants.length >= 2 ? tenants[1].id : tenants[0].id;

    try {
      // Subir cada archivo
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Si el archivo ya fue procesado (tiene estado de éxito o error), saltarlo
        const fileProgress = uploadProgress[file.name];
        if (fileProgress && (fileProgress.status.startsWith('✓') || fileProgress.status.startsWith('✗'))) {
          continue; // Saltar este archivo
        }

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'Subiendo...', error: false }
        }));

        try {
          // Create FormData for multipart/form-data
          const uploadData = new FormData();
          uploadData.append('file', file);

          // Solo enviamos el archivo y los tenant IDs
          // Parse extraerá todos los datos automáticamente
          uploadData.append('providerTenantId', providerTenantId);
          uploadData.append('clientTenantId', clientTenantId);

          const response = await fetch('http://localhost:4000/api/documents/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: uploadData
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Error al subir documento');
          }

          // Verificar la respuesta
          const result = await response.json();

          // Verificar si Parse falló
          if (result.parseStatus === 'ERROR') {
            throw new Error(result.parseError || 'Error al procesar el documento con Parse');
          }

          results.success++;
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: 'Subido y procesado', error: false }
          }));
        } catch (error) {
          results.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
          results.errors.push(`${file.name}: ${errorMsg}`);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { status: `✗ ${errorMsg}`, error: true }
          }));
        }
      }

      // Marcar como completado
      setUploadCompleted(true);
    } finally {
      setLoading(false);
      // NO limpiamos uploadProgress para que el usuario vea el resultado
    }
  };

  const handleFileSelect = (files: File[]) => {
    // Detectar archivos nuevos (que no están en uploadProgress o en selectedFiles anteriores)
    const newFiles = files.filter(file => !uploadProgress[file.name]);

    // Crear progress para archivos nuevos con estado "Pendiente"
    const newProgress: {[key: string]: { status: string; error?: boolean }} = {};
    newFiles.forEach(file => {
      newProgress[file.name] = { status: 'Pendiente', error: false };
    });

    // Actualizar el estado de archivos sin sobrescribir los ya procesados
    if (Object.keys(newProgress).length > 0) {
      setUploadProgress(prev => ({ ...prev, ...newProgress }));
      setUploadCompleted(false); // Hay archivos nuevos pendientes
    }

    setSelectedFiles(files);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Subir Documentos"
        subtitle="Arrastra tus facturas, notas de crédito o recibos. Los datos se extraerán automáticamente."
      />

      <div className="bg-white rounded-lg shadow-sm border border-border p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <FileDropzone
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              accept=".pdf,.jpg,.jpeg,.png"
              maxSize={10}
              multiple={true}
              uploadProgress={uploadProgress}
            />
          </div>

          {/* Info */}
          {selectedFiles.length > 0 && !loading && (
            <div className="bg-palette-yellow/10 border border-palette-yellow/30 rounded-lg p-4">
              <p className="text-sm text-palette-dark">
                <strong>{selectedFiles.length}</strong> archivo{selectedFiles.length > 1 ? 's' : ''} listo{selectedFiles.length > 1 ? 's' : ''} para subir.
                {' '}Los datos se extraerán automáticamente usando OCR y podrás revisarlos antes de confirmar.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            {!uploadCompleted && (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
            {uploadCompleted ? (
              <Button
                type="button"
                onClick={() => router.push('/documentos')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading || selectedFiles.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Subir {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
