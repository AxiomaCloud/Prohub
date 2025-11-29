# 📚 Índice de Documentación - Módulo Purchase Requests

## Resumen

Este índice contiene toda la documentación para el nuevo **Módulo de Requerimientos de Compra (Purchase Requests)** de Hub.

**Creado**: 2025-11-28
**Estado**: ✅ Documentación completa - Listo para implementación

---

## 📄 Documentos Disponibles

### 1. [PURCHASE_REQUESTS_MODULE.md](./PURCHASE_REQUESTS_MODULE.md)
**Especificaciones Técnicas Completas**

Contiene:
- ✅ Visión general del módulo
- ✅ Schema de base de datos completo (Prisma)
- ✅ Workflow y estados (9 estados + aprobaciones multinivel)
- ✅ Integración ERP Softland (SQL)
- ✅ API Endpoints (30+ endpoints)
- ✅ Flujo end-to-end completo
- ✅ **7 puntos de integración con IA**
- ✅ Seguridad y permisos
- ✅ Roadmap de implementación (14-20 semanas)

**Usar para**: Referencia técnica completa, desarrollo de features

---

### 2. [INTEGRATION_PARSE_ARCHITECTURE.md](./INTEGRATION_PARSE_ARCHITECTURE.md)
**Arquitectura Reutilizable de Parse**

Contiene:
- ✅ Sistema de API Keys (ya implementado en Parse)
- ✅ Middleware de autenticación (código reutilizable)
- ✅ Encriptación AES-256 (código reutilizable)
- ✅ Sincronización bidireccional SQL (código reutilizable)
- ✅ Servicios de integración ERP
- ✅ Jobs de sincronización (BullMQ)
- ✅ Comparación Parse vs Hub
- ✅ Roadmap de implementación (6-8 semanas)

**Usar para**: Implementación de la capa de integración ERP, reutilización de código probado

---

## 🎯 Características Principales

### Funcionalidad Core
1. **Creación de Requerimientos**
   - Texto descriptivo de necesidad
   - Múltiples items por requerimiento
   - Estimación de montos
   - Prioridades (LOW, NORMAL, HIGH, URGENT)

2. **Workflow de Aprobación**
   - Multinivel configurable (Supervisor → Gerente → Director)
   - Por monto (ej: >$50k requiere 3 niveles)
   - Aprueba, rechaza o solicita cambios
   - Notificaciones automáticas

3. **Integración ERP Softland**
   - Envío automático de PRs aprobados
   - Sincronización de OCs cada 5 min
   - Bidireccional (Hub ↔ ERP)
   - Flexible para otros ERPs

4. **Recepción de Mercadería**
   - Recepción parcial o total
   - Validación contra OC
   - Control de calidad
   - Envío al ERP automático

### Integraciones con IA

| # | Punto de Integración | Funcionalidad | Ahorro Estimado |
|---|----------------------|---------------|-----------------|
| 1 | Asistente de Creación | Autocompletado, estimaciones, categorización | 40% tiempo |
| 2 | Detección de Duplicados | Evita PRs duplicados, valida presupuesto | 15% errores |
| 3 | Recomendaciones de Aprobación | Scoring de riesgo, análisis de precio | 30% tiempo |
| 4 | Matching OC ↔ PR | Vinculación automática, extracción de PDFs | 50% tiempo |
| 5 | OCR de Remitos | Autocompletado de recepción | 60% tiempo |
| 6 | Analytics Predictivos | Predicción de necesidades, optimización | N/A |
| 7 | Chatbot de Asistencia | Consultas, guía, troubleshooting | 25% soporte |

---

## 🗂️ Modelos de Datos Principales

### Prisma Models
```
PurchaseRequest
├── PurchaseRequestItem (1:N)
├── PurchaseRequestApproval (1:N)
├── PurchaseRequestComment (1:N)
├── PurchaseOrder (N:1) - opcional
└── User (solicitante)

ApprovalLevel
├── Tenant (N:1)
└── Configuración por monto

PurchaseReception
├── PurchaseReceptionItem (1:N)
├── PurchaseOrder (N:1)
└── User (receptor)

ErpConfiguration (de Parse)
└── Credenciales + mapeo de campos

ErpApiKey (de Parse)
└── Autenticación para sincronización

ErpSyncLog
└── Trazabilidad completa
```

---

## 🚀 Flujo de Implementación Recomendado

### Opción A: Implementación Completa (14-20 semanas)
```
Fase 1: Componentes Core (4-6 sem)
  → Schema BD + API CRUD + Workflow aprobación

Fase 2: Integración ERP (3-4 sem)
  → Adapter Softland + Jobs sincronización

Fase 3: Recepciones (2-3 sem)
  → API recepciones + Validación OC

Fase 4: IA (3-4 sem)
  → 7 puntos de integración

Fase 5: Mejoras (2-3 sem)
  → Analytics + Optimizaciones
```

