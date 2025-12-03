# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.2.0] - 2025-12-02

### 🛒 Mejoras en Circuito de Compras

#### OCs Parciales - Múltiples OC por Requerimiento

Ahora es posible generar múltiples Órdenes de Compra para un mismo Requerimiento, permitiendo dividir los items entre diferentes proveedores.

**Cambios en Backend:**
- `backend/prisma/schema.prisma` - Removido `@unique` de `purchaseRequestId` en PurchaseOrder
- Agregado `purchaseRequestItemId` en PurchaseOrderItem para trazabilidad item por item
- Backend permite crear OC cuando estado es APROBADO o OC_GENERADA

**Cambios en Frontend:**
- `frontend/src/app/compras/ordenes-compra/page.tsx`:
  - Checkboxes para seleccionar items específicos
  - Cálculo de cantidades pendientes (no incluidas en OCs anteriores)
  - Badge "Parcial (X/Y)" para items con OC parcial
  - Campos editables de cantidad y precio unitario

#### Soporte de Decimales

Agregado soporte completo para cantidades y precios con decimales.

**Schema Prisma actualizado:**
```prisma
PurchaseRequestItem:
  cantidad          Decimal @db.Decimal(18,4)
  precioEstimado    Decimal? @db.Decimal(18,4)

PurchaseOrderItem:
  cantidad            Decimal @db.Decimal(18,4)
  cantidadRecibida    Decimal @db.Decimal(18,4) @default(0)
  precioUnitario      Decimal @db.Decimal(18,4)
  total               Decimal @db.Decimal(18,4)

ReceptionItem:
  cantidadEsperada  Decimal @db.Decimal(18,4)
  cantidadRecibida  Decimal @db.Decimal(18,4)
  cantidadPendiente Decimal @db.Decimal(18,4)
```

**Frontend:**
- Inputs numéricos con `step="0.01"` para decimales
- Removidos spinners de campos numéricos
- Conversión con `Number()` para cálculos con Decimal de Prisma

#### Indicadores de Progreso

Agregados indicadores visuales de porcentaje completado en las grillas.

**Páginas actualizadas:**
- `requerimientos/page.tsx` - % de items cubiertos con OC
- `ordenes-compra/page.tsx` - % de items recibidos
- `recepcion/page.tsx` - % de recepción completada

**Características:**
- Barra de progreso visual con colores según estado
- Porcentaje numérico
- Colores: rojo (0-25%), naranja (25-50%), amarillo (50-75%), verde (75-100%)

#### Múltiples Recepciones en Trazabilidad

El modal de trazabilidad ahora muestra todas las recepciones realizadas para una OC.

**Archivos modificados:**
- `frontend/src/components/compras/CircuitoCompraModal.tsx`
- `frontend/src/components/compras/CircuitoCompraTimeline.tsx`

#### Columnas Adicionales en Recepciones

Agregadas columnas faltantes en la página de recepciones:
- Título del requerimiento
- Creado Por (solicitante)
- Prioridad (con badge de colores)
- Categoría

### 📝 Modificado

**Textos y Labels:**
- `RequerimientoModal.tsx` - "Justificación" → "Observaciones"
- `requerimientos/page.tsx` - Título "Mis Requerimientos" → "Requerimientos"
- `aprobaciones/page.tsx` - Título → "Aprobaciones de Requerimientos"
- `aprobaciones-oc/page.tsx` - Título → "Aprobaciones de Ordenes de Compra"

**Display de CUIT:**
- Se oculta el CUIT si comienza con "TEMP-" (dato temporal)
- Archivos: `ordenes-compra/page.tsx`, `recepcion/page.tsx`, `aprobaciones-oc/page.tsx`, `ordenes-compra/[id]/page.tsx`

### 🔧 Correcciones

- Fix: Números extraños en indicadores (ej: "01129/02450") - Causado por Decimal de Prisma concatenado como string
- Fix: Campos no editables en modal de creación de OC
- Fix: Cantidad total mostrada en lugar de pendiente al crear segunda OC parcial

### 📋 Migración Requerida

```bash
cd backend
npx prisma migrate dev --name decimal_support
```

---

## [1.1.0] - 2025-11-30

### 🤖 Agregado - Chatbot con IA (Claude)

Sistema completo de chatbot con inteligencia artificial para crear requerimientos de compra usando lenguaje natural.

#### Backend

**Nuevos archivos:**
- `backend/src/services/aiAssistant.ts` - Servicio de integración con Claude API
- `backend/src/services/actionExecutor.ts` - Ejecutor de acciones identificadas por IA
- `backend/src/routes/chat.ts` - Endpoint REST para chatbot
- `backend/src/services/README_AI_CHATBOT.md` - Documentación técnica completa

**Modelos Prisma:**
- `PurchaseRequest` - Requerimientos de compra
- `PurchaseRequestItem` - Items de requerimientos
- Enums: `PurchaseRequestStatus`, `PurchaseRequestPriority`

