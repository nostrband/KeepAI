/**
 * Shared error classifier for fetch-based connectors.
 * Maps HTTP status codes to ClassifiedError types with service context.
 */

import { AuthError, NetworkError, PermissionError, LogicError } from '@keepai/proto';
import type { ClassifiedError } from '@keepai/proto';

export function classifyFetchError(
  status: number,
  message: string,
  service: string,
): ClassifiedError {
  if (status === 401) {
    return new AuthError(`${service} token is invalid or expired`, {
      source: service,
      serviceId: service,
      accountId: '',
    });
  }
  if (status === 403) {
    return new PermissionError(message, { source: service });
  }
  if (status === 429 || status === 408 || status >= 500) {
    return new NetworkError(message, { source: service, statusCode: status });
  }
  return new LogicError(message, { source: service });
}
