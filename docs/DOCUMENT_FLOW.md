# FLUJO DE DOCUMENTOS - Pipeline y Estados

Diseño del sistema de estados para documentos en Hub con visualización tipo Kanban/Pipeline.

---

## 🎯 PROBLEMA A RESOLVER

**❌ Competencia:**
- Estado de documento mostrado como un simple campo de texto
- Sin visibilidad del flujo completo
- No se ve quién hizo qué acción ni cuándo
- Sin historial de cambios
- Vista plana y poco intuitiva

**✅ Solución AXIOMA:**
- Pipeline visual tipo Kanban (Trello/Jira)
- Timeline completo de eventos
- Notificaciones en tiempo real
- Drag & drop para cambiar estados (admin)
- Filtros y búsqueda avanzada

---

## 📊 ESTADOS DEL DOCUMENTO

### Estados Principales

```
1. PRESENTADO
   ↓
2. EN REVISIÓN
   ↓
3. APROBADO
   ↓
4. PAGADO

   O bien...

3. RECHAZADO
```

### Definición de Estados

#### 1. **PRESENTADO**
- **Descripción**: Documento recién cargado por el proveedor
- **Trigger**: Proveedor sube documento y confirma datos (Parse)
- **Siguiente acción**: Administrador/Aprobador revisa
- **Color**: Azul `#3B82F6`
- **Icono**: 📤

**Acciones disponibles:**
- **Proveedor**: Ver detalle, cancelar (solo primeras 24hs)
- **Admin**: Mover a "En Revisión", Rechazar

#### 2. **EN REVISIÓN**
- **Descripción**: Administrador está revisando el documento
- **Trigger**: Admin toma el documento para revisar
- **Siguiente acción**: Admin aprueba o rechaza
- **Color**: Amarillo `#F59E0B`
- **Icono**: 👀

**Acciones disponibles:**
- **Proveedor**: Ver detalle, responder comentarios, adjuntar docs adicionales
- **Admin**: Aprobar, Rechazar, Solicitar información, Comentar

#### 3. **APROBADO**
- **Descripción**: Documento aprobado, esperando pago
- **Trigger**: Admin aprueba el documento
- **Siguiente acción**: Sistema de pagos emite pago
- **Color**: Verde `#10B981`
- **Icono**: ✅

**Acciones disponibles:**
- **Proveedor**: Ver detalle, descargar comprobante
- **Admin**: Ver detalle, programar pago, revertir (con motivo)

#### 4. **PAGADO**
- **Descripción**: Pago emitido
- **Trigger**: Sistema de pagos marca como pagado
- **Siguiente acción**: Ninguna (estado final)
- **Color**: Verde oscuro `#059669`
- **Icono**: 💰

**Acciones disponibles:**
- **Proveedor**: Ver detalle, descargar comprobante de pago, descargar retenciones
- **Admin**: Ver detalle, reimprimir comprobantes

#### 5. **RECHAZADO**
- **Descripción**: Documento rechazado con motivo
- **Trigger**: Admin rechaza el documento
- **Siguiente acción**: Proveedor corrige y re-envía (nuevo documento)
- **Color**: Rojo `#EF4444`
- **Icono**: ❌

**Acciones disponibles:**
- **Proveedor**: Ver motivo, corregir y re-enviar
- **Admin**: Ver detalle, re-abrir (excepcional)

---

## 🎨 DISEÑO DE LA VISTA KANBAN

