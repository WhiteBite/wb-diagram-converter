/**
 * Logger utility
 * 
 * Centralized logging with context support
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

interface LoggerConfig {
    enabled: boolean;
    minLevel: LogLevel;
    prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const config: LoggerConfig = {
    enabled: process.env.NODE_ENV !== 'production',
    minLevel: 'info',
    prefix: '[wb-diagrams]',
};

function shouldLog(level: LogLevel): boolean {
    return config.enabled && LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${config.prefix} ${timestamp} [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
    debug(message: string, context?: LogContext): void {
        if (shouldLog('debug')) {
            console.debug(formatMessage('debug', message, context));
        }
    },

    info(message: string, context?: LogContext): void {
        if (shouldLog('info')) {
            console.info(formatMessage('info', message, context));
        }
    },

    warn(message: string, context?: LogContext): void {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', message, context));
        }
    },

    error(message: string, context?: LogContext): void {
        if (shouldLog('error')) {
            console.error(formatMessage('error', message, context));
        }
    },

    /** Configure logger settings */
    configure(options: Partial<LoggerConfig>): void {
        Object.assign(config, options);
    },

    /** Enable/disable logging */
    setEnabled(enabled: boolean): void {
        config.enabled = enabled;
    },

    /** Set minimum log level */
    setLevel(level: LogLevel): void {
        config.minLevel = level;
    },
};
