import { Router } from 'express';
import { Response, NextFunction } from 'express';
import articleService from '../services/article.service';
import { createArticleSchema, updateArticleSchema, publishArticleSchema, queryArticlesSchema } from '../validators/article.validator';
import { AuthRequest } from '../middleware/auth';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';

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
router.get('/:slug', getArticleBySlug);
router.put('/:id', authenticate, authorize('ADMIN'), writeLimiter, updateArticle);
router.delete('/:id', authenticate, authorize('ADMIN'), writeLimiter, deleteArticle);
router.put('/:id/publish', authenticate, authorize('ADMIN'), writeLimiter, publishArticle);
router.get('/:id/versions', authenticate, authorize('ADMIN'), getVersions);

export { router as articleRouter };
