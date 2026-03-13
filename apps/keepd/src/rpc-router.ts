/**
 * RPC Router — routes incoming agent requests through the full pipeline:
 *
 * 1. Identify agent (paired) or pairing (pending)
 * 2. Route to handler (pair, ping, help, service method)
 * 3. Validate account connection
 * 4. Extract permission metadata
 * 5. Policy check
 * 6. Approval flow (if needed)
 * 7. Execute connector
 * 8. Audit log
 * 9. Return response
 */

import createDebug from 'debug';
import type { RPCRequest, RPCError, Agent, ServiceHelp } from '@keepai/proto';
import { PROTOCOL_VERSION, SOFTWARE_VERSION } from '@keepai/proto';
import { renderServiceList, renderServiceMethods, renderMethodDetail } from './help-renderer.js';
import {
  renderUnknownService,
  renderUnknownMethod,
  renderMissingParams,
  renderMultipleAccounts,
} from './error-help.js';

const log = createDebug('keepai:router');
import { AuthError, isClassifiedError } from '@keepai/proto';
import type { AgentKeys } from '@keepai/nostr-rpc';
import type { AgentManager } from './managers/agent-manager.js';
import type { PolicyEngine } from './managers/policy-engine.js';
import type { ApprovalQueue } from './managers/approval-queue.js';
import type { AuditLogger } from './managers/audit-logger.js';
import type { ConnectorExecutor, ConnectionManager } from '@keepai/connectors';
import type { SSEBroadcaster } from './sse.js';
import type { BillingManager } from './managers/billing-manager.js';

export interface RPCRouterOptions {
  agentManager: AgentManager;
  policyEngine: PolicyEngine;
  approvalQueue: ApprovalQueue;
  auditLogger: AuditLogger;
  connectorExecutor: ConnectorExecutor;
  connectionManager: ConnectionManager;
  sse: SSEBroadcaster;
  billingManager?: BillingManager;
}

export class RPCRouter {
  private agentManager: AgentManager;
  private policyEngine: PolicyEngine;
  private approvalQueue: ApprovalQueue;
  private auditLogger: AuditLogger;
  private connectorExecutor: ConnectorExecutor;
  private connectionManager: ConnectionManager;
  private sse: SSEBroadcaster;
  private billingManager?: BillingManager;

  constructor(options: RPCRouterOptions) {
    this.agentManager = options.agentManager;
    this.policyEngine = options.policyEngine;
    this.approvalQueue = options.approvalQueue;
    this.auditLogger = options.auditLogger;
    this.connectorExecutor = options.connectorExecutor;
    this.connectionManager = options.connectionManager;
    this.sse = options.sse;
    this.billingManager = options.billingManager;
  }

  /**
   * Get agent keys for a keepd pubkey (used by RPCHandler.getAgentKeys callback).
   */
  getAgentKeys(keepdPubkey: string): AgentKeys | null {
    // Check paired agents first
    const agent = this.agentManager.getAgentByKeepdPubkey(keepdPubkey);
    if (agent && (agent.status === 'paired' || agent.status === 'paused')) {
      log('getAgentKeys: found %s agent %s for pubkey:%s', agent.status, agent.name, keepdPubkey);
      return {
        keepdPubkey: agent.keepdPubkey,
        keepdPrivkey: agent.keepdPrivkey,
        agentPubkey: agent.agentPubkey,
      };
    }

    // Check pending pairings
    const pairing = this.agentManager.getPairingByKeepdPubkey(keepdPubkey);
    if (pairing && pairing.expiresAt > Date.now()) {
      log('getAgentKeys: found pending pairing %s for pubkey:%s', pairing.name, keepdPubkey);
      return {
        keepdPubkey: pairing.keepdPubkey,
        keepdPrivkey: pairing.keepdPrivkey,
        agentPubkey: '',
      };
    }

    log('getAgentKeys: no match for pubkey:%s', keepdPubkey);
    return null;
  }

