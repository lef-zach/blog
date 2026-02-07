import { Router } from 'express';
import { Response, NextFunction, Request } from 'express';
import articleService from '../services/article.service';
import { createArticleSchema, updateArticleSchema, publishArticleSchema, queryArticlesSchema } from '../validators/article.validator';
import { AuthRequest } from '../middleware/auth';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import { AppError } from '../middleware/error';

const router = Router();

import { sanitizeContent } from '../utils/sanitizer.util';

// ... (imports remain)

export const createArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedData = createArticleSchema.parse(req.body);

    // Sanitize content
    if (validatedData.content) {
      validatedData.content = sanitizeContent(validatedData.content);
    }

    const article = await articleService.createArticle(validatedData, req.user!.userId);
    res.status(201).json({ data: article });
  } catch (error) {
    next(error);
  }
};

const stripShortLinkFields = (article: any) => {
  const { shortCode, shortClicks, shortLastHitAt, shortLinkEvents, ...rest } = article;
  return rest;
};

const isAdminRequest = (req: AuthRequest) => req.user?.role === 'ADMIN';

export const getArticles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const validatedQuery = queryArticlesSchema.parse(req.query);

    // If not authenticated, force status to PUBLISHED
    if (!req.user) {
      validatedQuery.status = 'PUBLISHED';
    }

    const result = await articleService.getArticles(validatedQuery);
    if (isAdminRequest(req)) {
      const articlesWithCodes = await Promise.all(
        result.articles.map(async (article: any) => {
          if (!article.shortCode) {
            const shortCode = await articleService.ensureShortCode(article.id, article.shortCode);
            return { ...article, shortCode };
          }
          return article;
        })
      );

      res.json({ data: { ...result, articles: articlesWithCodes } });
      return;
    }

    res.json({
      data: {
        ...result,
        articles: result.articles.map(stripShortLinkFields),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getArticleBySlug = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.userId;
    const article = await articleService.getArticleBySlug(slug, userId);
    if (isAdminRequest(req)) {
      const shortCode = await articleService.ensureShortCode(article.id, article.shortCode);
      res.json({ data: { ...article, shortCode } });
      return;
    }

    res.json({ data: stripShortLinkFields(article) });
  } catch (error) {
    next(error);
  }
};

export const getArticleFeaturedImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const result = await articleService.getPublicFeaturedImageBySlug(slug);

    if (!result?.featuredImage) {
      throw new AppError(404, 'FEATURED_IMAGE_NOT_FOUND', 'Featured image not found');
    }

    const { featuredImage } = result;

    if (featuredImage.startsWith('data:image/')) {
      const base64Match = featuredImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (base64Match) {
        const mimeType = base64Match[1];
        const data = base64Match[2];
        const buffer = Buffer.from(data, 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.send(buffer);
        return;
      }

      const utf8Match = featuredImage.match(/^data:(image\/[a-zA-Z0-9+.-]+);charset=utf-8,(.+)$/);
      if (utf8Match) {
        const mimeType = utf8Match[1];
        const data = decodeURIComponent(utf8Match[2]);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.send(Buffer.from(data, 'utf8'));
        return;
      }

      throw new AppError(422, 'FEATURED_IMAGE_INVALID', 'Unsupported featured image format');
    }

    try {
      const url = new URL(featuredImage);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      res.redirect(302, url.toString());
      return;
    } catch {
      throw new AppError(422, 'FEATURED_IMAGE_INVALID', 'Invalid featured image URL');
    }
  } catch (error) {
    next(error);
  }
};

export const updateArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = updateArticleSchema.parse(req.body);

    // Sanitize content if present
    if (validatedData.content) {
      validatedData.content = sanitizeContent(validatedData.content);
    }

    const isAdmin = req.user!.role === 'ADMIN';
    const article = await articleService.updateArticle(id, validatedData, req.user!.userId, isAdmin);
    res.json({ data: article });
  } catch (error) {
    next(error);
  }
};

export const deleteArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user!.role === 'ADMIN';
    const result = await articleService.deleteArticle(id, req.user!.userId, isAdmin);
    res.json({ data: result });
  } catch (error) {
    next(error);
  }
};

export const publishArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = publishArticleSchema.parse(req.body);
    const isAdmin = req.user!.role === 'ADMIN';
    const article = await articleService.publishArticle(id, validatedData, req.user!.userId, isAdmin);
    res.json({ data: article });
  } catch (error) {
    next(error);
  }
};

export const getVersions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const versions = await articleService.getArticleBySlug(id, req.user?.userId);
    res.json({ data: versions.versions });
  } catch (error) {
    next(error);
  }
};

// Route definitions
router.post('/', authenticate, authorize('ADMIN'), writeLimiter, createArticle);
router.get('/', optionalAuthenticate, getArticles);
router.get('/:slug/featured-image', getArticleFeaturedImage);
router.get('/:slug', getArticleBySlug);
router.put('/:id', authenticate, authorize('ADMIN'), writeLimiter, updateArticle);
router.delete('/:id', authenticate, authorize('ADMIN'), writeLimiter, deleteArticle);
router.put('/:id/publish', authenticate, authorize('ADMIN'), writeLimiter, publishArticle);
router.get('/:id/versions', authenticate, authorize('ADMIN'), getVersions);

export { router as articleRouter };
