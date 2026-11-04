import { get as httpGet } from 'node:http';
import { createServer as createNetServer, type AddressInfo } from 'node:net';
import { describe, it, expect, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { startHttpServer, MCP_PATH, type RunningHttpServer } from './http.js';

interface SimpleResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

function get(url: string): Promise<SimpleResponse> {
  return new Promise((resolve, reject) => {
    httpGet(url, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    }).on('error', reject);
  });
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}

function createEchoServer(): Server {
  const server = new Server({ name: 'test', version: '0.0.0' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{ name: 'echo', description: 'Echo input', inputSchema: { type: 'object' } }],
  }));
  server.setRequestHandler(CallToolRequestSchema, async request => ({
    content: [{ type: 'text', text: JSON.stringify(request.params.arguments) }],
  }));
  return server;
}

describe('startHttpServer', () => {
  let running: RunningHttpServer | undefined;

  afterEach(async () => {
    await running?.close();
    running = undefined;
  });

  async function startOn(port: number, allowedHosts?: string[]): Promise<string> {
    running = await startHttpServer(createEchoServer, {
      host: '127.0.0.1',
      port,
      ...(allowedHosts ? { allowedHosts } : {}),
    });
    return `http://127.0.0.1:${running.address.port}`;
  }

  const start = (allowedHosts?: string[]) => startOn(0, allowedHosts);

  async function connect(baseUrl: string): Promise<Client> {
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(baseUrl + MCP_PATH)));
    return client;
  }

  it('serves MCP requests over Streamable HTTP', async () => {
    const client = await connect(await start());

    const { tools } = await client.listTools();
    expect(tools.map(t => t.name)).toEqual(['echo']);

    const result = await client.callTool({ name: 'echo', arguments: { q: 'iphone' } });
    expect(result.content).toEqual([{ type: 'text', text: '{"q":"iphone"}' }]);

    await client.close();
  });

  it('handles several clients at once', async () => {
    const baseUrl = await start();
    const clients = await Promise.all([connect(baseUrl), connect(baseUrl), connect(baseUrl)]);

    const results = await Promise.all(
      clients.map((client, i) => client.callTool({ name: 'echo', arguments: { i } }))
    );

    expect(results.map(r => r.content)).toEqual(
      [0, 1, 2].map(i => [{ type: 'text', text: `{"i":${i}}` }])
    );
    await Promise.all(clients.map(c => c.close()));
  });

  it('serves a health check', async () => {
    const response = await get(`${await start()}/health`);

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
  });

  it('returns 404 for unknown paths', async () => {
    const response = await get(`${await start()}/nope`);

    expect(response.status).toBe(404);
  });

  it('rejects GET on the MCP endpoint (stateless mode has no SSE stream)', async () => {
    const response = await get(`${await start()}${MCP_PATH}`);

    expect(response.status).toBe(405);
    expect(response.headers['allow']).toBe('POST');
  });

  it('rejects requests with a Host header outside the allow-list', async () => {
    const baseUrl = await start(['example.com:1']);

    await expect(connect(baseUrl)).rejects.toThrow();
  });

  it('accepts requests with an allowed Host header', async () => {
    const port = await getFreePort();
    const client = await connect(await startOn(port, [`127.0.0.1:${port}`]));
    expect((await client.listTools()).tools).toHaveLength(1);
    await client.close();
  });
});
