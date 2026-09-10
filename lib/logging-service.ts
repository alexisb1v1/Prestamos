/**
 * Centralized Logging Service
 * Replaces direct console.log and console.error calls across the application.
 */

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

class LoggingService {
    private static instance: LoggingService;

    private constructor() {}

    public static getInstance(): LoggingService {
        if (!LoggingService.instance) {
            LoggingService.instance = new LoggingService();
        }
        return LoggingService.instance;
    }

    /**
     * Log informative messages
     */
    public info(message: string, ...args: unknown[]): void {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${LogLevel.INFO}] ${message}`, ...args);
        }
        // Potential extension: send to Sentry, LogRocket, etc.
    }

    /**
     * Log warning messages
     */
    public warn(message: string, ...args: unknown[]): void {
        console.warn(`[${LogLevel.WARN}] ${message}`, ...args);
    }

    /**
     * Log error messages
     */
    public error(message: string, error?: unknown, ...args: unknown[]): void {
        console.error(`[${LogLevel.ERROR}] ${message}`, error, ...args);
        
        // Potential extension: error reporting service
        if (process.env.NODE_ENV === 'production') {
            // example: Sentry.captureException(error);
        }
    }
}

export const logger = LoggingService.getInstance();