  /**
   * Handle an incoming RPC request (called by RPCHandler.onRequest).
   */
  async handleRequest(
    request: RPCRequest,
    agentKeys: AgentKeys,
    eventId: string
  ): Promise<{ result?: unknown; error?: RPCError }> {
    log('handleRequest method:%s service:%s from agent pubkey:%s',
      request.method, request.service ?? '-', agentKeys.agentPubkey || '(pending)');

    // Route built-in methods
    switch (request.method) {
      case 'pair':
        return this.handlePair(request, agentKeys);
      case 'ping':
        return this.handlePing();
      case 'help':
        return this.handleHelp(request);
    }

    // Service methods require a paired (or paused) agent
    const agent = this.agentManager.getAgentByKeepdPubkey(agentKeys.keepdPubkey);
    if (!agent || agent.status === 'revoked') {
      return {
        error: { code: 'not_paired', message: 'Agent not paired' },
      };
    }

    // Paused agents get immediate rejection
    if (agent.status === 'paused') {
      return {
        error: { code: 'permission_denied', message: 'Agent is paused' },
      };
    }

    // Emit agent_connected on first RPC (when agent was not previously seen)
    if (agent.lastSeenAt === null) {
      this.sse.broadcast('agent_connected', {
        id: agent.id,
        name: agent.name,
        agentPubkey: agent.agentPubkey,
      });
    }

    // Touch agent last_seen
    this.agentManager.touchAgent(agent.id);

    // Must have service + method for connector calls
    const service = request.service;
    if (!service) {
      return {
        error: { code: 'invalid_request', message: 'Service is required' },
      };
    }

    const method = request.method;
    const params = (request.params as Record<string, unknown>) ?? {};
    const accountId = request.account ?? '';

    // Validate service exists and is connected
    const connector = this.connectorExecutor.getConnector(service);
    if (!connector) {
      const allHelp = this.connectorExecutor.getHelp() as ServiceHelp[];
      await this.enrichHelpWithAccounts(allHelp);
      const available = allHelp
        .filter((s) => s.accounts && s.accounts.length > 0)
        .map((s) => ({
          service: s.service,
          summary: s.summary,
        }));
      const text = renderUnknownService(service, available);
      return {
        error: { code: 'not_found', message: `Unknown service: ${service}`, text },
      };
    }

    // Validate method exists
    const methodDef = connector.methods.find((m) => m.name === method);
    if (!methodDef) {
      const text = renderUnknownMethod(service, method, connector.methods);
      return {
        error: { code: 'not_found', message: `Unknown method: ${service}.${method}`, text },
      };
    }

    // Validate required parameters
    const missingParams = methodDef.params
      .filter(p => p.required && !(p.name in params))
      .map(p => p.name);
    if (missingParams.length > 0) {
      const text = renderMissingParams(service, method, missingParams, methodDef.params);
      return {
        error: { code: 'invalid_request', message: `Missing required parameters: ${missingParams.join(', ')}`, text },
      };
    }

    // Validate account is connected
    if (accountId) {
      const connections = await this.connectionManager.listConnectionsByService(service);
      const match = connections.find((c) => c.accountId === accountId);
      if (!match || (match.status !== 'connected' && match.status !== 'paused')) {
        return {
          error: {
            code: 'not_connected',
            message: `Account ${accountId} is not connected for ${service}`,
          },
        };
      }
      if (match.status === 'paused') {
        return {
          error: {
            code: 'permission_denied',
            message: `App ${service} (${accountId}) is paused`,
          },
        };
      }
    } else {
      // If no account specified, find first connected account or require --account
      const connections = await this.connectionManager.listConnectionsByService(service);
      const connected = connections.filter((c) => c.status === 'connected');

      if (connected.length === 0) {
        // Check if all accounts are paused
        const paused = connections.find((c) => c.status === 'paused');
        if (paused) {
          return {
            error: {
              code: 'permission_denied',
              message: `App ${service} is paused`,
            },
          };
        }
        return {
          error: {
            code: 'not_connected',
            message: `No connected account for ${service}`,
          },
        };
      }

      if (connected.length > 1) {
        const accounts = connected.map(c => ({
          id: c.accountId,
          label: (c.metadata as any)?.displayName as string | undefined,
        }));
        const text = renderMultipleAccounts(service, connector.name, method, accounts);
        return {
          error: { code: 'invalid_request', message: 'Multiple accounts available, specify --account', text },
        };
      }

      // Use the single connected account
      (params as any).__accountId = connected[0].accountId;
    }

    const effectiveAccountId = accountId || (params as any).__accountId;
    delete (params as any).__accountId;

    return this.executeServiceMethod(
      agent,
      service,
      method,
      params,
      effectiveAccountId,
      request
    );
  }

