/**
 * @keepai/daemon — Entry point.
 * Creates and starts the keepd server.
 */

import createDebug from 'debug';
import { createServer } from './server.js';
import { DEFAULT_PORT } from '@keepai/proto';

const log = createDebug('keepai:start');

async function main() {
  const port = process.env.KEEPAI_PORT
    ? Number(process.env.KEEPAI_PORT)
    : DEFAULT_PORT;

  const relays = process.env.KEEPAI_RELAYS
    ? process.env.KEEPAI_RELAYS.split(',').map((r) => r.trim())
    : undefined;

  log('starting keepd port:%d relays:%o', port, relays ?? 'default');

  const server = await createServer({
    port,
    relays,
    dataDir: process.env.KEEPAI_DATA_DIR,
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    log('shutdown signal received');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.listen();
}

main().catch((err) => {
  log('fatal error: %O', err);
  process.exit(1);
});
