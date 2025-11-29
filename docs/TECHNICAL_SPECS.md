# ESPECIFICACIONES TÉCNICAS - Hub

Especificaciones técnicas completas para el desarrollo del Portal de Proveedores.

---

## 🏗️ STACK TECNOLÓGICO

### Frontend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| **Next.js** | 14+ | Framework React con App Router |
| **React** | 18+ | Librería UI |
| **TypeScript** | 5+ | Type safety |
| **Tailwind CSS** | 3.3+ | Styling |
| **Lucide React** | Latest | Iconografía |
| **React Hook Form** | 7.48+ | Manejo de formularios |
| **Zod** | 3.22+ | Validación de schemas |
| **SWR** o **TanStack Query** | Latest | Data fetching y caché |
| **Socket.io Client** | 4.5+ | WebSocket para real-time |
| **Axios** | 1.6+ | HTTP client |

### Backend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| **Next.js API Routes** | 14+ | API REST |
| **Prisma** | 5+ | ORM |
| **PostgreSQL** | 14+ | Base de datos |
| **BullMQ** | 4+ | Colas de trabajo |
| **Redis** | 7+ | Caché y colas |
| **Socket.io** | 4.5+ | WebSocket server |
| **JWT** | - | Autenticación |
| **Bcrypt** | 5+ | Hash de passwords |
| **Nodemailer** | 6+ | Envío de emails |

### Infraestructura

| Servicio | Propósito |
|----------|-----------|
| **AWS S3** | Almacenamiento de documentos |
| **Vercel** o **AWS** | Hosting de aplicación |
| **PostgreSQL RDS** o **Supabase** | Base de datos managed |
| **Redis Cloud** | Redis managed |
| **WhatsApp Business API** | Integración de WhatsApp |
| **SendGrid** o **AWS SES** | Envío de emails |

---

## 📊 MODELO DE DATOS COMPLETO

### Schema Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTENTICACIÓN Y USUARIOS
// ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  phone         String?
  avatar        String?
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Multi-tenant
  tenantMemberships TenantMembership[]

  // Actividad
  uploadedDocuments  Document[]       @relation("UploadedDocuments")
  documentEvents     DocumentEvent[]
  comments           Comment[]

  @@index([email])
}

model Tenant {
  id          String   @id @default(cuid())
  name        String
  legalName   String
  taxId       String   @unique // CUIT, RUT, etc.
  country     String
  address     String?
  phone       String?
  email       String?
  website     String?
  settings    Json     @default("{}")
  branding    Json?    // Logo, colores personalizados
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relaciones
  memberships TenantMembership[]

  // Como cliente (recibe documentos)
  documentsReceived Document[]       @relation("ClientDocuments")
  purchaseOrders    PurchaseOrder[]
  paymentsIssued    Payment[]

  // Como proveedor (envía documentos)
  documentsSent     Document[]       @relation("ProviderDocuments")
  paymentsReceived  Payment[]        @relation("ReceivedPayments")

  @@index([taxId])
  @@index([isActive])
}

model TenantMembership {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  roles     Role[]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // Metadata de invitación
  invitedBy String?
  invitedAt DateTime?
  joinedAt  DateTime?

  @@unique([userId, tenantId])
  @@index([userId])
  @@index([tenantId])
}

enum Role {
  PROVIDER              // Puede cargar documentos
  CLIENT_VIEWER         // Solo ver documentos
  CLIENT_APPROVER       // Aprobar/rechazar documentos
  CLIENT_ADMIN          // Gestión completa
  SUPER_ADMIN           // Admin global del sistema
}

// ============================================
// DOCUMENTOS
// ============================================

model Document {
  id        String   @id @default(cuid())
  number    String
  type      DocumentType
  status    DocumentStatus

  // Montos
  amount      Decimal
  taxAmount   Decimal
  totalAmount Decimal
  currency    String   @default("ARS")

  // Archivo
  fileUrl     String
  fileName    String
  fileType    String
  fileSize    Int

  // Multi-tenant
  providerTenantId String
  providerTenant   Tenant @relation("ProviderDocuments", fields: [providerTenantId], references: [id])

  clientTenantId   String
  clientTenant     Tenant @relation("ClientDocuments", fields: [clientTenantId], references: [id])

  // Usuario que subió
  uploadedBy       String
  uploader         User   @relation("UploadedDocuments", fields: [uploadedBy], references: [id])

  // Fechas
  date             DateTime?  // Fecha del documento
  dueDate          DateTime?  // Fecha de vencimiento
  uploadedAt       DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  // Parse integration
  parseJobId       String?
  parseStatus      ParseStatus  @default(PENDING)
  parseData        Json?
  parseConfidence  Decimal?
  parseError       String?
  parseRawText     String?      @db.Text
  parsedAt         DateTime?

  // Relaciones
  purchaseOrderId  String?
  purchaseOrder    PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])

  timeline         DocumentEvent[]
  comments         Comment[]
  attachments      Attachment[]
  paymentItems     PaymentItem[]

  @@unique([number, providerTenantId, clientTenantId])
  @@index([providerTenantId, clientTenantId, status])
  @@index([clientTenantId, status, uploadedAt])
  @@index([parseStatus])
}

