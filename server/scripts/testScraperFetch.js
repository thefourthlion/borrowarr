/**
 * Test script to verify scraper fetching works
 */

const { fetchProwlarrDefinition, processIndexer } = require('./autoGenerateScrapers');
const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');

async function test() {
  await sequelize.authenticate();
  await sequelize.sync();
  
  console.log('🧪 Testing Scraper Fetching\n');
  
  // Test with known working indexers
  const testIndexers = [
    '1337x',
    'EZTV',
    'LimeTorrents',
    'YTS',
    'TorrentGalaxyClone',
    '0Magnet',
    '13City',
  ];
  
  for (const name of testIndexers) {
    console.log(`\n📝 Testing: ${name}`);
    const indexer = await AvailableIndexers.findOne({ where: { name } });
    
    if (!indexer) {
      console.log(`   ⚠️  Not found in database`);
      continue;
    }
    
    try {
      const result = await fetchProwlarrDefinition(name);
      if (result) {
        console.log(`   ✅ Found definition: ${result.id}.yml`);
        console.log(`   📄 YAML length: ${result.yaml.length} chars`);
      } else {
        console.log(`   ❌ No definition found`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Test full processing
  console.log(`\n\n🧪 Testing Full Processing\n`);
  const testIndexer = await AvailableIndexers.findOne({ where: { name: '1337x' } });
  if (testIndexer) {
    console.log(`Processing: ${testIndexer.name}`);
    const result = await processIndexer(testIndexer, 0);
    console.log('Result:', result);
  }
  
  process.exit(0);
}

test();

