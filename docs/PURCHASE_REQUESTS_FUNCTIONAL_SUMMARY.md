# 📦 Resumen Funcional: Módulo Purchase Requests

**Documento**: Resumen Funcional para Usuarios de Negocio
**Fecha**: 29 Noviembre 2025
**Audiencia**: Product Owners, Stakeholders, Management

---

## 🎯 ¿Qué es?

Sistema completo para **digitalizar y automatizar el proceso de compras** de una empresa, desde que alguien necesita algo hasta que la mercadería llega al almacén.

---

## 👥 Usuarios y Roles

### 1. **Solicitante** (cualquier empleado)
- Crea requerimientos de compra
- Hace seguimiento de sus pedidos
- Recibe notificaciones de aprobaciones/rechazos

### 2. **Aprobadores** (supervisores, gerentes, directores)
- Aprueban o rechazan según su nivel
- Pueden solicitar cambios
- Configurables por rango de monto

### 3. **Compras** (departamento de compras)
- Ve todos los PRs aprobados
- Monitorea integración con ERP
- Gestiona proveedores

### 4. **Almacén** (receptores)
- Registra recepciones de mercadería
- Valida contra órdenes de compra
- Reporta discrepancias

---

## 📋 ¿Cómo Funciona? (Flujo Completo)

### **PASO 1: Crear Requerimiento (PR)**

**Juan (Desarrollador) necesita equipos:**

```
🖥️ Formulario simple:
- "Necesito 5 notebooks Dell XPS para el equipo de desarrollo"
- Monto estimado: $40,000
- Fecha necesaria: 15/12/2025
- Departamento: IT
- Prioridad: ALTA
```

**El sistema:**
- Genera número automático: **PR-2025-00042**
- Determina cuántos niveles de aprobación necesita según el monto
- Estado: **DRAFT** (borrador)

---

### **PASO 2: Workflow de Aprobación Multinivel**

**Configuración de ejemplo:**
```
$0 - $10,000       → Solo Supervisor (1 aprobación)
$10,001 - $50,000  → Supervisor + Gerente (2 aprobaciones)
$50,001+           → Supervisor + Gerente + Director (3 aprobaciones)
```

**Para el PR de Juan ($40,000):**

```
1️⃣ María (Supervisora IT) recibe notificación
   → Revisa
   → ✅ Aprueba: "OK, necesario para proyecto Q4"

2️⃣ Carlos (Gerente IT) recibe notificación
   → Revisa presupuesto
   → ✅ Aprueba: "Aprobado, dentro de budget"

✅ PR APROBADO → Pasa automáticamente a Compras
```

**Opciones en cada nivel:**
- ✅ **Aprobar**: Pasa al siguiente nivel
- ❌ **Rechazar**: Se cancela (con motivo)
- ✏️ **Solicitar cambios**: Vuelve al solicitante

---

### **PASO 3: Envío Automático al ERP Softland**

**Cuando el PR está APROBADO:**

```
📤 Sistema automáticamente:
1. Copia el PR a una tabla de sincronización
2. Sync-Client (instalado en servidor del cliente) lo detecta
3. Inserta el PR en Softland SQL Server
4. PR ahora está en el ERP → Estado: SENT_TO_ERP
```

**En Softland:**
- Comprador ve el requerimiento
- Cotiza con proveedores
- Crea Orden de Compra (OC-2025-00789)

---

### **PASO 4: OC Regresa Automáticamente**

**Cada 5 minutos el sistema sincroniza:**

```
🔄 Sync-Client detecta nueva OC en Softland
📥 La sube a Hub automáticamente
🔗 Hub vincula OC con el PR de Juan
📧 Juan recibe notificación:
   "Tu OC OC-2025-00789 está lista"
   "Proveedor: Dell Argentina"
   "Monto: $41,500"
   "Entrega estimada: 01/12/2025"
```

**Estado del PR:** `PO_CREATED`

