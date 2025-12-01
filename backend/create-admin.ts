import { PrismaClient } from '@prisma/client';
import { hashPassword } from './src/utils/password';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('Creating superadmin user...');

  const email = 'admin@hub.com';
  const password = '123456';
  const name = 'Super Admin';

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Create or update the user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      emailVerified: true,
      superuser: true,
    },
    create: {
      email,
      name,
      passwordHash,
      emailVerified: true,
      superuser: true,
    },
  });

  console.log('✅ Superadmin user created/updated successfully');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('User ID:', user.id);
  console.log('\nNOTE: This user needs to be marked as superuser in the database manually or through Prisma Studio.');
}

createAdmin()
  .catch((e) => {
    console.error('Error creating admin user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
