# 🤖 AI Chatbot - Guía de Configuración y Uso

## 📋 Resumen

Se ha implementado un **chatbot con IA (Claude)** que permite crear requerimientos de compra usando lenguaje natural.

**Características:**
- ✅ Widget flotante estilo Intercom/WhatsApp
- ✅ Integración con Claude 3.5 Sonnet (Anthropic)
- ✅ Creación de requerimientos con lenguaje natural
- ✅ Persistencia en base de datos
- ✅ Multi-tenant (aislado por empresa)
- ✅ Autenticación integrada

---

## 🛠️ Configuración (Primera Vez)

### 1. Obtener API Key de Anthropic

1. Ir a https://console.anthropic.com/
2. Crear una cuenta (si no tienes)
3. Ir a **API Keys** → **Create Key**
4. Copiar la key (empieza con `sk-ant-...`)

### 2. Configurar Backend

Editar `/backend/.env` y agregar la API key:

```bash
# AI Assistant (Anthropic Claude)
# Obtener key en: https://console.anthropic.com/
ANTHROPIC_API_KEY="sk-ant-api03-tu-key-aqui"
```

### 3. Migrar Base de Datos

El backend necesita los nuevos modelos de `PurchaseRequest`:

```bash
cd backend
npx prisma migrate dev --name add_purchase_requests
```

Esto creará las tablas:
- `PurchaseRequest`
- `PurchaseRequestItem`
- Enums: `PurchaseRequestStatus`, `PurchaseRequestPriority`

### 4. Reiniciar Backend

```bash
cd backend
npm run dev
```

Deberías ver en la consola:
```
✅ AI Assistant Service inicializado
🚀 Hub Backend running on http://localhost:4000
```

### 5. Verificar Salud del Servicio

```bash
curl http://localhost:4000/api/v1/chat/health
```

Debería responder:
```json
{
  "available": true,
  "service": "AI Chat Assistant",
  "model": "claude-3-5-sonnet-20241022"
}
```

---

## 💬 Uso del Chatbot

### Frontend

1. **Iniciar sesión** en la aplicación
2. Verás un **botón flotante púrpura** en la esquina inferior derecha
3. Hacer clic para abrir el chat
4. Escribir comandos en lenguaje natural

### Ejemplos de Comandos

#### ✅ Crear Requerimiento Simple
```
Necesito 5 sillas de oficina ergonómicas
```

#### ✅ Crear Requerimiento con Detalles
```
Quiero una notebook para diseño gráfico, presupuesto máximo $2000, urgente
```

#### ✅ Crear Requerimiento Específico
```
Haceme un requerimiento de 10 paquetes de papel A4 para la oficina
```

#### ✅ Con Categoría Explícita
```
Crear requerimiento de servicios de limpieza mensual, categoría Servicios
```

### Respuesta del Sistema

El chatbot responderá con un resumen estructurado:

```
✅ **Requerimiento REQ-2025-00001 creado exitosamente**

📋 **Resumen:**
• **Categoría:** Tecnología
• **Prioridad:** URGENTE
• **Estado:** BORRADOR
• **Presupuesto:** $2000

📦 **Items:**
1. Notebook para diseño gráfico (x1)

📝 **Justificación:** Herramienta de trabajo para diseño gráfico

💡 **¿Qué podés hacer ahora?**
1. Ver el detalle completo del requerimiento
2. Editar y agregar más información
3. Enviar a aprobación cuando esté listo
```

---

## 🗄️ Estructura de Datos

### Modelo: PurchaseRequest

```prisma
model PurchaseRequest {
  id              String    @id
  numero          String    @unique  // REQ-2025-00001
  titulo          String
  estado          PurchaseRequestStatus
  prioridad       PurchaseRequestPriority
  categoria       String
  justificacion   String?
  montoEstimado   Decimal?
  tenantId        String
  solicitanteId   String
  creadoPorIA     Boolean   // ✅ true si fue creado por chatbot
  promptOriginal  String?   // Comando original del usuario
  items           PurchaseRequestItem[]
  createdAt       DateTime
  updatedAt       DateTime
}

model PurchaseRequestItem {
  id                String
  purchaseRequestId String
  descripcion       String
  cantidad          Int
  especificaciones  String?  // JSON array
  unidadMedida      String?
  precioEstimado    Decimal?
}

enum PurchaseRequestStatus {
  BORRADOR | ENVIADO | EN_REVISION | APROBADO | RECHAZADO | CANCELADO
}

enum PurchaseRequestPriority {
  BAJA | NORMAL | ALTA | URGENTE
}
```

---

## 🔧 API Endpoints

### POST /api/v1/chat

