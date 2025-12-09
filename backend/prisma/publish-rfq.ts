import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function publishRFQ() {
  // Publicar la RFQ y actualizar la invitación
  const rfq = await prisma.quotationRequest.update({
    where: { id: 'cmiwjd9xl0001lcws1ses31fe' },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date()
    }
  });

  // Actualizar estado de invitación
  await prisma.quotationRequestSupplier.updateMany({
    where: { quotationRequestId: rfq.id },
    data: {
      status: 'INVITED',
      invitedAt: new Date()
    }
  });

  console.log('✅ RFQ publicada:', rfq.number, rfq.title);
  console.log('✅ Invitaciones actualizadas a INVITED');

  await prisma.$disconnect();
}

publishRFQ().catch(console.error);
