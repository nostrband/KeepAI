import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  treeshake: true,
  external: ['@keepai/proto', 'better-sqlite3'],
});
