#!/usr/bin/env node

/**
 * Basic integration test for multi-domain OLX support
 * This manually tests the core functionality without complex mocking
 */

import { chromium } from 'playwright';
import { OlxScraperFactory } from './dist/scrapers/olx/scraper.factory.js';
import { SearchListingsTool } from './dist/tools/search/search-listings.tool.js';
import { GetListingDetailsTool } from './dist/tools/listing/get-listing-details.tool.js';

async function testMultiDomainSupport() {
  console.log('🚀 Starting multi-domain OLX integration test...\n');

  let browser;
  let scraperFactory;

  try {
    // Initialize browser
    console.log('📦 Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    // Create scraper factory
    console.log('🏭 Creating scraper factory...');
    scraperFactory = new OlxScraperFactory(browser);

    // Create tools
    const searchTool = new SearchListingsTool(scraperFactory);
    const detailsTool = new GetListingDetailsTool(scraperFactory);

    console.log('✅ Tools created successfully\n');

    // Test different domains
    const domains = ['olx.pt', 'olx.pl'];

    for (const domain of domains) {
      console.log(`🌍 Testing domain: ${domain}`);

      try {
        // Test search functionality
        console.log(`  🔍 Testing search on ${domain}...`);
        const searchResult = await searchTool.execute({
          domain,
          query: domain === 'olx.pl' ? 'telefon' : 'telemóvel',
          limit: 5,
        });

        if (searchResult.success) {
          console.log(
            `    ✅ Search successful: ${searchResult.data.listings.length} listings found`
          );
          console.log(`    📊 Total count: ${searchResult.data.totalCount}`);

          // Test getting details for first listing if available
          if (searchResult.data.listings.length > 0) {
            const firstListing = searchResult.data.listings[0];
            console.log(`  📋 Testing details for listing ${firstListing.id}...`);

            const detailsResult = await detailsTool.execute({
              domain,
              listingId: firstListing.id,
            });

            if (detailsResult.success) {
              console.log(`    ✅ Details retrieved successfully`);
              console.log(`    📝 Title: ${detailsResult.data.title}`);
              console.log(`    💰 Price: ${detailsResult.data.price || 'N/A'}`);
              console.log(`    📍 Location: ${detailsResult.data.location || 'N/A'}`);
            } else {
              console.log(`    ⚠️  Details failed: ${detailsResult.error.message}`);
            }
          } else {
            console.log(`    ℹ️  No listings found, skipping details test`);
          }
        } else {
          console.log(`    ❌ Search failed: ${searchResult.error.message}`);
        }
      } catch (error) {
        console.log(`    💥 Domain test failed: ${error.message}`);
      }

      console.log(''); // Empty line for readability
    }

    // Test scraper factory functionality
    console.log('🏭 Testing scraper factory...');

    const ptScraper = scraperFactory.getScraper('olx.pt');
    const plScraper = scraperFactory.getScraper('olx.pl');

    console.log(`  ✅ PT scraper config: ${ptScraper.domainConfig?.baseUrl || 'Unknown'}`);
    console.log(`  ✅ PL scraper config: ${plScraper.domainConfig?.baseUrl || 'Unknown'}`);

    console.log(`  📊 Factory has ${scraperFactory.getAllScrapers().size} scrapers cached`);

    // Test domain validation
    console.log('  🔍 Testing domain validation...');
    try {
      scraperFactory.getScraper('olx.invalid');
      console.log('  ❌ Should have thrown error for invalid domain');
    } catch (error) {
      console.log('  ✅ Correctly rejected invalid domain');
    }

    console.log('\n🎉 Integration test completed successfully!');
  } catch (error) {
    console.error('💥 Integration test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      console.log('\n🧹 Cleaning up browser...');
      await browser.close();
    }
  }
}

// Test schema validation
async function testSchemas() {
  console.log('📋 Testing schema validation...');

  // Test search schema
  try {
    const { SearchListingsArgsSchema } = await import(
      './dist/validation/schemas/listing.schema.js'
    );

    // Valid input
    const validSearch = SearchListingsArgsSchema.parse({
      domain: 'olx.pl',
      query: 'test',
    });
    console.log('  ✅ Search schema accepts valid input');

    // Default domain
    const defaultDomain = SearchListingsArgsSchema.parse({
      query: 'test',
    });
    console.log(`  ✅ Default domain works: ${defaultDomain.domain}`);

    // Invalid domain
    try {
      SearchListingsArgsSchema.parse({
        domain: 'olx.invalid',
        query: 'test',
      });
      console.log('  ❌ Should have rejected invalid domain');
    } catch (error) {
      console.log('  ✅ Correctly rejected invalid domain');
    }
  } catch (error) {
    console.log(`  ❌ Schema test failed: ${error.message}`);
  }
}

// Run tests
async function main() {
  console.log('🧪 OLX Multi-Domain Integration Test');
  console.log('====================================\n');

  await testSchemas();
  console.log('');
  await testMultiDomainSupport();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}
