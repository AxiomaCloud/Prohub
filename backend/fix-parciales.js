const { Client } = require('pg');

async function fix() {
  const client = new Client({
    host: '149.50.148.198',
    port: 5432,
    user: 'postgres',
    password: 'Q27G4B98',
    database: 'hub_db'
  });

  await client.connect();

  // Buscar OCs que tienen todos sus items recibidos pero están en PARCIALMENTE_RECIBIDA
  const ocs = await client.query(`
    SELECT poc.id, poc.numero, poc."purchaseRequestId"
    FROM purchase_order_circuits poc
    WHERE poc.estado = 'PARCIALMENTE_RECIBIDA'
  `);

  console.log('=== ANALIZANDO OCs PARCIALMENTE RECIBIDAS ===\n');

  for (const oc of ocs.rows) {
    // Verificar items
    const items = await client.query(`
      SELECT cantidad, "cantidadRecibida"
      FROM purchase_order_items
      WHERE "purchaseOrderId" = $1
    `, [oc.id]);

    const todosRecibidos = items.rows.every(i => Number(i.cantidadRecibida) >= Number(i.cantidad));

    if (todosRecibidos) {
      console.log(`${oc.numero}: TODOS RECIBIDOS - Corrigiendo a FINALIZADA...`);

      // Actualizar OC a FINALIZADA
      await client.query(`
        UPDATE purchase_order_circuits
        SET estado = 'FINALIZADA'
        WHERE id = $1
      `, [oc.id]);

      // Actualizar tipo de recepción a TOTAL
      await client.query(`
        UPDATE receptions
        SET "tipoRecepcion" = 'TOTAL'
        WHERE "purchaseOrderId" = $1
      `, [oc.id]);

      // Actualizar requerimiento a RECIBIDO
      await client.query(`
        UPDATE "PurchaseRequest"
        SET estado = 'RECIBIDO'
        WHERE id = $1
      `, [oc.purchaseRequestId]);

      console.log(`  OC ${oc.numero} actualizada a FINALIZADA`);
      console.log(`  Recepción actualizada a TOTAL`);
      console.log(`  Requerimiento actualizado a RECIBIDO`);
    } else {
      console.log(`${oc.numero}: Parcial correcto - no se modifica`);
    }
  }

  console.log('\n=== VERIFICACIÓN FINAL ===');

  // Verificar cambios
  const verify = await client.query(`
    SELECT poc.numero as oc_numero, poc.estado as oc_estado,
           pr.numero as req_numero, pr.estado as req_estado
    FROM purchase_order_circuits poc
    LEFT JOIN "PurchaseRequest" pr ON pr.id = poc."purchaseRequestId"
    WHERE poc.numero IN ('OC-2025-00001', 'OC-2025-00007')
    ORDER BY poc.numero
  `);

  verify.rows.forEach(r => {
    console.log(`${r.oc_numero} -> ${r.oc_estado} | ${r.req_numero} -> ${r.req_estado}`);
  });

  await client.end();
  console.log('\nListo!');
}

fix().catch(console.error);
