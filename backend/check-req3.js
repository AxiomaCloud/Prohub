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

  const reqId = 'cminlnf930001lcpkhi5q5zwm';
  console.log('=== BUSCANDO REQ-2025-00003 ===');

  // Buscar en purchase_order_circuits (tabla nueva)
  const oc = await client.query(`
    SELECT * FROM purchase_order_circuits
    WHERE "purchaseRequestId" = $1
  `, [reqId]);
  console.log('\n=== ORDEN DE COMPRA (circuits) ===');
  if (oc.rows.length > 0) {
    console.log('id:', oc.rows[0].id);
    console.log('numero:', oc.rows[0].numero);
    console.log('estado:', oc.rows[0].estado);
    const ocId = oc.rows[0].id;

    // Items de la OC
    const ocItems = await client.query(`
      SELECT id, descripcion, cantidad, "cantidadRecibida"
      FROM purchase_order_items
      WHERE "purchaseOrderId" = $1
    `, [ocId]);
    console.log('\n=== ITEMS DE LA OC ===');
    ocItems.rows.forEach(i => console.log('cantidad:', i.cantidad, 'recibida:', i.cantidadRecibida, '-', (i.descripcion || '').substring(0, 50)));

    // Recepciones
    const recepciones = await client.query(`
      SELECT * FROM receptions
      WHERE "purchaseOrderId" = $1
    `, [ocId]);
    console.log('\n=== RECEPCIONES ===');
    recepciones.rows.forEach(r => {
      console.log('id:', r.id);
      console.log('numero:', r.numero);
      console.log('tipoRecepcion:', r.tipoRecepcion);
      console.log('fechaRecepcion:', r.fechaRecepcion);
    });

    if (recepciones.rows.length > 0) {
      for (const rec of recepciones.rows) {
        const recItems = await client.query(`
          SELECT * FROM reception_items
          WHERE "receptionId" = $1
        `, [rec.id]);
        console.log('\n=== ITEMS RECEPCION', rec.numero, '===');
        recItems.rows.forEach(i => console.log('esperada:', i.cantidadEsperada, 'recibida:', i.cantidadRecibida));
      }
    }
  } else {
    console.log('No se encontró OC en purchase_order_circuits');
  }

  await client.end();
}

check().catch(console.error);
