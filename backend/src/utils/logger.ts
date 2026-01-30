import winston from 'winston';

const SENSITIVE_KEYS = ['password', 'token', 'accessToken', 'refreshToken', 'cookie', 'authorization'];

const redactor = winston.format((info) => {
    const redact = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;

        // Handle specific fields in the root info object if needed, matching SENSITIVE_KEYS
        // But usually we recurse.

        // Perform shallow check for performance optimization if possible, but deep is safer
        const newObj = Array.isArray(obj) ? [] : {};

        for (const key in obj) {
            if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
                (newObj as any)[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
                (newObj as any)[key] = redact(obj[key]);
            } else {
                (newObj as any)[key] = obj[key];
            }
        }
        return newObj;
    };

    // We only want to redact the 'message' if it's an object, or the metadata
    // Winston info object: { level, message, ...meta }

    // Redact everything except level and maybe message string if it's just text
    // Coping logic
    const { level, message, [Symbol.for('level')]: symLevel, [Symbol.for('message')]: symMessage, ...meta } = info;

    const redactedMeta = redact(meta);

    return { ...info, ...redactedMeta };
});

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        redactor(),
        winston.format.json()
    ),
    defaultMeta: { service: 'auth-service' },
    transports: [
        new winston.transports.Console()
    ],
});
