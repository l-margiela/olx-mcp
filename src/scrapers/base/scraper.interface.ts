import { Browser, Page } from 'playwright';
import { Result, ScraperConfig } from '../../core/types.js';

export interface IScraper<TQuery, TResult> {
  scrape(query: TQuery, signal?: AbortSignal): Promise<Result<TResult>>;
  validateQuery(query: unknown): query is TQuery;
}

export interface IScraperFactory {
  createListingScraper(): IListingScraper;
  createDetailsScraper(): IDetailsScraper;
  createCategoryScraper(): ICategoryScraper;
}

export interface IListingScraper extends IScraper<any, any> {}
export interface IDetailsScraper extends IScraper<any, any> {}
export interface ICategoryScraper extends IScraper<any, any> {}

export abstract class PlaywrightScraper<TQuery, TResult> implements IScraper<TQuery, TResult> {
  constructor(
    protected readonly config: ScraperConfig,
    protected readonly browser: Browser
  ) {}

  abstract scrape(query: TQuery, signal?: AbortSignal): Promise<Result<TResult>>;
  abstract validateQuery(query: unknown): query is TQuery;

  protected async withPage<T>(fn: (page: Page) => Promise<T>, signal?: AbortSignal): Promise<T> {
    const newPageOptions: Parameters<typeof this.browser.newPage>[0] = {};
    if (this.config.userAgent) {
      newPageOptions.userAgent = this.config.userAgent;
    }
    const page = await this.browser.newPage(newPageOptions);

    try {
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      page.setDefaultTimeout(this.config.timeout);
      return await fn(page);
    } finally {
      await page.close();
    }
  }

  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.retries
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}
