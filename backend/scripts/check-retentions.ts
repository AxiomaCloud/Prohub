/**
 * Script para consultar las retenciones generadas en los pagos
 *
 * Uso: DATABASE_URL="postgresql://..." npx ts-node scripts/check-retentions.ts
 *
 * Opciones:
 *   --tenant=ID     Solo mostrar pagos de un tenant específico
 *   --limit=N       Limitar a N pagos (default: 20)
 *   --summary       Solo mostrar resumen
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Retencion {
  tipo: string;
  nombre: string;
  monto: number;
  porcentaje: number;
}

function parseArgs(): { tenantId?: string; limit: number; summaryOnly: boolean } {
  const args = process.argv.slice(2);
  const options = { limit: 20, summaryOnly: false } as { tenantId?: string; limit: number; summaryOnly: boolean };

  for (const arg of args) {
    if (arg.startsWith('--tenant=')) {
      options.tenantId = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--summary') {
      options.summaryOnly = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log('\n========================================');
  console.log('   CONSULTA DE RETENCIONES EN PAGOS');
  console.log('========================================\n');

  // Construir filtro
  const whereClause: any = {};
  if (options.tenantId) {
    whereClause.issuedByTenantId = options.tenantId;
    console.log(`📌 Filtro: Tenant ${options.tenantId}\n`);
  }

  // 1. Obtener estadísticas generales
  const totalPayments = await prisma.payment.count({ where: whereClause });
  const paymentsWithRetentions = await prisma.payment.count({
    where: {
      ...whereClause,
      retentionUrls: { not: null },
    },
  });

  console.log('📊 ESTADÍSTICAS GENERALES:');
  console.log(`   Total de pagos: ${totalPayments}`);
  console.log(`   Pagos con retenciones: ${paymentsWithRetentions}`);
  console.log('');

  // 2. Obtener pagos con retenciones
  const payments = await prisma.payment.findMany({
    where: {
      ...whereClause,
      retentionUrls: { not: null },
    },
    include: {
      issuedByTenant: { select: { name: true } },
      receivedByTenant: { select: { name: true } },
      items: {
        include: {
          document: { select: { number: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options.summaryOnly ? 1000 : options.limit,
  });

  // 3. Analizar retenciones
  let totalIIBB = 0;
  let totalGanancias = 0;
  let totalSUSS = 0;
  let countIIBB = 0;
  let countGanancias = 0;
  let countSUSS = 0;
  let totalRetencionesCount = 0;

  for (const payment of payments) {
    let retenciones: Retencion[] = [];

    try {
      // El campo puede ser string JSON o array directo
      if (typeof payment.retentionUrls === 'string') {
        retenciones = JSON.parse(payment.retentionUrls);
      } else if (Array.isArray(payment.retentionUrls)) {
        retenciones = payment.retentionUrls as unknown as Retencion[];
      }
    } catch (e) {
      // Si no es JSON válido, puede ser URLs de archivos
      continue;
    }

    if (!Array.isArray(retenciones)) continue;

    totalRetencionesCount += retenciones.length;

    for (const ret of retenciones) {
      if (ret.tipo === 'IIBB') {
        totalIIBB += ret.monto;
        countIIBB++;
      } else if (ret.tipo === 'GANANCIAS') {
        totalGanancias += ret.monto;
        countGanancias++;
      } else if (ret.tipo === 'SUSS') {
        totalSUSS += ret.monto;
        countSUSS++;
      }
    }
  }

  console.log('📈 RESUMEN DE RETENCIONES:');
  console.log(`   Total de retenciones registradas: ${totalRetencionesCount}`);
  console.log('');
  console.log(`   IIBB (Ingresos Brutos):`);
  console.log(`     - Cantidad: ${countIIBB}`);
  console.log(`     - Total: ARS ${totalIIBB.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log('');
  console.log(`   GANANCIAS:`);
  console.log(`     - Cantidad: ${countGanancias}`);
  console.log(`     - Total: ARS ${totalGanancias.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log('');
  console.log(`   SUSS:`);
  console.log(`     - Cantidad: ${countSUSS}`);
  console.log(`     - Total: ARS ${totalSUSS.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log('');
  console.log(`   TOTAL RETENIDO: ARS ${(totalIIBB + totalGanancias + totalSUSS).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log('');

  // 4. Mostrar detalle si no es solo resumen
  if (!options.summaryOnly && payments.length > 0) {
    console.log('----------------------------------------');
    console.log(`📋 DETALLE DE ÚLTIMOS ${Math.min(options.limit, payments.length)} PAGOS:`);
    console.log('----------------------------------------\n');

    for (const payment of payments.slice(0, options.limit)) {
      let retenciones: Retencion[] = [];

      try {
        if (typeof payment.retentionUrls === 'string') {
          retenciones = JSON.parse(payment.retentionUrls);
        } else if (Array.isArray(payment.retentionUrls)) {
          retenciones = payment.retentionUrls as unknown as Retencion[];
        }
      } catch (e) {
        continue;
      }

      if (!Array.isArray(retenciones)) continue;

      console.log(`📄 Pago: ${payment.number}`);
      console.log(`   Fecha: ${payment.issueDate?.toLocaleDateString('es-AR') || '-'}`);
      console.log(`   Pagador: ${payment.issuedByTenant?.name || '-'}`);
      console.log(`   Beneficiario: ${payment.receivedByTenant?.name || '-'}`);
      console.log(`   Monto Neto: ${payment.currency} ${Number(payment.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

      if (payment.items.length > 0) {
        console.log(`   Documentos:`);
        for (const item of payment.items) {
          console.log(`     - ${item.document?.number || 'N/A'} (${item.document?.type || '-'})`);
        }
      }

      console.log(`   Retenciones:`);
      for (const ret of retenciones) {
        console.log(`     - ${ret.nombre || ret.tipo}: ${payment.currency} ${ret.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${(ret.porcentaje * 100).toFixed(1)}%)`);
      }
      console.log('');
    }
  }

  console.log('========================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
