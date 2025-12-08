import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePortalUrls() {
  console.log('Actualizando URLs del Portal Proveedor...\n');

  // Buscar el menú Portal Proveedor
  const portal = await prisma.menuItem.findFirst({
    where: { title: 'Portal Proveedor' },
    include: { children: true }
  });

  if (!portal) {
    console.log('❌ No se encontró el menú Portal Proveedor');
    return;
  }

  console.log('Portal encontrado, items actuales:');
  for (const child of portal.children) {
    console.log(`  - ${child.title}: ${child.url}`);
  }

  // Mapeo de nuevas URLs
  const urlUpdates: Record<string, string> = {
    'Mis Órdenes': '/portal/ordenes',
    'Mis Facturas': '/portal/facturas',
    'Mis Pagos': '/portal/pagos',
  };

  console.log('\nActualizando URLs...');

  for (const [title, newUrl] of Object.entries(urlUpdates)) {
    const item = portal.children.find(c => c.title === title);
    if (item && item.url !== newUrl) {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { url: newUrl }
      });
      console.log(`✅ ${title}: ${item.url} → ${newUrl}`);
    } else if (item && item.url === newUrl) {
      console.log(`⏭️  ${title}: ya tiene la URL correcta`);
    } else {
      console.log(`⚠️  ${title}: no encontrado`);
    }
  }

  console.log('\n✅ Proceso completado!');
}

updatePortalUrls()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
