import { describe, it, expect } from 'vitest';
import { parseCliOptions, DEFAULT_HTTP_HOST, DEFAULT_HTTP_PORT } from './options.js';

describe('parseCliOptions', () => {
  it('defaults to stdio on loopback', () => {
    const options = parseCliOptions([], {});

    expect(options).toEqual({
      transport: 'stdio',
      host: DEFAULT_HTTP_HOST,
      port: DEFAULT_HTTP_PORT,
      allowedHosts: ['127.0.0.1:3000', 'localhost:3000', '[::1]:3000'],
    });
  });

  it('reads flags in both "--flag value" and "--flag=value" form', () => {
    const options = parseCliOptions(
      ['--transport', 'http', '--port=8080', '--host', 'localhost'],
      {}
    );

    expect(options.transport).toBe('http');
    expect(options.port).toBe(8080);
    expect(options.host).toBe('localhost');
    expect(options.allowedHosts).toContain('localhost:8080');
  });

  it('falls back to environment variables', () => {
    const options = parseCliOptions([], {
      OLX_MCP_TRANSPORT: 'http',
      OLX_MCP_HOST: '0.0.0.0',
      OLX_MCP_PORT: '4000',
      OLX_MCP_ALLOWED_HOSTS: 'olx-mcp:4000, localhost:4000',
    });

    expect(options).toEqual({
      transport: 'http',
      host: '0.0.0.0',
      port: 4000,
      allowedHosts: ['olx-mcp:4000', 'localhost:4000'],
    });
  });

  it('prefers flags over environment variables', () => {
    const options = parseCliOptions(['--transport', 'stdio'], { OLX_MCP_TRANSPORT: 'http' });

    expect(options.transport).toBe('stdio');
  });

  it('disables the default host allow-list on non-loopback interfaces', () => {
    const options = parseCliOptions(['--host', '0.0.0.0'], {});

    expect(options.allowedHosts).toEqual([]);
  });

  it('ignores unrelated arguments', () => {
    expect(() => parseCliOptions(['--verbose', 'positional'], {})).not.toThrow();
  });

  it.each([
    [['--transport', 'sse'], /Invalid transport/],
    [['--port', 'abc'], /Invalid port/],
    [['--port', '70000'], /Invalid port/],
    [['--port'], /Missing value for --port/],
    [['--host', '--port', '1'], /Missing value for --host/],
  ])('rejects %j', (argv, message) => {
    expect(() => parseCliOptions(argv, {})).toThrow(message);
  });
});