**API Endpoints:**
- `POST /api/v1/chat` - Procesar comandos de lenguaje natural
- `GET /api/v1/chat/health` - Health check del servicio de IA

**Dependencias:**
- `@anthropic-ai/sdk@^0.71.0` - SDK oficial de Anthropic

**Variables de entorno:**
- `ANTHROPIC_API_KEY` - API key de Claude (requerida)

#### Frontend

**Nuevos componentes:**
- `components/chat/ChatWidget.tsx` - Widget flotante principal
- `components/chat/ChatMessage.tsx` - Componente de mensaje individual
- `components/chat/ChatWidgetWrapper.tsx` - Wrapper con AuthContext
- `lib/chatService.ts` - Servicio HTTP para comunicación con API

**Integración:**
- Widget global agregado en `app/layout.tsx`
- Disponible en todas las pantallas después de login
- Integración completa con sistema de autenticación

#### Documentación

- `docs/AI_CHATBOT_SETUP.md` - Guía completa de configuración y uso
- `backend/src/services/README_AI_CHATBOT.md` - Documentación técnica de servicios
- `CHANGELOG.md` - Este archivo

#### Características

✅ **Crear requerimientos con lenguaje natural**
```
Ejemplos:
- "Necesito una notebook para diseño, presupuesto $2000, urgente"
- "Haceme un requerimiento de 5 sillas de oficina ergonómicas"
- "Quiero 10 paquetes de papel A4 para la oficina"
```

✅ **Consultar estado de requerimientos**
```
- "Mostrame mis requerimientos pendientes"
- "¿Qué requerimientos tengo aprobados?"
```

✅ **Widget flotante intuitivo**
- Botón flotante estilo WhatsApp/Intercom
- Panel expandible con historial
- Respuestas en tiempo real
- Formato markdown en mensajes
- Indicadores de carga y estado

✅ **Seguridad y multi-tenancy**
- Autenticación JWT requerida
- Aislamiento por tenant
- Validación de permisos
- Auditoría completa (campo `promptOriginal` en BD)

#### Costos

- **Claude 3.5 Sonnet:** ~$0.005 USD por requerimiento
- Estimado: 1000 req/mes = ~$5 USD, 5000 req/mes = ~$25 USD

#### Testing

```bash
# Health check
curl http://localhost:4000/api/v1/chat/health

# Crear requerimiento
curl -X POST http://localhost:4000/api/v1/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Necesito una notebook", "tenantId": "cm..."}'
```

### 📝 Modificado

- `backend/src/server.ts` - Registrada ruta `/api/v1/chat`
- `backend/.env` - Agregada variable `ANTHROPIC_API_KEY`
- `backend/prisma/schema.prisma` - Agregados modelos de Purchase Requests
- `frontend/src/app/layout.tsx` - Integrado ChatWidgetWrapper
- `README.md` - Agregada sección de Chatbot con IA

### 🔧 Configuración requerida

Para usar el chatbot:

1. Obtener API key en https://console.anthropic.com/
2. Configurar en `backend/.env`: `ANTHROPIC_API_KEY="sk-ant-..."`
3. Migrar base de datos: `npx prisma migrate dev`
4. Reiniciar backend

Ver documentación completa en `docs/AI_CHATBOT_SETUP.md`

---

## [1.0.0] - 2025-11-16

### 🎉 Release Inicial

Sistema base de Hub - Portal de Proveedores

#### Backend

**Stack:**
- Express.js + TypeScript
- Prisma ORM + PostgreSQL
- JWT Authentication
- Socket.io (WebSockets)

**Funcionalidades:**
- Autenticación multi-tenant
- Gestión de documentos
- Gestión de usuarios y tenants
- Sistema de menú dinámico
- Integración con Parse API

#### Frontend

**Stack:**
- Next.js 15 + React 19
- TypeScript
- Tailwind CSS
- SWR (data fetching)

**Módulos:**
- Dashboard principal
- Gestión de documentos
- Panel de administración (users, tenants, menu)
- Selector de tenant
- Sistema de autenticación

#### Infraestructura

- Monorepo con workspaces (backend, frontend, shared)
- Scripts de desarrollo automatizados
- Configuración Docker (opcional)

---

## Tipos de cambios

- `Agregado` - Nueva funcionalidad
- `Modificado` - Cambio en funcionalidad existente
- `Deprecado` - Funcionalidad que será removida
- `Removido` - Funcionalidad removida
- `Corregido` - Corrección de bugs
- `Seguridad` - Cambios relacionados con seguridad

---

**Formato de versiones:**
- **MAJOR.MINOR.PATCH**
- MAJOR: Cambios incompatibles en API
- MINOR: Nueva funcionalidad compatible
- PATCH: Correcciones de bugs
