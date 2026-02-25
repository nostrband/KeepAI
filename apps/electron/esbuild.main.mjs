import esbuild from 'esbuild';

const common = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node22'],
  external: [
    'electron',
    'better-sqlite3',
  ],
};

await esbuild.build({
  ...common,
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.cjs',
});

await esbuild.build({
  ...common,
  entryPoints: ['src/preload.ts'],
  outfile: 'dist/preload.cjs',
});

console.log('[esbuild] main & preload built');
