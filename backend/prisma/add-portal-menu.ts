import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para agregar SOLO las opciones del Portal Proveedor
 * SIN borrar ni modificar las opciones existentes del menú
 *
 * Ejecutar con: npx ts-node prisma/add-portal-menu.ts
 */
async function addPortalMenu() {
  console.log('Verificando y agregando opciones de Portal Proveedor...');

  // Verificar si ya existe el menu Portal Proveedor
  let portal = await prisma.menuItem.findFirst({
    where: { title: 'Portal Proveedor' }
  });

  if (!portal) {
    console.log('Portal Proveedor no existe. Creandolo...');

    // Obtener el mayor orderIndex actual para los items de nivel 1
    const maxOrder = await prisma.menuItem.aggregate({
      _max: { orderIndex: true },
      where: { parentId: null }
    });

    const newOrder = (maxOrder._max.orderIndex || 0) + 1;

    // Crear el menu principal
    portal = await prisma.menuItem.create({
      data: {
        title: 'Portal Proveedor',
        icon: 'Package',
        url: null,
        orderIndex: newOrder,
        description: 'Portal para proveedores',
        isActive: true,
      }
    });

    console.log('✅ Portal Proveedor creado con id:', portal.id);
  } else {
    console.log('Portal Proveedor ya existe con id:', portal.id);
  }

  // Definir subitems del portal
  // Las páginas del portal tienen vistas optimizadas para proveedores
  const portalSubItems = [
    { title: 'Dashboard', icon: 'LayoutDashboard', url: '/portal/dashboard', orderIndex: 1, description: 'Vista general del portal' },
    { title: 'Cotizaciones', icon: 'FileSearch', url: '/portal/cotizaciones', orderIndex: 2, description: 'Solicitudes de cotización recibidas' },
    { title: 'Mis Órdenes', icon: 'ShoppingCart', url: '/portal/ordenes', orderIndex: 3, description: 'Órdenes de compra recibidas' },
    { title: 'Mis Facturas', icon: 'Receipt', url: '/portal/facturas', orderIndex: 4, description: 'Facturas y documentos enviados' },
    { title: 'Mis Pagos', icon: 'CreditCard', url: '/portal/pagos', orderIndex: 5, description: 'Pagos recibidos y pendientes' },
    { title: 'Mi Empresa', icon: 'Building2', url: '/portal/empresa', orderIndex: 6, description: 'Datos de mi empresa' },
  ];

  // Agregar o actualizar subitems
  for (const item of portalSubItems) {
    const existing = await prisma.menuItem.findFirst({
      where: {
        parentId: portal.id,
        title: item.title
      }
    });

    if (!existing) {
      await prisma.menuItem.create({
        data: {
          parentId: portal.id,
          title: item.title,
          icon: item.icon,
          url: item.url,
          orderIndex: item.orderIndex,
          description: item.description,
          isActive: true,
        }
      });
      console.log('✅ Creado:', item.title);
    } else if (existing.url !== item.url) {
      // Actualizar URL si cambió
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          url: item.url,
          icon: item.icon,
          description: item.description,
          orderIndex: item.orderIndex,
        }
      });
      console.log('🔄 Actualizado:', item.title, `(${existing.url} → ${item.url})`);
    } else {
      console.log('⏭️  Ya existe:', item.title);
    }
  }

  console.log('\n✅ Proceso completado!');
}

addPortalMenu()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