### Layout Desktop

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Mis Facturas                              [🔲 Kanban] [📋 Tabla]        │
│  🔍 Buscar...   📅 Rango fechas   💰 Monto   🏢 Empresa   [⬇️ Exportar]   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRESENTADO     EN REVISIÓN    APROBADO        PAGADO        RECHAZADO  │
│  (12)           (8)            (24)            (45)          (3)         │
│  ─────────      ─────────      ─────────       ─────────     ─────────  │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    ┌──────────┐  ┌─────────┐│
│  │📄 F-001  │  │📄 F-015  │  │📄 F-008  │    │📄 F-002  │  │📄 F-020 ││
│  │          │  │          │  │          │    │          │  │         ││
│  │$60,500   │  │$25,000   │  │$100,000  │    │$30,000   │  │$10,000  ││
│  │          │  │          │  │          │    │          │  │         ││
│  │Hoy 14:30 │  │2 días    │  │5 días    │    │10 días   │  │3 días   ││
│  │          │  │          │  │          │    │          │  │         ││
│  │OC-1234   │  │OC-1567   │  │OC-2341   │    │OC-1234   │  │Sin OC   ││
│  │          │  │⚠️ 1 msg  │  │          │    │💰Prog.   │  │📝 Motivo││
│  └──────────┘  └──────────┘  └──────────┘    └──────────┘  └─────────┘│
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    ┌──────────┐              │
│  │📄 F-003  │  │📄 F-012  │  │📄 F-009  │    │📄 F-004  │              │
│  │$75,000   │  │$45,000   │  │$60,000   │    │$80,000   │              │
│  │Hoy 10:00 │  │1 día     │  │7 días    │    │12 días   │              │
│  │OC-2456   │  │Sin OC    │  │OC-3456   │    │OC-2456   │              │
│  └──────────┘  └──────────┘  └──────────┘    └──────────┘              │
│                                                                          │
│  [+ Más]       [+ Más]       [+ Más]         [+ Más]                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Tarjeta de Documento (Card)

```
┌────────────────────────────┐
│ 📄 F-001-00045678          │ ← Tipo + Número
├────────────────────────────┤
│                            │
│ $60,500.00                 │ ← Monto destacado
│                            │
│ 📅 Hoy 14:30               │ ← Timestamp relativo
│ 📋 OC-2024-1234            │ ← OC relacionada
│                            │
│ Proveedor ABC SA           │ ← Nombre proveedor
│                            │
│ ⚠️ 1 mensaje nuevo         │ ← Notificación (si hay)
│                            │
│ [👁️ Ver]                   │ ← Acción rápida
└────────────────────────────┘
```

### Interacciones

1. **Click en tarjeta**: Abre modal con detalle completo
2. **Drag & drop** (solo admin): Mover entre columnas
3. **Hover**: Muestra preview rápido
4. **Badge de notificación**: Indica mensajes nuevos

---

## 🔍 DETALLE DEL DOCUMENTO (Modal)

### Layout del Modal

