import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { chromium, Browser } from 'playwright';

import { ToolRegistry } from './tool-registry.js';
import { SearchListingsTool } from '../tools/search/search-listings.tool.js';
import { GetListingDetailsTool } from '../tools/listing/get-listing-details.tool.js';
import { OlxScraperFactory } from '../scrapers/olx/scraper.factory.js';

export interface ServerConfig {
  readonly name: string;
  readonly version: string;
  readonly headless?: boolean;
}

export class OLXMCPServer {
  private readonly registry = new ToolRegistry();
  private readonly server: Server;
  private browser?: Browser | undefined;
  private scraperFactory?: OlxScraperFactory | undefined;

  constructor(private readonly config: ServerConfig) {
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  async initialize(): Promise<void> {
    // Initialize browser
    this.browser = await chromium.launch({
      headless: this.config.headless ?? true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    // Create scraper factory
    this.scraperFactory = new OlxScraperFactory(this.browser);

    // Register tools
    this.registry
      .register(new SearchListingsTool(this.scraperFactory))
      .register(new GetListingDetailsTool(this.scraperFactory));
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.registry.getAllTools().map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      const tool = this.registry.get(name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      const result = await tool.execute(args || {});

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    });
  }

  getServer(): Server {
    return this.server;
  }

  async cleanup(): Promise<void> {
    if (this.scraperFactory) {
      this.scraperFactory.clearCache();
      this.scraperFactory = undefined as OlxScraperFactory | undefined;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined as Browser | undefined;
    }
  }

  async connect(transport: any): Promise<void> {
    await this.server.connect(transport);
  }
}
