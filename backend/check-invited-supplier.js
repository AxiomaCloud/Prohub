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

  // Buscar proveedores con estado INVITED o PENDING_COMPLETION
  const suppliers = await client.query(`
    SELECT id, nombre, cuit, email, status, "createdAt"
    FROM suppliers
    WHERE status IN ('INVITED', 'PENDING_COMPLETION')
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);

  console.log('=== PROVEEDORES EN ONBOARDING ===\n');
  suppliers.rows.forEach(s => {
    console.log(`ID: ${s.id}`);
    console.log(`Nombre: ${s.nombre || '(vacío)'}`);
    console.log(`CUIT: ${s.cuit || '(vacío)'}`);
    console.log(`Email: ${s.email || '(vacío)'}`);
    console.log(`Status: ${s.status}`);
    console.log('---');
  });

  await client.end();
}

check().catch(console.error);
