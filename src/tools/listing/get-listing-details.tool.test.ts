import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GetListingDetailsTool } from './get-listing-details.tool.js';
import { OlxScraperFactory } from '../../scrapers/olx/scraper.factory.js';
import { BaseOlxScraper } from '../../scrapers/olx/base-olx.scraper.js';
import {
  createMockListing,
  createSuccessResult,
  createErrorResult,
  assertIsSuccess,
  assertIsError,
} from '../../../tests/utils/test-helpers.js';
import { createMockAbortSignal } from '../../../tests/mocks/mcp.mock.js';
import type { ListingId } from '../../core/types.js';

describe('GetListingDetailsTool', () => {
  let detailsTool: GetListingDetailsTool;
  let mockScraper: BaseOlxScraper;
  let mockScraperFactory: OlxScraperFactory;

  beforeEach(() => {
    mockScraper = {
      getListingDetails: vi.fn(),
    } as unknown as BaseOlxScraper;

    mockScraperFactory = {
      getScraper: vi.fn().mockReturnValue(mockScraper),
    } as unknown as OlxScraperFactory;

    detailsTool = new GetListingDetailsTool(mockScraperFactory);
  });

  describe('Tool properties', () => {
    it('should have correct name and description', () => {
      expect(detailsTool.name).toBe('getListingDetails');
      expect(detailsTool.description).toContain(
        'Get detailed information about a specific OLX listing'
      );
      expect(detailsTool.inputSchema).toBeDefined();
    });
  });

  describe('Successful detail retrieval', () => {
    it('should get listing details with minimal arguments', async () => {
      const mockListing = createMockListing({
        id: 'ABC123' as ListingId,
        title: 'iPhone 13 Pro Max',
        description: 'Excellent condition iPhone',
        price: '800€',
      });

      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'ABC123',
      });

      assertIsSuccess(result);
      expect(result.data.id).toBe('ABC123');
      expect(result.data.title).toBe('iPhone 13 Pro Max');
      expect(result.data.description).toBe('Excellent condition iPhone');
      expect(result.data.price).toBe('800€');

      // Verify scraper was called with correct ID
      expect(mockScraper.getListingDetails).toHaveBeenCalledWith('ABC123', undefined);
    });

    it('should handle all input arguments', async () => {
      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      const result = await detailsTool.execute({
        domain: 'olx.pl',
        listingId: 'XYZ789',
        includeImages: true,
        includeSellerInfo: false,
      });

      assertIsSuccess(result);
      expect(mockScraperFactory.getScraper).toHaveBeenCalledWith('olx.pl');
      expect(mockScraper.getListingDetails).toHaveBeenCalledWith('XYZ789', undefined);
    });

    it('should use default values for optional parameters', async () => {
      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'DEF456',
        // includeImages defaults to false
        // includeSellerInfo defaults to true
      });

      assertIsSuccess(result);
      // Note: The current implementation doesn't use these flags,
      // but the schema validation should still work
    });

    it('should return complete listing information', async () => {
      const completeListing = createMockListing({
        id: 'COMPLETE123' as ListingId,
        title: 'Complete Listing',
        description: 'Full description with all details',
        price: '1500€',
        location: 'Lisboa, Portugal',
        category: 'Electronics',
        imageUrl: 'https://example.com/image.jpg',
        url: 'https://olx.pt/listing/COMPLETE123',
        publishedAt: new Date('2023-01-15'),
        seller: {
          name: 'Trusted Seller',
          verified: true,
          memberSince: new Date('2022-01-01'),
          phone: '+351 123 456 789',
        },
      });

      (mockScraper.getListingDetails as any).mockResolvedValue(
        createSuccessResult(completeListing)
      );

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'COMPLETE123',
      });

      assertIsSuccess(result);
      expect(result.data).toEqual(completeListing);
      expect(result.data.seller?.name).toBe('Trusted Seller');
      expect(result.data.seller?.verified).toBe(true);
      expect(result.data.seller?.phone).toBe('+351 123 456 789');
    });
  });

  describe('Abort signal handling', () => {
    it('should pass abort signal to scraper', async () => {
      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      const abortSignal = createMockAbortSignal(false);

      await detailsTool.execute({ domain: 'olx.pt', listingId: 'TEST123' }, abortSignal);

      expect(mockScraper.getListingDetails).toHaveBeenCalledWith('TEST123', abortSignal);
    });

    it('should handle pre-aborted signal', async () => {
      const abortSignal = createMockAbortSignal(true);

      const result = await detailsTool.execute(
        { domain: 'olx.pt', listingId: 'TEST123' },
        abortSignal
      );

      assertIsError(result);
      expect(result.error.message).toBe('Operation cancelled');
    });
  });

  describe('Error handling', () => {
    it('should handle scraper errors', async () => {
      const errorMessage = 'Listing not found';
      (mockScraper.getListingDetails as any).mockResolvedValue(createErrorResult(errorMessage));

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'NOTFOUND123',
      });

      assertIsError(result);
      expect(result.error.message).toBe(errorMessage);
    });

    it('should handle network errors', async () => {
      const errorMessage = 'Network connection timeout';
      (mockScraper.getListingDetails as any).mockResolvedValue(createErrorResult(errorMessage));

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'NETWORK123',
      });

      assertIsError(result);
      expect(result.error.message).toBe(errorMessage);
    });

    it('should handle scraper exceptions', async () => {
      const error = new Error('Unexpected scraper error');
      (mockScraper.getListingDetails as any).mockRejectedValue(error);

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'ERROR123',
      });

      assertIsError(result);
      expect(result.error.message).toBe('Unexpected scraper error');
    });

    it('should handle listing parsing errors', async () => {
      const error = new Error('Failed to parse listing content');
      (mockScraper.getListingDetails as any).mockResolvedValue(createErrorResult(error));

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'PARSE123',
      });

      assertIsError(result);
      expect(result.error.message).toBe('Failed to parse listing content');
    });
  });

  describe('Input validation', () => {
    it('should reject empty listing ID', async () => {
      const result = await detailsTool.execute({
        listingId: '',
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
      expect(result.error.message).toContain('listingId');
    });

    it('should reject missing listing ID', async () => {
      // @ts-expect-error Testing invalid input
      const result = await detailsTool.execute({ domain: 'olx.pt' });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
    });

    it('should reject non-string listing ID', async () => {
      // @ts-expect-error Testing invalid input
      const result = await detailsTool.execute({
        listingId: 123,
      });

      assertIsError(result);
      expect(result.error.message).toContain('Validation error');
      expect(result.error.message).toContain('Expected string');
    });

    it('should validate boolean flags correctly', async () => {
      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      // Valid boolean values
      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'VALID123',
        includeImages: true,
        includeSellerInfo: false,
      });

      assertIsSuccess(result);

      // Invalid boolean value
      // @ts-expect-error Testing invalid input
      const result2 = await detailsTool.execute({
        listingId: 'TEST123',
        includeImages: 'yes',
      });

      assertIsError(result2);
      expect(result2.error.message).toContain('Validation error');
    });
  });

  describe('ListingId type conversion', () => {
    it('should convert string to ListingId type', async () => {
      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'TYPE123',
      });

      const [listingIdParam] = (mockScraper.getListingDetails as any).mock.calls[0];

      // The ID should be passed as-is to the scraper
      expect(listingIdParam).toBe('TYPE123');
      expect(typeof listingIdParam).toBe('string');
    });

    it('should handle special characters in listing IDs', async () => {
      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      const specialIds = ['ABC-123', 'XYZ_456', '123ABC', 'test.listing', 'ID123456789'];

      for (const listingId of specialIds) {
        (mockScraper.getListingDetails as any).mockClear();

        const result = await detailsTool.execute({ domain: 'olx.pt', listingId });

        assertIsSuccess(result);
        expect(mockScraper.getListingDetails).toHaveBeenCalledWith(listingId, undefined);
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should handle concurrent detail requests', async () => {
      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      const requests = Array.from({ length: 5 }, (_, i) =>
        detailsTool.execute({ domain: 'olx.pt', listingId: `CONCURRENT${i}` })
      );

      const results = await Promise.all(requests);

      results.forEach((result, _i) => {
        assertIsSuccess(result);
        expect(result.data.id).toBe(mockListing.id);
      });

      expect(mockScraper.getListingDetails).toHaveBeenCalledTimes(5);
    });

    it('should handle mixed success and error responses', async () => {
      const mockListing = createMockListing();
      let callCount = 0;

      (mockScraper.getListingDetails as any).mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.resolve(createErrorResult('Not found'));
        }
        return Promise.resolve(createSuccessResult(mockListing));
      });

      const requests = Array.from({ length: 4 }, (_, i) =>
        detailsTool.execute({ domain: 'olx.pt', listingId: `MIXED${i}` })
      );

      const results = await Promise.all(requests);

      expect(results[0]!.success).toBe(true); // 1st call succeeds
      expect(results[1]!.success).toBe(false); // 2nd call fails
      expect(results[2]!.success).toBe(true); // 3rd call succeeds
      expect(results[3]!.success).toBe(false); // 4th call fails
    });

    it('should handle listings with minimal data', async () => {
      const minimalListing = createMockListing({
        id: 'MINIMAL123' as ListingId,
        title: 'Basic Title',
        url: 'https://olx.pt/listing/MINIMAL123',
        // All other fields undefined/optional
        price: undefined,
        description: undefined,
        location: undefined,
        seller: undefined,
      });

      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(minimalListing));

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'MINIMAL123',
      });

      assertIsSuccess(result);
      expect(result.data.id).toBe('MINIMAL123');
      expect(result.data.title).toBe('Basic Title');
      expect(result.data.url).toBe('https://olx.pt/listing/MINIMAL123');
      expect(result.data.price).toBeUndefined();
      expect(result.data.description).toBeUndefined();
      expect(result.data.seller).toBeUndefined();
    });

    it('should handle large listing descriptions', async () => {
      const largeListing = createMockListing({
        description: 'A'.repeat(10000), // Very long description
        title: 'Listing with large description',
      });

      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(largeListing));

      const result = await detailsTool.execute({
        domain: 'olx.pt',
        listingId: 'LARGE123',
      });

      assertIsSuccess(result);
      expect(result.data.description).toHaveLength(largeListing.description!.length);
    });
  });

  describe('Performance considerations', () => {
    it('should handle rapid successive requests', async () => {
      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      const requests = Array.from({ length: 10 }, (_, i) =>
        detailsTool.execute({ domain: 'olx.pt', listingId: `RAPID${i}` })
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        assertIsSuccess(result);
      });

      expect(mockScraper.getListingDetails).toHaveBeenCalledTimes(10);
    });

    it('should not interfere with other tool instances', async () => {
      // Create another instance of the tool
      const anotherTool = new GetListingDetailsTool(mockScraperFactory);

      const mockListing = createMockListing();
      (mockScraper.getListingDetails as any).mockResolvedValue(createSuccessResult(mockListing));

      // Execute from both instances
      const result1 = await detailsTool.execute({ domain: 'olx.pt', listingId: 'FIRST123' });
      const result2 = await anotherTool.execute({ domain: 'olx.pt', listingId: 'SECOND123' });

      assertIsSuccess(result1);
      assertIsSuccess(result2);

      expect(mockScraper.getListingDetails).toHaveBeenCalledTimes(2);
      expect(mockScraper.getListingDetails).toHaveBeenCalledWith('FIRST123', undefined);
      expect(mockScraper.getListingDetails).toHaveBeenCalledWith('SECOND123', undefined);
    });
  });
});
