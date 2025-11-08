import dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env files from multiple locations
dotenv.config({ path: resolve(__dirname, '.env') });
dotenv.config({ path: resolve(__dirname, 'hooks', '.env'), override: false });

import { NextRequest } from './frontend/node_modules/next/server';
import { POST } from './frontend/app/api/test-zap/[id]/route';
import { saveMockZap } from './frontend/lib/mockZapUtils';

// Mock the request object
const createRequest = (id: string) => {
  return new NextRequest(`http://localhost:3000/api/test-zap/${id}`, {
    method: 'POST',
  });
};

describe('Test Zap Endpoint', () => {
  const testZap = {
    id: 'test-zap-1',
    name: 'Test Zap',
    status: 'active',
    trigger: {
      type: 'webhook',
      webhookUrl: 'https://example.com/webhook'
    },
    actions: [
      {
        type: 'email',
        config: {
          to: 'test@example.com',
          subject: 'Test Subject',
          body: 'This is a test email'
        }
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeAll(async () => {
    // Save a test zap before running tests
    await saveMockZap(testZap);
  });

  it('should test a zap successfully', async () => {
    const response = await POST(createRequest(testZap.id), { params: { id: testZap.id } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.zapId).toBe(testZap.id);
    expect(data.actionResults).toHaveLength(1);
  });

  it('should return 404 for non-existent zap', async () => {
    const response = await POST(createRequest('non-existent-id'), { 
      params: { id: 'non-existent-id' } 
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
  });
});
