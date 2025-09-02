import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules before importing
const mockServer = {
  setRequestHandler: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => mockServer),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: Symbol('ListToolsRequestSchema'),
  CallToolRequestSchema: Symbol('CallToolRequestSchema'),
}));

vi.mock('zod-to-json-schema', () => ({
  zodToJsonSchema: vi.fn().mockReturnValue({ type: 'object' }),
}));

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn(),
        setDefaultTimeout: vi.fn(),
        close: vi.fn(),
      }),
      close: vi.fn(),
    }),
  },
}));

import { OLXMCPServer, type ServerConfig } from './server.js';

describe('OLXMCPServer', () => {
  let server: OLXMCPServer;
  let config: ServerConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      name: 'test-olx-mcp-server',
      version: '1.0.0-test',
      headless: true,
    };

    server = new OLXMCPServer(config);
  });

  describe('Server initialization', () => {
    it('should create server with correct configuration', () => {
      expect(server).toBeInstanceOf(OLXMCPServer);
      expect(server.getServer()).toBeDefined();
    });

    it('should initialize browser and register tools', async () => {
      const { chromium } = await import('playwright');

      await server.initialize();

      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
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
    });

    it('should use headless option from config', async () => {
      const { chromium } = await import('playwright');
      const headlessConfig = { ...config, headless: false };
      const headlessServer = new OLXMCPServer(headlessConfig);

      await headlessServer.initialize();

      expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: false }));
    });

    it('should default to headless when not specified', async () => {
      const { chromium } = await import('playwright');
      const defaultConfig = { name: 'test', version: '1.0.0' };
      const defaultServer = new OLXMCPServer(defaultConfig);

      await defaultServer.initialize();

      expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
    });
  });

  describe('Connection management', () => {
    beforeEach(async () => {
      await server.initialize();
    });

    it('should connect to transport', async () => {
      const mockTransport = { send: vi.fn(), onMessage: vi.fn() };

      await server.connect(mockTransport);

      const serverInstance = server.getServer();
      expect(serverInstance.connect).toHaveBeenCalledWith(mockTransport);
    });
  });

  describe('Resource cleanup', () => {
    it('should clean up browser resources', async () => {
      const { chromium } = await import('playwright');
      await server.initialize();

      await server.cleanup();

      // Get the mock browser that was created
      const mockBrowser = vi.mocked(chromium.launch).mock.results[0]?.value;
      expect(mockBrowser?.close).toHaveBeenCalled();
    });

    it('should handle cleanup when browser is not initialized', async () => {
      // Should not throw error
      await expect(server.cleanup()).resolves.toBeUndefined();
    });

    it('should handle cleanup errors gracefully', async () => {
      const { chromium } = await import('playwright');
      await server.initialize();

      // Mock browser close to throw error
      const mockBrowser = vi.mocked(chromium.launch).mock.results[0]?.value;
      if (mockBrowser?.close) {
        mockBrowser.close.mockRejectedValueOnce(new Error('Close failed'));
      }

      // Should not propagate error
      await expect(server.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('Error handling', () => {
    it('should handle browser launch failures', async () => {
      const { chromium } = await import('playwright');
      vi.mocked(chromium.launch).mockRejectedValueOnce(new Error('Browser launch failed'));

      await expect(server.initialize()).rejects.toThrow('Browser launch failed');
    });

    it('should handle scraper creation failures', async () => {
      const { chromium } = await import('playwright');
      // Mock browser to return null
      vi.mocked(chromium.launch).mockResolvedValueOnce(null as any);

      await expect(server.initialize()).rejects.toThrow();
    });
  });

  describe('Server configuration', () => {
    it('should use provided server name and version', () => {
      const customConfig: ServerConfig = {
        name: 'custom-olx-server',
        version: '2.1.0',
        headless: false,
      };

      const customServer = new OLXMCPServer(customConfig);

      expect(customServer).toBeInstanceOf(OLXMCPServer);
    });

    it('should handle minimal configuration', () => {
      const minimalConfig: ServerConfig = {
        name: 'minimal-server',
        version: '1.0.0',
      };

      const minimalServer = new OLXMCPServer(minimalConfig);
      expect(minimalServer).toBeInstanceOf(OLXMCPServer);
    });
  });

  describe('Browser configuration', () => {
    it('should configure browser with security options', async () => {
      const { chromium } = await import('playwright');

      await server.initialize();

      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ]),
      });
    });

    it('should pass through headless configuration', async () => {
      const { chromium } = await import('playwright');
      const configs = [
        { name: 'test', version: '1.0.0', headless: true },
        { name: 'test', version: '1.0.0', headless: false },
        { name: 'test', version: '1.0.0' }, // undefined should default to true
      ];

      for (const testConfig of configs) {
        vi.clearAllMocks();

        const testServer = new OLXMCPServer(testConfig);
        await testServer.initialize();

        const expectedHeadless = testConfig.headless ?? true;
        expect(chromium.launch).toHaveBeenCalledWith(
          expect.objectContaining({ headless: expectedHeadless })
        );
      }
    });
  });

  describe('Performance considerations', () => {
    it('should initialize efficiently', async () => {
      const startTime = Date.now();
      await server.initialize();
      const endTime = Date.now();

      // Should complete quickly (within reasonable time for tests)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle rapid cleanup and re-initialization', async () => {
      const { chromium } = await import('playwright');

      for (let i = 0; i < 3; i++) {
        await server.initialize();
        await server.cleanup();
      }

      expect(chromium.launch).toHaveBeenCalledTimes(3);
    });
  });
});
