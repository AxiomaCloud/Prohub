# 🤖 AI Chatbot - Servicios Backend

## Descripción

Sistema de chatbot con IA basado en **Claude 3.5 Sonnet** (Anthropic) para crear requerimientos de compra usando lenguaje natural.

## Arquitectura

```
Usuario → ChatWidget → API /api/v1/chat → AIAssistantService → Claude API
                                              ↓
                                       ActionExecutorService
                                              ↓
                                         Prisma/PostgreSQL
```

## Servicios

### 1. AIAssistantService (`aiAssistant.ts`)

**Responsabilidad:** Comunicación con Claude API y parsing de respuestas.

**Métodos principales:**
- `processCommand(message, context)` - Procesa comando del usuario
- `buildSystemPrompt(context)` - Construye el prompt con contexto
- `parseAIResponse(response)` - Parsea JSON de Claude
- `validateAction(action)` - Valida estructura de la acción

**Ejemplo de uso:**
```typescript
const aiAssistant = new AIAssistantService();

const response = await aiAssistant.processCommand(
  "Necesito una notebook para diseño, $2000",
  {
    userId: "cm...",
    tenantId: "cm...",
    userName: "Juan Pérez",
    userEmail: "juan@empresa.com",
    userRole: "CLIENT_ADMIN"
  }
);

// response.action = {
//   accion: "crear_requerimiento",
//   entidades: {
//     items: [{ descripcion: "Notebook para diseño gráfico", cantidad: 1 }],
//     categoria: "Tecnología",
//     urgencia: "normal",
//     presupuesto: 2000
//   }
// }
```

**Variables de entorno requeridas:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Modelo usado:**
- `claude-3-5-sonnet-20241022`
- Max tokens: 2048
- Temperatura: default

**Costos:**
- Input: $3/M tokens (~500 tokens = $0.0015)
- Output: $15/M tokens (~200 tokens = $0.003)
- **Total por request: ~$0.005 USD**

---

### 2. ActionExecutorService (`actionExecutor.ts`)

**Responsabilidad:** Ejecutar acciones identificadas por la IA.

**Métodos principales:**
- `executeAction(action, userId, tenantId, originalPrompt)` - Dispatcher
- `crearRequerimiento(...)` - Crea PurchaseRequest en BD
- `consultarEstado(...)` - Consulta requerimientos
- `aprobarDocumento(...)` - Aprueba documentos (placeholder)

**Acciones soportadas:**
| Acción | Estado | Descripción |
|--------|--------|-------------|
| `crear_requerimiento` | ✅ Implementado | Crea PurchaseRequest |
| `consultar_estado` | ✅ Implementado | Lista requerimientos |
| `aprobar_documento` | 🚧 Placeholder | Para futuro |

**Ejemplo de uso:**
```typescript
const executor = new ActionExecutorService();

const result = await executor.executeAction(
  {
    accion: "crear_requerimiento",
    entidades: {
      items: [{ descripcion: "Notebook", cantidad: 1 }],
      categoria: "Tecnología",
      urgencia: "alta"
    }
  },
  userId,
  tenantId,
  "Necesito una notebook"
);

// result = {
//   success: true,
//   message: "✅ Requerimiento REQ-2025-00001 creado...",
//   data: { ... }
// }
```

**Generación de números:**
- Formato: `REQ-{YEAR}-{NNNNN}`
- Ejemplo: `REQ-2025-00001`
- Auto-incremental por tenant

**Mapeo de urgencia a prioridad:**
```typescript
{
  'baja': 'BAJA',
  'normal': 'NORMAL',
  'alta': 'ALTA',
  'urgente': 'URGENTE'
}
```

---

## Endpoint de API

### POST /api/v1/chat

