import { vi } from 'vitest';
/**
 * Test utilities for creating mock data and assertions
 */
// Mock data factories
export const createMockListing = (overrides = {}) => ({
    id: 'listing-123',
    title: 'Test Listing',
    price: '100€',
    location: 'Lisboa',
    category: 'Electronics',
    imageUrl: 'https://example.com/image.jpg',
    url: 'https://olx.pt/listing/123',
    publishedAt: new Date('2023-01-01'),
    description: 'Test description',
    seller: {
        name: 'Test Seller',
        verified: true,
        memberSince: new Date('2022-01-01'),
    },
    ...overrides,
});
export const createMockSearchResult = (overrides = {}) => ({
    listings: [createMockListing(), createMockListing({ id: 'listing-456' })],
    totalCount: 2,
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    ...overrides,
});
export const createMockSearchFilters = (overrides = {}) => ({
    query: 'test query',
    category: 'electronics',
    location: 'lisboa',
    minPrice: 50,
    maxPrice: 500,
    page: 1,
    limit: 20,
    sortBy: 'relevance',
    ...overrides,
});
export const createMockSellerInfo = (overrides = {}) => ({
    name: 'Test Seller',
    phone: '+351 123 456 789',
    verified: true,
    memberSince: new Date('2022-01-01'),
    ...overrides,
});
// Result helpers
export const createSuccessResult = (data) => ({
    success: true,
    data,
});
export const createErrorResult = (error) => ({
    success: false,
    error: error instanceof Error ? error : new Error(error),
});
// Assertion helpers
export const assertIsSuccess = (result) => {
    if (!result.success) {
        throw new Error(`Expected success result, got error: ${result.error.message}`);
    }
};
export const assertIsError = (result) => {
    if (result.success) {
        throw new Error('Expected error result, got success');
    }
};
// Time helpers
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)),
]);
export const createMockElementHandle = (overrides = {}) => ({
    $eval: vi.fn(),
    getAttribute: vi.fn(),
    textContent: vi.fn(),
    innerHTML: vi.fn(),
    ...overrides,
});
export const createMockPage = (overrides = {}) => ({
    goto: vi.fn().mockResolvedValue(undefined),
    $: vi.fn(),
    $$: vi.fn().mockResolvedValue([]),
    $eval: vi.fn(),
    waitForSelector: vi.fn().mockResolvedValue(createMockElementHandle()),
    close: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://olx.pt'),
    setDefaultTimeout: vi.fn(),
    ...overrides,
});
export const createMockBrowser = (overrides = {}) => ({
    newPage: vi.fn().mockResolvedValue(createMockPage()),
    close: vi.fn().mockResolvedValue(undefined),
    pages: vi.fn().mockReturnValue([]),
    ...overrides,
});
// Test environment helpers
export const setupTestEnvironment = () => {
    // Suppress console output during tests unless explicitly needed
    const originalConsole = global.console;
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    return {
        enableConsole: () => {
            global.console = originalConsole;
        },
        disableConsole: () => {
            global.console = {
                ...console,
                log: vi.fn(),
                debug: vi.fn(),
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
            };
        },
    };
};
// Mock data generators with realistic variations
export const generateMockListings = (count) => {
    const titles = [
        'iPhone 13 Pro Max',
        'Samsung Galaxy S21',
        'Laptop ASUS',
        'Mesa de Jantar',
        'Sofá de Sala',
        'Bicicleta BTT',
        'Carro Opel Corsa',
        'Apartamento T2',
    ];
    const locations = ['Lisboa', 'Porto', 'Coimbra', 'Braga', 'Faro', 'Aveiro'];
    const categories = ['Electronics', 'Home & Garden', 'Vehicles', 'Real Estate'];
    return Array.from({ length: count }, (_, index) => ({
        id: `listing-${index + 1}`,
        title: titles[index % titles.length],
        price: `${Math.floor(Math.random() * 1000) + 50}€`,
        location: locations[index % locations.length],
        category: categories[index % categories.length],
        imageUrl: `https://example.com/image-${index + 1}.jpg`,
        url: `https://olx.pt/listing/${index + 1}`,
        publishedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        description: `Description for ${titles[index % titles.length]}`,
        seller: {
            name: `Seller ${index + 1}`,
            verified: Math.random() > 0.5,
            memberSince: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000),
        },
    }));
};
//# sourceMappingURL=test-helpers.js.map