/**
 * Enhanced error handling with structured error types and context
 */

export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  ABORT_ERROR = 'ABORT_ERROR',

  // Network and scraping errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SCRAPING_ERROR = 'SCRAPING_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  SELECTOR_ERROR = 'SELECTOR_ERROR',

  // Browser automation errors
  BROWSER_LAUNCH_ERROR = 'BROWSER_LAUNCH_ERROR',
  PAGE_NAVIGATION_ERROR = 'PAGE_NAVIGATION_ERROR',
  ELEMENT_NOT_FOUND_ERROR = 'ELEMENT_NOT_FOUND_ERROR',

  // MCP protocol errors
  MCP_TOOL_NOT_FOUND = 'MCP_TOOL_NOT_FOUND',
  MCP_INVALID_ARGUMENTS = 'MCP_INVALID_ARGUMENTS',
  MCP_EXECUTION_ERROR = 'MCP_EXECUTION_ERROR',

  // Business logic errors
  LISTING_NOT_FOUND = 'LISTING_NOT_FOUND',
  SEARCH_FAILED = 'SEARCH_FAILED',
  INVALID_FILTER_CRITERIA = 'INVALID_FILTER_CRITERIA',
}

export interface ErrorContext {
  readonly operation?: string;
  readonly component?: string;
  readonly url?: string;
  readonly selector?: string;
  readonly duration?: number;
  readonly retryCount?: number;
  readonly metadata?: Record<string, unknown>;
}

export abstract class BaseError extends Error {
  abstract readonly code: ErrorCode;

  constructor(
    message: string,
    public readonly context?: ErrorContext,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintain proper stack trace for where our error was thrown (Node.js only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }
}

export class ValidationError extends BaseError {
  readonly code = ErrorCode.VALIDATION_ERROR;

  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(`Validation failed: ${message}`, context, cause);
  }
}

export class TimeoutError extends BaseError {
  readonly code = ErrorCode.TIMEOUT_ERROR;

  constructor(timeoutMs: number, operation?: string, context?: ErrorContext, cause?: Error) {
    const message = operation
      ? `Operation "${operation}" timed out after ${timeoutMs}ms`
      : `Operation timed out after ${timeoutMs}ms`;

    super(message, { ...context, operation, duration: timeoutMs }, cause);
  }
}

export class AbortError extends BaseError {
  readonly code = ErrorCode.ABORT_ERROR;

  constructor(operation?: string, context?: ErrorContext) {
    const message = operation ? `Operation "${operation}" was aborted` : 'Operation was aborted';

    super(message, { ...context, operation });
  }
}

export class NetworkError extends BaseError {
  readonly code = ErrorCode.NETWORK_ERROR;

  constructor(message: string, url?: string, context?: ErrorContext, cause?: Error) {
    super(`Network error: ${message}`, { ...context, url }, cause);
  }
}

export class ScrapingError extends BaseError {
  readonly code = ErrorCode.SCRAPING_ERROR;

  constructor(message: string, url?: string, context?: ErrorContext, cause?: Error) {
    super(`Scraping failed: ${message}`, { ...context, url }, cause);
  }
}

export class ParsingError extends BaseError {
  readonly code = ErrorCode.PARSING_ERROR;

  constructor(message: string, selector?: string, context?: ErrorContext, cause?: Error) {
    super(`Parsing failed: ${message}`, { ...context, selector }, cause);
  }
}

export class BrowserLaunchError extends BaseError {
  readonly code = ErrorCode.BROWSER_LAUNCH_ERROR;

  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(`Browser launch failed: ${message}`, context, cause);
  }
}

export class PageNavigationError extends BaseError {
  readonly code = ErrorCode.PAGE_NAVIGATION_ERROR;

  constructor(url: string, reason?: string, context?: ErrorContext, cause?: Error) {
    const message = reason
      ? `Failed to navigate to ${url}: ${reason}`
      : `Failed to navigate to ${url}`;

    super(message, { ...context, url }, cause);
  }
}

export class ElementNotFoundError extends BaseError {
  readonly code = ErrorCode.ELEMENT_NOT_FOUND_ERROR;

  constructor(selector: string, url?: string, context?: ErrorContext, cause?: Error) {
    super(`Element not found with selector: ${selector}`, { ...context, selector, url }, cause);
  }
}

export class MCPToolNotFoundError extends BaseError {
  readonly code = ErrorCode.MCP_TOOL_NOT_FOUND;

  constructor(toolName: string, context?: ErrorContext) {
    super(`MCP tool not found: ${toolName}`, { ...context, metadata: { toolName } });
  }
}

