import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { syncProveedoresToLocal } from './services/parseIntegration'
import authRoutes from './routes/auth'
import menuRoutes from './routes/menu'
import usersRoutes from './routes/users'
import tenantsRoutes from './routes/tenants'
import documentsRoutes from './routes/documents'
import chatRoutes from './routes/chat'
import purchaseRequestsRoutes from './routes/purchaseRequests'
import purchaseOrdersRoutes from './routes/purchaseOrders'
import suppliersRoutes from './routes/suppliers'
import receptionsRoutes from './routes/receptions'
import notificationsRoutes from './routes/notifications'
import approvalRulesRoutes from './routes/approvalRules'
import approvalWorkflowsRoutes from './routes/approvalWorkflows'
import parametrosRoutes from './routes/parametros'
import attachmentsRoutes from './routes/attachments'

// Cargar variables de entorno
dotenv.config()

const app: Application = express()
const PORT = process.env.PORT || 4000
const prisma = new PrismaClient()

// Sincronización automática de proveedores desde Parse
// DESHABILITADA temporalmente - el endpoint de Parse devuelve error 500
async function syncProveedoresOnStartup() {
  // Deshabilitado hasta que se corrija el endpoint en Parse
  console.log('⚠️  Sincronización de proveedores deshabilitada temporalmente')
  return

  /*
  const tenantId = process.env.PARSE_TENANT_ID || 'grupolb'

  if (!process.env.PARSE_API_KEY) {
    console.log('⚠️  PARSE_API_KEY no configurada, omitiendo sincronización de proveedores')
    return
  }

  try {
    console.log('🔄 Sincronizando proveedores desde Parse...')
    const result = await syncProveedoresToLocal(prisma, tenantId)
    console.log(`✅ Proveedores sincronizados: ${result.created} nuevos, ${result.updated} actualizados (${result.total} total)`)
  } catch (error) {
    console.error('❌ Error sincronizando proveedores:', error)
  }
  */
}

// Middlewares
// CORS debe ir antes que helmet para evitar conflictos
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL
].filter((url): url is string => Boolean(url))

console.log('🌐 CORS allowed origins:', allowedOrigins)

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'X-Tenant-Id'],
}))
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Hub API is running',
    timestamp: new Date().toISOString()
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/tenants', tenantsRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/v1/chat', chatRoutes)
app.use('/api/purchase-requests', purchaseRequestsRoutes)
app.use('/api/purchase-orders', purchaseOrdersRoutes)
app.use('/api/suppliers', suppliersRoutes)
app.use('/api/receptions', receptionsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/approval-rules', approvalRulesRoutes)
app.use('/api/approval-workflows', approvalWorkflowsRoutes)
app.use('/api/parametros', parametrosRoutes)
app.use('/api/attachments', attachmentsRoutes)

// Ruta de prueba
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    message: 'Hub Backend API',
    version: '1.0.0'
  })
})

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Hub Backend running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`)

  // Sincronizar proveedores al iniciar
  await syncProveedoresOnStartup()
})

export default app
