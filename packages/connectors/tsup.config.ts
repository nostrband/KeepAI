import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';

/**
 * Load OAuth credentials from secrets.build.json or environment variables.
 *
 * For desktop OAuth apps (Google, Notion), client secrets are considered public
 * by design — security relies on redirect URI validation, not secret secrecy.
 */
function loadBuildSecrets(): Record<string, string> {
  const secretsPath = path.join(process.cwd(), '../../secrets.build.json');

  if (fs.existsSync(secretsPath)) {
    try {
      return JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
    } catch (error) {
      console.warn('Warning: Failed to parse secrets.build.json:', error);
    }
  }

  return {};
}

const secrets = loadBuildSecrets();

function getSecret(key: string, envKey?: string): string {
  return secrets[key] || process.env[envKey || `BUILD_${key}`] || '';
}

const GOOGLE_CLIENT_ID = getSecret('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = getSecret('GOOGLE_CLIENT_SECRET', 'BUILD_GMAIL_SECRET');
const GITHUB_CLIENT_ID = getSecret('GITHUB_CLIENT_ID');
const GITHUB_CLIENT_SECRET = getSecret('GITHUB_CLIENT_SECRET', 'BUILD_GITHUB_SECRET');
const AIRTABLE_CLIENT_ID = getSecret('AIRTABLE_CLIENT_ID');
const TRELLO_API_KEY = getSecret('TRELLO_API_KEY');

if (process.env.CI) {
  const required: Record<string, string> = {
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,
    AIRTABLE_CLIENT_ID, TRELLO_API_KEY,
  };
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing build secrets: ${missing.join(', ')}`);
  }
}

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  treeshake: true,
  platform: 'node',
  external: ['@keepai/proto', '@keepai/mcp-client'],
  define: {
    'process.env.GOOGLE_CLIENT_ID': JSON.stringify(GOOGLE_CLIENT_ID),
    'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(GOOGLE_CLIENT_SECRET),
    'process.env.GITHUB_CLIENT_ID': JSON.stringify(GITHUB_CLIENT_ID),
    'process.env.GITHUB_CLIENT_SECRET': JSON.stringify(GITHUB_CLIENT_SECRET),
    'process.env.AIRTABLE_CLIENT_ID': JSON.stringify(AIRTABLE_CLIENT_ID),
    'process.env.TRELLO_API_KEY': JSON.stringify(TRELLO_API_KEY),
  },
});