Juan puede ver en el portal:
- Número de OC
- Proveedor asignado
- Fecha de entrega estimada
- PDF de la OC (si aplica)

---

### **PASO 5: Recepción de Mercadería**

**Llega la mercadería al almacén:**

```
📦 Ana (Almacén) en Hub:
1. Ve OC pendiente de recepción
2. Registra:
   - Remito: REM-DELL-456
   - Items recibidos:
     * 3 notebooks (de 5 ordenadas) ⚠️
   - Motivo: "Entrega parcial, resto próxima semana"
   - Foto del remito (opcional)

3. Confirma recepción

📤 Sistema automáticamente:
- Envía recepción a Softland
- Softland actualiza inventario (+3 notebooks)
- PR cambia a: PARTIALLY_RECEIVED
```

**Segunda entrega (2 notebooks restantes):**
- Ana registra nueva recepción
- Sistema envía a Softland
- **PR cambia a: RECEIVED** ✅ (completado)

---

## 🎨 Características Clave

### 1. **Aprobaciones Inteligentes**

**Por Monto Configurable:**
- Cada empresa define sus propios rangos
- Automático según monto del PR
- Multinivel secuencial

**Flexibilidad:**
- Por rol: "Cualquier Gerente puede aprobar nivel 2"
- Por usuario específico: "Solo María o Juan pueden aprobar"
- Requiere todos: "Deben aprobar TODOS los del nivel"

---

### 2. **Notificaciones en Tiempo Real**

```
📧 Juan recibe:
- PR creado → Portal
- Requiere aprobación → Portal + Email
- Aprobado nivel 1 → Portal
- Aprobado nivel 2 → Portal
- OC creada → Portal + Email + WebSocket
- OC lista para recibir → Portal
- Mercadería recibida → Portal
```

**Canales:**
- Portal web (real-time)
- Email
- WebSocket (actualización instantánea)
- WhatsApp (opcional)

---

### 3. **Trazabilidad Completa**

**Timeline de eventos:**
```
📅 PR-2025-00042: "5 Notebooks Dell"

✅ 15/11 10:00 - Juan creó PR
✅ 15/11 10:05 - Juan envió a aprobación
✅ 15/11 11:30 - María aprobó (Nivel 1)
✅ 15/11 14:20 - Carlos aprobó (Nivel 2)
✅ 15/11 14:21 - Enviado a Softland
✅ 18/11 09:15 - OC-2025-789 creada ($41,500)
✅ 01/12 11:00 - Recepción parcial (3 units)
⏳ Pendiente: 2 notebooks
✅ 08/12 10:30 - Recepción final (2 units)
✅ COMPLETADO
```

**Quién hizo qué y cuándo** - auditoría completa

---

### 4. **Recepciones Flexibles**

**Parciales o Totales:**
- Recibir parte de lo ordenado
- Múltiples recepciones por OC
- Validación automática contra OC

**Control de Calidad:**
```
✅ Aceptado
❌ Rechazado (con motivo)
⏳ Pendiente inspección
```

**Discrepancias:**
- Cantidad diferente → Sistema alerta
- Item equivocado → Se reporta
- Observaciones → Se guardan

---

## 🤖 7 Integraciones con IA (Opcional)

### 1. **Asistente de Creación**
```
Juan escribe: "necesito computadoras para el equipo"

🤖 IA sugiere:
- Descripción: "Notebooks Dell XPS 15 - Renovación tecnológica"
- Cantidad: 5 (basado en tu último pedido)
- Precio estimado: $8,000 c/u
- Prioridad: NORMAL
```

### 2. **Detección de Duplicados**
```
⚠️ Ya existe PR-2025-00038 similar:
   "5 notebooks Dell" - Creado hace 1 semana
   ¿Quieres combinarlo?
```

### 3. **Recomendación de Aprobación**
```
🎯 Scoring para aprobador:
- Riesgo: Bajo (0.23/1.0)
- Precio: +11% vs mercado (aceptable)
- Proveedor: 95% cumplimiento
- Recomendación: ✅ APROBAR
```

