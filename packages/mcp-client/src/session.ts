// MCP Session — init handshake, tool listing, tool calls, session tracking

import type { JsonRpcRequest, McpTool, McpServerInfo, McpToolResult } from './types.js';
import { mcpFetch, McpTransportError } from './transport.js';

const SESSION_TTL_MS = 5 * 60 * 1000;
const PROTOCOL_VERSION = '2025-03-26';

let requestIdCounter = 0;

function nextId(): number {
  return ++requestIdCounter;
}

export class McpSession {
  private sessionId: string | null = null;
  private tools: McpTool[] = [];
  private serverVersion: string | null = null;
  private initializedAt = 0;

  constructor(
    private serverUrl: string,
    private mcpEndpoint: string,
    private getAccessToken: () => string
  ) {}

  get cachedTools(): McpTool[] {
    return this.tools;
  }

  get version(): string | null {
    return this.serverVersion;
  }

  private get endpoint(): string {
    return `${this.serverUrl}${this.mcpEndpoint}`;
  }

  async initialize(): Promise<void> {
    const token = this.getAccessToken();

    // Step 1: initialize
    const initRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: nextId(),
      method: 'initialize',
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: 'KeepAI',
          version: '0.1.0',
        },
      },
    };

    const initResult = await mcpFetch(this.endpoint, initRequest, {
      accessToken: token,
      sessionId: this.sessionId ?? undefined,
    });

    this.sessionId = initResult.sessionId ?? this.sessionId;

    if (initResult.response.error) {
      throw new Error(`MCP initialize error: ${initResult.response.error.message}`);
    }

    const serverInfo = initResult.response.result as McpServerInfo;
    this.serverVersion = serverInfo?.serverInfo?.version ?? null;

    // Step 2: notifications/initialized
    const notifyRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: nextId(),
      method: 'notifications/initialized',
    };

    await mcpFetch(this.endpoint, notifyRequest, {
      accessToken: token,
      sessionId: this.sessionId ?? undefined,
    });

    // Step 3: tools/list
    const toolsRequest: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: nextId(),
      method: 'tools/list',
    };

    const toolsResult = await mcpFetch(this.endpoint, toolsRequest, {
      accessToken: token,
      sessionId: this.sessionId ?? undefined,
    });

    if (toolsResult.response.error) {
      throw new Error(`MCP tools/list error: ${toolsResult.response.error.message}`);
    }

    const toolsData = toolsResult.response.result as { tools: McpTool[] };
    this.tools = toolsData?.tools ?? [];
    this.initializedAt = Date.now();
  }

  async ensureSession(): Promise<McpTool[]> {
    if (Date.now() - this.initializedAt > SESSION_TTL_MS) {
      await this.initialize();
    }
    return this.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    await this.ensureSession();

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: nextId(),
      method: 'tools/call',
      params: { name, arguments: args },
    };

    try {
      const result = await mcpFetch(this.endpoint, request, {
        accessToken: this.getAccessToken(),
        sessionId: this.sessionId ?? undefined,
      });

      if (result.response.error) {
        // Session-not-found: re-initialize and retry once
        if (
          result.response.error.code === -32000 &&
          result.response.error.message.includes('Session')
        ) {
          await this.initialize();
          const retryRequest: JsonRpcRequest = {
            jsonrpc: '2.0',
            id: nextId(),
            method: 'tools/call',
            params: { name, arguments: args },
          };
          const retry = await mcpFetch(this.endpoint, retryRequest, {
            accessToken: this.getAccessToken(),
            sessionId: this.sessionId ?? undefined,
          });
          if (retry.response.error) {
            throw new Error(`MCP tool error: ${retry.response.error.message}`);
          }
          return retry.response.result as McpToolResult;
        }

        throw new Error(`MCP tool error: ${result.response.error.message}`);
      }

      return result.response.result as McpToolResult;
    } catch (err) {
      if (err instanceof McpTransportError && err.statusCode === 401) {
        throw err;
      }
      throw err;
    }
  }
}
