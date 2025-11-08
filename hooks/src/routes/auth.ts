import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';


function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const router = Router();


const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);


router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'auth' });
});


router.post('/login', (req, res) => {
  
  res.json({ message: 'Login successful', token: 'sample-jwt-token' });
});


router.post('/register', (req, res) => {
  
  res.status(201).json({ message: 'User registered successfully' });
});


router.post('/signup', (req, res) => {
  const { address } = req.body;
  
  if (!address) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Wallet address is required' 
    });
  }

  
  const token = `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  res.status(201).json({ 
    status: 'success',
    message: 'Wallet connected successfully',
    token: token,
    user: {
      address: address,
      isNew: true
    }
  });
});


router.get('/google', (req, res) => {
  const { wallet } = req.query;
  
  if (!wallet) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Wallet address is required' 
    });
  }

  const state = uuidv4();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    state: JSON.stringify({ wallet, state })
  });

  
  res.redirect(url);
});


router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('Invalid request');
    }

    
    const stateData = JSON.parse(state as string);
    
    
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    
    const userinfo = await oauth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
    });

   
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?google_auth=success`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?google_auth=error`);
  }
});

export const authRouter = router;