  private async handlePair(
    request: RPCRequest,
    agentKeys: AgentKeys
  ): Promise<{ result?: unknown; error?: RPCError }> {
    const params = request.params as Record<string, unknown> | undefined;
    const secret = params?.secret as string | undefined;

    if (!secret) {
      return {
        error: { code: 'invalid_request', message: 'Missing pairing secret' },
      };
    }

    try {
      // The agent pubkey comes from the nostr event author
      // In the RPC handler, agentKeys.agentPubkey was set to '' for pending pairings
      // but the actual agent pubkey is available from the event
      // We need to extract it — RPCHandler passes it via the event
      // Actually, we need to get the real agent pubkey. Let me check how it's passed.
      // The agentPubkey for pending pairings is '' but the actual agent pubkey
      // was used by RPCHandler to decrypt. We need the event's pubkey.
      // In RPCHandler.handleEvent, it creates encryption with event.pubkey.
      // But the agentKeys.agentPubkey was '' for pending pairings.
      // We need to fix this — the actual agent pubkey should come from somewhere.
      // Looking at RPCHandler, the event.pubkey IS the agent's pubkey.
      // Let's use a convention: for pairing, we pass the agent pubkey in params.

      const agentPubkey = params?.pubkey as string;
      if (!agentPubkey) {
        return {
          error: { code: 'invalid_request', message: 'Missing agent pubkey' },
        };
      }

      log('completing pairing for agent pubkey:%s', agentPubkey);
      const agent = this.agentManager.completePairing(agentPubkey, secret);
      log('pairing completed: agent %s (%s)', agent.name, agent.id);

      // Create default policies for all connected accounts
      const connectedAccounts: { service: string; accountId: string }[] = [];
      for (const svc of this.connectorExecutor.getRegisteredServices()) {
        const conns = await this.connectionManager.listConnectionsByService(svc);
        for (const c of conns) {
          if (c.status === 'connected') {
            connectedAccounts.push({ service: svc, accountId: c.accountId });
          }
        }
      }
      this.policyEngine.createDefaultsForAgent(agent.id, connectedAccounts);

      // Emit SSE event
      this.sse.broadcast('pairing_completed', {
        id: agent.id,
        name: agent.name,
        agentPubkey: agent.agentPubkey,
      });

      // Sync with billing (best-effort, non-blocking)
      this.billingManager?.registerAgent({
        agent_pubkey: agent.agentPubkey,
        name: agent.name,
      }).catch(() => {});

      return {
        result: {
          success: true,
          agentId: agent.id,
          name: agent.name,
          protocolVersion: PROTOCOL_VERSION,
          version: SOFTWARE_VERSION,
        },
      };
    } catch (err: any) {
      return {
        error: { code: 'invalid_request', message: err.message },
      };
    }
  }

  private handlePing(): { result?: unknown; error?: RPCError } {
    return {
      result: {
        protocolVersion: PROTOCOL_VERSION,
        version: SOFTWARE_VERSION,
        timestamp: Date.now(),
      },
    };
  }

  private async handleHelp(
    request: RPCRequest
  ): Promise<{ result?: unknown; error?: RPCError }> {
    const service = request.service;
    const params = request.params as Record<string, unknown> | undefined;
    const method = params?.method as string | undefined;

    if (!service) {
      // Level 1: list connected services only
      const help = this.connectorExecutor.getHelp() as ServiceHelp[];
      await this.enrichHelpWithAccounts(help);
      const connected = help.filter((s) => s.accounts && s.accounts.length > 0);
      return { result: { text: renderServiceList(connected) } };
    }

    // Validate service exists and is connected
    const connector = this.connectorExecutor.getConnector(service);
    if (!connector) {
      const allHelp = this.connectorExecutor.getHelp() as ServiceHelp[];
      await this.enrichHelpWithAccounts(allHelp);
      const available = allHelp
        .filter((s) => s.accounts && s.accounts.length > 0)
        .map((s) => ({
          service: s.service,
          summary: s.summary,
        }));
      const text = renderUnknownService(service, available);
      return {
        error: { code: 'not_found', message: `Unknown service: ${service}`, text },
      };
    }

    // Lazy-init MCP connectors that haven't loaded tools yet
    if (connector.methods.length === 0 && connector.ensureReady) {
      try {
        const connections = await this.connectionManager.listConnectionsByService(service);
        const active = connections.find((c) => c.status === 'connected');
        if (active) {
          const creds = await this.connectionManager.getCredentials({ service, accountId: active.accountId });
          await connector.ensureReady(creds);
        }
      } catch (err) {
        log('help: lazy-init for %s failed: %O', service, err);
      }
    }

    const svcHelp = connector.help(method);
    await this.enrichHelpWithAccounts([svcHelp]);

    if (!method) {
      // Level 2: service methods
      return { result: { text: renderServiceMethods(svcHelp) } };
    }

    // Validate method exists
    const methodDef = connector.methods.find((m) => m.name === method);

    if (!methodDef) {
      // Check if it's a method group prefix (e.g. "pages" matches "pages.create", "pages.update")
      const groupMethods = connector.methods.filter((m) => m.name.startsWith(method + '.'));
      if (groupMethods.length > 0) {
        const fullHelp = connector.help();
        fullHelp.methods = groupMethods;
        await this.enrichHelpWithAccounts([fullHelp]);
        return { result: { text: renderServiceMethods(fullHelp) } };
      }

      const text = renderUnknownMethod(service, method, connector.methods);
      return {
        error: { code: 'not_found', message: `Unknown method: ${service}.${method}`, text },
      };
    }

    // Level 3: method detail — need full service help for rendering context
    const fullHelp = connector.help();
    await this.enrichHelpWithAccounts([fullHelp]);
    return { result: { text: renderMethodDetail(fullHelp, method) } };
  }

