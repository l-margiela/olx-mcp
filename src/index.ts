#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OLXMCPServer } from './core/server.js';

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

Usage: olx-mcp

This server is designed to be used with Claude Desktop.
Configure it in your claude_desktop_config.json:

{
  "mcpServers": {
    "olx-mcp": {
      "command": "olx-mcp"
    }
  }
}

Supports domains: olx.pt, olx.pl, olx.bg, olx.ro, olx.ua
  `);
  process.exit(0);
}

async function main() {
  const server = new OLXMCPServer({
    name: 'olx-mcp-server',
    version: version,
    headless: true,
  });

  // Initialize the server (browser, scrapers, tools)
  await server.initialize();

  // Set up graceful shutdown
  const cleanup = async () => {
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

  // Create and connect STDIO transport
  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
    console.error('OLX MCP Server started successfully'); // Log to stderr to avoid interfering with STDIO
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
