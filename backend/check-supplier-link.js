const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Buscar al usuario mfourgeaux
  const user = await prisma.user.findFirst({
    where: { email: 'mfourgeaux@dotgestion.com' },
    include: {
      tenantMemberships: {
        include: {
          supplier: true
        }
      }
    }
  });

  console.log('=== USUARIO ===');
  console.log('Email:', user?.email);
  for (const m of user?.tenantMemberships || []) {
    console.log('TenantId:', m.tenantId);
    console.log('SupplierId:', m.supplierId);
    console.log('Supplier:', m.supplier?.nombre);
  }
}

check().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
