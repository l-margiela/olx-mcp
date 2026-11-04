import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export const MCP_PATH = '/mcp';
export const HEALTH_PATH = '/health';

export interface HttpTransportOptions {
  readonly host: string;
  readonly port: number;
  /** Exact `Host` header values to accept; empty disables DNS rebinding protection. */
  readonly allowedHosts?: readonly string[];
}

export interface RunningHttpServer {
  readonly server: HttpServer;
  /** The actual address (useful when started with port 0). */
  readonly address: AddressInfo;
  close(): Promise<void>;
}

/**
 * Serve MCP over Streamable HTTP in stateless mode.
 *
 * Every POST to /mcp gets a fresh protocol server and transport (no session state), so any
 * number of clients can share one process — and therefore one browser instance.
 */
export async function startHttpServer(
  createProtocolServer: () => Server,
  options: HttpTransportOptions
): Promise<RunningHttpServer> {
  const allowedHosts = [...(options.allowedHosts ?? [])];

  const httpServer = createServer((req, res) => {
    handleRequest(req, res, createProtocolServer, allowedHosts).catch(error => {
      console.error('Error handling MCP HTTP request:', error);
      if (!res.headersSent) {
        sendJsonRpcError(res, 500, -32603, 'Internal server error');
      } else {
        res.end();
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(options.port, options.host, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  return {
    server: httpServer,
    address: httpServer.address() as AddressInfo,
    close: () =>
      new Promise<void>((resolve, reject) => {
        httpServer.closeAllConnections();
        httpServer.close(error => (error ? reject(error) : resolve()));
      }),
  };
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  createProtocolServer: () => Server,
  allowedHosts: string[]
): Promise<void> {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;

  if (path === HEALTH_PATH && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"status":"ok"}');
    return;
  }

  if (path !== MCP_PATH) {
    res.writeHead(404).end();
    return;
  }

  // Stateless mode: no SSE stream to resume (GET) and no session to terminate (DELETE).
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJsonRpcError(res, 405, -32000, 'Method not allowed.');
    return;
  }

  const server = createProtocolServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableDnsRebindingProtection: allowedHosts.length > 0,
    allowedHosts,
  });

  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res);
}

function sendJsonRpcError(
  res: ServerResponse,
  status: number,
  code: number,
  message: string
): void {
  res
    .writeHead(status, { 'Content-Type': 'application/json' })
    .end(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }));
}
