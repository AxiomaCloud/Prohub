const { Client } = require('pg');

async function checkUsers() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'Q27G4B98',
    database: 'hub_db'
  });

  try {
    await client.connect();

    const { rows } = await client.query(`
      SELECT
        u.id,
        u.email,
        u.name,
        tm."tenantId",
        tm.roles,
        tm."supplierId",
        t.name as tenant_name
      FROM "User" u
      LEFT JOIN "TenantMembership" tm ON u.id = tm."userId"
      LEFT JOIN "Tenant" t ON tm."tenantId" = t.id
      ORDER BY u.email
    `);

    console.log('=== USUARIOS Y SUS MEMBRESÍAS ===');
    rows.forEach(r => {
      const esProveedor = r.supplierId ? 'SI (PROVEEDOR)' : 'NO (INTERNO)';
      console.log(`${r.email} | ${r.name} | Tenant: ${r.tenant_name || 'N/A'} | Roles: ${r.roles || 'N/A'} | Proveedor: ${esProveedor}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUsers();
