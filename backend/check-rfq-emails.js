const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Ver últimas RFQs publicadas
  console.log('=== ÚLTIMAS RFQs ===');
  const rfqs = await prisma.quotationRequest.findMany({
    where: { status: { not: 'DRAFT' } },
    orderBy: { publishedAt: 'desc' },
    take: 3,
    include: {
      invitedSuppliers: {
        include: {
          supplier: { select: { id: true, nombre: true, email: true } }
        }
      }
    }
  });

  for (const rfq of rfqs) {
    console.log('\nRFQ:', rfq.number, '- Status:', rfq.status);
    console.log('PublishedAt:', rfq.publishedAt);
    console.log('Proveedores invitados:');
    for (const inv of rfq.invitedSuppliers) {
      console.log('  -', inv.supplier.nombre, '| Email:', inv.supplier.email || 'SIN EMAIL');
    }
  }

  await prisma.$disconnect();
}

check().catch(console.error);
