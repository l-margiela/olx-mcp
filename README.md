# OLX MCP Server

Why search for e-waste in your area by yourself if Claude can do it for you?

100% AI slop.

## Features

- 🌍 **Multi-Domain Support**: Search across 5 OLX domains (Portugal, Poland, Bulgaria, Romania, Ukraine)
- 🔍 **Search Listings**: Search with filters for category, location, price range, and sorting
- 📋 **Listing Details**: Get detailed information about specific listings including seller info
- 🎭 **Browser Automation**: Reliable web scraping using Playwright

<img width="739" height="858" alt="Screenshot 2025-09-02 at 22 47 54" src="https://github.com/user-attachments/assets/c6fee7a4-fa84-4ca5-9eb0-7dc8a1ed6c58" />

## Installation

### 📋 Claude Desktop Configuration

1. **Locate your Claude Desktop config file:**
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Add the OLX MCP server to your configuration:**

```json
{
  "mcpServers": {
    "olx-mcp": {
      "command": "npx",
      "args": ["olx-mcp"]
    }
  }
}
```

1. **Restart Claude Desktop** to load the new configuration.

### 🔄 Alternative: Global Installation

If you prefer to install globally:

```bash
npm install -g olx-mcp
```

Then use this config:

```json
{
  "mcpServers": {
    "olx-mcp": {
      "command": "olx-mcp"
    }
  }
}
```

### 📦 Development: From Source

```bash
git clone https://github.com/l-margiela/olx-mcp.git
cd olx-mcp
npm install
npm run build
```

Use this config for development:

```json
{
  "mcpServers": {
    "olx-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/olx-mcp/dist/index.js"]
    }
  }
}
```

### 🌐 Alternative: Streamable HTTP transport

By default the server talks over STDIO, so each client starts its own server process and
its own browser. If you'd rather run one long-lived server that several clients share,
for example in a separate container, start it with the
[Streamable HTTP](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http)
transport:

```bash
npx olx-mcp --transport http --port 3000
# MCP endpoint: http://127.0.0.1:3000/mcp   health check: http://127.0.0.1:3000/health
```

| Flag | Env variable | Default |
|------|--------------|---------|
| `--transport stdio\|http` | `OLX_MCP_TRANSPORT` | `stdio` |
| `--host` | `OLX_MCP_HOST` | `127.0.0.1` |
| `--port` | `OLX_MCP_PORT` | `3000` |
| `--allowed-hosts` (comma-separated `host:port`) | `OLX_MCP_ALLOWED_HOSTS` | loopback addresses when bound to loopback |

The server runs in stateless mode: every request is independent and all clients share
one browser instance. It has no authentication. Bound to `127.0.0.1` (the default),
it only accepts requests whose `Host` header is a loopback address, which protects
against DNS rebinding. If you bind it to another interface (e.g. `--host 0.0.0.0` inside
a container), keep it on a private network and set `--allowed-hosts` to the names
clients use, e.g. `--allowed-hosts olx-mcp:3000`.

Client configuration (e.g. Claude Code `.mcp.json`):

```json
{
  "mcpServers": {
    "olx-mcp": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

## Usage

Once configured, you can use the following tools in your MCP client:

### Search Listings

Search for listings on any supported OLX domain with various filters:

```
Can you search for "apartments" in "Lisboa" on OLX Portugal with a maximum price of 1000 euros?
```

```
Search for "telefon" in "warszawa" on OLX Poland with prices between 100-500 PLN?
```

**Parameters:**

- `domain` (required): OLX domain ('olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua')
- `query` (optional): Search term
- `category` (optional): Category filter
- `location` (optional): Location filter
- `minPrice` (optional): Minimum price
- `maxPrice` (optional): Maximum price
- `page` (default: 1): Page number
- `limit` (default: 20): Items per page
- `sortBy` (default: 'relevance'): Sort order ('relevance', 'date', 'price-asc', 'price-desc')

### Listing Details

Get detailed information about a specific listing from any supported domain:

```
Can you get the details for listing "ABC123" from OLX Portugal?
```

```
Show me details for listing "XYZ789" from OLX Poland including images?
```

**Parameters:**

- `domain` (required): OLX domain ('olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua')
- `listingId` (required): The ID of the listing
- `includeImages` (default: true): Include the listing's gallery image URLs
- `includeSellerInfo` (default: true): Include seller information

## Development

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Run in development mode with hot reload
- `npm start` - Run the built server
- `npm test` - Run tests (when available)
- `npm run clean` - Clean build artifacts

### Releasing

Releases are automated. Pushing a `v*` tag triggers `.github/workflows/release.yml`,
which runs the full CI pipeline, publishes to npm (with provenance), and creates
the GitHub Release:

```bash
npm version patch   # or minor/major; creates the version commit + v-tag
git push origin main --follow-tags
```

Do **not** run `npm publish` manually — CI publishes on the tag push, so a local
publish always fails with "cannot publish over previously published versions".
Verify with `gh run list` (green "Release" run) and `gh release view vX.Y.Z`.

## Troubleshooting

### MCP Inspector

For debugging MCP communication, you can use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT License - see LICENSE file for details.