```
┌───────────────────────────────────────────────────────────────────┐
│  Factura F-001-00045678                        [⭐][🔗][📤][❌]  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │                      │  │  INFORMACIÓN                     │ │
│  │                      │  │                                  │ │
│  │   Vista Previa       │  │  Estado: 📤 PRESENTADO          │ │
│  │   del Documento      │  │  Fecha: 13/11/2025 14:30        │ │
│  │   (Axioma Docs)      │  │  Proveedor: ABC SA              │ │
│  │                      │  │  CUIT: 30-12345678-9            │ │
│  │   [Factura imagen]   │  │                                  │ │
│  │                      │  │  MONTOS                          │ │
│  │   🔍 [+][-] ↻ 🖨️ ⬇️ │  │  Subtotal:    $ 50,000.00       │ │
│  │                      │  │  IVA (21%):   $ 10,500.00       │ │
│  │                      │  │  Total:       $ 60,500.00       │ │
│  │                      │  │                                  │ │
│  └──────────────────────┘  │  OC RELACIONADA                  │ │
│                            │  OC-2024-1234                    │ │
│                            │  Monto OC: $500,000              │ │
│  ┌──────────────────────┐  │  Facturado: $310,500 (62%)      │ │
│  │  TIMELINE            │  │  [👁️ Ver OC]                     │ │
│  │                      │  │                                  │ │
│  │  ✅ Presentado       │  │  ARCHIVOS ADJUNTOS (2)           │ │
│  │  13/11 14:30         │  │  📎 factura.pdf (1.2 MB)        │ │
│  │  Por: juan@prov.com  │  │  📎 remito.pdf (0.8 MB)         │ │
│  │                      │  │                                  │ │
│  │  ⏳ En revisión      │  │  [📎 Adjuntar más archivos]     │ │
│  │  13/11 15:00         │  │                                  │ │
│  │  Por: ana@cliente    │  │                                  │ │
│  │                      │  └──────────────────────────────────┘ │
│  │  ✅ Aprobado         │                                        │
│  │  Pendiente...        │                                        │
│  │                      │                                        │
│  └──────────────────────┘                                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  COMENTARIOS Y COMUNICACIONES (3)                            ││
│  │                                                              ││
│  │  Ana López (Cliente) - 13/11 15:10                           ││
│  │  "Necesitamos el remito adjunto para aprobar"               ││
│  │                                                              ││
│  │  Juan Pérez (Proveedor) - 13/11 15:30                       ││
│  │  "Remito adjuntado. Cualquier consulta estoy disponible"    ││
│  │  📎 remito.pdf                                               ││
│  │                                                              ││
│  │  [💬 Agregar comentario...]                                  ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  ACCIONES:                                                        │
│  [✅ Aprobar]  [❌ Rechazar]  [💬 Solicitar Info]  [📧 Contactar] │
└───────────────────────────────────────────────────────────────────┘
```

### Secciones del Modal

#### 1. Header
- Número de factura
- Acciones rápidas: Favorito, Copiar link, Compartir, Cerrar

#### 2. Columna Izquierda
- **Vista previa del documento** (Axioma Docs)
- Controles: Zoom, rotación, imprimir, descargar

#### 3. Columna Derecha
- **Información básica**: Estado, fecha, proveedor, CUIT
- **Montos**: Subtotal, IVA, total
- **OC relacionada**: Con barra de progreso
- **Archivos adjuntos**: Lista con opción de agregar más

#### 4. Timeline
- Historial cronológico de todos los eventos
- Quién hizo qué y cuándo
- Estados anteriores

#### 5. Comentarios
- Chat/conversación sobre este documento
- Adjuntar archivos en comentarios
- Notificaciones en tiempo real

#### 6. Footer
- Botones de acción según permisos del usuario

---

## 🔄 TRANSICIONES DE ESTADO

### Diagrama de Flujo

```
     ┌─────────────┐
     │ PRESENTADO  │
     └──────┬──────┘
            │
            ├──────────────────┐
            │                  │
            ▼                  ▼
     ┌─────────────┐    ┌────────────┐
     │ EN REVISIÓN │    │ RECHAZADO  │
     └──────┬──────┘    └────────────┘
            │
            ├──────────────────┐
            │                  │
            ▼                  ▼
     ┌─────────────┐    ┌────────────┐
     │  APROBADO   │    │ RECHAZADO  │
     └──────┬──────┘    └────────────┘
            │
            ▼
     ┌─────────────┐
     │   PAGADO    │
     └─────────────┘
```

### Reglas de Transición

| Desde | Hacia | Quién puede | Condiciones |
|-------|-------|-------------|-------------|
| PRESENTADO | EN REVISIÓN | Admin/Aprobador | Ninguna |
| PRESENTADO | RECHAZADO | Admin/Aprobador | Debe indicar motivo |
| EN REVISIÓN | APROBADO | Admin/Aprobador | Documentación completa |
| EN REVISIÓN | RECHAZADO | Admin/Aprobador | Debe indicar motivo |
| EN REVISIÓN | PRESENTADO | Admin (revertir) | Caso excepcional |
| APROBADO | PAGADO | Sistema automático | Pago emitido |
| APROBADO | EN REVISIÓN | Admin (revertir) | Debe indicar motivo |
| RECHAZADO | PRESENTADO | No permitido | Proveedor crea nuevo doc |

