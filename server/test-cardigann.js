/**
 * Test script for Cardigann engine
 * Tests multiple indexers with the new Cardigann implementation
 */

const path = require('path');
const { CardigannEngine } = require('./cardigann');

// Initialize engine
const definitionsPath = path.join(__dirname, 'cardigann-indexer-yamls');
const cardigann = new CardigannEngine(definitionsPath);

async function testIndexer(indexerId, query = 'test') {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${indexerId} with query "${query}"`);
  console.log('='.repeat(80));

  try {
    const results = await cardigann.search(indexerId, query);
    
    // Handle array response from engine (since we pass a single ID)
    const result = Array.isArray(results) ? results[0] : results;

    if (result && result.success) {
      console.log(`✅ SUCCESS: Found ${result.results.length} results`);
      
      if (result.results.length > 0) {
        console.log('\n📋 First result:');
        const first = result.results[0];
        console.log(`   Title: ${first.title}`);
        console.log(`   Size: ${first.sizeFormatted}`);
        console.log(`   Seeders: ${first.seeders}`);
        console.log(`   Leechers: ${first.leechers}`);
        console.log(`   Download: ${first.downloadUrl?.substring(0, 100)}...`);
        console.log(`   Published: ${first.publishDate}`);
      }
      
      return result;
    } else {
      console.log(`❌ FAILED: ${result?.error || 'Unknown error'}`);
      return result || { success: false, results: [], error: 'Unknown error' };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n🚀 Starting Cardigann Engine Tests\n');

  // Get stats
  const stats = cardigann.loader.getStats();
  console.log('📊 Indexer Statistics:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Public: ${stats.public}`);
  console.log(`   Private: ${stats.private}`);
  console.log(`   Semi-Private: ${stats.semiPrivate}`);

  // Test specific indexers
  const indexersToTest = [
    { id: '1337x', query: 'ubuntu' },
    { id: 'thepiratebay', query: 'ubuntu' },
    { id: 'torrentgalaxy', query: 'ubuntu' },
    { id: 'eztv', query: 'house' },
    { id: 'yts', query: 'inception' },
  ];

  const results = [];

  for (const { id, query } of indexersToTest) {
    const result = await testIndexer(id, query);
    results.push({ id, success: result.success, count: result.results?.length || 0 });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalResults = results.reduce((sum, r) => sum + r.count, 0);

  console.log(`\nTested: ${results.length} indexers`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total results: ${totalResults}`);

  console.log('\nDetailed results:');
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.id}: ${result.count} results`);
  }

  console.log('\n✨ Tests complete!\n');
}

// Run tests
runTests().catch(console.error);