Procesa un comando de lenguaje natural.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "message": "Necesito 3 notebooks Dell para desarrollo",
  "tenantId": "cm..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "✅ Requerimiento REQ-2025-00001 creado...",
  "data": {
    "id": "cm...",
    "numero": "REQ-2025-00001",
    "titulo": "Notebooks Dell para desarrollo",
    "estado": "BORRADOR",
    "prioridad": "NORMAL",
    "categoria": "Tecnología",
    "montoEstimado": null,
    "creadoPorIA": true,
    "promptOriginal": "Necesito 3 notebooks Dell para desarrollo",
    "items": [
      {
        "id": "cm...",
        "descripcion": "Notebook Dell",
        "cantidad": 3,
        "especificaciones": null
      }
    ],
    "solicitante": {
      "name": "Juan Pérez",
      "email": "juan@empresa.com"
    }
  }
}
```

**Response (400 Error):**
```json
{
  "success": false,
  "message": "No pude entender el comando",
  "error": "Items requeridos"
}
```

**Response (503 Service Unavailable):**
```json
{
  "error": "AI Assistant no está configurado. Verifica ANTHROPIC_API_KEY"
}
```

---

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

## Modelos de Datos

### PurchaseRequest

```typescript
{
  id: string;                          // CUID
  numero: string;                      // REQ-2025-00001 (unique)
  titulo: string;                      // Del primer item
  estado: PurchaseRequestStatus;       // BORRADOR | ENVIADO | EN_REVISION | APROBADO | RECHAZADO | CANCELADO
  prioridad: PurchaseRequestPriority;  // BAJA | NORMAL | ALTA | URGENTE
  categoria: string;                   // Tecnología, Oficina, Servicios, etc.
  justificacion?: string;
  montoEstimado?: Decimal;
  currency: string;                    // Default: "ARS"
  tenantId: string;
  solicitanteId: string;
  creadoPorIA: boolean;                // ✅ true para chatbot
  promptOriginal?: string;             // Comando original del usuario
  items: PurchaseRequestItem[];
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### PurchaseRequestItem

```typescript
{
  id: string;
  purchaseRequestId: string;
  descripcion: string;
  cantidad: number;
  especificaciones?: string;  // JSON array serializado
  unidadMedida?: string;      // Default: "unidad"
  precioEstimado?: Decimal;
  createdAt: DateTime;
}
```

---

## Prompt Engineering

El prompt del sistema define:

1. **Contexto del usuario** (nombre, email, rol, tenant)
2. **Acciones disponibles** con formato JSON esperado
3. **Reglas de negocio** (validaciones, defaults)
4. **Ejemplos** de conversiones

**Estructura del prompt:**
```
Eres un asistente IA para ProHub...

CONTEXTO DEL USUARIO:
- Nombre: {userName}
- Empresa: {tenantId}

ACCIONES DISPONIBLES:
1. crear_requerimiento
2. consultar_estado
3. aprobar_documento

FORMATO DE RESPUESTA (JSON):
{
  "accion": "crear_requerimiento",
  "entidades": { ... }
}

REGLAS:
- Responde SOLO con JSON
- Si falta info crítica, usa "unknown"

EJEMPLOS:
Usuario: "Notebook para diseño, $2000"
{
  "accion": "crear_requerimiento",
  "entidades": {
    "items": [{"descripcion": "Notebook para diseño gráfico", "cantidad": 1}],
    "categoria": "Tecnología",
    "presupuesto": 2000
  }
}
```

---

## Error Handling

### Errores de IA

```typescript
try {
  const action = JSON.parse(response);
} catch (error) {
  // Si Claude no devuelve JSON válido
  return {
    accion: 'unknown',
    error: 'No se pudo parsear la respuesta'
  };
}
```

### Errores de Ejecución

```typescript
try {
  await prisma.purchaseRequest.create({ ... });
} catch (error) {
  return {
    success: false,
    message: 'No se pudo crear el requerimiento',
    error: error.message
  };
}
```

### Validaciones

```typescript
// Validar que tenga items
if (!action.entidades?.items || action.entidades.items.length === 0) {
  return {
    success: false,
    message: 'Se requiere al menos un item'
  };
}

// Validar permisos
if (!userHasPermission(user, 'CREATE_PURCHASE_REQUEST')) {
  return {
    success: false,
    message: 'No tenés permisos para crear requerimientos'
  };
}
```

---

## Testing

### Unit Test (manual)

```bash
# Test del servicio
cd backend
npx tsx src/services/aiAssistant.ts
```

### Integration Test

```bash
# Con curl
curl -X POST http://localhost:4000/api/v1/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Necesito una impresora",
    "tenantId": "cm..."
  }'
```

### Health Check

```bash
curl http://localhost:4000/api/v1/chat/health
```

---

## Logs

El sistema genera logs detallados:

```
🤖 [AI Assistant] Procesando comando...
   Usuario: Juan Pérez (juan@empresa.com)
   Tenant: cm...
   Mensaje: "Necesito una notebook"

📤 Respuesta de Claude recibida (250 caracteres)
✅ Acción identificada: crear_requerimiento

⚙️  [Action Executor] Ejecutando: crear_requerimiento
📝 Creando requerimiento REQ-2025-00001...
✅ Requerimiento REQ-2025-00001 creado exitosamente
```

---

## Performance

### Tiempos de respuesta típicos:

- Claude API: 1-3 segundos
- Creación en BD: < 100ms
- **Total: 1-3.5 segundos**

### Optimizaciones futuras:

- [ ] Caché de respuestas frecuentes
- [ ] Streaming de respuestas
- [ ] Rate limiting por tenant
- [ ] Async processing para acciones lentas

---

## Seguridad

### Validaciones implementadas:

- ✅ JWT authentication requerida
- ✅ Validación de tenant membership
- ✅ Validación de permisos (roles)
- ✅ Sanitización de inputs
- ✅ Rate limiting (pendiente)

### Datos sensibles:

- ❌ **NO** se envían contraseñas a Claude
- ❌ **NO** se envían datos de otros tenants
- ✅ Solo contexto necesario (nombre, email, rol)

---

## Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `ANTHROPIC_API_KEY no configurada` | Falta variable en .env | Agregar key en .env |
| `AI Assistant no disponible` | Key inválida o expirada | Regenerar key en Anthropic Console |
| `No se pudo parsear la respuesta` | Claude devolvió texto mal formado | Revisar prompt, reintentar |
| `Items requeridos` | Comando muy ambiguo | Usuario debe reformular |
| `No tienes acceso a este tenant` | Usuario no pertenece al tenant | Verificar membresía |

---

## Roadmap

### Implementado ✅
- [x] Crear requerimientos con IA
- [x] Consultar estado de requerimientos
- [x] Multi-tenant isolation
- [x] Health check endpoint

### Próximo Sprint 🚀
- [ ] Aprobar/rechazar documentos
- [ ] Consultas avanzadas (filtros, búsquedas)
- [ ] Exportar reportes
- [ ] Notificaciones proactivas

### Futuro 🌟
- [ ] Streaming de respuestas
- [ ] Historial de conversaciones persistente
- [ ] Comandos de voz
- [ ] Analytics de uso
- [ ] Fine-tuning del modelo

---

**Última actualización:** 30 Nov 2025
**Versión:** 1.0
**Autor:** Equipo ProHub
