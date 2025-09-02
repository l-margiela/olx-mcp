import type { Browser, Page } from 'playwright';
export declare const createPlaywrightMocks: () => {
  browser: Browser;
  page: Page;
};
export declare const mockChromiumLaunch: import('vitest').Mock<(...args: any[]) => any>;
export declare const setupOLXScrapingMocks: () => {
  mockListingElements: import('../utils/test-helpers.js').MockElementHandle[];
  mockPage: import('../utils/test-helpers.js').MockPage;
};
export declare const setupEmptySearchMocks: () => void;
export declare const setupNetworkErrorMocks: () => void;
export declare const setupSlowResponseMocks: (delay?: number) => void;
export declare const resetPlaywrightMocks: () => void;
export declare const mockPlaywright: () => void;
export declare const verifyPlaywrightCalls: () => {
  browserLaunchCalled: boolean;
  newPageCalled: boolean;
  gotoCalledWith: [
    url: string,
    options?:
      | {
          referer?: string;
          timeout?: number;
          waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
        }
      | undefined,
  ][];
  selectorsCalled: [selector: string][];
  evalsCalled: [
    selector: string,
    pageFunction: import('playwright-core/types/structs').PageFunctionOn<
      SVGElement | HTMLElement,
      void,
      unknown
    >,
    arg?: any,
  ][];
  browserClosed: boolean;
  pageClosed: boolean;
};
//# sourceMappingURL=playwright.mock.d.ts.map
