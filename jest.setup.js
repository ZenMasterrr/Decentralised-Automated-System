const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });


dotenv.config({ path: path.resolve(__dirname, 'hooks', '.env'), override: false });

console.log('Environment variables loaded for tests');
console.log('SMTP configured:', !!process.env.SMTP_USERNAME && !!process.env.SMTP_PASSWORD);
