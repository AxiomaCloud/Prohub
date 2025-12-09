# 📚 Índice de Documentación - Hub ProHub

**Proyecto**: Hub - Portal de Proveedores, Sistema de Gestión de Compras y Oficina Virtual
**Última Actualización**: 08 Diciembre 2025
**Versión**: 2.1

---

## 🎯 Visión General

Hub es una plataforma integral que combina:
1. **Portal de Proveedores** - Para gestión de documentos, facturas y pagos
2. **Sistema de Compras Completo** - 6 circuitos desde requerimiento hasta pago
3. **Oficina Virtual** - Portal de cliente y gestión comercial (próxima iteración)

---

## 🛒 MÓDULO DE COMPRAS v2.0 (NUEVO)

### ⭐ Documentación Principal - EMPIEZA AQUÍ

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [CIRCUITOS_COMPRAS_SPEC.md](./CIRCUITOS_COMPRAS_SPEC.md) | **Especificación técnica completa** de los 6 circuitos: modelos de datos (25), formularios (18+), APIs (50+), estados | ✅ Completo |
| [ROADMAP_CIRCUITOS_COMPRAS.md](./ROADMAP_CIRCUITOS_COMPRAS.md) | **Roadmap detallado** con estimaciones (18 semanas full / 8 semanas MVP), tareas y fases | ✅ Completo |
| [circuitos-compras.html](./circuitos-compras.html) | Documento visual original con flujos de los 6 circuitos (79 pasos) | ✅ Referencia |

### Arquitectura del Sistema de Compras

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA DE COMPRAS                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ CIRCUITO 1: PEDIDOS Y REQUERIMIENTOS (Base) - 6 pasos                  │ │
│  │ Solicitante → Revisión Técnica (opcional) → Aprobación Multinivel     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                              │                                               │
│          ┌───────────────────┼───────────────────┬───────────────┐          │
│          ▼                   ▼                   ▼               ▼          │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │ CIRCUITO 2   │   │ CIRCUITO 3   │   │ CIRCUITO 4   │   │ CIRCUITO 5   │ │
│  │ Cotización/  │   │ Compra con   │   │ OC Simple    │   │ Factura      │ │
│  │ Licitación   │   │ Anticipo     │   │              │   │ Directa      │ │
│  │ (18 pasos)   │   │ (12 pasos)   │   │ (11 pasos)   │   │ (11 pasos)   │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘ │
│          │                   │                   │               │          │
│          └───────────────────┴───────────────────┴───────────────┘          │
│                              │                                               │
│                              ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ CIRCUITO 6: PAGO A PROVEEDORES (Transversal) - 16 pasos               │ │
│  │ Validación Tripartita → Retenciones → Orden de Pago → Certificados    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Métricas del Sistema de Compras

| Métrica | Valor |
|---------|-------|
| Circuitos | 6 |
| Pasos totales | 79 |
| Modelos de datos | 25 |
| Formularios UI | 18+ |
| Endpoints API | 50+ |
| Roles de usuario | 9 (7 compras + 2 oficina virtual) |

### Roles del Sistema

| Actor | Rol | Módulos |
|-------|-----|---------|
| **Solicitante** | Crea requerimientos, da conformes | Compras (1, 2, 3, 4) |
| **Aprobador** | Aprueba requerimientos y facturas | Compras (1, 2, 3, 5, 6) |
| **Revisor Técnico** | Valida especificaciones técnicas | Compras (1, 2) |
| **Compras** | Gestiona cotizaciones y OCs | Compras (2, 3, 4, 5) |
| **Proveedor** | Cotiza, entrega, factura | Portal Proveedores |
| **Pago a Proveedores** | Gestiona facturas y pagos | Compras (5, 6) |
| **Cliente** | Consulta cuenta y servicios | Oficina Virtual |
| **Comercial** | Gestiona cartera de clientes | Oficina Virtual |
| **Administrador** | Configura sistema | Todos |