enum DocumentType {
  INVOICE
  CREDIT_NOTE
  DEBIT_NOTE
  RECEIPT
}

enum DocumentStatus {
  PROCESSING   // Subido, esperando Parse
  PRESENTED    // Presentado, esperando revisión
  IN_REVIEW    // En proceso de revisión
  APPROVED     // Aprobado
  PAID         // Pagado
  REJECTED     // Rechazado
}

enum ParseStatus {
  PENDING
  PROCESSING
  COMPLETED
  ERROR
}

model DocumentEvent {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  fromStatus  DocumentStatus?
  toStatus    DocumentStatus
  reason      String?
  metadata    Json?

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  createdAt   DateTime @default(now())

  @@index([documentId, createdAt])
}

model Comment {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  text        String   @db.Text
  attachments Attachment[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([documentId, createdAt])
}

model Attachment {
  id         String   @id @default(cuid())
  fileUrl    String
  fileName   String
  fileType   String
  fileSize   Int

  documentId String?
  document   Document? @relation(fields: [documentId], references: [id], onDelete: Cascade)

  commentId  String?
  comment    Comment?  @relation(fields: [commentId], references: [id], onDelete: Cascade)

  uploadedAt DateTime @default(now())

  @@index([documentId])
  @@index([commentId])
}

// ============================================
// ÓRDENES DE COMPRA
// ============================================

model PurchaseOrder {
  id             String    @id @default(cuid())
  number         String
  description    String?
  amount         Decimal
  currency       String    @default("ARS")
  status         PurchaseOrderStatus

  clientTenantId String
  clientTenant   Tenant    @relation(fields: [clientTenantId], references: [id])

  // Fechas
  date           DateTime
  dueDate        DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Archivo
  fileUrl        String?
  fileName       String?

  // Relaciones
  documents      Document[]

  @@unique([number, clientTenantId])
  @@index([clientTenantId, status])
}

enum PurchaseOrderStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

// ============================================
// PAGOS
// ============================================

model Payment {
  id              String   @id @default(cuid())
  number          String
  amount          Decimal
  currency        String   @default("ARS")
  status          PaymentStatus

  // Tenant que emite el pago
  issuedByTenantId String
  issuedByTenant   Tenant @relation(fields: [issuedByTenantId], references: [id])

  // Tenant que recibe el pago
  receivedByTenantId String
  receivedByTenant   Tenant @relation("ReceivedPayments", fields: [receivedByTenantId], references: [id])

  // Fechas
  issueDate       DateTime
  scheduledDate   DateTime?
  paidAt          DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Archivos
  receiptUrl      String?
  retentionUrls   Json?     // Array de URLs de retenciones

  // Documentos incluidos en el pago
  items           PaymentItem[]

  @@unique([number, issuedByTenantId])
  @@index([issuedByTenantId, status])
  @@index([receivedByTenantId, status])
}

enum PaymentStatus {
  SCHEDULED
  PROCESSING
  PAID
  FAILED
}

model PaymentItem {
  id         String  @id @default(cuid())
  paymentId  String
  payment    Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  documentId String
  document   Document @relation(fields: [documentId], references: [id])

  amount     Decimal

  @@index([paymentId])
  @@index([documentId])
}

// ============================================
// COMUNICACIONES
// ============================================

model Conversation {
  id              String   @id @default(cuid())
  subject         String
  status          ConversationStatus
  channel         CommunicationChannel

  // Participantes
  providerTenantId String
  clientTenantId   String

  createdById     String
  closedById      String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  closedAt        DateTime?

  messages        Message[]

  @@index([providerTenantId, clientTenantId])
  @@index([status])
}

enum ConversationStatus {
  OPEN
  RESOLVED
  CLOSED
}

enum CommunicationChannel {
  PORTAL
  EMAIL
  WHATSAPP
  SMS
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  senderId       String
  text           String       @db.Text
  channel        CommunicationChannel

  readAt         DateTime?
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
}

// ============================================
// NOTIFICACIONES
// ============================================

model Notification {
  id        String            @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  message   String            @db.Text
  data      Json?
  channel   CommunicationChannel

  readAt    DateTime?
  sentAt    DateTime?
  createdAt DateTime          @default(now())

  @@index([userId, readAt])
}

enum NotificationType {
  DOCUMENT_UPLOADED
  DOCUMENT_PARSED
  DOCUMENT_STATUS_CHANGED
  PAYMENT_ISSUED
  MESSAGE_RECEIVED
  APPROVAL_REQUIRED
}
```

---

## 🔌 API ENDPOINTS

### Autenticación

```typescript
POST /api/auth/register
Body: { email, password, name }
Response: { user, token }

POST /api/auth/login
Body: { email, password }
Response: { user, token, tenants[] }

POST /api/auth/logout
Response: { success }

GET /api/auth/me
Headers: { Authorization: Bearer <token> }
Response: { user, tenants[] }
```

### Tenants

```typescript
GET /api/tenants
Response: { tenants[] }

GET /api/tenants/:id
Response: { tenant, membership }

POST /api/tenants/:id/invite
Body: { email, roles[] }
Response: { success, invitationId }

PATCH /api/tenants/:id/members/:userId
Body: { roles[], isActive }
Response: { membership }
```

### Documentos

```typescript
POST /api/documents/upload
Headers: { X-Tenant-ID }
Body: FormData { file, clientTenantId }
Response: { documentId, message }

GET /api/documents
Headers: { X-Tenant-ID }
Query: { status?, from?, to?, search? }
Response: { documents[], total, page }

GET /api/documents/:id
Response: { document, timeline, comments }

PATCH /api/documents/:id/status
Body: { status, reason? }
Response: { document }

POST /api/documents/:id/comments
Body: { text, attachments? }
Response: { comment }

POST /api/documents/:id/review
Body: { confirmedData, corrections? }
Response: { document }
```

### Pagos

```typescript
GET /api/payments
Headers: { X-Tenant-ID }
Query: { status?, from?, to? }
Response: { payments[], total }

GET /api/payments/:id
Response: { payment, items[] }

POST /api/payments
Headers: { X-Tenant-ID }
Body: { documentIds[], scheduledDate, amount }
Response: { payment }
```

### Órdenes de Compra

```typescript
GET /api/purchase-orders
Headers: { X-Tenant-ID }
Query: { status?, search? }
Response: { orders[], total }

GET /api/purchase-orders/:id
Response: { order, documents[] }
```

### Comunicaciones

```typescript
GET /api/conversations
Headers: { X-Tenant-ID }
Query: { status? }
Response: { conversations[] }

GET /api/conversations/:id
Response: { conversation, messages[] }

POST /api/conversations
Body: { subject, message, channel }
Response: { conversation }

POST /api/conversations/:id/messages
Body: { text }
Response: { message }
```

### WebSocket Events

```typescript
// Cliente se suscribe
socket.emit('subscribe', { tenantId, userId })

// Eventos del servidor
socket.on('notification', (data) => {
  // DOCUMENT_PARSED
  // DOCUMENT_STATUS_CHANGED
  // PAYMENT_ISSUED
  // MESSAGE_RECEIVED
})

// Cliente envía mensaje
socket.emit('send_message', { conversationId, text })
```

---

## 🔒 SEGURIDAD

### Autenticación

- JWT con expiración de 7 días
- Refresh tokens opcionales
- Hash de passwords con bcrypt (10 rounds)
- Rate limiting en endpoints de auth

### Autorización

- Middleware de verificación de tenant
- Row-level security en queries
- Validación de permisos por rol
- Aislamiento completo de datos

### Validación de Input

```typescript
// Ejemplo con Zod
import { z } from 'zod'

const uploadDocumentSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, 'Max 10MB')
    .refine(
      file => ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type),
      'Formato no soportado'
    ),
  clientTenantId: z.string().cuid()
})
```

### CORS

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.FRONTEND_URL },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Tenant-ID' },
        ],
      },
    ]
  },
}
```

