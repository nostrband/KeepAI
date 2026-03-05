// Streamable HTTP Transport for MCP

import type { JsonRpcRequest, JsonRpcResponse } from './types.js';

export interface McpFetchResult {
  response: JsonRpcResponse;
  sessionId: string | null;
}

export async function mcpFetch(
  url: string,
  request: JsonRpcRequest,
  options?: {
    accessToken?: string;
    sessionId?: string;
  }
): Promise<McpFetchResult> {
  const headers: Record<string, string> = {
    'Accept': 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };

  if (options?.accessToken) {
    headers['Authorization'] = `Bearer ${options.accessToken}`;
  }

  if (options?.sessionId) {
    headers['Mcp-Session-Id'] = options.sessionId;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    throw new McpTransportError(
      `MCP HTTP error ${res.status}: ${await res.text()}`,
      res.status
    );
  }

  const sessionId = res.headers.get('mcp-session-id');
  const contentType = res.headers.get('content-type') || '';

  // Notifications return 202/204 with no body
  if (res.status === 202 || res.status === 204 || !contentType) {
    return { response: { jsonrpc: '2.0', id: 0 }, sessionId };
  }

  let response: JsonRpcResponse;

  if (contentType.includes('text/event-stream')) {
    response = await parseSSEResponse(res);
  } else {
    response = (await res.json()) as JsonRpcResponse;
  }

  return { response, sessionId };
}

async function parseSSEResponse(res: Response): Promise<JsonRpcResponse> {
  const text = await res.text();
  const lines = text.split('\n');

  let lastData: string | null = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      lastData = line.slice(6);
    }
  }

  if (!lastData) {
    throw new McpTransportError('No data in SSE response', 0);
  }

  return JSON.parse(lastData) as JsonRpcResponse;
}

export class McpTransportError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'McpTransportError';
  }
}
