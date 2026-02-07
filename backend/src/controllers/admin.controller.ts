import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../utils/error.util';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs/promises';
import { backupService } from '../services/backup.service';

const prisma = new PrismaClient();

const MAX_SITE_URLS = 10;

const normalizeSiteUrlValue = (value?: string | null) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
};

const normalizeSiteUrls = (value: unknown, primary?: string | null) => {
  const primaryOrigin = normalizeSiteUrlValue(primary || null);
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,]+/)
      : [];

  const normalized = rawValues
    .map((entry) => normalizeSiteUrlValue(String(entry)))
    .filter((entry): entry is string => !!entry);

  const unique = Array.from(new Set(normalized));
  const filtered = primaryOrigin
    ? unique.filter((entry) => entry !== primaryOrigin)
    : unique;

  return filtered.slice(0, MAX_SITE_URLS);
};

export const adminController = {
  // Get admin stats
  async getStats(req: Request, res: Response) {
    try {
      const totalArticles = await prisma.article.count();
      const publishedArticles = await prisma.article.count({
        where: { status: 'PUBLISHED' },
      });
      const draftArticles = await prisma.article.count({
        where: { status: 'DRAFT' },
      });
      const totalPapers = await prisma.paper.count();
      const totalUsers = await prisma.user.count();

      // Calculate total citations
      const papers = await prisma.paper.findMany({
        select: { citations: true },
      });
      const totalCitations = papers.reduce((sum, paper) => sum + (paper.citations || 0), 0);

      // Calculate total views
      const articles = await prisma.article.findMany({
        select: { views: true },
      });
      const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);

      res.json({
        totalArticles,
        publishedArticles,
        draftArticles,
        totalPapers,
        totalCitations,
        totalUsers,
        totalViews,
      });
    } catch (error: any) {
      throw new AppError(500, 'STATS_ERROR', 'Failed to fetch stats');
    }
  },

  // Get analytics
  async getAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {};
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      // Get total views and stats
      const articles = await prisma.article.findMany({
        where,
        select: { views: true, slug: true, title: true, id: true },
      });
      const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
      const uniqueVisitors = Math.floor(totalViews * 0.7);

      const totalArticles = await prisma.article.count();
      const totalPapers = await prisma.paper.count();

      // Top Pages (Articles)
      const topArticles = articles
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map((article) => ({
          id: article.id,
          title: article.title,
          views: article.views || 0,
          change: Math.floor(Math.random() * 20) - 5, // Simulated change
        }));

      // Top Papers
      const papers = await prisma.paper.findMany({
        take: 5,
        orderBy: { citations: 'desc' },
        select: { id: true, title: true, citations: true },
      });

      const topPapers = papers.map(paper => ({
        id: paper.id,
        title: paper.title,
        citations: paper.citations || 0,
        change: Math.floor(Math.random() * 10), // Simulated
      }));

      // Views over time (Traffic)
      const traffic = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dailyViews = Math.floor(Math.random() * 100) + 50;
        traffic.push({
          date: date.toISOString().split('T')[0],
          views: dailyViews,
          visitors: Math.floor(dailyViews * 0.7),
        });
      }

      res.json({
        overview: {
          totalViews,
          uniqueVisitors,
          totalArticles,
          totalPapers,
          viewsChange: 12, // Simulated
          visitorsChange: 8, // Simulated
        },
        articles: topArticles,
        papers: topPapers,
        traffic,
      });
    } catch (error: any) {
      throw new AppError(500, 'ANALYTICS_ERROR', 'Failed to fetch analytics');
    }
  },

  async getShortLinkStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const article = await prisma.article.findUnique({
        where: { id },
        select: {
          id: true,
          shortCode: true,
          shortClicks: true,
          shortLastHitAt: true,
        },
      });

      if (!article) {
        throw new AppError(404, 'ARTICLE_NOT_FOUND', 'Article not found');
      }

      const retentionDays = config.shortLinks.eventRetentionDays;
      const since = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const referrerLimit = Number.isFinite(config.shortLinks.referrerLimit) && config.shortLinks.referrerLimit > 0
        ? config.shortLinks.referrerLimit
        : 10;

      const referrers = await prisma.shortLinkEvent.groupBy({
        by: ['referrerDomain'],
        where: {
          articleId: id,
          createdAt: { gte: since },
        },
        _count: {
          referrerDomain: true,
        },
        orderBy: {
          _count: {
            referrerDomain: 'desc',
          },
        },
        take: referrerLimit,
      });

      const recentClicks = await prisma.shortLinkEvent.count({
        where: {
          articleId: id,
          createdAt: { gte: since },
        },
      });

      res.json({
        data: {
          shortCode: article.shortCode,
          shortClicks: article.shortClicks,
          shortLastHitAt: article.shortLastHitAt,
          recentClicks,
          topReferrers: referrers.map((ref) => ({
            domain: ref.referrerDomain || 'direct',
            count: ref._count.referrerDomain,
          })),
          retentionDays,
        },
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'SHORTLINK_STATS_ERROR', 'Failed to fetch short link stats');
    }
  },

  async listBackups(req: Request, res: Response) {
    try {
      const backups = await backupService.listBackups();
      res.json({ data: backups });
    } catch (error: any) {
      throw new AppError(500, 'BACKUP_LIST_ERROR', 'Failed to list backups');
    }
  },

  async createBackup(req: Request, res: Response) {
    try {
      const {
        includeDb = true,
        includeUploads = false,
        includeEnv = false,
        includeCerts = false,
        encrypt = false,
        passphrase,
      } = req.body || {};

      if (encrypt && (!passphrase || typeof passphrase !== 'string')) {
        throw new AppError(400, 'BACKUP_PASSPHRASE_REQUIRED', 'Passphrase is required for encryption');
      }

      if (!includeDb && !includeUploads && !includeEnv && !includeCerts) {
        throw new AppError(400, 'BACKUP_EMPTY', 'Select at least one backup component');
      }

      const jobId = await backupService.createBackupJob({
        includes: {
          db: Boolean(includeDb),
          uploads: Boolean(includeUploads),
          env: Boolean(includeEnv),
          certs: Boolean(includeCerts),
        },
        encrypt: Boolean(encrypt),
        passphrase: passphrase || undefined,
      });

      res.status(202).json({ data: { jobId } });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'BACKUP_CREATE_ERROR', error?.message || 'Failed to create backup');
    }
  },

  async getBackupJob(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const job = await backupService.getJob(id);
      if (!job) {
        throw new AppError(404, 'BACKUP_JOB_NOT_FOUND', 'Backup job not found');
      }
      res.json({ data: job });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'BACKUP_JOB_ERROR', 'Failed to read backup job');
    }
  },

  async downloadBackup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const metadata = await backupService.getBackup(id);
      if (!metadata) {
        throw new AppError(404, 'BACKUP_NOT_FOUND', 'Backup not found');
      }

      const filePath = path.join(config.backup.dir, 'files', metadata.filename);
      res.download(filePath, metadata.filename);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'BACKUP_DOWNLOAD_ERROR', 'Failed to download backup');
    }
  },

  async downloadRestoreBundle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { bundleFile, bundleDir } = await backupService.createRestoreBundle(id);
      const filename = `restore-bundle-${id}.tar.gz`;

      res.download(bundleFile, filename, async () => {
        await fs.rm(bundleFile, { force: true });
        await fs.rm(bundleDir, { recursive: true, force: true });
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'BACKUP_BUNDLE_ERROR', error?.message || 'Failed to build restore bundle');
    }
  },

  async restoreBackup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        mode = 'staged',
        restoreDb = true,
        restoreUploads = false,
        restoreEnv = false,
        restoreCerts = false,
        passphrase,
      } = req.body || {};

      if (!['staged', 'in-place'].includes(mode)) {
        throw new AppError(400, 'RESTORE_MODE_INVALID', 'Invalid restore mode');
      }

      const jobId = await backupService.restoreBackupJob(id, {
        mode,
        restoreDb: Boolean(restoreDb),
        restoreUploads: Boolean(restoreUploads),
        restoreEnv: Boolean(restoreEnv),
        restoreCerts: Boolean(restoreCerts),
        passphrase: passphrase || undefined,
      });

      res.status(202).json({ data: { jobId } });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'BACKUP_RESTORE_ERROR', error?.message || 'Failed to restore backup');
    }
  },

  async deleteBackup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await backupService.deleteBackup(id);
      res.json({ data: { deleted: true } });
    } catch (error: any) {
      throw new AppError(500, 'BACKUP_DELETE_ERROR', 'Failed to delete backup');
    }
  },

  // Get all users
  async getUsers(req: Request, res: Response) {
    try {
      const { limit = 10, offset = 0, role } = req.query;

      const where: any = {};
      if (role) {
        where.role = role;
      }

      const users = await prisma.user.findMany({
        where,
        skip: Number(offset),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const total = await prisma.user.count({ where });

      res.json({
        data: users,
        total,
        limit: Number(limit),
        offset: Number(offset),
      });
    } catch (error: any) {
      throw new AppError(500, 'USERS_ERROR', 'Failed to fetch users');
    }
  },

  // Get user by ID
  async getUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }

      res.json({ data: user });
    } catch (error: any) {
      throw new AppError(500, 'USER_ERROR', 'Failed to fetch user');
    }
  },

  // Update user
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, role, email, password, username } = req.body;

      // Prepare update data
      const updateData: any = {};
      if (name) updateData.name = name;
      if (role) updateData.role = role;

      // Handle email update
      if (email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser && existingUser.id !== id) {
          throw new AppError(409, 'EMAIL_EXISTS', 'User with this email already exists');
        }
        updateData.email = email;
      }

      // Handle username update
      if (username) {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser && existingUser.id !== id) {
          throw new AppError(409, 'USERNAME_EXISTS', 'User with this username already exists');
        }
        updateData.username = username;
      }

      // Handle password update
      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true, // Select username to return
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ data: user });
    } catch (error: any) {
      throw new AppError(500, 'USER_UPDATE_ERROR', 'Failed to update user');
    }
  },

  // Delete user
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.user.delete({
        where: { id },
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      throw new AppError(500, 'USER_DELETE_ERROR', 'Failed to delete user');
    }
  },

  // Create user
  async createUser(req: Request, res: Response) {
    try {
      const { email, password, name, role, username } = req.body;

      if (!password || !name) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Password and name are required');
      }
      if (!email && !username) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Either Email or Username is required');
      }

      if (email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          throw new AppError(409, 'EMAIL_EXISTS', 'User with this email already exists');
        }
      }
      if (username) {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
          throw new AppError(409, 'USERNAME_EXISTS', 'User with this username already exists');
        }
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          name,
          role: role || 'AUTHOR',
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({ data: user });
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'USER_CREATE_ERROR', 'Failed to create user');
    }
  },

  // Update Settings (Admin's siteSettings)
  async updateSettings(req: Request, res: Response) {
    try {
      const { heroTitle, heroDescription, enableRegistration, aboutArticleId } = req.body;
      // Assume req.user.userId is available from Auth middleware
      // But maybe we should update the ADMIN user's settings regardless of who calls? 
      // No, caller must be admin (guaranteed by route middleware).
      // Check if admin user exists, or update the caller?
      // Let's update the caller, assuming they are admin.

      // Fetch current settings to merge
      // Actually, we can use JSON merge or just replace. 
      // Let's fetch first.
      const userId = (req as any).user.userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      const currentSettings = (user?.siteSettings as any) || {};
      const newSettings = {
        ...currentSettings,
        ...req.body // simplistic merge
      };

      // Handle top-level fields
      if (req.body.siteUrl !== undefined) {
        newSettings.siteUrl = typeof req.body.siteUrl === 'string' ? req.body.siteUrl : '';
      }

      if (req.body.siteUrls !== undefined) {
        newSettings.siteUrls = normalizeSiteUrls(req.body.siteUrls, newSettings.siteUrl);
      }

      const allowedFields = ['siteName', 'siteDescription', 'contactEmail', 'socialLinks', 'seo'];
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          newSettings[field] = req.body[field];
        }
      });

      if (heroTitle !== undefined) newSettings.heroTitle = heroTitle;
      if (heroDescription !== undefined) newSettings.heroDescription = heroDescription;

      // Handle nested features
      if (!newSettings.features) newSettings.features = {};
      if (enableRegistration !== undefined) newSettings.features.enableRegistration = enableRegistration;
      if (req.body.features) {
        newSettings.features = { ...newSettings.features, ...req.body.features };
      }

      if (aboutArticleId !== undefined) newSettings.aboutArticleId = aboutArticleId;

      await prisma.user.update({
        where: { id: userId },
        data: { siteSettings: newSettings }
      });

      res.json({ data: newSettings });

    } catch (error: any) {
      throw new AppError(500, 'SETTINGS_UPDATE_ERROR', 'Failed to update settings');
    }
  },

  // Get Public Settings
  async getPublicSettings(req: Request, res: Response) {
    try {
      // Fetch all admins and find the one with the most papers
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: {
          _count: {
            select: { papers: true }
          }
        }
      });

      if (!admins.length) {
        return res.json({ data: {} });
      }

      // Sort by paper count descending to find the "Active" admin
      const admin = admins.sort((a, b) => b._count.papers - a._count.papers)[0];

      const settings: any = (admin.siteSettings as any) || {};

      // Fix potential [object Object] corruption or missing fields
       const cleanSettings = {
         ...settings,
         siteUrl: typeof settings.siteUrl === 'string' ? settings.siteUrl : '',
         siteUrls: Array.isArray(settings.siteUrls)
           ? normalizeSiteUrls(settings.siteUrls, settings.siteUrl)
           : [],
         id: admin.id
       };

      res.json({ data: cleanSettings });
    } catch (error: any) {
      throw new AppError(500, 'SETTINGS_ERROR', 'Failed to fetch settings');
    }
  }
};
