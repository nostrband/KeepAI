// KeepAI protocol constants

// --- Nostr Event Kinds ---

export const EVENT_KINDS = {
  RPC_REQUEST: 21700,
  RPC_READY: 21701,
  RPC_REJECT: 21702,
  RPC_RESPONSE: 21703,
  RPC_READY_RESPONSE: 21704,
  STREAM_CHUNK: 20173,
  STREAM_METADATA: 173,
} as const;

// --- Protocol Version ---

export const PROTOCOL_VERSION = 1;
export const SOFTWARE_VERSION = '0.1.0';

// --- Default Relays ---

export const DEFAULT_RELAYS = [
  'wss://relay1.getkeep.ai',
  'wss://relay2.getkeep.ai',
] as const;

// --- Timeouts (milliseconds) ---

export const TIMEOUTS = {
  /** Overall request timeout (includes approval wait) */
  REQUEST: 300_000,         // 5 min
  /** Agent must confirm readiness for streamed response */
  READY_RESPONSE: 60_000,  // 60s
  /** TTL between consecutive stream chunks */
  STREAM_CHUNK: 60_000,    // 60s
  /** Pairing code validity */
  PAIRING: 600_000,        // 10 min
  /** Approval queue poll interval */
  APPROVAL_POLL: 500,      // 500ms
} as const;

// --- Default Policy ---

import type { Policy, PolicyV2, PolicyDecision, OperationType } from './types.js';

export const DEFAULT_POLICY: Policy = {
  default: 'ask',
  rules: [
    { operations: ['read'], action: 'allow' },
    { operations: ['write', 'delete'], action: 'ask' },
  ],
};

/** Default policy action per operation category */
export const DEFAULT_CATEGORY_ACTIONS: Record<OperationType, PolicyDecision> = {
  read: 'allow',
  write: 'ask',
  delete: 'ask',
};

export const DEFAULT_POLICY_V2: PolicyV2 = {
  version: 2,
  default: 'ask',
  categories: {
    read: { action: 'allow' },
    write: { action: 'ask' },
    delete: { action: 'ask' },
  },
};

/** Extract method group prefix (e.g. "messages" from "messages.send") */
export function getMethodGroup(method: string): string {
  const dot = method.indexOf('.');
  return dot === -1 ? method : method.slice(0, dot);
}

/** Migrate a V1 policy to V2 format. V2 policies pass through unchanged. */
export function migratePolicy(policy: Policy | PolicyV2): PolicyV2 {
  if ('version' in policy && policy.version === 2) return policy as PolicyV2;
  const v1 = policy as Policy;
  const actions: Record<string, PolicyDecision> = { read: 'allow', write: 'ask', delete: 'ask' };
  for (const rule of v1.rules ?? []) {
    for (const op of rule.operations ?? []) {
      actions[op] = rule.action;
    }
  }
  return {
    version: 2,
    default: v1.default ?? 'ask',
    categories: {
      read: { action: actions.read as PolicyDecision },
      write: { action: actions.write as PolicyDecision },
      delete: { action: actions.delete as PolicyDecision },
    },
  };
}

// --- Server Config ---

export const DEFAULT_PORT = 28417;
export const DEFAULT_DATA_DIR = '~/.keepai';

// --- Billing ---

export const BILLING_API_URL = 'https://dashboard.getkeep.ai';

export const FREE_PLAN = {
  plan_id: null as string | null,
  plan_name: 'Free',
  status: null as string | null,
  max_agents: 1,
  max_apps: 1,
} as const;

// --- CLI Exit Codes ---

export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  NOT_PAIRED: 2,
  PERMISSION_DENIED: 3,
  APPROVAL_TIMEOUT: 4,
  SERVICE_ERROR: 5,
} as const;

// --- Cleanup Intervals ---

export const CLEANUP = {
  /** How often to run cleanup jobs */
  INTERVAL: 5 * 60 * 1000,        // 5 min
  /** Max age for rpc_requests records */
  RPC_REQUESTS_MAX_AGE: 60 * 60 * 1000,  // 1 hour
  /** Max age for resolved approvals */
  APPROVALS_MAX_AGE: 7 * 24 * 60 * 60 * 1000,  // 7 days
  /** Max age for audit log entries */
  AUDIT_LOG_MAX_AGE: 30 * 24 * 60 * 60 * 1000,  // 30 days
} as const;
