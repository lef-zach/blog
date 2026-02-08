import crypto from 'crypto';
import { prisma } from '../config/database';
import { config } from '../config';
import { AppError } from '../middleware/error';
import { redis } from '../config/redis';

export class ArticleService {
  private lastShortLinkPruneAt: number | null = null;

  async createArticle(data: any, authorId: string) {
    const slug = data.slug || this.generateSlug(data.title);
    const shortCode = await this.generateUniqueShortCode();

    // Check if slug exists
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      throw new AppError(409, 'SLUG_EXISTS', 'Article with this slug already exists');
    }

    const wordCount = this.countWords(data.content);
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    const article = await prisma.article.create({
      data: {
        title: data.title,
        slug,
        shortCode,
        excerpt: data.excerpt || this.generateExcerpt(data.content),
        content: data.content,
        featuredImage: data.featuredImage,
        featuredImageLayout: data.featuredImageLayout,
        featuredImageSize: data.featuredImageSize,
        status: data.status || 'DRAFT',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        visibility: data.visibility || 'PUBLIC',
        password: data.password,
        metaDescription: data.metaDescription,
        metaKeywords: data.metaKeywords,
        wordCount,
        readingTime,
        authorId,
        categoryId: data.categoryId,
        tags: {
          connectOrCreate: (data.tags || []).map((tagName: string) => ({
            where: { name: tagName },
            create: { name: tagName, slug: this.generateSlug(tagName) },
          })),
        },
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        category: true,
        tags: true,
      },
    });

    // Create initial version
    await this.createVersion(article.id, article.title, article.content, 1);

