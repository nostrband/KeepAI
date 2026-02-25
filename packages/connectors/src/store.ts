/**
 * File-based credential storage.
 * Stores OAuth credentials as JSON files with restricted permissions (0o600).
 * Path pattern: {basePath}/connectors/{service}/{accountId}.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { ConnectionId, OAuthCredentials } from './types.js';

const CREDENTIAL_FILE_MODE = 0o600;
const CREDENTIAL_DIR_MODE = 0o700;

export class CredentialStore {
  private connectorsDir: string;

  constructor(private basePath: string) {
    this.connectorsDir = path.join(basePath, 'connectors');
  }

  private encodeAccountId(accountId: string): string {
    return Buffer.from(accountId, 'utf-8')
      .toString('base64url')
      .replace(/=+$/, '');
  }

  private decodeAccountId(encoded: string): string {
    const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
    return Buffer.from(padded, 'base64url').toString('utf-8');
  }

  private validateServiceId(service: string): void {
    if (!/^[a-zA-Z0-9_-]+$/.test(service)) {
      throw new Error(`Invalid service ID: ${service}`);
    }
  }

  private getFilePath(id: ConnectionId): string {
    this.validateServiceId(id.service);
    const safeAccountId = this.encodeAccountId(id.accountId);
    const filePath = path.join(
      this.connectorsDir,
      id.service,
      `${safeAccountId}.json`
    );

    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.connectorsDir);
    if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
      throw new Error(`Path traversal detected: ${filePath}`);
    }

    return filePath;
  }

  private getServiceDir(service: string): string {
    this.validateServiceId(service);
    return path.join(this.connectorsDir, service);
  }

  private async ensureServiceDir(service: string): Promise<void> {
    const dir = this.getServiceDir(service);
    await fs.mkdir(dir, { recursive: true, mode: CREDENTIAL_DIR_MODE });

    const stat = await fs.stat(dir);
    const currentMode = stat.mode & 0o777;
    if (currentMode !== CREDENTIAL_DIR_MODE) {
      await fs.chmod(dir, CREDENTIAL_DIR_MODE);
    }
  }

  private async verifyAndFixPermissions(filePath: string): Promise<void> {
    const stat = await fs.stat(filePath);
    const currentMode = stat.mode & 0o777;
    if (currentMode !== CREDENTIAL_FILE_MODE) {
      await fs.chmod(filePath, CREDENTIAL_FILE_MODE);
    }
  }

  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    const tempPath = path.join(dir, `.tmp-${randomUUID()}.json`);

    try {
      await fs.writeFile(tempPath, content, {
        mode: CREDENTIAL_FILE_MODE,
        encoding: 'utf-8',
      });
      await this.verifyAndFixPermissions(tempPath);
      await fs.rename(tempPath, filePath);
      await this.verifyAndFixPermissions(filePath);
    } catch (error) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  async auditPermissions(): Promise<void> {
    try {
      try {
        const stat = await fs.stat(this.connectorsDir);
        const currentMode = stat.mode & 0o777;
        if (currentMode !== CREDENTIAL_DIR_MODE) {
          await fs.chmod(this.connectorsDir, CREDENTIAL_DIR_MODE);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
        return;
      }

      const services = await fs.readdir(this.connectorsDir);
      for (const service of services) {
        const servicePath = path.join(this.connectorsDir, service);
        const stat = await fs.stat(servicePath);

        if (!stat.isDirectory()) continue;

        const dirMode = stat.mode & 0o777;
        if (dirMode !== CREDENTIAL_DIR_MODE) {
          await fs.chmod(servicePath, CREDENTIAL_DIR_MODE);
        }

        const files = await fs.readdir(servicePath);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const filePath = path.join(servicePath, file);
          await this.verifyAndFixPermissions(filePath);
        }
      }
    } catch (error) {
      console.error('[credential-store] Permission audit failed:', error);
      throw error;
    }
  }

  async save(id: ConnectionId, credentials: OAuthCredentials): Promise<void> {
    await this.ensureServiceDir(id.service);
    const filePath = this.getFilePath(id);
    await this.atomicWrite(filePath, JSON.stringify(credentials, null, 2));
  }

  async load(id: ConnectionId): Promise<OAuthCredentials | null> {
    const filePath = this.getFilePath(id);

    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as OAuthCredentials;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async delete(id: ConnectionId): Promise<void> {
    const filePath = this.getFilePath(id);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(id: ConnectionId): Promise<boolean> {
    const filePath = this.getFilePath(id);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listByService(service: string): Promise<ConnectionId[]> {
    const dir = this.getServiceDir(service);

    try {
      const files = await fs.readdir(dir);
      const results: ConnectionId[] = [];

      for (const file of files) {
        if (!file.endsWith('.json') || file.startsWith('.tmp-')) continue;

        const encoded = file.slice(0, -5);
        let accountId: string;

        try {
          accountId = this.decodeAccountId(encoded);
        } catch {
          accountId = decodeURIComponent(encoded.replace(/_/g, '%'));
        }

        results.push({ service, accountId });
      }

      return results;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async listAll(): Promise<ConnectionId[]> {
    try {
      const services = await fs.readdir(this.connectorsDir);
      const results: ConnectionId[] = [];

      for (const service of services) {
        const servicePath = path.join(this.connectorsDir, service);
        const stat = await fs.stat(servicePath);
        if (stat.isDirectory()) {
          const connections = await this.listByService(service);
          results.push(...connections);
        }
      }

      return results;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
