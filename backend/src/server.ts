import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import menuRoutes from './routes/menu'
import usersRoutes from './routes/users'
import tenantsRoutes from './routes/tenants'
import documentsRoutes from './routes/documents'

// Cargar variables de entorno
dotenv.config()

const app: Application = express()
const PORT = process.env.PORT || 4000

// Middlewares
// CORS debe ir antes que helmet para evitar conflictos
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', process.env.FRONTEND_URL].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

// Ruta de prueba
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    message: 'Hub Backend API',
    version: '1.0.0'
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Hub Backend running on http://localhost:${PORT}`)
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`)
})

export default app