---

## 🔔 NOTIFICACIONES POR CAMBIO DE ESTADO

### Configuración de Notificaciones

Cada cambio de estado dispara notificaciones automáticas según configuración del usuario.

#### PRESENTADO → EN REVISIÓN

**Para Proveedor:**
```
📬 Tu factura está siendo revisada

Factura: F-001-00045678
Monto: $60,500.00
Asignado a: Ana López

Tiempo estimado de aprobación: 24-48hs

[Ver detalle →]
```

**Canales:** Email, Push (opcional WhatsApp)

#### EN REVISIÓN → APROBADO

**Para Proveedor:**
```
✅ ¡Factura aprobada!

Factura: F-001-00045678
Monto: $60,500.00
Aprobado por: Ana López
Fecha: 14/11/2025 10:30

Pago programado para: 25/11/2025

[Ver detalles →]
```

**Canales:** Email, Push, WhatsApp

#### APROBADO → PAGADO

**Para Proveedor:**
```
💰 ¡Pago emitido!

Pago #12345
Monto: $60,500.00
Fecha de emisión: 25/11/2025

Documentos incluidos:
• Factura F-001-00045678

Comprobantes disponibles:
• Recibo de pago
• Retención IIBB
• Retención Ganancias

[Ver comprobantes →]
```

**Canales:** Email, Push, WhatsApp, SMS (opcional)

#### EN REVISIÓN → RECHAZADO

**Para Proveedor:**
```
⚠️ Factura rechazada

Factura: F-001-00045678
Rechazado por: Ana López
Fecha: 14/11/2025 11:00

Motivo:
"Falta adjuntar el remito correspondiente a la entrega del material. Por favor, adjuntar y volver a presentar."

Podés corregir y volver a enviar el documento.

[Ver detalle →]  [Subir nuevo documento →]
```

**Canales:** Email, Push, WhatsApp

---

## 📊 VISTA TABLA (Alternativa al Kanban)

Para usuarios que prefieren vista tradicional de tabla.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Mis Facturas                              [🔲 Kanban] [📋 Tabla]      │
│  🔍 Buscar...   📅 Rango fechas   💰 Monto   📊 Estado   [⬇️ Exportar]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ☐ Número        Fecha      Monto       OC        Estado      Acciones│
│  ──────────────────────────────────────────────────────────────────── │
│  ☐ F-001-45678  13/11/25  $60,500   OC-1234   📤 Presentado    [👁️]  │
│  ☐ F-002-45679  10/11/25  $30,000   OC-1234   💰 Pagado        [👁️]  │
│  ☐ F-015-45680  12/11/25  $25,000   OC-1567   👀 En Revisión   [👁️]  │
│  ☐ F-020-45681  11/11/25  $10,000   Sin OC    ❌ Rechazado     [👁️]  │
│  ☐ F-008-45682  08/11/25  $100,000  OC-2341   ✅ Aprobado      [👁️]  │
│  ☐ F-009-45683  06/11/25  $60,000   OC-3456   ✅ Aprobado      [👁️]  │
│                                                                        │
│  Mostrando 1-6 de 92  [◀️] [1] [2] [3] ... [15] [▶️]                  │
│                                                                        │
│  ☑️ 3 seleccionadas   [⬇️ Exportar selección]                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Características de la Tabla
- Ordenar por cualquier columna
- Filtros por múltiples criterios
- Selección múltiple
- Exportar selección
- Paginación
- Acciones rápidas por fila

---

## 📱 VISTA MÓVIL

Adaptación del Kanban para dispositivos móviles.

