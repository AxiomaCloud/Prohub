import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMenu() {
  console.log('🌱 Seeding menu items...');

  // Limpiar menu existente
  await prisma.menuItem.deleteMany();

  // Crear items de menú
  const menuItems = [
    {
      id: '1',
      title: 'Inicio',
      icon: 'Home',
      url: '/dashboard',
      orderIndex: 1,
      description: 'Vista principal del dashboard',
    },
    {
      id: '2',
      title: 'Compras',
      icon: 'ShoppingCart',
      url: null,
      orderIndex: 2,
      description: 'Gestión del circuito de compras',
    },
    {
      id: '3',
      title: 'Documentos',
      icon: 'FileText',
      url: '/documentos',
      orderIndex: 3,
      description: 'Gestión de documentos y facturas',
    },
    {
      id: '4',
      title: 'Pagos',
      icon: 'CreditCard',
      url: '/pagos',
      orderIndex: 4,
      description: 'Seguimiento de pagos y facturación',
    },
    {
      id: '5',
      title: 'Configuración',
      icon: 'Settings',
      url: null,
      orderIndex: 5,
      description: 'Configuración y administración del sistema',
    },
    {
      id: '6',
      title: 'Portal Proveedor',
      icon: 'Package',
      url: null,
      orderIndex: 6,
      description: 'Portal para proveedores',
    },
    {
      id: '7',
      title: 'Proveedores',
      icon: 'Building2',
      url: '/proveedores',
      orderIndex: 7,
      description: 'Gestión de proveedores',
    },
  ];

  // Sub-items de Compras
  const comprasSubItems = [
    {
      id: '2-1',
      parentId: '2',
      title: 'Dashboard',
      icon: 'LayoutDashboard',
      url: '/compras',
      orderIndex: 1,
      description: 'Vista general del circuito de compras',
    },
    {
      id: '2-2',
      parentId: '2',
      title: 'Requerimientos',
      icon: 'ClipboardList',
      url: '/compras/requerimientos',
      orderIndex: 2,
      description: 'Gestión de requerimientos de compra',
    },
    {
      id: '2-3',
      parentId: '2',
      title: 'Aprobaciones',
      icon: 'CheckCircle',
      url: '/compras/aprobaciones',
      orderIndex: 3,
      description: 'Aprobación de requerimientos pendientes',
    },
    {
      id: '2-4',
      parentId: '2',
      title: 'Órdenes de Compra',
      icon: 'ShoppingCart',
      url: '/compras/ordenes-compra',
      orderIndex: 4,
      description: 'Gestión de órdenes de compra',
    },
    {
      id: '2-5',
      parentId: '2',
      title: 'Aprobación OC',
      icon: 'ClipboardCheck',
      url: '/compras/aprobaciones-oc',
      orderIndex: 5,
      description: 'Aprobación de órdenes de compra',
    },
    {
      id: '2-6',
      parentId: '2',
      title: 'Cotizaciones',
      icon: 'FileSearch',
      url: '/compras/cotizaciones',
      orderIndex: 6,
      description: 'Solicitud de cotizaciones y licitaciones',
    },
    {
      id: '2-7',
      parentId: '2',
      title: 'Recepción',
      icon: 'PackageCheck',
      url: '/compras/recepcion',
      orderIndex: 7,
      description: 'Recepción de compras y mercadería',
    },
  ];

  // Sub-items del Portal Proveedor
  const portalSubItems = [
    {
      id: '6-1',
      parentId: '6',
      title: 'Dashboard',
      icon: 'LayoutDashboard',
      url: '/portal/dashboard',
      orderIndex: 1,
      description: 'Vista general del portal de proveedor',
    },
    {
      id: '6-2',
      parentId: '6',
      title: 'Cotizaciones',
      icon: 'FileSearch',
      url: '/portal/cotizaciones',
      orderIndex: 2,
      description: 'Solicitudes de cotización recibidas',
    },
    {
      id: '6-3',
      parentId: '6',
      title: 'Mis Órdenes',
      icon: 'ShoppingCart',
      url: '/portal/ordenes',
      orderIndex: 3,
      description: 'Órdenes de compra recibidas',
    },
    {
      id: '6-4',
      parentId: '6',
      title: 'Mis Facturas',
      icon: 'Receipt',
      url: '/portal/facturas',
      orderIndex: 4,
      description: 'Facturas y documentos enviados',
    },
    {
      id: '6-5',
      parentId: '6',
      title: 'Mis Pagos',
      icon: 'CreditCard',
      url: '/portal/pagos',
      orderIndex: 5,
      description: 'Pagos recibidos y pendientes',
    },
    {
      id: '6-6',
      parentId: '6',
      title: 'Mi Empresa',
      icon: 'Building2',
      url: '/portal/empresa',
      orderIndex: 6,
      description: 'Datos de mi empresa',
    },
  ];

  const adminSubItems = [
    {
      id: '5-1',
      parentId: '5',
      title: 'Menú',
      icon: 'Menu',
      url: '/admin/menu',
      orderIndex: 1,
      description: 'Editar y configurar el menú de navegación',
    },
    {
      id: '5-2',
      parentId: '5',
      title: 'Empresas',
      icon: 'Building2',
      url: '/admin/tenants',
      orderIndex: 2,
      description: 'Gestión de empresas/tenants del sistema',
    },
    {
      id: '5-3',
      parentId: '5',
      title: 'Usuarios',
      icon: 'Users',
      url: '/admin/users',
      orderIndex: 3,
      description: 'Gestión de usuarios del sistema',
    },
    {
      id: '5-4',
      parentId: '5',
      title: 'Reglas de Aprobación',
      icon: 'Shield',
      url: '/admin/approval-rules',
      orderIndex: 4,
      description: 'Configuración de flujos de aprobación',
    },
    {
      id: '5-5',
      parentId: '5',
      title: 'Notificaciones',
      icon: 'Bell',
      url: '/admin/settings',
      orderIndex: 5,
      description: 'Configuración de notificaciones por email',
    },
    {
      id: '5-6',
      parentId: '5',
      title: 'Planes',
      icon: 'Package',
      url: '/admin/planes',
      orderIndex: 6,
      description: 'Gestión de planes y suscripciones',
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: item,
    });
    console.log(`✅ Created menu item: ${item.title}`);
  }

  for (const item of comprasSubItems) {
    await prisma.menuItem.create({
      data: item,
    });
    console.log(`✅ Created compras sub-item: ${item.title}`);
  }

  for (const item of adminSubItems) {
    await prisma.menuItem.create({
      data: item,
    });
    console.log(`✅ Created admin sub-item: ${item.title}`);
  }

  for (const item of portalSubItems) {
    await prisma.menuItem.create({
      data: item,
    });
    console.log(`✅ Created portal sub-item: ${item.title}`);
  }

  console.log('✅ Menu seeding completed!');
}

seedMenu()
  .catch((e) => {
    console.error('❌ Error seeding menu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
