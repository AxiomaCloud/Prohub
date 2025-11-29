# INTEGRACIÓN CON AXIOMA PARSE

Documentación técnica de la integración entre Hub y Parse para escaneo automático de documentos con IA.

---

## 🎯 OBJETIVO

**❌ Competencia:**
- Proveedor sube PDF
- Completa manualmente 10+ campos
- Proceso tedioso de 5-10 minutos por documento
- Errores de tipeo frecuentes
- Solo acepta PDF

**✅ Hub + Parse:**
- Proveedor arrastra archivo (PDF, JPG, PNG, etc.)
- Parse escanea con IA en segundos
- Datos extraídos automáticamente
- Proveedor solo confirma
- Proceso completo en menos de 1 minuto

---

## 🏗️ ARQUITECTURA DE INTEGRACIÓN

### Diagrama de Flujo

```
┌─────────────┐
│   HUB    │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. Upload archivo
       ▼
┌──────────────┐
│   Hub     │
│   Backend    │
│  (Next.js)   │
└──────┬───────┘
       │
       │ 2. Guarda en S3
       │ 3. Envía a Parse
       ▼
┌──────────────┐
│    PARSE     │
│  (Backend)   │
│  + IA/OCR    │
└──────┬───────┘
       │
       │ 4. Extrae datos
       ▼
┌──────────────┐
│   Hub     │
│   Backend    │
└──────┬───────┘
       │
       │ 5. Retorna datos
       ▼
┌──────────────┐
│   Hub     │
│  (Frontend)  │
│  Muestra     │
│  resultados  │
└──────────────┘
```

### Componentes

1. **Hub Frontend**: Interfaz de carga
2. **Hub Backend**: API y orquestación
3. **AWS S3**: Almacenamiento de archivos
4. **Parse Backend**: Motor de IA/OCR
5. **Base de Datos**: PostgreSQL compartida o separada

---

## 📡 API DE PARSE

### Endpoints Disponibles

Basado en el sistema existente de Parse:

#### 1. **POST /api/parse/document**

Envía un documento para análisis.

**Request:**
```json
{
  "fileUrl": "https://s3.amazonaws.com/hub/docs/factura-123.pdf",
  "fileName": "factura-123.pdf",
  "fileType": "application/pdf",
  "tenantId": "tenant_empresa_a",
  "userId": "user_12345",
  "context": {
    "expectedType": "INVOICE", // INVOICE, CREDIT_NOTE, DEBIT_NOTE
    "clientTenant": "tenant_empresa_b"
  }
}
```

**Response:**
```json
{
  "success": true,
  "parseJobId": "parse_job_abc123",
  "status": "PROCESSING",
  "estimatedTime": 15 // segundos
}
```

#### 2. **GET /api/parse/document/:jobId**

Consulta el estado del análisis.

**Response (Processing):**
```json
{
  "jobId": "parse_job_abc123",
  "status": "PROCESSING",
  "progress": 60,
  "message": "Extrayendo datos de la factura..."
}
```

**Response (Completed):**
```json
{
  "jobId": "parse_job_abc123",
  "status": "COMPLETED",
  "data": {
    "documentType": "INVOICE",
    "confidence": 0.98,
    "extractedData": {
      "number": "F-001-00045678",
      "date": "2025-11-13",
      "dueDate": "2025-12-13",
      "issuer": {
        "name": "Proveedor ABC SA",
        "taxId": "30-12345678-9",
        "address": "Av. Corrientes 1234, CABA"
      },
      "recipient": {
        "name": "Empresa B SRL",
        "taxId": "30-98765432-1"
      },
      "amounts": {
        "subtotal": 50000.00,
        "tax": 10500.00,
        "total": 60500.00,
        "currency": "ARS"
      },
      "items": [
        {
          "description": "Servicios de Consultoría - Noviembre 2025",
          "quantity": 1,
          "unitPrice": 50000.00,
          "total": 50000.00
        }
      ],
      "relatedDocuments": {
        "purchaseOrder": "OC-2024-1234" // Detectado automáticamente
      }
    },
    "rawText": "FACTURA\nNúmero: F-001-00045678\n...",
    "metadata": {
      "pageCount": 1,
      "processingTime": 12.5,
      "ocrEngine": "tesseract-5.0 + gpt-4-vision"
    }
  }
}
```

**Response (Error):**
```json
{
  "jobId": "parse_job_abc123",
  "status": "ERROR",
  "error": {
    "code": "INVALID_FORMAT",
    "message": "No se pudo leer el documento. Formato corrupto."
  }
}
```

