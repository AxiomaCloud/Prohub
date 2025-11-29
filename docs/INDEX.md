# ÍNDICE DE DOCUMENTACIÓN - Hub

Guía completa para el desarrollo del Portal de Proveedores de AXIOMA.

---

## 📚 DOCUMENTOS DISPONIBLES

### 1. [README.md](../README.md)
**Visión general del proyecto**
- Mejoras clave vs competencia
- Módulos principales
- Stack tecnológico
- Roadmap de desarrollo
- Diferenciadores clave

**Lee esto primero** para entender el alcance completo del proyecto.

---

### 2. [MODULES.md](./MODULES.md)
**Detalle de cada módulo del sistema**
- Buzón de Documentos (con Parse)
- Facturas (Pipeline/Kanban)
- Pagos
- Órdenes de Compra
- Comunicaciones (Omnicanal)
- Panel de Control (Admin)
- Buzón de Clientes (Roles Duales)

**Lee esto** para entender la funcionalidad de cada módulo y sus mejoras sobre la competencia.

---

### 3. [DOCUMENT_FLOW.md](./DOCUMENT_FLOW.md)
**Flujo de documentos y estados**
- Estados del documento (Presentado, En Revisión, Aprobado, Pagado, Rechazado)
- Vista Kanban/Pipeline
- Detalle de documento
- Transiciones de estado
- Notificaciones automáticas
- Métricas y analytics

**Lee esto** para diseñar el flujo completo de documentos desde la carga hasta el pago.

---

### 4. [MULTI_TENANT.md](./MULTI_TENANT.md)
**Arquitectura multi-tenant**
- Modelo de datos (User, Tenant, TenantMembership)
- Autenticación y autorización
- Selector de tenant
- Switch de contexto
- Roles duales (Proveedor + Cliente)
- Aislamiento de datos
- Onboarding de usuarios

**Lee esto** para implementar el sistema de multi-tenancy que permite a usuarios acceder a múltiples empresas con un solo login.

---

### 5. [PARSE_INTEGRATION.md](./PARSE_INTEGRATION.md)
**Integración con Axioma Parse**
- Arquitectura de integración
- API de Parse
- Flujo completo (Upload → Parse → Review)
- Cola de procesamiento
- WebSocket para tiempo real
- Modelo de datos
- Configuración y deployment

**Lee esto** para integrar el sistema con Parse y lograr el escaneo automático de documentos con IA.

---

### 6. [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
**Sistema de diseño completo**
- Paleta de colores AXIOMA
- Tipografía (Inter)
- Componentes UI (Button, Card, Input, etc.)
- Iconografía (Lucide React)
- Layout y spacing
- Animaciones
- Responsive design
- Estados y feedback

**Lee esto** para implementar el look & feel consistente con Parse y el resto de aplicaciones AXIOMA.

---

### 7. [WIREFRAMES.md](./WIREFRAMES.md)
**Diseños de pantallas principales**
- Login
- Selector de empresa
- Dashboard
- Subir documento
- Mis facturas (Kanban)
- Detalle de factura
- Pagos
- Órdenes de compra
- Comunicaciones
- Panel de admin
- Versión móvil

**Lee esto** para tener una referencia visual de todas las pantallas del sistema.

---

### 8. [TECHNICAL_SPECS.md](./TECHNICAL_SPECS.md)
**Especificaciones técnicas completas**
- Stack tecnológico detallado
- Modelo de datos completo (Prisma Schema)
- API Endpoints
- Seguridad y autorización
- Performance y caché
- Testing
- Deployment
- Monitoring

**Lee esto** para implementar el backend y frontend con todas las especificaciones técnicas necesarias.

---

## 📦 MÓDULO: PURCHASE REQUESTS (Requerimientos de Compra)

