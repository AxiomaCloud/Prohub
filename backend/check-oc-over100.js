const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOCOver100() {
  console.log('=== BUSCANDO OCs CON RECEPCION > 100% ===\n');

  // Obtener todas las OCs con sus items
  const ocs = await prisma.purchaseOrderCircuit.findMany({
    include: {
      items: true,
      proveedor: { select: { nombre: true } }
    }
  });

  for (const oc of ocs) {
    let totalSolicitado = 0;
    let totalRecibido = 0;
    const problemItems = [];

    for (const item of oc.items) {
      const cantidad = Number(item.cantidad || 0);
      const cantidadRecibida = Number(item.cantidadRecibida || 0);

      totalSolicitado += cantidad;
      totalRecibido += cantidadRecibida;

      if (cantidadRecibida > cantidad) {
        problemItems.push({
          descripcion: item.descripcion,
          cantidad,
          cantidadRecibida,
          exceso: cantidadRecibida - cantidad
        });
      }
    }

    const porcentaje = totalSolicitado > 0 ? (totalRecibido / totalSolicitado) * 100 : 0;

    if (porcentaje > 100 || problemItems.length > 0) {
      console.log(`OC: ${oc.numero}`);
      console.log(`  Proveedor: ${oc.supplier?.nombre || 'N/A'}`);
      console.log(`  Total Solicitado: ${totalSolicitado}`);
      console.log(`  Total Recibido: ${totalRecibido}`);
      console.log(`  Porcentaje: ${porcentaje.toFixed(1)}%`);

      if (problemItems.length > 0) {
        console.log('  Items con exceso:');
        problemItems.forEach(item => {
          console.log(`    - ${item.descripcion}: solicitado=${item.cantidad}, recibido=${item.cantidadRecibida}, exceso=${item.exceso}`);
        });
      }
      console.log('');
    }
  }

  console.log('=== FIN ===');
}

checkOCOver100()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
