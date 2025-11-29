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
      title: 'Documentos',
      icon: 'FileText',
      url: '/dashboard/documents',
      orderIndex: 2,
      description: 'Gestión de documentos y facturas',
    },
    {
      id: '3',
      title: 'Pagos',
      icon: 'CreditCard',
      url: '/dashboard/payments',
      orderIndex: 3,
      description: 'Seguimiento de pagos y facturación',
    },
    {
      id: '4',
      title: 'Órdenes de Compra',
      icon: 'ShoppingCart',
      url: '/dashboard/purchase-orders',
      orderIndex: 4,
      description: 'Gestión de órdenes de compra',
    },
    {
      id: '5',
      title: 'Configuración',
      icon: 'Settings',
      url: null,
      orderIndex: 5,
      description: 'Configuración y administración del sistema',
    },
  ];

  const adminSubItems = [
    {
      id: '5-1',
      parentId: '5',
      title: 'Menú',
      icon: 'Menu',
      url: '/dashboard/admin/menu',
      orderIndex: 1,
      description: 'Editar y configurar el menú de navegación',
    },
    {
      id: '5-2',
      parentId: '5',
      title: 'Empresas',
      icon: 'Building2',
      url: '/dashboard/admin/tenants',
      orderIndex: 2,
      description: 'Gestión de empresas/tenants del sistema',
    },
    {
      id: '5-3',
      parentId: '5',
      title: 'Usuarios',
      icon: 'Users',
      url: '/dashboard/admin/usuarios',
      orderIndex: 3,
      description: 'Gestión de usuarios del sistema',
    },
    {
      id: '5-4',
      parentId: '5',
      title: 'Planes',
      icon: 'Package',
      url: '/dashboard/admin/planes',
      orderIndex: 4,
      description: 'Gestión de planes y suscripciones',
    },
    {
      id: '5-5',
      parentId: '5',
      title: 'Preferencias',
      icon: 'Settings',
      url: '/dashboard/settings',
      orderIndex: 5,
      description: 'Configuración de cuenta y preferencias',
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: item,
    });
    console.log(`✅ Created menu item: ${item.title}`);
  }

  for (const item of adminSubItems) {
    await prisma.menuItem.create({
      data: item,
    });
    console.log(`✅ Created sub-item: ${item.title}`);
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
