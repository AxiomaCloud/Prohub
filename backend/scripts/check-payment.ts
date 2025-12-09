/**
 * Script para verificar un pago específico y sus retenciones
 *
 * Uso: DATABASE_URL="postgresql://..." npx ts-node scripts/check-payment.ts [paymentId o paymentNumber]
 *
 * Ejemplos:
 *   npx ts-node scripts/check-payment.ts PAY-2025-00001
 *   npx ts-node scripts/check-payment.ts abc123-uuid
 *   npx ts-node scripts/check-payment.ts --list   (muestra los últimos 10 pagos)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Retencion {
  tipo: string;
  nombre: string;
  monto: number;
  porcentaje: number;
}

async function listRecentPayments() {
  console.log('\n========================================');
  console.log('   ÚLTIMOS 10 PAGOS');
  console.log('========================================\n');

  const payments = await prisma.payment.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      issuedByTenant: { select: { name: true } },
      receivedByTenant: { select: { name: true } },
      items: { include: { document: { select: { number: true } } } },
    },
  });

  for (const payment of payments) {
    let retentionCount = 0;
    try {
      const retentions = typeof payment.retentionUrls === 'string'
        ? JSON.parse(payment.retentionUrls)
        : payment.retentionUrls;
      if (Array.isArray(retentions)) {
        retentionCount = retentions.length;
      }
    } catch (e) {
      // ignore
    }

    console.log(`📄 ${payment.number}`);
    console.log(`   ID: ${payment.id}`);
    console.log(`   Monto: ${payment.currency} ${Number(payment.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`   Estado: ${payment.status}`);
    console.log(`   Emisor: ${payment.issuedByTenant?.name || '-'}`);
    console.log(`   Receptor: ${payment.receivedByTenant?.name || '-'}`);
    console.log(`   Facturas: ${payment.items.length}`);
    console.log(`   Retenciones: ${retentionCount}`);
    console.log(`   Creado: ${payment.createdAt.toLocaleString('es-AR')}`);
    console.log('');
  }
}

async function checkPayment(identifier: string) {
  console.log('\n========================================');
  console.log('   DETALLE DE PAGO');
  console.log('========================================\n');

  // Buscar por ID o número
  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { id: identifier },
        { number: identifier },
      ],
    },
    include: {
      issuedByTenant: true,
      receivedByTenant: true,
      items: {
        include: {
          document: {
            select: {
              id: true,
              number: true,
              type: true,
              status: true,
              totalAmount: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    console.log(`❌ No se encontró el pago: ${identifier}`);
    console.log('\nUsa --list para ver los últimos pagos\n');
    return;
  }

  console.log(`📄 Pago: ${payment.number}`);
  console.log(`   ID: ${payment.id}`);
  console.log(`   Estado: ${payment.status}`);
  console.log(`   Monto Neto: ${payment.currency} ${Number(payment.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log('');
  console.log(`   Emisor: ${payment.issuedByTenant?.name || '-'}`);
  console.log(`   CUIT Emisor: ${payment.issuedByTenant?.taxId || '-'}`);
  console.log('');
  console.log(`   Receptor: ${payment.receivedByTenant?.name || '-'}`);
  console.log(`   CUIT Receptor: ${payment.receivedByTenant?.taxId || '-'}`);
  console.log('');
  console.log(`   Fecha Emisión: ${payment.issueDate?.toLocaleString('es-AR') || '-'}`);
  console.log(`   Fecha Pago: ${payment.paidAt?.toLocaleString('es-AR') || '-'}`);
  console.log('');

  // Facturas asociadas
  console.log('----------------------------------------');
  console.log('FACTURAS ASOCIADAS:');
  console.log('----------------------------------------');

  if (payment.items.length === 0) {
    console.log('   (Sin facturas asociadas)');
  } else {
    let totalFacturas = 0;
    for (const item of payment.items) {
      const doc = item.document;
      const monto = Number(doc?.totalAmount || item.amount);
      totalFacturas += monto;
      console.log(`   📃 ${doc?.number || 'N/A'}`);
      console.log(`      Tipo: ${doc?.type || '-'}`);
      console.log(`      Estado: ${doc?.status || '-'}`);
      console.log(`      Monto: ${payment.currency} ${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
      console.log('');
    }
    console.log(`   TOTAL FACTURAS: ${payment.currency} ${totalFacturas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  }
  console.log('');

  // Retenciones
  console.log('----------------------------------------');
  console.log('RETENCIONES:');
  console.log('----------------------------------------');

  let retenciones: Retencion[] = [];
  try {
    if (typeof payment.retentionUrls === 'string') {
      retenciones = JSON.parse(payment.retentionUrls);
    } else if (Array.isArray(payment.retentionUrls)) {
      retenciones = payment.retentionUrls as unknown as Retencion[];
    }
  } catch (e) {
    console.log('   ❌ Error al parsear retenciones:', e);
  }

  if (!Array.isArray(retenciones) || retenciones.length === 0) {
    console.log('   (Sin retenciones)');
  } else {
    console.log(`   Total: ${retenciones.length} retenciones\n`);

    // Agrupar por tipo
    const byType: Record<string, { count: number; total: number }> = {};
    for (const ret of retenciones) {
      const tipo = ret.tipo || 'OTRO';
      if (!byType[tipo]) {
        byType[tipo] = { count: 0, total: 0 };
      }
      byType[tipo].count++;
      byType[tipo].total += ret.monto || 0;
    }

    console.log('   Resumen por tipo:');
    let totalRetenciones = 0;
    for (const [tipo, data] of Object.entries(byType)) {
      totalRetenciones += data.total;
      console.log(`     ${tipo}: ${data.count} x ${payment.currency} ${data.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    }
    console.log('');
    console.log(`   TOTAL RETENCIONES: ${payment.currency} ${totalRetenciones.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log('');

    // Mostrar detalle si son pocas
    if (retenciones.length <= 10) {
      console.log('   Detalle:');
      for (let i = 0; i < retenciones.length; i++) {
        const ret = retenciones[i];
        console.log(`     [${i + 1}] ${ret.tipo || ret.nombre}: ${payment.currency} ${(ret.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${((ret.porcentaje || 0) * 100).toFixed(1)}%)`);
      }
    } else {
      console.log(`   (${retenciones.length} retenciones - mostrando primeras 5)`);
      for (let i = 0; i < 5; i++) {
        const ret = retenciones[i];
        console.log(`     [${i + 1}] ${ret.tipo || ret.nombre}: ${payment.currency} ${(ret.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${((ret.porcentaje || 0) * 100).toFixed(1)}%)`);
      }
      console.log('     ...');
    }
  }

  console.log('\n========================================\n');

  // Mostrar el JSON raw de retenciones si hay muchas
  if (retenciones.length > 10) {
    console.log('💾 RAW retentionUrls (primeros 2000 chars):');
    const raw = typeof payment.retentionUrls === 'string'
      ? payment.retentionUrls
      : JSON.stringify(payment.retentionUrls);
    console.log(raw.substring(0, 2000));
    if (raw.length > 2000) {
      console.log(`\n... (${raw.length - 2000} caracteres más)`);
    }
  }
}

async function main() {
  const arg = process.argv[2];

  if (!arg || arg === '--list') {
    await listRecentPayments();
  } else {
    await checkPayment(arg);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
