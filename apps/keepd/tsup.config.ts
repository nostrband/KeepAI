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

export default defineConfig({
  entry: ['src/server.ts', 'src/start.ts'],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  dts: true,
  clean: true,
  define: {
    'process.env.GOOGLE_CLIENT_ID': JSON.stringify(GOOGLE_CLIENT_ID),
    'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(GOOGLE_CLIENT_SECRET),
    'process.env.NOTION_CLIENT_ID': JSON.stringify(NOTION_CLIENT_ID),
    'process.env.NOTION_CLIENT_SECRET': JSON.stringify(NOTION_CLIENT_SECRET),
  },
});
