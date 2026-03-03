import type Database from 'better-sqlite3';
import { AgentStore } from './stores/agent-store.js';
import { PairingStore } from './stores/pairing-store.js';
import { ConnectionStore } from './stores/connection-store.js';
import { RpcRequestStore } from './stores/rpc-request-store.js';
import { ApprovalStore } from './stores/approval-store.js';
import { AuditStore } from './stores/audit-store.js';
import { SettingsStore } from './stores/settings-store.js';
import { PolicyStore } from './stores/policy-store.js';

export class KeepDBApi {
  readonly agents: AgentStore;
  readonly pairings: PairingStore;
  readonly connections: ConnectionStore;
  readonly rpcRequests: RpcRequestStore;
  readonly approvals: ApprovalStore;
  readonly audit: AuditStore;
  readonly settings: SettingsStore;
  readonly policies: PolicyStore;

  constructor(db: Database.Database) {
    this.agents = new AgentStore(db);
    this.pairings = new PairingStore(db);
    this.connections = new ConnectionStore(db);
    this.rpcRequests = new RpcRequestStore(db);
    this.approvals = new ApprovalStore(db);
    this.audit = new AuditStore(db);
    this.settings = new SettingsStore(db);
    this.policies = new PolicyStore(db);
  }
}
