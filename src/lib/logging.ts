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

// Project-specific loggers
const projectLoggers = new Map<string, pino.Logger>();

const getProjectLogger = (repoUrl: string) => {
    const date = new Date().toISOString().split('T')[0];
    const cleanRepoName = repoUrl.replace(/^https?:\/\//, '').replace(/^github\.com\//, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const key = `${cleanRepoName}_${date}`;

    if (!projectLoggers.has(key)) {
        const projectLogDir = path.join(LOG_DIR, 'projects');
        if (!fs.existsSync(projectLogDir)) {
            fs.mkdirSync(projectLogDir, { recursive: true });
        }

        const logger = pino(
            {
                name: cleanRepoName,
                level: 'debug',
                timestamp: pino.stdTimeFunctions.isoTime,
            },
            pino.destination({ dest: path.join(projectLogDir, `${key}.log`), sync: false })
        );
        projectLoggers.set(key, logger);
    }

    return projectLoggers.get(key)!;
};

// Convenience wrappers for common patterns
export const logApi = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: any) => {
    apiLogger[level](data || {}, msg);
    if (data?.repoUrl) getProjectLogger(data.repoUrl)[level](data, `[API] ${msg}`);
};

export const logAuth = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: any) => {
    authLogger[level](data || {}, msg);
    if (data?.repoUrl) getProjectLogger(data.repoUrl)[level](data, `[AUTH] ${msg}`);
};

export const logGeneration = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: any) => {
    generationLogger[level](data || {}, msg);
    if (data?.repoUrl) getProjectLogger(data.repoUrl)[level](data, `[GENERATION] ${msg}`);
};

export const logCache = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: any) => {
    cacheLogger[level](data || {}, msg);
    if (data?.repoUrl) getProjectLogger(data.repoUrl)[level](data, `[CACHE] ${msg}`);
};

export const logError = (category: string, msg: string, error?: Error, data?: any) => {
    const logger = category === 'API' ? apiLogger :
        category === 'AUTH' ? authLogger :
            category === 'GENERATION' ? generationLogger :
                category === 'CACHE' ? cacheLogger : apiLogger;

    const logData = { err: error, ...data };
    logger.error(logData, msg);

    if (data?.repoUrl) {
        getProjectLogger(data.repoUrl).error(logData, `[${category}] ${msg}`);
    }
};
