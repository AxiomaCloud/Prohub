/**
 * Script para simular pagos de facturas
 *
 * Este script:
 * 1. Toma todas las facturas APPROVED que no tienen pago asociado
 * 2. Genera pagos con retenciones simuladas (IIBB, Ganancias)
 * 3. Marca las facturas como PAID
 *
 * Uso: DATABASE_URL="postgresql://..." npx ts-node scripts/simulate-payments.ts
 *
 * Opciones:
 *   --tenant=ID          Solo procesar facturas de un tenant específico
 *   --dry-run            Solo mostrar qué se haría, sin ejecutar
 *   --max=N              Procesar máximo N facturas
 *   --include-presented  Incluir también facturas en estado PRESENTED
 *   --all-status         Procesar facturas en cualquier estado (excepto PAID y REJECTED)
 */

import { PrismaClient, PaymentStatus, DocumentStatus, DocumentType } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración de retenciones
const RETENCIONES = {
  IIBB: {
    nombre: 'Ingresos Brutos',
    porcentaje: 0.03, // 3%
  },
  GANANCIAS: {
    nombre: 'Ganancias',
    porcentaje: 0.02, // 2%
  },
  SUSS: {
    nombre: 'SUSS',
    porcentaje: 0.01, // 1%
  },
};

interface PaymentData {
  documentId: string;
  documentNumber: string;
  providerTenantId: string;
  providerName: string;
  clientTenantId: string;
  clientName: string;
  totalAmount: number;
  currency: string;
  retenciones: {
    tipo: string;
    nombre: string;
    monto: number;
    porcentaje: number;
  }[];
  netoAPagar: number;
}

