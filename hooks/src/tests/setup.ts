import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();


beforeEach(async () => {
  
  execSync('npx prisma migrate reset --force', { stdio: 'ignore' });
  
  
  await prisma.$executeRaw`TRUNCATE TABLE "User", "Zap", "Trigger", "Action", "ZapRun", "ActionRun" CASCADE;`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