### 9. [PURCHASE_REQUESTS_SUMMARY.md](./PURCHASE_REQUESTS_SUMMARY.md) ⭐ **EMPIEZA AQUÍ**
**Resumen ejecutivo completo**
- Objetivo del módulo
- 6 documentos técnicos generados
- Comparación de 3 opciones arquitectónicas
- Recomendación: Sync-Client Standalone
- Roadmap de implementación (5 semanas)
- Checklist pre-implementación
- Próximos pasos

**Lee esto primero** para entender el alcance completo del módulo Purchase Requests y decidir la arquitectura.

---

### 10. [PURCHASE_REQUESTS_MODULE.md](./PURCHASE_REQUESTS_MODULE.md)
**Especificaciones técnicas detalladas** (60 KB)
- 11 modelos Prisma (PurchaseRequest, ApprovalLevel, PurchaseReception, etc.)
- Workflow de 9 estados
- Aprobaciones multinivel por monto
- 30+ endpoints API REST
- 7 puntos de integración con IA
- Sistema de notificaciones
- Roadmap: 14-20 semanas

**Lee esto** para entender las especificaciones técnicas completas del módulo.

---

### 11. [FINAL_ARCHITECTURE_WITH_SYNC_CLIENT.md](./FINAL_ARCHITECTURE_WITH_SYNC_CLIENT.md) ⭐ **RECOMENDADA**
**Arquitectura con Sync-Client Standalone** (50 KB)
- Arquitectura: Hub ← HTTP → PostgreSQL ← Sync-Client.exe → Softland SQL
- Reutiliza sync-client existente de Parse
- Sin dependencias adicionales
- Más seguro (credenciales en cliente)
- ETL personalizable con SQL
- Roadmap: 5 semanas
- Complejidad: Baja

**Lee esto** para implementar la arquitectura recomendada de integración con ERP.

---

### 12. [FINAL_ARCHITECTURE.md](./FINAL_ARCHITECTURE.md)
**Arquitectura con Parse como Gateway** (30 KB)
- Arquitectura: Hub ← Webhooks → Parse ← SQL → Softland
- Parse maneja sincronización
- Webhooks para eventos en tiempo real
- Roadmap: 5 semanas
- Complejidad: Media

**Lee esto** si prefieres usar Parse como intermediario para la integración con ERP.

---

### 13. [INTEGRATION_PARSE_ARCHITECTURE.md](./INTEGRATION_PARSE_ARCHITECTURE.md)
**Arquitectura reutilizable de Parse** (45 KB)
- Sistema de API Keys de Parse (código reutilizable)
- Middleware autenticación + encriptación AES-256
- Sincronización bidireccional SQL
- Servicios de integración ERP
- Jobs BullMQ
- Código JavaScript/TypeScript listo

**Lee esto** para entender qué código de Parse puedes reutilizar en Hub.

---

### 14. [WEBHOOK_INTEGRATION.md](./WEBHOOK_INTEGRATION.md)
**Integración Parse ↔ Hub via Webhooks** (40 KB)
- Webhooks Parse → Hub (eventos)
- API calls Hub → Parse (acciones)
- Código TypeScript listo
- Validación HMAC SHA-256
- Sistema de reintentos
- Eventos: purchase_order.created, sync.completed, etc.

**Lee esto** si decides usar webhooks para comunicación entre Parse y Hub.

---

### 15. [SIMPLIFIED_ARCHITECTURE.md](./SIMPLIFIED_ARCHITECTURE.md)
**Arquitectura con Triggers PostgreSQL** (35 KB) - DESCARTADA
- Triggers PostgreSQL para sincronización
- Sin jobs de sincronización
- Parse sincroniza en background
- Hub solo lee/escribe PostgreSQL

**Status**: Descartada por complejidad en debugging de triggers.

---

### 16. [SYNC_CLIENT_INTEGRATION.md](./SYNC_CLIENT_INTEGRATION.md) ⭐ **IMPLEMENTACIÓN**
**Guía de implementación del Sync-Client en Hub** (NUEVO)
- Endpoints que Hub debe implementar
- Modelos Prisma para sync (sync_configurations, sync_api_keys, sync_logs)
- Tablas de sincronización (schema sync)
- Autenticación con API Keys
- Encriptación de credenciales SQL
- Flujo completo PR → OC → Recepción
- Checklist de implementación

