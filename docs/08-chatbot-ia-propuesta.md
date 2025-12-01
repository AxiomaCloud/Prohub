# Propuesta: Chatbot/Asistente IA para HUB

## Resumen Ejecutivo

Integrar un asistente conversacional basado en IA que permita a los usuarios crear y gestionar documentos, órdenes de compra y requerimientos mediante comandos en lenguaje natural.

**Ejemplo de uso:**
> "Haceme un requerimiento para la compra de una notebook para mi"

El sistema interpreta la solicitud, extrae la información relevante y genera automáticamente el documento correspondiente.

---

## Opciones de Implementación

> **⭐ RECOMENDACIÓN: Chat Widget Integrado**
>
> **¿Por qué es la mejor opción?**
> - ✅ **No invasivo:** Está cuando lo necesitás, desaparece cuando no
> - ✅ **Familiar:** Los usuarios ya conocen este patrón (WhatsApp Web, Intercom)
> - ✅ **Contextual:** Puede sugerir acciones basadas en la pantalla actual
> - ✅ **Escalable:** Fácil agregar más funcionalidades sin cambiar la UI principal
> - ✅ **ROI más alto:** Implementación moderada con máximo impacto en UX
>
> *Las otras opciones se presentan para comparación, pero el widget es la opción óptima para HUB.*

---

### 1. Chat Widget Integrado (✓ Recomendado)

Widget flotante tipo Intercom/Crisp integrado en la interfaz de HUB.

**Características:**
- Botón flotante accesible desde cualquier pantalla
- Panel de chat expandible
- Comandos de voz y texto
- Sugerencias contextuales basadas en la pantalla actual

**Casos de uso:**
- "Crear requerimiento para compra de notebook Dell i7 32GB RAM"
- "Generar comprobante de la orden #1234"
- "Mostrar estado de mis solicitudes pendientes"
- "Aprobar todos los documentos pendientes de Proveedor XYZ"

**Ventajas:**
- Contexto del usuario disponible (sesión activa, empresa actual, rol)
- Pre-rellena formularios automáticamente
- Acceso directo a las APIs del sistema
- No interrumpe el flujo de trabajo

### 2. Asistente en Header/Sidebar

Barra de comandos persistente similar a GitHub Copilot Chat.

**Características:**
- Siempre visible en la interfaz
- Historial de comandos
- Acceso rápido mediante atajo de teclado (Ej: Ctrl+K)

**Ventajas:**
- Mayor visibilidad
- Fomenta el uso constante
- Integración más nativa con la UI

**Desventajas:**
- Ocupa espacio permanente en pantalla

### 3. Comandos Slash (estilo Slack/Notion)

Sistema de comandos en inputs existentes.

**Ejemplos:**
- `/crear-orden laptop HP` → Abre modal pre-llenado
- `/estado orden-1234` → Muestra información
- `/aprobar doc-5678` → Aprueba documento

**Ventajas:**
- Implementación más ligera
- No requiere UI adicional
- Usuarios familiarizados con el patrón

**Desventajas:**
- Menos descubrible
- Requiere memorizar comandos
- No tan conversacional

---

## Arquitectura Técnica

### Stack Tecnológico

Aprovechando la infraestructura existente con **Parse**:

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │ Escribe comando en lenguaje natural
       ▼
┌─────────────────────────┐
│  Widget Chat (Frontend) │
│  - shadcn/ui components │
│  - React/Next.js        │
└──────────┬──────────────┘
           │ POST /api/chat
           ▼
┌─────────────────────────┐
│   Parse Cloud Function  │
│   - Recibe mensaje      │
│   - Contexto usuario    │
└──────────┬──────────────┘
           │ Procesa con Parse AI
           ▼
┌─────────────────────────┐
│      Parse AI (IA)      │
│   - Claude/GPT-4        │
│   - Extrae entidades    │
│   - Identifica acción   │
└──────────┬──────────────┘
           │ Retorna intención estructurada
           ▼
┌─────────────────────────┐
│  Orquestador (Parse)    │
│  - Valida permisos      │
│  - Llama API Hub        │
└──────────┬──────────────┘
           │ POST /purchase-requests (etc)
           ▼
┌─────────────────────────┐
│    API Hub (Backend)    │
│  - Crea documento       │
│  - Retorna resultado    │
└──────────┬──────────────┘
           │ Respuesta JSON
           ▼
