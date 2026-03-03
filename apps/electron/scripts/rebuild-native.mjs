/**
 * Rebuild native modules (better-sqlite3) for the installed Electron version.
 *
 * This is needed because npm installs prebuilt binaries targeting the system
 * Node.js ABI, which differs from Electron's Node.js ABI.
 */

import { execSync } from 'child_process';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const electronVersion = require('electron/package.json').version;
const monorepoRoot = join(__dirname, '..', '..', '..');
const sqliteDir = join(monorepoRoot, 'node_modules', 'better-sqlite3');
const arch = process.env.ARCH || process.arch;

console.log(`Rebuilding better-sqlite3 for Electron ${electronVersion} (${arch})...`);

execSync(
  `npx node-gyp rebuild --target=${electronVersion} --arch=${arch} --dist-url=https://electronjs.org/headers --release`,
  { stdio: 'inherit', cwd: sqliteDir }
);

console.log('Native module rebuilt successfully.');
