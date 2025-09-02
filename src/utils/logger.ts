/**
 * Enhanced logging infrastructure with structured logging support
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  readonly component?: string;
  readonly operation?: string;
  readonly duration?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface LogEntry {
  readonly timestamp: Date;
  readonly level: LogLevel;
  readonly message: string;
  readonly context?: LogContext;
  readonly error?: Error;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): Logger;
}

class ConsoleLogger implements Logger {
  constructor(
    private readonly level: LogLevel = LogLevel.INFO,
    private readonly baseContext: LogContext = {}
  ) {}

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger(this.level, {
      ...this.baseContext,
      ...context,
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.baseContext, ...context },
      error,
    };

    this.writeEntry(entry);
  }

  private writeEntry(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? this.formatContext(entry.context) : '';

    let logMessage = `[${timestamp}] ${levelName}: ${entry.message}`;

    if (contextStr) {
      logMessage += ` ${contextStr}`;
    }

    if (entry.error) {
      logMessage += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        logMessage += `\nStack: ${entry.error.stack}`;
      }
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }
  }

  private formatContext(context: LogContext): string {
    const parts: string[] = [];

    if (context.component) {
      parts.push(`component=${context.component}`);
    }

    if (context.operation) {
      parts.push(`operation=${context.operation}`);
    }

    if (context.duration !== undefined) {
      parts.push(`duration=${context.duration}ms`);
    }

    if (context.metadata) {
      const metadataStr = Object.entries(context.metadata)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(' ');
      if (metadataStr) {
        parts.push(metadataStr);
      }
    }

    return parts.length > 0 ? `[${parts.join(' ')}]` : '';
  }
}

// Performance measurement utilities
export const measurePerformance = <T>(
  operation: () => Promise<T>,
  logger: Logger,
  operationName: string,
  context?: LogContext
) => {
  return async (): Promise<T> => {
    const startTime = Date.now();

    logger.debug(`Starting ${operationName}`, context);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      logger.info(`Completed ${operationName}`, {
        ...context,
        duration,
        operation: operationName,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(
        `Failed ${operationName}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          ...context,
          duration,
          operation: operationName,
        }
      );

      throw error;
    }
  };
};

// Singleton logger instance
let globalLogger: Logger | undefined;

export const createLogger = (level: LogLevel = LogLevel.INFO): Logger => {
  return new ConsoleLogger(level);
};

export const getLogger = (): Logger => {
  if (!globalLogger) {
    const level = process.env['LOG_LEVEL']
      ? (LogLevel[process.env['LOG_LEVEL'] as keyof typeof LogLevel] ?? LogLevel.INFO)
      : LogLevel.INFO;

    globalLogger = createLogger(level);
  }

  return globalLogger;
};

export const setLogger = (logger: Logger): void => {
  globalLogger = logger;
};

// Structured logging helpers for common scenarios
export const logOperationStart = (
  logger: Logger,
  operation: string,
  context?: LogContext
): void => {
  logger.info(`Starting ${operation}`, { ...context, operation });
};

export const logOperationSuccess = (
  logger: Logger,
  operation: string,
  duration?: number,
  context?: LogContext
): void => {
  logger.info(`Successfully completed ${operation}`, {
    ...context,
    operation,
    duration,
  });
};

export const logOperationError = (
  logger: Logger,
  operation: string,
  error: Error,
  duration?: number,
  context?: LogContext
): void => {
  logger.error(`Failed to complete ${operation}`, error, {
    ...context,
    operation,
    duration,
  });
};

// Request correlation ID utilities
const correlationIds = new WeakMap<object, string>();

export const setCorrelationId = (obj: object, id: string): void => {
  correlationIds.set(obj, id);
};

export const getCorrelationId = (obj: object): string | undefined => {
  return correlationIds.get(obj);
};

export const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Development debugging helpers
export const debugDump = (logger: Logger, data: unknown, label?: string): void => {
  if (logger instanceof ConsoleLogger) {
    const message = label ? `Debug dump - ${label}` : 'Debug dump';
    logger.debug(message, {
      metadata: { data: JSON.stringify(data, null, 2) },
    });
  }
};

export const createTimedLogger = (
  baseLogger: Logger,
  operationName: string
): {
  logger: Logger;
  finish: (success?: boolean) => void;
} => {
  const startTime = Date.now();
  const timedLogger = baseLogger.child({ operation: operationName });

  return {
    logger: timedLogger,
    finish: (success = true) => {
      const duration = Date.now() - startTime;
      if (success) {
        timedLogger.info(`Completed ${operationName}`, { duration });
      } else {
        timedLogger.warn(`Failed ${operationName}`, { duration });
      }
    },
  };
};