#### 3. **POST /api/parse/document/:jobId/feedback**

Envía correcciones del usuario para mejorar el modelo.

**Request:**
```json
{
  "corrections": {
    "number": {
      "parsed": "F-OO1-00045678",
      "correct": "F-001-00045678"
    },
    "total": {
      "parsed": 60500.00,
      "correct": 60500.00 // Confirmación
    }
  }
}
```

---

## 🔄 FLUJO DE INTEGRACIÓN COMPLETO

### 1. Upload de Archivo

```typescript
// app/api/documents/upload/route.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { requireTenant } from '@/middleware/auth'

export async function POST(req: NextRequest) {
  const { tenantId, userId } = await requireTenant(req)

  // 1. Recibir archivo
  const formData = await req.formData()
  const file = formData.get('file') as File

  // Validar formato
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]

  if (!allowedTypes.includes(file.type)) {
    return Response.json(
      { error: 'Formato no soportado' },
      { status: 400 }
    )
  }

  // Validar tamaño (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return Response.json(
      { error: 'Archivo muy grande (max 10MB)' },
      { status: 400 }
    )
  }

  // 2. Subir a S3
  const s3Key = `documents/${tenantId}/${Date.now()}-${file.name}`
  const s3Client = new S3Client({ region: process.env.AWS_REGION })

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: s3Key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type
  }))

  const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`

  // 3. Crear registro en BD
  const document = await prisma.document.create({
    data: {
      providerTenantId: tenantId,
      clientTenantId: formData.get('clientTenantId') as string,
      uploadedBy: userId,
      fileUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: 'PROCESSING',
      parseStatus: 'PENDING'
    }
  })

  // 4. Enviar a Parse (async)
  sendToParseQueue({
    documentId: document.id,
    fileUrl,
    fileName: file.name,
    fileType: file.type,
    tenantId,
    userId
  })

  return Response.json({
    success: true,
    documentId: document.id,
    message: 'Documento subido. Procesando con IA...'
  })
}
```

### 2. Cola de Procesamiento

```typescript
// lib/parse-queue.ts
import { Queue } from 'bullmq'

const parseQueue = new Queue('parse-documents', {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})

export async function sendToParseQueue(data: {
  documentId: string
  fileUrl: string
  fileName: string
  fileType: string
  tenantId: string
  userId: string
}) {
  await parseQueue.add('parse-document', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })
}
```

### 3. Worker de Parse

```typescript
// workers/parse-worker.ts
import { Worker } from 'bullmq'
import { parseClient } from '@/lib/parse-client'

const worker = new Worker(
  'parse-documents',
  async (job) => {
    const { documentId, fileUrl, fileName, fileType, tenantId, userId } = job.data

    try {
      // 1. Actualizar estado a PROCESSING
      await prisma.document.update({
        where: { id: documentId },
        data: { parseStatus: 'PROCESSING' }
      })

      // 2. Enviar a Parse
      const parseResponse = await parseClient.post('/api/parse/document', {
        fileUrl,
        fileName,
        fileType,
        tenantId,
        userId,
        context: {
          expectedType: 'INVOICE' // Por defecto
        }
      })

      const { parseJobId } = parseResponse.data

      // 3. Guardar jobId
      await prisma.document.update({
        where: { id: documentId },
        data: {
          parseJobId,
          parseStatus: 'PROCESSING'
        }
      })

      // 4. Polling para obtener resultado
      const result = await pollParseJob(parseJobId)

      // 5. Guardar datos extraídos
      await prisma.document.update({
        where: { id: documentId },
        data: {
          parseStatus: 'COMPLETED',
          parseData: result.data.extractedData,
          parseConfidence: result.data.confidence,
          number: result.data.extractedData.number,
          type: result.data.documentType,
          amount: result.data.extractedData.amounts.subtotal,
          taxAmount: result.data.extractedData.amounts.tax,
          totalAmount: result.data.extractedData.amounts.total,
          date: new Date(result.data.extractedData.date),
          status: 'PRESENTED' // Cambiar de PROCESSING a PRESENTED
        }
      })

      // 6. Notificar al frontend vía WebSocket
      notifyClient(tenantId, userId, {
        type: 'DOCUMENT_PARSED',
        documentId,
        data: result.data.extractedData
      })

    } catch (error) {
      // Manejar error
      await prisma.document.update({
        where: { id: documentId },
        data: {
          parseStatus: 'ERROR',
          parseError: error.message
        }
      })

      notifyClient(tenantId, userId, {
        type: 'DOCUMENT_PARSE_ERROR',
        documentId,
        error: error.message
      })

      throw error
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    }
  }
)

