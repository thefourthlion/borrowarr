/**
 * Populate Available Indexers from Cardigann Definitions
 * Adds all 520 Cardigann indexers to the AvailableIndexers table
 */

const path = require('path');
const { CardigannEngine } = require('../cardigann');
const AvailableIndexers = require('../models/AvailableIndexers');
const { connectDB } = require('../config/database');

async function populateCardigannIndexers() {
  console.log('🚀 Populating Cardigann Indexers...\n');

  try {
    // Connect to database
    await connectDB();

    // Initialize Cardigann engine
    const definitionsPath = path.join(__dirname, '../cardigann-indexer-yamls');
    const cardigann = new CardigannEngine(definitionsPath);

    // Get all indexers
    const indexers = cardigann.getAllIndexers();
    console.log(`📊 Found ${indexers.length} Cardigann indexers\n`);

    // Load test report to mark verified indexers
    let verifiedIndexers = new Set();
    try {
      const fs = require('fs');
      const reportPath = path.join(__dirname, '../indexer-test-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        verifiedIndexers = new Set(
          report.successfulIndexers.map(i => i.id.toLowerCase())
        );
        console.log(`✅ Loaded ${verifiedIndexers.size} verified indexers from test report\n`);
      }
    } catch (e) {
      console.log('⚠️  No test report found, all indexers will be unverified\n');
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const indexer of indexers) {
      try {
        const isVerified = verifiedIndexers.has(indexer.id.toLowerCase());

        // Prepare indexer data
        const indexerData = {
          name: indexer.name,
          description: indexer.description || '',
          language: indexer.language || 'en-US',
          links: JSON.stringify(indexer.links || []),
          protocol: 'torrent', // Cardigann is torrent-based
          privacy: indexer.type || 'public',
          categories: JSON.stringify(
            indexer.caps?.categorymappings?.map(c => ({
              id: c.id,
              name: c.desc,
              cat: c.cat
            })) || []
          ),
          availableBaseUrls: JSON.stringify(indexer.links || []),
          indexerType: 'Cardigann',
          verified: isVerified,
          verifiedAt: isVerified ? new Date() : null,
          cardigannId: indexer.id, // Store the Cardigann ID for lookups
        };

        // Check if indexer already exists
        const existing = await AvailableIndexers.findOne({
          where: { name: indexer.name }
        });

        if (existing) {
          // Update existing indexer
          await existing.update(indexerData);
          updated++;
          if (updated % 50 === 0) {
            console.log(`   Updated ${updated} indexers...`);
          }
        } else {
          // Create new indexer
          await AvailableIndexers.create(indexerData);
          added++;
          if (added % 50 === 0) {
            console.log(`   Added ${added} indexers...`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${indexer.name}:`, error.message);
        skipped++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Cardigann Indexers Population Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Added: ${added}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`⚠️  Skipped: ${skipped}`);
    console.log(`✅ Verified: ${verifiedIndexers.size}`);
    console.log(`📦 Total: ${added + updated}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the population
populateCardigannIndexers();

