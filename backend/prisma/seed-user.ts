import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedUser() {
  console.log('🌱 Seeding test user...');

  // Email y contraseña del usuario de prueba
  const testEmail = 'test@hub.com';
  const testPassword = 'test123';

  // Verificar si ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (existingUser) {
    console.log('✅ Test user already exists:', testEmail);
    console.log('📧 Email:', testEmail);
    console.log('🔑 Password:', testPassword);
    return;
  }

  // Hash de la contraseña
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Usuario de Prueba',
      password: hashedPassword,
      emailVerified: true,
    },
  });

  console.log('✅ Test user created successfully!');
  console.log('📧 Email:', testEmail);
  console.log('🔑 Password:', testPassword);
  console.log('👤 User ID:', user.id);
}

seedUser()
  .catch((e) => {
    console.error('❌ Error seeding user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