### Opción B: MVP Rápido (6-8 semanas)
```
Fase 1: Core Mínimo (2 sem)
  → Crear PR + Aprobar + Enviar a ERP

Fase 2: Integración Básica (2 sem)
  → Sincronizar OCs desde ERP (reutilizar Parse)

Fase 3: Recepciones Simples (1 sem)
  → Solo recepción total (sin parcial)

Fase 4: UI Básico (1-2 sem)
  → Formularios + Listados
```

---

## 🔗 Reutilización de Parse

### Código Directamente Reutilizable
```javascript
✅ /parse/backend/src/middleware/syncAuth.js
   → Copiar como erpAuth.js (cambiar nombres)

✅ /parse/backend/src/utils/syncEncryption.js
   → Copiar como erpEncryption.js (sin cambios)

✅ /parse/backend/src/routes/sync.js
   → Base para /api/v1/erp/* endpoints
   → Adaptar lógica de tablas

✅ Modelos Prisma:
   - sync_api_keys → erp_api_keys
   - sync_configurations → erp_sync_configurations
   - (agregar) erp_sync_logs
```

### Adaptaciones Necesarias
1. **Nombres**: sync → erp
2. **Permisos**: Agregar pr:create, pr:approve, etc.
3. **Jobs**: Agregar BullMQ (Parse no tiene)
4. **Logs**: Mejorar estructura (ErpSyncLog)

---

## 🔒 Seguridad

### Autenticación
- JWT para usuarios web
- API Keys para sincronización ERP
- IP whitelist opcional
- Multi-tenant nativo

### Permisos por Rol
```typescript
PROVIDER:         [ ] (no accede a PRs)
CLIENT_VIEWER:    [PR_VIEW_OWN, RECEPTION_VIEW]
CLIENT_APPROVER:  [PR_VIEW_ALL, PR_APPROVE_L1, PR_APPROVE_L2]
CLIENT_ADMIN:     [PR_*, RECEPTION_*, APPROVAL_LEVELS_MANAGE]
SUPER_ADMIN:      [*]
```

### Datos Sensibles
- Passwords ERP: Encriptados AES-256
- API Keys: UUID v4 (no predecibles)
- Conexiones SQL: TLS obligatorio
- Logs: Sin passwords en texto plano

---

## 📊 Métricas y KPIs

### A Trackear
```javascript
{
  // Tiempos
  avgApprovalTime: 2.3, // días
  avgTimeToERP: 0.5,    // horas
  avgTimeToReceive: 15, // días

  // Tasas
  approvalRate: 0.87,   // 87% aprobados
  rejectionRate: 0.08,  // 8% rechazados
  partialReceptionRate: 0.34, // 34% recepciones parciales

  // ERP
  erpSyncSuccessRate: 0.98, // 98% sincronizaciones OK
  erpSyncAvgTime: 1.2       // segundos
}
```

---

## 🧪 Testing

### Test de Conexión ERP
```bash
POST /api/v1/admin/erp/test-connection
{
  "host": "192.168.1.100",
  "port": 1433,
  "database": "SoftlandDB",
  "username": "sync_user",
  "password": "***"
}
```

### Test de Sincronización
```bash
# Encolar job manualmente
POST /api/v1/admin/erp/sync-purchase-orders

# Ver resultado
GET /api/v1/admin/erp/sync-logs?limit=10
```

---

## 📝 Próximos Pasos

### Para comenzar la implementación:

1. **Revisar documentación**
   - Leer PURCHASE_REQUESTS_MODULE.md completo
   - Leer INTEGRATION_PARSE_ARCHITECTURE.md

2. **Setup inicial**
   - Copiar código reutilizable de Parse
   - Crear migraciones Prisma
   - Configurar BullMQ + Redis

3. **Implementar MVP**
   - Seguir "Opción B: MVP Rápido"
   - Empezar por schema BD + API CRUD
   - Luego integración ERP básica

4. **Testear con Softland**
   - Configurar conexión SQL
   - Probar envío de PR
   - Probar sincronización de OC

5. **Iterar**
   - Agregar recepciones
   - Agregar IA
   - Agregar analytics

---

## 🤝 Soporte

Para dudas sobre la documentación:
- **Arquitectura general**: Ver PURCHASE_REQUESTS_MODULE.md
- **Integración ERP**: Ver INTEGRATION_PARSE_ARCHITECTURE.md
- **Código Parse**: Ver ../parse/backend/src/

---

## 📅 Versionado

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-11-28 | Documentación inicial completa |

---

**Desarrollado por**: Hub Development Team
**Basado en**: Parse v2.0.0 Integration Architecture
