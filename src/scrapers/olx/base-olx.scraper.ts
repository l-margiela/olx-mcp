import { Browser, Page } from 'playwright';
import { PlaywrightScraper } from '../base/scraper.interface.js';
import {
  SearchFilters,
  SearchResult,
  Listing,
  Result,
  createResult,
  createError,
  ListingId,
  OlxDomain,
  DomainConfig,
} from '../../core/types.js';
import { getDomainConfig } from './domain-config.js';

export abstract class BaseOlxScraper extends PlaywrightScraper<SearchFilters, SearchResult> {
  protected readonly domainConfig: DomainConfig;
  private readonly urlCache = new Map<string, string>(); // Maps listing ID to full URL

  constructor(domain: OlxDomain, browser: Browser) {
    const domainConfig = getDomainConfig(domain);

    super(
      {
        baseUrl: domainConfig.baseUrl,
        timeout: 30000,
        retries: 3,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        headless: true,
      },
      browser
    );

    this.domainConfig = domainConfig;
  }

  validateQuery(query: unknown): query is SearchFilters {
    return typeof query === 'object' && query !== null;
  }

  async scrape(filters: SearchFilters, signal?: AbortSignal): Promise<Result<SearchResult>> {
    try {
      const result = await this.retryOperation(() => this.performSearch(filters, signal));
      return createResult(result);
    } catch (error) {
      return createError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async performSearch(filters: SearchFilters, signal?: AbortSignal): Promise<SearchResult> {
    return await this.withPage(async page => {
      const searchUrl = this.buildSearchUrl(filters);

      await page.goto(searchUrl, { waitUntil: 'networkidle' });
      await this.waitForSearchResults(page);

      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      const listings = await this.extractListings(page);
      const pagination = await this.extractPaginationInfo(page, filters.page || 1);

      return {
        listings,
        ...pagination,
      };
    }, signal);
  }

  protected buildSearchUrl(filters: SearchFilters): string {
    const path = this.domainConfig.urlPatterns.searchPath(filters.location, filters.query);
    const url = new URL(path, this.domainConfig.baseUrl);

    // Handle category as URL parameter
    if (filters.category) {
      url.searchParams.set(this.domainConfig.urlPatterns.categoryParam, filters.category);
    }

    // Handle price filters
    if (filters.minPrice) {
      url.searchParams.set(
        this.domainConfig.urlPatterns.priceParams.min,
        filters.minPrice.toString()
      );
    }

    if (filters.maxPrice) {
      url.searchParams.set(
        this.domainConfig.urlPatterns.priceParams.max,
        filters.maxPrice.toString()
      );
    }

    // Handle sorting
    if (filters.sortBy && filters.sortBy !== 'relevance') {
      const sortValue = this.domainConfig.urlPatterns.sortParams[filters.sortBy];
      if (sortValue) {
        url.searchParams.set('search[order]', sortValue);
      }
    }

    // Handle pagination
    if (filters.page && filters.page > 1) {
      url.searchParams.set(this.domainConfig.urlPatterns.pageParam, filters.page.toString());
    }

    return url.toString();
  }

  private async waitForSearchResults(page: Page): Promise<void> {
    try {
      await Promise.race([
        page.waitForSelector(this.domainConfig.selectors.search.listingCard, { timeout: 10000 }),
        page.waitForSelector(this.domainConfig.selectors.search.noResults, { timeout: 10000 }),
      ]);
    } catch {
      // Continue even if selectors don't appear - might be an empty result
    }
  }

  private async extractListings(page: Page): Promise<Listing[]> {
    const listingElements = await page.$$(this.domainConfig.selectors.search.listingCard);
    const listings: Listing[] = [];

    for (const element of listingElements) {
      try {
        const title = await element
          .$eval(this.domainConfig.selectors.search.title, el => el.textContent?.trim() || '')
          .catch(() => '');

        const price = await element
          .$eval(this.domainConfig.selectors.search.price, el => el.textContent?.trim() || '')
          .catch(() => '');
        const finalPrice = price || undefined;

        const location = await element
          .$eval(this.domainConfig.selectors.search.location, el => el.textContent?.trim() || '')
          .catch(() => '');
        const finalLocation = location || undefined;

        const imageUrl = await element
          .$eval(
            this.domainConfig.selectors.search.image,
            el => el.getAttribute('src') || el.getAttribute('data-src') || ''
          )
          .catch(() => '');
        const finalImageUrl = imageUrl || undefined;

        const relativeUrl = await element
          .$eval(this.domainConfig.selectors.search.link, el => el.getAttribute('href') || '')
          .catch(() => '');

        if (!title || !relativeUrl) continue;

        const url = new URL(relativeUrl, this.domainConfig.baseUrl).toString();
        const id = this.extractListingId(relativeUrl);

        // Cache the URL for this listing ID
        this.urlCache.set(id, url);

        listings.push({
          id,
          title,
          price: finalPrice,
          location: finalLocation,
          imageUrl: finalImageUrl,
          url,
        });
      } catch {
        // Skip invalid listings
        continue;
      }
    }

    return listings;
  }

  private async extractPaginationInfo(page: Page, currentPage: number) {
    const totalCount = await page
      .$eval(this.domainConfig.selectors.search.totalCount, el => {
        const text = el.textContent || '';
        const match = text.match(/(\d+)/);
        return match && match[1] ? parseInt(match[1], 10) : 0;
      })
      .catch(() => 0);

    const hasNextPage = (await page.$(this.domainConfig.selectors.search.nextPage)) !== null;
    const itemsPerPage = 40; // OLX default across domains
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return {
      totalCount,
      currentPage,
      totalPages: Math.max(totalPages, 1),
      hasNextPage,
    };
  }

  protected abstract extractListingId(url: string): ListingId;

  async getListingDetails(listingId: ListingId, signal?: AbortSignal): Promise<Result<Listing>> {
    try {
      const result = await this.retryOperation(() =>
        this.performGetListingDetails(listingId, signal)
      );
      return createResult(result);
    } catch (error) {
      return createError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async performGetListingDetails(
    listingId: ListingId,
    signal?: AbortSignal
  ): Promise<Listing> {
    return await this.withPage(async page => {
      let finalUrl = '';

      // First check if we have the URL cached from a previous search
      const cachedUrl = this.urlCache.get(listingId);
      if (cachedUrl) {
        finalUrl = cachedUrl;
      } else {
        // If not cached, try to find the listing through search
        finalUrl = await this.findListingUrl(listingId, page);
      }

      if (!finalUrl) {
        throw new Error(
          `Listing with ID ${listingId} not found. Try searching first to cache the URL.`
        );
      }

      // Navigate to the listing page
      await page.goto(finalUrl, { waitUntil: 'networkidle' });

      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      // Extract listing details
      const title = await page
        .$eval(this.domainConfig.selectors.detail.title, el => el.textContent?.trim() || '')
        .catch(() => '');

      const priceText = await page
        .$eval(this.domainConfig.selectors.detail.price, el => el.textContent?.trim() || '')
        .catch(() => '');
      const price = priceText || undefined;

      const descriptionText = await page
        .$eval(this.domainConfig.selectors.detail.description, el => el.textContent?.trim() || '')
        .catch(() => '');
      const description = descriptionText || undefined;

      const locationText = await page
        .$eval(this.domainConfig.selectors.detail.location, el => el.textContent?.trim() || '')
        .catch(() => '');
      const location = locationText || undefined;

      const seller = await this.extractSellerInfo(page);

      return {
        id: listingId,
        title,
        price,
        location,
        description,
        url: finalUrl,
        seller,
      };
    }, signal);
  }

  protected abstract findListingUrl(listingId: ListingId, page: Page): Promise<string>;

  private async extractSellerInfo(page: Page) {
    const nameText = await page
      .$eval(this.domainConfig.selectors.detail.seller.name, el => el.textContent?.trim() || '')
      .catch(() => '');
    const name = nameText || undefined;

    const verified = (await page.$(this.domainConfig.selectors.detail.seller.verified)) !== null;

    return name || verified ? { name, verified } : undefined;
  }
}
