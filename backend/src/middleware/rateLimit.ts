import rateLimit from 'express-rate-limit';

// Helper to log blocked requests
const logBlockedRequest = (req: any, res: any, next: any, options: any) => {
  console.warn(`[RateLimit] Blocked request from IP: ${req.ip} to ${req.originalUrl}`);
  res.status(options.statusCode).json(options.message);
};

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again later',
    },
  },
  handler: logBlockedRequest,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts, please try again later',
    },
  },
  handler: logBlockedRequest,
});

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 write operations per 15 minutes
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many write attempts, please try again later',
    },
  },
  handler: logBlockedRequest,
});
