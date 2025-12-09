import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // Ver todas las invitaciones a RFQ
  const invitations = await prisma.quotationRequestSupplier.findMany({
    include: {
      supplier: { select: { id: true, nombre: true, email: true } },
      quotationRequest: { select: { id: true, number: true, title: true, status: true } }
    }
  });

  console.log('=== INVITACIONES A RFQ ===');
  console.log(JSON.stringify(invitations, null, 2));

  // Ver el proveedor específico
  const supplier = await prisma.supplier.findUnique({
    where: { id: 'cmiw9wfgl0000lcnk6kmny6lq' }
  });
  console.log('\n=== PROVEEDOR LOGUEADO ===');
  console.log(JSON.stringify(supplier, null, 2));

  // Ver todos los proveedores
  const allSuppliers = await prisma.supplier.findMany({
    select: { id: true, nombre: true, email: true, userId: true }
  });
  console.log('\n=== TODOS LOS PROVEEDORES ===');
  console.log(JSON.stringify(allSuppliers, null, 2));

  // Ver todas las RFQs
  const rfqs = await prisma.quotationRequest.findMany({
    select: { id: true, number: true, title: true, status: true }
  });
  console.log('\n=== TODAS LAS RFQs ===');
  console.log(JSON.stringify(rfqs, null, 2));

  await prisma.$disconnect();
}

check().catch(console.error);
