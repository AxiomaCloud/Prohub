const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restore() {
  const userId = 'cmixgpkxo000olc7o7vwbhe8m'; // mfourgeaux
  const tenantId = 'cmilogfe00002lcj8yq2itwo5'; // Librería del Sur
  const supplierId = 'cmixftpu80000lc2gpktf4t1m'; // Mi Proveedor

  console.log('=== RESTAURANDO VINCULACIÓN ===');
  const updated = await prisma.tenantMembership.update({
    where: {
      userId_tenantId: { userId, tenantId }
    },
    data: {
      supplierId: supplierId
    },
    include: { supplier: true }
  });

  console.log('SupplierId:', updated.supplierId);
  console.log('Supplier:', updated.supplier?.nombre || 'NINGUNO');
}

restore().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
