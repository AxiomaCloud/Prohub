# Plan de Onboarding - Implementación en Cliente

**Proyecto**: Hub - Portal de Proveedores
**Cliente**: [NOMBRE CLIENTE]
**Fecha**: 2025-12-11
**Versión**: 2.0

---

## Resumen Ejecutivo

Este documento detalla el proceso de implementación del Hub en el cliente, incluyendo:
- Configuración de infraestructura
- Integración con ERP Softland
- Configuración funcional
- Capacitación de usuarios
- Puesta en producción

**Duración estimada**: 4-6 semanas
**Modalidad**: Remota con sesiones presenciales opcionales

---

## Estructura de Costos

| Concepto | Horas | Descripción |
|----------|-------|-------------|
| **Paquete Base** | ~120h | Implementación completa funcional |
| **Adicionales Opcionales** | Variable | Funcionalidades extra según necesidad del cliente |
| **Soporte Post Go-Live** | 40h | Primera semana de estabilización |

---

## PAQUETE BASE - ONBOARDING COMPLETO

### FASE 1: PREPARACIÓN Y ANÁLISIS (Semana 1)

| # | Tarea | Responsable | Horas | Entregable |
|---|-------|-------------|-------|------------|
| 1.1 | Kickoff meeting con stakeholders | Axioma + Cliente | 2h | Acta de reunión |
| 1.2 | Relevamiento de usuarios (tipos, cantidades) | Axioma + Cliente | 2h | Lista de usuarios |
| 1.3 | Auditoría de estructura de tablas Softland | Axioma + Cliente | 4h | Documento de mapeo |
| 1.4 | Obtener credenciales de acceso SQL Server Softland | Cliente | - | Credenciales DB |
| 1.5 | Crear tenant en Hub (configuración inicial) | Axioma | 1h | Tenant configurado |
| 1.6 | Generar API Keys (Parse, S3) | Axioma | 1h | Keys generadas |
| 1.7 | Definir flujos de aprobación de requerimientos | Axioma + Cliente | 3h | Matriz de aprobaciones |
| 1.8 | Mapeo de centros de costo (si aplica) | Axioma + Cliente | 2h | Tabla de centros |

**Subtotal Fase 1: 15h**

---

### FASE 2: INFRAESTRUCTURA Y SYNC (Semana 2)

| # | Tarea | Responsable | Horas | Entregable |
|---|-------|-------------|-------|------------|
| 2.1 | Configurar PostgreSQL (schemas: hub, sync, parse) | Axioma | 2h | Base de datos lista |
| 2.2 | Configurar AWS S3 bucket para documentos | Axioma | 1h | Bucket creado |
| 2.3 | Configurar Redis Cloud para cache/colas | Axioma | 1h | Redis configurado |
| 2.4 | Configurar backup automático PostgreSQL | Axioma | 2h | Backups programados |
| 2.5 | Instalar Sync-Client.exe en servidor del cliente | Cliente + Axioma | 2h | Sync-Client instalado |
| 2.6 | Configurar conexión Sync-Client → Softland SQL | Cliente + Axioma | 2h | Conexión probada |
| 2.7 | Crear tablas de sincronización en PostgreSQL | Axioma | 1h | Tablas creadas |
| 2.8 | Configurar Task Scheduler Windows (cada 5 min) | Cliente + Axioma | 1h | Job programado |
| 2.9 | Configurar monitoreo de sync (logs y alertas) | Axioma | 2h | Monitoreo activo |
| 2.10 | Configurar firewall/reglas de acceso (si aplica) | Cliente IT | 2h | Acceso configurado |

**Subtotal Fase 2: 16h**

---

### FASE 3: INTEGRACIÓN ERP (Semana 3)