---

## 📈 PERFORMANCE

### Caché Strategy

```typescript
// Redis caché
const cacheKey = `tenant:${tenantId}:documents:${filters}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

const data = await prisma.document.findMany(...)
await redis.setex(cacheKey, 300, JSON.stringify(data)) // 5 min TTL

return data
```

### Database Indexes

Ver schema Prisma arriba. Índices en:
- User.email
- Tenant.taxId
- Document.status + uploadedAt
- TenantMembership.userId + tenantId
- Todos los foreign keys

### Paginación

```typescript
GET /api/documents?page=1&limit=20

const documents = await prisma.document.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { uploadedAt: 'desc' }
})

const total = await prisma.document.count({ where })

return {
  documents,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
}
```

### Optimización de Queries

```typescript
// Incluir relaciones necesarias
const document = await prisma.document.findUnique({
  where: { id },
  include: {
    uploader: { select: { name: true, email: true } },
    providerTenant: { select: { name: true } },
    clientTenant: { select: { name: true } },
    timeline: {
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    },
    comments: {
      include: {
        user: { select: { name: true, avatar: true } },
        attachments: true
      },
      orderBy: { createdAt: 'asc' }
    }
  }
})
```

---

## 🧪 TESTING

### Unit Tests (Jest + React Testing Library)

```typescript
// __tests__/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders with correct variant', () => {
    render(<Button variant="primary">Click me</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-sidebar')
  })
})
```

### Integration Tests

```typescript
// __tests__/api/documents.test.ts
import { POST } from '@/app/api/documents/route'

