/**
 * @keepai/daemon — Fastify server setup and startup sequence.
 *
 * Creates and configures the keepd server with:
 * - SQLite database (better-sqlite3)
 * - ConnectionManager (OAuth + credential store)
 * - ConnectorExecutor (Gmail + Notion)
 * - AgentManager (pairing lifecycle)
 * - PolicyEngine (DB-backed policies)
 * - ApprovalQueue (approval flow with temp file + hash)
 * - AuditLogger (request logging)
 * - RPCHandler (nostr RPC)
 * - SSE broadcaster (real-time UI updates)
 * - Fastify HTTP routes
 * - Cleanup jobs
 */

import createDebug from 'debug';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import Fastify from 'fastify';

const log = createDebug('keepai:server');
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { KeepDB, KeepDBApi } from '@keepai/db';
import {
  ConnectionManager,
  CredentialStore,
  ConnectorExecutor,
  gmailConnector,
  McpConnector,
  notionMcpConfig,
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
import { registerConnectionRoutes, checkConnectionHealth, HEALTH_CHECK_METHODS } from './routes/connections.js';
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

  log('creating server dataDir:%s relays:%o port:%d', dataDir, relays, port);

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

  // Notion via MCP connector
  const notionMcp = new McpConnector(notionMcpConfig);
  connectorExecutor.register(notionMcp);

  // Try to seed the MCP connector with a stored token so tool list is available at startup
  {
    const notionConns = await connectionManager.listConnectionsByService('notion');
    const activeConn = notionConns.find((c) => c.status === 'connected');
    if (activeConn) {
      try {
        const creds = await connectionManager.getCredentials({
          service: 'notion',
          accountId: activeConn.accountId,
        });
        notionMcp.setAccessToken(creds.accessToken);
        await notionMcp.initialize();
      } catch (err) {
        log('notion MCP connector startup init failed (will retry on first request): %O', err);
      }
    }
  }

  // 8. Initialize SSE broadcaster
  const sse = new SSEBroadcaster();

  // 9. Initialize AgentManager
  const agentManager = new AgentManager({ db, relays });

  // 10. Initialize PolicyEngine
  const policyEngine = new PolicyEngine(db);

  // 10a. Migrate file-based policies to DB (idempotent)
  migrateFilePolicies(dataDir, db, policyEngine);

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
    log('updating RPC subscription with %d pubkey(s)', pubkeys.length);
    rpcHandler.updateSubscription(pubkeys);
  };
  updateSubscription();

  // 15. Create Fastify server
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
  });

  // Register routes
  await registerConnectionRoutes(app, connectionManager, () => `http://${host}:${port}`, connectorExecutor, sse, agentManager, policyEngine);
  await registerAgentRoutes(app, agentManager, policyEngine, updateSubscription, sse);
  await registerPolicyRoutes(app, agentManager, policyEngine);
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

  // 16. Expire stale approvals on startup (handles daemon restart with pending approvals)
  {
    const expired = approvalQueue.expireStale();
    if (expired > 0) log('expired %d stale approval(s) on startup', expired);
  }

  // 17. Cleanup jobs
  const cleanupInterval = setInterval(() => {
    try {
      approvalQueue.expireStale();
      db.pairings.expireOld();
      db.approvals.expireOld(CLEANUP.APPROVALS_MAX_AGE);
      db.approvals.cleanupResolved(CLEANUP.APPROVALS_MAX_AGE);
      db.rpcRequests.cleanupOld(CLEANUP.RPC_REQUESTS_MAX_AGE);
      db.audit.cleanupOld(CLEANUP.AUDIT_LOG_MAX_AGE);
      // Update subscription after cleaning up expired pairings
      updateSubscription();
    } catch (err) {
      log('cleanup error: %O', err);
    }
  }, CLEANUP.INTERVAL);

  // 18. Periodic health check (every 15 min)
  const HEALTH_CHECK_INTERVAL = 15 * 60 * 1000;

  const runHealthChecks = async () => {
    try {
      const connections = await connectionManager.listConnections();
      const connected = connections.filter((c) => c.status === 'connected');
      log('health check: probing %d connected connection(s)', connected.length);

      for (const conn of connected) {
        if (!HEALTH_CHECK_METHODS[conn.service]) continue;

        const id = { service: conn.service, accountId: conn.accountId };
        const result = await checkConnectionHealth(id, connectionManager, connectorExecutor);

        if (result.success) {
          await connectionManager.markConnected(id);
        } else if (result.errorType === 'auth') {
          await connectionManager.markError(id, result.error);
          sse.broadcast('connection_updated', {
            service: conn.service,
            accountId: conn.accountId,
            status: 'error',
            error: result.error,
          });
          log('health check: connection %s:%s marked error: %s', conn.service, conn.accountId, result.error);
        }
        // Network errors: skip (transient)
      }
    } catch (err) {
      log('health check error: %O', err);
    }
  };

  // Run health checks on startup (after reconciliation) and periodically
  runHealthChecks();
  const healthCheckInterval = setInterval(runHealthChecks, HEALTH_CHECK_INTERVAL);

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
      log('listening on http://%s:%d', host, port);
    },

    async close() {
      log('shutting down...');
      clearInterval(cleanupInterval);
      clearInterval(healthCheckInterval);
      rpcHandler.close();
      connectionManager.shutdown();
      await app.close();
      keepdb.close();
      log('shutdown complete');
    },
  };
}

function resolveDataDir(): string {
  const envDir = process.env.KEEPAI_DATA_DIR;
  if (envDir) return envDir;

  const defaultDir = path.join(os.homedir(), '.keepai', 'server');
  return defaultDir;
}

/**
 * One-time migration: convert file-based policies to DB rows.
 * Scans {dataDir}/agents/{pubkey}/policies/{service}.json,
 * looks up the agent by pubkey, and upserts policy rows for each
 * connected account of that service. Deletes files after migration.
 */
function migrateFilePolicies(dataDir: string, db: KeepDBApi, policyEngine: PolicyEngine): void {
  const agentsDir = path.join(dataDir, 'agents');
  if (!fs.existsSync(agentsDir)) return;

  let dirs: string[];
  try {
    dirs = fs.readdirSync(agentsDir);
  } catch {
    return;
  }

  for (const pubkeyDir of dirs) {
    const policiesDir = path.join(agentsDir, pubkeyDir, 'policies');
    if (!fs.existsSync(policiesDir)) continue;

    const agent = db.agents.getByPubkey(pubkeyDir);
    if (!agent) continue;

    let files: string[];
    try {
      files = fs.readdirSync(policiesDir).filter((f) => f.endsWith('.json'));
    } catch {
      continue;
    }

    for (const file of files) {
      const service = file.replace('.json', '');
      const filePath = path.join(policiesDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const policy = JSON.parse(content);
        const connections = db.connections.listByService(service);
        for (const conn of connections) {
          if (conn.status === 'connected') {
            policyEngine.savePolicy(service, conn.accountId, agent.id, policy);
          }
        }
        fs.unlinkSync(filePath);
        log('migrated policy file %s for agent %s', file, agent.name);
      } catch (err) {
        log('failed to migrate policy file %s: %O', filePath, err);
      }
    }

    // Clean up empty directories
    try {
      fs.rmdirSync(policiesDir);
      fs.rmdirSync(path.join(agentsDir, pubkeyDir));
    } catch {
      // Not empty or already gone
    }
  }

  // Try to remove the agents dir if empty
  try {
    fs.rmdirSync(agentsDir);
  } catch {
    // Not empty
  }
}

export type KeepServer = Awaited<ReturnType<typeof createServer>>;
