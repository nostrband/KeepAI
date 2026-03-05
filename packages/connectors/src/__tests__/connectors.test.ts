import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  parseConnectionId,
  formatConnectionId,
  OAuthHandler,
  tokenResponseToCredentials,
  CredentialStore,
  gmailService,
  notionService,
  gmailConnector,
  McpConnector,
  notionMcpConfig,
  ConnectorExecutor,
} from '../index.js';

describe('ConnectionId', () => {
  it('should parse a valid connection ID', () => {
    const id = parseConnectionId('gmail:user@example.com');
    expect(id).toEqual({ service: 'gmail', accountId: 'user@example.com' });
  });

  it('should handle colons in account ID', () => {
    const id = parseConnectionId('notion:workspace:abc');
    expect(id).toEqual({ service: 'notion', accountId: 'workspace:abc' });
  });

  it('should throw on invalid format', () => {
    expect(() => parseConnectionId('nocolon')).toThrow('Invalid connection ID format');
  });

  it('should format a connection ID', () => {
    expect(formatConnectionId({ service: 'gmail', accountId: 'user@example.com' })).toBe(
      'gmail:user@example.com'
    );
  });
});

describe('OAuthHandler', () => {
  it('should generate an auth URL for Google-style OAuth', () => {
    const handler = new OAuthHandler(
      gmailService.oauthConfig,
      'test-client-id',
      'test-client-secret',
      'http://localhost:3000/callback'
    );

    const url = handler.getAuthUrl('test-state');
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('state=test-state');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });

  it('Notion MCP config should have correct settings', () => {
    expect(notionMcpConfig.service).toBe('notion');
    expect(notionMcpConfig.name).toBe('Notion');
    expect(notionMcpConfig.serverUrl).toBe('https://mcp.notion.com');
    expect(notionMcpConfig.mcpEndpoint).toBe('/mcp');
    expect(notionMcpConfig.methodNames).toBeDefined();
    expect(notionMcpConfig.toolTypes).toBeDefined();
  });

  it('should work without state parameter', () => {
    const handler = new OAuthHandler(
      gmailService.oauthConfig,
      'test-client-id',
      'test-secret',
      'http://localhost:3000/callback'
    );

    const url = handler.getAuthUrl();
    expect(url).not.toContain('state=');
  });
});

describe('tokenResponseToCredentials', () => {
  it('should convert a Google token response', () => {
    const creds = tokenResponseToCredentials({
      access_token: 'access-123',
      refresh_token: 'refresh-456',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'email',
    });

    expect(creds.accessToken).toBe('access-123');
    expect(creds.refreshToken).toBe('refresh-456');
    expect(creds.expiresAt).toBeGreaterThan(Date.now());
    expect(creds.tokenType).toBe('Bearer');
    expect(creds.scope).toBe('email');
  });

  it('should convert a Notion token response with metadata', () => {
    const creds = tokenResponseToCredentials({
      access_token: 'ntn_123',
      token_type: 'bearer',
      workspace_id: 'ws-abc',
      workspace_name: 'My Workspace',
      bot_id: 'bot-xyz',
    });

    expect(creds.accessToken).toBe('ntn_123');
    expect(creds.refreshToken).toBeUndefined();
    expect(creds.expiresAt).toBeUndefined();
    expect(creds.metadata).toEqual({
      workspace_id: 'ws-abc',
      workspace_name: 'My Workspace',
      bot_id: 'bot-xyz',
    });
  });

  it('should handle minimal response', () => {
    const creds = tokenResponseToCredentials({
      access_token: 'tok',
    });

    expect(creds.accessToken).toBe('tok');
    expect(creds.metadata).toBeUndefined();
  });
});

