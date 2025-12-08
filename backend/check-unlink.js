const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Buscar al usuario mfourgeaux y ver sus membresías
  const user = await prisma.user.findFirst({
    where: { email: 'mfourgeaux@dotgestion.com' },
    include: {
      tenantMemberships: {
        include: {
          supplier: true,
          tenant: true
        }
      }
    }
  });

  console.log('=== USUARIO ===');
  console.log('Email:', user?.email);
  console.log('ID:', user?.id);

  console.log('\n=== MEMBRESIAS ===');
  for (const m of user?.tenantMemberships || []) {
    console.log('---');
    console.log('Membership ID:', m.id);
    console.log('Tenant:', m.tenant.name, '(', m.tenantId, ')');
    console.log('SupplierId:', m.supplierId);
    console.log('Supplier:', m.supplier?.nombre || 'NINGUNO');
  }
}

check().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
