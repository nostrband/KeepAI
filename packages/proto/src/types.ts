// Core type definitions for KeepAI

// --- RPC Messages ---

export interface RPCRequest {
  id: string;
  method: string;
  service?: string;
  params?: unknown;
  account?: string;
  protocolVersion: number;
  version: string;
}

export interface RPCResponse {
  id: string;
  protocolVersion: number;
  version: string;
  result?: unknown;
  error?: RPCError;
}

export interface RPCError {
  code: RPCErrorCode;
  message: string;
  text?: string;
}

export type RPCErrorCode =
  | 'not_found'
  | 'permission_denied'
  | 'approval_timeout'
  | 'service_error'
  | 'invalid_request'
  | 'internal_error'
  | 'incompatible_protocol'
  | 'not_paired'
  | 'not_connected';

// --- Policy & Permissions ---

export type PolicyDecision = 'allow' | 'deny' | 'ask';
export type OperationType = 'read' | 'write' | 'delete';

export interface PermissionMetadata {
  service: string;
  accountId: string;
  method: string;
  operationType: OperationType;
  resourceType?: string;
  description: string;
}

export interface PolicyRule {
  operations: OperationType[];
  action: PolicyDecision;
  methods?: string[];
  accounts?: string[];
}

export interface Policy {
  default: PolicyDecision;
  rules: PolicyRule[];
}

// --- Policy V2 (granular per-method/group) ---

export type CategoryAction = PolicyDecision | 'custom';

export interface MethodPolicy {
  action: PolicyDecision;
}

export interface GroupPolicy {
  action: CategoryAction;
  methods?: Record<string, MethodPolicy>;
}

export interface CategoryPolicy {
  action: CategoryAction;
  groups?: Record<string, GroupPolicy>;
}

export interface PolicyV2 {
  version: 2;
  default: PolicyDecision;
  categories: {
    read: CategoryPolicy;
    write: CategoryPolicy;
    delete: CategoryPolicy;
  };
}

// --- Resolvable IDs ---

export interface ResolvableType {
  /** Human label shown before resolution, e.g. "Page", "Database" */
  label: string;
  /**
   * Optional map of method name → param key that holds this ID type.
   * Used when the param key doesn't match the resolvable type name directly.
   * E.g. Gmail's message_id is passed as bare "id": { 'messages.get': 'id' }
   * If omitted, the type name itself is used as the param key.
   */
  params?: Record<string, string>;
}

export interface ResolveResult {
  /** Human-readable title, e.g. "Meeting Notes Q1" */
  title: string;
  /** Optional deep-link to the resource in the service's web UI */
  url?: string;
}

/**
 * Convert a description with [type:id] markup to plain text.
 * "[page_id:abc123]" → "Page: abc123"
 * Useful for notifications and logs where rich rendering isn't available.
 */
export function formatDescriptionPlain(
  description: string,
  resolvableTypes?: Record<string, ResolvableType>
): string {
  return description.replace(/\[([a-z_]+):([^\]]+)\]/g, (_match, type: string, id: string) => {
    const label = resolvableTypes?.[type]?.label
      ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `${label}: ${id}`;
  });
}

// --- Connector Interfaces ---

export interface ParamSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: unknown;
  enum?: string[];
  syntax?: string[];
}

export interface ConnectorMethod {
  name: string;
  description: string;
  operationType: OperationType;
  params: ParamSchema[];
  returns: string;
  example?: {
    params: Record<string, unknown>;
    description: string;
  };
  seeAlso?: string[];
  responseExample?: unknown;
  notes?: string[];
}

export interface ServiceHelp {
  service: string;
  name: string;
  summary?: string;
  methods: ConnectorMethod[];
  accounts?: Array<{ id: string; label?: string }>;
  /** Descriptions for method prefix groups (e.g. { messages: 'Send, receive ...' }) */
  groupDescriptions?: Record<string, string>;
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

export interface Connector {
  service: string;
  name: string;
  methods: ConnectorMethod[];

  /** Ensure connector is ready (e.g. MCP tool list loaded). Called with credentials before execute/validation. */
  ensureReady?(credentials: OAuthCredentials): Promise<void>;

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata;

  execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown>;

  help(method?: string): ServiceHelp;

  /** Optional descriptions for method prefix groups (e.g. { messages: 'Send, receive, reply ...' }) */
  groupDescriptions?: Record<string, string>;

  /**
   * Map of resolvable ID type keys to their metadata.
   * Optional — connectors without resolvable IDs omit this.
   */
  resolvableTypes?: Record<string, ResolvableType>;

  /**
   * Resolve a single ID to a human-readable title + optional URL.
   * Called on-demand from the UI via the daemon's resolve endpoint.
   * Must not throw — return null on failure.
   */
  resolveId?(
    type: string,
    id: string,
    credentials: OAuthCredentials
  ): Promise<ResolveResult | null>;
}

// --- Database Row Types ---

export type AgentStatus = 'paired' | 'paused' | 'revoked';

export interface Agent {
  id: string;
  name: string;
  type: string;
  agentPubkey: string;
  keepdPubkey: string;
  keepdPrivkey: string;
  status: AgentStatus;
  pairedAt: number;
  lastSeenAt: number | null;
  createdAt: number;
}

export interface PendingPairing {
  id: string;
  name: string;
  type: string;
  secret: string;
  keepdPubkey: string;
  keepdPrivkey: string;
  expiresAt: number;
  createdAt: number;
}

export type ConnectionStatus = 'connected' | 'paused' | 'expired' | 'error' | 'disconnected';

export interface Connection {
  id: string;
  service: string;
  accountId: string;
  status: ConnectionStatus;
  label: string | null;
  error: string | null;
  createdAt: number;
  lastUsedAt: number | null;
  metadata: string | null;
}

export type RpcRequestStatus = 'received' | 'processing' | 'responded' | 'rejected';

export interface RpcRequest {
  eventId: string;
  requestId: string;
  agentPubkey: string;
  method: string;
  status: RpcRequestStatus;
  createdAt: number;
  respondedAt: number | null;
}

export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface ApprovalEntry {
  id: string;
  agentId: string;
  agentName: string;
  service: string;
  method: string;
  accountId: string;
  operationType: OperationType;
  description: string;
  requestHash: string;
  tempFilePath: string;
  status: ApprovalStatus;
  createdAt: number;
  resolvedAt: number | null;
  resolvedBy: string | null;
}

export interface AuditEntry {
  id: string;
  agentId: string;
  agentName: string;
  service: string;
  method: string;
  accountId: string;
  operationType: OperationType;
  policyAction: PolicyDecision;
  approved: boolean;
  approvedBy: string | null;
  requestSummary: string | null;
  responseStatus: 'success' | 'error';
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: number;
}

// --- Pairing Code ---

export interface PairingCode {
  pubkey: string;
  relays: string[];
  secret: string;
  protocolVersion: number;
}

// --- SSE Events ---

export type SSEEventType =
  | 'approval_request'
  | 'approval_resolved'
  | 'pairing_completed'
  | 'agent_connected'
  | 'agent_disconnected'
  | 'request_completed'
  | 'connection_updated'
  | 'connection_health'
  | 'billing_updated';
