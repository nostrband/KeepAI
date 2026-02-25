/**
 * Error Classification System for KeepAI
 *
 * Adapted from ../keep.ai/packages/proto/src/errors.ts.
 * Simplified for KeepAI's needs (no ApiKeyError, BalanceError, WorkflowPausedError).
 */

export type ErrorType = 'auth' | 'permission' | 'network' | 'logic' | 'internal';

export abstract class ClassifiedError extends Error {
  abstract readonly type: ErrorType;
  readonly cause?: Error;
  readonly source?: string;

  constructor(message: string, options?: { cause?: Error; source?: string }) {
    super(message);
    this.name = this.constructor.name;
    this.cause = options?.cause;
    this.source = options?.source;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      type: this.type,
      name: this.name,
      message: this.message,
      source: this.source,
    };
  }
}

/**
 * Authentication error — OAuth expired, invalid credentials.
 * User must reconnect the service.
 */
export class AuthError extends ClassifiedError {
  readonly type = 'auth' as const;
  readonly serviceId: string;
  readonly accountId: string;
  readonly errorCode?: string;

  constructor(
    message: string,
    options: {
      cause?: Error;
      source?: string;
      serviceId: string;
      accountId: string;
      errorCode?: string;
    }
  ) {
    super(message, options);
    this.serviceId = options.serviceId;
    this.accountId = options.accountId;
    this.errorCode = options.errorCode;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      serviceId: this.serviceId,
      accountId: this.accountId,
      errorCode: this.errorCode,
    };
  }
}

/**
 * Permission error — access denied, insufficient OAuth scope.
 */
export class PermissionError extends ClassifiedError {
  readonly type = 'permission' as const;
}

/**
 * Network error — connection failed, timeout, service unavailable, rate limit.
 */
export class NetworkError extends ClassifiedError {
  readonly type = 'network' as const;
  readonly statusCode?: number;

  constructor(
    message: string,
    options?: { cause?: Error; source?: string; statusCode?: number }
  ) {
    super(message, options);
    this.statusCode = options?.statusCode;
  }

  toJSON() {
    return { ...super.toJSON(), statusCode: this.statusCode };
  }
}

/**
 * Logic error — bad params, client-side mistakes, unexpected data.
 */
export class LogicError extends ClassifiedError {
  readonly type = 'logic' as const;
}

/**
 * Internal error — bugs in our code, unexpected state.
 */
export class InternalError extends ClassifiedError {
  readonly type = 'internal' as const;
}

export function isClassifiedError(error: unknown): error is ClassifiedError {
  return error instanceof ClassifiedError;
}

export function isErrorType<T extends ErrorType>(
  error: unknown,
  type: T
): error is ClassifiedError & { type: T } {
  return isClassifiedError(error) && error.type === type;
}

/**
 * Classify an HTTP response error into a typed error.
 * Note: 401 is mapped to InternalError here because this generic classifier
 * doesn't know serviceId/accountId. Connector-specific code handles 401 → AuthError.
 */
export function classifyHttpError(
  statusCode: number,
  message: string,
  options?: { cause?: Error; source?: string }
): ClassifiedError {
  if (statusCode === 401) {
    return new InternalError(`Authentication failed (401): ${message}`, options);
  }
  if (statusCode === 403) {
    return new PermissionError(message, options);
  }
  if (statusCode >= 500 || statusCode === 408 || statusCode === 429) {
    return new NetworkError(message, { ...options, statusCode });
  }
  return new LogicError(message, options);
}

/**
 * Classify a file system error into a typed error.
 */
export function classifyFileError(
  err: NodeJS.ErrnoException,
  source?: string
): ClassifiedError {
  const code = err.code;
  if (code === 'EACCES' || code === 'EPERM') {
    return new PermissionError(`Access denied: ${err.message}`, { cause: err, source });
  }
  if (code === 'ENOENT') {
    return new LogicError(`File not found: ${err.message}`, { cause: err, source });
  }
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return new NetworkError(`Network error: ${err.message}`, { cause: err, source });
  }
  return new LogicError(err.message, { cause: err, source });
}

/**
 * Wrap an error in a ClassifiedError if it isn't already classified.
 */
export function ensureClassified(err: unknown, source?: string): ClassifiedError {
  if (isClassifiedError(err)) return err;
  if (err instanceof Error) {
    if ('code' in err && typeof (err as any).code === 'string') {
      return classifyFileError(err as NodeJS.ErrnoException, source);
    }
    return new InternalError(err.message, { cause: err, source });
  }
  return new InternalError(
    `Unclassified non-Error thrown${source ? ` in ${source}` : ''}: ${String(err)}`,
    { source }
  );
}
