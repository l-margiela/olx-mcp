#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { OLXMCPServer } from './core/server.js';

async function main() {
  const server = new OLXMCPServer({
    name: 'olx-mcp-server',
    version: '1.0.0',
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
