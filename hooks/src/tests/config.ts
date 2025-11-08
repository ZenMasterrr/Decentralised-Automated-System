
export const TEST_CONFIG = {
  
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/zapier_test',
  
  
  TEST_USER: {
    email: 'test@example.com',
    address: '0x1234567890123456789012345678901234567890',
  },

  
  API_BASE_URL: 'http://localhost:3002/api',

  
  TIMEOUT: 30000, 
};
