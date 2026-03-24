/**
 * PolicyEngine — evaluates agent requests against per-agent per-service per-account policies.
 *
 * Supports both V1 (flat rules) and V2 (granular category→group→method) policies.
 * V1 policies are auto-migrated to V2 on read.
 */

import type {
  Policy,
  PolicyV2,
  PolicyDecision,
  PermissionMetadata,
} from '@keepai/proto';
import { DEFAULT_POLICY, DEFAULT_POLICY_V2, migratePolicy, getMethodGroup } from '@keepai/proto';
import type { KeepDBApi, PolicyEntry } from '@keepai/db';

interface CachedPolicy {
  policy: PolicyV2;
  updatedAt: number;
}

export class PolicyEngine {
  private cache = new Map<string, CachedPolicy>();

  constructor(private db: KeepDBApi) {}

  /**
   * Evaluate a request against the agent's policy for the given service+account.
   */
  evaluate(agentId: string, metadata: PermissionMetadata): PolicyDecision {
    const policy = this.getPolicyV2(metadata.service, metadata.accountId, agentId);
    return this.match(policy, metadata);
  }

  /**
   * Get policy for a specific (service, accountId, agentId) tuple.
   * Returns the raw stored policy (V1 or V2) for API responses.
   */
  getPolicy(service: string, accountId: string, agentId: string): Policy | PolicyV2 {
    const entry = this.db.policies.get(service, accountId, agentId);
    if (!entry) return DEFAULT_POLICY_V2;
    return entry.policy;
  }

  /**
   * Get policy as V2, auto-migrating V1 if needed.
   */
  private getPolicyV2(service: string, accountId: string, agentId: string): PolicyV2 {
    const cacheKey = `${service}:${accountId}:${agentId}`;
    const entry = this.db.policies.get(service, accountId, agentId);

    if (!entry) {
      return DEFAULT_POLICY_V2;
    }

    const cached = this.cache.get(cacheKey);
    if (cached && cached.updatedAt === entry.updatedAt) {
      return cached.policy;
    }

    const migrated = migratePolicy(entry.policy);
    this.cache.set(cacheKey, { policy: migrated, updatedAt: entry.updatedAt });
    return migrated;
  }

  /**
   * Save (upsert) a policy. Accepts V1 or V2.
   */
  savePolicy(service: string, accountId: string, agentId: string, policy: Policy | PolicyV2): void {
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
          policy: DEFAULT_POLICY_V2,
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
          policy: DEFAULT_POLICY_V2,
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
   * Evaluate V2 policy: category → group → method → default.
   */
  private match(policy: PolicyV2, metadata: PermissionMetadata): PolicyDecision {
    const category = policy.categories[metadata.operationType];
    if (!category || category.action !== 'custom') {
      return (category?.action as PolicyDecision) ?? policy.default;
    }

    // Category is custom — check group
    const group = getMethodGroup(metadata.method);
    const groupPolicy = category.groups?.[group];
    if (!groupPolicy) return policy.default;
    if (groupPolicy.action !== 'custom') return groupPolicy.action as PolicyDecision;

    // Group is custom — check method
    const methodPolicy = groupPolicy.methods?.[metadata.method];
    if (!methodPolicy) return policy.default;
    return methodPolicy.action;
  }
}
