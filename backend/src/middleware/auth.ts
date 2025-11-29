import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../lib/prisma';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('🔐 [AUTH] Request:', req.method, req.path, 'Auth header:', authHeader?.substring(0, 20) + '...');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload: JwtPayload = verifyToken(token);
    console.log('✅ [AUTH] Token verified for user:', payload.userId);

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      console.log('❌ [AUTH] User not found:', payload.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = user;
    console.log('✅ [AUTH] Authenticated:', user.email);
    next();
  } catch (error) {
    console.log('❌ [AUTH] Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if not
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const payload: JwtPayload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    next();
  }
}
