import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Configurar directorio de uploads
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'attachments');

// Crear directorio si no existe
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configurar multer para almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    cb(null, `${uniqueSuffix}-${baseName}${ext}`);
  },
});

// Filtro de tipos de archivo permitidos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

/**
 * POST /api/attachments/upload
 * Sube un archivo y lo asocia a un requerimiento
 */
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const { purchaseRequestId, esEspecificacion } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
      }

      if (!purchaseRequestId) {
        // Eliminar archivo si no hay purchaseRequestId
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'purchaseRequestId es requerido' });
      }

      // Verificar que el requerimiento existe
      const purchaseRequest = await prisma.purchaseRequest.findUnique({
        where: { id: purchaseRequestId },
      });

      if (!purchaseRequest) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ error: 'Requerimiento no encontrado' });
      }

      // Crear registro en la base de datos
      const attachment = await prisma.purchaseRequestAttachment.create({
        data: {
          purchaseRequestId,
          nombre: file.originalname,
          tipo: file.mimetype,
          tamanio: file.size,
          url: `/api/attachments/download/${file.filename}`,
          esEspecificacion: esEspecificacion === 'true' || esEspecificacion === true,
          estado: 'PENDIENTE',
        },
      });

      console.log(`✅ Archivo subido: ${file.originalname} -> ${file.filename}`);

      res.status(201).json({
        id: attachment.id,
        nombre: attachment.nombre,
        tipo: attachment.tipo,
        tamanio: attachment.tamanio,
        url: attachment.url,
        esEspecificacion: attachment.esEspecificacion,
        estado: attachment.estado,
      });
    } catch (error) {
      console.error('Error al subir archivo:', error);
      // Limpiar archivo si hubo error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      res.status(500).json({ error: 'Error al subir el archivo' });
    }
  }
);

/**
 * POST /api/attachments/upload-multiple
 * Sube múltiples archivos
 */
router.post(
  '/upload-multiple',
  authenticate,
  upload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { purchaseRequestId, esEspecificacion } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No se recibieron archivos' });
      }

      if (!purchaseRequestId) {
        // Eliminar archivos
        files.forEach((f) => {
          try {
            fs.unlinkSync(f.path);
          } catch {}
        });
        return res.status(400).json({ error: 'purchaseRequestId es requerido' });
      }

      // Verificar que el requerimiento existe
      const purchaseRequest = await prisma.purchaseRequest.findUnique({
        where: { id: purchaseRequestId },
      });

      if (!purchaseRequest) {
        files.forEach((f) => {
          try {
            fs.unlinkSync(f.path);
          } catch {}
        });
        return res.status(404).json({ error: 'Requerimiento no encontrado' });
      }

      // Crear registros en la base de datos
      const attachments = await Promise.all(
        files.map((file) =>
          prisma.purchaseRequestAttachment.create({
            data: {
              purchaseRequestId,
              nombre: file.originalname,
              tipo: file.mimetype,
              tamanio: file.size,
              url: `/api/attachments/download/${file.filename}`,
              esEspecificacion: esEspecificacion === 'true' || esEspecificacion === true,
              estado: 'PENDIENTE',
            },
          })
        )
      );

      console.log(`✅ ${files.length} archivos subidos para requerimiento ${purchaseRequestId}`);

      res.status(201).json({
        attachments: attachments.map((att) => ({
          id: att.id,
          nombre: att.nombre,
          tipo: att.tipo,
          tamanio: att.tamanio,
          url: att.url,
          esEspecificacion: att.esEspecificacion,
          estado: att.estado,
        })),
      });
    } catch (error) {
      console.error('Error al subir archivos:', error);
      res.status(500).json({ error: 'Error al subir los archivos' });
    }
  }
);

/**
 * GET /api/attachments/download/:filename
 * Descarga un archivo
 */
router.get('/download/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Buscar el attachment en la BD para obtener el nombre original
    const attachment = await prisma.purchaseRequestAttachment.findFirst({
      where: {
        url: `/api/attachments/download/${filename}`,
      },
    });

    const downloadName = attachment?.nombre || filename;

    // Enviar archivo
    res.download(filePath, downloadName, (err) => {
      if (err) {
        console.error('Error al descargar archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al descargar el archivo' });
        }
      }
    });
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({ error: 'Error al descargar el archivo' });
  }
});

/**
 * DELETE /api/attachments/:id
 * Elimina un adjunto
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.purchaseRequestAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Adjunto no encontrado' });
    }

    // Extraer filename de la URL
    const filename = attachment.url.replace('/api/attachments/download/', '');
    const filePath = path.join(UPLOADS_DIR, filename);

    // Eliminar archivo físico
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar registro de BD
    await prisma.purchaseRequestAttachment.delete({
      where: { id },
    });

    console.log(`✅ Adjunto eliminado: ${attachment.nombre}`);

    res.json({ message: 'Adjunto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar adjunto:', error);
    res.status(500).json({ error: 'Error al eliminar el adjunto' });
  }
});

/**
 * POST /api/attachments/upload-generic
 * Sube un archivo sin asociarlo a ninguna entidad
 * Útil para RFQ y otras entidades que guardan adjuntos como JSON
 */
router.post(
  '/upload-generic',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
      }

      const fileUrl = `/api/attachments/download/${file.filename}`;

      console.log(`✅ Archivo genérico subido: ${file.originalname} -> ${file.filename}`);

      res.status(201).json({
        fileName: file.originalname,
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
      });
    } catch (error) {
      console.error('Error al subir archivo:', error);
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      res.status(500).json({ error: 'Error al subir el archivo' });
    }
  }
);

/**
 * GET /api/attachments/purchase-request/:purchaseRequestId
 * Lista adjuntos de un requerimiento
 */
router.get(
  '/purchase-request/:purchaseRequestId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { purchaseRequestId } = req.params;

      const attachments = await prisma.purchaseRequestAttachment.findMany({
        where: { purchaseRequestId },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        adjuntos: attachments.map((att) => ({
          id: att.id,
          nombre: att.nombre,
          tipo: att.tipo,
          tamanio: att.tamanio,
          url: att.url,
          esEspecificacion: att.esEspecificacion,
          estado: att.estado,
          createdAt: att.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error al listar adjuntos:', error);
      res.status(500).json({ error: 'Error al listar adjuntos' });
    }
  }
);

export default router;
