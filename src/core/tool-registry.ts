import { MCPTool } from './types.js';

export class ToolRegistry {
  private tools = new Map<string, MCPTool>();

  register<TArgs, TResult>(tool: MCPTool<TArgs, TResult>): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getAllTools(): ReadonlyArray<MCPTool> {
    return Array.from(this.tools.values());
  }

  hasTools(): boolean {
    return this.tools.size > 0;
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  clear(): void {
    this.tools.clear();
  }
}
