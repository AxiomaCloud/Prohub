const { Client } = require('pg');

async function desasociarUsuarios() {
  const client = new Client({
    host: '149.50.148.198',
    port: 5432,
    user: 'postgres',
    password: 'Q27G4B98',
    database: 'hub_db'
  });

  await client.connect();

  console.log('=== DESASOCIANDO USUARIOS DE PROVEEDORES ===\n');

  // Ver cuántos tienen usuario asociado
  const antes = await client.query(`
    SELECT COUNT(*) as total, COUNT("userId") as con_usuario
    FROM suppliers
  `);
  console.log(`Antes: ${antes.rows[0].con_usuario} proveedores con usuario de ${antes.rows[0].total} totales`);

  // Listar los que tienen usuario
  const conUsuario = await client.query(`
    SELECT s.id, s.nombre, s.cuit, u.email as usuario_email
    FROM suppliers s
    LEFT JOIN "User" u ON s."userId" = u.id
    WHERE s."userId" IS NOT NULL
  `);

  if (conUsuario.rows.length > 0) {
    console.log('\nProveedores con usuario asociado:');
    conUsuario.rows.forEach(s => {
      console.log(`  - ${s.nombre} (${s.cuit}) -> ${s.usuario_email || 'N/A'}`);
    });
  }

  // Desasociar todos
  const result = await client.query(`
    UPDATE suppliers
    SET "userId" = NULL
    WHERE "userId" IS NOT NULL
  `);

  console.log(`\n✅ Desasociados: ${result.rowCount} proveedores`);

  // Verificar
  const despues = await client.query(`
    SELECT COUNT(*) as total, COUNT("userId") as con_usuario
    FROM suppliers
  `);
  console.log(`Después: ${despues.rows[0].con_usuario} proveedores con usuario de ${despues.rows[0].total} totales`);

  await client.end();
  console.log('\n=== PROCESO COMPLETADO ===');
}

desasociarUsuarios().catch(console.error);
