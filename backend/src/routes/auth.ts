import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          emailVerified: false, // TODO: Implement email verification
        },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      return res.status(201).json({
        message: 'User registered successfully',
        user,
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user with tenant memberships
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          tenantMemberships: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  taxId: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await comparePassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if email is verified (optional - can be enabled later)
      // if (!user.emailVerified) {
      //   return res.status(403).json({
      //     error: 'Email not verified',
      //     code: 'EMAIL_NOT_VERIFIED'
      //   });
      // }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
      });

      // Return user data (excluding password)
      const { passwordHash, ...userWithoutPassword } = user;

      return res.status(200).json({
        message: 'Login successful',
        user: userWithoutPassword,
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user (requires authentication)
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get full user data with tenant memberships
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        superuser: true,
        createdAt: true,
        updatedAt: true,
        tenantMemberships: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                taxId: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/profiles
 * Get all user profiles (roles)
 */
router.get('/profiles', authenticate, async (req: Request, res: Response) => {
  try {
    // HUB uses Role enum instead of Profile model
    // Return hardcoded profiles based on the Role enum
    const profiles = [
      {
        id: 'provider',
        codigo: 'PROVIDER',
        descripcion: 'Proveedor - Puede cargar documentos',
        activo: true,
      },
      {
        id: 'client-viewer',
        codigo: 'CLIENT_VIEWER',
        descripcion: 'Cliente Visualizador - Solo puede ver documentos',
        activo: true,
      },
      {
        id: 'client-approver',
        codigo: 'CLIENT_APPROVER',
        descripcion: 'Cliente Aprobador - Puede aprobar/rechazar documentos',
        activo: true,
      },
      {
        id: 'client-admin',
        codigo: 'CLIENT_ADMIN',
        descripcion: 'Administrador de Cliente - Gestión completa',
        activo: true,
      },
      {
        id: 'super-admin',
        codigo: 'SUPER_ADMIN',
        descripcion: 'Super Administrador - Admin global del sistema',
        activo: true,
      },
    ];

    return res.status(200).json(profiles);
  } catch (error) {
    console.error('Get profiles error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
