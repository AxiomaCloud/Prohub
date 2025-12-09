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

  // Hacer la misma consulta que hace Prisma
  const suppliers = await client.query(`
    SELECT * FROM suppliers LIMIT 1
  `);
  console.log('=== SUPPLIERS (primero) ===');
  if (suppliers.rows[0]) {
    console.log(Object.keys(suppliers.rows[0]));
  } else {
    console.log('No hay suppliers');
  }

  // Ver las columnas
  const cols = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'suppliers'
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log('\n=== TODAS LAS COLUMNAS ===');
  cols.rows.forEach(r => console.log(r.column_name));

  await client.end();
}

check().catch(console.error);
