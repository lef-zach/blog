import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  // Connected successfully
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

// Test Redis connection
export const connectRedis = async () => {
  try {
    await redis.ping();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    // process.exit(1); // Continuing without Redis
  }
};

export { redis };
