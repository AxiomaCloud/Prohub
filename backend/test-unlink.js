const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUnlink() {
  const userId = 'cmixgpkxo000olc7o7vwbhe8m'; // mfourgeaux
  const tenantId = 'cmilogfe00002lcj8yq2itwo5'; // Librería del Sur

  console.log('=== ANTES ===');
  const before = await prisma.tenantMembership.findUnique({
    where: {
      userId_tenantId: { userId, tenantId }
    },
    include: { supplier: true }
  });
  console.log('SupplierId:', before?.supplierId);
  console.log('Supplier:', before?.supplier?.nombre || 'NINGUNO');

  console.log('\n=== ACTUALIZANDO A NULL ===');
  const updated = await prisma.tenantMembership.update({
    where: {
      userId_tenantId: { userId, tenantId }
    },
    data: {
      supplierId: null
    },
    include: { supplier: true }
  });

  console.log('\n=== DESPUÉS ===');
  console.log('SupplierId:', updated.supplierId);
  console.log('Supplier:', updated.supplier?.nombre || 'NINGUNO');
}

testUnlink().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
