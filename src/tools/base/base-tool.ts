import { z } from 'zod';
import { MCPTool, Result, createResult, createError } from '../../core/types.js';

export abstract class BaseTool<TArgs, TResult> implements MCPTool<TArgs, TResult> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly inputSchema: z.ZodType<any>;

  protected abstract executeImpl(args: TArgs, signal?: AbortSignal): Promise<TResult>;

  async execute(args: TArgs, signal?: AbortSignal): Promise<Result<TResult>> {
    try {
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      const validatedArgs = this.inputSchema.parse(args);
      const result = await this.executeImpl(validatedArgs, signal);
      return createResult(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return createError<TResult>(`Validation error: ${formattedErrors}`);
      }

      return createError<TResult>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  protected validateAndTransform<T>(schema: z.ZodSchema<T>, data: unknown): Result<T> {
    try {
      const validated = schema.parse(data);
      return createResult(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors
          .map(err => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return createError<T>(`Validation error: ${formattedErrors}`);
      }
      return createError<T>(error instanceof Error ? error : new Error(String(error)));
    }
  }

  protected async timeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms)),
    ]);
  }
}
