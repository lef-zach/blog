import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../config/jwt';
import { redis } from '../config/redis';
import { AppError } from '../middleware/error';
import { logger } from '../utils/logger';

// Helper to handle bcrypt truncation (max 72 bytes)
const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export class AuthService {
  async register(email: string, password: string, name?: string, username?: string) {
    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        throw new AppError(409, 'USERNAME_EXISTS', 'Username already exists');
      }
    }
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new AppError(409, 'EMAIL_EXISTS', 'User with this email already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        role: 'AUTHOR',
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async isRegistrationEnabled() {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { siteSettings: true }
    });

    if (!admin || !admin.siteSettings) return true;

    const settings = admin.siteSettings as any;
    if (settings.features && typeof settings.features.enableRegistration === 'boolean') {
      return settings.features.enableRegistration;
    }
    return true;
  }

  async login(identifier: string, password: string) {
    // Identifier can be email or username
    // We can just try to find by one, if null find by other?
    // OR (username = identifier OR email = identifier)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    // Check rate limiting
    const attemptsKey = `login_attempts:${identifier}`;
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) {
      await redis.expire(attemptsKey, 3600); // 1 hour
    }
    if (attempts > 5) {
      throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Too many login attempts, please try again later');
    }

    // Clear attempts on successful login
    await redis.del(attemptsKey);

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email || '', // Handle null email?
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email || '',
      role: user.role,
    });

    // Store refresh token in database (Hashed with SHA256 then Bcrypt)
    const tokenHash = hashToken(refreshToken);
    const hashedRefreshToken = await bcrypt.hash(tokenHash, 12);
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token signature');
    }

    // Find the refresh token in database
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: decoded.userId },
    });

    let matchedTokenId = null;
    const incomingTokenHash = hashToken(refreshToken);

    logger.debug({ event: 'auth_refresh_check', userId: decoded.userId, tokenCount: tokens.length });

    for (const token of tokens) {
      // Compare SHA256(incoming) vs Bcrypt(SHA256(stored_original))
      const isMatch = await bcrypt.compare(incomingTokenHash, token.token);
      if (isMatch) {

        matchedTokenId = token.id;
        break;
      }
    }

    // REUSE DETECTION: Token is valid (signature) but not in DB (already used/deleted)
    if (!matchedTokenId) {
      logger.warn({
        event: 'auth_reuse_detected',
        userId: decoded.userId,
        message: 'Refresh Token Reuse Detected. Revoking all sessions.'
      });
      await prisma.refreshToken.deleteMany({ where: { userId: decoded.userId } });
      throw new AppError(401, 'TOKEN_REUSE_DETECTED', 'Security: Token reuse detected, all sessions revoked.');
    }

    // Valid Rotation: Delete old, issuance new
    const deleteResult = await prisma.refreshToken.deleteMany({
      where: { id: matchedTokenId }
    });

    logger.info({
      event: 'auth_token_rotation',
      userId: decoded.userId,
      tokenId: matchedTokenId,
      deletedCount: deleteResult.count
    });

    if (deleteResult.count === 0) {
      logger.warn({
        event: 'auth_rotation_conflict',
        userId: decoded.userId,
        tokenId: matchedTokenId,
        message: 'Token already deleted (Race Condition)'
      });
      throw new AppError(409, 'TOKEN_ROTATION_CONFLICT', 'Token rotation already handled');
    }

    // Generate new tokens
    const accessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    // Store new refresh token
    const newTokenHash = hashToken(newRefreshToken);
    const hashedRefreshToken = await bcrypt.hash(newTokenHash, 12);
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: decoded.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, accessToken: string) {
    // Blacklist the access token
    await redis.set(`blacklist:${accessToken}`, '1', 'EX', 900); // 15 minutes

    // Delete all refresh tokens for user
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        avatar: true,
        socialLinks: true,
        publicEmail: true,
        scholarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return user;
  }

  async updatePassword(userId: string, current: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

    const isValid = await bcrypt.compare(current, user.password);
    if (!isValid) throw new AppError(401, 'INVALID_PASSWORD', 'Invalid current password');

    const hashedPassword = await bcrypt.hash(newPass, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { message: 'Password updated successfully' };
  }
}

export default new AuthService();
