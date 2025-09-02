import { vi } from 'vitest';
import { createMockBrowser, createMockPage, createMockElementHandle } from '../utils/test-helpers.js';
/**
 * Comprehensive Playwright mocks for testing browser automation
 */
// Global mock state
let mockBrowserInstance = null;
let mockPageInstance = null;
// Browser mock factory
export const createPlaywrightMocks = () => {
    mockBrowserInstance = createMockBrowser();
    mockPageInstance = createMockPage();
    // Set up page creation to return our mock
    mockBrowserInstance.newPage.mockResolvedValue(mockPageInstance);
    return {
        browser: mockBrowserInstance,
        page: mockPageInstance,
    };
};
// Chromium launch mock
export const mockChromiumLaunch = vi.fn().mockImplementation(() => {
    if (!mockBrowserInstance) {
        const mocks = createPlaywrightMocks();
        return Promise.resolve(mocks.browser);
    }
    return Promise.resolve(mockBrowserInstance);
});
// Mock selectors and responses for OLX scraping
export const setupOLXScrapingMocks = () => {
    if (!mockPageInstance) {
        throw new Error('Mock page not initialized. Call createPlaywrightMocks() first.');
    }
    // Mock search results page
    const mockListingElements = [
        createMockElementHandle({
            $eval: vi.fn().mockImplementation((selector) => {
                if (selector.includes('title')) {
                    return Promise.resolve('iPhone 13 Pro Max');
                }
                if (selector.includes('price')) {
                    return Promise.resolve('800€');
                }
                if (selector.includes('location')) {
                    return Promise.resolve('Lisboa');
                }
                if (selector.includes('link')) {
                    return Promise.resolve('/anuncios/iphone-13-pro-max-ID123.html');
                }
                return Promise.resolve('');
            }),
        }),
        createMockElementHandle({
            $eval: vi.fn().mockImplementation((selector) => {
                if (selector.includes('title')) {
                    return Promise.resolve('Samsung Galaxy S21');
                }
                if (selector.includes('price')) {
                    return Promise.resolve('600€');
                }
                if (selector.includes('location')) {
                    return Promise.resolve('Porto');
                }
                if (selector.includes('link')) {
                    return Promise.resolve('/anuncios/samsung-galaxy-s21-ID456.html');
                }
                return Promise.resolve('');
            }),
        }),
    ];
    // Mock page $$ method for listing cards
    mockPageInstance.$$.mockImplementation((selector) => {
        if (selector.includes('listing') || selector.includes('card')) {
            return Promise.resolve(mockListingElements);
        }
        return Promise.resolve([]);
    });
    // Mock page $eval for pagination and counts
    mockPageInstance.$eval.mockImplementation((selector) => {
        if (selector.includes('total') || selector.includes('count')) {
            return Promise.resolve(2); // Total count
        }
        if (selector.includes('title')) {
            return Promise.resolve('iPhone 13 Pro Max - Detailed');
        }
        if (selector.includes('price')) {
            return Promise.resolve('800€');
        }
        if (selector.includes('description')) {
            return Promise.resolve('Excellent condition iPhone 13 Pro Max');
        }
        if (selector.includes('location')) {
            return Promise.resolve('Lisboa, Região de Lisboa');
        }
        if (selector.includes('seller')) {
            return Promise.resolve('John Seller');
        }
        return Promise.resolve('');
    });
    // Mock page $ method for single element selection
    mockPageInstance.$.mockImplementation((selector) => {
        if (selector.includes('next') || selector.includes('pagination')) {
            return Promise.resolve(createMockElementHandle());
        }
        if (selector.includes('verified')) {
            return Promise.resolve(createMockElementHandle());
        }
        return Promise.resolve(null);
    });
    return {
        mockListingElements,
        mockPage: mockPageInstance,
    };
};
// Mock for empty search results
export const setupEmptySearchMocks = () => {
    if (!mockPageInstance) {
        throw new Error('Mock page not initialized. Call createPlaywrightMocks() first.');
    }
    mockPageInstance.$$.mockResolvedValue([]);
    mockPageInstance.$eval.mockResolvedValue(0);
    mockPageInstance.$.mockResolvedValue(null);
};
// Mock for network errors
export const setupNetworkErrorMocks = () => {
    if (!mockPageInstance) {
        throw new Error('Mock page not initialized. Call createPlaywrightMocks() first.');
    }
    mockPageInstance.goto.mockRejectedValue(new Error('Network error: Failed to navigate'));
    mockPageInstance.waitForSelector.mockRejectedValue(new Error('Selector timeout'));
};
// Mock for slow responses
export const setupSlowResponseMocks = (delay = 5000) => {
    if (!mockPageInstance) {
        throw new Error('Mock page not initialized. Call createPlaywrightMocks() first.');
    }
    mockPageInstance.goto.mockImplementation(() => new Promise(resolve => setTimeout(resolve, delay)));
};
// Reset all mocks to initial state
export const resetPlaywrightMocks = () => {
    vi.clearAllMocks();
    mockBrowserInstance = null;
    mockPageInstance = null;
};
// Mock the entire playwright module
export const mockPlaywright = () => {
    vi.mock('playwright', () => ({
        chromium: {
            launch: mockChromiumLaunch,
        },
        Browser: vi.fn(),
        Page: vi.fn(),
        ElementHandle: vi.fn(),
    }));
};
// Utility to verify mock calls
export const verifyPlaywrightCalls = () => {
    if (!mockBrowserInstance || !mockPageInstance) {
        throw new Error('Mocks not initialized');
    }
    return {
        browserLaunchCalled: mockChromiumLaunch.mock.calls.length > 0,
        newPageCalled: mockBrowserInstance.newPage.mock.calls.length > 0,
        gotoCalledWith: mockPageInstance.goto.mock.calls,
        selectorsCalled: mockPageInstance.$$.mock.calls,
        evalsCalled: mockPageInstance.$eval.mock.calls,
        browserClosed: mockBrowserInstance.close.mock.calls.length > 0,
        pageClosed: mockPageInstance.close.mock.calls.length > 0,
    };
};
//# sourceMappingURL=playwright.mock.js.map