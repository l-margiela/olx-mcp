# Testing Infrastructure

This project uses a comprehensive testing infrastructure built with Vitest, featuring extensive mocking capabilities and structured test organization.

## Test Structure

### Core Tests
- **`src/core/types.test.ts`** - Tests for Result types, branded types, and utility functions
- **`src/core/tool-registry.test.ts`** - Tests for the MCP tool registry system

### Tool Tests
- **`src/tools/base/base-tool.test.ts`** - Tests for the abstract BaseTool class
- **`src/tools/search/search-listings.tool.test.ts`** - Tests for the search listings MCP tool
- **`src/tools/listing/get-listing-details.tool.test.ts`** - Tests for the listing details MCP tool

### Scraper Tests
- **`src/scrapers/olx/olx-pt.scraper.test.ts`** - Tests for the OLX Portugal scraper (with browser mocking)

### Server Tests
- **`src/core/server.test.ts`** - Tests for the MCP server integration

## Test Utilities

### Mock Factories (`tests/utils/test-helpers.ts`)
- `createMockListing()` - Creates mock listing data
- `createMockSearchResult()` - Creates mock search results
- `createMockSearchFilters()` - Creates mock search filter objects
- `createSuccessResult()` / `createErrorResult()` - Creates Result type instances
- `assertIsSuccess()` / `assertIsError()` - Type-safe assertion helpers

### Browser Mocking (`tests/mocks/playwright.mock.ts`)
- Complete Playwright browser automation mocking
- Mock page, browser, and element handle creation
- Configurable mock responses for different scenarios
- Network error and timeout simulation

### MCP Protocol Mocking (`tests/mocks/mcp.mock.ts`)
- MCP server and protocol mocking
- Mock request/response utilities
- Abort signal mocking for cancellation testing

## Running Tests

### Basic Commands
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run only working tests (excludes complex server/scraper tests)
npm run test:working

# Run unit tests only
npm run test:unit

# Run tool tests only
npm run test:tools
```

### Coverage Reports
Coverage reports are generated using V8 coverage provider and include:
- Statement coverage
- Branch coverage  
- Function coverage
- Line coverage

Coverage thresholds are set to 80% for all metrics.

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- Uses Node.js environment
- Includes test setup file
- Configures coverage reporting
- Sets timeouts and pool options
- Enables globals and mocking

### Test Setup (`tests/setup.ts`)
- Global console mocking
- Playwright mocking setup
- Test timeout configuration

## Writing Tests

### Best Practices

1. **Use type-safe assertions**:
   ```typescript
   import { assertIsSuccess, assertIsError } from '../tests/utils/test-helpers.js';
   
   const result = await tool.execute(args);
   assertIsSuccess(result);
   expect(result.data.listings).toHaveLength(2);
   ```

2. **Mock external dependencies**:
   ```typescript
   const mockScraper = {
     scrape: vi.fn().mockResolvedValue(createSuccessResult(mockData)),
   } as unknown as OLXPTScraper;
   ```

3. **Test error scenarios**:
   ```typescript
   it('should handle network errors', async () => {
     mockScraper.scrape.mockResolvedValue(createErrorResult('Network failed'));
     
     const result = await tool.execute(args);
     assertIsError(result);
     expect(result.error.message).toBe('Network failed');
   });
   ```

4. **Use descriptive test names**:
   ```typescript
   describe('Tool validation', () => {
     it('should reject negative prices in search filters', async () => {
       // Test implementation
     });
   });
   ```

### Mock Data Creation

Create realistic mock data using the provided factories:

```typescript
const mockListing = createMockListing({
  id: 'test-123' as ListingId,
  title: 'Test iPhone',
  price: '800€',
  seller: {
    name: 'John Doe',
    verified: true,
  },
});
```

### Async Testing

Use proper async/await patterns and handle timeouts:

```typescript
it('should handle slow operations', async () => {
  const slowPromise = new Promise(resolve => 
    setTimeout(() => resolve('result'), 100)
  );
  
  const result = await withTimeout(slowPromise, 1000);
  expect(result).toBe('result');
});
```

## Current Test Coverage

As of the latest run:
- **110 passing tests** across 5 test files
- **100% coverage** for tested core components:
  - Tool Registry
  - Type utilities  
  - Base Tool class
  - MCP tool implementations

## Known Issues

1. **Server integration tests** - Complex MCP SDK mocking requires refinement
2. **Scraper tests** - Some Playwright mocking edge cases need attention
3. **E2E tests** - Not yet implemented (would require actual browser automation)

## Future Improvements

1. Add integration tests with real browser instances (in CI environment)
2. Implement performance benchmarking tests
3. Add contract tests for MCP protocol compliance
4. Create visual regression tests for scraped content
5. Add property-based testing for edge cases