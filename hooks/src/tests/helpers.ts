import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createTestUser = async (email = 'test@example.com', address = '0x1234567890123456789012345678901234567890') => {
  return prisma.user.create({
    data: {
      email,
      address,
    },
  });
};

export const createTestZap = async (userId: number, name = 'Test Zap') => {
  return prisma.zap.create({
    data: {
      name,
      userId,
      status: 'active',
      trigger: {
        create: {
          type: 'WEBHOOK',
          metadata: { url: 'https://example.com/webhook' },
        },
      },
      actions: {
        create: [
          {
            type: 'EMAIL',
            metadata: { to: 'test@example.com', subject: 'Test', body: 'Hello' },
            sortingOrder: 0,
          },
        ],
      },
    },
    include: {
      trigger: true,
      actions: true,
    },
  });
};
