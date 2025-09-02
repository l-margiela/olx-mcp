import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

import { BaseTool } from './base-tool.js';
import { isSuccess, isError } from '../../core/types.js';
import { createMockAbortSignal } from '../../../tests/mocks/mcp.mock.js';

// Test implementations of BaseTool
class TestTool extends BaseTool<{ input: string }, { output: string }> {
  readonly name = 'test-tool';
  readonly description = 'A tool for testing';
  readonly inputSchema = z.object({
    input: z.string().min(1, 'Input cannot be empty'),
  });

  constructor(
    private readonly mockImpl?: (args: { input: string }) => Promise<{ output: string }>
  ) {
    super();
  }

  protected async executeImpl(args: { input: string }): Promise<{ output: string }> {
    if (this.mockImpl) {
      return this.mockImpl(args);
    }
    return { output: `Processed: ${args.input}` };
  }
}

class ErrorTool extends BaseTool<{ value: number }, number> {
  readonly name = 'error-tool';
  readonly description = 'A tool that can throw errors';
  readonly inputSchema = z.object({
    value: z.number(),
  });

  protected async executeImpl(args: { value: number }): Promise<number> {
    if (args.value < 0) {
      throw new Error('Negative values not allowed');
    }
    return args.value * 2;
  }
}

class AsyncTool extends BaseTool<{ delay: number }, string> {
  readonly name = 'async-tool';
  readonly description = 'A tool with async operations';
  readonly inputSchema = z.object({
    delay: z.number().min(0),
  });

  protected async executeImpl(args: { delay: number }): Promise<string> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(`Completed after ${args.delay}ms`);
      }, args.delay);
    });
  }
}

