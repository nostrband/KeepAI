import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'node22',
    external: ['debug'],
  },
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    target: 'node22',
    external: ['debug'],
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