describe('POST /api/documents', () => {
  it('uploads document successfully', async () => {
    const formData = new FormData()
    formData.append('file', mockPdfFile)

    const req = new Request('http://localhost/api/documents', {
      method: 'POST',
      body: formData,
      headers: { 'X-Tenant-ID': 'test-tenant' }
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.documentId).toBeDefined()
  })
})
```

### E2E Tests (Playwright)

```typescript
// e2e/upload-document.spec.ts
import { test, expect } from '@playwright/test'

test('upload document flow', async ({ page }) => {
  await page.goto('/documentos')
  await page.click('text=Subir Documento')

  const fileInput = await page.locator('input[type="file"]')
  await fileInput.setInputFiles('test-factura.pdf')

  await expect(page.locator('text=Analizando documento')).toBeVisible()
  await expect(page.locator('text=Documento procesado')).toBeVisible({ timeout: 30000 })
})
```

---

## 🚀 DEPLOYMENT

### Variables de Entorno

```.env
# Database
DATABASE_URL=postgresql://user:password@host:5432/hub

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=hub-documents

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Parse Integration
PARSE_API_URL=https://parse.axioma.com/api
PARSE_API_KEY=

# WhatsApp
WHATSAPP_BUSINESS_API_URL=
WHATSAPP_BUSINESS_API_TOKEN=

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@hub.axioma.com

# App
NEXT_PUBLIC_APP_URL=https://hub.axioma.com
FRONTEND_URL=https://hub.axioma.com
```

### Vercel Deploy

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production
vercel --prod
```

### Docker (Opcional)

```dockerfile
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📊 MONITORING

### Logging

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

// Uso
logger.info({ tenantId, documentId }, 'Document uploaded')
logger.error({ error }, 'Parse failed')
```

### Error Tracking (Sentry)

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
})
```

### Analytics

```typescript
// Google Analytics / Mixpanel / PostHog
import { analytics } from '@/lib/analytics'

analytics.track('document_uploaded', {
  tenantId,
  documentType,
  fileSize
})
```

---

## ✅ CHECKLIST DE DESARROLLO

### Setup
- [ ] Inicializar proyecto Next.js
- [ ] Configurar TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Configurar Prisma
- [ ] Configurar ESLint + Prettier

### Base
- [ ] Schema de base de datos
- [ ] Migraciones
- [ ] Seed data
- [ ] Auth middleware
- [ ] Tenant middleware

### Features
- [ ] Autenticación
- [ ] Multi-tenant
- [ ] Upload de documentos
- [ ] Integración Parse
- [ ] Pipeline de estados
- [ ] Pagos
- [ ] Órdenes de compra
- [ ] Comunicaciones
- [ ] Notificaciones

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Load testing

### Deploy
- [ ] CI/CD pipeline
- [ ] Production deploy
- [ ] Monitoring setup
- [ ] Backup strategy

---

Esta documentación técnica debe ser suficiente para que tu socio pueda desarrollar la aplicación completa con Claude.