### Estimación de Desarrollo

| Estrategia | Duración | Alcance |
|------------|----------|---------|
| **MVP** | 8 semanas | Circuitos 1, 4, 6 básico |
| **Full** | 18 semanas | Todos los circuitos + Portal Proveedor + ERP |

---

## 📄 Documentación del Portal de Proveedores (Original)

| Documento | Descripción |
|-----------|-------------|
| [README.md](../README.md) | Visión general del proyecto |
| [MODULES.md](./MODULES.md) | Descripción de módulos del portal |
| [DOCUMENT_FLOW.md](./DOCUMENT_FLOW.md) | Flujo de documentos y estados |
| [MULTI_TENANT.md](./MULTI_TENANT.md) | Arquitectura multi-tenant |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Sistema de diseño y componentes |
| [TECHNICAL_SPECS.md](./TECHNICAL_SPECS.md) | Especificaciones técnicas |
| [WIREFRAMES.md](./WIREFRAMES.md) | Wireframes de pantallas |

---

## 🏢 OFICINA VIRTUAL - Portal de Cliente (PRÓXIMA ITERACIÓN)

### Documentación Principal

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [OFICINA_VIRTUAL_DESIGN.md](./OFICINA_VIRTUAL_DESIGN.md) | **Diseño completo del portal de cliente** y panel comercial | 📋 Pendiente aprobación |

### Nuevos Roles

| Rol | Tipo | Descripción |
|-----|------|-------------|
| **Cliente** | Externo | Consulta servicios, facturas, pagos y realiza gestiones |
| **Comercial** | Interno | Gestiona cartera de clientes, modifica contratos y facturas |

### Funcionalidades Principales

**Portal Cliente:**
- ✅ Dashboard con resumen de cuenta
- ✅ Consulta de servicios contratados
- ✅ Listado y descarga de facturas
- ✅ Historial de pagos
- ✅ Sistema de gestiones (trámites/comunicaciones)
- ✅ Asistente IA - AXIO

**Panel Comercial:**
- ✅ Dashboard de cartera de clientes
- ✅ Gestión de contratos y servicios
- ✅ Modificación de facturas (con auditoría)
- ✅ Cuenta corriente por cliente
- ✅ Atención de gestiones
- ✅ Reportes y métricas

### Estimación de Desarrollo

| Estrategia | Duración | Alcance |
|------------|----------|---------|
| **MVP** | 6 semanas | Portal Cliente básico (consulta) |
| **Full** | 12 semanas | Portal + Panel Comercial + AXIO |

---

## 🔗 Integraciones

| Documento | Descripción |
|-----------|-------------|
| [PARSE_INTEGRATION.md](./PARSE_INTEGRATION.md) | Integración con Parse (IA) |
| [INTEGRATION_PARSE_ARCHITECTURE.md](./INTEGRATION_PARSE_ARCHITECTURE.md) | Arquitectura de integración |
| [ERP_INTEGRATION_VIA_PARSE.md](./ERP_INTEGRATION_VIA_PARSE.md) | Integración ERP vía Parse |
| [SYNC_CLIENT_INTEGRATION.md](./SYNC_CLIENT_INTEGRATION.md) | Cliente de sincronización |

---

## ⚠️ Documentación Deprecada

> **Nota**: Los siguientes documentos han sido **reemplazados** por la nueva especificación de Circuitos de Compras v2.0

| Documento | Reemplazado por |
|-----------|-----------------|
| PURCHASE_REQUESTS_MODULE.md | CIRCUITOS_COMPRAS_SPEC.md |
| PURCHASE_REQUESTS_INDEX.md | Este INDEX.md actualizado |
| ROADMAP_PURCHASE_REQUESTS.md | ROADMAP_CIRCUITOS_COMPRAS.md |
| PURCHASE_REQUESTS_FUNCTIONAL_SUMMARY.md | CIRCUITOS_COMPRAS_SPEC.md |
| PURCHASE_REQUESTS_SUMMARY.md | CIRCUITOS_COMPRAS_SPEC.md |

