import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  
  const webhookTrigger = await prisma.availableTrigger.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      type: 'webhook',
      name: 'Webhook',
      description: 'Trigger a zap from a webhook',
      parameters: {}
    },
  });

  
  const emailAction = await prisma.availableAction.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      type: 'email',
      name: 'Email',
      description: 'Send an email',
      parameters: {}
    },
  });

  console.log(`Seeding finished.`);
  console.log({ webhookTrigger, emailAction });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
