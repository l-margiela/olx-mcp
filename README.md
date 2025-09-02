[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/l-margiela-olx-mcp-badge.png)](https://mseep.ai/app/l-margiela-olx-mcp)

# OLX MCP Server

Why search for electro-trash in your area by yourself if Claude can do it for you?

100% AI slop.

## Features

- 🌍 **Multi-Domain Support**: Search across 5 OLX domains (Portugal, Poland, Bulgaria, Romania, Ukraine)
- 🔍 **Search Listings**: Search with filters for category, location, price range, and sorting
- 📋 **Listing Details**: Get detailed information about specific listings including seller info
- 🎭 **Browser Automation**: Reliable web scraping using Playwright

## Installation

### 🚀 Quick Install (Recommended)

```bash
npm install -g olx-mcp
```

### 📦 Alternative: From Source

```bash
git clone https://github.com/l-margiela/olx-mcp.git
cd olx-mcp
npm install
npm run build
```

### ✅ Verify Installation

```bash
olx-mcp --version
```

## Claude Desktop Configuration

1. **Locate your Claude Desktop config file:**

   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Add the OLX MCP server to your configuration:**

**For npm installation:**
```json
{
  "mcpServers": {
    "olx-mcp": {
      "command": "olx-mcp"
    }
  }
}
```

**For source installation:**
```json
{
  "mcpServers": {
    "olx-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/olx-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Note**: For source installation, replace `/absolute/path/to/olx-mcp` with the actual path to your project directory.

3. **Restart Claude Desktop** to load the new configuration.

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
- `includeImages` (default: false): Include image URLs
- `includeSellerInfo` (default: true): Include seller information

## Development

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Run in development mode with hot reload
- `npm start` - Run the built server
- `npm test` - Run tests (when available)
- `npm run clean` - Clean build artifacts

## Troubleshooting

### MCP Inspector

For debugging MCP communication, you can use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT License - see LICENSE file for details.