export class MCPInvalidArgumentsError extends BaseError {
  readonly code = ErrorCode.MCP_INVALID_ARGUMENTS;

  constructor(toolName: string, validationMessage: string, context?: ErrorContext) {
    super(`Invalid arguments for tool "${toolName}": ${validationMessage}`, {
      ...context,
      metadata: { toolName, validationMessage },
    });
  }
}

export class MCPExecutionError extends BaseError {
  readonly code = ErrorCode.MCP_EXECUTION_ERROR;

  constructor(toolName: string, executionMessage: string, context?: ErrorContext, cause?: Error) {
    super(
      `Tool execution failed for "${toolName}": ${executionMessage}`,
      { ...context, metadata: { toolName } },
      cause
    );
  }
}

export class ListingNotFoundError extends BaseError {
  readonly code = ErrorCode.LISTING_NOT_FOUND;

  constructor(listingId: string, context?: ErrorContext, cause?: Error) {
    super(`Listing not found: ${listingId}`, { ...context, metadata: { listingId } }, cause);
  }
}

export class SearchFailedError extends BaseError {
  readonly code = ErrorCode.SEARCH_FAILED;

  constructor(reason: string, context?: ErrorContext, cause?: Error) {
    super(`Search operation failed: ${reason}`, context, cause);
  }
}

// Error factory functions for common scenarios
export const createValidationError = (
  field: string,
  value: unknown,
  requirement: string,
  context?: ErrorContext
): ValidationError => {
  return new ValidationError(`Field "${field}" with value "${String(value)}" ${requirement}`, {
    ...context,
    metadata: { field, value, requirement },
  });
};

export const createNetworkError = (
  url: string,
  statusCode?: number,
  statusText?: string,
  context?: ErrorContext,
  cause?: Error
): NetworkError => {
  const message = statusCode
    ? `HTTP ${statusCode} ${statusText || ''} for ${url}`.trim()
    : `Network request failed for ${url}`;

  return new NetworkError(
    message,
    url,
    { ...context, metadata: { statusCode, statusText } },
    cause
  );
};

export const createScrapingError = (
  operation: string,
  url: string,
  details?: string,
  context?: ErrorContext,
  cause?: Error
): ScrapingError => {
  const message = details ? `${operation} failed: ${details}` : `${operation} failed`;

  return new ScrapingError(message, url, { ...context, operation }, cause);
};

// Error classification utilities
export const isRetryableError = (error: Error): boolean => {
  if (error instanceof BaseError) {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.PAGE_NAVIGATION_ERROR,
      ErrorCode.BROWSER_LAUNCH_ERROR,
    ].includes(error.code);
  }

  // Check for common retryable error patterns
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound')
  );
};

export const isUserError = (error: Error): boolean => {
  if (error instanceof BaseError) {
    return [
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.MCP_INVALID_ARGUMENTS,
      ErrorCode.INVALID_FILTER_CRITERIA,
      ErrorCode.MCP_TOOL_NOT_FOUND,
    ].includes(error.code);
  }

  return false;
};

export const isCriticalError = (error: Error): boolean => {
  if (error instanceof BaseError) {
    return [ErrorCode.BROWSER_LAUNCH_ERROR].includes(error.code);
  }

  return false;
};

// Error aggregation for multiple failures
export class AggregateError extends BaseError {
  readonly code = ErrorCode.UNKNOWN_ERROR;

  constructor(
    public readonly errors: Error[],
    operation?: string,
    context?: ErrorContext
  ) {
    const message = operation
      ? `Multiple errors occurred during ${operation} (${errors.length} errors)`
      : `Multiple errors occurred (${errors.length} errors)`;

    super(message, { ...context, operation, metadata: { errorCount: errors.length } });
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors.map(err => ({
        name: err.name,
        message: err.message,
        ...(err instanceof BaseError ? { code: err.code, context: err.context } : {}),
      })),
    };
  }
}

class GenericError extends BaseError {
  readonly code = ErrorCode.UNKNOWN_ERROR;

  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(message, context, cause);
  }
}

// Utility to wrap and enhance existing errors
export const wrapError = (error: unknown, operation: string, context?: ErrorContext): BaseError => {
  if (error instanceof BaseError) {
    // Already a structured error, just add operation context
    return new (error.constructor as new (...args: any[]) => BaseError)(
      error.message,
      { ...error.context, ...context, operation },
      error.cause
    );
  }

  if (error instanceof Error) {
    // Standard error, wrap with operation context
    return new GenericError(error.message, { ...context, operation }, error);
  }

  // Unknown error type, convert to string
  const message = String(error);
  return new GenericError(message, { ...context, operation });
};
