import pino from 'pino';
import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create separate loggers for different concerns
const createLogger = (name: string) => pino(
    {
        name,
        level: 'debug',
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.destination({ dest: path.join(LOG_DIR, `${name}.log`), sync: false })
);

// Export category-specific loggers
export const apiLogger = createLogger('api');
export const authLogger = createLogger('auth');
export const generationLogger = createLogger('generation');
export const cacheLogger = createLogger('cache');

// Convenience wrappers for common patterns
export const logApi = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: object) =>
    apiLogger[level](data || {}, msg);

export const logAuth = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: object) =>
    authLogger[level](data || {}, msg);

export const logGeneration = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: object) =>
    generationLogger[level](data || {}, msg);

export const logCache = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: object) =>
    cacheLogger[level](data || {}, msg);

export const logError = (category: string, msg: string, error?: Error) => {
    const logger = category === 'API' ? apiLogger :
        category === 'AUTH' ? authLogger :
            category === 'GENERATION' ? generationLogger :
                category === 'CACHE' ? cacheLogger : apiLogger;

    logger.error({ err: error }, msg);
};
