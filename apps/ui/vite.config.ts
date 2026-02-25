import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const flavor = mode; // "frontend" or "electron"
  const isFrontend = mode === 'frontend';
  const isElectron = mode === 'electron';

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
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:9090',
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
