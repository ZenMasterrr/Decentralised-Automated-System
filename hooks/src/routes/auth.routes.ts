import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient, User, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { resolve } from 'path';


dotenv.config({ path: resolve(__dirname, '../../../.env') });
dotenv.config({ path: resolve(__dirname, '../../../../.env'), override: false }); // Dteams/.env

const router = require('express').Router();
const prisma = new PrismaClient();
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);


type GoogleAuthData = {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
};

type UserMetadata = {
  google?: GoogleAuthData;
} | null;


type SafeUser = {
  id: number;
  name: string | null;
  email: string | null;
  address: string;
  metadata: UserMetadata | null;
  isGoogleAuthenticated: boolean;
};


type UserWithMetadata = {
  id: number;
  name: string | null;
  email: string | null;
  address: string;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
  metadata: UserMetadata;
};


router.get('/google', (req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
  res.redirect(url);
});


router.get('/google/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new Error('No email found in Google account');
    }

    
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1);

    
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email }
    }) as UserWithMetadata | null;

    let user: UserWithMetadata | null = null;
    
    if (existingUser) {
      
      const currentMetadata = existingUser.metadata ? 
        (typeof existingUser.metadata === 'string' ? 
          JSON.parse(existingUser.metadata) : 
          existingUser.metadata) as UserMetadata : 
        null;
      
     
      const updatedMetadata: UserMetadata = {
        ...(currentMetadata || {}),
        google: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || (currentMetadata?.google?.refreshToken || ''),
          tokenExpiry: tokenExpiry.toISOString(),
        }
      };

      
      const updateData: any = {
        name: payload.name,
        metadata: updatedMetadata
      };

      
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData
      });

      
      user = {
        ...updatedUser,
        metadata: updatedMetadata as Prisma.JsonValue
      } as UserWithMetadata;
    } else {

      const newUserMetadata: UserMetadata = {
        google: {
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token || '',
          tokenExpiry: tokenExpiry.toISOString(),
        }
      };

      const newUser = await prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: null,
          address: `user_${Date.now()}`,
          metadata: newUserMetadata as any  
        }
      });
      
      
      user = {
        ...newUser,
        metadata: newUserMetadata
      } as UserWithMetadata;
    }

    
    const token = jwt.sign(
      { userId: user.id, address: user.address },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    
    const metadata = user.metadata ? 
      (typeof user.metadata === 'string' ? JSON.parse(user.metadata) : user.metadata) : 
      null;

    
    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      metadata: metadata as UserMetadata | null,
      isGoogleAuthenticated: !!(metadata as UserMetadata)?.google?.accessToken,
    };

    
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);

  } catch (error) {
    console.error('Google OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(errorMessage)}`);
  }
});


router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };

    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        metadata: true,
      },
    }) as UserWithMetadata | null;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    const userMetadata: UserMetadata = user.metadata 
      ? (typeof user.metadata === 'string' 
          ? JSON.parse(user.metadata) 
          : user.metadata)
      : null;

    
    const googleData = userMetadata?.google;
    let isTokenExpired = true;
    if (googleData?.tokenExpiry) {
      isTokenExpired = new Date(googleData.tokenExpiry) < new Date();
    }

    
    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      address: user.address,
      metadata: userMetadata,
      isGoogleAuthenticated: !!googleData?.accessToken && !isTokenExpired
    };

    res.json(safeUser);

  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;