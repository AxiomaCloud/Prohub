# ÍNDICE DE DOCUMENTACIÓN - ProHub

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

---

## 🎯 DIFERENCIADORES CLAVE DE PROHUB

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
ProHub/
├── README.md                    # Visión general
├── docs/
│   ├── INDEX.md                 # Este archivo
│   ├── MODULES.md               # Detalle de módulos
│   ├── DOCUMENT_FLOW.md         # Flujo de documentos
│   ├── MULTI_TENANT.md          # Arquitectura multi-tenant
│   ├── PARSE_INTEGRATION.md     # Integración con Parse
│   ├── DESIGN_SYSTEM.md         # Sistema de diseño
│   ├── WIREFRAMES.md            # Diseños de pantallas
│   └── TECHNICAL_SPECS.md       # Especificaciones técnicas
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

```
"Lee el archivo TECHNICAL_SPECS.md y implementa el schema de Prisma"
"Usando DESIGN_SYSTEM.md, crea el componente Button"
"Siguiendo WIREFRAMES.md, implementa la pantalla de login"
"Basándote en PARSE_INTEGRATION.md, crea el endpoint de upload"
"Según MULTI_TENANT.md, implementa el middleware de autenticación"
```

---

## 📞 CONTACTO

Desarrollado por AXIOMA

¿Preguntas? Revisá primero estos documentos. Si necesitás más info, contactá al equipo.

---

**Versión:** 1.0
**Última actualización:** Noviembre 2025
**Estado:** Documentación completa - Listo para desarrollo
