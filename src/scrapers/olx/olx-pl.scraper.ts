import { Browser, Page } from 'playwright';
import { BaseOlxScraper } from './base-olx.scraper.js';
import { ListingId } from '../../core/types.js';

export class OLXPLScraper extends BaseOlxScraper {
  constructor(browser: Browser) {
    super('olx.pl', browser);
  }

  protected extractListingId(url: string): ListingId {
    // OLX Poland uses similar pattern to PT: ID[alphanumeric].html
    const match = url.match(/ID([A-Za-z0-9]+)\.html/);
    const matchedId = match?.[1];
    const id = matchedId ?? Date.now().toString();
    return id as ListingId;
  }

  protected async findListingUrl(listingId: ListingId, page: Page): Promise<string> {
    try {
      await page.goto(`${this.domainConfig.baseUrl}/oferty/q-${listingId}/`, {
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
