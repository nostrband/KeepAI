/**
 * Cloudflare connector — covers DNS, Workers, KV, D1, R2, Pages, Stream,
 * Images, Zero Trust, Load Balancers, Magic Transit, Rulesets, Firewall,
 * SSL, AI, Vectorize, Browser Rendering, Queues, Durable Objects,
 * Workflows, Hyperdrive, Pipelines, Accounts, Registrar, Email Routing,
 * Logpush, Alerting, Cache, Healthchecks, and more.
 *
 * Uses the official `cloudflare` npm package. Auth is via API token.
 */

import {
  AuthenticationError as CfAuthError,
  PermissionDeniedError as CfPermError,
  RateLimitError as CfRateError,
  InternalServerError as CfServerError,
  APIConnectionError as CfConnError,
  APIConnectionTimeoutError as CfTimeoutError,
  APIError as CfAPIError,
} from 'cloudflare';
import { AuthError, NetworkError, PermissionError, LogicError } from '@keepai/proto';

import Cloudflare from 'cloudflare';
import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
} from '@keepai/proto';

import { dnsMethods } from './methods-dns.js';
import { workersMethods } from './methods-workers.js';
import { storageMethods } from './methods-storage.js';
import { pagesMethods } from './methods-pages.js';
import { securityMethods } from './methods-security.js';
import { zeroTrustMethods } from './methods-zerotrust.js';
import { networkingMethods } from './methods-networking.js';
import { aiMethods } from './methods-ai.js';
import { platformMethods } from './methods-platform.js';

// ---------------------------------------------------------------------------
// SDK client helper
// ---------------------------------------------------------------------------

function getClient(credentials: OAuthCredentials): Cloudflare {
  const meta = ((credentials as any).metadata ?? {}) as Record<string, string>;
  return new Cloudflare({
    apiToken: credentials.accessToken || meta.apiToken,
  });
}

// ---------------------------------------------------------------------------
// All methods combined
// ---------------------------------------------------------------------------

const allMethods: ConnectorMethod[] = [
  ...dnsMethods,
  ...workersMethods,
  ...storageMethods,
  ...pagesMethods,
  ...securityMethods,
  ...zeroTrustMethods,
  ...networkingMethods,
  ...aiMethods,
  ...platformMethods,
];


// ---------------------------------------------------------------------------
// Human-readable request descriptions
// ---------------------------------------------------------------------------

