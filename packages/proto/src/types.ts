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
