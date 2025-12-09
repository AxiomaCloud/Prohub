import fs from 'fs';
import path from 'path';

// pdfjs-dist v2.x compatible con CommonJS
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

/**
 * Servicio de extracción básica de datos de facturas SIN usar IA.
 * Usa regex y patrones para extraer datos básicos de facturas argentinas.
 * Esto es GRATIS y se ejecuta al momento de subir el documento.
 */

export interface BasicParseResult {
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
      moneda?: string;
      cae?: string;
    };
  };
  rawText?: string;
  extractionMethod: 'BASIC_REGEX';
}

export class BasicParseService {
  /**
   * Extrae texto de un PDF usando pdfjs-dist
   */
  static async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const uint8Array = new Uint8Array(dataBuffer);

      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;

      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      return '';
    }
  }

  /**
   * Extrae datos básicos de una factura usando regex
   * @param filePath Ruta del archivo PDF
   * @returns Datos básicos extraídos
   */
  static async extractBasicData(filePath: string): Promise<BasicParseResult> {
    const text = await this.extractTextFromPDF(filePath);

    if (!text) {
      return {
        success: false,
        documento: { cabecera: {} },
        extractionMethod: 'BASIC_REGEX'
      };
    }

    const cabecera: BasicParseResult['documento']['cabecera'] = {};

    // Detectar tipo de comprobante
    cabecera.tipoComprobante = this.detectTipoComprobante(text);

    // Extraer número de factura (formato XXXXX-XXXXXXXX)
    const numeroMatch = text.match(/(\d{4,5})[-\s]*(\d{6,8})/);
    if (numeroMatch) {
      cabecera.puntoVenta = numeroMatch[1].padStart(5, '0');
      cabecera.numeroComprobante = numeroMatch[2].padStart(8, '0');
    }

    // Extraer CUIT del emisor
    const cuitMatch = text.match(/(?:CUIT|C\.U\.I\.T\.?)[:\s]*(\d{2}[-.\s]?\d{8}[-.\s]?\d{1})/i);
    if (cuitMatch) {
      cabecera.cuitEmisor = cuitMatch[1].replace(/[-.\s]/g, '');
    }

    // Extraer fecha (varios formatos argentinos)
    cabecera.fecha = this.extractFecha(text);

    // Extraer total
    cabecera.total = this.extractTotal(text);

    // Extraer CAE
    const caeMatch = text.match(/(?:CAE|C\.A\.E\.?)[:\s]*(\d{14})/i);
    if (caeMatch) {
      cabecera.cae = caeMatch[1];
    }

    // Detectar moneda
    if (text.includes('USD') || text.includes('U$S') || text.includes('DÓLARES')) {
      cabecera.moneda = 'USD';
    } else if (text.includes('EUR') || text.includes('EUROS')) {
      cabecera.moneda = 'EUR';
    } else {
      cabecera.moneda = 'ARS';
    }

    // Extraer razón social (buscar después de "Razón Social:" o al inicio)
    const razonMatch = text.match(/(?:Raz[oó]n\s*Social|Denominación)[:\s]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s&.,]+?)(?:\n|C\.?U\.?I\.?T|CUIT)/i);
    if (razonMatch) {
      cabecera.razonSocialEmisor = razonMatch[1].trim().substring(0, 100);
    }

    console.log('📄 [BASIC_PARSE] Extracción básica completada');
    console.log('   Tipo:', cabecera.tipoComprobante || 'No detectado');
    console.log('   Número:', cabecera.puntoVenta && cabecera.numeroComprobante
      ? `${cabecera.puntoVenta}-${cabecera.numeroComprobante}`
      : 'No detectado');
    console.log('   CUIT:', cabecera.cuitEmisor || 'No detectado');
    console.log('   Fecha:', cabecera.fecha || 'No detectada');
    console.log('   Total:', cabecera.total || 'No detectado');

    return {
      success: true,
      documento: { cabecera },
      rawText: text.substring(0, 5000), // Guardar primeros 5000 chars para referencia
      extractionMethod: 'BASIC_REGEX'
    };
  }

  /**
   * Detecta el tipo de comprobante
   */
  private static detectTipoComprobante(text: string): string {
    const upperText = text.toUpperCase();

    if (upperText.includes('NOTA DE CRÉDITO') || upperText.includes('NOTA DE CREDITO')) {
      if (upperText.includes('TIPO A') || /NOTA DE CR[EÉ]DITO\s*A/i.test(text)) return 'NOTA DE CREDITO A';
      if (upperText.includes('TIPO B') || /NOTA DE CR[EÉ]DITO\s*B/i.test(text)) return 'NOTA DE CREDITO B';
      if (upperText.includes('TIPO C') || /NOTA DE CR[EÉ]DITO\s*C/i.test(text)) return 'NOTA DE CREDITO C';
      return 'NOTA DE CREDITO';
    }

    if (upperText.includes('NOTA DE DÉBITO') || upperText.includes('NOTA DE DEBITO')) {
      if (upperText.includes('TIPO A') || /NOTA DE D[EÉ]BITO\s*A/i.test(text)) return 'NOTA DE DEBITO A';
      if (upperText.includes('TIPO B') || /NOTA DE D[EÉ]BITO\s*B/i.test(text)) return 'NOTA DE DEBITO B';
      return 'NOTA DE DEBITO';
    }

    if (upperText.includes('RECIBO')) {
      return 'RECIBO';
    }

    // Facturas
    if (upperText.includes('FACTURA')) {
      // Buscar el tipo de factura (A, B, C, E, M)
      const tipoMatch = text.match(/FACTURA\s*([A-EM])\b/i);
      if (tipoMatch) {
        return `FACTURA ${tipoMatch[1].toUpperCase()}`;
      }

      // Buscar "TIPO A", "TIPO B", etc.
      if (upperText.includes('TIPO A') || /\bA\b/.test(text.substring(0, 200))) return 'FACTURA A';
      if (upperText.includes('TIPO B') || /\bB\b/.test(text.substring(0, 200))) return 'FACTURA B';
      if (upperText.includes('TIPO C')) return 'FACTURA C';
      if (upperText.includes('TIPO E')) return 'FACTURA E';

      return 'FACTURA';
    }

    return 'COMPROBANTE';
  }

  /**
   * Extrae la fecha del documento
   */
  private static extractFecha(text: string): string | undefined {
    // Formato: DD/MM/YYYY o DD-MM-YYYY
    const fechaMatch1 = text.match(/(?:Fecha|Fecha de Emisión)[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
    if (fechaMatch1) {
      const [, day, month, year] = fechaMatch1;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Formato: DD de MES de YYYY
    const meses: Record<string, string> = {
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
      'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
      'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };

    const fechaMatch2 = text.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
    if (fechaMatch2) {
      const [, day, mes, year] = fechaMatch2;
      const month = meses[mes.toLowerCase()];
      if (month) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }

    // Buscar cualquier fecha en el texto
    const anyDateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (anyDateMatch) {
      const [, day, month, year] = anyDateMatch;
      // Validar que sea una fecha razonable
      const d = parseInt(day), m = parseInt(month);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    return undefined;
  }

  /**
   * Extrae el total del documento
   */
  private static extractTotal(text: string): number | undefined {
    // Buscar "TOTAL" seguido de un monto
    const patterns = [
      /TOTAL[:\s$]*\$?\s*([\d.,]+)/i,
      /IMPORTE TOTAL[:\s$]*\$?\s*([\d.,]+)/i,
      /TOTAL A PAGAR[:\s$]*\$?\s*([\d.,]+)/i,
      /MONTO TOTAL[:\s$]*\$?\s*([\d.,]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseAmount(match[1]);
      }
    }

    // Buscar el número más grande que parezca un monto (heurística)
    const amountMatches = text.matchAll(/\$?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/g);
    let maxAmount = 0;

    for (const match of amountMatches) {
      const amount = this.parseAmount(match[1]);
      if (amount && amount > maxAmount && amount < 100000000) { // Limitar a valores razonables
        maxAmount = amount;
      }
    }

    return maxAmount > 0 ? maxAmount : undefined;
  }

  /**
   * Parsea un string de monto a número
   */
  private static parseAmount(amountStr: string): number | undefined {
    if (!amountStr) return undefined;

    // Remover espacios
    let cleaned = amountStr.trim();

    // Formato argentino: 1.234.567,89
    // Formato USA: 1,234,567.89

    // Detectar formato
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');

    if (lastComma > lastDot) {
      // Formato argentino: la coma es el separador decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato USA o sin decimales
      cleaned = cleaned.replace(/,/g, '');
    }

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? undefined : amount;
  }
}
