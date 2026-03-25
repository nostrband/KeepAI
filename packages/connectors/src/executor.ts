/**
 * ConnectorExecutor — central registry and dispatcher for all connectors.
 *
 * Validates service/method, extracts permission metadata, delegates execution,
 * and provides help information.
 */

import type {
  Connector,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
} from '@keepai/proto';
import {
  isClassifiedError,
  AuthError,
  NetworkError,
  PermissionError,
  LogicError,
} from '@keepai/proto';

export class ConnectorExecutor {
  private connectors = new Map<string, Connector>();

  register(connector: Connector): void {
    this.connectors.set(connector.service, connector);
  }

  getConnector(service: string): Connector | undefined {
    return this.connectors.get(service);
  }

  getRegisteredServices(): string[] {
    return Array.from(this.connectors.keys());
  }

  extractPermMetadata(
    service: string,
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata {
    const connector = this.connectors.get(service);
    if (!connector) {
      throw new Error(`Unknown service: ${service}`);
    }

    const methodDef = connector.methods.find((m) => m.name === method);
    if (!methodDef) {
      throw new Error(`Unknown method: ${service}.${method}`);
    }

    return connector.extractPermMetadata(method, params, accountId);
  }

  async execute(
    service: string,
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown> {
    const connector = this.connectors.get(service);
    if (!connector) {
      throw new Error(`Unknown service: ${service}`);
    }

    // Let MCP connectors lazy-load their tool list with the provided credentials
    if (connector.ensureReady) {
      await connector.ensureReady(credentials);
    }

    const methodDef = connector.methods.find((m) => m.name === method);
    if (!methodDef) {
      throw new Error(`Unknown method: ${service}.${method}`);
    }

    try {
      return await connector.execute(method, params, credentials);
    } catch (err) {
      // If the connector already classified the error, pass it through.
      if (isClassifiedError(err)) throw err;
      throw classifyConnectorError(err, service);
    }
  }

  getHelp(service?: string): ServiceHelp | ServiceHelp[] {
    if (service) {
      const connector = this.connectors.get(service);
      if (!connector) {
        throw new Error(`Unknown service: ${service}`);
      }
      return connector.help();
    }

    return Array.from(this.connectors.values()).map((c) => c.help());
  }

  getMethodHelp(service: string, method: string): ServiceHelp {
    const connector = this.connectors.get(service);
    if (!connector) {
      throw new Error(`Unknown service: ${service}`);
    }
    return connector.help(method);
  }
}

// ---------------------------------------------------------------------------
// Fallback error classification for connectors that throw plain Errors
// ---------------------------------------------------------------------------

const STATUS_IN_MESSAGE = /\b(?:error|status)\s+(\d{3})\b/i;

/**
 * Extract an HTTP status code from an unclassified connector error.
 * Connectors attach `.status` (Hetzner, AgentMail) or embed it in the
 * message string ("Gmail API error 401: …").
 */
function extractStatus(err: unknown): number | undefined {
  if (typeof (err as any)?.status === 'number') return (err as any).status;
  if (err instanceof Error) {
    const m = err.message.match(STATUS_IN_MESSAGE);
    if (m) return Number(m[1]);
  }
  return undefined;
}

/**
 * Classify a raw connector error into a ClassifiedError based on HTTP status.
 * Called only when the connector itself did not classify the error.
 */
function classifyConnectorError(err: unknown, service: string): Error {
  const status = extractStatus(err);
  const cause = err instanceof Error ? err : undefined;
  const message = cause?.message ?? String(err);

  if (status !== undefined) {
    if (status === 401) {
      return new AuthError(`${service} token is invalid or expired`, {
        cause,
        source: service,
        serviceId: service,
        accountId: '',
      });
    }
    if (status === 403) {
      return new PermissionError(message, { cause, source: service });
    }
    if (status === 429 || status === 408 || status >= 500) {
      return new NetworkError(message, { cause, source: service, statusCode: status });
    }
    return new LogicError(message, { cause, source: service });
  }

  // No status code — check for network-like errors
  if (cause && ('code' in cause)) {
    const code = (cause as any).code;
    if (typeof code === 'string' && /^(ECONNREFUSED|ETIMEDOUT|ECONNRESET|ENOTFOUND|UND_ERR_CONNECT_TIMEOUT)$/.test(code)) {
      return new NetworkError(message, { cause, source: service });
    }
  }

  // Cannot classify — return as-is so checkConnectionHealth treats it as transient
  return cause ?? new Error(message);
}