```
┌──────────────────────────┐
│  Mis Facturas       ☰    │
├──────────────────────────┤
│  🔍 Buscar...            │
│  [Filtros ▼]             │
├──────────────────────────┤
│                          │
│  📤 PRESENTADO (12)      │
│  ──────────────────      │
│  ┌────────────────────┐ │
│  │ F-001              │ │
│  │ $60,500            │ │
│  │ Hoy 14:30    [👁️] │ │
│  └────────────────────┘ │
│  ┌────────────────────┐ │
│  │ F-003              │ │
│  │ $75,000            │ │
│  │ Hoy 10:00    [👁️] │ │
│  └────────────────────┘ │
│  [+ Ver más]            │
│                          │
│  👀 EN REVISIÓN (8)      │
│  ──────────────────      │
│  ┌────────────────────┐ │
│  │ F-015              │ │
│  │ $25,000            │ │
│  │ 2 días  ⚠️1  [👁️] │ │
│  └────────────────────┘ │
│  [+ Ver más]            │
│                          │
│  ✅ APROBADO (24) [▼]   │
│  💰 PAGADO (45)   [▼]   │
│  ❌ RECHAZADO (3) [▼]   │
│                          │
└──────────────────────────┘
```

### Características Móviles
- Vista de acordeón (collapsible por estado)
- Swipe para acciones rápidas
- Pull to refresh
- Infinite scroll
- Push notifications

---

## 🎯 FILTROS Y BÚSQUEDA

### Panel de Filtros

```
┌─────────────────────────────────────┐
│  Filtros                      [❌]  │
├─────────────────────────────────────┤
│                                     │
│  Estado                             │
│  ☑️ Presentado                      │
│  ☑️ En Revisión                     │
│  ☑️ Aprobado                        │
│  ☑️ Pagado                          │
│  ☐ Rechazado                        │
│                                     │
│  Rango de Fechas                    │
│  Desde: [01/11/2025]                │
│  Hasta: [30/11/2025]                │
│                                     │
│  Monto                              │
│  Mínimo: [$         ]               │
│  Máximo: [$         ]               │
│                                     │
│  Orden de Compra                    │
│  [Buscar OC...]                     │
│  ☑️ Solo facturas con OC            │
│  ☐ Solo facturas sin OC             │
│                                     │
│  Empresa (Multi-tenant)             │
│  ☑️ Empresa A                       │
│  ☑️ Empresa B                       │
│  ☐ Empresa C                        │
│                                     │
│  [Limpiar filtros] [Aplicar]        │
└─────────────────────────────────────┘
```

### Búsqueda Full-Text

```
┌─────────────────────────────────────┐
│  🔍 Buscar facturas...              │
└─────────────────────────────────────┘

Busca por:
• Número de factura (F-001, 45678)
• Número de OC (OC-2024-1234)
• Monto ($60,500)
• Proveedor (ABC SA)
• Cualquier texto en comentarios
```

---

## 📈 MÉTRICAS Y ANALYTICS

### Dashboard de Métricas (Para Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  Métricas de Documentos - Noviembre 2025                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⏱️ TIEMPOS PROMEDIO                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Presentado → Revisión:     2.5 horas                 │  │
│  │ Revisión → Aprobado:       18 horas                  │  │
│  │ Aprobado → Pagado:         12 días                   │  │
│  │                                                      │  │
│  │ TIEMPO TOTAL: 12.8 días promedio                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  📊 DISTRIBUCIÓN POR ESTADO                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Presentado:   12 docs  (13%)  ████                   │  │
│  │ En Revisión:   8 docs  ( 9%)  ███                    │  │
│  │ Aprobado:     24 docs  (26%)  ████████               │  │
│  │ Pagado:       45 docs  (49%)  ███████████████        │  │
│  │ Rechazado:     3 docs  ( 3%)  █                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ⚠️ ALERTAS                                                 │
│  • 2 facturas en revisión por más de 48hs                  │
│  • 5 facturas aprobadas esperando pago > 15 días           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTACIÓN TÉCNICA

### Modelo de Datos (Prisma Schema)