┌─────────────────────────┐
│  Widget Chat (Frontend) │
│  "✅ Documento creado"  │
└─────────────────────────┘
```

### Componentes Principales

**1. Frontend - Widget Chat**
- Componente React con shadcn/ui
- Manejo de estado con Zustand/Context
- Streaming de respuestas (efecto de escritura)
- Markdown rendering para respuestas formateadas

**2. Backend - Parse Cloud Functions**
```javascript
// Ejemplo simplificado
Parse.Cloud.define("chatbot-command", async (request) => {
  const { message, context } = request.params;

  // 1. Validar sesión y permisos
  const user = request.user;

  // 2. Procesar con Parse AI
  const aiResponse = await Parse.AI.chat({
    messages: [{
      role: "system",
      content: systemPrompt // Define capacidades y formato
    }, {
      role: "user",
      content: message
    }],
    model: "claude-3-5-sonnet"
  });

  // 3. Extraer acción estructurada
  const action = parseAIResponse(aiResponse);

  // 4. Ejecutar acción
  const result = await executeAction(action, user);

  return result;
});
```

**3. Procesamiento IA**

El prompt del sistema define:
- Acciones disponibles (crear_orden, aprobar_doc, consultar_estado, etc.)
- Formato de respuesta (JSON estructurado)
- Reglas de negocio (límites, validaciones)
- Contexto del usuario (empresa, rol, permisos)

**4. Integración con APIs Existentes**

Reutiliza todos los endpoints documentados:
- `POST /api/purchase-requests` - Crear requerimientos
- `POST /api/orders` - Generar órdenes
- `PATCH /api/documents/{id}/approve` - Aprobar documentos
- `GET /api/documents` - Consultar estados

---

## Flujo de Ejemplo Detallado

### Caso: Crear Requerimiento de Compra

**Input del usuario:**
> "Necesito una notebook para diseño gráfico, presupuesto máximo $2000, urgente"

**Procesamiento Parse AI:**
```json
{
  "accion": "crear_purchase_request",
  "entidades": {
    "categoria": "Tecnología",
    "items": [{
      "descripcion": "Notebook para diseño gráfico",
      "tipo": "Hardware",
      "especificaciones_sugeridas": [
        "GPU dedicada (NVIDIA/AMD)",
        "16GB RAM mínimo",
        "Pantalla >15\" alta resolución"
      ]
    }],
    "presupuesto_maximo": 2000,
    "urgencia": "alta",
    "justificacion": "Herramienta de trabajo para diseño gráfico"
  }
}
```

**Respuesta del sistema:**
```
✅ Borrador de requerimiento creado

📋 Resumen:
• Categoría: Tecnología
• Item: Notebook para diseño gráfico
• Presupuesto: $2000
• Urgencia: Alta

Especificaciones recomendadas:
• GPU dedicada (NVIDIA/AMD)
• 16GB RAM mínimo
• Pantalla >15" alta resolución