| # | Tarea | Responsable | Horas | Entregable |
|---|-------|-------------|-------|------------|
| 3.1 | Configurar mapeo de campos: Hub → Softland (Requerimientos) | Axioma + Cliente | 4h | Config guardada |
| 3.2 | Configurar mapeo de campos: Softland → Hub (Órdenes Compra) | Axioma + Cliente | 4h | Config guardada |
| 3.3 | Importar maestro de proveedores desde Softland | Axioma | 4h | Proveedores en Hub |
| 3.4 | Configurar sincronización de productos/servicios | Axioma + Cliente | 3h | Catálogo sincronizado |
| 3.5 | Definir reglas de matching factura ↔ OC | Axioma + Cliente | 3h | Reglas configuradas |
| 3.6 | Configurar sincronización de recepciones/remitos | Axioma + Cliente | 2h | Recepciones sync |
| 3.7 | Test sincronización: Crear requerimiento en Hub | Axioma | 1h | Requerimiento en Softland |
| 3.8 | Test sincronización: Crear OC en Softland | Cliente + Axioma | 1h | OC visible en Hub |
| 3.9 | Validar numeración automática de documentos | Axioma | 1h | Numeración OK |
| 3.10 | Definir manejo de excepciones en sync | Axioma + Cliente | 2h | Flujo de errores |

**Subtotal Fase 3: 25h**

---

### FASE 4: CONFIGURACIÓN FUNCIONAL (Semana 4)

| # | Tarea | Responsable | Horas | Entregable |
|---|-------|-------------|-------|------------|
| 4.1 | Configurar flujos de aprobación por monto/tipo | Axioma + Cliente | 4h | Flujos configurados |
| 4.2 | Configurar delegación de aprobaciones | Axioma + Cliente | 2h | Delegación activa |
| 4.3 | Crear usuarios administradores del cliente | Axioma | 1h | Usuarios creados |
| 4.4 | Crear usuarios aprobadores de requerimientos | Axioma | 2h | Usuarios creados |
| 4.5 | Crear usuarios proveedores (carga manual - primeros 10 pilotos) | Axioma + Cliente | 2h | Proveedores creados |
| 4.6 | Configurar integración con Parse (upload documentos) | Axioma | 2h | Parse funcionando |
| 4.7 | Test: Carga de factura con Parse OCR | Axioma | 1h | Factura procesada |
| 4.8 | Configurar notificaciones por email | Axioma | 2h | Emails enviándose |
| 4.9 | Personalizar templates de emails (branding básico) | Axioma | 2h | Templates listos |
| 4.10 | Configurar dashboard por rol | Axioma | 2h | Dashboards listos |

**Subtotal Fase 4: 20h**

---

### FASE 5: TESTING Y CAPACITACIÓN (Semana 5)

| # | Tarea | Responsable | Horas | Entregable |
|---|-------|-------------|-------|------------|
| 5.1 | Test workflow completo: Requerimiento → OC → Factura | Axioma + Cliente | 4h | Checklist aprobado |
| 5.2 | Sesión de testing con usuarios reales (UAT) | Cliente + Axioma | 4h | UAT aprobado |
| 5.3 | Capacitación usuarios administradores | Axioma | 2h | Grabación sesión |
| 5.4 | Capacitación usuarios aprobadores | Axioma | 2h | Grabación sesión |
| 5.5 | Capacitación proveedores (sesión grupal) | Axioma | 2h | Grabación sesión |
| 5.6 | Entregar manuales de usuario | Axioma | - | PDF Manuales |
| 5.7 | Crear videos tutoriales básicos | Axioma | 4h | Videos en portal |
| 5.8 | Crear FAQ básico | Axioma | 2h | FAQ publicado |

**Subtotal Fase 5: 20h**

---

### FASE 6: MIGRACIÓN Y GO-LIVE (Semana 6)

| # | Tarea | Responsable | Horas | Entregable |
|---|-------|-------------|-------|------------|
| 6.1 | Deploy a producción | Axioma | 2h | Ambiente productivo |
| 6.2 | Configurar monitoreo de logs de sincronización | Axioma | 2h | Dashboard logs |
| 6.3 | Crear usuarios restantes (todos los proveedores - carga manual) | Cliente + Axioma | 4h | Todos los usuarios |
| 6.4 | Enviar emails de bienvenida a proveedores | Axioma | 1h | Emails enviados |
| 6.5 | Comunicación a proveedores (plan básico) | Cliente + Axioma | 2h | Comunicados enviados |

**Subtotal Fase 6: 11h**

---

### FASE 7: ESTABILIZACIÓN Y SEGUIMIENTO (Semanas 7-8)

