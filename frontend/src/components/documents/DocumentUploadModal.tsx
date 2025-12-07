'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FileDropzone } from './FileDropzone';
import { useAuth } from '@/contexts/AuthContext';
import {
  X,
  Upload,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Eye,
  FileText,
  Edit3,
  Calendar,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

const documentTypeLabels: Record<string, string> = {
  INVOICE: 'Factura',
  CREDIT_NOTE: 'Nota de Crédito',
  DEBIT_NOTE: 'Nota de Débito',
  RECEIPT: 'Recibo'
};

export function DocumentUploadModal({ isOpen, onClose, onSuccess }: DocumentUploadModalProps) {
  const router = useRouter();
  const { user, tenant } = useAuth();

  const [step, setStep] = useState<UploadStep>('select');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: { status: string; error?: boolean }}>({});
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; documentId?: string }>({ success: 0, failed: 0 });

  // Review step state
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null);
  const [editedData, setEditedData] = useState<Partial<ParsedDocument>>({});
  const [isConfirming, setIsConfirming] = useState(false);

  const handleClose = () => {
    if (step !== 'uploading' && !isConfirming) {
      setStep('select');
      setSelectedFiles([]);
      setUploadProgress({});
      setUploadResults({ success: 0, failed: 0 });
      setParsedDocument(null);
      setEditedData({});
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
    if (tenants.length === 0) {
      handleClose();
      return;
    }

    const providerTenantId = tenants[0].id;
    const clientTenantId = tenants.length >= 2 ? tenants[1].id : tenants[0].id;

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
      uploadData.append('providerTenantId', providerTenantId);
      uploadData.append('clientTenantId', clientTenantId);

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

      setEditedData({
        number: result.number,
        type: result.type,
        amount: result.amount || 0,
        taxAmount: result.taxAmount || 0,
        totalAmount: result.totalAmount || 0,
        currency: result.currency || 'ARS',
        date: result.date ? result.date.split('T')[0] : '',
        dueDate: result.dueDate ? result.dueDate.split('T')[0] : ''
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

      const response = await fetch(`${apiUrl}/api/documents/${parsedDocument.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...editedData,
          confirm: true // This will change status to PRESENTED
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
    setEditedData({});
  };

  const handleGoToList = () => {
    if (onSuccess) {
      onSuccess();
    }
    handleClose();
  };

  const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const handleEditField = (field: keyof ParsedDocument, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-calculate total if amount or tax changes
    if (field === 'amount' || field === 'taxAmount') {
      const newAmount = field === 'amount' ? parseFloat(value) || 0 : parseFloat(editedData.amount?.toString() || '0');
      const newTax = field === 'taxAmount' ? parseFloat(value) || 0 : parseFloat(editedData.taxAmount?.toString() || '0');
      setEditedData(prev => ({
        ...prev,
        [field]: value,
        totalAmount: newAmount + newTax
      }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={step === 'review' ? 'xl' : 'lg'}>
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
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  Axioma Parse - IA en acción
                </h3>
                <p className="text-sm text-text-secondary text-center">
                  Analizando y extrayendo datos del documento...
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
            <div className="space-y-6">
              {/* Confidence indicator */}
              {parsedDocument.parseConfidence && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  parsedDocument.parseConfidence >= 0.8 ? 'bg-green-50 text-green-700' :
                  parsedDocument.parseConfidence >= 0.5 ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">
                    Confianza de extracción: {Math.round(parsedDocument.parseConfidence * 100)}%
                    {parsedDocument.parseConfidence < 0.8 && ' - Por favor revisa los datos cuidadosamente'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* PDF Preview */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Vista previa del documento
                  </h3>
                  <div className="border border-border rounded-lg overflow-hidden bg-gray-100 h-[400px]">
                    <iframe
                      src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${parsedDocument.fileUrl}`}
                      className="w-full h-full"
                      title="Document preview"
                    />
                  </div>
                </div>

                {/* Extracted Data Form */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Datos extraídos (editables)
                  </h3>

                  <div className="space-y-4">
                    {/* Document Type */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Tipo de Comprobante
                      </label>
                      <select
                        value={editedData.type || ''}
                        onChange={(e) => handleEditField('type', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {Object.entries(documentTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Number */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Número de Comprobante
                      </label>
                      <input
                        type="text"
                        value={editedData.number || ''}
                        onChange={(e) => handleEditField('number', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Fecha Emisión
                        </label>
                        <input
                          type="date"
                          value={editedData.date || ''}
                          onChange={(e) => handleEditField('date', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Vencimiento
                        </label>
                        <input
                          type="date"
                          value={editedData.dueDate || ''}
                          onChange={(e) => handleEditField('dueDate', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        Moneda
                      </label>
                      <select
                        value={editedData.currency || 'ARS'}
                        onChange={(e) => handleEditField('currency', e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ARS">ARS - Peso Argentino</option>
                        <option value="USD">USD - Dólar</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    </div>

                    {/* Amounts */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          <DollarSign className="w-3 h-3 inline mr-1" />
                          Neto
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedData.amount || 0}
                          onChange={(e) => handleEditField('amount', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          IVA
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedData.taxAmount || 0}
                          onChange={(e) => handleEditField('taxAmount', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          Total
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedData.totalAmount || 0}
                          onChange={(e) => handleEditField('totalAmount', e.target.value)}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
                        />
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-text-secondary">Total a presentar:</span>
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(editedData.totalAmount || 0, editedData.currency || 'ARS')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
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
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      Comprobante enviado exitosamente
                    </h3>
                    <p className="text-sm text-text-secondary mt-2">
                      El documento ha sido presentado y está pendiente de revisión.
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
