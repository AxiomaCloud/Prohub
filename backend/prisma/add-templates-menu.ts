import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTemplatesMenuItem() {
  console.log('Adding Templates menu item...');

  // Buscar si ya existe
  const existing = await prisma.menuItem.findFirst({
    where: { url: '/configuracion/templates' },
  });

  if (existing) {
    console.log('Templates menu item already exists');
    return;
  }

  // Buscar el menú padre de Configuración
  const configMenu = await prisma.menuItem.findFirst({
    where: { title: 'Configuración' },
  });

  if (!configMenu) {
    console.log('Configuración menu not found, creating at root level');
  }

  // Contar items existentes bajo Configuración para determinar orden
  const existingItems = await prisma.menuItem.count({
    where: { parentId: configMenu?.id || null },
  });

  await prisma.menuItem.create({
    data: {
      id: '5-7',
      parentId: configMenu?.id || '5',
      title: 'Templates de Email',
      icon: 'Mail',
      url: '/configuracion/templates',
      orderIndex: existingItems + 1,
      description: 'Personalizar plantillas de email',
    },
  });

  console.log('Templates menu item added successfully!');
}

addTemplatesMenuItem()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