describe('BaseTool', () => {
  let testTool: TestTool;

  beforeEach(() => {
    testTool = new TestTool();
  });

  describe('Basic functionality', () => {
    it('should have required properties', () => {
      expect(testTool.name).toBe('test-tool');
      expect(testTool.description).toBe('A tool for testing');
      expect(testTool.inputSchema).toBeInstanceOf(z.ZodObject);
    });

    it('should execute successfully with valid input', async () => {
      const result = await testTool.execute({ input: 'test data' });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({ output: 'Processed: test data' });
      }
    });

    it('should return error for invalid input', async () => {
      // @ts-expect-error - Testing invalid input
      const result = await testTool.execute({ input: 123 });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toContain('Validation error');
        expect(result.error.message).toContain('Expected string, received number');
      }
    });

    it('should validate input schema constraints', async () => {
      const result = await testTool.execute({ input: '' });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toContain('Validation error');
        expect(result.error.message).toContain('Input cannot be empty');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle implementation errors gracefully', async () => {
      const errorTool = new ErrorTool();
      const result = await errorTool.execute({ value: -1 });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Negative values not allowed');
      }
    });

    it('should handle thrown string errors', async () => {
      const throwingTool = new TestTool(async () => {
        throw 'String error';
      });

      const result = await throwingTool.execute({ input: 'test' });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('String error');
      }
    });

    it('should handle non-Error objects', async () => {
      const throwingTool = new TestTool(async () => {
        throw { message: 'Object error', code: 500 };
      });

      const result = await throwingTool.execute({ input: 'test' });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toContain('[object Object]');
      }
    });

    it('should handle Zod validation errors with multiple issues', async () => {
      const complexSchema = z.object({
        name: z.string().min(3),
        age: z.number().min(0),
        email: z.string().email(),
      });

      class ComplexTool extends BaseTool<{ name: string; age: number; email: string }, string> {
        readonly name = 'complex-tool';
        readonly description = 'Complex validation';
        readonly inputSchema = complexSchema;

        protected async executeImpl(): Promise<string> {
          return 'success';
        }
      }

      const complexTool = new ComplexTool();

      // @ts-expect-error - Testing invalid input
      const result = await complexTool.execute({
        name: 'ab',
        age: -1,
        email: 'invalid-email',
      });

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toContain('Validation error');
        expect(result.error.message).toContain('name:');
        expect(result.error.message).toContain('age:');
        expect(result.error.message).toContain('email:');
      }
    });
  });

  describe('Abort signal handling', () => {
    it('should handle pre-aborted signals', async () => {
      const abortSignal = createMockAbortSignal(true);
      const result = await testTool.execute({ input: 'test' }, abortSignal);

      expect(isError(result)).toBe(true);
      if (isError(result)) {
        expect(result.error.message).toBe('Operation cancelled');
      }
    });

    it('should execute normally with non-aborted signal', async () => {
      const abortSignal = createMockAbortSignal(false);
      const result = await testTool.execute({ input: 'test' }, abortSignal);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data).toEqual({ output: 'Processed: test' });
      }
    });

    it('should handle signal abortion during execution', async () => {
      const slowTool = new AsyncTool();
      const abortSignal = createMockAbortSignal(false);

      // Start execution
      const executionPromise = slowTool.execute({ delay: 100 }, abortSignal);

      // Abort after starting but before completion
      setTimeout(() => {
        abortSignal.aborted = true;
      }, 10);

      const result = await executionPromise;

      // Note: In this test, the tool will still complete since we don't check
      // the signal inside executeImpl. This tests the initial signal check.
      expect(isSuccess(result)).toBe(true);
    });
  });

  describe('Utility methods', () => {
    describe('validateAndTransform', () => {
      it('should validate and transform valid data', () => {
        const schema = z.object({
          count: z.number(),
          name: z.string(),
        });

        const result = testTool['validateAndTransform'](schema, {
          count: 5,
          name: 'test',
        });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.data).toEqual({ count: 5, name: 'test' });
        }
      });

      it('should return error for invalid data', () => {
        const schema = z.object({
          count: z.number(),
          name: z.string(),
        });

        const result = testTool['validateAndTransform'](schema, {
          count: 'not a number',
          name: 123,
        });

        expect(isError(result)).toBe(true);
        if (isError(result)) {
          expect(result.error.message).toContain('Validation error');
        }
      });

      it('should transform data according to schema', () => {
        const schema = z.object({
          count: z.coerce.number(),
          active: z.coerce.boolean(),
        });

        const result = testTool['validateAndTransform'](schema, {
          count: '42',
          active: 'true',
        });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.data).toEqual({ count: 42, active: true });
        }
      });
    });

    describe('timeout', () => {
      it('should resolve if promise completes within timeout', async () => {
        const fastPromise = Promise.resolve('completed');
        const result = await testTool['timeout'](fastPromise, 100);

        expect(result).toBe('completed');
      });

      it('should reject if promise exceeds timeout', async () => {
        const slowPromise = new Promise(resolve => setTimeout(() => resolve('too late'), 200));

        await expect(testTool['timeout'](slowPromise, 50)).rejects.toThrow('Operation timed out');
      });

      it('should use custom timeout message', async () => {
        const slowPromise = new Promise(resolve => setTimeout(() => resolve('too late'), 200));

        await expect(
          testTool['timeout'](slowPromise, 50, 'Custom timeout message')
        ).rejects.toThrow('Custom timeout message');
      });

      it('should handle promise rejection within timeout', async () => {
        const rejectingPromise = Promise.reject(new Error('Promise error'));

        await expect(testTool['timeout'](rejectingPromise, 100)).rejects.toThrow('Promise error');
      });
    });
  });

  describe('Advanced scenarios', () => {
    it('should handle concurrent executions', async () => {
      const executions = Array.from({ length: 10 }, (_, i) =>
        testTool.execute({ input: `test-${i}` })
      );

      const results = await Promise.all(executions);

      results.forEach((result, i) => {
        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.data.output).toBe(`Processed: test-${i}`);
        }
      });
    });

    it('should maintain state independence between executions', async () => {
      let counter = 0;
      const statefulTool = new TestTool(async args => {
        counter++;
        return { output: `${args.input}-${counter}` };
      });

      const result1 = await statefulTool.execute({ input: 'first' });
      const result2 = await statefulTool.execute({ input: 'second' });

      expect(isSuccess(result1)).toBe(true);
      expect(isSuccess(result2)).toBe(true);

      if (isSuccess(result1) && isSuccess(result2)) {
        expect(result1.data.output).toBe('first-1');
        expect(result2.data.output).toBe('second-2');
      }
    });

    it('should handle schema coercion and defaults', async () => {
      const schemaWithDefaults = z.object({
        required: z.string(),
        optional: z.string().default('default-value'),
        coerced: z.coerce.number(),
      });

      class DefaultTool extends BaseTool<any, any> {
        readonly name = 'default-tool';
        readonly description = 'Tool with defaults';
        readonly inputSchema = schemaWithDefaults;

        protected async executeImpl(args: any): Promise<any> {
          return { received: args };
        }
      }

      const defaultTool = new DefaultTool();
      const result = await defaultTool.execute({
        required: 'test',
        coerced: '123',
        // optional will use default
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.data.received).toEqual({
          required: 'test',
          optional: 'default-value',
          coerced: 123,
        });
      }
    });

    it('should handle large data structures', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` }));
      const largeTool = new TestTool(async () => ({
        output: JSON.stringify(largeArray),
      }));

      const result = await largeTool.execute({ input: 'large-data' });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        const parsedOutput = JSON.parse(result.data.output);
        expect(parsedOutput).toHaveLength(1000);
        expect(parsedOutput[0]).toEqual({ id: 0, value: 'item-0' });
        expect(parsedOutput[999]).toEqual({ id: 999, value: 'item-999' });
      }
    });
  });

  describe('Performance considerations', () => {
    it('should execute multiple validations efficiently', async () => {
      const startTime = Date.now();
      const iterations = 100;

      const executions = Array.from({ length: iterations }, (_, i) =>
        testTool.execute({ input: `performance-test-${i}` })
      );

      const results = await Promise.all(executions);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results.every(isSuccess)).toBe(true);
    });

    it('should handle memory efficiently with repeated executions', async () => {
      // This test is more about documenting expected behavior
      for (let i = 0; i < 50; i++) {
        const result = await testTool.execute({ input: `memory-test-${i}` });
        expect(isSuccess(result)).toBe(true);
      }

      // Tool should still function normally after many executions
      const finalResult = await testTool.execute({ input: 'final-test' });
      expect(isSuccess(finalResult)).toBe(true);
      if (isSuccess(finalResult)) {
        expect(finalResult.data.output).toBe('Processed: final-test');
      }
    });
  });
});
