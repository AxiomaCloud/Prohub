import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // ============================================
  // 1. CREAR TENANTS (Empresas)
  // ============================================
  console.log('📦 Creando tenants...');

  const tenantCliente = await prisma.tenant.upsert({
    where: { taxId: '30-12345678-9' },
    update: {},
    create: {
      name: 'UDESA',
      legalName: 'Universidad de San Andrés S.A.',
      taxId: '30-12345678-9',
      country: 'Argentina',
      address: 'Vito Dumas 284, Victoria, Buenos Aires',
      phone: '+54 11 4725-7000',
      email: 'compras@udesa.edu.ar',
      website: 'https://udesa.edu.ar',
      settings: {
        currency: 'ARS',
        approvalLevels: [
          { maxAmount: 100000, roles: ['CLIENT_APPROVER'] },
          { maxAmount: 500000, roles: ['CLIENT_ADMIN'] },
          { maxAmount: null, roles: ['CLIENT_ADMIN', 'SUPER_ADMIN'] },
        ],
      },
      isActive: true,
    },
  });

  const tenantProveedor = await prisma.tenant.upsert({
    where: { taxId: '30-98765432-1' },
    update: {},
    create: {
      name: 'TechSupply Argentina',
      legalName: 'TechSupply Argentina S.R.L.',
      taxId: '30-98765432-1',
      country: 'Argentina',
      address: 'Av. Corrientes 1234, CABA',
      phone: '+54 11 5555-1234',
      email: 'ventas@techsupply.com.ar',
      website: 'https://techsupply.com.ar',
      settings: {
        currency: 'ARS',
      },
      isActive: true,
    },
  });

  const tenantProveedor2 = await prisma.tenant.upsert({
    where: { taxId: '30-11111111-1' },
    update: {},
    create: {
      name: 'Librería del Sur',
      legalName: 'Librería del Sur S.A.',
      taxId: '30-11111111-1',
      country: 'Argentina',
      address: 'Av. Santa Fe 5678, CABA',
      phone: '+54 11 4444-5678',
      email: 'contacto@libreriadelsur.com.ar',
      isActive: true,
    },
  });

  console.log(`   ✅ Tenant cliente: ${tenantCliente.name}`);
  console.log(`   ✅ Tenant proveedor: ${tenantProveedor.name}`);
  console.log(`   ✅ Tenant proveedor 2: ${tenantProveedor2.name}`);

  // ============================================
  // 2. CREAR USUARIOS
  // ============================================
  console.log('\n👤 Creando usuarios...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // Usuario Admin/Superuser
  const userAdmin = await prisma.user.upsert({
    where: { email: 'admin@axioma.com' },
    update: {},
    create: {
      email: 'admin@axioma.com',
      passwordHash,
      name: 'Admin Sistema',
      phone: '+54 11 9999-0000',
      emailVerified: true,
      superuser: true,
    },
  });

  // Usuario Solicitante (Juan Pérez)
  const userSolicitante = await prisma.user.upsert({
    where: { email: 'juan.perez@udesa.edu.ar' },
    update: {},
    create: {
      email: 'juan.perez@udesa.edu.ar',
      passwordHash,
      name: 'Juan Pérez',
      phone: '+54 11 1234-5678',
      emailVerified: true,
      superuser: false,
    },
  });

  // Usuario Aprobador (María García)
  const userAprobador = await prisma.user.upsert({
    where: { email: 'maria.garcia@udesa.edu.ar' },
    update: {},
    create: {
      email: 'maria.garcia@udesa.edu.ar',
      passwordHash,
      name: 'María García',
      phone: '+54 11 2345-6789',
      emailVerified: true,
      superuser: false,
    },
  });

  // Usuario Proveedor
  const userProveedor = await prisma.user.upsert({
    where: { email: 'ventas@techsupply.com.ar' },
    update: {},
    create: {
      email: 'ventas@techsupply.com.ar',
      passwordHash,
      name: 'Carlos López',
      phone: '+54 11 5555-9999',
      emailVerified: true,
      superuser: false,
    },
  });

  console.log(`   ✅ Admin: ${userAdmin.email}`);
  console.log(`   ✅ Solicitante: ${userSolicitante.email}`);
  console.log(`   ✅ Aprobador: ${userAprobador.email}`);
  console.log(`   ✅ Proveedor: ${userProveedor.email}`);

  // ============================================
  // 3. CREAR MEMBRESÍAS (Usuario <-> Tenant)
  // ============================================
  console.log('\n🔗 Creando membresías...');

  // Admin es SUPER_ADMIN en el cliente
  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: userAdmin.id,
        tenantId: tenantCliente.id,
      },
    },
    update: {},
    create: {
      userId: userAdmin.id,
      tenantId: tenantCliente.id,
      roles: [Role.SUPER_ADMIN, Role.CLIENT_ADMIN],
      isActive: true,
      joinedAt: new Date(),
    },
  });

  // Juan Pérez es CLIENT_VIEWER en el cliente (solicitante)
  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: userSolicitante.id,
        tenantId: tenantCliente.id,
      },
    },
    update: {},
    create: {
      userId: userSolicitante.id,
      tenantId: tenantCliente.id,
      roles: [Role.CLIENT_VIEWER],
      isActive: true,
      joinedAt: new Date(),
    },
  });

  // María García es CLIENT_APPROVER en el cliente
  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: userAprobador.id,
        tenantId: tenantCliente.id,
      },
    },
    update: {},
    create: {
      userId: userAprobador.id,
      tenantId: tenantCliente.id,
      roles: [Role.CLIENT_APPROVER, Role.CLIENT_ADMIN],
      isActive: true,
      joinedAt: new Date(),
    },
  });

  // Carlos López es PROVIDER en TechSupply
  await prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: {
        userId: userProveedor.id,
        tenantId: tenantProveedor.id,
      },
    },
    update: {},
    create: {
      userId: userProveedor.id,
      tenantId: tenantProveedor.id,
      roles: [Role.PROVIDER],
      isActive: true,
      joinedAt: new Date(),
    },
  });

  console.log('   ✅ Membresías creadas');

  // ============================================
  // 4. CREAR MENÚ ITEMS
  // ============================================
  console.log('\n📋 Creando menú...');

  // Crear menu items principales
  const menuItemsData = [
    {
      id: 'menu-dashboard',
      title: 'Dashboard',
      icon: 'Home',
      url: '/dashboard',
      orderIndex: 1,
    },
    {
      id: 'menu-documentos',
      title: 'Documentos',
      icon: 'FileText',
      url: '/documentos',
      orderIndex: 2,
    },
    {
      id: 'menu-compras',
      title: 'Compras',
      icon: 'ShoppingCart',
      url: null, // Sin URL directa, tiene hijos
      orderIndex: 3,
    },
    {
      id: 'menu-pagos',
      title: 'Pagos',
      icon: 'CreditCard',
      url: '/pagos',
      orderIndex: 4,
    },
    {
      id: 'menu-reportes',
      title: 'Reportes',
      icon: 'BarChart3',
      url: '/reportes',
      orderIndex: 5,
    },
    {
      id: 'menu-configuracion',
      title: 'Configuracion',
      icon: 'Settings',
      url: '/admin',
      orderIndex: 6,
      superuserOnly: true,
    },
  ];

  // Crear items principales
  for (const item of menuItemsData) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        icon: item.icon,
        url: item.url,
        orderIndex: item.orderIndex,
        superuserOnly: item.superuserOnly || false,
        isActive: true,
      },
      create: {
        id: item.id,
        title: item.title,
        icon: item.icon,
        url: item.url,
        orderIndex: item.orderIndex,
        superuserOnly: item.superuserOnly || false,
        isActive: true,
      },
    });
  }

  // Crear submenus de Compras
  const comprasSubmenus = [
    {
      id: 'menu-compras-circuito',
      title: 'Circuito',
      icon: 'LayoutDashboard',
      url: '/compras',
      description: 'Vista Kanban del circuito',
      orderIndex: 1,
    },
    {
      id: 'menu-compras-requerimientos',
      title: 'Requerimientos',
      icon: 'ClipboardList',
      url: '/compras/requerimientos',
      description: 'Solicitudes de compra',
      orderIndex: 2,
    },
    {
      id: 'menu-compras-aprobaciones',
      title: 'Aprobaciones',
      icon: 'CheckCircle',
      url: '/compras/aprobaciones',
      description: 'Aprobar requerimientos',
      orderIndex: 3,
    },
    {
      id: 'menu-compras-ordenes',
      title: 'Ordenes de Compra',
      icon: 'FileCheck',
      url: '/compras/ordenes-compra',
      description: 'OCs emitidas',
      orderIndex: 4,
    },
    {
      id: 'menu-compras-recepciones',
      title: 'Recepciones',
      icon: 'PackageCheck',
      url: '/compras/recepciones',
      description: 'Confirmar entregas',
      orderIndex: 5,
    },
  ];

  for (const submenu of comprasSubmenus) {
    await prisma.menuItem.upsert({
      where: { id: submenu.id },
      update: {
        title: submenu.title,
        icon: submenu.icon,
        url: submenu.url,
        description: submenu.description,
        orderIndex: submenu.orderIndex,
        parentId: 'menu-compras',
        isActive: true,
      },
      create: {
        id: submenu.id,
        title: submenu.title,
        icon: submenu.icon,
        url: submenu.url,
        description: submenu.description,
        orderIndex: submenu.orderIndex,
        parentId: 'menu-compras',
        isActive: true,
      },
    });
  }

  console.log('   Menu principal y submenus de Compras creados');

  // ============================================
  // 5. CREAR ORDEN DE COMPRA DE EJEMPLO
  // ============================================
  console.log('\n📦 Creando órdenes de compra de ejemplo...');

  const purchaseOrder = await prisma.purchaseOrder.upsert({
    where: {
      number_clientTenantId: {
        number: 'OC-2025-00001',
        clientTenantId: tenantCliente.id,
      },
    },
    update: {},
    create: {
      number: 'OC-2025-00001',
      description: 'Notebooks Dell XPS para equipo de desarrollo',
      amount: 2400000,
      currency: 'ARS',
      status: 'ACTIVE',
      clientTenantId: tenantCliente.id,
      date: new Date('2025-11-22'),
      dueDate: new Date('2025-12-15'),
    },
  });

  console.log(`   ✅ OC: ${purchaseOrder.number}`);

  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed completado exitosamente!\n');
  console.log('📝 Usuarios creados (contraseña: 123456):');
  console.log('   - admin@axioma.com (Superusuario)');
  console.log('   - juan.perez@udesa.edu.ar (Solicitante)');
  console.log('   - maria.garcia@udesa.edu.ar (Aprobador)');
  console.log('   - ventas@techsupply.com.ar (Proveedor)');
  console.log('\n📦 Tenants:');
  console.log('   - UDESA (Cliente)');
  console.log('   - TechSupply Argentina (Proveedor)');
  console.log('   - Librería del Sur (Proveedor)');
  console.log('='.repeat(50) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
