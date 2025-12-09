'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from './FileDropzone';
import { DocumentoParseEditView } from './DocumentoParseEditView';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  Upload,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Eye,
  FileText,
  AlertCircle,
  Bot,
  FileEdit
} from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Props opcionales para portal de proveedor
  supplierCuit?: string;  // CUIT del proveedor (para buscar su tenant)
  clientTenantId?: string; // Tenant del cliente al que factura
  useAI?: boolean; // Si es false, usa extracción básica sin IA (default: true para tenant, false para proveedor)
  asDraft?: boolean; // Si es true, crea el documento como borrador (default: true para proveedor)
}

type UploadStep = 'select' | 'uploading' | 'review' | 'success';

interface ParsedDocument {
  id: string;
  number: string;
  type: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RECEIPT';
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  date: string | null;
  dueDate: string | null;
  fileUrl: string;
  parseData?: any;
  parseConfidence?: number;
}

export function DocumentUploadModal({ isOpen, onClose, onSuccess, supplierCuit, clientTenantId, useAI, asDraft }: DocumentUploadModalProps) {
  // Por defecto: proveedor crea como borrador, tenant no
  const shouldCreateAsDraft = asDraft !== undefined ? asDraft : !!supplierCuit;
  const router = useRouter();
  const { user, tenant } = useAuth();

  const [step, setStep] = useState<UploadStep>('select');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: { status: string; error?: boolean }}>({});
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; documentId?: string }>({ success: 0, failed: 0 });

  // Siempre usar extracción con IA (Axio)
  const enableAI = true;

  // Review step state
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleClose = () => {
    if (step !== 'uploading' && !isConfirming) {
      setStep('select');
      setSelectedFiles([]);
      setUploadProgress({});
      setUploadResults({ success: 0, failed: 0 });
      setParsedDocument(null);
      onClose();
    }
  };

  const handleFileSelect = (files: File[]) => {
    const newFiles = files.filter(file => !uploadProgress[file.name]);

    const newProgress: {[key: string]: { status: string; error?: boolean }} = {};
    newFiles.forEach(file => {
      if (!uploadProgress[file.name]) {
        newProgress[file.name] = { status: 'Pendiente', error: false };
      }
    });

    if (Object.keys(newProgress).length > 0) {
      setUploadProgress(prev => ({ ...prev, ...newProgress }));
    }

    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setStep('uploading');

    const token = localStorage.getItem('hub_token');
    if (!token) {
      handleClose();
      router.push('/auth/login');
      return;
    }

    const tenants = user?.tenantMemberships?.map(m => m.tenant) || [];
    if (tenants.length === 0 && !supplierCuit) {
      handleClose();
      return;
    }

    // Si viene supplierCuit (portal de proveedor), usamos eso para buscar/crear el tenant
    // Si no, usamos los tenants del usuario
    let providerTenantIdToUse = tenants[0]?.id;
    let clientTenantIdToUse = clientTenantId || (tenants.length >= 2 ? tenants[1].id : tenants[0]?.id);

    const results = { success: 0, failed: 0, documentId: '' };

    // Process only first file for review flow
    const file = selectedFiles[0];

    setUploadProgress(prev => ({
      ...prev,
      [file.name]: { status: 'Subiendo...', error: false }
    }));

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      // Si viene supplierCuit, el backend buscará/creará el tenant del proveedor
      if (supplierCuit) {
        uploadData.append('supplierCuit', supplierCuit);
        uploadData.append('clientTenantId', clientTenantIdToUse);
      } else {
        uploadData.append('providerTenantId', providerTenantIdToUse);
        uploadData.append('clientTenantId', clientTenantIdToUse);
      }

      // Determinar si usar IA o extracción básica (según el switch)
      uploadData.append('useAI', enableAI ? 'true' : 'false');

      // Si es borrador, enviar como draft
      if (shouldCreateAsDraft) {
        uploadData.append('asDraft', 'true');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/documents/new`, {
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

      const result = await response.json();

      if (result.parseStatus === 'ERROR') {
        throw new Error(result.parseError || 'Error al procesar el documento');
      }

      results.success++;
      results.documentId = result.id;

      setUploadProgress(prev => ({
        ...prev,
        [file.name]: { status: '✓ Procesado', error: false }
      }));

      // Set parsed document for review
      setParsedDocument({
        id: result.id,
        number: result.number,
        type: result.type,
        amount: result.amount || 0,
        taxAmount: result.taxAmount || 0,
        totalAmount: result.totalAmount || 0,
        currency: result.currency || 'ARS',
        date: result.date,
        dueDate: result.dueDate,
        fileUrl: result.fileUrl,
        parseData: result.parseData,
        parseConfidence: result.parseConfidence
      });

      setUploadResults(results);

      // Move to review step
      setStep('review');

    } catch (error) {
      results.failed++;
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setUploadProgress(prev => ({
        ...prev,
        [file.name]: { status: `✗ ${errorMsg}`, error: true }
      }));
      setUploadResults(results);
      setStep('success'); // Show error state
    }
  };

  const handleConfirmDocument = async () => {
    if (!parsedDocument) return;

    setIsConfirming(true);

    try {
      const token = localStorage.getItem('hub_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // Extraer datos de la cabecera del parseData editado
      const cabecera = parsedDocument.parseData?.documento?.cabecera || {};

      const response = await fetch(`${apiUrl}/api/documents/${parsedDocument.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: `${cabecera.puntoVenta || '0001'}-${cabecera.numeroComprobante || '00000001'}`,
          amount: cabecera.subtotal || parsedDocument.amount,
          taxAmount: cabecera.iva || parsedDocument.taxAmount,
          totalAmount: cabecera.total || parsedDocument.totalAmount,
          currency: cabecera.moneda || parsedDocument.currency,
          date: cabecera.fecha || parsedDocument.date,
          parseData: parsedDocument.parseData,
          confirm: true
        })
      });

      if (!response.ok) {
        throw new Error('Error al confirmar documento');
      }

      setStep('success');
    } catch (error) {
      console.error('Error confirming document:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleViewDocument = () => {
    if (parsedDocument?.id || uploadResults.documentId) {
      router.push(`/documentos/${parsedDocument?.id || uploadResults.documentId}`);
    }
    handleClose();
  };

  const handleUploadAnother = () => {
    setStep('select');
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadResults({ success: 0, failed: 0 });
    setParsedDocument(null);
  };

  const handleGoToList = () => {
    if (onSuccess) {
      onSuccess();
    }
    handleClose();
  };

  // Tamaño del modal según el paso
  const modalSize = step === 'review' ? '2xl' : 'lg';

  return (
    <Modal open={isOpen} onClose={handleClose} size={modalSize}>
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">
            {step === 'select' && 'Subir Comprobante'}
            {step === 'uploading' && 'Procesando Comprobante'}
            {step === 'review' && 'Revisar Datos Extraídos'}
            {step === 'success' && 'Comprobante enviado'}
          </h2>
          {step !== 'uploading' && !isConfirming && (
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Files */}
          {step === 'select' && (
            <div className="space-y-4">
              <FileDropzone
                onFileSelect={handleFileSelect}
                selectedFiles={selectedFiles}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10}
                multiple={false}
                uploadProgress={uploadProgress}
              />

              {selectedFiles.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>{selectedFiles.length}</strong> archivo listo para subir.
                    Los datos se extraerán automáticamente y podrás revisarlos antes de enviar.
                  </p>
                </div>
              )}

              {/* Mensaje informativo sobre extracción con Axio */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Bot className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Extracción inteligente con Axio
                  </p>
                  <p className="text-xs text-text-secondary">
                    Los datos del comprobante se extraerán automáticamente para tu revisión
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Procesar
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Uploading */}
          {step === 'uploading' && (
            <div className="space-y-6 py-8">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <Bot className="w-10 h-10 text-white animate-pulse" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                  <h3 className="text-lg font-medium text-text-primary">
                    Extrayendo con Axio
                  </h3>
                </div>
                <p className="text-sm text-text-secondary text-center">
                  Analizando el documento y extrayendo información...
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => {
                  const progress = uploadProgress[file.name];
                  const isProcessing = progress?.status === 'Subiendo...';
                  const isSuccess = progress?.status.startsWith('✓');
                  const isError = progress?.status.startsWith('✗');

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isSuccess ? 'bg-green-50 border-green-200' :
                        isError ? 'bg-red-50 border-red-200' :
                        isProcessing ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-text-secondary" />
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {file.name}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${
                        isSuccess ? 'text-green-700' :
                        isError ? 'text-red-700' :
                        isProcessing ? 'text-blue-700' :
                        'text-gray-500'
                      }`}>
                        {progress?.status || 'Pendiente'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && parsedDocument && (
            <div className="space-y-4">
              {/* Confidence indicator */}
              <div className={`flex items-center gap-2 p-3 rounded-lg ${
                parsedDocument.parseConfidence && parsedDocument.parseConfidence >= 0.8 ? 'bg-green-50 text-green-700' :
                parsedDocument.parseConfidence && parsedDocument.parseConfidence >= 0.5 ? 'bg-yellow-50 text-yellow-700' :
                'bg-purple-50 text-purple-700'
              }`}>
                <Bot className="w-4 h-4" />
                <span className="text-sm">
                  {parsedDocument.parseConfidence
                    ? `Axio extrajo los datos con ${Math.round(parsedDocument.parseConfidence * 100)}% de confianza${parsedDocument.parseConfidence < 0.8 ? ' - Revisa los datos cuidadosamente' : ''}`
                    : 'Datos extraídos con Axio - Revisa y completa la información'}
                </span>
              </div>

              {/* Editable Extracted Data */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Datos extraídos - Edita lo que necesites
                </h3>
                <DocumentoParseEditView
                  parseData={parsedDocument.parseData}
                  onChange={(newParseData) => {
                    setParsedDocument(prev => prev ? {
                      ...prev,
                      parseData: newParseData,
                      // Actualizar campos del documento desde la cabecera
                      totalAmount: newParseData?.documento?.cabecera?.total || prev.totalAmount,
                      amount: newParseData?.documento?.cabecera?.subtotal || prev.amount,
                      taxAmount: newParseData?.documento?.cabecera?.iva || prev.taxAmount,
                      currency: newParseData?.documento?.cabecera?.moneda || prev.currency,
                    } : null);
                  }}
                />
              </div>

              <div className="flex justify-between pt-4 border-t border-border">
                <Button variant="outline" onClick={handleUploadAnother}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Subir otro
                </Button>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button onClick={handleConfirmDocument} disabled={isConfirming}>
                    {isConfirming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirmar y Enviar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center text-center">
                {uploadResults.success > 0 ? (
                  <>
                    <div className={`w-16 h-16 ${shouldCreateAsDraft ? 'bg-orange-100' : 'bg-green-100'} rounded-full flex items-center justify-center mb-4`}>
                      {shouldCreateAsDraft ? (
                        <FileEdit className="w-8 h-8 text-orange-600" />
                      ) : (
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      {shouldCreateAsDraft ? 'Borrador guardado' : 'Comprobante enviado exitosamente'}
                    </h3>
                    <p className="text-sm text-text-secondary mt-2">
                      {shouldCreateAsDraft
                        ? 'El documento se guardó como borrador. Podrás revisarlo y enviarlo cuando estés listo.'
                        : 'El documento ha sido presentado y está pendiente de revisión.'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      Error al procesar el documento
                    </h3>
                    <p className="text-sm text-red-600">
                      Por favor intenta nuevamente o contacta soporte.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4 border-t border-border">
                {uploadResults.success > 0 && (parsedDocument?.id || uploadResults.documentId) && (
                  <Button onClick={handleViewDocument}>
                    <Eye className="w-4 h-4 mr-2" />
                    Ver documento
                  </Button>
                )}
                <Button variant="outline" onClick={handleUploadAnother}>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir otro
                </Button>
                <Button variant="outline" onClick={handleGoToList}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al listado
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
