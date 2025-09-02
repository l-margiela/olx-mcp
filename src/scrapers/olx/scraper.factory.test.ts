import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Browser } from 'playwright';

import { OlxScraperFactory } from './scraper.factory.js';
import { OLXPTScraper } from './olx-pt.scraper.js';
import { OLXPLScraper } from './olx-pl.scraper.js';
import { BaseOlxScraper } from './base-olx.scraper.js';
import {
  createPlaywrightMocks,
  resetPlaywrightMocks,
} from '../../../tests/mocks/playwright.mock.js';
import type { OlxDomain } from '../../core/types.js';

describe('OlxScraperFactory', () => {
  let factory: OlxScraperFactory;
  let mockBrowser: Browser;

  beforeEach(() => {
    resetPlaywrightMocks();
    const mocks = createPlaywrightMocks();
    mockBrowser = mocks.browser;
    factory = new OlxScraperFactory(mockBrowser);
  });

  afterEach(() => {
    resetPlaywrightMocks();
  });

  describe('Constructor', () => {
    it('should create factory with browser instance', () => {
      expect(factory).toBeInstanceOf(OlxScraperFactory);
      expect(() => new OlxScraperFactory(mockBrowser)).not.toThrow();
    });
  });

  describe('createScraper', () => {
    it('should create OLXPTScraper for olx.pt domain', () => {
      const scraper = factory.createScraper('olx.pt');
      expect(scraper).toBeInstanceOf(OLXPTScraper);
      expect(scraper).toBeInstanceOf(BaseOlxScraper);
    });

    it('should create OLXPLScraper for olx.pl domain', () => {
      const scraper = factory.createScraper('olx.pl');
      expect(scraper).toBeInstanceOf(OLXPLScraper);
      expect(scraper).toBeInstanceOf(BaseOlxScraper);
    });

    it('should create generic scrapers for other domains', () => {
      const domains: OlxDomain[] = ['olx.bg', 'olx.ro', 'olx.ua'];

      domains.forEach(domain => {
        const scraper = factory.createScraper(domain);
        expect(scraper).toBeInstanceOf(BaseOlxScraper);
        expect((scraper as any).domainConfig.domain).toBe(domain);
      });
    });

    it('should throw error for unsupported domain', () => {
      expect(() => {
        factory.createScraper('olx.invalid' as OlxDomain);
      }).toThrow('Unsupported OLX domain: olx.invalid');
    });

    it('should cache scrapers and return same instance on subsequent calls', () => {
      const scraper1 = factory.createScraper('olx.pt');
      const scraper2 = factory.createScraper('olx.pt');

      expect(scraper1).toBe(scraper2);
      expect(scraper1).toBeInstanceOf(OLXPTScraper);
    });

    it('should create different instances for different domains', () => {
      const ptScraper = factory.createScraper('olx.pt');
      const plScraper = factory.createScraper('olx.pl');

      expect(ptScraper).not.toBe(plScraper);
      expect(ptScraper).toBeInstanceOf(OLXPTScraper);
      expect(plScraper).toBeInstanceOf(OLXPLScraper);
    });
  });

  describe('getScraper', () => {
    it('should return same result as createScraper', () => {
      const scraper1 = factory.createScraper('olx.pt');
      const scraper2 = factory.getScraper('olx.pt');

      expect(scraper1).toBe(scraper2);
    });

    it('should work for all supported domains', () => {
      const domains: OlxDomain[] = ['olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua'];

      domains.forEach(domain => {
        const scraper = factory.getScraper(domain);
        expect(scraper).toBeInstanceOf(BaseOlxScraper);
        expect((scraper as any).domainConfig.domain).toBe(domain);
      });
    });
  });

  describe('getAllScrapers', () => {
    it('should return empty map initially', () => {
      const scrapers = factory.getAllScrapers();
      expect(scrapers.size).toBe(0);
    });

    it('should return map with created scrapers', () => {
      factory.createScraper('olx.pt');
      factory.createScraper('olx.pl');

      const scrapers = factory.getAllScrapers();
      expect(scrapers.size).toBe(2);
      expect(scrapers.has('olx.pt')).toBe(true);
      expect(scrapers.has('olx.pl')).toBe(true);
      expect(scrapers.get('olx.pt')).toBeInstanceOf(OLXPTScraper);
      expect(scrapers.get('olx.pl')).toBeInstanceOf(OLXPLScraper);
    });

    it('should return defensive copy of scrapers map', () => {
      factory.createScraper('olx.pt');

      const scrapers1 = factory.getAllScrapers();
      const scrapers2 = factory.getAllScrapers();

      expect(scrapers1).not.toBe(scrapers2);
      expect(scrapers1.size).toBe(scrapers2.size);
    });
  });

  describe('hasScraper', () => {
    it('should return false for uncreated scrapers', () => {
      expect(factory.hasScraper('olx.pt')).toBe(false);
      expect(factory.hasScraper('olx.pl')).toBe(false);
    });

    it('should return true for created scrapers', () => {
      factory.createScraper('olx.pt');

      expect(factory.hasScraper('olx.pt')).toBe(true);
      expect(factory.hasScraper('olx.pl')).toBe(false);
    });

    it('should work for all domains', () => {
      const domains: OlxDomain[] = ['olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua'];

      domains.forEach((domain, index) => {
        if (index < 3) {
          factory.createScraper(domain);
          expect(factory.hasScraper(domain)).toBe(true);
        } else {
          expect(factory.hasScraper(domain)).toBe(false);
        }
      });
    });
  });

  describe('clearCache', () => {
    it('should clear all cached scrapers', () => {
      factory.createScraper('olx.pt');
      factory.createScraper('olx.pl');

      expect(factory.getAllScrapers().size).toBe(2);
      expect(factory.hasScraper('olx.pt')).toBe(true);

      factory.clearCache();

      expect(factory.getAllScrapers().size).toBe(0);
      expect(factory.hasScraper('olx.pt')).toBe(false);
      expect(factory.hasScraper('olx.pl')).toBe(false);
    });

    it('should allow creating new scrapers after clear', () => {
      factory.createScraper('olx.pt');
      const originalScraper = factory.getScraper('olx.pt');

      factory.clearCache();

      const newScraper = factory.createScraper('olx.pt');
      expect(newScraper).not.toBe(originalScraper);
      expect(newScraper).toBeInstanceOf(OLXPTScraper);
    });
  });

  describe('Domain configuration validation', () => {
    it('should ensure scrapers have correct domain configurations', () => {
      const domains: OlxDomain[] = ['olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua'];
      const expectedBases = {
        'olx.pt': 'https://www.olx.pt',
        'olx.pl': 'https://www.olx.pl',
        'olx.bg': 'https://www.olx.bg',
        'olx.ro': 'https://www.olx.ro',
        'olx.ua': 'https://www.olx.ua',
      };

      domains.forEach(domain => {
        const scraper = factory.createScraper(domain);
        const config = (scraper as any).domainConfig;

        expect(config.domain).toBe(domain);
        expect(config.baseUrl).toBe(expectedBases[domain]);
        expect(config.selectors).toBeDefined();
        expect(config.urlPatterns).toBeDefined();
        expect(config.currency).toBeDefined();
        expect(config.language).toBeDefined();
      });
    });

    it('should ensure scrapers have working validateQuery method', () => {
      const domains: OlxDomain[] = ['olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua'];

      domains.forEach(domain => {
        const scraper = factory.createScraper(domain);

        expect(scraper.validateQuery({ domain })).toBe(true);
        expect(scraper.validateQuery(null)).toBe(false);
        expect(scraper.validateQuery('string')).toBe(false);
      });
    });
  });

  describe('Memory management', () => {
    it('should not create excessive scraper instances', () => {
      const domain: OlxDomain = 'olx.pt';

      // Create same scraper multiple times
      for (let i = 0; i < 10; i++) {
        factory.createScraper(domain);
      }

      // Should still only have one instance
      expect(factory.getAllScrapers().size).toBe(1);
      expect(factory.hasScraper(domain)).toBe(true);
    });

    it('should handle multiple domains efficiently', () => {
      const domains: OlxDomain[] = ['olx.pt', 'olx.pl', 'olx.bg', 'olx.ro', 'olx.ua'];

      // Create all scrapers multiple times
      for (let i = 0; i < 5; i++) {
        domains.forEach(domain => {
          factory.createScraper(domain);
        });
      }

      // Should have exactly one scraper per domain
      expect(factory.getAllScrapers().size).toBe(domains.length);
      domains.forEach(domain => {
        expect(factory.hasScraper(domain)).toBe(true);
      });
    });
  });
});
