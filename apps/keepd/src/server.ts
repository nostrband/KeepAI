/**
 * @keepai/daemon — Fastify server setup and startup sequence.
 *
 * Creates and configures the keepd server with:
 * - SQLite database (better-sqlite3)
 * - ConnectionManager (OAuth + credential store)
 * - ConnectorExecutor (Gmail + Notion)
 * - AgentManager (pairing lifecycle)
 * - PolicyEngine (file-based policies)
 * - ApprovalQueue (approval flow with temp file + hash)
 * - AuditLogger (request logging)
 * - RPCHandler (nostr RPC)
 * - SSE broadcaster (real-time UI updates)
 * - Fastify HTTP routes
 * - Cleanup jobs
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { KeepDB, KeepDBApi } from '@keepai/db';
import {
  ConnectionManager,
  CredentialStore,
  ConnectorExecutor,
  gmailConnector,
  notionConnector,
  gmailService,
  notionService,
  createConnectionDbAdapter,
} from '@keepai/connectors';
import { RPCHandler } from '@keepai/nostr-rpc';
import { DEFAULT_RELAYS, DEFAULT_PORT, CLEANUP } from '@keepai/proto';

import { createDbBridge } from './db-bridge.js';
import { SSEBroadcaster } from './sse.js';
import { AgentManager } from './managers/agent-manager.js';
import { PolicyEngine } from './managers/policy-engine.js';
import { ApprovalQueue } from './managers/approval-queue.js';
import { AuditLogger } from './managers/audit-logger.js';
import { RPCRouter } from './rpc-router.js';
import { registerConnectionRoutes } from './routes/connections.js';
import { registerAgentRoutes } from './routes/agents.js';
import { registerPolicyRoutes } from './routes/policies.js';
import { registerQueueRoutes } from './routes/queue.js';
import { registerLogRoutes } from './routes/logs.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerEventsRoute } from './routes/events.js';

export interface ServerConfig {
  port?: number;
  host?: string;
  dataDir?: string;
  relays?: string[];
  serveStaticFiles?: boolean;
  staticFilesRoot?: string;
}

export async function createServer(config: ServerConfig = {}) {
  const port = config.port ?? DEFAULT_PORT;
  const host = config.host ?? '127.0.0.1';
  const dataDir = config.dataDir ?? resolveDataDir();
  const relays = config.relays ?? [...DEFAULT_RELAYS];
  const serveStaticFiles = config.serveStaticFiles ?? true;
  const staticFilesRoot = config.staticFilesRoot ?? path.join(__dirname, '..', 'public');

  // 1. Ensure data directory exists
  fs.mkdirSync(dataDir, { recursive: true });

  // 2. Open SQLite database
  const dbPath = path.join(dataDir, 'data.db');
  const keepdb = new KeepDB(dbPath);

  // 3. Run migrations
  keepdb.migrate();
  const db = new KeepDBApi(keepdb.db);

  // 4. Initialize credential store and connection DB adapter
  const credentialStore = new CredentialStore(dataDir);
  const dbBridge = createDbBridge(db.connections);
  const connectionDbAdapter = createConnectionDbAdapter(dbBridge);

  // 5. Initialize ConnectionManager
  const connectionManager = new ConnectionManager(credentialStore, connectionDbAdapter);
  connectionManager.registerService(gmailService);
  connectionManager.registerService(notionService);

  // 6. Reconcile file ↔ DB state
  await connectionManager.reconcile();

  // 7. Initialize ConnectorExecutor
  const connectorExecutor = new ConnectorExecutor();
  connectorExecutor.register(gmailConnector);
  connectorExecutor.register(notionConnector);

  // 8. Initialize SSE broadcaster
  const sse = new SSEBroadcaster();

  // 9. Initialize AgentManager
  const agentManager = new AgentManager({ db, relays });

  // 10. Initialize PolicyEngine
  const policyEngine = new PolicyEngine(dataDir);

  // 11. Initialize ApprovalQueue
  const approvalQueue = new ApprovalQueue({
    db,
    dataDir,
    sse,
  });

  // 12. Initialize AuditLogger
  const auditLogger = new AuditLogger(db, sse);

  // 13. Initialize RPC Router
  const rpcRouter = new RPCRouter({
    agentManager,
    policyEngine,
    approvalQueue,
    auditLogger,
    connectorExecutor,
    connectionManager,
    sse,
  });

  // 14. Initialize RPC Handler (nostr)
  const rpcHandler = new RPCHandler({
    relays,
    getAgentKeys: (pubkey) => rpcRouter.getAgentKeys(pubkey),
    tryInsertRequest: (eventId, requestId, agentPubkey, method) =>
      db.rpcRequests.tryInsert(eventId, requestId, agentPubkey, method),
    onRequest: (request, agentKeys, eventId) =>
      rpcRouter.handleRequest(request, agentKeys, eventId),
  });

  // Start listening on all active pubkeys
  const updateSubscription = () => {
    const pubkeys = agentManager.getActiveKeepdPubkeys();
    rpcHandler.updateSubscription(pubkeys);
  };
  updateSubscription();

  // 15. Create Fastify server
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
  });

  // Register routes
  await registerConnectionRoutes(app, connectionManager, () => `http://${host}:${port}`);
  await registerAgentRoutes(app, agentManager, policyEngine, updateSubscription);
  await registerPolicyRoutes(app, agentManager, policyEngine, connectorExecutor);
  await registerQueueRoutes(app, approvalQueue);
  await registerLogRoutes(app, auditLogger);
  await registerConfigRoutes(app, db, sse, () => port);
  await registerEventsRoute(app, sse);

  // Serve static files (UI)
  if (serveStaticFiles && fs.existsSync(staticFilesRoot)) {
    await app.register(fastifyStatic, {
      root: staticFilesRoot,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback — serve index.html for non-API routes
    app.setNotFoundHandler(async (request, reply) => {
      if (!request.url.startsWith('/api/')) {
        return reply.sendFile('index.html');
      }
      reply.status(404);
      return { error: 'Not found' };
    });
  }

  // 16. Cleanup jobs
  const cleanupInterval = setInterval(() => {
    try {
      db.pairings.expireOld();
      db.approvals.expireOld(CLEANUP.APPROVALS_MAX_AGE);
      db.approvals.cleanupResolved(CLEANUP.APPROVALS_MAX_AGE);
      db.rpcRequests.cleanupOld(CLEANUP.RPC_REQUESTS_MAX_AGE);
      db.audit.cleanupOld(CLEANUP.AUDIT_LOG_MAX_AGE);
      // Update subscription after cleaning up expired pairings
      updateSubscription();
    } catch (err) {
      console.error('[keepd] Cleanup error:', err);
    }
  }, CLEANUP.INTERVAL);

  return {
    app,
    db: keepdb,
    connectionManager,
    agentManager,
    policyEngine,
    approvalQueue,
    auditLogger,
    connectorExecutor,
    rpcHandler,
    sse,

    async listen() {
      await app.listen({ port, host });
      console.log(`[keepd] Listening on http://${host}:${port}`);
    },

    async close() {
      clearInterval(cleanupInterval);
      rpcHandler.close();
      connectionManager.shutdown();
      await app.close();
      keepdb.close();
      console.log('[keepd] Shutdown complete');
    },
  };
}

function resolveDataDir(): string {
  const envDir = process.env.KEEPAI_DATA_DIR;
  if (envDir) return envDir;

  const defaultDir = path.join(os.homedir(), '.keepai', 'server');
  return defaultDir;
}

export type KeepServer = Awaited<ReturnType<typeof createServer>>;
