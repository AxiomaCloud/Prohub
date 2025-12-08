const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const supplier = await prisma.supplier.findUnique({
    where: { id: 'cmixhvdd80000r10z3j3l2szw' },
    include: {
      documentos: true,
      cuentasBancarias: true
    }
  });

  if (!supplier) {
    console.log('Proveedor no encontrado');
    return;
  }

  console.log('=== PROVEEDOR ===');
  console.log('Nombre:', supplier.nombre);
  console.log('Estado:', supplier.status);
  console.log('Email:', supplier.email);
  console.log('Condición Fiscal:', supplier.condicionFiscal);
  console.log('CBU:', supplier.cbu);
  console.log('Banco:', supplier.banco);
  console.log('');
  console.log('=== CUENTAS BANCARIAS ===');
  console.log('Total:', supplier.cuentasBancarias?.length || 0);
  supplier.cuentasBancarias?.forEach(c => {
    console.log('  -', c.banco, c.cbu);
  });
  console.log('');
  console.log('=== DOCUMENTOS ===');
  console.log('Total:', supplier.documentos?.length || 0);
  supplier.documentos?.forEach(d => {
    console.log('  -', d.tipo, d.nombre);
  });
}

check().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
