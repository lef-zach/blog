import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.util';
import { AppError } from './error';
import { logger } from '../utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export type AuthRequest = any;

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError(401, 'UNAUTHORIZED', 'No token provided'));
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn({
        event: 'auth_rbac_deny',
        userId: req.user?.userId,
        role: req.user?.role,
        requiredRoles: roles,
        path: req.originalUrl
      });
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    next();
  };
};

export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore validation errors, treat as unauthenticated
  }
  next();
};
