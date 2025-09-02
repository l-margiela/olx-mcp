import { vi } from 'vitest';
// Global test setup
global.console = {
    ...console,
    // Optionally silence console.log during tests
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: console.warn,
    error: console.error,
};
// Mock Playwright globally
vi.mock('playwright', () => ({
    chromium: {
        launch: vi.fn(),
    },
    Browser: vi.fn(),
    Page: vi.fn(),
    ElementHandle: vi.fn(),
}));
// Global timeout for all tests
vi.setConfig({ testTimeout: 30000 });
//# sourceMappingURL=setup.js.map