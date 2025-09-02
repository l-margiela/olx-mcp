import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Browser } from 'playwright';

import { OLXPLScraper } from './olx-pl.scraper.js';
import {
  createPlaywrightMocks,
  setupOLXScrapingMocks,
  setupEmptySearchMocks,
  resetPlaywrightMocks,
  verifyPlaywrightCalls,
} from '../../../tests/mocks/playwright.mock.js';
import {
  createMockSearchFilters,
  assertIsSuccess,
  assertIsError,
} from '../../../tests/utils/test-helpers.js';
import type { SearchFilters, ListingId } from '../../core/types.js';

describe('OLXPLScraper', () => {
  let scraper: OLXPLScraper;
  let mockBrowser: Browser;

  beforeEach(() => {
    resetPlaywrightMocks();
    const mocks = createPlaywrightMocks();
    mockBrowser = mocks.browser;
    scraper = new OLXPLScraper(mockBrowser);
  });

  afterEach(() => {
    resetPlaywrightMocks();
  });

  describe('Construction and Configuration', () => {
    it('should initialize with correct domain configuration', () => {
      expect(scraper).toBeInstanceOf(OLXPLScraper);
    });

    it('should accept browser instance', () => {
      expect(() => new OLXPLScraper(mockBrowser)).not.toThrow();
    });
  });

  describe('Query validation', () => {
    it('should validate SearchFilters object', () => {
      const filters = createMockSearchFilters({ domain: 'olx.pl' });
      expect(scraper.validateQuery(filters)).toBe(true);
    });

    it('should reject invalid query types', () => {
      expect(scraper.validateQuery(null)).toBe(false);
      expect(scraper.validateQuery('string')).toBe(false);
      expect(scraper.validateQuery(123)).toBe(false);
    });
  });

  describe('Search functionality', () => {
    beforeEach(() => {
      setupOLXScrapingMocks();
    });

    it('should perform basic search with Polish domain', async () => {
      const filters = createMockSearchFilters({
        domain: 'olx.pl',
        query: 'telefon',
        location: 'warszawa',
      });

      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(2);
      expect(result.data.totalCount).toBeGreaterThanOrEqual(0);
      expect(result.data.currentPage).toBe(1);

      // Verify correct Polish URL structure was used
      const calls = verifyPlaywrightCalls();
      const [gotoCall] = calls.gotoCalledWith;
      const url = gotoCall![0] as string;
      expect(url).toContain('olx.pl');
      expect(url).toContain('/warszawa/q-telefon/');
    });

    it('should handle empty search results', async () => {
      setupEmptySearchMocks();
      const filters = createMockSearchFilters({
        domain: 'olx.pl',
        query: 'nieistniejący-przedmiot',
      });

      const result = await scraper.scrape(filters);

      assertIsSuccess(result);
      expect(result.data.listings).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
    });

    it('should build correct Polish URLs without location', async () => {
      setupOLXScrapingMocks();
      const filters: SearchFilters = {
        domain: 'olx.pl',
        query: 'telefon',
        minPrice: 100,
        maxPrice: 1000,
        sortBy: 'price-asc',
        page: 2,
      };

      await scraper.scrape(filters);

      const calls = verifyPlaywrightCalls();
      const [gotoCall] = calls.gotoCalledWith;
      const url = gotoCall![0] as string;

      expect(url).toContain('olx.pl');
      expect(url).toContain('/oferty/q-telefon/'); // Polish uses /oferty/ instead of /ads/
      expect(url).toContain('search%5Bfilter_float_price%3Afrom%5D=100');
      expect(url).toContain('search%5Bfilter_float_price%3Ato%5D=1000');
      expect(url).toContain('search%5Border%5D=filter_float_price%3Aasc');
      expect(url).toContain('page=2');
    });

    it('should handle Polish characters in location names', async () => {
      setupOLXScrapingMocks();
      const filters: SearchFilters = {
        domain: 'olx.pl',
        query: 'samochód',
        location: 'Kraków',
      };

      await scraper.scrape(filters);

      const calls = verifyPlaywrightCalls();
      const [gotoCall] = calls.gotoCalledWith;
      const url = gotoCall![0] as string;

      // Should handle Polish characters in URLs
      expect(url).toContain('olx.pl');
      expect(url).toContain('/krakow/q-samochod/');
    });

    it('should extract Polish listing IDs correctly', async () => {
      const testUrls = [
        '/oferta/sprzedam-telefon-IDXyz123.html',
        '/d/oferty/elektronika/telefony/warszawa/q-iphone/IDabc789.html',
        'https://www.olx.pl/oferta/laptop-IDdef456.html',
      ];

      testUrls.forEach(url => {
        const id = (scraper as any).extractListingId(url);
        expect(typeof id).toBe('string');
        expect(id).toMatch(/^[A-Za-z0-9]+$/);
      });
    });
  });

  describe('Listing details functionality', () => {
    beforeEach(() => {
      setupOLXScrapingMocks();
    });

    it('should get listing details for Polish domain', async () => {
      const listingId = 'Xyz123' as ListingId;

      const result = await scraper.getListingDetails(listingId);

      assertIsSuccess(result);
      expect(result.data.id).toBe(listingId);
      expect(result.data.title).toBeDefined();
      expect(result.data.url).toContain('olx.pl');
    });

    it('should find listing URL through Polish search path', async () => {
      const listingId = 'TestId123' as ListingId;

      // This calls the protected method indirectly through getListingDetails
      const _result = await scraper.getListingDetails(listingId);

      const calls = verifyPlaywrightCalls();
      // Should try Polish search path first
      expect(
        calls.gotoCalledWith.some(call => call![0].toString().includes('/oferty/q-TestId123/'))
      ).toBe(true);
    });
  });

  describe('Polish domain specific features', () => {
    it('should use PLN currency format', async () => {
      // This would be tested through the domain config
      expect((scraper as any).domainConfig.currency).toBe('PLN');
      expect((scraper as any).domainConfig.language).toBe('pl');
      expect((scraper as any).domainConfig.baseUrl).toBe('https://www.olx.pl');
    });

    it('should use Polish-specific selectors', async () => {
      const config = (scraper as any).domainConfig;
      expect(config.selectors.search.title).toContain('h4, [data-cy="ad-card-title"] h6');
      expect(config.urlPatterns.searchPath('', 'test')).toBe('/oferty/q-test/');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const mockPage = {
        goto: () => Promise.reject(new Error('Network error')),
        close: () => Promise.resolve(),
        $: () => Promise.resolve(null),
        $$: () => Promise.resolve([]),
        waitForSelector: () => Promise.reject(new Error('Timeout')),
      };

      const mockBrowser = {
        newPage: () => Promise.resolve(mockPage),
        close: () => Promise.resolve(),
      } as any;

      const testScraper = new OLXPLScraper(mockBrowser);
      const filters = createMockSearchFilters({ domain: 'olx.pl' });

      const result = await testScraper.scrape(filters);

      assertIsError(result);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should handle missing listing gracefully', async () => {
      setupEmptySearchMocks();
      const listingId = 'NonExistent123' as ListingId;

      const result = await scraper.getListingDetails(listingId);

      assertIsError(result);
      expect(result.error.message).toContain('not found');
    });
  });
});
