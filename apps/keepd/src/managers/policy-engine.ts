/**
 * PolicyEngine — evaluates agent requests against per-agent per-service policies.
 *
 * Policies are stored as JSON files:
 *   {dataDir}/agents/{agentPubkey}/policies/{service}.json
 *
 * Evaluation: first matching rule wins, fallback to default action.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  Policy,
  PolicyRule,
  PolicyDecision,
  PermissionMetadata,
} from '@keepai/proto';
import { DEFAULT_POLICY } from '@keepai/proto';

interface CachedPolicy {
  policy: Policy;
  mtime: number;
}

export class PolicyEngine {
  private dataDir: string;
  private cache = new Map<string, CachedPolicy>();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  /**
   * Evaluate a request against the agent's policy for the given service.
   */
  evaluate(agentPubkey: string, metadata: PermissionMetadata): PolicyDecision {
    const policy = this.loadPolicy(agentPubkey, metadata.service);
    return this.match(policy, metadata);
  }

  /**
   * Load policy from disk with mtime caching.
   */
  private loadPolicy(agentPubkey: string, service: string): Policy {
    const filePath = this.getPolicyPath(agentPubkey, service);
    const cacheKey = `${agentPubkey}:${service}`;

    try {
      const stat = fs.statSync(filePath);
      const mtime = stat.mtimeMs;

      const cached = this.cache.get(cacheKey);
      if (cached && cached.mtime === mtime) {
        return cached.policy;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const policy = JSON.parse(content) as Policy;

      this.cache.set(cacheKey, { policy, mtime });
      return policy;
    } catch {
      // No policy file → use defaults
      return DEFAULT_POLICY;
    }
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
    // Must match operation type
    if (!rule.operations.includes(metadata.operationType)) {
      return false;
    }

    // If methods filter specified, must match
    if (rule.methods && rule.methods.length > 0) {
      if (!rule.methods.includes(metadata.method)) {
        return false;
      }
    }

    // If accounts filter specified, must match
    if (rule.accounts && rule.accounts.length > 0) {
      if (!rule.accounts.includes(metadata.accountId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Save a policy file (from UI or CLI).
   */
  savePolicy(agentPubkey: string, service: string, policy: Policy): void {
    const filePath = this.getPolicyPath(agentPubkey, service);
    const dir = path.dirname(filePath);

    fs.mkdirSync(dir, { recursive: true });
    const content = JSON.stringify(policy, null, 2);

    // Atomic write via temp file
    const tmpPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpPath, content, { mode: 0o600 });
    fs.renameSync(tmpPath, filePath);

    // Invalidate cache
    this.cache.delete(`${agentPubkey}:${service}`);
  }

  /**
   * Get the current policy for an agent+service.
   */
  getPolicy(agentPubkey: string, service: string): Policy {
    return this.loadPolicy(agentPubkey, service);
  }

  /**
   * Create default policies for a newly paired agent.
   */
  createDefaults(agentPubkey: string, services: string[]): void {
    for (const service of services) {
      const filePath = this.getPolicyPath(agentPubkey, service);
      if (!fs.existsSync(filePath)) {
        this.savePolicy(agentPubkey, service, DEFAULT_POLICY);
      }
    }
  }

  /**
   * Delete all policies for an agent.
   */
  deleteAgentPolicies(agentPubkey: string): void {
    const agentDir = path.join(this.dataDir, 'agents', agentPubkey);
    try {
      fs.rmSync(agentDir, { recursive: true, force: true });
    } catch {
      // Already gone
    }

    // Clear cache entries for this agent
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${agentPubkey}:`)) {
        this.cache.delete(key);
      }
    }
  }

  private getPolicyPath(agentPubkey: string, service: string): string {
    // Validate inputs to prevent path traversal
    if (!/^[a-f0-9]+$/.test(agentPubkey)) {
      throw new Error('Invalid agent pubkey format');
    }
    if (!/^[a-z0-9_-]+$/.test(service)) {
      throw new Error('Invalid service ID format');
    }
    return path.join(
      this.dataDir,
      'agents',
      agentPubkey,
      'policies',
      `${service}.json`
    );
  }
}
