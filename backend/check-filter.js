const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Simular el filtro del backend con supplierId de Maria Clara
  const supplierId = 'cmixj8puz0003r18xsdm26g0k'; // ID del supplier de Maria Clara - lo obtenemos buscando

  // Buscar supplier por userId
  console.log('=== BUSCANDO SUPPLIER POR EMAIL O USERID ===');
  const suppliers = await prisma.supplier.findMany({
    where: {
      OR: [
        { email: 'mcjoselevich@gmail.com' },
        { userId: 'cmixj6xv40000r18xao9vp4lw' }
      ]
    }
  });
  console.log('Suppliers encontrados:', suppliers.length);
  suppliers.forEach(s => {
    console.log('ID:', s.id);
    console.log('Nombre:', s.nombre);
    console.log('CUIT:', s.cuit);
    console.log('userId:', s.userId);
    console.log('tenantId:', s.tenantId);
  });

  if (suppliers.length > 0) {
    const supplier = suppliers[0];

    // Buscar tenant con el mismo CUIT
    console.log('\n=== BUSCANDO TENANT POR CUIT ===');
    const supplierTenant = await prisma.tenant.findFirst({
      where: { taxId: supplier.cuit }
    });
    console.log('Tenant encontrado:', supplierTenant ? supplierTenant.id : 'NO');

    // Si encontró tenant, buscar documentos
    if (supplierTenant) {
      console.log('\n=== BUSCANDO DOCUMENTOS CON providerTenantId ===');
      const docs = await prisma.document.findMany({
        where: { providerTenantId: supplierTenant.id }
      });
      console.log('Documentos encontrados:', docs.length);
      docs.forEach(d => console.log(d.number, '|', d.fileName));
    }

    // Probar también con uploadedBy
    console.log('\n=== BUSCANDO DOCUMENTOS CON uploadedBy ===');
    const docsByUser = await prisma.document.findMany({
      where: { uploadedBy: supplier.userId }
    });
    console.log('Documentos encontrados:', docsByUser.length);
    docsByUser.forEach(d => console.log(d.number, '|', d.fileName));
  }

  await prisma.$disconnect();
}

check().catch(console.error);
