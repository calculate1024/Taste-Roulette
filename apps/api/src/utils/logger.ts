// Structured logger for API — JSON output for Vercel, pretty for local dev

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  ...(isProduction
    ? {} // JSON output for Vercel
    : { transport: { target: 'pino/file', options: { destination: 1 } } } // stdout
  ),
});

// Convenience child loggers for each service
export const createLogger = (module: string) => logger.child({ module });
