import { app } from './app';
import { logger } from './utils/logger';
import { config } from './config';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';

const PORT = config.port || 3001;

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Start server
    app.listen(PORT, () => {
      logger.info({ event: 'server_start', port: PORT, env: config.nodeEnv });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
