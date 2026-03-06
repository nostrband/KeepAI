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
    response = await parseSSEResponse(res, request.id);
  } else {
    response = (await res.json()) as JsonRpcResponse;
  }

  return { response, sessionId };
}

async function parseSSEResponse(res: Response, requestId?: number): Promise<JsonRpcResponse> {
  const body = res.body;

  // Fallback for environments without ReadableStream
  if (!body) {
    const text = await res.text();
    return parseSSEText(text);
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Try to extract a complete JSON-RPC response from accumulated SSE data
      const result = tryExtractResponse(buffer, requestId);
      if (result) {
        // Got our response — cancel the stream instead of waiting for server to close it
        reader.cancel().catch(() => {});
        return result;
      }
    }
  } catch (err) {
    // If we already have data in buffer, try to parse it before throwing
    const result = tryExtractResponse(buffer, requestId);
    if (result) return result;
    throw err;
  }

  // Stream ended — parse whatever we have
  return parseSSEText(buffer);
}

function tryExtractResponse(text: string, requestId?: number): JsonRpcResponse | null {
  // Scan for "data: " lines containing JSON-RPC responses
  let searchFrom = 0;
  let lastMatch: JsonRpcResponse | null = null;

  while (searchFrom < text.length) {
    const idx = text.indexOf('data: ', searchFrom);
    if (idx === -1) break;

    const lineStart = idx + 6;
    const lineEnd = text.indexOf('\n', lineStart);
    // If no newline yet, the line may be incomplete
    if (lineEnd === -1) break;

    const line = text.slice(lineStart, lineEnd).trim();
    if (line) {
      try {
        const parsed = JSON.parse(line) as JsonRpcResponse;
        // If we have a requestId, match it; otherwise accept any response
        if (requestId == null || parsed.id === requestId) {
          return parsed;
        }
        lastMatch = parsed;
      } catch {
        // Not valid JSON yet, continue
      }
    }

    searchFrom = lineEnd + 1;
  }

  return lastMatch;
}

function parseSSEText(text: string): JsonRpcResponse {
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
