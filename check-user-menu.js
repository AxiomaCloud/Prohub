const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Buscar usuarios con "udesa" o "juan.perez" en el email
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: 'udesa', mode: 'insensitive' } },
        { email: { contains: 'juan.perez', mode: 'insensitive' } },
        { email: { contains: 'juan', mode: 'insensitive' } }
      ]
    },
    include: {
      tenantMemberships: {
        include: {
          tenant: true
        }
      }
    }
  });

  console.log('=== USUARIOS UDESA ===');
  for (const user of users) {
    console.log(`\n${user.email}`);
    console.log(`  Superuser: ${user.superuser}`);
    for (const m of user.tenantMemberships) {
      console.log(`  Roles: ${m.roles.join(', ') || 'NINGUNO'}`);
    }
  }

  if (users.length === 0) {
    console.log('No se encontraron usuarios');
  }

  const user = users[0];

  console.log('=== USUARIO ===');
  console.log('Email:', user.email);
  console.log('Nombre:', user.name);
  console.log('Superuser:', user.superuser);
  console.log('\n=== MEMBRESÍAS ===');
  for (const m of user.tenantMemberships) {
    console.log(`Tenant: ${m.tenant?.name}`);
    console.log(`  Roles: ${m.roles.join(', ') || 'NINGUNO'}`);
    console.log(`  Activo: ${m.isActive}`);
  }

  // Buscar items de menú y sus roles
  console.log('\n=== ITEMS DE MENÚ CON ROLES ===');
  const menuItems = await prisma.menuItem.findMany({
    where: {
      isActive: true,
      parentId: null
    },
    include: {
      children: {
        where: { isActive: true }
      }
    },
    orderBy: { orderIndex: 'asc' }
  });

  for (const item of menuItems) {
    const roles = item.allowedRoles || [];
    const badge = roles.length === 0 ? '[Solo Superuser]' : `[${roles.join(', ')}]`;
    console.log(`\n${item.title} ${badge}`);

    for (const child of item.children || []) {
      const childRoles = child.allowedRoles || [];
      const childBadge = childRoles.length === 0 ? '[Solo Superuser]' : `[${childRoles.join(', ')}]`;
      console.log(`  └─ ${child.title} ${childBadge}`);
    }
  }

  await prisma.$disconnect();
}

check().catch(console.error);