  private async enrichHelpWithAccounts(
    services: ServiceHelp[]
  ): Promise<void> {
    for (const svc of services) {
      const connections = await this.connectionManager.listConnectionsByService(svc.service);
      svc.accounts = connections
        .filter((c) => c.status === 'connected')
        .map((c) => ({
          id: c.accountId,
          label: (c.metadata?.displayName as string) ?? undefined,
        }));
    }
  }

  private async executeServiceMethod(
    agent: Agent,
    service: string,
    method: string,
    params: Record<string, unknown>,
    accountId: string,
    request: RPCRequest
  ): Promise<{ result?: unknown; error?: RPCError }> {
    const startTime = Date.now();

    // Fetch credentials early so MCP connectors can lazy-init their tool list
    const credentials = await this.connectionManager.getCredentials({
      service,
      accountId,
    });

    const connector = this.connectorExecutor.getConnector(service);
    if (connector?.ensureReady) {
      await connector.ensureReady(credentials);
    }

    // Extract permission metadata
    const metadata = this.connectorExecutor.extractPermMetadata(
      service,
      method,
      params,
      accountId
    );

    // Policy check
    const decision = this.policyEngine.evaluate(agent.id, metadata);

    if (decision === 'deny') {
      this.auditLogger.log({
        agent,
        metadata,
        policyAction: 'deny',
        approved: false,
        approvedBy: 'policy',
        responseStatus: 'error',
        errorMessage: 'Permission denied by policy',
        durationMs: Date.now() - startTime,
      });

      return {
        error: {
          code: 'permission_denied',
          message: `Permission denied: ${metadata.description}`,
        },
      };
    }

    // Approval flow if needed
    if (decision === 'ask') {
      const approvalResult = await this.approvalQueue.requestApproval(
        agent,
        metadata,
        request
      );

      if (approvalResult === 'denied') {
        this.auditLogger.log({
          agent,
          metadata,
          policyAction: 'ask',
          approved: false,
          approvedBy: 'user',
          responseStatus: 'error',
          errorMessage: 'Request denied by user',
          durationMs: Date.now() - startTime,
        });

        return {
          error: {
            code: 'permission_denied',
            message: 'Request denied by user',
          },
        };
      }

      if (approvalResult === 'expired') {
        this.auditLogger.log({
          agent,
          metadata,
          policyAction: 'ask',
          approved: false,
          approvedBy: 'timeout',
          responseStatus: 'error',
          errorMessage: 'Approval timed out',
          durationMs: Date.now() - startTime,
        });

        return {
          error: {
            code: 'approval_timeout',
            message: 'Approval request timed out',
          },
        };
      }
    }

    // Execute connector
    try {
      const result = await this.connectorExecutor.execute(
        service,
        method,
        params,
        credentials
      );

      this.auditLogger.log({
        agent,
        metadata,
        policyAction: decision,
        approved: true,
        approvedBy: decision === 'allow' ? 'policy' : 'user',
        responseStatus: 'success',
        durationMs: Date.now() - startTime,
      });

      return { result };
    } catch (err: any) {
      // If AuthError, the connection's token is invalid — persist and notify UI
      if (err instanceof AuthError) {
        await this.connectionManager.markError({ service, accountId: effectiveAccountId }, err.message);
        this.sse.broadcast('connection_updated', {
          service,
          accountId: effectiveAccountId,
          status: 'error',
          error: err.message,
        });
      }

      this.auditLogger.log({
        agent,
        metadata,
        policyAction: decision,
        approved: true,
        approvedBy: decision === 'allow' ? 'policy' : 'user',
        responseStatus: 'error',
        errorMessage: err.message,
        durationMs: Date.now() - startTime,
      });

      return {
        error: {
          code: 'service_error',
          message: err.message || 'Service error',
        },
      };
    }
  }
}
