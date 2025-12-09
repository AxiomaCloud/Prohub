import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addUsuariosMenuItem() {
  console.log('Adding Usuarios menu item to Portal Proveedor...');

  // Buscar si ya existe
  const existing = await prisma.menuItem.findFirst({
    where: { url: '/portal/usuarios' },
  });

  if (existing) {
    console.log('Usuarios menu item already exists');
    return;
  }

  // Buscar el menú padre de Portal Proveedor
  const portalMenu = await prisma.menuItem.findFirst({
    where: { title: 'Portal Proveedor' },
  });

  if (!portalMenu) {
    console.log('Portal Proveedor menu not found');
    return;
  }

  // Contar items existentes bajo Portal Proveedor
  const existingItems = await prisma.menuItem.count({
    where: { parentId: portalMenu.id },
  });

  await prisma.menuItem.create({
    data: {
      id: `${portalMenu.id}-usuarios`,
      parentId: portalMenu.id,
      title: 'Usuarios',
      icon: 'Users',
      url: '/portal/usuarios',
      orderIndex: existingItems + 1,
      description: 'Gestionar usuarios del proveedor',
    },
  });

  console.log('Usuarios menu item added successfully!');
}

addUsuariosMenuItem()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
