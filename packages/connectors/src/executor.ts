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

    const methodDef = connector.methods.find((m) => m.name === method);
    if (!methodDef) {
      throw new Error(`Unknown method: ${service}.${method}`);
    }

    return connector.execute(method, params, credentials);
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
