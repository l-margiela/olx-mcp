import { vi } from 'vitest';
/**
 * Mock implementations for MCP (Model Context Protocol) testing
 */
// Mock Server class from @modelcontextprotocol/sdk
export const mockMCPServer = {
    setRequestHandler: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
};
// Mock request schemas
export const mockListToolsRequestSchema = Symbol('ListToolsRequestSchema');
export const mockCallToolRequestSchema = Symbol('CallToolRequestSchema');
// Mock MCP types and utilities
export const createMockMCPRequest = (name, args = {}) => ({
    method: 'tools/call',
    params: {
        name,
        arguments: args,
    },
});
export const createMockMCPResponse = (content) => ({
    content: [
        {
            type: 'text',
            text: JSON.stringify(content, null, 2),
        },
    ],
});
export const createMockListToolsResponse = (tools) => ({
    tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
    })),
});
// Mock transport for MCP server connection
export const mockMCPTransport = {
    send: vi.fn(),
    onMessage: vi.fn(),
    close: vi.fn(),
};
// Helper to create mock tool registration
export const createMockToolRegistration = (name, description) => ({
    name,
    description,
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
});
// Mock the entire MCP SDK
export const mockMCPSDK = () => {
    vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
        Server: vi.fn().mockImplementation(() => mockMCPServer),
    }));
    vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
        ListToolsRequestSchema: mockListToolsRequestSchema,
        CallToolRequestSchema: mockCallToolRequestSchema,
    }));
    vi.mock('zod-to-json-schema', () => ({
        zodToJsonSchema: vi.fn().mockImplementation((schema) => ({
            type: 'object',
            properties: {},
            required: [],
            ...schema,
        })),
    }));
};
// Utility to simulate MCP tool calls
export const simulateToolCall = async (toolHandler, toolName, args = {}) => {
    const request = createMockMCPRequest(toolName, args);
    return await toolHandler(request);
};
// Mock abort signal for testing cancellation
export const createMockAbortSignal = (aborted = false) => ({
    aborted,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onabort: null,
    reason: undefined,
    throwIfAborted: vi.fn().mockImplementation(() => {
        if (aborted) {
            throw new Error('Operation cancelled');
        }
    }),
});
// Helper to verify MCP server interactions
export const verifyMCPCalls = () => ({
    serverCreated: mockMCPServer !== null,
    handlersSet: mockMCPServer.setRequestHandler.mock.calls.length > 0,
    connectionsMade: mockMCPServer.connect.mock.calls.length > 0,
    listToolsHandlerCalls: mockMCPServer.setRequestHandler.mock.calls.filter(call => call[0] === mockListToolsRequestSchema),
    callToolHandlerCalls: mockMCPServer.setRequestHandler.mock.calls.filter(call => call[0] === mockCallToolRequestSchema),
});
// Reset MCP mocks
export const resetMCPMocks = () => {
    vi.clearAllMocks();
    mockMCPServer.setRequestHandler.mockClear();
    mockMCPServer.connect.mockClear();
};
//# sourceMappingURL=mcp.mock.js.map