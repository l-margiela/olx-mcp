import { Browser } from 'playwright';
import { OlxDomain } from '../../core/types.js';
import { BaseOlxScraper } from './base-olx.scraper.js';
import { OLXPTScraper } from './olx-pt.scraper.js';
import { OLXPLScraper } from './olx-pl.scraper.js';

export class OlxScraperFactory {
  private readonly scrapers = new Map<OlxDomain, BaseOlxScraper>();

  constructor(private readonly browser: Browser) {}

  createScraper(domain: OlxDomain): BaseOlxScraper {
    // Check if we already have a scraper for this domain
    const existingScraper = this.scrapers.get(domain);
    if (existingScraper) {
      return existingScraper;
    }

    // Create new scraper based on domain
    let scraper: BaseOlxScraper;

    switch (domain) {
      case 'olx.pt':
        scraper = new OLXPTScraper(this.browser);
        break;
      case 'olx.pl':
        scraper = new OLXPLScraper(this.browser);
        break;
      case 'olx.bg':
        // For now, use base scraper with domain config
        scraper = new GenericOlxScraper('olx.bg', this.browser);
        break;
      case 'olx.ro':
        scraper = new GenericOlxScraper('olx.ro', this.browser);
        break;
      case 'olx.ua':
        scraper = new GenericOlxScraper('olx.ua', this.browser);
        break;
      default:
        throw new Error(`Unsupported OLX domain: ${domain}`);
    }

    // Cache the scraper
    this.scrapers.set(domain, scraper);
    return scraper;
  }

  getScraper(domain: OlxDomain): BaseOlxScraper {
    return this.createScraper(domain);
  }

  getAllScrapers(): Map<OlxDomain, BaseOlxScraper> {
    return new Map(this.scrapers);
  }

  hasScraper(domain: OlxDomain): boolean {
    return this.scrapers.has(domain);
  }

  clearCache(): void {
    this.scrapers.clear();
  }
}

// Generic scraper for domains that don't need special handling yet
class GenericOlxScraper extends BaseOlxScraper {
  constructor(domain: OlxDomain, browser: Browser) {
    super(domain, browser);
  }

  protected extractListingId(url: string): import('../../core/types.js').ListingId {
    // Most OLX domains use similar pattern: ID[alphanumeric].html
    const match = url.match(/ID([A-Za-z0-9]+)\.html/);
    const matchedId = match?.[1];
    const id = matchedId ?? Date.now().toString();
    return id as import('../../core/types.js').ListingId;
  }

  protected async findListingUrl(listingId: import('../../core/types.js').ListingId, page: import('playwright').Page): Promise<string> {
    try {
      // Use the domain-specific search path
      const searchPath = this.domainConfig.domain === 'olx.pl' ? '/oferty/' : '/ads/';
      await page.goto(`${this.domainConfig.baseUrl}${searchPath}q-${listingId}/`, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      // Look for a listing card with matching ID
      const listingLink = await page
        .$eval(`[data-cy="l-card"] a[href*="ID${listingId}"]`, el => el.getAttribute('href'))
        .catch(() => null);

      if (listingLink) {
        const fullUrl = new URL(listingLink, this.domainConfig.baseUrl).toString();
        return fullUrl;
      }
    } catch {
      // Search approach failed
    }

    return '';
  }
}
