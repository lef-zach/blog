import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import { AuthRequest } from '../middleware/auth';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { logger } from '../utils/logger';

const router = Router();

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if registration is enabled
    const isEnabled = await authService.isRegistrationEnabled();
    if (!isEnabled) {
      res.status(403).json({ error: { code: 'REGISTRATION_DISABLED', message: 'Registration is currently disabled' } });
      return;
    }

    const user = await authService.register(
      validatedData.email || '',
      validatedData.password,
      validatedData.name,
      validatedData.username || ''
    );
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
};

const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

// Cookie Options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/api/v1/auth/refresh', // Restricted path
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData.email, validatedData.password);

    logger.info({
      event: 'auth_login_success',
      userId: result.user.id,
      email: result.user.email,
      correlationId: req.id,
    });

    // Set HttpOnly Cookie
    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);

    // Return User & Access Token (Remove Refresh Token from body)
    res.json({
      data: {
        user: result.user,
        accessToken: result.accessToken
        // No refreshToken here
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refresh_token; // Read from Cookie

    if (!refreshToken) {
      res.status(401).json({ error: { code: 'NO_TOKEN', message: 'No refresh token provided' } });
      return;
    }

    const result = await authService.refresh(refreshToken);

    // Rotate Cookie
    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);

    res.json({
      data: {
        accessToken: result.accessToken
      }
    });
  } catch (error) {
    // Clear cookie on error
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7) || '';

    // Attempt cleanup if possible, but mainly clear cookie
    if (req.user?.userId) {
      await authService.logout(req.user.userId, token);
    }

    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    res.json({ data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ data: user });
  } catch (error) {
    next(error);
  }
};

// Update Password
export const updatePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new Error('Please provide current and new password');
    }
    const result = await authService.updatePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

// Route definitions
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.post('/update-password', authenticate, updatePassword); // NEW ROUTE

export { router as authRouter };
