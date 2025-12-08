const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: '149.50.148.198',
    port: 5432,
    user: 'postgres',
    password: 'Q27G4B98',
    database: 'hub_db'
  });

  await client.connect();

  // Buscar todas las OCs con PARCIALMENTE_RECIBIDA
  const ocs = await client.query(`
    SELECT poc.id, poc.numero, poc.estado, pr.numero as req_numero
    FROM purchase_order_circuits poc
    LEFT JOIN "PurchaseRequest" pr ON pr.id = poc."purchaseRequestId"
    WHERE poc.estado = 'PARCIALMENTE_RECIBIDA'
  `);

  console.log('=== OCs PARCIALMENTE RECIBIDAS ===\n');

  for (const oc of ocs.rows) {
    console.log(`\n========== ${oc.numero} (${oc.req_numero}) ==========`);

    // Items de la OC
    const items = await client.query(`
      SELECT id, descripcion, cantidad, "cantidadRecibida"
      FROM purchase_order_items
      WHERE "purchaseOrderId" = $1
    `, [oc.id]);

    console.log('\nItems de la OC:');
    let todosRecibidos = true;
    let algunoRecibido = false;

    for (const item of items.rows) {
      const cant = Number(item.cantidad);
      const rec = Number(item.cantidadRecibida);
      const status = rec >= cant ? 'COMPLETO' : (rec > 0 ? 'PARCIAL' : 'PENDIENTE');
      console.log(`  - ${(item.descripcion || '').substring(0, 40)}: ${rec}/${cant} [${status}]`);

      if (rec >= cant) {
        algunoRecibido = true;
      } else if (rec > 0) {
        algunoRecibido = true;
        todosRecibidos = false;
      } else {
        todosRecibidos = false;
      }
    }

    if (todosRecibidos && algunoRecibido) {
      console.log('\n  >>> TODOS LOS ITEMS RECIBIDOS - DEBERÍA SER FINALIZADA <<<');
    }

    // Recepciones
    const recs = await client.query(`
      SELECT numero, "tipoRecepcion" FROM receptions WHERE "purchaseOrderId" = $1
    `, [oc.id]);
    console.log('\nRecepciones:', recs.rows.length > 0 ? '' : 'Ninguna');
    recs.rows.forEach(r => console.log(`  - ${r.numero}: ${r.tipoRecepcion}`));
  }

  await client.end();
}

check().catch(console.error);
