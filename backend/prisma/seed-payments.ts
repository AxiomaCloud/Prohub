import { PrismaClient, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Insertando datos mock de pagos...');

  // Obtener el primer tenant disponible
  const tenant = await prisma.tenant.findFirst({
    orderBy: { createdAt: 'asc' }
  });

  if (!tenant) {
    console.log('No hay tenants en la base de datos');
    return;
  }

  console.log(`Usando tenant: ${tenant.name} (${tenant.id})`);

  // Buscar un tenant emisor diferente (o crear uno mock)
  let emisorTenant = await prisma.tenant.findFirst({
    where: { id: { not: tenant.id } }
  });

  if (!emisorTenant) {
    // Crear un tenant emisor mock
    emisorTenant = await prisma.tenant.create({
      data: {
        name: 'Empresa Cliente SA',
        legalName: 'Empresa Cliente Sociedad Anónima',
        taxId: '30-12345678-9',
        country: 'Argentina',
        address: 'Av. Corrientes 1234, CABA',
        phone: '+54 11 4567-8901',
        email: 'pagos@empresacliente.com'
      }
    });
    console.log('Tenant emisor creado:', emisorTenant.name);
  }

  // Fechas para los pagos
  const now = new Date();
  const hace1Mes = new Date(now);
  hace1Mes.setMonth(hace1Mes.getMonth() - 1);
  const hace2Meses = new Date(now);
  hace2Meses.setMonth(hace2Meses.getMonth() - 2);
  const hace3Meses = new Date(now);
  hace3Meses.setMonth(hace3Meses.getMonth() - 3);
  const enUnaSemana = new Date(now);
  enUnaSemana.setDate(enUnaSemana.getDate() + 7);
  const en2Semanas = new Date(now);
  en2Semanas.setDate(en2Semanas.getDate() + 14);

  // Datos de pagos mock
  const pagosMock = [
    {
      number: 'PAG-2025-00001',
      amount: 1250000.00,
      currency: 'ARS',
      status: PaymentStatus.PAID,
      issueDate: hace3Meses,
      paidAt: hace3Meses,
      retentionUrls: [
        { type: 'IIBB', number: 'RET-IIBB-001', amount: 37500.00 },
        { type: 'GANANCIAS', number: 'RET-GAN-001', amount: 25000.00 },
        { type: 'SUSS', number: 'RET-SUSS-001', amount: 12500.00 }
      ]
    },
    {
      number: 'PAG-2025-00002',
      amount: 875500.50,
      currency: 'ARS',
      status: PaymentStatus.PAID,
      issueDate: hace2Meses,
      paidAt: hace2Meses,
      retentionUrls: [
        { type: 'IIBB', number: 'RET-IIBB-002', amount: 26265.02 },
        { type: 'GANANCIAS', number: 'RET-GAN-002', amount: 17510.01 }
      ]
    },
    {
      number: 'PAG-2025-00003',
      amount: 2340000.00,
      currency: 'ARS',
      status: PaymentStatus.PAID,
      issueDate: hace1Mes,
      paidAt: hace1Mes,
      retentionUrls: [
        { type: 'IIBB', number: 'RET-IIBB-003', amount: 70200.00 },
        { type: 'GANANCIAS', number: 'RET-GAN-003', amount: 46800.00 },
        { type: 'IVA', number: 'RET-IVA-003', amount: 234000.00 }
      ]
    },
    {
      number: 'PAG-2025-00004',
      amount: 567800.00,
      currency: 'ARS',
      status: PaymentStatus.SCHEDULED,
      issueDate: now,
      scheduledDate: enUnaSemana,
      paidAt: null,
      retentionUrls: [
        { type: 'IIBB', number: 'RET-IIBB-004', amount: 17034.00 }
      ]
    },
    {
      number: 'PAG-2025-00005',
      amount: 1890250.75,
      currency: 'ARS',
      status: PaymentStatus.SCHEDULED,
      issueDate: now,
      scheduledDate: en2Semanas,
      paidAt: null,
      retentionUrls: [
        { type: 'IIBB', number: 'RET-IIBB-005', amount: 56707.52 },
        { type: 'GANANCIAS', number: 'RET-GAN-005', amount: 37805.02 },
        { type: 'SUSS', number: 'RET-SUSS-005', amount: 18902.51 }
      ]
    },
    {
      number: 'PAG-2025-00006',
      amount: 450000.00,
      currency: 'ARS',
      status: PaymentStatus.SCHEDULED,
      issueDate: now,
      scheduledDate: enUnaSemana,
      paidAt: null,
      retentionUrls: []
    },
    {
      number: 'PAG-2025-00007',
      amount: 3250000.00,
      currency: 'ARS',
      status: PaymentStatus.PROCESSING,
      issueDate: now,
      paidAt: null,
      retentionUrls: [
        { type: 'IIBB', number: 'RET-IIBB-007', amount: 97500.00 },
        { type: 'GANANCIAS', number: 'RET-GAN-007', amount: 65000.00 },
        { type: 'IVA', number: 'RET-IVA-007', amount: 325000.00 },
        { type: 'SUSS', number: 'RET-SUSS-007', amount: 32500.00 }
      ]
    }
  ];

  // Insertar pagos
  for (const pagoData of pagosMock) {
    // Verificar si ya existe
    const existente = await prisma.payment.findFirst({
      where: { number: pagoData.number }
    });

    if (existente) {
      console.log(`Pago ${pagoData.number} ya existe, saltando...`);
      continue;
    }

    const pago = await prisma.payment.create({
      data: {
        number: pagoData.number,
        amount: pagoData.amount,
        currency: pagoData.currency,
        status: pagoData.status,
        issueDate: pagoData.issueDate,
        scheduledDate: pagoData.scheduledDate || null,
        paidAt: pagoData.paidAt,
        issuedByTenantId: emisorTenant.id,
        receivedByTenantId: tenant.id,
        retentionUrls: pagoData.retentionUrls,
        receiptUrl: pagoData.status === 'PAID' ? `/uploads/recibos/${pagoData.number}.pdf` : null
      }
    });

    console.log(`Pago creado: ${pago.number} - ${pago.status} - $${pago.amount}`);
  }

  console.log('\n=== RESUMEN ===');
  const totalPagos = await prisma.payment.count({
    where: { receivedByTenantId: tenant.id }
  });
  console.log(`Total de pagos para ${tenant.name}: ${totalPagos}`);

  const pagados = await prisma.payment.aggregate({
    where: { receivedByTenantId: tenant.id, status: PaymentStatus.PAID },
    _sum: { amount: true },
    _count: true
  });
  console.log(`Pagados: ${pagados._count} pagos por $${pagados._sum?.amount || 0}`);

  const programados = await prisma.payment.aggregate({
    where: { receivedByTenantId: tenant.id, status: PaymentStatus.SCHEDULED },
    _sum: { amount: true },
    _count: true
  });
  console.log(`Programados: ${programados._count} pagos por $${programados._sum?.amount || 0}`);

  const procesando = await prisma.payment.aggregate({
    where: { receivedByTenantId: tenant.id, status: PaymentStatus.PROCESSING },
    _sum: { amount: true },
    _count: true
  });
  console.log(`Procesando: ${procesando._count} pagos por $${procesando._sum?.amount || 0}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
