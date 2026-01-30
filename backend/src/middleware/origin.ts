import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AppError } from './error';

export const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
    // Only check state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.headers['origin'];

    // If no origin header (e.g. server-to-server or curl), we might allow it 
    // depending on strictness. For browser CSRF, origin is always present on mutations.
    // If undefined, it's likely a script. We can block if we want strictness, 
    // but for now let's only validate if present to avoid breaking tools.
    // Requirement said "origin checks", implying we SHOULD check if it matches allowed.

    if (origin) {
        const allowed = config.cors.origin; // Re-use CORS allowed list

        const isAllowed = Array.isArray(allowed) ? allowed.includes(origin) : allowed === origin;

        if (!isAllowed) {
            // Allow localhost for dev testing if not strictly in config? 
            // Assuming config takes care of environment.
            return next(new AppError(403, 'FORBIDDEN', 'Invalid Origin'));
        }
    }

    next();
};
