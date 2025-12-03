import fs from 'fs';
import path from 'path';
import { FormData, File } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

const PARSE_API_URL = process.env.PARSE_API_URL || 'https://parsedemo.axiomacloud.com/api/v1';
const PARSE_API_KEY = process.env.PARSE_API_KEY;

if (!PARSE_API_KEY) {
  console.warn('⚠️  PARSE_API_KEY not configured');
}

interface ParseDocumentResponse {
  success: boolean;
  documento: {
    cabecera: {
      tipoComprobante?: string;
      puntoVenta?: string;
      numeroComprobante?: string;
      fecha?: string;
      cuitEmisor?: string;
      razonSocialEmisor?: string;
      total?: number;
      subtotal?: number;
      iva?: number;
      exento?: number;
      ordenCompra?: string;
      cae?: string;
      moneda?: string;
    };
    items?: Array<{
      numero: number;
      descripcion: string;
      codigoProducto?: string;
      cantidad: number;
      unidad?: string;
      precioUnitario: number;
      subtotal: number;
      alicuotaIva?: number;
      importeIva?: number;
      totalLinea: number;
    }>;
    impuestos?: Array<{
      tipo: string;
      descripcion: string;
      alicuota: number;
      baseImponible: number;
      importe: number;
    }>;
  };
  metadata: {
    tipoDocumento: string;
    modeloIA: string;
    confianza: number;
    processingTimeMs: number;
  };
}

export class ParseService {
  /**
   * Procesa un documento a través de Parse API
   * @param filePath Ruta del archivo a procesar
   * @param originalName Nombre original del archivo
   * @param permissions Permisos para el documento en Parse
   * @returns Datos extraídos del documento
   */
  static async processDocument(
    filePath: string,
    originalName: string,
    permissions: { read?: string[]; write?: string[] } = {}
  ): Promise<ParseDocumentResponse> {
    if (!PARSE_API_KEY) {
      throw new Error('Parse API key not configured');
    }

    try {
      // Crear FormData
      const formData = new FormData();

      // Agregar archivo usando fileFromPath (compatible con fetch)
      const file = await fileFromPath(filePath, originalName);
      formData.append('file', file);

      // Tipo de documento (AUTO = detección automática)
      formData.append('tipoDocumento', 'AUTO');

      console.log(`📤 [PARSE] Enviando documento a Parse API: ${originalName}`);

      // Llamar a Parse API
      // IMPORTANTE: No incluir Content-Type, fetch lo maneja automáticamente con FormData
      const response = await fetch(`${PARSE_API_URL}/parse/document`, {
        method: 'POST',
        headers: {
          'X-API-Key': PARSE_API_KEY,
        },
        body: formData as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [PARSE] Error response: ${errorText}`);
        throw new Error(`Parse API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as ParseDocumentResponse;

      if (!result.success) {
        throw new Error('Parse returned success: false');
      }

      console.log(`✅ [PARSE] Documento procesado exitosamente`);
      console.log(`   Tipo: ${result.metadata.tipoDocumento}`);
      console.log(`   Confianza: ${(result.metadata.confianza * 100).toFixed(1)}%`);
      console.log(`   Tiempo: ${result.metadata.processingTimeMs}ms`);

      return result;
    } catch (error) {
      console.error('❌ [PARSE] Error processing document:', error);
      throw error;
    }
  }

  /**
   * Obtiene los datos de un documento procesado desde Parse
   * @param parseDocumentId ID del documento en Parse
   * @returns Datos del documento
   */
  static async getDocument(parseDocumentId: string): Promise<ParseDocumentResponse> {
    if (!PARSE_API_KEY) {
      throw new Error('Parse API key not configured');
    }

    try {
      const response = await fetch(`${PARSE_API_URL}/documents/${parseDocumentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PARSE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Parse API error: ${response.status}`);
      }

      return await response.json() as ParseDocumentResponse;
    } catch (error) {
      console.error('❌ [PARSE] Error fetching document:', error);
      throw error;
    }
  }

  /**
   * Actualiza los datos de un documento en Parse
   * @param parseDocumentId ID del documento en Parse
   * @param data Datos a actualizar
   */
  static async updateDocument(parseDocumentId: string, data: any): Promise<ParseDocumentResponse> {
    if (!PARSE_API_KEY) {
      throw new Error('Parse API key not configured');
    }

    try {
      const response = await fetch(`${PARSE_API_URL}/documents/${parseDocumentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${PARSE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Parse API error: ${response.status}`);
      }

      return await response.json() as ParseDocumentResponse;
    } catch (error) {
      console.error('❌ [PARSE] Error updating document:', error);
      throw error;
    }
  }

  /**
   * Elimina un documento de Parse
   * @param parseDocumentId ID del documento en Parse
   */
  static async deleteDocument(parseDocumentId: string): Promise<void> {
    if (!PARSE_API_KEY) {
      throw new Error('Parse API key not configured');
    }

    try {
      const response = await fetch(`${PARSE_API_URL}/documents/${parseDocumentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${PARSE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Parse API error: ${response.status}`);
      }

      console.log(`✅ [PARSE] Documento eliminado: ${parseDocumentId}`);
    } catch (error) {
      console.error('❌ [PARSE] Error deleting document:', error);
      throw error;
    }
  }
}
