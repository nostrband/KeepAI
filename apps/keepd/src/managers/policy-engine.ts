/**
 * PolicyEngine — evaluates agent requests against per-agent per-service per-account policies.
 *
 * Policies are stored in SQLite keyed by (service, accountId, agentId).
 * Evaluation: first matching rule wins, fallback to default action.
 */

import type {
  Policy,
  PolicyRule,
  PolicyDecision,
  PermissionMetadata,
} from '@keepai/proto';
import { DEFAULT_POLICY } from '@keepai/proto';
import type { KeepDBApi, PolicyEntry } from '@keepai/db';

interface CachedPolicy {
  policy: Policy;
  updatedAt: number;
}

export class PolicyEngine {
  private cache = new Map<string, CachedPolicy>();

  constructor(private db: KeepDBApi) {}

  /**
   * Evaluate a request against the agent's policy for the given service+account.
   */
  evaluate(agentId: string, metadata: PermissionMetadata): PolicyDecision {
    const policy = this.getPolicy(metadata.service, metadata.accountId, agentId);
    return this.match(policy, metadata);
  }

  /**
   * Get policy for a specific (service, accountId, agentId) tuple.
   */
  getPolicy(service: string, accountId: string, agentId: string): Policy {
    const cacheKey = `${service}:${accountId}:${agentId}`;
    const entry = this.db.policies.get(service, accountId, agentId);

    if (!entry) {
      return DEFAULT_POLICY;
    }

    const cached = this.cache.get(cacheKey);
    if (cached && cached.updatedAt === entry.updatedAt) {
      return cached.policy;
    }

    this.cache.set(cacheKey, { policy: entry.policy, updatedAt: entry.updatedAt });
    return entry.policy;
  }

  /**
   * Save (upsert) a policy.
   */
  savePolicy(service: string, accountId: string, agentId: string, policy: Policy): void {
    this.db.policies.upsert({ service, accountId, agentId, policy });
    this.cache.delete(`${service}:${accountId}:${agentId}`);
  }

  /**
   * Create default policies for a newly paired agent across all connections.
   */
  createDefaultsForAgent(agentId: string, connections: { service: string; accountId: string }[]): void {
    for (const conn of connections) {
      const existing = this.db.policies.get(conn.service, conn.accountId, agentId);
      if (!existing) {
        this.db.policies.upsert({
          service: conn.service,
          accountId: conn.accountId,
          agentId,
          policy: DEFAULT_POLICY,
        });
      }
    }
  }

  /**
   * Create default policies for a new connection across all paired agents.
   */
  createDefaultsForConnection(service: string, accountId: string, agentIds: string[]): void {
    for (const agentId of agentIds) {
      const existing = this.db.policies.get(service, accountId, agentId);
      if (!existing) {
        this.db.policies.upsert({
          service,
          accountId,
          agentId,
          policy: DEFAULT_POLICY,
        });
      }
    }
  }

  /**
   * Delete all policies for an agent.
   */
  deleteByAgent(agentId: string): void {
    this.db.policies.deleteByAgent(agentId);
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${agentId}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Delete all policies for a connection (service+accountId).
   */
  deleteByConnection(service: string, accountId: string): void {
    this.db.policies.deleteByConnection(service, accountId);
    const prefix = `${service}:${accountId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * List all policies for an agent.
   */
  listByAgent(agentId: string): PolicyEntry[] {
    return this.db.policies.listByAgent(agentId);
  }

  /**
   * List all policies for a connection.
   */
  listByConnection(service: string, accountId: string): PolicyEntry[] {
    return this.db.policies.listByConnection(service, accountId);
  }

  /**
   * Match request against policy rules. First match wins.
   */
  private match(policy: Policy, metadata: PermissionMetadata): PolicyDecision {
    for (const rule of policy.rules) {
      if (this.ruleMatches(rule, metadata)) {
        return rule.action;
      }
    }
    return policy.default;
  }

  /**
   * Check if a single rule matches the request.
   */
  private ruleMatches(rule: PolicyRule, metadata: PermissionMetadata): boolean {
    if (!rule.operations.includes(metadata.operationType)) {
      return false;
    }

    if (rule.methods && rule.methods.length > 0) {
      if (!rule.methods.includes(metadata.method)) {
        return false;
      }
    }

    return true;
  }
}
