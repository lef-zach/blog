import crypto from 'crypto';
import type { Request } from 'express';
import maxmind, { CityResponse, Reader } from 'maxmind';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { config } from '../config';

type GeoResult = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
};

const botRegex = /bot|crawler|spider|crawling|facebookexternalhit|linkedinbot|twitterbot|slackbot|whatsapp|telegram|discordbot|curl|wget|python-requests/i;

let maxmindReader: Reader<CityResponse> | null = null;
let maxmindInitPromise: Promise<Reader<CityResponse> | null> | null = null;

const getMaxmindReader = async () => {
  if (maxmindReader) return maxmindReader;
  if (maxmindInitPromise) return maxmindInitPromise;

  if (!config.analytics.maxmindDbPath) {
    return null;
  }

  maxmindInitPromise = maxmind
    .open<CityResponse>(config.analytics.maxmindDbPath)
    .then((reader) => {
      maxmindReader = reader;
      return reader;
    })
    .catch(() => null);

  return maxmindInitPromise;
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

const getReferrerDomain = (referrer?: string | null) => {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    return url.hostname.toLowerCase().slice(0, 255);
  } catch {
    return null;
  }
};

const startOfDayUtc = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const hashIp = (ip?: string | null) => {
  if (!ip) return null;
  return crypto
    .createHmac('sha256', config.analytics.ipHashSalt)
    .update(ip)
    .digest('hex');
};

const encryptIp = (ip?: string | null) => {
  if (!ip) return null;
  if (!config.analytics.storeIpEncrypted || !config.analytics.ipEncryptionKey) return null;

  const key = crypto
    .createHash('sha256')
    .update(config.analytics.ipEncryptionKey)
    .digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(ip, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
};

const decryptIp = (payload: string) => {
  if (!config.analytics.allowIpDecrypt || !config.analytics.ipEncryptionKey) {
    throw new Error('IP decryption is not enabled');
  }

  const key = crypto
    .createHash('sha256')
    .update(config.analytics.ipEncryptionKey)
    .digest();

  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

const isBotRequest = (req: Request) => {
  if (!config.analytics.excludeBots) return false;
  const ua = req.headers['user-agent'];
  if (typeof ua !== 'string') return false;
  return botRegex.test(ua);
};

const hasConsent = (req: Request) => {
  if (!config.analytics.requireConsent) return true;
  const consent = req.cookies?.analytics_consent;
  return consent === '1' || consent === 'true' || consent === 'yes';
};

const resolveGeo = async (req: Request): Promise<GeoResult> => {
  const provider = config.analytics.geoProvider.toLowerCase();

  if (provider === 'cloudflare') {
    const countryHeader = req.headers['cf-ipcountry'];
    const country = typeof countryHeader === 'string' && countryHeader !== 'XX'
      ? countryHeader
      : null;
    return { country, region: null, city: null };
  }

  if (provider === 'maxmind') {
    const reader = await getMaxmindReader();
    if (!reader) return { country: null, region: null, city: null };

    const ip = getClientIp(req);
    const result = ip ? reader.get(ip) : null;
    if (!result) return { country: null, region: null, city: null };

    const country = result.country?.iso_code || null;
    const region = result.subdivisions?.[0]?.names?.en || null;
    const city = result.city?.names?.en || null;
    return { country, region, city };
  }

  return { country: null, region: null, city: null };
};

const isInternalRequest = (req: Request) => {
  const header = req.headers['x-internal-request'];
  if (typeof header === 'string') {
    return header === '1' || header.toLowerCase() === 'true';
  }
  return false;
};

let lastAnalyticsPruneAt: number | null = null;

const pruneAnalytics = async () => {
  const retentionDays = config.analytics.retentionDays;
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;

  const now = Date.now();
  if (lastAnalyticsPruneAt && now - lastAnalyticsPruneAt < 60 * 60 * 1000) return;
  lastAnalyticsPruneAt = now;

  const cutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.pageViewEvent.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.dailyArticleUniqueVisitor.deleteMany({ where: { date: { lt: cutoff } } }),
    prisma.dailySiteUniqueVisitor.deleteMany({ where: { date: { lt: cutoff } } }),
    prisma.dailyArticleAnalytics.deleteMany({ where: { date: { lt: cutoff } } }),
    prisma.dailySiteAnalytics.deleteMany({ where: { date: { lt: cutoff } } }),
  ]);
};

export const analyticsService = {
  async recordArticleView(req: Request, articleId: string) {
    if (isInternalRequest(req)) return;
    if (!hasConsent(req)) return;
    if (isBotRequest(req)) return;

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    if (!ipHash) return;

    const ipEncrypted = encryptIp(ip);
    const referrerDomain = getReferrerDomain(req.get('referer'));
    const userAgent = typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent'].slice(0, 512)
      : null;

    const now = new Date();
    const day = startOfDayUtc(now);
    const { country, region, city } = await resolveGeo(req);

    await prisma.$transaction(async (tx) => {
      await tx.pageViewEvent.create({
        data: {
          articleId,
          ipHash,
          ipEncrypted: ipEncrypted || null,
          country,
          region,
          city,
          userAgent,
          referrerDomain,
        },
      });

      await tx.article.update({
        where: { id: articleId },
        data: { views: { increment: 1 } },
      });

      await tx.dailyArticleAnalytics.upsert({
        where: { date_articleId: { date: day, articleId } },
        update: { views: { increment: 1 } },
        create: { date: day, articleId, views: 1, uniqueVisitors: 0 },
      });

      await tx.dailySiteAnalytics.upsert({
        where: { date: day },
        update: { views: { increment: 1 } },
        create: { date: day, views: 1, uniqueVisitors: 0 },
      });

      let articleUnique = false;
      try {
        await tx.dailyArticleUniqueVisitor.create({
          data: { date: day, articleId, ipHash },
        });
        articleUnique = true;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error;
        }
      }

      if (articleUnique) {
        await tx.dailyArticleAnalytics.update({
          where: { date_articleId: { date: day, articleId } },
          data: { uniqueVisitors: { increment: 1 } },
        });
      }

      let siteUnique = false;
      try {
        await tx.dailySiteUniqueVisitor.create({
          data: { date: day, ipHash },
        });
        siteUnique = true;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error;
        }
      }

      if (siteUnique) {
        await tx.dailySiteAnalytics.update({
          where: { date: day },
          data: { uniqueVisitors: { increment: 1 } },
        });
      }
    });

    await pruneAnalytics();
  },

  decryptIpEncrypted(payload: string) {
    return decryptIp(payload);
  },
};
