import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp, resetTestDatabase, createTestUser, getTestAuthToken } from '../setupTestApp';
import { TEST_CONFIG } from '../config';
import { describe, beforeAll, afterAll, beforeEach, expect, it } from '@jest/globals';

describe('Zap API', () => {
  let app: Express;
  let authToken: string;
  let userId: number;
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    
    const testApp = await createTestApp();
    app = testApp.app;
    testPrisma = testApp.prisma;
    
    
    await resetTestDatabase();
    
    
    const testUser = await createTestUser();
    userId = testUser.id;
    authToken = await getTestAuthToken(userId);
  });

  afterAll(async () => {
    
    await testPrisma.$disconnect();
  });

  const createTestZap = async (userId: number, name = 'Test Zap') => {
    return testPrisma.zap.create({
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

  describe('POST /api/zaps', () => {
    it('should create a new zap', async () => {
      const zapData = {
        name: 'Test Zap',
        trigger: {
          type: 'WEBHOOK',
          metadata: { url: 'https://example.com/webhook' },
        },
        actions: [
          {
            type: 'EMAIL',
            metadata: { to: 'test@example.com', subject: 'Test', body: 'Hello' },
          },
        ],
      };

      const res = await request(app)
        .post('/api/zaps')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...zapData,
          userId, 
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: 'Test Zap',
        status: 'active',
      });
      expect(res.body.trigger).toBeDefined();
      expect(res.body.actions).toHaveLength(1);
    });
  });

  describe('GET /api/zaps/:id', () => {
    it('should get a zap by id', async () => {
      
      const zap = await createTestZap(userId);

      
      const res = await request(app)
        .get(`/api/zaps/${zap.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: zap.id,
        name: 'Test Zap',
      });
    });

    it('should return 404 for non-existent zap', async () => {
      const res = await request(app)
        .get('/api/zaps/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/zaps/:id', () => {
    it('should update a zap', async () => {
      const zap = await createTestZap(userId);

      const updateData = {
        name: 'Updated Zap Name',
        status: 'inactive',
      };

      const res = await request(app)
        .put(`/api/zaps/${zap.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: zap.id,
        name: 'Updated Zap Name',
        status: 'inactive',
      });
    });
  });

  describe('DELETE /api/zaps/:id', () => {
    it('should delete a zap', async () => {
      const zap = await createTestZap(userId);

      const res = await request(app)
        .delete(`/api/zaps/${zap.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(204);

      
      const getRes = await request(app)
        .get(`/api/zaps/${zap.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(getRes.status).toBe(404);
    });
  });
});
