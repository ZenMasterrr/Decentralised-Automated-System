import express from 'express';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { TEST_CONFIG } from './config';


export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_CONFIG.DATABASE_URL,
    },
  },
});


interface TestApp {
  app: express.Express;
  prisma: PrismaClient;
}


export const createTestApp = async (): Promise<TestApp> => {
  const app = express();
  
 
  app.use(express.json());
  
  
  const { default: apiRouter } = await import('../routes');
  app.use('/api', apiRouter);
  
  return { app, prisma: testPrisma };
};


export const resetTestDatabase = async () => {
  try {
    
    await testPrisma.$executeRaw`SET session_replication_role = 'replica'`;
    
    
    const tables = await testPrisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;
    
    
    for (const { tablename } of tables) {
      if (tablename !== '_prisma_migrations') {
        await testPrisma.$executeRawUnsafe(
          `TRUNCATE TABLE \"public\".\"${tablename}\" CASCADE;`
        );
      }
    }
    
    
    await testPrisma.$executeRaw`SET session_replication_role = 'origin'`;
    
    
    execSync('npx prisma migrate deploy', { 
      env: { ...process.env, DATABASE_URL: TEST_CONFIG.DATABASE_URL },
      stdio: 'ignore'
    });
    
  } catch (error) {
    console.error('Error resetting test database:', error);
    throw error;
  }
};


export const createTestUser = async (userData = {}) => {
  return testPrisma.user.create({
    data: {
      email: TEST_CONFIG.TEST_USER.email,
      address: TEST_CONFIG.TEST_USER.address,
      ...userData,
    },
  });
};

export const getTestAuthToken = async (userId: number) => {
  
  return `test-token-${userId}`;
};
