import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    expiresIn: '15m',
    refreshExpiresIn: '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5000'],
    credentials: true,
  },

  upload: {
    maxFileSize: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  },

  shortLinks: {
    hashSalt: process.env.SHORTLINK_HASH_SALT || process.env.JWT_SECRET || 'change-me',
    codeLength: parseInt(process.env.SHORTLINK_CODE_LENGTH || '6', 10),
    eventRetentionDays: parseInt(process.env.SHORTLINK_RETENTION_DAYS || '90', 10),
    referrerLimit: parseInt(process.env.SHORTLINK_REFERRER_LIMIT || '10', 10),
  },
};