**Lee esto** para implementar la integración con el sync-client-standalone existente.

---

### 17. [ROADMAP_PURCHASE_REQUESTS.md](./ROADMAP_PURCHASE_REQUESTS.md) ⭐ **PLAN DE TRABAJO**
**Roadmap detallado con tareas tildables** (NUEVO)
- **Estrategia MVP + Full**: 2.5 semanas MVP mostrable + 2.5 semanas Full
- Tabla comparativa MVP vs Full (qué incluir en cada fase)
- 50+ tareas específicas con checkboxes
- Código de ejemplo para cada tarea
- Criterios de aceptación claros
- Script de demo MVP para mostrar al cliente
- Decisiones de scope justificadas
- Estimaciones de tiempo por tarea
- Roles y responsabilidades
- Riesgos y mitigaciones
- Métricas de éxito

**Lee esto** para ejecutar la implementación paso a paso (empezando por MVP).

---

## 🗺️ RUTA SUGERIDA DE LECTURA

### Para Entender el Proyecto
1. README.md - Visión general
2. MODULES.md - Funcionalidades
3. WIREFRAMES.md - Diseños visuales

### Para Diseñar la Solución
1. MULTI_TENANT.md - Arquitectura base
2. DOCUMENT_FLOW.md - Flujo principal
3. PARSE_INTEGRATION.md - Integración clave
4. DESIGN_SYSTEM.md - Look & Feel

### Para Desarrollar
1. TECHNICAL_SPECS.md - Especificaciones completas
2. DESIGN_SYSTEM.md - Componentes UI
3. PARSE_INTEGRATION.md - Integración con Parse
4. WIREFRAMES.md - Referencia visual

### Para Purchase Requests Module
1. **PURCHASE_REQUESTS_SUMMARY.md** ⭐ - Resumen ejecutivo y decisión de arquitectura
2. **PURCHASE_REQUESTS_MODULE.md** - Especificaciones técnicas detalladas
3. **FINAL_ARCHITECTURE_WITH_SYNC_CLIENT.md** ⭐ - Arquitectura recomendada
4. **SYNC_CLIENT_INTEGRATION.md** ⭐ - Guía de implementación paso a paso
5. **ROADMAP_PURCHASE_REQUESTS.md** ⭐ - Plan de trabajo con tareas tildables
6. FINAL_ARCHITECTURE.md - Alternativa con Parse gateway (opcional)
7. INTEGRATION_PARSE_ARCHITECTURE.md - Código reutilizable de Parse (opcional)
8. WEBHOOK_INTEGRATION.md - Webhooks Parse ↔ Hub (opcional)

---

## 🎯 DIFERENCIADORES CLAVE DE HUB

Recordá que estos son los puntos clave que nos diferencian de la competencia:

### 1. IA-First (Parse)
- 1 click para subir documento
- Sin formularios manuales
- Escaneo automático con IA
- Soporte para múltiples formatos (PDF, JPG, PNG)

### 2. Multi-Tenant Inteligente
- 1 usuario = acceso a N empresas
- Sin múltiples logins
- Switch instantáneo
- Permisos granulares por tenant

### 3. Roles Duales
- Un usuario puede ser proveedor Y cliente
- Switch de contexto
- Buzones separados

### 4. Pipeline Visual
- Vista Kanban/Pipeline
- No solo tabla plana
- Timeline de eventos
- Notificaciones en tiempo real

### 5. Virtualización de Documentos
- Visor integrado (Axioma Docs)
- Sin necesidad de descargar
- Anotaciones y zoom

