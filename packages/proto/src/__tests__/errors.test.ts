import { describe, it, expect } from 'vitest';
import {
  AuthError,
  PermissionError,
  NetworkError,
  LogicError,
  InternalError,
  isClassifiedError,
  isErrorType,
  classifyHttpError,
  classifyFileError,
  ensureClassified,
} from '../errors.js';

describe('ClassifiedError types', () => {
  it('AuthError has correct type and fields', () => {
    const err = new AuthError('Token expired', {
      serviceId: 'gmail',
      accountId: 'test@gmail.com',
      errorCode: 'invalid_grant',
    });
    expect(err.type).toBe('auth');
    expect(err.serviceId).toBe('gmail');
    expect(err.accountId).toBe('test@gmail.com');
    expect(err.errorCode).toBe('invalid_grant');
    expect(err.message).toBe('Token expired');
    expect(err.name).toBe('AuthError');
    expect(err instanceof Error).toBe(true);
  });

  it('PermissionError has correct type', () => {
    const err = new PermissionError('Access denied');
    expect(err.type).toBe('permission');
    expect(isClassifiedError(err)).toBe(true);
  });

  it('NetworkError includes statusCode', () => {
    const err = new NetworkError('Service unavailable', { statusCode: 503 });
    expect(err.type).toBe('network');
    expect(err.statusCode).toBe(503);
  });

  it('LogicError has correct type', () => {
    const err = new LogicError('Bad parameter');
    expect(err.type).toBe('logic');
  });

  it('InternalError has correct type', () => {
    const err = new InternalError('Unexpected state');
    expect(err.type).toBe('internal');
  });
});

describe('isClassifiedError', () => {
  it('returns true for classified errors', () => {
    expect(isClassifiedError(new LogicError('test'))).toBe(true);
  });

  it('returns false for regular errors', () => {
    expect(isClassifiedError(new Error('test'))).toBe(false);
  });

  it('returns false for non-errors', () => {
    expect(isClassifiedError('string')).toBe(false);
    expect(isClassifiedError(null)).toBe(false);
  });
});

describe('isErrorType', () => {
  it('matches correct error type', () => {
    const err = new NetworkError('timeout');
    expect(isErrorType(err, 'network')).toBe(true);
    expect(isErrorType(err, 'auth')).toBe(false);
  });
});

describe('classifyHttpError', () => {
  it('maps 401 to InternalError', () => {
    const err = classifyHttpError(401, 'Unauthorized');
    expect(err.type).toBe('internal');
  });

  it('maps 403 to PermissionError', () => {
    const err = classifyHttpError(403, 'Forbidden');
    expect(err.type).toBe('permission');
  });

  it('maps 500 to NetworkError', () => {
    const err = classifyHttpError(500, 'Internal Server Error');
    expect(err.type).toBe('network');
  });

  it('maps 429 to NetworkError', () => {
    const err = classifyHttpError(429, 'Rate limited');
    expect(err.type).toBe('network');
  });

  it('maps 400 to LogicError', () => {
    const err = classifyHttpError(400, 'Bad Request');
    expect(err.type).toBe('logic');
  });

  it('maps 404 to LogicError', () => {
    const err = classifyHttpError(404, 'Not Found');
    expect(err.type).toBe('logic');
  });
});

describe('classifyFileError', () => {
  it('maps EACCES to PermissionError', () => {
    const err = Object.assign(new Error('EACCES'), { code: 'EACCES' });
    expect(classifyFileError(err as NodeJS.ErrnoException).type).toBe('permission');
  });

  it('maps ENOENT to LogicError', () => {
    const err = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    expect(classifyFileError(err as NodeJS.ErrnoException).type).toBe('logic');
  });

  it('maps ECONNREFUSED to NetworkError', () => {
    const err = Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' });
    expect(classifyFileError(err as NodeJS.ErrnoException).type).toBe('network');
  });
});

describe('ensureClassified', () => {
  it('returns classified errors as-is', () => {
    const err = new LogicError('test');
    expect(ensureClassified(err)).toBe(err);
  });

  it('wraps regular errors as InternalError', () => {
    const err = ensureClassified(new Error('oops'));
    expect(err.type).toBe('internal');
    expect(err.message).toBe('oops');
  });

  it('wraps non-errors as InternalError', () => {
    const err = ensureClassified('some string');
    expect(err.type).toBe('internal');
    expect(err.message).toContain('some string');
  });
});
