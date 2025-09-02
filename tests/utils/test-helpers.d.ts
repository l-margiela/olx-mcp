import type { Browser, Page, ElementHandle } from 'playwright';
import { type MockedFunction } from 'vitest';
import type {
  Listing,
  SearchResult,
  SearchFilters,
  Result,
  SellerInfo,
} from '../../src/core/types.js';
/**
 * Test utilities for creating mock data and assertions
 */
export declare const createMockListing: (overrides?: Partial<Listing>) => Listing;
export declare const createMockSearchResult: (overrides?: Partial<SearchResult>) => SearchResult;
export declare const createMockSearchFilters: (overrides?: Partial<SearchFilters>) => SearchFilters;
export declare const createMockSellerInfo: (overrides?: Partial<SellerInfo>) => SellerInfo;
export declare const createSuccessResult: <T>(data: T) => Result<T>;
export declare const createErrorResult: <T>(error: string | Error) => Result<T>;
export declare const assertIsSuccess: <T>(result: Result<T>) => asserts result is {
  success: true;
  data: T;
};
export declare const assertIsError: <T>(result: Result<T>) => asserts result is {
  success: false;
  error: Error;
};
export declare const sleep: (ms: number) => Promise<void>;
export declare const withTimeout: <T>(promise: Promise<T>, ms: number) => Promise<T>;
export interface MockPage {
  goto: MockedFunction<Page['goto']>;
  $: MockedFunction<Page['$']>;
  $$: MockedFunction<Page['$$']>;
  $eval: MockedFunction<Page['$eval']>;
  waitForSelector: MockedFunction<Page['waitForSelector']>;
  close: MockedFunction<Page['close']>;
  url: MockedFunction<() => string>;
  setDefaultTimeout: MockedFunction<Page['setDefaultTimeout']>;
}
export interface MockBrowser {
  newPage: MockedFunction<Browser['newPage']>;
  close: MockedFunction<Browser['close']>;
  pages: MockedFunction<Browser['pages']>;
}
export interface MockElementHandle {
  $eval: MockedFunction<ElementHandle['$eval']>;
  getAttribute: MockedFunction<ElementHandle['getAttribute']>;
  textContent: MockedFunction<ElementHandle['textContent']>;
  innerHTML: MockedFunction<ElementHandle['innerHTML']>;
}
export declare const createMockElementHandle: (
  overrides?: Partial<MockElementHandle>
) => MockElementHandle;
export declare const createMockPage: (overrides?: Partial<MockPage>) => MockPage;
export declare const createMockBrowser: (overrides?: Partial<MockBrowser>) => MockBrowser;
export declare const setupTestEnvironment: () => {
  enableConsole: () => void;
  disableConsole: () => void;
};
export declare const generateMockListings: (count: number) => Listing[];
//# sourceMappingURL=test-helpers.d.ts.map