---

## 🗺️ Ruta de Lectura Sugerida

### Para Entender el Sistema de Compras
1. **circuitos-compras.html** - Visión visual de los 6 circuitos
2. **CIRCUITOS_COMPRAS_SPEC.md** - Especificación técnica completa
3. **ROADMAP_CIRCUITOS_COMPRAS.md** - Plan de implementación

### Para Entender el Portal de Proveedores
1. README.md - Visión general
2. MODULES.md - Funcionalidades
3. WIREFRAMES.md - Diseños visuales

### Para Entender Oficina Virtual (Próxima Iteración)
1. **OFICINA_VIRTUAL_DESIGN.md** - Diseño completo del portal de cliente

### Para Desarrollar
1. CIRCUITOS_COMPRAS_SPEC.md - Modelos y APIs
2. DESIGN_SYSTEM.md - Componentes UI
3. ROADMAP_CIRCUITOS_COMPRAS.md - Tareas específicas

---

## 🎯 Diferenciadores Clave de Hub

### 1. Sistema de Compras Completo
- 6 circuitos interconectados
- Aprobación multinivel por monto
- Cotización/Licitación formal
- Retenciones automáticas

### 2. IA-First (Parse)
- 1 click para subir documento
- Escaneo automático con IA
- Sin formularios manuales

### 3. Multi-Tenant Inteligente
- 1 usuario = acceso a N empresas
- Sin múltiples logins
- Permisos granulares por tenant

### 4. Portal de Proveedores
- Cotizar online
- Ver estado de OCs
- Cargar facturas
- Ver pagos y retenciones

### 5. Oficina Virtual - Portal de Cliente
- Autogestión de servicios y cuenta
- Facturas y pagos en línea
- Sistema de gestiones
- Asistente IA (AXIO)
- Panel comercial integrado

### 6. Omnicanal
- WhatsApp Business
- Email automático
- Push notifications

---

## 📂 Estructura de Archivos

```
Hub/
├── README.md
├── docs/
│   ├── INDEX.md                              # Este archivo
│   │
│   ├── # Sistema de Compras v2.0
│   ├── CIRCUITOS_COMPRAS_SPEC.md             # ⭐ Especificación completa
│   ├── ROADMAP_CIRCUITOS_COMPRAS.md          # ⭐ Plan de implementación
│   ├── circuitos-compras.html                # Flujos visuales
│   │
│   ├── # Oficina Virtual (PRÓXIMA ITERACIÓN)
│   ├── OFICINA_VIRTUAL_DESIGN.md             # ⭐ Diseño Portal Cliente
│   │
│   ├── # Portal de Proveedores
│   ├── MODULES.md
│   ├── DOCUMENT_FLOW.md
│   ├── PORTAL_DOCUMENTOS_DESIGN.md
│   ├── PAGOS_DESIGN.md
│   ├── ONBOARDING_PROVEEDOR_DESIGN.md
│   ├── MULTI_TENANT.md
│   ├── PARSE_INTEGRATION.md
│   ├── DESIGN_SYSTEM.md
│   ├── WIREFRAMES.md
│   ├── TECHNICAL_SPECS.md
│   ├── ROLES.md
│   │
│   └── # Deprecados (referencia histórica)
│       ├── PURCHASE_REQUESTS_*.md
│       └── ...
│
└── src/                                      # Código fuente
```

---

## 📞 Contacto

Desarrollado por AXIOMA

---

**Versión**: 2.1
**Última actualización**: 08 Diciembre 2025
**Estado**: ✅ Documentación completa
**Completado**: Sistema de Compras v2.0 (6 circuitos, 79 pasos, 25 modelos)
**Nuevo**: 📋 Oficina Virtual - Portal de Cliente (diseño completo, pendiente aprobación)
