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

  // Buscar todos los requerimientos con estado que contenga "parcial" o problemas
  const reqs = await client.query(`
    SELECT pr.numero, pr.titulo, pr.estado,
           poc.numero as oc_numero, poc.estado as oc_estado
    FROM "PurchaseRequest" pr
    LEFT JOIN purchase_order_circuits poc ON poc."purchaseRequestId" = pr.id
    ORDER BY pr.numero
  `);

  console.log('=== TODOS LOS REQUERIMIENTOS ===');
  reqs.rows.forEach(r => {
    console.log(`${r.numero} | REQ: ${r.estado} | OC: ${r.oc_numero || 'N/A'} - ${r.oc_estado || 'N/A'}`);
  });

  // Buscar OCs con estado PARCIALMENTE_RECIBIDA
  console.log('\n=== OCs PARCIALMENTE RECIBIDAS ===');
  const ocsParciales = await client.query(`
    SELECT poc.numero, poc.estado, pr.numero as req_numero
    FROM purchase_order_circuits poc
    LEFT JOIN "PurchaseRequest" pr ON pr.id = poc."purchaseRequestId"
    WHERE poc.estado = 'PARCIALMENTE_RECIBIDA'
  `);
  ocsParciales.rows.forEach(o => console.log(o));

  await client.end();
}

check().catch(console.error);
