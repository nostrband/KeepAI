import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadIdentity,
  saveIdentity,
  loadConfig,
  saveConfig,
  deleteStorage,
  isPaired,
  getConfigDir,
  type Identity,
  type ClientConfig,
} from '../storage.js';
import { KeepAI, KeepAIError } from '../sdk.js';
import { EXIT_CODES } from '@keepai/proto';

// --- Storage tests ---

describe('getConfigDir', () => {
  const origEnv = process.env.KEEPAI_CONFIG_DIR;

  afterEach(() => {
    if (origEnv === undefined) {
      delete process.env.KEEPAI_CONFIG_DIR;
    } else {
      process.env.KEEPAI_CONFIG_DIR = origEnv;
    }
  });

  it('should return default dir when env var is not set', () => {
    delete process.env.KEEPAI_CONFIG_DIR;
    const dir = getConfigDir();
    expect(dir).toBe(path.join(os.homedir(), '.keepai', 'client'));
  });

  it('should return env var when set', () => {
    process.env.KEEPAI_CONFIG_DIR = '/tmp/custom-keepai';
    const dir = getConfigDir();
    expect(dir).toBe('/tmp/custom-keepai');
  });
});

describe('Storage: Identity', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepai-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return null when no identity exists', () => {
    const result = loadIdentity(tmpDir);
    expect(result).toBeNull();
  });

  it('should save and load identity', () => {
    const identity: Identity = {
      privateKey: 'priv-abc123',
      publicKey: 'pub-xyz789',
    };
    saveIdentity(identity, tmpDir);

    const loaded = loadIdentity(tmpDir);
    expect(loaded).toEqual(identity);
  });

  it('should create directory if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'nested', 'deep');
    saveIdentity({ privateKey: 'a', publicKey: 'b' }, nestedDir);

    expect(fs.existsSync(path.join(nestedDir, 'identity.json'))).toBe(true);
  });

  it('should write files with 0o600 permissions', () => {
    saveIdentity({ privateKey: 'a', publicKey: 'b' }, tmpDir);
    const stat = fs.statSync(path.join(tmpDir, 'identity.json'));
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it('should overwrite existing identity', () => {
    saveIdentity({ privateKey: 'old', publicKey: 'old' }, tmpDir);
    saveIdentity({ privateKey: 'new', publicKey: 'new' }, tmpDir);

    const loaded = loadIdentity(tmpDir);
    expect(loaded!.privateKey).toBe('new');
  });
});

describe('Storage: Config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepai-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return null when no config exists', () => {
    const result = loadConfig(tmpDir);
    expect(result).toBeNull();
  });

  it('should save and load config', () => {
    const config: ClientConfig = {
      daemonPubkey: 'daemon-pub-abc',
      relays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
      pairedAt: Date.now(),
    };
    saveConfig(config, tmpDir);

    const loaded = loadConfig(tmpDir);
    expect(loaded).toEqual(config);
  });

  it('should write config with 0o600 permissions', () => {
    saveConfig({ daemonPubkey: 'x', relays: [], pairedAt: 0 }, tmpDir);
    const stat = fs.statSync(path.join(tmpDir, 'config.json'));
    expect(stat.mode & 0o777).toBe(0o600);
  });
});

describe('Storage: isPaired', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepai-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return false when not paired', () => {
    expect(isPaired(tmpDir)).toBe(false);
  });

  it('should return false when only identity exists', () => {
    saveIdentity({ privateKey: 'a', publicKey: 'b' }, tmpDir);
    expect(isPaired(tmpDir)).toBe(false);
  });

  it('should return false when only config exists', () => {
    saveConfig({ daemonPubkey: 'x', relays: [], pairedAt: 0 }, tmpDir);
    expect(isPaired(tmpDir)).toBe(false);
  });

  it('should return true when both identity and config exist', () => {
    saveIdentity({ privateKey: 'a', publicKey: 'b' }, tmpDir);
    saveConfig({ daemonPubkey: 'x', relays: [], pairedAt: 0 }, tmpDir);
    expect(isPaired(tmpDir)).toBe(true);
  });
});

describe('Storage: deleteStorage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepai-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should delete all storage files', () => {
    saveIdentity({ privateKey: 'a', publicKey: 'b' }, tmpDir);
    saveConfig({ daemonPubkey: 'x', relays: [], pairedAt: 0 }, tmpDir);
    expect(isPaired(tmpDir)).toBe(true);

    deleteStorage(tmpDir);
    expect(fs.existsSync(tmpDir)).toBe(false);
  });

  it('should not throw when directory does not exist', () => {
    expect(() => deleteStorage('/tmp/nonexistent-keepai-dir')).not.toThrow();
  });
});

// --- SDK tests ---

describe('KeepAIError', () => {
  it('should create error with code and exit code', () => {
    const err = new KeepAIError('test error', 'test_code', EXIT_CODES.GENERAL_ERROR);
    expect(err.message).toBe('test error');
    expect(err.code).toBe('test_code');
    expect(err.exitCode).toBe(1);
    expect(err.name).toBe('KeepAIError');
    expect(err instanceof Error).toBe(true);
  });

  it('should create error with specific exit codes', () => {
    const err = new KeepAIError('denied', 'permission_denied', EXIT_CODES.PERMISSION_DENIED);
    expect(err.exitCode).toBe(3);
  });
});

describe('KeepAI constructor', () => {
  it('should use default config dir', () => {
    const keep = new KeepAI();
    // Constructor should not throw even without config files
    expect(keep).toBeInstanceOf(KeepAI);
    keep.close();
  });

  it('should accept custom config dir', () => {
    const keep = new KeepAI({ configDir: '/tmp/test-keepai' });
    expect(keep).toBeInstanceOf(KeepAI);
    keep.close();
  });

  it('should accept explicit connection details', () => {
    const keep = new KeepAI({
      daemonPubkey: '0'.repeat(64),
      relays: ['wss://relay.example.com'],
      privateKey: '1'.repeat(64),
    });
    expect(keep).toBeInstanceOf(KeepAI);
    keep.close();
  });
});

describe('KeepAI.disconnect', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepai-sdk-'));
    saveIdentity({ privateKey: 'a', publicKey: 'b' }, tmpDir);
    saveConfig({ daemonPubkey: 'x', relays: [], pairedAt: 0 }, tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should remove storage on disconnect', () => {
    expect(isPaired(tmpDir)).toBe(true);
    const keep = new KeepAI({ configDir: tmpDir });
    keep.disconnect();
    expect(isPaired(tmpDir)).toBe(false);
  });
});

describe('KeepAI.status', () => {
  it('should return not paired when no config exists', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepai-sdk-'));
    try {
      const keep = new KeepAI({ configDir: tmpDir });
      const result = await keep.status();
      expect(result.paired).toBe(false);
      keep.close();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('KeepAI.run (not paired)', () => {
  it('should throw KeepAIError when not paired', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepai-sdk-'));
    try {
      const keep = new KeepAI({ configDir: tmpDir });
      await expect(keep.run('gmail', 'messages.list')).rejects.toThrow(KeepAIError);
      await expect(keep.run('gmail', 'messages.list')).rejects.toThrow('Not paired');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('KeepAI.help (not paired)', () => {
  it('should throw KeepAIError when not paired', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keepai-sdk-'));
    try {
      const keep = new KeepAI({ configDir: tmpDir });
      await expect(keep.help()).rejects.toThrow(KeepAIError);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