### 6. Omnicanal
- WhatsApp Business
- Email automático
- Push notifications
- Chat en vivo
- SMS (opcional)

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
Hub/
├── README.md                                    # Visión general
├── docs/
│   ├── INDEX.md                                 # Este archivo
│   ├── MODULES.md                               # Detalle de módulos
│   ├── DOCUMENT_FLOW.md                         # Flujo de documentos
│   ├── MULTI_TENANT.md                          # Arquitectura multi-tenant
│   ├── PARSE_INTEGRATION.md                     # Integración con Parse
│   ├── DESIGN_SYSTEM.md                         # Sistema de diseño
│   ├── WIREFRAMES.md                            # Diseños de pantallas
│   ├── TECHNICAL_SPECS.md                       # Especificaciones técnicas
│   │
│   └── Purchase Requests Module/
│       ├── PURCHASE_REQUESTS_SUMMARY.md         # ⭐ Resumen ejecutivo
│       ├── PURCHASE_REQUESTS_MODULE.md          # Especificaciones técnicas
│       ├── FINAL_ARCHITECTURE_WITH_SYNC_CLIENT.md  # ⭐ Arquitectura recomendada
│       ├── SYNC_CLIENT_INTEGRATION.md           # ⭐ Guía de implementación
│       ├── ROADMAP_PURCHASE_REQUESTS.md         # ⭐ Plan de trabajo (5 semanas)
│       ├── FINAL_ARCHITECTURE.md                # Alternativa Parse gateway
│       ├── INTEGRATION_PARSE_ARCHITECTURE.md    # Código reutilizable
│       ├── WEBHOOK_INTEGRATION.md               # Webhooks Parse ↔ Hub
│       └── SIMPLIFIED_ARCHITECTURE.md           # (Descartada)
│
└── (código fuente irá aquí)
```

---

## 💡 TIPS PARA TU SOCIO

Al desarrollar con Claude, recomendá:

1. **Leer primero**: Que empiece leyendo README.md y MODULES.md
2. **Usar como referencia**: Tener siempre abiertos DESIGN_SYSTEM.md y TECHNICAL_SPECS.md
3. **Copiar componentes**: Reutilizar todo de Parse (`/components/ui/`)
4. **Seguir wireframes**: Usar WIREFRAMES.md como guía visual
5. **Integración Parse**: Leer PARSE_INTEGRATION.md antes de implementar upload

### Comandos útiles para Claude

**Para el sistema base:**
```
"Lee el archivo TECHNICAL_SPECS.md y implementa el schema de Prisma"
"Usando DESIGN_SYSTEM.md, crea el componente Button"
"Siguiendo WIREFRAMES.md, implementa la pantalla de login"
"Basándote en PARSE_INTEGRATION.md, crea el endpoint de upload"
"Según MULTI_TENANT.md, implementa el middleware de autenticación"
```

**Para el módulo Purchase Requests:**
```
"Lee PURCHASE_REQUESTS_SUMMARY.md y explícame las opciones de arquitectura"
"Usando ROADMAP_PURCHASE_REQUESTS.md, implementa la Semana 1 completa"
"Implementa la Task 1.1 del roadmap: crear modelos Prisma de sync"
"Implementa la Task 3.8: job de procesamiento de OCs"
"Revisa el roadmap y marca las tareas completadas hasta ahora"
"Implementa todos los endpoints de la Semana 1 según el roadmap"
```

---

## 📞 CONTACTO

Desarrollado por AXIOMA

¿Preguntas? Revisá primero estos documentos. Si necesitás más info, contactá al equipo.

---

**Versión:** 1.3
**Última actualización:** 29 Noviembre 2025
**Estado:** Documentación completa - Sistema base + Módulo Purchase Requests listos
**Nuevos módulos:** Purchase Requests (9 documentos, ~420 KB)
**Nuevo:** Roadmap MVP + Full con 50+ tareas tildables (ROADMAP_PURCHASE_REQUESTS.md)
**Estrategia:** 2.5 semanas MVP + 2.5 semanas Full
