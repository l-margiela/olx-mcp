import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

import { ToolRegistry } from './tool-registry.js';
import type { MCPTool, Result } from './types.js';
import { createResult, createError } from './types.js';

// Mock tool implementation for testing
class MockTool implements MCPTool<{ input: string }, { output: string }> {
  constructor(
    public readonly name: string,
    public readonly description: string,
    private readonly mockExecute?: (args: { input: string }) => Promise<Result<{ output: string }>>
  ) {}

  readonly inputSchema = z.object({
    input: z.string(),
  });

  async execute(args: { input: string }): Promise<Result<{ output: string }>> {
    if (this.mockExecute) {
      return this.mockExecute(args);
    }
    return createResult({ output: `Processed: ${args.input}` });
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('Registration', () => {
    it('should register a single tool', () => {
      const tool = new MockTool('test-tool', 'A test tool');
      const result = registry.register(tool);

      expect(result).toBe(registry); // Should return self for chaining
      expect(registry.has('test-tool')).toBe(true);
      expect(registry.get('test-tool')).toBe(tool);
    });

    it('should support method chaining', () => {
      const tool1 = new MockTool('tool1', 'First tool');
      const tool2 = new MockTool('tool2', 'Second tool');

      const result = registry.register(tool1).register(tool2);

      expect(result).toBe(registry);
      expect(registry.has('tool1')).toBe(true);
      expect(registry.has('tool2')).toBe(true);
    });

    it('should throw error when registering tool with duplicate name', () => {
      const tool1 = new MockTool('duplicate-name', 'First tool');
      const tool2 = new MockTool('duplicate-name', 'Second tool');

      registry.register(tool1);

      expect(() => registry.register(tool2)).toThrow('Tool duplicate-name already registered');
    });

    it('should register multiple tools with different names', () => {
      const tools = [
        new MockTool('search', 'Search tool'),
        new MockTool('details', 'Details tool'),
        new MockTool('validate', 'Validation tool'),
      ];

      tools.forEach(tool => registry.register(tool));

      expect(registry.getAllTools()).toHaveLength(3);
      tools.forEach(tool => {
        expect(registry.has(tool.name)).toBe(true);
        expect(registry.get(tool.name)).toBe(tool);
      });
    });
  });

  describe('Retrieval', () => {
    it('should retrieve registered tool by name', () => {
      const tool = new MockTool('retrieve-test', 'Test retrieval');
      registry.register(tool);

      const retrieved = registry.get('retrieve-test');
      expect(retrieved).toBe(tool);
    });

    it('should return undefined for non-existent tool', () => {
      const retrieved = registry.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should check tool existence correctly', () => {
      const tool = new MockTool('exists-test', 'Existence test');
      registry.register(tool);

      expect(registry.has('exists-test')).toBe(true);
      expect(registry.has('does-not-exist')).toBe(false);
    });

    it('should return all registered tools', () => {
      expect(registry.getAllTools()).toEqual([]);

      const tool1 = new MockTool('tool1', 'First');
      const tool2 = new MockTool('tool2', 'Second');

      registry.register(tool1).register(tool2);

      const allTools = registry.getAllTools();
      expect(allTools).toHaveLength(2);
      expect(allTools).toContain(tool1);
      expect(allTools).toContain(tool2);
    });

    it('should return tool names', () => {
      expect(registry.getToolNames()).toEqual([]);

      registry
        .register(new MockTool('alpha', 'Alpha tool'))
        .register(new MockTool('beta', 'Beta tool'))
        .register(new MockTool('gamma', 'Gamma tool'));

      const names = registry.getToolNames();
      expect(names).toEqual(['alpha', 'beta', 'gamma']);
      expect(names).toEqual(expect.arrayContaining(['alpha', 'beta', 'gamma']));
    });
  });

  describe('Tool execution through registry', () => {
    it('should execute tool through registry interface', async () => {
      const mockExecute = vi.fn().mockResolvedValue(createResult({ output: 'mocked result' }));
      const tool = new MockTool('executable-tool', 'Executable test', mockExecute);

      registry.register(tool);

      const retrievedTool = registry.get('executable-tool');
      expect(retrievedTool).toBe(tool);

      const result = await retrievedTool!.execute({ input: 'test input' });

      expect(mockExecute).toHaveBeenCalledWith({ input: 'test input' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ output: 'mocked result' });
      }
    });

    it('should handle tool execution errors', async () => {
      const mockExecute = vi.fn().mockResolvedValue(createError('Execution failed'));
      const tool = new MockTool('error-tool', 'Error test', mockExecute);

      registry.register(tool);

      const retrievedTool = registry.get('error-tool');
      const result = await retrievedTool!.execute({ input: 'test input' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Execution failed');
      }
    });
  });

  describe('Additional registry methods', () => {
    it('should check if registry has any tools', () => {
      expect(registry.hasTools()).toBe(false);

      registry.register(new MockTool('test', 'Test tool'));
      expect(registry.hasTools()).toBe(true);
    });

    it('should unregister tools', () => {
      const tool = new MockTool('unregister-test', 'Test tool');
      registry.register(tool);

      expect(registry.has('unregister-test')).toBe(true);
      expect(registry.unregister('unregister-test')).toBe(true);
      expect(registry.has('unregister-test')).toBe(false);
      expect(registry.unregister('non-existent')).toBe(false);
    });

    it('should clear all tools', () => {
      registry.register(new MockTool('tool1', 'Tool 1')).register(new MockTool('tool2', 'Tool 2'));

      expect(registry.hasTools()).toBe(true);
      expect(registry.getAllTools()).toHaveLength(2);

      registry.clear();

      expect(registry.hasTools()).toBe(false);
      expect(registry.getAllTools()).toHaveLength(0);
      expect(registry.getToolNames()).toHaveLength(0);
    });
  });

  describe('Edge cases and error conditions', () => {
    it('should handle empty tool name', () => {
      const tool = new MockTool('', 'Empty name tool');
      registry.register(tool);
      expect(registry.has('')).toBe(true);

      // Should throw when trying to register another tool with empty name
      const duplicateTool = new MockTool('', 'Another empty name tool');
      expect(() => registry.register(duplicateTool)).toThrow('Tool  already registered');
    });

    it('should handle tools with special characters in names', () => {
      const specialNames = [
        'tool-with-dashes',
        'tool_with_underscores',
        'tool.with.dots',
        'tool123',
        'UPPERCASE_TOOL',
      ];

      specialNames.forEach((name, index) => {
        const tool = new MockTool(name, `Tool ${index}`);
        expect(() => registry.register(tool)).not.toThrow();
        expect(registry.has(name)).toBe(true);
      });
    });

    it('should handle concurrent access patterns', async () => {
      const tools = Array.from(
        { length: 10 },
        (_, i) => new MockTool(`concurrent-tool-${i}`, `Concurrent tool ${i}`)
      );

      // Register tools concurrently
      const registrations = tools.map(
        tool =>
          new Promise<void>(resolve => {
            setTimeout(() => {
              registry.register(tool);
              resolve();
            }, Math.random() * 10);
          })
      );

      await Promise.all(registrations);

      expect(registry.getAllTools()).toHaveLength(10);
      tools.forEach(tool => {
        expect(registry.has(tool.name)).toBe(true);
      });
    });

    it('should maintain tool order in getAllTools', () => {
      const tool1 = new MockTool('first', 'First tool');
      const tool2 = new MockTool('second', 'Second tool');
      const tool3 = new MockTool('third', 'Third tool');

      registry.register(tool1).register(tool2).register(tool3);

      const allTools = registry.getAllTools();
      expect(allTools[0]).toBe(tool1);
      expect(allTools[1]).toBe(tool2);
      expect(allTools[2]).toBe(tool3);
    });
  });

  describe('Integration scenarios', () => {
    it('should work with different tool types', () => {
      class StringTool implements MCPTool<{ text: string }, string> {
        name = 'string-tool';
        description = 'Processes strings';
        inputSchema = z.object({ text: z.string() });

        async execute(args: { text: string }): Promise<Result<string>> {
          return createResult(args.text.toUpperCase());
        }
      }

      class NumberTool implements MCPTool<{ num: number }, number> {
        name = 'number-tool';
        description = 'Processes numbers';
        inputSchema = z.object({ num: z.number() });

        async execute(args: { num: number }): Promise<Result<number>> {
          return createResult(args.num * 2);
        }
      }

      const stringTool = new StringTool();
      const numberTool = new NumberTool();

      registry.register(stringTool).register(numberTool);

      expect(registry.has('string-tool')).toBe(true);
      expect(registry.has('number-tool')).toBe(true);
      expect(registry.getAllTools()).toHaveLength(2);
    });

    it('should support tool replacement workflow', () => {
      const originalTool = new MockTool('replaceable', 'Original tool');
      registry.register(originalTool);

      expect(registry.get('replaceable')).toBe(originalTool);

      // Simulate replacement by creating new registry
      const newRegistry = new ToolRegistry();
      const newTool = new MockTool('replaceable', 'Replacement tool');
      newRegistry.register(newTool);

      expect(newRegistry.get('replaceable')).toBe(newTool);
      expect(newRegistry.get('replaceable')).not.toBe(originalTool);
    });
  });

  describe('Memory and performance', () => {
    it('should handle large numbers of tools efficiently', () => {
      const startTime = Date.now();
      const toolCount = 1000;

      // Register many tools
      for (let i = 0; i < toolCount; i++) {
        registry.register(new MockTool(`tool-${i}`, `Tool number ${i}`));
      }

      const registrationTime = Date.now() - startTime;
      expect(registrationTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify all tools are accessible
      expect(registry.getAllTools()).toHaveLength(toolCount);

      // Test retrieval performance
      const lookupStartTime = Date.now();
      for (let i = 0; i < toolCount; i++) {
        expect(registry.has(`tool-${i}`)).toBe(true);
      }
      const lookupTime = Date.now() - lookupStartTime;
      expect(lookupTime).toBeLessThan(100); // Lookups should be fast
    });

    it('should not leak memory on repeated operations', () => {
      // This test is more about documenting expected behavior
      // In a real scenario, you might use memory profiling tools

      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const tempRegistry = new ToolRegistry();
        tempRegistry.register(new MockTool(`temp-${i}`, 'Temporary tool'));

        // Registry should be eligible for garbage collection after this loop
        expect(tempRegistry.has(`temp-${i}`)).toBe(true);
      }

      // Main registry should still work normally
      registry.register(new MockTool('persistent', 'Persistent tool'));
      expect(registry.has('persistent')).toBe(true);
    });
  });
});
