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
import type { RPCRequest, RPCError, Agent } from '@keepai/proto';
import { PROTOCOL_VERSION, SOFTWARE_VERSION } from '@keepai/proto';

const log = createDebug('keepai:router');
import { AuthError, isClassifiedError } from '@keepai/proto';
import type { AgentKeys } from '@keepai/nostr-rpc';
import type { AgentManager } from './managers/agent-manager.js';
import type { PolicyEngine } from './managers/policy-engine.js';
import type { ApprovalQueue } from './managers/approval-queue.js';
import type { AuditLogger } from './managers/audit-logger.js';
import type { ConnectorExecutor, ConnectionManager } from '@keepai/connectors';
import type { SSEBroadcaster } from './sse.js';

export interface RPCRouterOptions {
  agentManager: AgentManager;
  policyEngine: PolicyEngine;
  approvalQueue: ApprovalQueue;
  auditLogger: AuditLogger;
  connectorExecutor: ConnectorExecutor;
  connectionManager: ConnectionManager;
  sse: SSEBroadcaster;
}

export class RPCRouter {
  private agentManager: AgentManager;
  private policyEngine: PolicyEngine;
  private approvalQueue: ApprovalQueue;
  private auditLogger: AuditLogger;
  private connectorExecutor: ConnectorExecutor;
  private connectionManager: ConnectionManager;
  private sse: SSEBroadcaster;

  constructor(options: RPCRouterOptions) {
    this.agentManager = options.agentManager;
    this.policyEngine = options.policyEngine;
    this.approvalQueue = options.approvalQueue;
    this.auditLogger = options.auditLogger;
    this.connectorExecutor = options.connectorExecutor;
    this.connectionManager = options.connectionManager;
    this.sse = options.sse;
  }

  /**
   * Get agent keys for a keepd pubkey (used by RPCHandler.getAgentKeys callback).
   */
  getAgentKeys(keepdPubkey: string): AgentKeys | null {
    // Check paired agents first
    const agent = this.agentManager.getAgentByKeepdPubkey(keepdPubkey);
    if (agent && agent.status === 'paired') {
      log('getAgentKeys: found paired agent %s for pubkey:%s', agent.name, keepdPubkey);
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

    // Service methods require a paired agent
    const agent = this.agentManager.getAgentByKeepdPubkey(agentKeys.keepdPubkey);
    if (!agent || agent.status !== 'paired') {
      return {
        error: { code: 'not_paired', message: 'Agent not paired' },
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

    // Validate service exists
    const connector = this.connectorExecutor.getConnector(service);
    if (!connector) {
      return {
        error: { code: 'not_found', message: `Unknown service: ${service}` },
      };
    }

    // Validate method exists
    const methodDef = connector.methods.find((m) => m.name === method);
    if (!methodDef) {
      return {
        error: { code: 'not_found', message: `Unknown method: ${service}.${method}` },
      };
    }

    // Validate account is connected
    if (accountId) {
      const connections = await this.connectionManager.listConnectionsByService(service);
      const connected = connections.find(
        (c) => c.accountId === accountId && c.status === 'connected'
      );
      if (!connected) {
        return {
          error: {
            code: 'not_connected',
            message: `Account ${accountId} is not connected for ${service}`,
          },
        };
      }
    } else {
      // If no account specified, find first connected account
      const connections = await this.connectionManager.listConnectionsByService(service);
      const firstConnected = connections.find((c) => c.status === 'connected');
      if (!firstConnected) {
        return {
          error: {
            code: 'not_connected',
            message: `No connected account for ${service}`,
          },
        };
      }
      // Use the first connected account
      (params as any).__accountId = firstConnected.accountId;
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

      // Create default policies
      const services = this.connectorExecutor.getRegisteredServices();
      this.policyEngine.createDefaults(agent.agentPubkey, services);

      // Emit SSE event
      this.sse.broadcast('pairing_completed', {
        id: agent.id,
        name: agent.name,
        agentPubkey: agent.agentPubkey,
      });

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

  private handleHelp(
    request: RPCRequest
  ): { result?: unknown; error?: RPCError } {
    const service = request.service;
    if (service) {
      try {
        const help = this.connectorExecutor.getHelp(service);
        return { result: help };
      } catch {
        return {
          error: { code: 'not_found', message: `Unknown service: ${service}` },
        };
      }
    }

    // List all services
    const help = this.connectorExecutor.getHelp();
    return { result: help };
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

    // Extract permission metadata
    const metadata = this.connectorExecutor.extractPermMetadata(
      service,
      method,
      params,
      accountId
    );

    // Policy check
    const decision = this.policyEngine.evaluate(agent.agentPubkey, metadata);

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
      const credentials = await this.connectionManager.getCredentials({
        service,
        accountId,
      });

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
      // If AuthError, the connection's token is invalid — notify UI
      if (err instanceof AuthError) {
        this.sse.broadcast('connection_updated', {
          service,
          accountId,
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
