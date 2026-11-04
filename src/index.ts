#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OLXMCPServer } from './core/server.js';
import { DEFAULT_HTTP_HOST, DEFAULT_HTTP_PORT, parseCliOptions } from './cli/options.js';
import { HEALTH_PATH, MCP_PATH, startHttpServer } from './transports/http.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Handle --version flag
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(version);
  process.exit(0);
}

// Handle --help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
OLX MCP Server v${version}
A Model Context Protocol server for searching OLX listings across Europe.

Usage: olx-mcp [--transport stdio|http] [--host <host>] [--port <port>]
              [--allowed-hosts <host:port,...>]

Options:
  --transport      stdio (default) or http (Streamable HTTP)   env: OLX_MCP_TRANSPORT
  --host           HTTP bind address (default ${DEFAULT_HTTP_HOST})       env: OLX_MCP_HOST
  --port           HTTP port (default ${DEFAULT_HTTP_PORT})                    env: OLX_MCP_PORT
  --allowed-hosts  Accepted Host headers, comma-separated      env: OLX_MCP_ALLOWED_HOSTS
                   (default: loopback addresses when bound to loopback)

STDIO is what Claude Desktop uses. Configure it in your claude_desktop_config.json:

{
  "mcpServers": {
    "olx-mcp": {
      "command": "olx-mcp"
    }
  }
}

With --transport http the MCP endpoint is http://<host>:<port>${MCP_PATH}
and a health check is served at ${HEALTH_PATH}.

Supports domains: olx.pt, olx.pl, olx.bg, olx.ro, olx.ua
  `);
  process.exit(0);
}

async function main() {
  let options;
  try {
    options = parseCliOptions(process.argv.slice(2), process.env);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }

  const server = new OLXMCPServer({
    name: 'olx-mcp-server',
    version: version,
    headless: true,
  });

  // Initialize the server (browser, scrapers, tools)
  await server.initialize();

  let closeHttpServer: (() => Promise<void>) | undefined;

  // Set up graceful shutdown
  const cleanup = async () => {
    await closeHttpServer?.();
    await server.cleanup();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', async error => {
    console.error('Uncaught exception:', error);
    await server.cleanup();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    await server.cleanup();
    process.exit(1);
  });

  try {
    if (options.transport === 'http') {
      const http = await startHttpServer(() => server.createProtocolServer(), options);
      closeHttpServer = http.close;
      const { address, port } = http.address;
      const shownHost = address.includes(':') ? `[${address}]` : address;
      console.error(`OLX MCP Server listening on http://${shownHost}:${port}${MCP_PATH}`);
    } else {
      // Create and connect STDIO transport
      await server.connect(new StdioServerTransport());
      console.error('OLX MCP Server started successfully'); // Log to stderr to avoid interfering with STDIO
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    await server.cleanup();
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(async error => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });
}
