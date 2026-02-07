import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/error.util';

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

export const profileController = {
  // Get profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;

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
          siteSettings: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }

      // Default settings
      const defaultSettings = {
        siteName: user.name,
        siteDescription: user.bio || '',
        siteUrl: '',
        siteUrls: [],
        contactEmail: user.email,
        socialLinks: user.socialLinks || {
          github: null,
          linkedin: null,
          twitter: null,
          googleScholar: null,
          orcid: null,
        },
        seo: {
          metaTitle: '',
          metaDescription: '',
          ogImage: '',
        },
        features: {
          enableComments: false,
          enableAnalytics: false,
          enableNewsletter: false,
          enableRegistration: true,
        },
      };

      // Merge saved settings with defaults
      const savedSettings = (user.siteSettings as any) || {};

      res.json({
        data: {
          ...defaultSettings,
          ...savedSettings,
          // Always ensure socialLinks and other critical fields from user profile take precedence if not in settings?
          // Actually, let's allow siteSettings to override or act as the source of truth for the settings page.
          // But for now, let's keep the user.name/email as fallbacks if siteSettings are empty
          siteName: savedSettings.siteName || user.name,
          siteDescription: savedSettings.siteDescription || user.bio || '',
          contactEmail: savedSettings.contactEmail || user.email,
          siteUrls: Array.isArray(savedSettings.siteUrls)
            ? normalizeSiteUrls(savedSettings.siteUrls, savedSettings.siteUrl)
            : [],
        },
      });
    } catch (error: any) {
      next(error);
    }
  },

  // Update profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const {
        siteName,
        siteDescription,
        contactEmail,
        socialLinks,
        seo,
        features,
        siteUrl,
        siteUrls,
        scholarUrl,
        aboutArticleId
      } = req.body;

      // We update siteSettings and related profile fields without overwriting user identity
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          scholarUrl: scholarUrl, // Update root field (pass null to clear)
          socialLinks: socialLinks || {},
          siteSettings: {
            siteName,
            siteDescription,
            siteUrl,
            siteUrls: normalizeSiteUrls(siteUrls, siteUrl),
            contactEmail,
            socialLinks: socialLinks || {},
            seo,
            features,
            aboutArticleId
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          bio: true,
          avatar: true,
          socialLinks: true,
          siteSettings: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const siteSettings = (user.siteSettings as any) || {};

      res.json({
        data: {
          siteName: siteSettings.siteName || user.name,
          siteDescription: siteSettings.siteDescription || user.bio || '',
          siteUrl: siteSettings.siteUrl || '',
          siteUrls: Array.isArray(siteSettings.siteUrls)
            ? normalizeSiteUrls(siteSettings.siteUrls, siteSettings.siteUrl)
            : [],
          contactEmail: siteSettings.contactEmail || user.email,
          socialLinks: siteSettings.socialLinks || user.socialLinks || {},
          seo: siteSettings.seo || {},
          features: siteSettings.features || {},
          aboutArticleId: siteSettings.aboutArticleId || null,
        },
      });
    } catch (error: any) {
      next(error);
    }
  },

  // Get public settings (for frontend)
  async getPublicSettings(req: Request, res: Response, next: NextFunction) {
    try {
      // Find the admin user (assuming single tenant/admin for now)
      // Find all admin users and pick the one with the most papers
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        include: {
          _count: {
            select: { papers: true }
          }
        },
      });

      if (!admins.length) {
        throw new AppError(404, 'ADMIN_NOT_FOUND', 'Admin user not found');
      }

      // Sort by paper count desc
      const user = admins.sort((a, b) => b._count.papers - a._count.papers)[0];

      // Default settings
      const defaultSettings = {
        siteName: user.name,
        siteDescription: user.bio || '',
        siteUrl: '',
        siteUrls: [],
        contactEmail: user.email,
        socialLinks: user.socialLinks || {
          github: null,
          linkedin: null,
          twitter: null,
          googleScholar: null,
          orcid: null,
        },
        seo: {
          metaTitle: '',
          metaDescription: '',
          ogImage: '',
        },
        features: {
          enableComments: false,
          enableAnalytics: false,
          enableNewsletter: false,
          enableRegistration: true,
        },
      };

      // Merge saved settings with defaults
      const savedSettings = (user.siteSettings as any) || {};

      res.json({
        data: {
          id: user.id, // Include user ID so frontend can fetch papers/articles
          ...defaultSettings,
          ...savedSettings,
          siteName: savedSettings.siteName || user.name,
          siteDescription: savedSettings.siteDescription || user.bio || '',
          contactEmail: savedSettings.contactEmail || user.email,
          siteUrls: Array.isArray(savedSettings.siteUrls)
            ? normalizeSiteUrls(savedSettings.siteUrls, savedSettings.siteUrl)
            : [],
        },
      });
    } catch (error: any) {
      next(error);
    }
  },
};