| # | Tarea | Responsable | Horas | Entregable |
|---|-------|-------------|-------|------------|
| 7.1 | Soporte en vivo durante primera semana | Axioma | 40h | Tickets resueltos |
| 7.2 | Reuniones de seguimiento semanales | Axioma + Cliente | 2h | Actas reuniones |
| 7.3 | Revisión de logs de sincronización | Axioma | 4h | Reporte de sync |
| 7.4 | Resolución de tickets de soporte | Axioma | Incluido | Tickets cerrados |
| 7.5 | Reunión de cierre y lessons learned | Axioma + Cliente | 2h | Documento final |

**Subtotal Fase 7: 48h** (incluye soporte intensivo primera semana)

---

## **TOTAL PAQUETE BASE: ~155 horas**

---

## ADICIONALES OPCIONALES (se cotizan aparte)

### OPCIÓN 1: Migración de Datos Históricos

| # | Tarea | Horas | Descripción |
|---|-------|-------|-------------|
| A1.1 | Migración de facturas históricas (últimos 6 meses) | 8h | Extracción, transformación, carga y validación |
| A1.2 | Migración de órdenes de compra abiertas | 4h | Solo OCs pendientes de recepción/facturación |
| A1.3 | Migración de recepciones/remitos históricos | 4h | Vincular con OCs |
| A1.4 | Validación y reconciliación de datos migrados | 4h | Verificar integridad |

**Subtotal Migración: 20h**

**Consideraciones:**
- Se migran solo datos de los últimos 6-12 meses (a definir)
- Cliente debe proveer data en formato estructurado (CSV o acceso a tablas)
- No incluye limpieza de datos inconsistentes (se cotiza aparte si es necesario)

---

### OPCIÓN 2: Notificaciones WhatsApp Business

| # | Tarea | Horas | Descripción |
|---|-------|-------|-------------|
| A2.1 | Configurar cuenta WhatsApp Business API | 2h | Setup inicial con proveedor |
| A2.2 | Integrar WhatsApp con Hub | 4h | Desarrollo de integración |
| A2.3 | Crear templates de mensajes WhatsApp | 2h | Notificaciones clave |
| A2.4 | Testing y validación de envíos | 2h | Pruebas end-to-end |

**Subtotal WhatsApp: 10h**

**Consideraciones:**
- Requiere cuenta de WhatsApp Business API (costo adicional mensual del proveedor)
- Se crean templates para: factura cargada, OC recibida, aprobación pendiente, pago realizado
- No incluye chatbot bidireccional (solo notificaciones salientes)

---

### OPCIÓN 3: Creación Automática de Usuarios desde Softland

| # | Tarea | Horas | Descripción |
|---|-------|-------|-------------|
| A3.1 | Desarrollar sincronización automática de proveedores | 6h | Sync-Client detecta nuevos proveedores en Softland |
| A3.2 | Crear flujo de activación automática en Hub | 4h | Usuario creado + email de invitación |
| A3.3 | Configurar reglas de mapping de datos (email, contacto) | 2h | Validaciones y reglas de negocio |
| A3.4 | Testing sincronización de alta de proveedores | 2h | Pruebas con casos reales |

**Subtotal Creación Automática: 14h**

**Consideraciones:**
- Softland debe tener campos de email/contacto en maestro de proveedores
- Se requiere definir trigger (ej: proveedor con flag "activo en portal")
- Primera carga manual, luego automático para nuevos

---

### OPCIÓN 4: Chatbot IA (AXIO)

| # | Tarea | Horas | Descripción |
|---|-------|-------|-------------|
| A4.1 | Configurar API de Anthropic Claude | 2h | Setup inicial y API keys |
| A4.2 | Activar widget de chatbot en Hub | 2h | Integración frontend |
| A4.3 | Entrenar chatbot con documentación del cliente | 4h | Contexto específico del cliente |
| A4.4 | Configurar flujos de acciones (crear requerimiento, consultar estado) | 6h | Integración con backend |
| A4.5 | Testing y ajuste de prompts | 4h | Validar respuestas |

**Subtotal Chatbot IA: 18h**

