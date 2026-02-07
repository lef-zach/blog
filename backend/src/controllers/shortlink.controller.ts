import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error';
import articleService from '../services/article.service';
import { config } from '../config';
import { logger } from '../utils/logger';

const extractReferrerDomain = (referrer?: string | null) => {
  if (!referrer) {
    return null;
  }

  try {
    const url = new URL(referrer);
    return url.hostname.toLowerCase().slice(0, 255);
  } catch {
    return null;
  }
};

const getClientIp = (req: Request) => {
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].trim();
  }

  return req.ip;
};

const hashIp = (ip?: string | null) => {
  if (!ip) {
    return null;
  }

  return crypto
    .createHash('sha256')
    .update(`${config.shortLinks.hashSalt}:${ip}`)
    .digest('hex');
};

export const shortlinkController = {
  async redirectShortLink(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.params.code;
      const article = await articleService.getArticleByShortCode(code);

      if (!article) {
        throw new AppError(404, 'SHORTLINK_NOT_FOUND', 'Short link not found');
      }

      if (article.status !== 'PUBLISHED' || article.visibility !== 'PUBLIC') {
        throw new AppError(404, 'SHORTLINK_NOT_FOUND', 'Short link not found');
      }

      const referrer = extractReferrerDomain(req.get('referer'));
      const ipHash = hashIp(getClientIp(req));

      try {
        await articleService.recordShortLinkHit(article.id, referrer, ipHash);
      } catch (eventError) {
        logger.error('Short link analytics failed', {
          articleId: article.id,
          shortCode: article.shortCode,
          error: eventError,
        });
      }

      res.redirect(301, `/blog/${article.slug}`);
    } catch (error) {
      next(error);
    }
  },
};
