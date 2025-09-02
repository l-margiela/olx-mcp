/**
 * Mock implementations for MCP (Model Context Protocol) testing
 */
export declare const mockMCPServer: {
  setRequestHandler: import('vitest').Mock<(...args: any[]) => any>;
  connect: import('vitest').Mock<(...args: any[]) => any>;
};
export declare const mockListToolsRequestSchema: unique symbol;
export declare const mockCallToolRequestSchema: unique symbol;
export declare const createMockMCPRequest: (
  name: string,
  args?: Record<string, unknown>
) => {
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
};
export declare const createMockMCPResponse: (content: unknown) => {
  content: {
    type: 'text';
    text: string;
  }[];
};
export declare const createMockListToolsResponse: (
  tools: Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>
) => {
  tools: {
    name: string;
    description: string;
    inputSchema: unknown;
  }[];
};
export declare const mockMCPTransport: {
  send: import('vitest').Mock<(...args: any[]) => any>;
  onMessage: import('vitest').Mock<(...args: any[]) => any>;
  close: import('vitest').Mock<(...args: any[]) => any>;
};
export declare const createMockToolRegistration: (
  name: string,
  description: string
) => {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: {};
    required: never[];
  };
};
export declare const mockMCPSDK: () => void;
export declare const simulateToolCall: (
  toolHandler: (request: {
    params: {
      name: string;
      arguments?: Record<string, unknown>;
    };
  }) => Promise<unknown>,
  toolName: string,
  args?: Record<string, unknown>
) => Promise<unknown>;
export declare const createMockAbortSignal: (aborted?: boolean) => {
  aborted: boolean;
  addEventListener: import('vitest').Mock<(...args: any[]) => any>;
  removeEventListener: import('vitest').Mock<(...args: any[]) => any>;
  dispatchEvent: import('vitest').Mock<(...args: any[]) => any>;
  onabort: null;
  reason: undefined;
  throwIfAborted: import('vitest').Mock<(...args: any[]) => any>;
};
export declare const verifyMCPCalls: () => {
  serverCreated: boolean;
  handlersSet: boolean;
  connectionsMade: boolean;
  listToolsHandlerCalls: any[][];
  callToolHandlerCalls: any[][];
};
export declare const resetMCPMocks: () => void;
//# sourceMappingURL=mcp.mock.d.ts.map