**Consideraciones:**
- Requiere API Key de Anthropic (costo mensual según uso)
- Se configura para: consultas de estado, creación de requerimientos, ayuda general
- Entrenable con documentación específica del cliente

---

### OPCIÓN 5: Capacitación Extendida

| # | Tarea | Horas | Descripción |
|---|-------|-------|-------------|
| A5.1 | Capacitación presencial en sede del cliente | 8h | Sesión de día completo |
| A5.2 | Capacitación específica por departamento (Compras, Finanzas, IT) | 6h | 2h por departamento |
| A5.3 | Webinar masivo para todos los proveedores | 2h | Sesión online grupal |
| A5.4 | Capacitación de refuerzo (usuarios rezagados) | 4h | Post go-live |

**Subtotal Capacitación: 20h**

**Consideraciones:**
- Capacitación presencial no incluye gastos de viaje (se cotiza aparte)
- Webinar masivo requiere coordinación con el cliente para convocar proveedores

---

### OPCIÓN 6: Configuraciones Avanzadas

| # | Tarea | Horas | Descripción |
|---|-------|-------|-------------|
| A6.1 | Configurar campos custom en documentos | 4h | Campos adicionales específicos de la industria |
| A6.2 | Desarrollar reportes personalizados | 8h | Dashboards y reportes específicos |
| A6.3 | Configurar flujos de aprobación complejos (matriz multidimensional) | 6h | Aprobaciones por monto, tipo, centro de costo, etc |
| A6.4 | Integración con otros sistemas (ej: contabilidad, BI) | Variable | A cotizar según sistema |

**Subtotal Configuraciones: 18h** (sin incluir integraciones adicionales)

---

## RESUMEN DE COSTOS

| Concepto | Horas | Tipo |
|----------|-------|------|
| **Paquete Base Completo** | 155h | Obligatorio |
| **Migración de Datos Históricos** | 20h | Opcional |
| **WhatsApp Business** | 10h | Opcional |
| **Creación Automática de Usuarios** | 14h | Opcional |
| **Chatbot IA (AXIO)** | 18h | Opcional |
| **Capacitación Extendida** | 20h | Opcional |
| **Configuraciones Avanzadas** | 18h | Opcional |

**Paquete Completo (con todos los opcionales): ~255 horas**

---

## MATRIZ DE RESPONSABILIDADES (RACI)

| Actividad | Axioma | Cliente IT | Cliente Negocio | Proveedor |
|-----------|--------|------------|-----------------|-----------|
| **Setup infraestructura** | R,A | C | I | - |
| **Instalación Sync-Client** | C | R,A | I | - |
| **Configuración ERP** | C | R | A | - |
| **Importar maestro de proveedores** | R,A | C | C | - |
| **Configurar flujos de aprobación** | R | I | A | - |
| **Creación usuarios** | R,A | I | C | - |
| **Capacitación** | R,A | I | C | I |
| **Testing** | R | C | A | - |
| **Go-Live** | R,A | C | I | - |
| **Soporte inicial** | R,A | C | I | C |

**Leyenda**: R=Responsable, A=Aprueba, C=Consultado, I=Informado

---

## REQUISITOS PREVIOS DEL CLIENTE

### Infraestructura IT

- [ ] Servidor Windows con acceso a SQL Server Softland
- [ ] Credenciales de base de datos Softland (usuario con permisos de lectura/escritura)
- [ ] Puerto 1433 (SQL Server) accesible desde servidor donde corre Sync-Client
- [ ] Acceso a internet para comunicación con Hub (HTTPS)
- [ ] Espacio en disco para logs de sincronización (~500MB)

### Información Funcional

- [ ] Lista de usuarios (nombre, email, rol)
- [ ] **Maestro de proveedores en Softland** (razón social, CUIT, email contacto)
- [ ] Definición de flujos de aprobación (matriz: rol + monto + tipo)
- [ ] Mapeo de centros de costo (si aplica)
- [ ] Mapeo de campos custom (si aplica)
- [ ] Políticas de retención de documentos

### Recursos Humanos

- [ ] Sponsor del proyecto (C-level)
- [ ] Referente IT (instalación, troubleshooting)
- [ ] Referente funcional de compras
- [ ] Referente funcional de cuentas a pagar
- [ ] Key users para UAT

