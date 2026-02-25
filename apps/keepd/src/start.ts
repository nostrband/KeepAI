/**
 * @keepai/daemon — Entry point.
 * Creates and starts the keepd server.
 */

import { createServer } from './server.js';
import { DEFAULT_PORT } from '@keepai/proto';

async function main() {
  const port = process.env.KEEPAI_PORT
    ? Number(process.env.KEEPAI_PORT)
    : DEFAULT_PORT;

  const relays = process.env.KEEPAI_RELAYS
    ? process.env.KEEPAI_RELAYS.split(',').map((r) => r.trim())
    : undefined;

  const server = await createServer({
    port,
    relays,
    dataDir: process.env.KEEPAI_DATA_DIR,
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\n[keepd] Shutting down...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.listen();
}

main().catch((err) => {
  console.error('[keepd] Fatal error:', err);
  process.exit(1);
});
