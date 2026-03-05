/**
 * McpConnector — generic connector that bridges MCP tools to the KeepAI Connector interface.
 */

import type {
  Connector,
  ConnectorMethod,
  PermissionMetadata,
  ServiceHelp,
  OAuthCredentials,
  OperationType,
  ParamSchema,
} from '@keepai/proto';
import type { McpTool, McpToolResultContent, JsonSchemaProperty } from '@keepai/mcp-client';
import { McpSession } from '@keepai/mcp-client';

export interface McpConnectorConfig {
  service: string;
  name: string;
  serverUrl: string;
  mcpEndpoint?: string;
  toolTypes?: Record<string, OperationType>;
  methodNames?: Record<string, string>;
  describeRequest?: (method: string, params: Record<string, unknown>) => string;
  extractAccountId: (session: McpSession) => Promise<{
    accountId: string;
    displayName?: string;
  }>;
  responseExamples?: Record<string, unknown>;
}

export class McpConnector implements Connector {
  readonly service: string;
  readonly name: string;
  methods: ConnectorMethod[] = [];

  private currentAccessToken = '';
  private session: McpSession;
  private config: McpConnectorConfig;
  // mcpToolName → keepai method name
  private nameMap: Record<string, string> = {};
  // keepai method name → mcpToolName
  private reverseNameMap: Record<string, string> = {};

  constructor(config: McpConnectorConfig) {
    this.service = config.service;
    this.name = config.name;
    this.config = config;
    this.session = new McpSession(
      config.serverUrl,
      config.mcpEndpoint ?? '/mcp',
      () => this.currentAccessToken
    );
  }

  /**
   * Set the access token used for MCP requests.
   * Called by server.ts on startup with the stored token,
   * and updated on each execute() call.
   */
  setAccessToken(token: string): void {
    this.currentAccessToken = token;
  }

  getSession(): McpSession {
    return this.session;
  }

  async initialize(): Promise<void> {
    if (!this.currentAccessToken) {
      // No token available — can't call MCP server
      this.methods = [];
      return;
    }
    try {
      await this.session.initialize();
      this.methods = this.buildMethods(this.session.cachedTools);
    } catch {
      // MCP server unreachable at startup — register with empty methods, retry on first request
      this.methods = [];
    }
  }

  private buildMethods(tools: McpTool[]): ConnectorMethod[] {
    const allToolNames = tools.map((t) => this.mapName(t.name));

    // Build name maps
    this.nameMap = {};
    this.reverseNameMap = {};
    for (const tool of tools) {
      const mapped = this.mapName(tool.name);
      this.nameMap[tool.name] = mapped;
      this.reverseNameMap[mapped] = tool.name;
    }

    return tools.map((tool) => {
      const methodName = this.nameMap[tool.name];
      const { examples, cleanDescription } = parseExamples(tool.description ?? '');
      const descLines = cleanDescription.split('\n').filter((l) => l.trim());
      const description = tool.title || descLines[0] || tool.name;
      const notes = descLines.slice(tool.title ? 0 : 1).filter((l) => l.trim());

      const method: ConnectorMethod = {
        name: methodName,
        description,
        operationType: inferOperationType(tool, this.config.toolTypes),
        params: flattenJsonSchema(tool.inputSchema),
        returns: 'MCP tool result',
      };

      if (examples.length > 0) {
        method.example = {
          params: examples[0].params,
          description: examples[0].description,
        };
      }

      if (notes.length > 0) {
        method.notes = notes;
      }

      const seeAlso = findSeeAlso(tool.description ?? '', allToolNames, methodName);
      if (seeAlso.length > 0) {
        method.seeAlso = seeAlso;
      }

      const responseExample = this.config.responseExamples?.[methodName];
      if (responseExample) {
        method.responseExample = responseExample;
      }

      return method;
    });
  }

  private mapName(mcpToolName: string): string {
    return this.config.methodNames?.[mcpToolName] ?? mcpToolName;
  }

  extractPermMetadata(
    method: string,
    params: Record<string, unknown>,
    accountId: string
  ): PermissionMetadata {
    const methodDef = this.methods.find((m) => m.name === method);
    if (!methodDef) {
      throw new Error(`Unknown method: ${this.service}.${method}`);
    }

    const description = this.config.describeRequest
      ? this.config.describeRequest(method, params)
      : `${this.name} ${method}`;

    return {
      service: this.service,
      accountId,
      method,
      operationType: methodDef.operationType,
      description,
    };
  }

