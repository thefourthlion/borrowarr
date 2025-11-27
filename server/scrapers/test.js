/**
 * Test script for scrapers
 * Usage: node test.js [scraper-id] [query]
 */

const scraperManager = require('./index');

async function test() {
  const scraperId = process.argv[2] || 'limetorrents';
  const query = process.argv[3] || 'ubuntu';
  
  console.log(`\n🧪 Testing scraper: ${scraperId}`);
  console.log(`📝 Query: ${query}\n`);
  
  try {
    // Test the scraper
    const testResult = await scraperManager.testScraper(scraperId);
    console.log('\n📊 Test Result:', testResult);
    
    if (!testResult.success) {
      console.error('\n❌ Test failed! Fix issues before searching.');
      return;
    }
    
    // Perform actual search
    console.log('\n🔍 Performing search...\n');
    const searchResult = await scraperManager.search(scraperId, query);
    
    console.log('\n📊 Search Results:');
    console.log(`   Success: ${searchResult.success}`);
    console.log(`   Results: ${searchResult.results.length}`);
    
    if (searchResult.error) {
      console.error(`   Error: ${searchResult.error}`);
    }
    
    if (searchResult.results.length > 0) {
      console.log('\n📦 First 3 results:\n');
      searchResult.results.slice(0, 3).forEach((result, i) => {
        console.log(`${i + 1}. ${result.title}`);
        console.log(`   Size: ${result.sizeFormatted}`);
        console.log(`   Seeders: ${result.seeders}, Leechers: ${result.leechers}`);
        console.log(`   Age: ${result.ageFormatted}`);
        console.log(`   Download: ${result.downloadUrl.substring(0, 80)}...`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run test
test();

