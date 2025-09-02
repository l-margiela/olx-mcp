import { describe, it, expect } from 'vitest';

import {
  createResult,
  createError,
  isSuccess,
  isError,
  type Result,
  type Brand as _Brand,
  type ListingId,
  type CategoryId,
  type LocationId,
} from './types.js';

describe('Core Types', () => {
  describe('Result type utilities', () => {
    describe('createResult', () => {
      it('should create a successful result', () => {
        const data = { test: 'value' };
        const result = createResult(data);

        expect(result).toEqual({
          success: true,
          data,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(data);
        }
      });

      it('should preserve data type information', () => {
        const stringResult = createResult('test');
        const numberResult = createResult(42);
        const objectResult = createResult({ key: 'value' });

        expect(stringResult.success).toBe(true);
        expect(numberResult.success).toBe(true);
        expect(objectResult.success).toBe(true);

        if (stringResult.success) {
          expect(typeof stringResult.data).toBe('string');
          expect(stringResult.data).toBe('test');
        }

        if (numberResult.success) {
          expect(typeof numberResult.data).toBe('number');
          expect(numberResult.data).toBe(42);
        }

        if (objectResult.success) {
          expect(typeof objectResult.data).toBe('object');
          expect(objectResult.data).toEqual({ key: 'value' });
        }
      });
    });

    describe('createError', () => {
      it('should create an error result from Error object', () => {
        const error = new Error('Test error');
        const result = createError(error);

        expect(result).toEqual({
          success: false,
          error,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe(error);
          expect(result.error.message).toBe('Test error');
        }
      });

      it('should create an error result from string', () => {
        const errorMessage = 'String error message';
        const result = createError(errorMessage);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error.message).toBe(errorMessage);
        }
      });

      it('should preserve error types', () => {
        class CustomError extends Error {
          constructor(message: string) {
            super(message);
            this.name = 'CustomError';
          }
        }

        const customError = new CustomError('Custom error');
        const result = createError(customError);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(CustomError);
          expect(result.error.name).toBe('CustomError');
        }
      });
    });

    describe('isSuccess', () => {
      it('should correctly identify successful results', () => {
        const successResult = createResult('test data');
        const errorResult = createError('test error');

        expect(isSuccess(successResult)).toBe(true);
        expect(isSuccess(errorResult)).toBe(false);
      });

      it('should provide correct type narrowing', () => {
        const result: Result<string> = createResult('test');

        if (isSuccess(result)) {
          // TypeScript should know this is { success: true; data: string }
          expect(result.data).toBe('test');
          expect(result.success).toBe(true);
        } else {
          throw new Error('Result should be success');
        }
      });
    });

    describe('isError', () => {
      it('should correctly identify error results', () => {
        const successResult = createResult('test data');
        const errorResult = createError('test error');

        expect(isError(successResult)).toBe(false);
        expect(isError(errorResult)).toBe(true);
      });

      it('should provide correct type narrowing', () => {
        const result: Result<string> = createError('test error');

        if (isError(result)) {
          // TypeScript should know this is { success: false; error: Error }
          expect(result.error.message).toBe('test error');
          expect(result.success).toBe(false);
        } else {
          throw new Error('Result should be error');
        }
      });
    });
  });

  describe('Brand types', () => {
    it('should create branded types with proper type safety', () => {
      const listingId = 'listing-123' as ListingId;
      const categoryId = 'electronics' as CategoryId;
      const locationId = 'lisboa' as LocationId;

      // These should be treated as distinct types
      expect(typeof listingId).toBe('string');
      expect(typeof categoryId).toBe('string');
      expect(typeof locationId).toBe('string');

      // But they maintain their string values
      expect(listingId).toBe('listing-123');
      expect(categoryId).toBe('electronics');
      expect(locationId).toBe('lisboa');
    });

    it('should prevent accidental type mixing in function parameters', () => {
      // This test documents the type safety behavior,
      // actual enforcement happens at compile time
      const processListing = (id: ListingId): string => `Processing ${id}`;
      const processCategory = (id: CategoryId): string => `Category ${id}`;

      const listingId = 'listing-123' as ListingId;
      const categoryId = 'electronics' as CategoryId;

      expect(processListing(listingId)).toBe('Processing listing-123');
      expect(processCategory(categoryId)).toBe('Category electronics');

      // At runtime these would work, but TypeScript should prevent:
      // processListing(categoryId) <- This should cause a compile error
      // processCategory(listingId) <- This should cause a compile error
    });
  });

  describe('Complex Result scenarios', () => {
    it('should handle nested Result types', () => {
      type NestedData = {
        inner: Result<string>;
      };

      const successInner = createResult('inner value');
      const nestedSuccess = createResult<NestedData>({ inner: successInner });

      expect(isSuccess(nestedSuccess)).toBe(true);
      if (isSuccess(nestedSuccess)) {
        expect(isSuccess(nestedSuccess.data.inner)).toBe(true);
        if (isSuccess(nestedSuccess.data.inner)) {
          expect(nestedSuccess.data.inner.data).toBe('inner value');
        }
      }
    });

    it('should handle Result chains', () => {
      const chainResults = <T, U>(
        result: Result<T>,
        transform: (data: T) => Result<U>
      ): Result<U> => {
        if (isSuccess(result)) {
          return transform(result.data);
        }
        return createError(result.error);
      };

      const initial = createResult(5);
      const doubled = chainResults(initial, n => createResult(n * 2));
      const stringified = chainResults(doubled, n => createResult(n.toString()));

      expect(isSuccess(stringified)).toBe(true);
      if (isSuccess(stringified)) {
        expect(stringified.data).toBe('10');
      }
    });

    it('should handle Result chain with error', () => {
      const chainResults = <T, U>(
        result: Result<T>,
        transform: (data: T) => Result<U>
      ): Result<U> => {
        if (isSuccess(result)) {
          return transform(result.data);
        }
        return createError(result.error);
      };

      const initial = createError<number>('Initial error');
      const doubled = chainResults(initial, n => createResult(n * 2));

      expect(isError(doubled)).toBe(true);
      if (isError(doubled)) {
        expect(doubled.error.message).toBe('Initial error');
      }
    });
  });

  describe('Type compatibility', () => {
    it('should work with async functions', async () => {
      const asyncSuccess = async (): Promise<Result<string>> => {
        return createResult('async data');
      };

      const asyncError = async (): Promise<Result<string>> => {
        return createError('async error');
      };

      const successResult = await asyncSuccess();
      const errorResult = await asyncError();

      expect(isSuccess(successResult)).toBe(true);
      expect(isError(errorResult)).toBe(true);

      if (isSuccess(successResult)) {
        expect(successResult.data).toBe('async data');
      }

      if (isError(errorResult)) {
        expect(errorResult.error.message).toBe('async error');
      }
    });

    it('should work with generic constraints', () => {
      interface TestData {
        id: string;
        value: number;
      }

      const processData = <T extends TestData>(data: T): Result<T> => {
        if (data.value < 0) {
          return createError('Invalid value');
        }
        return createResult(data);
      };

      const validData = { id: 'test', value: 42, extra: 'field' };
      const invalidData = { id: 'test', value: -1 };

      const validResult = processData(validData);
      const invalidResult = processData(invalidData);

      expect(isSuccess(validResult)).toBe(true);
      expect(isError(invalidResult)).toBe(true);

      if (isSuccess(validResult)) {
        expect(validResult.data.extra).toBe('field');
      }
    });
  });
});