¿Querés:
1. [Revisar y editar] el borrador
2. [Enviar directamente] a aprobación
3. [Agregar más detalles]
```

---

## Capacidades del Asistente

### Gestión de Documentos
- ✅ Crear purchase requests
- ✅ Generar órdenes de compra
- ✅ Crear comprobantes de pago
- ✅ Aprobar/rechazar documentos
- ✅ Consultar estados y tracking

### Consultas Inteligentes
- 📊 "¿Cuántas órdenes tengo pendientes?"
- 🔍 "Mostrame documentos de Proveedor XYZ del último mes"
- 💰 "¿Cuál es el total de compras de este trimestre?"
- ⏱️ "¿Qué documentos están por vencer?"

### Acciones Masivas
- ♻️ "Aprobar todos los documentos de menos de $1000"
- 📧 "Recordar a proveedores con documentos pendientes"
- 📄 "Exportar reporte de compras del mes"

### Asistencia Contextual
- 💡 Sugerencias basadas en pantalla actual
- 🔔 Notificaciones proactivas ("Tenés 3 docs para aprobar")
- 📝 Auto-completado de campos repetitivos

---

## Consideraciones de Implementación

### Seguridad y Permisos

**Validación estricta:**
- Todos los comandos validan permisos del usuario actual
- Respeta roles (Supplier, Customer, Admin)
- Multi-tenant: solo acceso a datos de su empresa
- Rate limiting para prevenir abuso

**Ejemplo:**
```javascript
// Usuario con rol "Supplier" intenta aprobar un documento
if (action.tipo === "aprobar" && user.role !== "Admin") {
  return {
    error: true,
    message: "No tenés permisos para aprobar documentos. Solo Admins pueden hacerlo."
  };
}
```

### Experiencia de Usuario

**Confirmaciones para acciones críticas:**
- Eliminar documentos
- Aprobar montos grandes (>$X)
- Cambios de estado irreversibles

**Feedback visual:**
- Loading states durante procesamiento
- Animaciones de éxito/error
- Preview antes de ejecutar acción

**Onboarding:**
- Tutorial interactivo al primer uso
- Ejemplos de comandos comunes
- Tips contextuales

### Performance

**Optimizaciones:**
- Caché de respuestas frecuentes
- Streaming de respuestas largas
- Lazy loading del widget
- Debounce en inputs

**Límites:**
- Máximo de tokens por request
- Timeout de 30s por comando
- Queue para acciones masivas

---

## Fases de Implementación

### Fase 1: MVP (2-3 semanas)
- Widget básico con UI minimal
- Comandos principales:
  - Crear purchase request
  - Consultar estado documentos
  - Aprobar/rechazar documentos
- Integración con Parse AI
- Testing con usuarios beta

### Fase 2: Expansión (2-3 semanas)
- Comandos avanzados (búsquedas, reportes)
- Acciones masivas
- Mejoras de UX (sugerencias, autocomplete)
- Historial de conversaciones
- Exportación de datos

### Fase 3: Inteligencia (3-4 semanas)
- Aprendizaje de patrones de usuario
- Sugerencias proactivas
- Integración con notificaciones
- Comandos de voz
- Analytics de uso

---

## Estimación de Costos

### Desarrollo
- **Fase 1 (MVP):** 80-120 horas
- **Fase 2 (Expansión):** 60-80 horas
- **Fase 3 (Inteligencia):** 80-100 horas

### Infraestructura (mensual)
- **Parse AI (Claude/GPT):**
  - ~$0.01-0.03 por request
  - Estimado 1000 requests/mes: $10-30/mes
- **Parse Backend:** Incluido en plan actual
- **Hosting Widget:** Negligible (CDN)

**Total infraestructura:** ~$15-50/mes dependiendo de uso

---

## Beneficios Esperados

### Para Usuarios
- ⚡ **Velocidad:** Crear documentos en segundos vs minutos
- 🎯 **Simplicidad:** Lenguaje natural vs formularios complejos
- 📱 **Accesibilidad:** Desde cualquier dispositivo
- 🧠 **Inteligencia:** Aprende preferencias del usuario

### Para el Negocio
- 📈 **Adopción:** Reduce fricción de usuarios nuevos
- 💼 **Productividad:** Menos tiempo en tareas administrativas
- 🔄 **Retención:** Feature diferenciador vs competencia
- 📊 **Datos:** Insights sobre cómo usan el sistema

### Diferenciación Competitiva
- ✨ **Innovación:** Pocos ERP tienen IA conversacional
- 🚀 **Marketing:** "HUB con Asistente IA"
- 💎 **Premium:** Justifica pricing más alto

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| IA malinterpreta comandos | Media | Medio | Confirmaciones para acciones críticas, feedback claro |
| Costos de IA exceden estimado | Baja | Bajo | Rate limiting, caché agresivo, fallback a comandos |
| Usuarios no lo adoptan | Media | Alto | Onboarding proactivo, gamificación, métricas de uso |
| Problemas de permisos | Baja | Alto | Testing exhaustivo de roles, auditoría de acciones |

---

## Métricas de Éxito

### KPIs (3 meses post-lanzamiento)
- **Adopción:** >40% de usuarios activos usan el chatbot
- **Frecuencia:** >5 comandos/usuario/semana
- **Satisfacción:** NPS >50 en feature específico
- **Eficiencia:** -30% tiempo de creación de documentos
- **Precisión IA:** >85% comandos correctamente interpretados

### Tracking
- Comandos más usados
- Tasa de error/re-intentos
- Tiempo promedio de respuesta
- Conversiones (chat → documento creado)

---

## Próximos Pasos

1. **Validación:** Reunión para aprobar propuesta
2. **Priorización:** Definir comandos del MVP
3. **Diseño:** Wireframes del widget y flujos
4. **Prototipo:** PoC funcional (1 semana)
5. **Desarrollo:** Fase 1 completa
6. **Beta:** Testing con 10-20 usuarios
7. **Launch:** Rollout gradual

---

## Referencias Técnicas

- **Parse AI Docs:** https://docs.parseplatform.org/parse-server/guide/#ai
- **shadcn/ui Chat:** https://ui.shadcn.com/docs/components/chat
- **Claude API:** https://docs.anthropic.com/claude/reference
- **API Hub:** Ver `docs/06-api-endpoints.md`

---

**Documento creado:** 2025-11-30
**Versión:** 1.0
**Autores:** Equipo HUB + Claude Code