### 4. **Matching Automático OC ↔ PR**
```
OC sin referencia exacta → IA vincula por:
- Monto similar
- Descripción coincidente
- Departamento
- Fechas
```

### 5. **OCR de Remitos**
```
📄 Ana sube foto del remito
🤖 IA extrae:
- Número: REM-DELL-456
- Fecha: 01/12/2025
- Items: 3 notebooks Dell XPS 15
- Auto-completa formulario de recepción
```

### 6. **Analytics Predictivos**
```
📊 Dashboard:
- "Sueles pedir insumos cada 3 meses"
- "Próxima compra estimada: 15/01/2026"
- "Agrupar estos 3 PRs ahorraría 15%"
```

### 7. **Chatbot de Asistencia**
```
💬 Usuario: "¿Estado de mi PR-00042?"
🤖 Bot: "Aprobado. OC creada. Entrega estimada 01/12"
```

---

## 📊 Métricas y Reportes

### Dashboard del Sistema:
```
📈 Métricas clave:
- Tiempo promedio de aprobación: 2.3 días
- Tasa de aprobación: 87%
- PRs pendientes: 12
- OCs en camino: 8
- Recepciones pendientes: 5

📊 Por departamento:
- IT: $145,000 (23 PRs este mes)
- Ventas: $89,000 (15 PRs)
- Producción: $320,000 (45 PRs)

⚠️ Alertas:
- 3 OCs vencidas sin recibir
- 5 PRs sin aprobar > 5 días
```

---

## 💡 Beneficios del Negocio

### **Antes (Proceso Manual):**
```
❌ Email chains infinitos
❌ Excel compartido (desactualizado)
❌ No se sabe quién aprobó qué
❌ PRs perdidos
❌ Seguimiento manual de OCs
❌ Recepciones en papel
❌ Sin trazabilidad
❌ Tiempo promedio: 15 días
```

### **Después (Con Purchase Requests):**
```
✅ Portal centralizado
✅ Workflow automático
✅ Notificaciones en tiempo real
✅ Auditoría completa
✅ Integración bidireccional con ERP
✅ Recepciones digitales
✅ Trazabilidad 100%
✅ Tiempo promedio: 3 días (-80%)
```

---

## 🎯 Casos de Uso Reales

### **Caso 1: Compra Regular**
```
Juan (IT) → 5 notebooks → $40K
→ Supervisor aprueba (30 min)
→ Gerente aprueba (2 horas)
→ Softland automático (5 min)
→ Comprador cotiza (1 día)
→ OC creada
→ Juan notificado
→ Mercadería llega
→ Almacén registra
→ Inventario actualizado automáticamente
```

### **Caso 2: Compra Urgente**
```
María (Producción) → Insumo crítico → Prioridad URGENTE
→ Notificaciones prioritarias
→ Aprobaciones express
→ Seguimiento en tiempo real
→ Alertas si se demora
```

### **Caso 3: Compra Grande**
```
Director (Proyectos) → Maquinaria → $250K
→ 3 niveles de aprobación
→ Supervisor → Gerente → Director General
→ Cada uno revisa y aprueba
→ Trazabilidad completa para auditoría
```

### **Caso 4: Rechazo con Feedback**
```
Ana (Admin) → Material oficina → $15K
→ Gerente rechaza: "Presupuesto agotado este mes"
→ Ana recibe notificación con motivo
→ Ana puede:
  - Modificar y reenviar
  - Cancelar
  - Programar para próximo mes
```

---

## 🔢 Estados del Purchase Request