function describeCloudflareRequest(method: string, params: Record<string, unknown>): string {
  switch (method) {
    // Zones
    case 'zones.create': return `Create zone${params.name ? ` "${params.name}"` : ''}`;
    case 'zones.delete': return `Delete zone ${params.zone_id || '(unknown)'}`;
    case 'zones.edit': return `Edit zone ${params.zone_id || '(unknown)'}`;

    // DNS
    case 'dns.records.create': return `Create ${params.type || ''} DNS record${params.name ? ` "${params.name}"` : ''} in zone ${params.zone_id || '(unknown)'}`;
    case 'dns.records.update': return `Update DNS record ${params.dns_record_id || '(unknown)'} in zone ${params.zone_id || '(unknown)'}`;
    case 'dns.records.delete': return `Delete DNS record ${params.dns_record_id || '(unknown)'} in zone ${params.zone_id || '(unknown)'}`;
    case 'dns.records.scan': return `Scan DNS records for zone ${params.zone_id || '(unknown)'}`;

    // Workers
    case 'workers.scripts.update': return `Upload worker script "${params.script_name || '(unknown)'}"`;
    case 'workers.scripts.delete': return `Delete worker script "${params.script_name || '(unknown)'}"`;
    case 'workers.scripts.secrets.update': return `Add secret to worker "${params.script_name || '(unknown)'}"`;
    case 'workers.scripts.secrets.delete': return `Remove secret from worker "${params.script_name || '(unknown)'}"`;

    // KV
    case 'kv.namespaces.create': return `Create KV namespace "${params.title || '(unknown)'}"`;
    case 'kv.namespaces.delete': return `Delete KV namespace ${params.namespace_id || '(unknown)'}`;
    case 'kv.namespaces.values.update': return `Write KV value for key "${params.key_name || '(unknown)'}"`;
    case 'kv.namespaces.values.delete': return `Delete KV value for key "${params.key_name || '(unknown)'}"`;
    case 'kv.namespaces.bulkDelete': return `Bulk delete KV pairs from namespace ${params.namespace_id || '(unknown)'}`;

    // D1
    case 'd1.database.create': return `Create D1 database "${params.name || '(unknown)'}"`;
    case 'd1.database.delete': return `Delete D1 database ${params.database_id || '(unknown)'}`;
    case 'd1.database.query': return `Query D1 database ${params.database_id || '(unknown)'}`;

    // R2
    case 'r2.buckets.create': return `Create R2 bucket "${params.name || '(unknown)'}"`;
    case 'r2.buckets.delete': return `Delete R2 bucket "${params.bucket_name || '(unknown)'}"`;

    // Pages
    case 'pages.projects.create': return `Create Pages project "${params.name || '(unknown)'}"`;
    case 'pages.projects.delete': return `Delete Pages project "${params.project_name || '(unknown)'}"`;
    case 'pages.projects.deployments.create': return `Deploy Pages project "${params.project_name || '(unknown)'}"`;
    case 'pages.projects.deployments.rollback': return `Rollback Pages deployment for "${params.project_name || '(unknown)'}"`;

    // Firewall / Security
    case 'firewall.rules.create': return `Create firewall rule in zone ${params.zone_id || '(unknown)'}`;
    case 'firewall.rules.delete': return `Delete firewall rule ${params.rule_id || '(unknown)'}`;
    case 'rulesets.create': return `Create ruleset`;
    case 'rulesets.delete': return `Delete ruleset ${params.ruleset_id || '(unknown)'}`;

    // Zero Trust
    case 'zeroTrust.access.applications.create': return `Create Access application`;
    case 'zeroTrust.access.applications.delete': return `Delete Access application ${params.app_id || '(unknown)'}`;
    case 'zeroTrust.organizations.revokeUsers': return `Revoke user access across all applications`;

    // Accounts
    case 'accounts.create': return `Create account "${params.name || '(unknown)'}"`;
    case 'accounts.delete': return `Delete account ${params.account_id || '(unknown)'}`;
    case 'accounts.members.create': return `Add member ${params.email || '(unknown)'} to account`;
    case 'accounts.members.delete': return `Remove member ${params.member_id || '(unknown)'} from account`;
    case 'accounts.tokens.create': return `Create API token for account`;
    case 'accounts.tokens.delete': return `Delete API token ${params.token_id || '(unknown)'}`;

    // AI
    case 'ai.run': return `Run AI model "${params.model_name || '(unknown)'}"`;

    // Queues
    case 'queues.create': return `Create queue "${params.queue_name || '(unknown)'}"`;
    case 'queues.delete': return `Delete queue ${params.queue_id || '(unknown)'}`;

    // Default
    default: {
      const parts = method.split('.');
      const action = parts[parts.length - 1];
      const resource = parts.slice(0, -1).join('.');
      return `${action} ${resource}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Resource type extraction
// ---------------------------------------------------------------------------

function getResourceType(method: string): string | undefined {
  const parts = method.split('.');
  // For nested resources like 'dns.records', return the full prefix
  return parts.length > 2 ? parts.slice(0, -1).join('.') : parts[0];
}

// ---------------------------------------------------------------------------
// Execute — generic dispatcher using Cloudflare SDK
// ---------------------------------------------------------------------------

/**
 * Navigate the Cloudflare SDK object tree and call the method.
 * Method names like 'zones.list' map to cloudflare.zones.list().
 * Nested names like 'dns.records.create' map to cloudflare.dns.records.create().
 */
async function execute(
  method: string,
  params: Record<string, unknown>,
  credentials: OAuthCredentials,
): Promise<unknown> {
  const client = getClient(credentials);
  const parts = method.split('.');
  const action = parts.pop()!;

  let target: any = client;
  for (const part of parts) {
    target = target[part];
    if (!target) throw new Error(`Unknown Cloudflare resource: ${parts.join('.')}`);
  }

  const fn = target[action];
  if (typeof fn !== 'function') throw new Error(`Unknown Cloudflare method: ${method}`);

  // CF SDK takes a single params object for most methods
  try {
    return await fn.call(target, params);
  } catch (err) {
    throw classifyCloudflareError(err);
  }
}

function classifyCloudflareError(err: unknown): Error {
  if (err instanceof CfTimeoutError || err instanceof CfConnError) {
    return new NetworkError((err as Error).message, { cause: err as Error, source: 'cloudflare' });
  }
  if (err instanceof CfAuthError) {
    return new AuthError('Cloudflare token is invalid or expired', {
      cause: err as Error, source: 'cloudflare', serviceId: 'cloudflare', accountId: '',
    });
  }
  if (err instanceof CfPermError) {
    return new PermissionError((err as Error).message, { cause: err as Error, source: 'cloudflare' });
  }
  if (err instanceof CfRateError) {
    return new NetworkError((err as Error).message, { cause: err as Error, source: 'cloudflare', statusCode: 429 });
  }
  if (err instanceof CfServerError) {
    const status = (err as any).status ?? 500;
    return new NetworkError((err as Error).message, { cause: err as Error, source: 'cloudflare', statusCode: status });
  }
  if (err instanceof CfAPIError) {
    const status = (err as any).status;
    return new LogicError((err as Error).message, { cause: err as Error, source: 'cloudflare' });
  }
  return err instanceof Error ? err : new Error(String(err));
}

// ---------------------------------------------------------------------------
// Connector export
// ---------------------------------------------------------------------------

export const cloudflareConnector: Connector = {
  service: 'cloudflare',
  name: 'Cloudflare',
  methods: allMethods,
  groupDescriptions: {
    zones: 'Zone management — create, list, edit, delete zones',
    dns: 'DNS record management and DNSSEC',
    dnsFirewall: 'DNS Firewall cluster management',
    workers: 'Workers scripts, routes, domains, KV, secrets, deployments, and versions',
    kv: 'Workers KV namespace and key-value management',
    d1: 'D1 serverless SQL database management and queries',
    queues: 'Cloudflare Queues — messages, consumers, producers',
    durableObjects: 'Durable Objects namespace management',
    workflows: 'Workflow management — instances, versions',
    hyperdrive: 'Hyperdrive database acceleration configs',
    pipelines: 'Pipeline management',
    r2: 'R2 object storage — buckets, lifecycle, CORS, domains, Sippy',
    stream: 'Stream video — uploads, live inputs, keys, watermarks, webhooks, captions',
    images: 'Cloudflare Images — upload, list, edit, delete',
    pages: 'Pages projects — deployments, domains, build cache',
    customHostnames: 'Custom hostname and SSL management',
    waitingRooms: 'Waiting rooms — events, rules, settings',
    snippets: 'Zone snippets and snippet rules',
    web3: 'Web3 hostname management',
    rulesets: 'WAF rulesets — rules, phases, versions',
    firewall: 'Firewall rules, lockdowns, access rules, UA rules',
    ssl: 'SSL/TLS — certificate packs, verification, recommendations',
    customCertificates: 'Custom SSL certificate management',
    originCACertificates: 'Origin CA certificate management',
    keylessCertificates: 'Keyless SSL configuration',
    clientCertificates: 'API Shield mTLS client certificates',
    turnstile: 'Turnstile CAPTCHA widget management',
    botManagement: 'Bot Management configuration',
    pageShield: 'Page Shield — scripts and connections detection',
    pageRules: 'Page Rules for URL-based settings',
    rateLimits: 'Rate limiting rules',
    managedTransforms: 'Managed Transform rules',
    urlNormalization: 'URL Normalization settings',
    securityTXT: 'security.txt management',
    zeroTrust: 'Zero Trust — Access apps, groups, policies, identity providers, tunnels, devices',
    loadBalancers: 'Load balancers — pools, monitors, regions',
    spectrum: 'Spectrum TCP/UDP proxy applications',
    magicTransit: 'Magic Transit — GRE/IPsec tunnels, routes, sites, connectors, interconnects',
    argo: 'Argo Smart Routing and Tiered Caching',
    ips: 'Cloudflare IP ranges',
    customNameservers: 'Account custom nameservers',
    ai: 'Workers AI — model inference, fine-tuning, model catalog',
    aiGateway: 'AI Gateway — gateways, logs, datasets, evaluations',
    vectorize: 'Vectorize — vector index management and queries',
    browserRendering: 'Browser Rendering — HTML, JSON, markdown, PDF, screenshots',
    accounts: 'Account management — members, roles, subscriptions, tokens',
    user: 'User profile, tokens, invites, organizations',
    memberships: 'Account membership management',
    auditLogs: 'Account audit logs',
    registrar: 'Domain registrar management',
    emailRouting: 'Email Routing — rules, addresses, DNS',
    logpush: 'Logpush job management',
    alerting: 'Notification policies, webhook destinations, history',
    cache: 'Cache settings — variants, tiered cache, cache reserve',
    healthchecks: 'Health check management and previews',
    customPages: 'Custom error page management',
    secretsStore: 'Secrets Store management',
    originPostQuantumEncryption: 'Post-Quantum encryption settings',
  },

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string,
  ): PermissionMetadata {
    const methodDef = allMethods.find((m) => m.name === method);
    if (!methodDef) throw new Error(`Unknown Cloudflare method: ${method}`);
    return {
      service: 'cloudflare',
      accountId,
      method,
      operationType: methodDef.operationType,
      resourceType: getResourceType(method),
      description: describeCloudflareRequest(method, params),
    };
  },

  execute,

  help(method?: string): ServiceHelp {
    if (method) {
      const m = allMethods.find((md) => md.name === method);
      return { service: 'cloudflare', name: 'Cloudflare', methods: m ? [m] : [] };
    }
    return {
      service: 'cloudflare',
      name: 'Cloudflare',
      summary: 'Cloud platform — DNS, Workers, KV, D1, R2, Pages, Stream, Zero Trust, Load Balancers, AI, and more',
      methods: allMethods,
    };
  },
};
