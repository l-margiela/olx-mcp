import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SearchListingsTool } from './search-listings.tool.js';
import { OlxScraperFactory } from '../../scrapers/olx/scraper.factory.js';
import { BaseOlxScraper } from '../../scrapers/olx/base-olx.scraper.js';
import {
  createMockSearchResult,
  createSuccessResult,
  createErrorResult,
  assertIsSuccess,
  assertIsError,
} from '../../../tests/utils/test-helpers.js';
import { createMockAbortSignal } from '../../../tests/mocks/mcp.mock.js';
import type { SearchFilters } from '../../core/types.js';

describe('SearchListingsTool', () => {
  let searchTool: SearchListingsTool;
  let mockScraper: BaseOlxScraper;
  let mockScraperFactory: OlxScraperFactory;

  beforeEach(() => {
    mockScraper = {
      scrape: vi.fn(),
      validateQuery: vi.fn(),
    } as unknown as BaseOlxScraper;

    mockScraperFactory = {
      getScraper: vi.fn().mockReturnValue(mockScraper),
    } as unknown as OlxScraperFactory;

    searchTool = new SearchListingsTool(mockScraperFactory);
  });

  describe('Tool properties', () => {
    it('should have correct name and description', () => {
      expect(searchTool.name).toBe('searchListings');
      expect(searchTool.description).toContain('Search for listings on OLX domains');
      expect(searchTool.inputSchema).toBeDefined();
    });
  });

  describe('Successful search operations', () => {
    it('should execute search with valid minimal arguments', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const result = await searchTool.execute({
        domain: 'olx.pt',
        query: 'iPhone',
      });

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(2);
      expect(result.data.totalCount).toBe(2);

      // Verify scraper was called with correct filters
      expect(mockScraper.scrape).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'iPhone',
          page: 1,
          limit: 20,
          sortBy: 'relevance',
        }),
        undefined
      );
    });

    it('should execute search with all arguments', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const result = await searchTool.execute({
        domain: 'olx.pl',
        query: 'Samsung Galaxy',
        category: 'electronics',
        location: 'lisboa',
        minPrice: 100,
        maxPrice: 500,
        page: 2,
        limit: 10,
        sortBy: 'price-asc',
      });

      assertIsSuccess(result);

      const expectedFilters: SearchFilters = {
        domain: 'olx.pl',
        query: 'Samsung Galaxy',
        category: 'electronics' as any,
        location: 'lisboa' as any,
        minPrice: 100,
        maxPrice: 500,
        page: 2,
        limit: 10,
        sortBy: 'price-asc',
      };

      expect(mockScraper.scrape).toHaveBeenCalledWith(expectedFilters, undefined);
    });

    it('should execute search with category only', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const result = await searchTool.execute({
        domain: 'olx.pt',
        category: 'vehicles',
      });

      assertIsSuccess(result);
      expect(mockScraper.scrape).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'vehicles',
          query: undefined,
        }),
        undefined
      );
    });

    it('should execute search with location only', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const result = await searchTool.execute({
        domain: 'olx.pt',
        location: 'porto',
      });

      assertIsSuccess(result);
      expect(mockScraper.scrape).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'porto',
          query: undefined,
        }),
        undefined
      );
    });

    it('should use default values for optional parameters', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const result = await searchTool.execute({
        domain: 'olx.pt',
        query: 'test',
      });

      assertIsSuccess(result);
      expect(mockScraper.scrape).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortBy: 'relevance',
        }),
        undefined
      );
    });
  });

  describe('Abort signal handling', () => {
    it('should pass abort signal to scraper', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const abortSignal = createMockAbortSignal(false);

      await searchTool.execute({ domain: 'olx.pt', query: 'test' }, abortSignal);

      expect(mockScraper.scrape).toHaveBeenCalledWith(expect.any(Object), abortSignal);
    });

    it('should handle pre-aborted signal', async () => {
      const abortSignal = createMockAbortSignal(true);

      const result = await searchTool.execute({ domain: 'olx.pt', query: 'test' }, abortSignal);

      assertIsError(result);
      expect(result.error.message).toBe('Operation cancelled');
    });
  });

  describe('Error handling', () => {
    it('should handle scraper errors', async () => {
      const errorMessage = 'Network connection failed';
      (mockScraper.scrape as any).mockResolvedValue(createErrorResult(errorMessage));

      const result = await searchTool.execute({
        domain: 'olx.pt',
        query: 'test',
      });

      assertIsError(result);
      expect(result.error.message).toBe(errorMessage);
    });

    it('should handle scraper exceptions', async () => {
      const error = new Error('Unexpected scraper error');
      (mockScraper.scrape as any).mockRejectedValue(error);

      const result = await searchTool.execute({
        domain: 'olx.pt',
        query: 'test',
      });

      assertIsError(result);
      expect(result.error.message).toBe('Unexpected scraper error');
    });
  });

  describe('Input validation', () => {
    it('should reject invalid query length', async () => {
      const result = await searchTool.execute({
        query: '', // Empty string
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
      expect(result.error.message).toContain('query');
    });

    it('should reject query that is too long', async () => {
      const result = await searchTool.execute({
        query: 'a'.repeat(101), // Too long
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
    });

    it('should reject negative prices', async () => {
      const result = await searchTool.execute({
        query: 'test',
        minPrice: -10,
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
      expect(result.error.message).toContain('minPrice');
    });

    it('should reject invalid page numbers', async () => {
      const result = await searchTool.execute({
        query: 'test',
        page: 0,
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
      expect(result.error.message).toContain('page');
    });

    it('should reject invalid limit values', async () => {
      const result = await searchTool.execute({
        query: 'test',
        limit: 0,
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
      expect(result.error.message).toContain('limit');
    });

    it('should reject limit that is too high', async () => {
      const result = await searchTool.execute({
        query: 'test',
        limit: 51,
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
      expect(result.error.message).toContain('limit');
    });

    it('should reject invalid sort options', async () => {
      const result = await searchTool.execute({
        query: 'test',
        sortBy: 'invalid-sort' as any,
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
      expect(result.error.message).toContain('sortBy');
    });

    it('should reject when maxPrice is less than minPrice', async () => {
      const result = await searchTool.execute({
        domain: 'olx.pt',
        query: 'test',
        minPrice: 200,
        maxPrice: 100,
      });

      assertIsError(result);
      expect(result.error.message).toContain(
        'Max price must be greater than or equal to min price'
      );
    });

    it('should accept when maxPrice equals minPrice', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const result = await searchTool.execute({
        domain: 'olx.pt',
        query: 'test',
        minPrice: 100,
        maxPrice: 100,
      });

      assertIsSuccess(result);
    });

    it('should reject when no search criteria provided', async () => {
      const result = await searchTool.execute({
        domain: 'olx.pt',
        page: 1,
        limit: 10,
      });

      assertIsError(result);
      expect(result.error.message).toContain(
        'At least one of query, category, or location must be provided'
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle concurrent searches', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const requests = Array.from({ length: 10 }, (_, i) =>
        searchTool.execute({ domain: 'olx.pt', query: `search${i}` })
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        assertIsSuccess(result);
        expect(result.data.listings).toHaveLength(2);
      });

      expect(mockScraper.scrape).toHaveBeenCalledTimes(10);
    });

    it('should handle large search results', async () => {
      const largeResult = createMockSearchResult({
        listings: Array.from({ length: 50 }, (_, i) => ({
          id: `listing-${i}` as any,
          title: `Title ${i}`,
          url: `https://olx.pt/listing/${i}`,
        })),
        totalCount: 1000,
        totalPages: 20,
        hasNextPage: true,
      });

      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(largeResult));

      const result = await searchTool.execute({
        domain: 'olx.pt',
        query: 'popular search',
        limit: 50,
      });

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(50);
      expect(result.data.totalCount).toBe(1000);
      expect(result.data.hasNextPage).toBe(true);
    });

    it('should handle empty search results', async () => {
      const emptyResult = createMockSearchResult({
        listings: [],
        totalCount: 0,
        totalPages: 1,
        hasNextPage: false,
      });

      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(emptyResult));

      const result = await searchTool.execute({
        domain: 'olx.pt',
        query: 'nonexistent item xyz',
      });

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
      expect(result.data.hasNextPage).toBe(false);
    });
  });

  describe('Data type conversions', () => {
    it('should handle string to branded type conversions', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      await searchTool.execute({
        domain: 'olx.pt',
        category: 'electronics',
        location: 'lisboa',
      });

      const [filters] = (mockScraper.scrape as any).mock.calls[0];

      expect(filters.category).toBe('electronics');
      expect(filters.location).toBe('lisboa');
      // The actual conversion to branded types happens in the implementation
    });

    it('should preserve all filter properties', async () => {
      const mockResult = createMockSearchResult();
      (mockScraper.scrape as any).mockResolvedValue(createSuccessResult(mockResult));

      const inputArgs = {
        domain: 'olx.pt' as const,
        query: 'test query',
        category: 'electronics',
        location: 'porto',
        minPrice: 50,
        maxPrice: 500,
        page: 3,
        limit: 25,
        sortBy: 'date' as const,
      };

      await searchTool.execute(inputArgs);

      const [filters] = (mockScraper.scrape as any).mock.calls[0];

      expect(filters).toMatchObject({
        query: 'test query',
        category: 'electronics',
        location: 'porto',
        minPrice: 50,
        maxPrice: 500,
        page: 3,
        limit: 25,
        sortBy: 'date',
      });
    });
  });
});