| Estado | Descripción | Usuario ve |
|--------|-------------|------------|
| **DRAFT** | Borrador, no enviado | "En borrador - Editar o Enviar" |
| **PENDING** | Esperando primera aprobación | "Pendiente aprobación" |
| **IN_APPROVAL** | En proceso de aprobación | "Nivel 1 aprobado, esperando Nivel 2" |
| **APPROVED** | Aprobado, listo para ERP | "Aprobado - En proceso de envío a Softland" |
| **SENT_TO_ERP** | Enviado a Softland | "Enviado a Compras (Softland)" |
| **PO_CREATED** | OC creada en ERP | "OC-2025-789 creada - Esperando entrega" |
| **PARTIALLY_RECEIVED** | Recibido parcialmente | "3 de 5 recibidas - Pendiente 2" |
| **RECEIVED** | Completamente recibido | "Completado - En inventario" |
| **REJECTED** | Rechazado | "Rechazado: [motivo]" |
| **CANCELLED** | Cancelado por solicitante | "Cancelado" |

---

## 📱 Experiencia del Usuario

### **Pantalla Principal - Mis Requerimientos**

```
┌────────────────────────────────────────────────────────┐
│  Mis Requerimientos de Compra                    [+Nuevo PR] │
├────────────────────────────────────────────────────────┤
│                                                        │
│  🔍 Buscar por número o descripción...    [Filtros ▼] │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ PR-2025-00042  •  5 Notebooks Dell               │ │
│  │ Estado: 🟢 PO_CREATED  •  $40,000  •  IT         │ │
│  │ OC-2025-789  •  Entrega: 01/12/2025              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ PR-2025-00041  •  Material de oficina            │ │
│  │ Estado: 🟡 IN_APPROVAL  •  $15,000  •  Admin     │ │
│  │ Nivel 1: ✅ Aprobado  •  Nivel 2: ⏳ Pendiente   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ PR-2025-00038  •  Insumos producción             │ │
│  │ Estado: 🔴 REJECTED  •  $8,500  •  Producción    │ │
│  │ Motivo: "Presupuesto agotado este mes"           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### **Detalle de PR - Timeline**

```
┌────────────────────────────────────────────────────────┐
│  PR-2025-00042: 5 Notebooks Dell XPS                   │
│  Estado: 🟢 OC Creada  •  $40,000  •  Prioridad: ALTA  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  📋 Detalles                                           │
│  Solicitante: Juan Pérez (IT)                         │
│  Fecha necesaria: 15/12/2025                          │
│  Monto estimado: $40,000 ARS                          │
│                                                        │
│  📄 Descripción:                                       │
│  Necesito 5 notebooks Dell XPS para el equipo de      │
│  desarrollo. Renovación tecnológica Q4.               │
│                                                        │
├────────────────────────────────────────────────────────┤
│  📜 Timeline de Eventos                                │
│                                                        │
│  ✅ 15/11 10:00  •  Juan creó PR                       │
│  ✅ 15/11 10:05  •  Juan envió a aprobación            │
│  ✅ 15/11 11:30  •  María aprobó (Nivel 1)             │
│     💬 "OK, necesario para proyecto Q4"                │
│  ✅ 15/11 14:20  •  Carlos aprobó (Nivel 2)            │
│     💬 "Aprobado, dentro de budget"                    │
│  ✅ 15/11 14:21  •  Enviado a Softland automáticamente │
│  ✅ 18/11 09:15  •  OC-2025-789 creada                 │
│     💰 Monto final: $41,500                            │
│     🏢 Proveedor: Dell Argentina                       │
│     📅 Entrega estimada: 01/12/2025                    │
│  ⏳ Esperando entrega...                               │
│                                                        │
├────────────────────────────────────────────────────────┤
│  📦 Orden de Compra: OC-2025-789                       │
│  Proveedor: Dell Argentina                            │
│  Monto: $41,500  •  Entrega: 01/12/2025                │
│  [Ver PDF de OC]  [Registrar Recepción]               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### **Panel de Aprobador**