  async ensureReady(credentials: OAuthCredentials): Promise<void> {
    this.currentAccessToken = credentials.accessToken;
    if (this.methods.length === 0) {
      await this.session.initialize();
      this.methods = this.buildMethods(this.session.cachedTools);
    }
  }

  async execute(
    method: string,
    params: Record<string, unknown>,
    credentials: OAuthCredentials
  ): Promise<unknown> {
    // Update token (ensureReady may have been called already, but direct callers may not)
    this.currentAccessToken = credentials.accessToken;

    const mcpToolName = this.reverseNameMap[method] ?? method;
    const result = await this.session.callTool(mcpToolName, params);

    // Concatenate text content items
    return extractTextResult(result.content);
  }

  help(method?: string): ServiceHelp {
    const summary = `${this.name} (MCP)`;
    if (method) {
      const m = this.methods.find((md) => md.name === method);
      return {
        service: this.service,
        name: this.name,
        summary,
        methods: m ? [m] : [],
      };
    }
    return {
      service: this.service,
      name: this.name,
      summary,
      methods: this.methods,
    };
  }
}

// --- Helper functions ---

function extractTextResult(content: McpToolResultContent[]): string {
  return content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text!)
    .join('\n');
}

interface ParsedExample {
  description: string;
  params: Record<string, unknown>;
}

function parseExamples(description: string): {
  examples: ParsedExample[];
  cleanDescription: string;
} {
  const examples: ParsedExample[] = [];
  // Match both <example description="...">json</example> and plain <example>json</example>
  const exampleRegex = /<example(?:\s+description="([^"]*)")?\s*>([\s\S]*?)<\/example>/g;

  let match;
  while ((match = exampleRegex.exec(description)) !== null) {
    try {
      const params = JSON.parse(match[2].trim());
      const desc = match[1] || summarizeExample(params);
      examples.push({ description: desc, params });
    } catch {
      // Skip malformed examples
    }
  }

  const cleanDescription = description.replace(exampleRegex, '').trim();
  return { examples, cleanDescription };
}

function summarizeExample(params: Record<string, unknown>): string {
  const keys = Object.keys(params);
  if (keys.length === 0) return 'Example';
  const preview = keys.slice(0, 2).map(k => {
    const v = params[k];
    if (typeof v === 'string' && v.length > 30) return `${k}="${v.slice(0, 30)}..."`;
    if (typeof v === 'string') return `${k}="${v}"`;
    return `${k}=${JSON.stringify(v)}`;
  }).join(', ');
  return keys.length > 2 ? `${preview}, ...` : preview;
}

function flattenJsonSchema(schema: McpTool['inputSchema']): ParamSchema[] {
  const params: ParamSchema[] = [];
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);

  for (const [name, prop] of Object.entries(properties)) {
    params.push({
      name,
      type: mapSchemaType(prop),
      required: required.has(name),
      description: prop.description ?? '',
      ...(prop.default !== undefined ? { default: prop.default } : {}),
      ...(prop.enum ? { enum: prop.enum } : {}),
    });
  }

  return params;
}

function mapSchemaType(prop: JsonSchemaProperty): ParamSchema['type'] {
  const t = prop.type;
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'object' || t === 'array') {
    return t;
  }
  if (t === 'integer') return 'number';
  // For anyOf/oneOf, default to string
  if (prop.anyOf || prop.oneOf) return 'string';
  return 'string';
}

function inferOperationType(
  tool: McpTool,
  overrides?: Record<string, OperationType>
): OperationType {
  if (overrides?.[tool.name]) {
    return overrides[tool.name];
  }
  if (tool.annotations?.readOnlyHint === true) {
    return 'read';
  }
  if (tool.annotations?.destructiveHint === true) {
    return 'delete';
  }
  return 'write';
}

function findSeeAlso(description: string, allMethodNames: string[], currentMethod: string): string[] {
  return allMethodNames.filter(
    (name) => name !== currentMethod && description.includes(name)
  );
}
