/**
 * Local storage for the KeepAI agent-side client.
 *
 * Stores identity (keypair) and config (daemon pubkey, relays) in:
 *   {configDir}/identity.json    — { privateKey, publicKey }
 *   {configDir}/config.json      — { daemonPubkey, relays, pairedAt }
 *
 * All files written with 0o600 permissions (owner read/write only).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Identity {
  privateKey: string;
  publicKey: string;
}

export interface ClientConfig {
  daemonPubkey: string;
  relays: string[];
  pairedAt: number;
}

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.keepai', 'client');

export function getConfigDir(): string {
  return process.env.KEEPAI_CONFIG_DIR || DEFAULT_CONFIG_DIR;
}

export function loadIdentity(configDir?: string): Identity | null {
  const filePath = path.join(configDir ?? getConfigDir(), 'identity.json');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Identity;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity, configDir?: string): void {
  const dir = configDir ?? getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'identity.json');
  writeSecure(filePath, JSON.stringify(identity, null, 2));
}

export function loadConfig(configDir?: string): ClientConfig | null {
  const filePath = path.join(configDir ?? getConfigDir(), 'config.json');
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as ClientConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: ClientConfig, configDir?: string): void {
  const dir = configDir ?? getConfigDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'config.json');
  writeSecure(filePath, JSON.stringify(config, null, 2));
}

export function deleteStorage(configDir?: string): void {
  const dir = configDir ?? getConfigDir();
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Already gone
  }
}

export function isPaired(configDir?: string): boolean {
  const identity = loadIdentity(configDir);
  const config = loadConfig(configDir);
  return !!(identity && config);
}

function writeSecure(filePath: string, content: string): void {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, content, { mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
}
