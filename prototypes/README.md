# AXIOMA Hub - Prototipos Interactivos

Prototipos HTML de las pantallas principales de HUB para revisión con el socio.

---

## 📁 Archivos

| Archivo | Descripción | Características |
|---------|-------------|-----------------|
| **index.html** | Pantalla de inicio con links a todos los prototipos | Menú principal |
| **documentos.html** | Portal de Documentos | Tabla, estados con badges, modal de detalle, modal de upload |
| **pagos.html** | Mis Pagos | Listado de pagos, expansión de detalles, descarga de retenciones |
| **onboarding.html** | Alta de Proveedor | Dos formularios obligatorios (Datos bancarios + Datos empresa) |

---

## 🚀 Cómo Ver los Prototipos

### Opción 1: Abrir directamente
Simplemente haz doble click en **`index.html`** y se abrirá en tu navegador predeterminado.

### Opción 2: Servidor local (Recomendado)
Para evitar problemas de CORS y ver mejor las interacciones:

```bash
# Opción A: Python (si lo tienes instalado)
cd prototypes
python -m http.server 8000

# Opción B: Node.js con http-server
npx http-server prototypes -p 8000

# Opción C: VSCode Live Server
# Instala la extensión "Live Server" y haz click derecho en index.html → "Open with Live Server"
```

Luego abre: http://localhost:8000

---

## 🎨 Funcionalidades Interactivas

### Portal de Documentos (`documentos.html`)
✅ **Tabla funcional** con 5 documentos de ejemplo
✅ **Estados con badges** de colores (Exportado, Presentado, Rechazado, Aprobado)
✅ **Modal de detalle** al hacer click en 👁️
✅ **Modal de upload** al hacer click en "Cargar documento"
✅ **Sidebar** con navegación entre secciones
✅ **Timeline** de eventos en el modal de detalle

### Mis Pagos (`pagos.html`)
✅ **Cards de resumen** con totales
✅ **Tabla de pagos** con expandir/colapsar (botón ▼)
✅ **Modal de detalle** completo del pago
✅ **Facturas asociadas** con montos
✅ **Comprobantes descargables** (recibos, retenciones)
✅ **Navegación** entre páginas

### Onboarding (`onboarding.html`)
✅ **Pantalla de selección** de formularios
✅ **Formulario de Datos Bancarios** completo
✅ **Formulario de Proveedor** completo (datos empresa, domicilio, contacto, documentación)
✅ **Upload de archivos** (simulado)
✅ **Preferencias de notificaciones**
✅ **Mensaje de éxito** al completar

---

## 🎯 Puntos de Revisión con el Socio

### 1. Portal de Documentos
- [ ] Tabla: ¿Las columnas son las correctas?
- [ ] Estados: ¿Los colores de los badges están bien? (Negro=Exportado, Rojo=Rechazado, Azul=Presentado, Verde=Aprobado)
- [ ] Modal de detalle: ¿La información mostrada es suficiente?
- [ ] Modal de upload: ¿El flujo es claro?

### 2. Pagos
- [ ] Resumen: ¿Los KPIs mostrados son útiles?
- [ ] Tabla: ¿Falta alguna columna importante?
- [ ] Detalle expandido vs Modal: ¿Cuál prefieren?
- [ ] Retenciones: ¿Es claro cómo descargar cada comprobante?

### 3. Onboarding
- [ ] Pantalla inicial: ¿Los dos formularios están bien separados?
- [ ] Datos bancarios: ¿Falta algún campo?
- [ ] Datos empresa: ¿Falta algún campo?
- [ ] Documentación: ¿Qué archivos son obligatorios?
- [ ] Notificaciones: ¿Las opciones están claras?

---

## 🎨 Diseño

### Colores AXIOMA
- **Primary Dark**: `#352151` (Púrpura oscuro)
- **Primary**: `#8E6AAA` (Púrpura)
- **Yellow**: `#FCE5B7` (Crema/amarillo)
- **Pink**: `#F1ABB5` (Rosa)

### Estados de Documentos
- **Exportado**: Negro `#1F2937`
- **Rechazado**: Rojo `#EF4444`
- **Presentado**: Azul `#3B82F6`
- **Aprobado**: Verde `#10B981`
- **Pagado**: Verde oscuro `#059669`
- **En Revisión**: Amarillo `#F59E0B`

### Framework
- **Tailwind CSS**: via CDN
- **Responsive**: Funciona en desktop, tablet y mobile
- **Sin dependencias**: Solo HTML + Tailwind

---

## 📱 Responsive

Todos los prototipos son responsive y se adaptan a:
- **Desktop**: Vista completa con sidebar
- **Tablet**: Sidebar colapsable
- **Mobile**: Vista optimizada

Prueba redimensionando la ventana del navegador.

---

## 🔧 Modificaciones Rápidas

Si necesitas ajustar algo durante la reunión:

### Cambiar color de un badge:
```html
<!-- Estado Exportado -->
<span class="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded">
  Exportado
</span>

<!-- Cambiar a otro color -->
<span class="px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded">
  Exportado
</span>
```

### Agregar/quitar columna en tabla:
Busca `<thead>` y `<tbody>` y agrega/quita `<th>` y `<td>` respectivamente.

### Cambiar textos:
Todos los textos están en español y son fáciles de editar.

---

## 📚 Documentación Técnica

Los diseños completos están en `/docs/`:
- **PORTAL_DOCUMENTOS_DESIGN.md**: Diseño detallado con flujos y modals
- **PAGOS_DESIGN.md**: Diseño del módulo de pagos
- **ONBOARDING_PROVEEDOR_DESIGN.md**: Diseño del alta de proveedores
- **ROLES.md**: Arquitectura de roles (Empresa, Proveedor, Cliente)

---

## ✅ Checklist de Revisión

- [ ] Abrir `index.html` en navegador
- [ ] Navegar por las 3 pantallas principales
- [ ] Probar todos los botones y modals
- [ ] Revisar en mobile (reducir ventana)
- [ ] Anotar cambios necesarios
- [ ] Validar con el socio

---

## 🚀 Próximos Pasos

Después de la revisión:
1. Ajustar prototipos según feedback
2. Implementar en React + Next.js
3. Integrar con backend
4. Conectar con Parse para upload de documentos

---

## 📞 Notas

Estos prototipos son **estáticos** e **interactivos**:
- ✅ Se pueden clickear botones y abrir modals
- ✅ Se puede navegar entre secciones
- ❌ No guardan datos reales (es solo frontend)
- ❌ No hay backend ni base de datos

Son perfectos para mostrar y validar el diseño visual y el flujo de usuario.

---

**Creado para revisión con el socio** 🎨
