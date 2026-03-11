import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DEFAULT_PORT } from '@keepai/proto';

const require = createRequire(import.meta.url);
const rootPkg = require('../../package.json');

function loadBuildSecrets(): Record<string, string> {
  const secretsPath = path.join(__dirname, '../../secrets.build.json');
  try {
    return JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
  } catch {
    return {};
  }
}

function getSecret(secrets: Record<string, string>, key: string, envKey?: string): string {
  return secrets[key] || process.env[envKey || `BUILD_${key}`] || '';
}

export default defineConfig(({ mode }) => {
  const flavor = mode; // "frontend" or "electron"
  const isFrontend = mode === 'frontend';
  const isElectron = mode === 'electron';
  const secrets = loadBuildSecrets();

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@keepai': path.resolve(__dirname, '../../packages'),
      },
    },
    define: {
      __FLAVOR__: JSON.stringify(flavor),
      __FRONTEND__: JSON.stringify(isFrontend),
      __ELECTRON__: JSON.stringify(isElectron),
      __APP_VERSION__: JSON.stringify(rootPkg.version),
      // PostHog: secrets.build.json → BUILD_* env vars → empty string
      'import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN': JSON.stringify(getSecret(secrets, 'POSTHOG_TOKEN')),
      'import.meta.env.VITE_PUBLIC_POSTHOG_HOST': JSON.stringify(getSecret(secrets, 'POSTHOG_HOST')),
      'import.meta.env.VITE_PUBLIC_POSTHOG_API_HOST': JSON.stringify(getSecret(secrets, 'POSTHOG_API_HOST')),
    },
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${DEFAULT_PORT}`,
          changeOrigin: true,
        },
      },
      fs: {
        allow: ['..', '../..'],
      },
    },
    build: {
      outDir: `dist/${flavor}`,
      sourcemap: !isElectron,
      ...(isElectron && {
        rollupOptions: {
          output: {
            assetFileNames: 'assets/[name]-[hash].[ext]',
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
          },
        },
      }),
    },
    base: isElectron ? './' : '/',
  };
});
