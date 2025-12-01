import { PrismaClient } from '@prisma/client';
import { hashPassword } from './src/utils/password';

const prisma = new PrismaClient();

async function updateTestUser() {
  console.log('Updating test user password...');

  const email = 'test@hub.com';
  const password = 'test123';

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Update or create the user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      emailVerified: true,
    },
    create: {
      email,
      name: 'Test User',
      passwordHash,
      emailVerified: true,
    },
  });

  console.log('✅ Test user updated successfully');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('User ID:', user.id);
}

updateTestUser()
  .catch((e) => {
    console.error('Error updating test user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
