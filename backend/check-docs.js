const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Ver últimos documentos subidos
  console.log('=== ÚLTIMOS DOCUMENTOS ===');
  const docs = await prisma.document.findMany({
    orderBy: { uploadedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      number: true,
      fileName: true,
      providerTenantId: true,
      clientTenantId: true,
      uploadedBy: true,
      status: true,
      uploadedAt: true
    }
  });
  docs.forEach(d => {
    console.log(d.number, '|', d.fileName);
    console.log('  provider:', d.providerTenantId);
    console.log('  client:', d.clientTenantId);
    console.log('  uploadedBy:', d.uploadedBy);
    console.log('  status:', d.status);
    console.log('');
  });

  // Ver suppliers con userId
  console.log('=== SUPPLIERS CON userId ===');
  const suppliers = await prisma.supplier.findMany({
    where: { userId: { not: null } },
    select: {
      id: true,
      nombre: true,
      cuit: true,
      userId: true,
      tenantId: true
    }
  });
  suppliers.forEach(s => {
    console.log(s.nombre, '|', s.cuit, '|', 'userId:', s.userId, '| tenantId:', s.tenantId);
  });

  // Ver tenants
  console.log('\n=== TENANTS ===');
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      taxId: true
    }
  });
  tenants.forEach(t => {
    console.log(t.id, '|', t.name, '|', t.taxId);
  });

  await prisma.$disconnect();
}

check().catch(console.error);
