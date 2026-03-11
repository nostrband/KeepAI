import { defineConfig } from 'tsup';
import fs from 'fs';
import path from 'path';

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
const NOTION_CLIENT_ID = getSecret('NOTION_CLIENT_ID');
const NOTION_CLIENT_SECRET = getSecret('NOTION_CLIENT_SECRET');
const AIRTABLE_CLIENT_ID = getSecret('AIRTABLE_CLIENT_ID');

if (process.env.CI) {
  const required: Record<string, string> = {
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AIRTABLE_CLIENT_ID,
  };
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing build secrets: ${missing.join(', ')}`);
  }
}

export default defineConfig({
  entry: ['src/server.ts', 'src/start.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
  clean: true,
  external: ['debug'],
  define: {
    'process.env.GOOGLE_CLIENT_ID': JSON.stringify(GOOGLE_CLIENT_ID),
    'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(GOOGLE_CLIENT_SECRET),
    'process.env.NOTION_CLIENT_ID': JSON.stringify(NOTION_CLIENT_ID),
    'process.env.NOTION_CLIENT_SECRET': JSON.stringify(NOTION_CLIENT_SECRET),
    'process.env.AIRTABLE_CLIENT_ID': JSON.stringify(AIRTABLE_CLIENT_ID),
  },
});