```prisma
model Document {
  id              String   @id @default(cuid())
  number          String   @unique
  type            DocumentType
  status          DocumentStatus
  amount          Decimal
  taxAmount       Decimal
  totalAmount     Decimal
  uploadedAt      DateTime @default(now())

  // Relaciones
  providerId      String
  provider        User     @relation("ProviderDocuments", fields: [providerId], references: [id])
  clientId        String
  client          Company  @relation(fields: [clientId], references: [id])
  purchaseOrderId String?
  purchaseOrder   PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])

  // Timeline
  timeline        DocumentEvent[]
  comments        Comment[]
  attachments     Attachment[]

  // Parse integration
  parseData       Json?
  parseStatus     ParseStatus

  @@index([providerId, clientId, status])
  @@index([status, uploadedAt])
}

enum DocumentType {
  INVOICE
  CREDIT_NOTE
  DEBIT_NOTE
}

enum DocumentStatus {
  PRESENTED
  IN_REVIEW
  APPROVED
  PAID
  REJECTED
}

model DocumentEvent {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id])

  fromStatus  DocumentStatus?
  toStatus    DocumentStatus
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  reason      String?
  createdAt   DateTime @default(now())

  @@index([documentId, createdAt])
}

model Comment {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  text        String
  attachments Attachment[]
  createdAt   DateTime @default(now())

  @@index([documentId, createdAt])
}
```

### API Endpoints

```typescript
// Obtener documentos con filtros
GET /api/documents?status=PRESENTED&tenantId=xxx&from=date&to=date

// Cambiar estado de documento
PATCH /api/documents/:id/status
Body: {
  status: "APPROVED",
  reason?: "Optional reason",
  userId: "current-user-id"
}

// Agregar comentario
POST /api/documents/:id/comments
Body: {
  text: "Comment text",
  attachments?: [...]
}

// Real-time updates (WebSocket/Server-Sent Events)
WS /api/documents/subscribe?tenantId=xxx
```

### Hooks React

```typescript
// Hook para obtener documentos
const { documents, loading, error } = useDocuments({
  status: ['PRESENTED', 'IN_REVIEW'],
  tenantId: currentTenant,
  from: startDate,
  to: endDate
})

// Hook para cambiar estado
const { updateStatus, loading } = useDocumentStatus(documentId)

await updateStatus('APPROVED', { reason: 'All good' })

// Hook para subscripción en tiempo real
useDocumentSubscription(tenantId, (event) => {
  // Re-fetch o actualizar cache cuando hay cambios
  if (event.type === 'STATUS_CHANGED') {
    mutate() // SWR/React Query
  }
})
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Vista Básica
- [ ] Componente Kanban con columnas por estado
- [ ] Tarjetas de documentos
- [ ] Modal de detalle
- [ ] Timeline de eventos
- [ ] Filtros básicos (por estado)

### Fase 2: Interacciones
- [ ] Drag & drop para cambiar estado (admin)
- [ ] Comentarios en documentos
- [ ] Adjuntar archivos adicionales
- [ ] Búsqueda full-text

### Fase 3: Notificaciones
- [ ] Notificaciones push en navegador
- [ ] Emails automáticos
- [ ] Integración WhatsApp
- [ ] SMS (opcional)

### Fase 4: Analytics
- [ ] Dashboard de métricas
- [ ] Reportes de tiempos
- [ ] Alertas automáticas
- [ ] Exportación de datos

### Fase 5: Optimizaciones
- [ ] Vista móvil responsive
- [ ] Infinite scroll
- [ ] Caching inteligente
- [ ] Offline support (PWA)

---

## 🎯 PRÓXIMOS PASOS

Continuar con:
- `/docs/MULTI_TENANT.md` - Arquitectura multi-tenant
- `/docs/PARSE_INTEGRATION.md` - Integración con Parse
- `/docs/WIREFRAMES.md` - Diseños completos de UI
