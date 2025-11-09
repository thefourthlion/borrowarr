/**
 * Test 1337x scraper with Cloudflare bypass
 * 
 * Usage:
 *   # Without FlareSolverr (will show Cloudflare error)
 *   node test-1337x.js
 * 
 *   # With FlareSolverr
 *   FLARESOLVERR_ENABLED=true FLARESOLVERR_URL=http://localhost:8191 node test-1337x.js
 */

const scraperManager = require('./index');

async function test1337x() {
  console.log('\n🧪 Testing 1337x Scraper\n');
  
  // Check FlareSolverr availability
  const cloudflareHandler = require('./engine/cloudflareHandler');
  const hasFlareSolverr = await cloudflareHandler.checkAvailability();
  
  if (hasFlareSolverr) {
    console.log('✅ FlareSolverr detected and ready!');
    process.env.FLARESOLVERR_ENABLED = 'true';
  } else {
    console.log('⚠️  FlareSolverr not detected');
    console.log('   Install with: docker run -d --name=flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest');
    console.log('   Then set: FLARESOLVERR_ENABLED=true FLARESOLVERR_URL=http://localhost:8191\n');
  }
  
  const query = process.argv[2] || 'ubuntu';
  console.log(`📝 Searching for: "${query}"\n`);
  
  try {
    // Test the scraper
    console.log('1️⃣ Testing connection...');
    const testResult = await scraperManager.testScraper('1337x');
    console.log('   Result:', testResult);
    
    if (!testResult.success) {
      console.log('\n❌ Test failed:', testResult.message);
      if (testResult.message.includes('Cloudflare')) {
        console.log('\n💡 Solution: Install FlareSolverr to bypass Cloudflare');
        console.log('   docker run -d --name=flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest');
      }
      return;
    }
    
    // Perform actual search
    console.log('\n2️⃣ Performing search...\n');
    const searchResult = await scraperManager.search('1337x', query);
    
    console.log(`\n📊 Search Results:`);
    console.log(`   Success: ${searchResult.success}`);
    console.log(`   Results: ${searchResult.results.length}`);
    
    if (searchResult.error) {
      console.error(`   Error: ${searchResult.error}`);
    }
    
    if (searchResult.results.length > 0) {
      console.log(`\n📦 First 5 results:\n`);
      searchResult.results.slice(0, 5).forEach((result, i) => {
        console.log(`${i + 1}. ${result.title}`);
        console.log(`   Size: ${result.sizeFormatted}`);
        console.log(`   Seeders: ${result.seeders}, Leechers: ${result.leechers}`);
        console.log(`   Age: ${result.ageFormatted}`);
        console.log(`   Download: ${result.downloadUrl.substring(0, 80)}...`);
        console.log('');
      });
      
      console.log(`✅ Successfully scraped ${searchResult.results.length} results from 1337x!`);
    } else {
      console.log('\n⚠️  No results found. This could mean:');
      console.log('   - Cloudflare is blocking (install FlareSolverr)');
      console.log('   - Selectors need adjustment');
      console.log('   - Site structure changed');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

test1337x();

