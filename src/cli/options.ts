export type TransportType = 'stdio' | 'http';

export interface CliOptions {
  readonly transport: TransportType;
  readonly host: string;
  readonly port: number;
  /** Exact `Host` header values accepted by the HTTP transport (DNS rebinding protection). */
  readonly allowedHosts: readonly string[];
}

export const DEFAULT_HTTP_HOST = '127.0.0.1';
export const DEFAULT_HTTP_PORT = 3000;

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

/**
 * Parse transport options from command-line flags, falling back to environment variables.
 *
 * Flags: --transport <stdio|http>, --host <host>, --port <port>, --allowed-hosts <a,b>
 * (also accepted in `--flag=value` form).
 * Env:   OLX_MCP_TRANSPORT, OLX_MCP_HOST, OLX_MCP_PORT, OLX_MCP_ALLOWED_HOSTS.
 */
export function parseCliOptions(
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>> = {}
): CliOptions {
  const flags = readFlags(argv);

  const transport = flags.get('transport') ?? env['OLX_MCP_TRANSPORT'] ?? 'stdio';
  if (transport !== 'stdio' && transport !== 'http') {
    throw new Error(`Invalid transport "${transport}". Expected "stdio" or "http".`);
  }

  const host = flags.get('host') ?? env['OLX_MCP_HOST'] ?? DEFAULT_HTTP_HOST;

  const rawPort = flags.get('port') ?? env['OLX_MCP_PORT'] ?? String(DEFAULT_HTTP_PORT);
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port "${rawPort}". Expected an integer between 0 and 65535.`);
  }

  const rawAllowedHosts = flags.get('allowed-hosts') ?? env['OLX_MCP_ALLOWED_HOSTS'];
  const allowedHosts =
    rawAllowedHosts !== undefined
      ? rawAllowedHosts
          .split(',')
          .map(h => h.trim())
          .filter(Boolean)
      : defaultAllowedHosts(host, port);

  return { transport, host, port, allowedHosts };
}

/**
 * When bound to loopback, only accept requests addressed to loopback so a malicious web page
 * cannot reach the server through DNS rebinding. When bound to another interface (e.g. 0.0.0.0
 * inside a container) the reachable host names are unknown, so the check is left to the
 * operator via --allowed-hosts.
 */
function defaultAllowedHosts(host: string, port: number): string[] {
  if (!LOOPBACK_HOSTS.has(host)) {
    return [];
  }
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
}

const VALUE_FLAGS = new Set(['transport', 'host', 'port', 'allowed-hosts']);

function readFlags(argv: readonly string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith('--')) {
      continue;
    }
    const eq = arg.indexOf('=');
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    if (!VALUE_FLAGS.has(name)) {
      continue;
    }
    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
    if (value === undefined || value === '' || value.startsWith('--')) {
      throw new Error(`Missing value for --${name}`);
    }
    flags.set(name, value);
  }
  return flags;
}