Procesa un comando de lenguaje natural.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "message": "Necesito una notebook para diseño, $2000, urgente",
  "tenantId": "cm..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "✅ Requerimiento REQ-2025-00001 creado...",
  "data": {
    "id": "cm...",
    "numero": "REQ-2025-00001",
    "titulo": "Notebook para diseño gráfico",
    "estado": "BORRADOR",
    "prioridad": "URGENTE",
    "items": [...]
  }
}
```

**Response (400) - Error:**
```json
{
  "success": false,
  "message": "No pude entender el comando",
  "error": "Faltan datos..."
}
```

### GET /api/v1/chat/health

Verifica disponibilidad del servicio.

**Response:**
```json
{
  "available": true,
  "service": "AI Chat Assistant",
  "model": "claude-3-5-sonnet-20241022"
}
```

---

## 📂 Archivos Creados/Modificados

### Backend (`/backend/src`)

```
services/
  ├── aiAssistant.ts           ← Servicio de integración con Claude
  └── actionExecutor.ts         ← Ejecutor de acciones (crear req, etc.)

routes/
  └── chat.ts                   ← Endpoint POST /api/v1/chat

prisma/
  └── schema.prisma             ← Modelos PurchaseRequest agregados

.env                            ← ANTHROPIC_API_KEY agregada

server.ts                       ← Ruta /api/v1/chat registrada
```

### Frontend (`/frontend/src`)

```
components/chat/
  ├── ChatWidget.tsx            ← Widget flotante principal
  ├── ChatMessage.tsx           ← Componente de mensaje individual
  ├── ChatWidgetWrapper.tsx     ← Wrapper con AuthContext
  └── index.ts                  ← Exports

lib/
  └── chatService.ts            ← Servicio HTTP para llamar al backend

app/
  └── layout.tsx                ← ChatWidgetWrapper agregado
```

---

## 🧪 Testing Manual

### 1. Verificar Backend

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Test
curl http://localhost:4000/api/v1/chat/health
```

### 2. Probar con Postman

**POST** `http://localhost:4000/api/v1/chat`

Headers:
```
Authorization: Bearer <tu-token>
Content-Type: application/json
```

Body:
```json
{
  "message": "Necesito 3 notebooks Dell para el equipo de desarrollo",
  "tenantId": "<tu-tenant-id>"
}
```

### 3. Probar en Frontend

1. Iniciar frontend: `npm run dev`
2. Login en http://localhost:3000
3. Click en botón flotante púrpura
4. Escribir: "Necesito una impresora láser"
5. Verificar respuesta del chatbot

### 4. Verificar en Base de Datos

```bash
cd backend
npx prisma studio
```

Ir a modelo `PurchaseRequest` y verificar:
- `creadoPorIA = true`
- `promptOriginal` contiene tu comando
- Items asociados creados correctamente

---

## 🐛 Troubleshooting

### ❌ "AI Assistant no disponible"

**Causa:** ANTHROPIC_API_KEY no configurada o inválida

**Solución:**
1. Verificar `/backend/.env`: `ANTHROPIC_API_KEY="sk-ant-..."`
2. Reiniciar backend
3. Verificar health: `curl http://localhost:4000/api/v1/chat/health`

### ❌ "Prisma Client - Unknown arg `purchaseRequests`"

**Causa:** Modelos de Prisma no generados

**Solución:**
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### ❌ Widget no aparece en Frontend

**Causa:** No autenticado o falta tenant

**Solución:**
1. Verificar que estás logueado
2. Verificar que seleccionaste un tenant
3. Revisar consola del navegador (F12)

### ❌ "Error de conexión con el servidor"

**Causa:** Backend no está corriendo

**Solución:**
```bash
cd backend
npm run dev
```

---

## 💰 Costos de API

**Claude 3.5 Sonnet:**
- Input: $3 / millón tokens
- Output: $15 / millón tokens

**Por requerimiento:**
- ~500 tokens input (~$0.0015)
- ~200 tokens output (~$0.003)
- **Total: ~$0.005 por requerimiento** (medio centavo USD)

**Estimación mensual:**
- 1000 requerimientos/mes = **~$5 USD**
- 5000 requerimientos/mes = **~$25 USD**

---

## 🚀 Próximos Pasos (Roadmap)

- [ ] Agregar más acciones (consultar, aprobar)
- [ ] Historial de conversaciones persistente
- [ ] Sugerencias contextuales
- [ ] Comandos de voz
- [ ] Integración con WhatsApp
- [ ] Analytics de uso

---

## 📚 Referencias

- **Anthropic Claude Docs:** https://docs.anthropic.com/
- **API Reference:** https://docs.anthropic.com/claude/reference
- **Prompt Engineering:** https://docs.anthropic.com/claude/docs/intro-to-prompting

---

**Documento creado:** 30 Noviembre 2025
**Versión:** 1.0
**Autor:** Claude Code + Equipo ProHub