async function generatePaymentNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;

  const lastPayment = await prisma.payment.findFirst({
    where: {
      issuedByTenantId: tenantId,
      number: { startsWith: prefix },
    },
    orderBy: { number: 'desc' },
  });

  let nextNumber = 1;
  if (lastPayment) {
    const match = lastPayment.number.match(new RegExp(`${prefix}(\\d+)`));
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

function calculateRetenciones(totalAmount: number): PaymentData['retenciones'] {
  // Simular que algunos pagos tienen diferentes retenciones
  const random = Math.random();

  const retenciones: PaymentData['retenciones'] = [];

  // IIBB siempre se aplica
  retenciones.push({
    tipo: 'IIBB',
    nombre: RETENCIONES.IIBB.nombre,
    porcentaje: RETENCIONES.IIBB.porcentaje,
    monto: Number((totalAmount * RETENCIONES.IIBB.porcentaje).toFixed(2)),
  });

  // Ganancias se aplica en 70% de los casos
  if (random > 0.3) {
    retenciones.push({
      tipo: 'GANANCIAS',
      nombre: RETENCIONES.GANANCIAS.nombre,
      porcentaje: RETENCIONES.GANANCIAS.porcentaje,
      monto: Number((totalAmount * RETENCIONES.GANANCIAS.porcentaje).toFixed(2)),
    });
  }

  // SUSS se aplica en 30% de los casos
  if (random > 0.7) {
    retenciones.push({
      tipo: 'SUSS',
      nombre: RETENCIONES.SUSS.nombre,
      porcentaje: RETENCIONES.SUSS.porcentaje,
      monto: Number((totalAmount * RETENCIONES.SUSS.porcentaje).toFixed(2)),
    });
  }

  return retenciones;
}

async function getInvoices(options: {
  tenantId?: string;
  maxCount?: number;
  includePresented?: boolean;
  allStatus?: boolean;
}): Promise<any[]> {
  const { tenantId, maxCount, includePresented, allStatus } = options;

  // Determinar qué estados incluir
  let statusFilter: any;
  if (allStatus) {
    // Todos los estados excepto PAID y REJECTED
    statusFilter = {
      in: [
        DocumentStatus.PROCESSING,
        DocumentStatus.PRESENTED,
        DocumentStatus.IN_REVIEW,
        DocumentStatus.APPROVED,
      ],
    };
  } else if (includePresented) {
    statusFilter = {
      in: [DocumentStatus.APPROVED, DocumentStatus.PRESENTED],
    };
  } else {
    statusFilter = DocumentStatus.APPROVED;
  }

  const whereClause: any = {
    status: statusFilter,
    type: DocumentType.INVOICE,
    totalAmount: { gt: 0 }, // Solo facturas con monto > 0
  };

  if (tenantId) {
    whereClause.clientTenantId = tenantId;
  }

  const invoices = await prisma.document.findMany({
    where: whereClause,
    include: {
      providerTenant: true,
      clientTenant: true,
      paymentItems: true,
    },
    take: maxCount,
    orderBy: { uploadedAt: 'asc' },
  });

  // Filtrar las que ya tienen pago asociado
  return invoices.filter(inv => inv.paymentItems.length === 0);
}

async function simulatePayments(options: {
  tenantId?: string;
  dryRun?: boolean;
  maxCount?: number;
  includePresented?: boolean;
  allStatus?: boolean;
}) {
  const { tenantId, dryRun, maxCount, includePresented, allStatus } = options;

  console.log('\n========================================');
  console.log('   SIMULADOR DE PAGOS DE FACTURAS');
  console.log('========================================\n');

  if (dryRun) {
    console.log('🔍 MODO DRY-RUN: No se realizarán cambios\n');
  }

  // Mostrar filtros activos
  if (allStatus) {
    console.log('📌 Filtro: Todos los estados (excepto PAID y REJECTED)');
  } else if (includePresented) {
    console.log('📌 Filtro: APPROVED y PRESENTED');
  } else {
    console.log('📌 Filtro: Solo APPROVED');
  }
  console.log('');

  // 1. Obtener facturas sin pago
  console.log('📋 Buscando facturas sin pago...\n');
  const invoices = await getInvoices({ tenantId, maxCount, includePresented, allStatus });

  if (invoices.length === 0) {
    console.log('✅ No hay facturas pendientes de pago.\n');
    return;
  }

  console.log(`📄 Encontradas ${invoices.length} facturas para procesar:\n`);

  // 2. Preparar datos de pagos
  const paymentDataList: PaymentData[] = [];

  for (const invoice of invoices) {
    const totalAmount = Number(invoice.totalAmount);
    const retenciones = calculateRetenciones(totalAmount);
    const totalRetenciones = retenciones.reduce((sum, r) => sum + r.monto, 0);
    const netoAPagar = totalAmount - totalRetenciones;

    paymentDataList.push({
      documentId: invoice.id,
      documentNumber: invoice.number,
      providerTenantId: invoice.providerTenantId,
      providerName: invoice.providerTenant.name,
      clientTenantId: invoice.clientTenantId,
      clientName: invoice.clientTenant.name,
      totalAmount,
      currency: invoice.currency,
      retenciones,
      netoAPagar,
    });

    // Mostrar detalle
    console.log(`  📃 ${invoice.number}`);
    console.log(`     Proveedor: ${invoice.providerTenant.name}`);
    console.log(`     Cliente: ${invoice.clientTenant.name}`);
    console.log(`     Total Factura: ${invoice.currency} ${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log(`     Retenciones:`);
    for (const ret of retenciones) {
      console.log(`       - ${ret.nombre} (${(ret.porcentaje * 100).toFixed(1)}%): ${invoice.currency} ${ret.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    }
    console.log(`     Neto a Pagar: ${invoice.currency} ${netoAPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
    console.log('');
  }

  // 3. Resumen
  const totalFacturado = paymentDataList.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalRetenciones = paymentDataList.reduce((sum, p) =>
    sum + p.retenciones.reduce((s, r) => s + r.monto, 0), 0);
  const totalNeto = paymentDataList.reduce((sum, p) => sum + p.netoAPagar, 0);

  console.log('----------------------------------------');
  console.log('RESUMEN:');
  console.log(`  Total Facturas: ${paymentDataList.length}`);
  console.log(`  Total Facturado: ARS ${totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log(`  Total Retenciones: ARS ${totalRetenciones.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log(`  Total Neto a Pagar: ARS ${totalNeto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
  console.log('----------------------------------------\n');

  if (dryRun) {
    console.log('🔍 Modo dry-run: No se crearon pagos.\n');
    return;
  }

  // 4. Crear los pagos
  console.log('💳 Creando pagos...\n');

  let created = 0;
  for (const data of paymentDataList) {
    try {
      const paymentNumber = await generatePaymentNumber(data.clientTenantId);
      const now = new Date();

      // Fecha de pago: entre hoy y hace 30 días (para simular historial)
      const daysAgo = Math.floor(Math.random() * 30);
      const paidAt = new Date(now);
      paidAt.setDate(paidAt.getDate() - daysAgo);

      await prisma.$transaction(async (tx) => {
        // Crear el pago
        const payment = await tx.payment.create({
          data: {
            number: paymentNumber,
            amount: data.netoAPagar,
            currency: data.currency,
            status: PaymentStatus.PAID,
            issuedByTenantId: data.clientTenantId,
            receivedByTenantId: data.providerTenantId,
            issueDate: paidAt,
            paidAt: paidAt,
            retentionUrls: JSON.stringify(data.retenciones),
            items: {
              create: {
                documentId: data.documentId,
                amount: data.totalAmount,
              },
            },
          },
        });

        // Actualizar el estado del documento a PAID
        await tx.document.update({
          where: { id: data.documentId },
          data: { status: DocumentStatus.PAID },
        });

        console.log(`  ✅ ${paymentNumber} - ${data.documentNumber} -> ${data.providerName}`);
        console.log(`     Monto: ${data.currency} ${data.netoAPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);
        console.log(`     Pagado: ${paidAt.toLocaleDateString('es-AR')}`);
      });

      created++;
    } catch (error) {
      console.error(`  ❌ Error al crear pago para ${data.documentNumber}:`, error);
    }
  }

  console.log('\n========================================');
  console.log(`✅ Proceso completado: ${created}/${paymentDataList.length} pagos creados`);
  console.log('========================================\n');
}

// Parsear argumentos
function parseArgs(): {
  tenantId?: string;
  dryRun: boolean;
  maxCount?: number;
  includePresented: boolean;
  allStatus: boolean;
} {
  const args = process.argv.slice(2);
  const options: {
    tenantId?: string;
    dryRun: boolean;
    maxCount?: number;
    includePresented: boolean;
    allStatus: boolean;
  } = {
    dryRun: false,
    includePresented: false,
    allStatus: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--tenant=')) {
      options.tenantId = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--max=')) {
      options.maxCount = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--include-presented') {
      options.includePresented = true;
    } else if (arg === '--all-status') {
      options.allStatus = true;
    }
  }

  return options;
}

async function main() {
  try {
    const options = parseArgs();
    await simulatePayments(options);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