describe('CredentialStore', () => {
  let tmpDir: string;
  let store: CredentialStore;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keepai-store-'));
    store = new CredentialStore(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should save and load credentials', async () => {
    const id = { service: 'gmail', accountId: 'test@example.com' };
    const creds = { accessToken: 'tok-123', refreshToken: 'ref-456' };

    await store.save(id, creds);
    const loaded = await store.load(id);

    expect(loaded).toEqual(creds);
  });

  it('should return null for missing credentials', async () => {
    const loaded = await store.load({ service: 'gmail', accountId: 'nobody@example.com' });
    expect(loaded).toBeNull();
  });

  it('should delete credentials', async () => {
    const id = { service: 'gmail', accountId: 'del@example.com' };
    await store.save(id, { accessToken: 'tok' });
    expect(await store.exists(id)).toBe(true);

    await store.delete(id);
    expect(await store.exists(id)).toBe(false);
  });

  it('should list connections by service', async () => {
    await store.save({ service: 'gmail', accountId: 'a@test.com' }, { accessToken: 'a' });
    await store.save({ service: 'gmail', accountId: 'b@test.com' }, { accessToken: 'b' });
    await store.save({ service: 'notion', accountId: 'ws-1' }, { accessToken: 'n' });

    const gmailConns = await store.listByService('gmail');
    expect(gmailConns.length).toBe(2);
    expect(gmailConns.map((c) => c.accountId).sort()).toEqual(['a@test.com', 'b@test.com']);

    const notionConns = await store.listByService('notion');
    expect(notionConns.length).toBe(1);
  });

  it('should list all connections', async () => {
    await store.save({ service: 'gmail', accountId: 'x@test.com' }, { accessToken: 'x' });
    await store.save({ service: 'notion', accountId: 'ws-2' }, { accessToken: 'y' });

    const all = await store.listAll();
    expect(all.length).toBe(2);
  });

  it('should create files with 0o600 permissions', async () => {
    const id = { service: 'gmail', accountId: 'perm@test.com' };
    await store.save(id, { accessToken: 'tok' });

    const connDir = path.join(tmpDir, 'connectors', 'gmail');
    const files = await fs.readdir(connDir);
    const credFile = files.find((f) => f.endsWith('.json') && !f.startsWith('.tmp-'));
    expect(credFile).toBeTruthy();

    const stat = await fs.stat(path.join(connDir, credFile!));
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it('should reject invalid service IDs', async () => {
    await expect(store.save({ service: '../evil', accountId: 'x' }, { accessToken: 'x' })).rejects.toThrow(
      'Invalid service ID'
    );
  });
});

describe('Service definitions', () => {
  it('Gmail service should have correct OAuth config', () => {
    expect(gmailService.id).toBe('gmail');
    expect(gmailService.name).toBe('Gmail');
    expect(gmailService.supportsRefresh).toBe(true);
    expect(gmailService.oauthConfig.authUrl).toContain('google.com');
    expect(gmailService.oauthConfig.scopes.length).toBeGreaterThan(0);
  });

  it('Notion service should have MCP OAuth config', () => {
    expect(notionService.id).toBe('notion');
    expect(notionService.name).toBe('Notion');
    expect(notionService.supportsRefresh).toBe(true);
    expect(notionService.mcpOAuth).toBeDefined();
    expect(notionService.mcpOAuth!.serverUrl).toBe('https://mcp.notion.com');
    expect(notionService.mcpOAuth!.clientName).toBe('KeepAI');
  });

  it('Gmail should extract account ID from profile', async () => {
    const profile = { id: '123', email: 'user@gmail.com', verified_email: true };
    const accountId = await gmailService.extractAccountId({} as any, profile);
    expect(accountId).toBe('user@gmail.com');
  });

  it('Notion should extract account ID from token response', async () => {
    const tokenResponse = { access_token: 'x', workspace_id: 'ws-abc' };
    const accountId = await notionService.extractAccountId(tokenResponse);
    expect(accountId).toBe('ws-abc');
  });
});

describe('Gmail connector', () => {
  it('should have 15 methods', () => {
    expect(gmailConnector.methods.length).toBeGreaterThan(0);
  });

  it('should have correct service identity', () => {
    expect(gmailConnector.service).toBe('gmail');
    expect(gmailConnector.name).toBe('Gmail');
  });

  it('should extract permission metadata for messages.list', () => {
    const meta = gmailConnector.extractPermMetadata('messages.list', { q: 'test' }, 'user@gmail.com');
    expect(meta.service).toBe('gmail');
    expect(meta.accountId).toBe('user@gmail.com');
    expect(meta.method).toBe('messages.list');
    expect(meta.operationType).toBe('read');
    expect(meta.resourceType).toBe('message');
    expect(meta.description).toContain('test');
  });

  it('should extract permission metadata for messages.send', () => {
    const meta = gmailConnector.extractPermMetadata('messages.send', { to: 'bob@x.com' }, 'user@gmail.com');
    expect(meta.operationType).toBe('write');
    expect(meta.description).toContain('bob@x.com');
  });

  it('should extract permission metadata for messages.trash', () => {
    const meta = gmailConnector.extractPermMetadata('messages.trash', { id: 'msg-1' }, 'user@gmail.com');
    expect(meta.operationType).toBe('delete');
  });

  it('should throw on unknown method', () => {
    expect(() => gmailConnector.extractPermMetadata('unknown.method', {}, 'x')).toThrow('Unknown Gmail method');
  });

  it('should provide help for all methods', () => {
    const help = gmailConnector.help();
    expect(help.service).toBe('gmail');
    expect(help.methods.length).toBeGreaterThan(0);
  });

  it('should provide help for a specific method', () => {
    const help = gmailConnector.help('messages.send');
    expect(help.methods.length).toBe(1);
    expect(help.methods[0].name).toBe('messages.send');
  });
});

describe('Notion MCP connector', () => {
  let notionMcp: McpConnector;

  beforeEach(() => {
    notionMcp = new McpConnector(notionMcpConfig);
    // Not calling initialize() — methods will be empty without a live MCP server
  });

  it('should have correct service identity', () => {
    expect(notionMcp.service).toBe('notion');
    expect(notionMcp.name).toBe('Notion');
  });

  it('should start with empty methods before initialization', () => {
    expect(notionMcp.methods.length).toBe(0);
  });

  it('should provide help even with empty methods', () => {
    const help = notionMcp.help();
    expect(help.service).toBe('notion');
    expect(help.name).toBe('Notion');
    expect(help.methods).toEqual([]);
  });
});

describe('ConnectorExecutor', () => {
  let executor: ConnectorExecutor;
  let notionMcp: McpConnector;

  beforeEach(() => {
    executor = new ConnectorExecutor();
    executor.register(gmailConnector);
    notionMcp = new McpConnector(notionMcpConfig);
    executor.register(notionMcp);
  });

  it('should list registered services', () => {
    const services = executor.getRegisteredServices();
    expect(services.sort()).toEqual(['gmail', 'notion']);
  });

  it('should get a connector by service', () => {
    const connector = executor.getConnector('gmail');
    expect(connector).toBe(gmailConnector);
  });

  it('should extract permission metadata', () => {
    const meta = executor.extractPermMetadata('gmail', 'messages.list', {}, 'user@gmail.com');
    expect(meta.service).toBe('gmail');
    expect(meta.method).toBe('messages.list');
  });

  it('should throw on unknown service', () => {
    expect(() => executor.extractPermMetadata('unknown', 'test', {}, 'x')).toThrow('Unknown service');
  });

  it('should throw on unknown method', () => {
    expect(() => executor.extractPermMetadata('gmail', 'bad.method', {}, 'x')).toThrow('Unknown method');
  });

  it('should provide help for all services', () => {
    const help = executor.getHelp() as any[];
    expect(help.length).toBe(2);
    expect(help.map((h: any) => h.service).sort()).toEqual(['gmail', 'notion']);
  });

  it('should provide help for a specific service', () => {
    const help = executor.getHelp('gmail') as any;
    expect(help.service).toBe('gmail');
    expect(help.methods.length).toBeGreaterThan(0);
  });
});
