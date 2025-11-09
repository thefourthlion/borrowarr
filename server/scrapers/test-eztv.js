/**
 * Test EZTV scraper
 * 
 * Usage:
 *   node test-eztv.js [query]
 */

const scraperManager = require('./index');

async function testEZTV() {
  const query = process.argv[2] || 'game of thrones';
  
  console.log('\n🧪 Testing EZTV Scraper\n');
  console.log(`📝 Searching for: "${query}"\n`);
  
  try {
    // Test the scraper
    console.log('1️⃣ Testing connection...');
    const testResult = await scraperManager.testScraper('eztv');
    console.log('   Result:', testResult);
    
    if (!testResult.success) {
      console.log('\n❌ Test failed:', testResult.message);
      return;
    }
    
    // Perform actual search
    console.log('\n2️⃣ Performing search...\n');
    const searchResult = await scraperManager.search('eztv', query);
    
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
      
      console.log(`✅ Successfully scraped ${searchResult.results.length} results from EZTV!`);
    } else {
      console.log('\n⚠️  No results found.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

testEZTV();