// Polling de Parse
async function pollParseJob(jobId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await parseClient.get(`/api/parse/document/${jobId}`)

    if (result.data.status === 'COMPLETED') {
      return result.data
    }

    if (result.data.status === 'ERROR') {
      throw new Error(result.data.error.message)
    }

    // Esperar 2 segundos antes de reintentar
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  throw new Error('Parse timeout')
}
```

### 4. Notificación en Tiempo Real (WebSocket)

```typescript
// lib/websocket.ts
import { Server } from 'socket.io'

let io: Server

export function initWebSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Cliente se suscribe a su tenant
    socket.on('subscribe', ({ tenantId, userId }) => {
      socket.join(`tenant:${tenantId}`)
      socket.join(`user:${userId}`)
    })
  })

  return io
}

export function notifyClient(tenantId: string, userId: string, data: any) {
  if (!io) return

  io.to(`user:${userId}`).emit('notification', data)
  io.to(`tenant:${tenantId}`).emit('notification', data)
}
```

### 5. Frontend - Componente de Upload

```typescript
// components/DocumentUpload.tsx
'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTenant } from '@/contexts/TenantContext'
import { useSocket } from '@/hooks/useSocket'

export const DocumentUpload = () => {
  const { currentTenant } = useTenant()
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const socket = useSocket()

  // Escuchar notificaciones de Parse
  useEffect(() => {
    if (!socket) return

    socket.on('notification', (data) => {
      if (data.type === 'DOCUMENT_PARSED') {
        setUploads(prev => prev.map(item =>
          item.documentId === data.documentId
            ? { ...item, status: 'COMPLETED', data: data.data }
            : item
        ))
      }

      if (data.type === 'DOCUMENT_PARSE_ERROR') {
        setUploads(prev => prev.map(item =>
          item.documentId === data.documentId
            ? { ...item, status: 'ERROR', error: data.error }
            : item
        ))
      }
    })
  }, [socket])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const uploadId = Math.random().toString(36)

      // Agregar a lista con estado UPLOADING
      setUploads(prev => [...prev, {
        id: uploadId,
        file,
        status: 'UPLOADING',
        progress: 0
      }])

      try {
        // Upload a backend
        const formData = new FormData()
        formData.append('file', file)
        formData.append('clientTenantId', currentTenant.clientId)

        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'X-Tenant-ID': currentTenant.tenantId
          }
        })

        const result = await response.json()

        // Actualizar estado a PROCESSING
        setUploads(prev => prev.map(item =>
          item.id === uploadId
            ? { ...item, status: 'PROCESSING', documentId: result.documentId }
            : item
        ))

      } catch (error) {
        setUploads(prev => prev.map(item =>
          item.id === uploadId
            ? { ...item, status: 'ERROR', error: error.message }
            : item
        ))
      }
    }
  }, [currentTenant])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Suelta los archivos aquí...'
            : 'Arrastra archivos o haz click para seleccionar'
          }
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, JPG, PNG (máx 10MB)
        </p>
      </div>

      {/* Lista de uploads */}
      <div className="mt-6 space-y-3">
        {uploads.map(item => (
          <UploadItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

// Componente de item de upload
const UploadItem = ({ item }: { item: UploadItem }) => {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileIcon type={item.file.type} />
          <div>
            <p className="font-medium text-sm">{item.file.name}</p>
            <p className="text-xs text-gray-500">
              {(item.file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>

        <StatusBadge status={item.status} />
      </div>

      {item.status === 'UPLOADING' && (
        <ProgressBar progress={item.progress} />
      )}

      {item.status === 'PROCESSING' && (
        <div className="mt-3 flex items-center text-sm text-gray-600">
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
          Analizando documento con IA...
        </div>
      )}

      {item.status === 'COMPLETED' && item.data && (
        <ParsedDataPreview data={item.data} documentId={item.documentId} />
      )}

      {item.status === 'ERROR' && (
        <div className="mt-3 text-sm text-red-600">
          Error: {item.error}
        </div>
      )}
    </div>
  )
}

// Preview de datos extraídos
const ParsedDataPreview = ({ data, documentId }) => {
  const router = useRouter()

  return (
    <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900">
            ✓ Documento procesado
          </p>
          <div className="mt-2 space-y-1 text-xs text-green-800">
            <p>• Tipo: {data.documentType}</p>
            <p>• Número: {data.number}</p>
            <p>• Fecha: {new Date(data.date).toLocaleDateString()}</p>
            <p>• Total: ${data.amounts.total.toLocaleString()}</p>
            {data.relatedDocuments?.purchaseOrder && (
              <p>• OC: {data.relatedDocuments.purchaseOrder}</p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => router.push(`/documentos/${documentId}/review`)}
        >
          Revisar →
        </Button>
      </div>
    </div>
  )
}
```

### 6. Pantalla de Revisión de Datos

```typescript
// app/documentos/[id]/review/page.tsx
'use client'

export default function DocumentReviewPage({ params }) {
  const { id } = params
  const { data: document, loading } = useDocument(id)

  if (loading) return <Spinner />

  const parseData = document.parseData

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Columna izquierda: Vista previa del documento */}
      <div>
        <DocumentViewer url={document.fileUrl} />
      </div>

      {/* Columna derecha: Datos extraídos */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Datos Extraídos
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Número de Factura"
              name="number"
              defaultValue={parseData.number}
              required
            />

            <Input
              label="Fecha de Emisión"
              name="date"
              type="date"
              defaultValue={parseData.date}
              required
            />

            <Input
              label="Subtotal"
              name="subtotal"
              type="number"
              step="0.01"
              defaultValue={parseData.amounts.subtotal}
              required
            />

            <Input
              label="IVA"
              name="tax"
              type="number"
              step="0.01"
              defaultValue={parseData.amounts.tax}
              required
            />

            <Input
              label="Total"
              name="total"
              type="number"
              step="0.01"
              defaultValue={parseData.amounts.total}
              required
              disabled
            />

            {parseData.relatedDocuments?.purchaseOrder && (
              <Input
                label="Orden de Compra"
                name="purchaseOrder"
                defaultValue={parseData.relatedDocuments.purchaseOrder}
              />
            )}
          </div>

          <div className="mt-6 flex space-x-3">
            <Button type="submit" className="flex-1">
              ✓ Confirmar y Enviar
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
          </div>
        </form>

        {/* Confidence score */}
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <p className="text-gray-600">
            Confianza del análisis: {(document.parseConfidence * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  )
}
```

---

## 📊 MODELO DE DATOS

### Schema Prisma

```prisma
model Document {
  id        String   @id @default(cuid())
  // ... campos básicos ...

  // Parse integration
  parseJobId     String?
  parseStatus    ParseStatus  @default(PENDING)
  parseData      Json?
  parseConfidence Decimal?
  parseError     String?
  parseRawText   String?      @db.Text
  parsedAt       DateTime?

  @@index([parseStatus])
}

enum ParseStatus {
  PENDING
  PROCESSING
  COMPLETED
  ERROR
}
```

---

## 🔧 CONFIGURACIÓN

### Variables de Entorno

```.env
# Parse API
PARSE_API_URL=https://parse.axioma.com/api
PARSE_API_KEY=your-parse-api-key

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=hub-documents

# Redis (para cola)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# WebSocket
WS_PORT=3001
```

---

## 🚀 DESPLIEGUE

### Checklist

#### Fase 1: Setup Básico
- [ ] Configurar AWS S3 bucket
- [ ] Configurar Redis para colas
- [ ] Conectar con API de Parse
- [ ] Deploy de worker de Parse

#### Fase 2: Upload de Archivos
- [ ] Componente de drag & drop
- [ ] Validación de formatos
- [ ] Upload a S3
- [ ] Crear registro en BD

#### Fase 3: Procesamiento
- [ ] Cola de trabajos (BullMQ)
- [ ] Worker de Parse
- [ ] Polling de resultados
- [ ] Manejo de errores

#### Fase 4: Tiempo Real
- [ ] WebSocket server
- [ ] Notificaciones de progreso
- [ ] Updates en tiempo real

#### Fase 5: Review de Datos
- [ ] Pantalla de revisión
- [ ] Edición de datos extraídos
- [ ] Feedback a Parse
- [ ] Confirmación y submit

---

## 📈 MEJORAS FUTURAS

### Fase 2
- [ ] Análisis de múltiples páginas
- [ ] Detección de remitos adjuntos
- [ ] Validación contra OC automática
- [ ] Sugerencias inteligentes

### Fase 3
- [ ] Aprendizaje del modelo por tenant
- [ ] Detección de duplicados
- [ ] OCR de facturas manuscritas
- [ ] Análisis de tablas complejas

---

## 🎯 PRÓXIMOS PASOS

Continuar con:
- `/docs/DESIGN_SYSTEM.md` - Sistema de diseño
- `/docs/WIREFRAMES.md` - Diseños completos de UI
- `/docs/TECHNICAL_SPECS.md` - Especificaciones técnicas completas
