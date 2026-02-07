import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './controllers/auth.controller';
import { AppError } from './middleware/error';
import { articleRouter } from './controllers/article.controller';
import { paperRouter } from './controllers/paper.controller';
import { adminRouter } from './controllers/admin.router';
import { profileRouter } from './controllers/profile.router';
import { newsletterRouter } from './controllers/newsletter.router';
import { errorHandler } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import { validateOrigin } from './middleware/origin';
import { config } from './config';
import cookieParser from 'cookie-parser';

import { requestId } from './middleware/request-id';
import { requestLogger } from './middleware/request-logger';

const app: Application = express();

app.use(requestId);
app.use(requestLogger);

// Cookie parser
app.use(cookieParser());

// Security middleware
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // Add 'unsafe-inline' if needed for specific inline scripts, but try strict first
      styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline often needed for CSS-in-JS or global styles
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  xContentTypeOptions: true, // nosniff
}));

// Explicit Permissions-Policy since Helmet doesn't have a dedicated top-level key for it yet in some versions, 
// or it's part of strict headers. Let's add it manually or via helmet if supported. 
// Helmet 4+ supports it via 'helmet.permissionsPolicy' but usually middleware is better for custom headers if strict.
// Actually, helmet has `crossOriginEmbedderPolicy`, `crossOriginOpenerPolicy`, etc.
// For Permissions-Policy specifically, we can use a custom middleware or check if helmet specific config supports it nicely.
// A simple custom middleware for Permissions-Policy is often cleaner.
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  next();
});

// CORS configuration - handle multiple origins
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in the allowed list
    if (Array.isArray(config.cors.origin) && config.cors.origin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new AppError(403, 'FORBIDDEN', 'Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Rate limiting
app.use(apiLimiter);
app.use(validateOrigin);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/articles', articleRouter);
app.use('/api/v1/papers', paperRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/newsletter', newsletterRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

export { app };
