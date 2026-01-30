import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const correlationId = req.id;

    // Log request start
    logger.info({
        event: 'request_start',
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        correlationId,
    });

    // Log response finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            event: 'request_end',
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            correlationId,
        });
    });

    next();
};
