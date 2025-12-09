const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
});

async function test() {
  try {
    console.log('Intentando consulta simple de suppliers...');
    const suppliers = await prisma.supplier.findMany({
      take: 1,
    });
    console.log('SUCCESS! Found', suppliers.length, 'suppliers');
    if (suppliers[0]) {
      console.log('Keys:', Object.keys(suppliers[0]));
    }
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