    return article;
  }

  async getArticles(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.category) {
      where.category = { slug: query.category };
    }

    if (query.tag) {
      where.tags = { some: { slug: query.tag } };
    }

    if (query.author) {
      where.authorId = query.author;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { excerpt: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [query.sort || 'createdAt']: query.order || 'desc' },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          category: true,
          tags: true,
        },
      }),
      prisma.article.count({ where }),
    ]);

    return {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getArticleBySlug(slugOrId: string, userId?: string) {
    const article = await prisma.article.findFirst({
      where: {
        OR: [
          { slug: slugOrId },
          { id: slugOrId } // Allow lookup by ID as well
        ]
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true, bio: true },
        },
        category: true,
        tags: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 5,
        },
      },
    });

    if (!article) {
      throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
    }

    // Check visibility
    if (article.visibility === 'PRIVATE' && article.authorId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'This article is private');
    }

    if (article.visibility === 'PASSWORD' && article.authorId !== userId) {
      // Password check would be handled in middleware/controller
    }

    return article;
  }

  async getArticleByShortCode(shortCode: string) {
    return prisma.article.findUnique({
      where: { shortCode },
      select: {
        id: true,
        slug: true,
        status: true,
        visibility: true,
        shortCode: true,
      },
    });
  }

  async incrementArticleViews(articleId: string) {
    await prisma.article.update({
      where: { id: articleId },
      data: {
        views: { increment: 1 },
      },
    });
  }

  async getPublicFeaturedImageBySlug(slug: string) {
    return prisma.article.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      },
      select: {
        featuredImage: true,
      },
    });
  }

  async ensureShortCode(articleId: string, currentCode?: string | null) {
    if (currentCode) {
      return currentCode;
    }

    const shortCode = await this.generateUniqueShortCode();

    const updated = await prisma.article.update({
      where: { id: articleId },
      data: { shortCode },
      select: { shortCode: true },
    });

    return updated.shortCode;
  }

  async updateArticle(id: string, data: any, userId: string, isAdmin: boolean) {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
    }

    if (article.authorId !== userId && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'You can only edit your own articles');
    }

    const updateData: any = { ...data };

    if (data.title) {
      updateData.slug = data.slug || this.generateSlug(data.title);
    }

    if (data.content) {
      updateData.wordCount = this.countWords(data.content);
      updateData.readingTime = Math.ceil(updateData.wordCount / 200);
    }

    if (data.tags) {
      updateData.tags = {
        set: [],
        connectOrCreate: data.tags.map((tagName: string) => ({
          where: { name: tagName },
          create: { name: tagName, slug: this.generateSlug(tagName) },
        })),
      };
    }

    const updated = await prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        category: true,
        tags: true,
      },
    });

    // Create new version if content changed
    if (data.content) {
      const versions = await prisma.articleVersion.findMany({
        where: { articleId: id },
        orderBy: { version: 'desc' },
        take: 1,
      });
      const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;
      await this.createVersion(id, updated.title, updated.content, nextVersion);
    }

    // Clear cache
    await redis.del(`article:${article.slug}`);

    return updated;
  }

  async deleteArticle(id: string, userId: string, isAdmin: boolean) {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
    }

    if (article.authorId !== userId && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'You can only delete your own articles');
    }

    await prisma.article.delete({ where: { id } });

    // Clear cache
    await redis.del(`article:${article.slug}`);

    return { message: 'Article deleted successfully' };
  }

  async publishArticle(id: string, data: any, userId: string, isAdmin: boolean) {
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
    }

    if (article.authorId !== userId && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'You can only publish your own articles');
    }

    const updateData: any = {
      status: data.status,
    };

    if (!article.shortCode) {
      updateData.shortCode = await this.generateUniqueShortCode();
    }

    if (data.status === 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    if (data.scheduledAt) {
      updateData.scheduledAt = new Date(data.scheduledAt);
    }

    const updated = await prisma.article.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        category: true,
        tags: true,
      },
    });

    // Clear cache
    await redis.del(`article:${article.slug}`);

    return updated;
  }

  async recordShortLinkHit(articleId: string, referrerDomain: string | null, ipHash: string | null) {
    const now = new Date();
    const pruneBefore = this.getShortLinkPruneBefore();

    await prisma.$transaction([
      prisma.article.update({
        where: { id: articleId },
        data: {
          shortClicks: { increment: 1 },
          shortLastHitAt: now,
        },
      }),
      prisma.shortLinkEvent.create({
        data: {
          articleId,
          referrerDomain,
          ipHash,
        },
      }),
      ...(pruneBefore
        ? [
            prisma.shortLinkEvent.deleteMany({
              where: {
                createdAt: { lt: pruneBefore },
              },
            }),
          ]
        : []),
    ]);
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  private generateShortCode(length = config.shortLinks.codeLength): string {
    const safeLength = Number.isFinite(length) && length > 0 ? length : 6;
    const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const bytes = crypto.randomBytes(safeLength);
    let code = '';

    for (let i = 0; i < safeLength; i += 1) {
      code += alphabet[bytes[i] % alphabet.length];
    }

    return code;
  }

  private async generateUniqueShortCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const shortCode = this.generateShortCode();
      const existing = await prisma.article.findUnique({
        where: { shortCode },
        select: { id: true },
      });

      if (!existing) {
        return shortCode;
      }
    }

    throw new AppError(500, 'SHORTLINK_CODE_FAILED', 'Failed to generate a unique short code');
  }

  private getShortLinkPruneBefore() {
    const now = Date.now();
    const lastPrune = this.lastShortLinkPruneAt;
    const shouldPrune = !lastPrune || now - lastPrune > 60 * 60 * 1000;

    if (!shouldPrune) {
      return null;
    }

    this.lastShortLinkPruneAt = now;
    const retentionDays = Number.isFinite(config.shortLinks.eventRetentionDays)
      && config.shortLinks.eventRetentionDays > 0
      ? config.shortLinks.eventRetentionDays
      : 90;
    return new Date(now - retentionDays * 24 * 60 * 60 * 1000);
  }

  private generateExcerpt(content: string, length = 160): string {
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.substring(0, length) + (plainText.length > length ? '...' : '');
  }

  private countWords(content: string): number {
    const plainText = content.replace(/<[^>]*>/g, '');
    return plainText.split(/\s+/).filter(word => word.length > 0).length;
  }

  private async createVersion(articleId: string, title: string, content: string, version: number) {
    await prisma.articleVersion.create({
      data: {
        articleId,
        title,
        content,
        version,
      },
    });
  }
}

export default new ArticleService();
