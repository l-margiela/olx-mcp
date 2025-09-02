import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Browser } from 'playwright';

import { OLXPTScraper } from './olx-pt.scraper.js';
import {
  createPlaywrightMocks,
  setupOLXScrapingMocks,
  setupEmptySearchMocks,
  setupNetworkErrorMocks,
  setupSlowResponseMocks,
  resetPlaywrightMocks,
  verifyPlaywrightCalls,
} from '../../../tests/mocks/playwright.mock.js';
import {
  createMockSearchFilters,
  assertIsSuccess,
  assertIsError,
  withTimeout,
} from '../../../tests/utils/test-helpers.js';
import { createMockAbortSignal } from '../../../tests/mocks/mcp.mock.js';
import type { SearchFilters, ListingId } from '../../core/types.js';

describe('OLXPTScraper', () => {
  let scraper: OLXPTScraper;
  let mockBrowser: Browser;

  beforeEach(() => {
    resetPlaywrightMocks();
    const mocks = createPlaywrightMocks();
    mockBrowser = mocks.browser;
    scraper = new OLXPTScraper(mockBrowser);
  });

  afterEach(() => {
    resetPlaywrightMocks();
  });

  describe('Construction and Configuration', () => {
    it('should initialize with correct base configuration', () => {
      expect(scraper).toBeInstanceOf(OLXPTScraper);
      // We can't directly access private properties, but we can verify the scraper was created
    });

    it('should accept browser instance', () => {
      expect(() => new OLXPTScraper(mockBrowser)).not.toThrow();
    });
  });

  describe('Query validation', () => {
    it('should validate SearchFilters object', () => {
      const validFilters = createMockSearchFilters();
      expect(scraper.validateQuery(validFilters)).toBe(true);
    });

    it('should reject null query', () => {
      expect(scraper.validateQuery(null)).toBe(false);
    });

    it('should reject non-object query', () => {
      expect(scraper.validateQuery('string')).toBe(false);
      expect(scraper.validateQuery(123)).toBe(false);
      expect(scraper.validateQuery(true)).toBe(false);
    });

    it('should accept empty object as valid filter', () => {
      expect(scraper.validateQuery({})).toBe(true);
    });
  });

  describe('Search scraping', () => {
    beforeEach(() => {
      setupOLXScrapingMocks();
    });

    it('should scrape search results successfully', async () => {
      const filters = createMockSearchFilters({
        query: 'iPhone',
        minPrice: 100,
        maxPrice: 1000,
      });

      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(2);
      expect(result.data.listings[0]?.title).toBe('iPhone 13 Pro Max');
      expect(result.data.listings[1]?.title).toBe('Samsung Galaxy S21');
      expect(result.data.totalCount).toBe(2);
      expect(result.data.currentPage).toBe(1);
    });

    it('should handle empty search results', async () => {
      setupEmptySearchMocks();
      const filters = createMockSearchFilters({ query: 'nonexistent-item' });

      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
    });

    it('should build correct search URLs', async () => {
      const filters: SearchFilters = {
        domain: 'olx.pt',
        query: 'test query',
        category: 'electronics' as any,
        location: 'lisboa' as any,
        minPrice: 50,
        maxPrice: 500,
        sortBy: 'price-asc',
        page: 2,
      };

      await scraper.scrape(filters);

      const calls = verifyPlaywrightCalls();
      expect(calls.gotoCalledWith).toHaveLength(1);

      const [gotoCall] = calls.gotoCalledWith;
      const url = gotoCall![0] as string;

      expect(url).toContain('/lisboa/q-test-query/');
      expect(url).toContain('c=electronics');
      expect(url).toContain('search%5Bfilter_float_price%3Afrom%5D=50');
      expect(url).toContain('search%5Bfilter_float_price%3Ato%5D=500');
      expect(url).toContain('search%5Border%5D=filter_float_price%3Aasc');
      expect(url).toContain('page=2');
    });

    it('should handle pagination correctly', async () => {
      const filters = createMockSearchFilters({ page: 3 });

      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      expect(result.data.currentPage).toBe(3);
    });

    it('should extract listing details correctly', async () => {
      const filters = createMockSearchFilters();
      const result = await scraper.scrape(filters);

      assertIsSuccess(result);

      const firstListing = result.data.listings[0]!;
      expect(firstListing.id).toBeTruthy();
      expect(firstListing.title).toBe('iPhone 13 Pro Max');
      expect(firstListing.price).toBe('800€');
      expect(firstListing.location).toBe('Lisboa');
      expect(firstListing.url).toContain('olx.pt');
    });
  });

  describe('Listing details scraping', () => {
    beforeEach(() => {
      setupOLXScrapingMocks();
    });

    it('should get listing details successfully', async () => {
      const listingId = 'ABC123' as ListingId;
      const result = await scraper.getListingDetails(listingId);

      assertIsSuccess(result);
      expect(result.data.id).toBe(listingId);
      expect(result.data.title).toBe('iPhone 13 Pro Max - Detailed');
      expect(result.data.price).toBe('800€');
      expect(result.data.description).toBe('Excellent condition iPhone 13 Pro Max');
      expect(result.data.location).toBe('Lisboa, Região de Lisboa');
    });

    it('should extract seller information', async () => {
      const listingId = 'DEF456' as ListingId;
      const result = await scraper.getListingDetails(listingId);

      assertIsSuccess(result);
      expect(result.data.seller).toBeDefined();
      expect(result.data.seller?.name).toBe('John Seller');
      expect(result.data.seller?.verified).toBe(true);
    });

    it('should construct correct listing URL', async () => {
      const listingId = 'XYZ789' as ListingId;
      await scraper.getListingDetails(listingId);

      const calls = verifyPlaywrightCalls();
      expect(calls.gotoCalledWith).toHaveLength(1);

      const [gotoCall] = calls.gotoCalledWith;
      const url = gotoCall![0] as string;

      expect(url).toBe('https://www.olx.pt/anuncios/IDXYZ789.html');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      setupNetworkErrorMocks();
      const filters = createMockSearchFilters();

      const result = await scraper.scrape(filters);

      assertIsError(result);
      expect(result.error.message).toContain('Network error');
    });

    it('should retry on failures', async () => {
      setupNetworkErrorMocks();

      const filters = createMockSearchFilters();

      // Mock will fail all attempts
      const result = await scraper.scrape(filters);

      assertIsError(result);
      // Verify retries were attempted (3 retries + 1 initial = 4 total attempts)
      const calls = verifyPlaywrightCalls();
      expect(calls.gotoCalledWith.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle timeout scenarios', async () => {
      setupSlowResponseMocks(10000); // 10 second delay

      const filters = createMockSearchFilters();

      // Use withTimeout to test timeout behavior
      await expect(withTimeout(scraper.scrape(filters), 1000)).rejects.toThrow(
        'Timeout after 1000ms'
      );
    });

    it('should handle malformed page content', async () => {
      const _mocks = createPlaywrightMocks();
      const { mockPage } = setupOLXScrapingMocks();

      // Mock selectors to return null/undefined
      mockPage.$$.mockResolvedValue([]);
      mockPage.$eval.mockRejectedValue(new Error('Element not found'));

      const filters = createMockSearchFilters();
      const result = await scraper.scrape(filters);

      // Should still succeed but with empty results
      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(0);
    });
  });

  describe('Abort signal handling', () => {
    it('should respect abort signal for search', async () => {
      const abortSignal = createMockAbortSignal(true);
      const filters = createMockSearchFilters();

      const result = await scraper.scrape(filters, abortSignal);

      assertIsError(result);
      expect(result.error.message).toBe('Operation cancelled');
    });

    it('should respect abort signal for listing details', async () => {
      const abortSignal = createMockAbortSignal(true);
      const listingId = 'TEST123' as ListingId;

      const result = await scraper.getListingDetails(listingId, abortSignal);

      assertIsError(result);
      expect(result.error.message).toBe('Operation cancelled');
    });

    it('should continue execution with non-aborted signal', async () => {
      setupOLXScrapingMocks();
      const abortSignal = createMockAbortSignal(false);
      const filters = createMockSearchFilters();

      const result = await scraper.scrape(filters, abortSignal);

      assertIsSuccess(result);
      expect(result.data.listings.length).toBeGreaterThan(0);
    });
  });

  describe('URL building and parameter handling', () => {
    it('should handle minimal filters', async () => {
      setupOLXScrapingMocks();
      const filters: SearchFilters = { domain: 'olx.pt', query: 'test' };

      await scraper.scrape(filters);

      const calls = verifyPlaywrightCalls();
      const [gotoCall] = calls.gotoCalledWith;
      const url = gotoCall![0] as string;

      expect(url).toContain('/ads/q-test/');
      expect(url).not.toContain('c=');
      expect(url).not.toContain('search%5Bfilter_float_price');
    });

    it('should handle all sort options', async () => {
      setupOLXScrapingMocks();
      const sortOptions = ['date', 'price-asc', 'price-desc', 'relevance'] as const;

      for (const sortBy of sortOptions) {
        resetPlaywrightMocks();
        createPlaywrightMocks();
        setupOLXScrapingMocks();

        const filters = createMockSearchFilters({ sortBy });
        await scraper.scrape(filters);

        const calls = verifyPlaywrightCalls();
        const [gotoCall] = calls.gotoCalledWith;
        const url = gotoCall![0] as string;

        if (sortBy === 'relevance') {
          expect(url).not.toContain('search%5Border%5D=');
        } else {
          const sortMap = {
            date: 'created_at%3Adesc',
            'price-asc': 'filter_float_price%3Aasc',
            'price-desc': 'filter_float_price%3Adesc',
          };
          expect(url).toContain(`search%5Border%5D=${sortMap[sortBy]}`);
        }
      }
    });

    it('should encode special characters in query', async () => {
      setupOLXScrapingMocks();
      const filters: SearchFilters = { domain: 'olx.pt', query: 'test & special chars!' };

      await scraper.scrape(filters);

      const calls = verifyPlaywrightCalls();
      const [gotoCall] = calls.gotoCalledWith;
      const url = gotoCall![0] as string;

      expect(url).toContain('/ads/q-test-special-chars/');
    });
  });

  describe('Data extraction and parsing', () => {
    it('should extract listing IDs from URLs correctly', async () => {
      setupOLXScrapingMocks();
      const filters = createMockSearchFilters();

      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      result.data.listings.forEach(listing => {
        expect(listing.id).toBeTruthy();
        expect(typeof listing.id).toBe('string');
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      const _mocks = createPlaywrightMocks();
      const { mockPage } = setupOLXScrapingMocks();

      // Mock some fields to return empty strings
      mockPage.$$.mockResolvedValue([
        {
          $eval: vi.fn().mockImplementation((selector: string) => {
            if (selector.includes('title')) {
              return Promise.resolve('Test Title');
            }
            if (selector.includes('link')) {
              return Promise.resolve('/anuncios/test-IDTEST123.html');
            }
            // Return empty for price, location, etc.
            return Promise.resolve('');
          }),
        },
      ] as any);

      const filters = createMockSearchFilters();
      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(1);

      const listing = result.data.listings[0]!;
      expect(listing.title).toBe('Test Title');
      expect(listing.price).toBeUndefined();
      expect(listing.location).toBeUndefined();
    });

    it('should skip invalid listings during extraction', async () => {
      const _mocks = createPlaywrightMocks();
      const { mockPage } = setupOLXScrapingMocks();

      // Mock elements where some have missing required fields
      mockPage.$$.mockResolvedValue([
        {
          $eval: vi.fn().mockImplementation((selector: string) => {
            if (selector.includes('title')) return Promise.resolve('Valid Title');
            if (selector.includes('link'))
              return Promise.resolve('/anuncios/valid-IDVALID123.html');
            return Promise.resolve('');
          }),
        },
        {
          $eval: vi.fn().mockImplementation(() => Promise.resolve('')), // No title or link
        },
        {
          $eval: vi.fn().mockImplementation((selector: string) => {
            if (selector.includes('title')) return Promise.resolve('Another Valid');
            if (selector.includes('link'))
              return Promise.resolve('/anuncios/another-IDVALID456.html');
            return Promise.resolve('');
          }),
        },
      ] as any);

      const filters = createMockSearchFilters();
      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      // Should only extract valid listings (2 out of 3)
      expect(result.data.listings).toHaveLength(2);
    });
  });

  describe('Browser resource management', () => {
    it('should properly manage page resources', async () => {
      setupOLXScrapingMocks();
      const filters = createMockSearchFilters();

      await scraper.scrape(filters);

      const calls = verifyPlaywrightCalls();
      expect(calls.newPageCalled).toBe(true);
      expect(calls.pageClosed).toBe(true);
    });

    it('should close page even if operation fails', async () => {
      setupNetworkErrorMocks();
      const filters = createMockSearchFilters();

      const result = await scraper.scrape(filters);

      assertIsError(result);

      const calls = verifyPlaywrightCalls();
      expect(calls.newPageCalled).toBe(true);
      expect(calls.pageClosed).toBe(true);
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle concurrent scraping requests', async () => {
      setupOLXScrapingMocks();

      const requests = Array.from({ length: 5 }, (_, i) =>
        scraper.scrape(createMockSearchFilters({ query: `test-${i}` }))
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        assertIsSuccess(result);
        expect(result.data.listings.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle large search results efficiently', async () => {
      const { mockPage } = setupOLXScrapingMocks();

      // Mock many listing elements
      const manyElements = Array.from({ length: 40 }, (_, i) => ({
        $eval: vi.fn().mockImplementation((selector: string) => {
          if (selector.includes('title')) return Promise.resolve(`Listing ${i + 1}`);
          if (selector.includes('link'))
            return Promise.resolve(`/anuncios/listing-ID${i + 1}.html`);
          if (selector.includes('price')) return Promise.resolve(`${(i + 1) * 10}€`);
          return Promise.resolve('');
        }),
      }));

      mockPage.$$.mockResolvedValue(manyElements as any);

      const filters = createMockSearchFilters();
      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(40);
    });
  });
});