```
┌────────────────────────────────────────────────────────┐
│  Aprobaciones Pendientes (5)                     🔔 5   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🔴 URGENTE  •  PR-2025-00045                     │ │
│  │ Material crítico producción  •  $12,000          │ │
│  │ Solicitante: María López  •  Hace 2 horas        │ │
│  │                                                  │ │
│  │ 🤖 IA Recomienda: ✅ APROBAR (Confianza: 87%)    │ │
│  │    • Proveedor confiable (95% cumplimiento)     │ │
│  │    • Precio en mercado (-3% vs promedio)        │ │
│  │    • Necesidad justificada                      │ │
│  │                                                  │ │
│  │ [✅ Aprobar]  [❌ Rechazar]  [✏️ Pedir Cambios]  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ PR-2025-00044  •  Equipos IT  •  $35,000         │ │
│  │ Solicitante: Carlos Ruiz  •  Hace 5 horas        │ │
│  │ [Ver Detalles]                                   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🎓 Preguntas Frecuentes (FAQ)

### ¿Puedo editar un PR después de enviarlo?
No, una vez enviado a aprobación el PR se bloquea. Si el aprobador solicita cambios, volverá a estado DRAFT y podrás editarlo.

### ¿Qué pasa si un aprobador está de vacaciones?
El admin puede reasignar la aprobación a otro usuario del mismo nivel o aprobar en su lugar.

### ¿Puedo cancelar un PR?
Sí, mientras esté en DRAFT, PENDING o IN_APPROVAL. Una vez en SENT_TO_ERP solo un admin puede cancelar.

### ¿Cómo sé que mi OC está lista?
Recibes notificación automática por email y en el portal. Además el PR cambia a estado PO_CREATED.

### ¿Puedo ver PRs de otros usuarios?
Depende de tu rol:
- Solicitantes: Solo sus propios PRs
- Aprobadores: PRs que deben aprobar
- Compras/Admin: Todos los PRs del tenant

### ¿Qué pasa si recibo menos de lo ordenado?
Registras una recepción parcial indicando la cantidad recibida y el motivo. El PR queda en PARTIALLY_RECEIVED hasta completar.

### ¿Cuánto tarda en sincronizar con Softland?
- Envío de PR: 5 minutos (máximo)
- Recepción de OC: 5 minutos (máximo)
- Envío de recepción: 5 minutos (máximo)

---

## ✅ Resumen en 3 Puntos

1. **Digitaliza el proceso de compras completo:**
   - Desde "necesito algo" hasta "llegó y está en inventario"

2. **Automatiza la aprobación y sincronización:**
   - Multinivel por monto
   - Integración bidireccional con ERP
   - Sin intervención manual

3. **Da visibilidad y control total:**
   - Cualquiera sabe en qué estado está cada PR
   - Trazabilidad completa (auditoría)
   - Métricas y analytics en tiempo real

---

## 📈 ROI Estimado

### Tiempo ahorrado:
- **Creación de PR**: 15 min → 5 min (-66%)
- **Proceso de aprobación**: 5 días → 1 día (-80%)
- **Seguimiento de OC**: 30 min/día → 0 min (-100%)
- **Registro de recepción**: 20 min → 5 min (-75%)

### **Total por PR: 15 días → 3 días (-80%)**

### Con 100 PRs/mes:
- **Tiempo ahorrado**: ~960 horas/mes
- **Costo estimado**: $50/hora
- **Ahorro mensual**: ~$48,000

### Beneficios adicionales:
- Reducción de errores manuales: -90%
- Mejor control presupuestario: +40%
- Visibilidad en tiempo real: Invaluable
- Auditoría completa: Compliance garantizado

---

**En resumen:** Transforma un proceso caótico de emails y Excel en un **workflow digital, automático y trazable** que reduce tiempos de 15 días a 3 días y elimina errores manuales.

---

**Documento creado**: 29 Noviembre 2025
**Versión**: 1.0
**Para**: Stakeholders, Product Owners, Management
**Estado**: ✅ Aprobado para implementación
