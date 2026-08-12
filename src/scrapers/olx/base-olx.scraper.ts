import { Browser, Page } from 'playwright';
import { NonRetryableError, PlaywrightScraper } from '../base/scraper.interface.js';
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
  private static readonly URL_CACHE_LIMIT = 2000;

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

      const currentPage = filters.page || 1;
      const { listings, cardCount } = await this.extractListings(page, filters.limit);
      const pagination = await this.extractPaginationInfo(page, currentPage, cardCount);

      // The card selector going stale yields no cards at all, so extractListings
      // cannot see it. A result count read through an unrelated selector can:
      // "OLX says there are matches but we parsed none" is never a real state.
      // Only meaningful on the first page — paging past the end legitimately
      // returns nothing.
      if (
        listings.length === 0 &&
        cardCount === 0 &&
        pagination.totalCount > 0 &&
        currentPage === 1
      ) {
        throw new NonRetryableError(
          `${this.domainConfig.domain} reports ${pagination.totalCount} results but no listing ` +
            `cards matched "${this.domainConfig.selectors.search.listingCard}" — the card selector is likely stale.`
        );
      }

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
    // Racing this against an empty-state selector left the losing wait pending
    // and rejecting unobserved. Cards never appearing is not an error here —
    // extractListings is what distinguishes an empty page from a broken one.
    await page
      .waitForSelector(this.domainConfig.selectors.search.listingCard, { timeout: 10000 })
      .catch(() => {});
  }

  private async extractListings(
    page: Page,
    limit?: number
  ): Promise<{ listings: Listing[]; cardCount: number }> {
    const { listingCard, title, price, location, image, link } = this.domainConfig.selectors.search;

    // One round-trip for the whole page. Reading each field per card over
    // separate $eval calls cost ~5 calls x ~50 cards of browser IPC per search.
    const cards = await page.$$eval(
      listingCard,
      (elements, selectors) =>
        elements.map(card => {
          const readText = (selector: string) =>
            card.querySelector(selector)?.textContent?.trim() || '';

          const priceElement = card.querySelector(selectors.price);
          const readPrice = () => {
            if (!priceElement) return '';
            // The amount is the element's own text; its children are injected
            // <style> tags and <span> labels for the negotiable flag ("do
            // negocjacji", "Negociavel", ...) that textContent would append to
            // the amount. Reading direct text nodes keeps this
            // language-independent.
            const ownText = Array.from(priceElement.childNodes)
              .filter(node => node.nodeType === 3)
              .map(node => node.textContent || '')
              .join('')
              .trim();
            if (ownText) return ownText;

            // No direct text node means the markup changed shape; fall back to
            // everything except the injected stylesheets.
            return Array.from(priceElement.childNodes)
              .filter(node => {
                const tag = node.nodeName.toLowerCase();
                return tag !== 'style' && tag !== 'script';
              })
              .map(node => node.textContent || '')
              .join('')
              .trim();
          };

          const imageElement = card.querySelector(selectors.image);

          return {
            title: readText(selectors.title),
            price: readPrice(),
            location: readText(selectors.location),
            imageUrl:
              imageElement?.getAttribute('src') || imageElement?.getAttribute('data-src') || '',
            relativeUrl: card.querySelector(selectors.link)?.getAttribute('href') || '',
          };
        }),
      { title, price, location, image, link }
    );

    const listings: Listing[] = [];
    for (const card of cards) {
      // A listing without these two is not addressable, so it cannot be returned.
      if (!card.title || !card.relativeUrl) continue;

      let url: string;
      try {
        url = new URL(card.relativeUrl, this.domainConfig.baseUrl).toString();
      } catch {
        // One unparseable href (ad slots inject odd ones) must not sink the
        // whole page of results.
        continue;
      }

      const id = this.extractListingId(card.relativeUrl);
      this.rememberUrl(id, url);

      listings.push({
        id,
        title: card.title,
        price: card.price || undefined,
        location: card.location || undefined,
        imageUrl: card.imageUrl || undefined,
        url,
      });

      if (limit !== undefined && listings.length >= limit) break;
    }

    // Cards on the page but none parsed means the per-field selectors no longer
    // match. Returning [] would be indistinguishable from a search that
    // genuinely found nothing, which is how stale selectors ship unnoticed.
    if (cards.length > 0 && listings.length === 0) {
      throw new NonRetryableError(
        `Found ${cards.length} listing cards on ${this.domainConfig.domain} but extracted none — ` +
          `the "${title}" or "${link}" selector is likely stale.`
      );
    }

    return { listings, cardCount: cards.length };
  }

  /** Bounded so a long-lived server cannot accumulate every URL it has seen. */
  private rememberUrl(id: ListingId, url: string): void {
    if (this.urlCache.size >= BaseOlxScraper.URL_CACHE_LIMIT) {
      const oldest = this.urlCache.keys().next();
      if (!oldest.done) this.urlCache.delete(oldest.value);
    }
    this.urlCache.set(id, url);
  }

  private async extractPaginationInfo(page: Page, currentPage: number, cardCount: number) {
    const totalCount = await page
      .$eval(this.domainConfig.selectors.search.totalCount, el => {
        const text = el.textContent || '';
        // Domains group thousands differently ("1000", "1.000", "1 000" with a
        // regular, non-breaking or narrow no-break space), so consume the
        // separators as part of the number and strip them before parsing.
        const match = text.match(/\d[\d\u0020\u00A0\u202F.,]*\d|\d/);
        return match ? parseInt(match[0].replace(/\D/g, ''), 10) : 0;
      })
      .catch(() => 0);

    const hasNextPage = (await page.$(this.domainConfig.selectors.search.nextPage)) !== null;
    // Derived from the page actually fetched rather than a hardcoded 40, which
    // no longer matched what OLX serves. `limit` caps how many of a page's
    // listings are returned and deliberately does not enter this arithmetic:
    // totalPages counts OLX's pages, which is what `page` indexes.
    const itemsPerPage = cardCount || 40;
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    return {
      totalCount,
      currentPage,
      totalPages: Math.max(totalPages, 1),
      hasNextPage,
    };
  }

  /** Every domain encodes the id the same way: .../slug-ID<id>.html */
  protected extractListingId(url: string): ListingId {
    const match = url.match(/ID([A-Za-z0-9]+)\.html/);
    if (match?.[1]) return match[1] as ListingId;

    // No id in the href (promoted and redirect cards). Derive one from the URL
    // so it stays stable across calls and unique per listing — a clock reading
    // would be identical for every such card extracted in the same tick, and
    // they would then overwrite each other in the URL cache.
    const digest = Array.from(url).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) | 0, 7);
    return `u${(digest >>> 0).toString(36)}` as ListingId;
  }

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

      const detail = this.domainConfig.selectors.detail;
      const [title, price, description, location, seller] = await Promise.all([
        readText(page, detail.title),
        readOptionalText(page, detail.price),
        readOptionalText(page, detail.description),
        readOptionalText(page, detail.location),
        this.extractSellerInfo(page),
      ]);

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

  /**
   * Fallback for an id that was never seen by a search: look it up through the
   * domain's own listing search. The id is encoded rather than slugified, since
   * it is case-sensitive.
   */
  protected async findListingUrl(listingId: ListingId, page: Page): Promise<string> {
    const listingPath = this.domainConfig.urlPatterns.searchPath();
    // The id reaches us from the client, so it is encoded for the path and
    // matched as a literal in the selector rather than spliced into either.
    const safeId = encodeURIComponent(listingId);

    try {
      await page.goto(`${this.domainConfig.baseUrl}${listingPath}q-${safeId}/`, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      const href = await page
        .$$eval(
          `${this.domainConfig.selectors.search.listingCard} a[href]`,
          (anchors, needle) =>
            anchors.map(a => a.getAttribute('href') || '').find(h => h.includes(needle)) || '',
          `ID${listingId}`
        )
        .catch(() => '');

      if (href) {
        return new URL(href, this.domainConfig.baseUrl).toString();
      }
    } catch {
      // Fall through: an unreachable search page just means no URL was found.
    }

    return '';
  }

  private async extractSellerInfo(page: Page) {
    const seller = this.domainConfig.selectors.detail.seller;
    const [name, verified] = await Promise.all([
      readOptionalText(page, seller.name),
      page.$(seller.verified).then(element => element !== null),
    ]);

    // Reads like the classic precedence trap but is not one: `||` binds tighter,
    // so this is (name || verified) ? ... — a seller is reported if either is known.
    return name || verified ? { name, verified } : undefined;
  }
}

/** Text of the first match, or '' when the selector matches nothing. */
const readText = (page: Page, selector: string): Promise<string> =>
  page.$eval(selector, el => el.textContent?.trim() || '').catch(() => '');

/** As readText, but absent fields collapse to undefined rather than ''. */
const readOptionalText = async (page: Page, selector: string): Promise<string | undefined> =>
  (await readText(page, selector)) || undefined;
