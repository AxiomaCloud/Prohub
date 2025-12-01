# 📚 Índice de Documentación - Hub ProHub

**Proyecto**: Hub - Portal de Proveedores y Sistema de Gestión de Compras
**Última Actualización**: 29 Noviembre 2025
**Versión**: 2.0

---

## 🎯 Visión General

Hub es una plataforma integral que combina:
1. **Portal de Proveedores** - Para gestión de documentos, facturas y pagos
2. **Sistema de Compras Completo** - 6 circuitos desde requerimiento hasta pago

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
| Roles de usuario | 7 |

### Roles del Sistema

| Actor | Rol | Circuitos |
|-------|-----|-----------|
| **Solicitante** | Crea requerimientos, da conformes | 1, 2, 3, 4 |
| **Aprobador** | Aprueba requerimientos y facturas | 1, 2, 3, 5, 6 |
| **Revisor Técnico** | Valida especificaciones técnicas | 1, 2 |
| **Compras** | Gestiona cotizaciones y OCs | 2, 3, 4, 5 |
| **Proveedor** | Cotiza, entrega, factura | 2, 3, 4, 5, 6 |
| **Pago a Proveedores** | Gestiona facturas y pagos | 5, 6 |
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

### 5. Omnicanal
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
│   ├── # Sistema de Compras v2.0 (NUEVO)
│   ├── CIRCUITOS_COMPRAS_SPEC.md             # ⭐ Especificación completa
│   ├── ROADMAP_CIRCUITOS_COMPRAS.md          # ⭐ Plan de implementación
│   ├── circuitos-compras.html                # Flujos visuales
│   │
│   ├── # Portal de Proveedores (Original)
│   ├── MODULES.md
│   ├── DOCUMENT_FLOW.md
│   ├── MULTI_TENANT.md
│   ├── PARSE_INTEGRATION.md
│   ├── DESIGN_SYSTEM.md
│   ├── WIREFRAMES.md
│   ├── TECHNICAL_SPECS.md
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

**Versión**: 2.0
**Última actualización**: 29 Noviembre 2025
**Estado**: ✅ Documentación completa - Sistema de Compras v2.0 listo
**Nuevo**: 6 circuitos de compras con 79 pasos, 25 modelos, 50+ APIs
