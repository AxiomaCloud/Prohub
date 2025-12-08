import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { ParseService } from '../services/parseService';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDFs and images
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'));
    }
  }
});

/**
 * POST /api/documents/new
 * Upload a new document
 * (Renombrado de /upload para evitar bloqueo por ad-blockers)
 */
router.post('/new', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      providerTenantId,
      clientTenantId,
      date,
      dueDate,
      purchaseOrderId
    } = req.body;

    // Solo validamos que existan los tenant IDs
    if (!providerTenantId || !clientTenantId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'providerTenantId and clientTenantId are required'
      });
    }

    // Check if file was already uploaded
    const existingDocument = await prisma.document.findFirst({
      where: {
        fileName: req.file.originalname,
        providerTenantId,
        clientTenantId
      }
    });

    if (existingDocument) {
      // Delete the uploaded file since it's a duplicate
      const fs = require('fs');
      const filePath = path.join(__dirname, '../../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.status(409).json({
        error: 'Este archivo ya fue procesado anteriormente',
        message: 'El archivo con este nombre ya existe en el sistema'
      });
    }

    // Create document record con valores por defecto (Parse los actualizará)
    const document = await prisma.document.create({
      data: {
        number: `PENDING-${Date.now()}`, // Número temporal hasta que Parse extraiga el real
        type: 'INVOICE', // Por defecto, Parse puede cambiar esto
        status: 'PROCESSING',
        amount: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency: 'ARS',
        fileUrl: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        providerTenantId,
        clientTenantId,
        uploadedBy: req.user.id,
        date: date ? new Date(date) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        purchaseOrderId: purchaseOrderId || null,
        parseStatus: 'PENDING',
      },
      include: {
        providerTenant: {
          select: {
            id: true,
            name: true,
            taxId: true
          }
        },
        clientTenant: {
          select: {
            id: true,
            name: true,
            taxId: true
          }
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create initial event
    await prisma.documentEvent.create({
      data: {
        documentId: document.id,
        fromStatus: null,
        toStatus: 'PROCESSING',
        reason: 'Document uploaded',
        userId: req.user.id
      }
    });

    console.log(`✅ [DOCUMENTS] Document uploaded: ${document.number} (${document.id})`);

    // Process with Parse API (synchronous - wait for result)
    const filePath = path.join(__dirname, '../../uploads', req.file.filename);

    try {
      console.log(`📤 [PARSE] Sending document to Parse API: ${req.file.originalname}`);

      const parseResult = await ParseService.processDocument(filePath, req.file.originalname, {
        read: [req.user.id],
        write: [req.user.id]
      });

      console.log(`✅ [PARSE] Document processed successfully`);

      // Extract data from Parse response
      const cabecera = parseResult.documento.cabecera;
      const metadata = parseResult.metadata;

      // Map tipo comprobante to our DocumentType
      let docType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RECEIPT' = 'INVOICE';
      if (cabecera.tipoComprobante?.includes('CREDITO')) {
        docType = 'CREDIT_NOTE';
      } else if (cabecera.tipoComprobante?.includes('DEBITO')) {
        docType = 'DEBIT_NOTE';
      } else if (cabecera.tipoComprobante?.includes('RECIBO')) {
        docType = 'RECEIPT';
      }

      // Update document with Parse data
      const updatedDocument = await prisma.document.update({
        where: { id: document.id },
        data: {
          parseStatus: 'COMPLETED',
          parseData: parseResult as any,
          parsedAt: new Date(),
          parseConfidence: metadata.confianza,
          // Update document fields with extracted data
          ...(cabecera.numeroComprobante && {
            number: cabecera.numeroComprobante
          }),
          type: docType,
          ...(cabecera.total && {
            totalAmount: cabecera.total
          }),
          ...(cabecera.subtotal && {
            amount: cabecera.subtotal
          }),
          ...(cabecera.iva && {
            taxAmount: cabecera.iva
          }),
          ...(cabecera.moneda && {
            currency: cabecera.moneda
          }),
          ...(cabecera.fecha && {
            date: new Date(cabecera.fecha)
          }),
        },
        include: {
          providerTenant: {
            select: {
              id: true,
              name: true,
              taxId: true
            }
          },
          clientTenant: {
            select: {
              id: true,
              name: true,
              taxId: true
            }
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      res.status(201).json(updatedDocument);
    } catch (parseError) {
      console.error(`❌ [PARSE] Error processing document ${document.id}:`, parseError);

      // Update document with error
      await prisma.document.update({
        where: { id: document.id },
        data: {
          parseStatus: 'ERROR',
          parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
        }
      });

      // Still return the document with error status
      res.status(201).json({
        ...document,
        parseStatus: 'ERROR',
        parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('❌ [DOCUMENTS] Error uploading document:', error);

    // Delete uploaded file if database operation failed
    if (req.file) {
      const fs = require('fs');
      const filePath = path.join(__dirname, '../../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Provide user-friendly error messages
    let userMessage = 'Error al subir el documento';

    if (error instanceof Error) {
      // Handle Prisma foreign key constraint errors
      if (error.message.includes('Foreign key constraint')) {
        if (error.message.includes('providerTenantId')) {
          userMessage = 'La organización proveedora no existe';
        } else if (error.message.includes('clientTenantId')) {
          userMessage = 'La organización cliente no existe';
        } else {
          userMessage = 'Error de validación: verifique que todas las organizaciones existan';
        }
      }
      // Handle unique constraint errors
      else if (error.message.includes('Unique constraint')) {
        userMessage = 'Este documento ya fue procesado anteriormente';
      }
    }

    res.status(500).json({
      error: userMessage,
      message: userMessage
    });
  }
});

/**
 * POST /api/documents/parse
 * Parse a document without saving it (for preview/matching)
 */
router.post('/parse', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`📤 [PARSE] Parsing document for preview: ${req.file.originalname}`);

    const filePath = path.join(__dirname, '../../uploads', req.file.filename);

    try {
      const parseResult = await ParseService.processDocument(filePath, req.file.originalname, {
        read: [req.user.id],
        write: [req.user.id]
      });

      console.log(`✅ [PARSE] Document parsed successfully`);

      // Extract data from Parse response
      const cabecera: any = parseResult.documento?.cabecera || {};
      const items = parseResult.documento?.items || [];

      // Delete the temporary file after parsing
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Return parsed data without saving to database
      res.json({
        success: true,
        invoiceNumber: cabecera.numeroComprobante || null,
        numero: cabecera.numeroComprobante || null,
        invoiceDate: cabecera.fecha || null,
        fecha: cabecera.fecha || null,
        subtotal: cabecera.subtotal || 0,
        iva: cabecera.iva || 0,
        tax: cabecera.iva || 0,
        total: cabecera.total || 0,
        currency: cabecera.moneda || 'ARS',
        tipoComprobante: cabecera.tipoComprobante || null,
        cuitEmisor: cabecera.cuitEmisor || null,
        cuitReceptor: cabecera.cuitReceptor || null,
        razonSocialEmisor: cabecera.razonSocialEmisor || null,
        razonSocialReceptor: cabecera.razonSocialReceptor || null,
        items: items.map((item: any) => ({
          descripcion: item.descripcion || '',
          cantidad: item.cantidad || 1,
          precioUnitario: item.precioUnitario || 0,
          total: item.total || item.importe || 0,
          codigo: item.codigo || null,
          unidad: item.unidad || null,
        })),
        confidence: parseResult.metadata?.confianza || 0,
        raw: parseResult
      });

    } catch (parseError) {
      console.error(`❌ [PARSE] Error parsing document:`, parseError);

      // Delete the temporary file on error
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(500).json({
        error: 'Error al procesar el documento',
        message: parseError instanceof Error ? parseError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('❌ [PARSE] Error:', error);

    // Clean up file if exists
    if (req.file) {
      const fs = require('fs');
      const filePath = path.join(__dirname, '../../uploads', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      error: 'Error al procesar el documento',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/documents
 * Get documents list with filters
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      tenantId,
      status,
      type,
      providerTenantId,
      clientTenantId,
      supplierId, // Filtro para portal de proveedor
      limit = '50',
      offset = '0'
    } = req.query;

    const where: any = {};

    // Si viene supplierId, buscar el tenant correspondiente al proveedor por CUIT
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId as string }
      });

      if (supplier) {
        // Buscar tenant con el mismo CUIT que el proveedor
        const supplierTenant = await prisma.tenant.findFirst({
          where: { taxId: supplier.cuit }
        });

        if (supplierTenant) {
          // Filtrar documentos donde el proveedor es quien envía
          where.providerTenantId = supplierTenant.id;
        } else {
          // Si no hay tenant para este proveedor, no mostrar documentos
          where.id = 'NO_MATCH';
        }
      }
    } else {
      // Filter by provider or client tenant
      if (tenantId) {
        where.OR = [
          { providerTenantId: tenantId },
          { clientTenantId: tenantId }
        ];
      }
    }

    if (providerTenantId) {
      where.providerTenantId = providerTenantId;
    }

    if (clientTenantId) {
      where.clientTenantId = clientTenantId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        providerTenant: {
          select: {
            id: true,
            name: true,
            taxId: true
          }
        },
        clientTenant: {
          select: {
            id: true,
            name: true,
            taxId: true
          }
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        purchaseOrder: {
          select: {
            id: true,
            number: true
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    const total = await prisma.document.count({ where });

    res.json({
      documents,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('❌ [DOCUMENTS] Error fetching documents:', error);
    res.status(500).json({
      error: 'Error fetching documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/documents/:id
 * Get a specific document
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        providerTenant: true,
        clientTenant: true,
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        purchaseOrder: true,
        timeline: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            attachments: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        attachments: true,
        paymentItems: {
          include: {
            payment: true
          }
        }
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('❌ [DOCUMENTS] Error fetching document:', error);
    res.status(500).json({
      error: 'Error fetching document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete the physical file
    const fs = require('fs');
    const filePath = path.join(__dirname, '../../uploads', path.basename(document.fileUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document from database (cascade will delete related records)
    await prisma.document.delete({
      where: { id }
    });

    console.log(`✅ [DOCUMENTS] Document deleted: ${document.number} (${document.id})`);

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('❌ [DOCUMENTS] Error deleting document:', error);
    res.status(500).json({
      error: 'Error deleting document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/documents/:id
 * Update document data (for review step before presenting)
 */
router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      number,
      type,
      amount,
      taxAmount,
      totalAmount,
      currency,
      date,
      dueDate,
      purchaseOrderId,
      confirm // If true, change status to PRESENTED
    } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Build update data
    const updateData: any = {};

    if (number !== undefined) updateData.number = number;
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (taxAmount !== undefined) updateData.taxAmount = parseFloat(taxAmount);
    if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
    if (currency !== undefined) updateData.currency = currency;
    if (date !== undefined) updateData.date = date ? new Date(date) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (purchaseOrderId !== undefined) updateData.purchaseOrderId = purchaseOrderId || null;

    // If confirming, change status to PRESENTED
    if (confirm) {
      updateData.status = 'PRESENTED';
    }

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        providerTenant: {
          select: {
            id: true,
            name: true,
            taxId: true
          }
        },
        clientTenant: {
          select: {
            id: true,
            name: true,
            taxId: true
          }
        },
        uploader: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create event if status changed
    if (confirm) {
      await prisma.documentEvent.create({
        data: {
          documentId: id,
          fromStatus: document.status,
          toStatus: 'PRESENTED',
          reason: 'Document reviewed and presented',
          userId: req.user.id
        }
      });
    }

    console.log(`✅ [DOCUMENTS] Document updated: ${updatedDocument.number} (${id})`);

    res.json(updatedDocument);
  } catch (error) {
    console.error('❌ [DOCUMENTS] Error updating document:', error);
    res.status(500).json({
      error: 'Error updating document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/documents/:id/status
 * Update document status
 */
router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Validate status
    const validStatuses = ['PROCESSING', 'PRESENTED', 'IN_REVIEW', 'APPROVED', 'PAID', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Update document status
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: { status }
    });

    // Create event
    await prisma.documentEvent.create({
      data: {
        documentId: id,
        fromStatus: document.status,
        toStatus: status,
        reason: reason || null,
        userId: req.user.id
      }
    });

    console.log(`✅ [DOCUMENTS] Status updated: ${document.number} ${document.status} -> ${status}`);

    res.json(updatedDocument);
  } catch (error) {
    console.error('❌ [DOCUMENTS] Error updating status:', error);
    res.status(500).json({
      error: 'Error updating document status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// TODO: Implementar modelo DocumentComment en schema.prisma para habilitar comentarios
// /**
//  * POST /api/documents/:id/comments
//  * Add a comment to a document
//  */
// router.post('/:id/comments', authenticate, async (req: Request, res: Response) => { ... });
// /**
//  * DELETE /api/documents/:id/comments/:commentId
//  * Delete a comment from a document
//  */
// router.delete('/:id/comments/:commentId', authenticate, async (req: Request, res: Response) => { ... });

export default router;
