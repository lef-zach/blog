import { PrismaClient } from '@prisma/client';
import { config } from './index';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.database.url,
    },
  },
});

// Test database connection
export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    // Database connected successfully
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

export { prisma };