---

## ENTREGABLES POR FASE

| Fase | Entregables |
|------|-------------|
| **Fase 1** | Acta kickoff, Lista usuarios, Tenant configurado, Matriz de aprobaciones |
| **Fase 2** | Infraestructura montada, Sync-Client instalado y probado |
| **Fase 3** | Integración ERP funcionando, Maestro de proveedores importado, Tests aprobados |
| **Fase 4** | Usuarios creados, Flujos de aprobación configurados, Parse funcionando, Notificaciones activas |
| **Fase 5** | Capacitaciones realizadas, Manuales entregados, UAT aprobado, Videos tutoriales |
| **Fase 6** | Sistema en producción, Usuarios activos, Comunicados enviados |
| **Fase 7** | Proyecto estabilizado, Documentación de cierre, Reporte de adopción |

---

## SUPUESTOS Y EXCLUSIONES

### Supuestos

1. Cliente tiene Softland ERP instalado y operativo
2. Cliente tiene infraestructura de IT básica (Windows Server, red, internet)
3. Axioma provee las licencias de Parse, S3, Redis (se facturan mensualmente según uso)
4. El cliente proveerá usuarios para testing en tiempo y forma
5. La capacitación del paquete base es remota vía videollamada
6. **El maestro de proveedores de Softland está actualizado y tiene emails de contacto**

### Exclusiones (NO incluido en el paquete base)

- Customizaciones de Softland ERP
- Integración con otros sistemas (más allá de Softland)
- Desarrollo de funcionalidades custom no contempladas
- Capacitación presencial (se cotiza en Opción 5)
- Migración de datos históricos (se cotiza en Opción 1)
- Soporte extendido post-estabilización (se cotiza aparte según SLA)
- Chatbot IA (se cotiza en Opción 4)
- WhatsApp Business (se cotiza en Opción 2)

---

## RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Estructura de tablas Softland diferente a esperada | Media | Alto | Validar estructura en Fase 1 antes de configurar sync |
| Cliente no tiene credenciales de Softland | Baja | Alto | Solicitarlas en pre-venta, bloquear hasta tenerlas |
| Maestro de proveedores sin emails actualizados | Media | Medio | Cliente debe actualizar antes de Fase 3 |
| Resistencia al cambio de proveedores | Media | Medio | Plan de comunicación y capacitación gradual |
| Errores de sincronización no detectados | Media | Alto | Monitoreo activo primeras 2 semanas + alertas |
| Parse no extrae bien algunos formatos de factura | Baja | Medio | Parse ya probado, validar casos edge en Fase 5 |

---

## CRONOGRAMA RESUMIDO

```
Semana 1: Preparación y análisis (15h)
Semana 2: Infraestructura y Sync-Client (16h)
Semana 3: Integración ERP + Importación maestro proveedores (25h)
Semana 4: Configuración funcional + Flujos aprobación (20h)
Semana 5: Testing y capacitación (20h)
Semana 6: Migración y Go-Live (11h)
Semanas 7-8: Estabilización y soporte intensivo (48h)
```

**Total: 6-8 semanas | ~155 horas**

---

## PRÓXIMOS PASOS

1. **Validar alcance con el cliente**
   - Revisar paquete base vs adicionales opcionales
   - Confirmar si requieren migración de datos históricos
   - Definir si activan WhatsApp, Chatbot IA, o creación automática de usuarios

2. **Preparar propuesta comercial**
   - Costear horas del paquete base
   - Costear adicionales opcionales por separado
   - Incluir costos recurrentes (Parse, S3, Redis, WhatsApp API, Claude API)

3. **Validar requisitos previos**
   - Confirmar que el cliente tiene todo lo listado en "Requisitos Previos"
   - Solicitar acceso a ambiente de pruebas de Softland
   - Validar estructura de tablas de Softland

4. **Agendar kickoff**
   - Presentar plan de onboarding
   - Alinear expectativas de timeline
   - Definir equipo del cliente (sponsor, IT, funcional)

---

**Documento generado**: 2025-12-11
**Autor**: Claude Code + Equipo Axioma
**Versión**: 2.0
**Estado**: Listo para propuesta comercial
