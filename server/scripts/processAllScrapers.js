/**
 * Master Script to Process ALL Indexers
 * 
 * This script will:
 * 1. Process all 520 indexers in batches
 * 2. Fetch Prowlarr definitions
 * 3. Convert and save scrapers
 * 4. Update progress and checklist
 * 5. Handle errors gracefully and continue
 * 
 * Usage: node scripts/processAllScrapers.js [--batch-size=20] [--resume]
 */

const { processIndexer, nameToId, fetchProwlarrDefinition } = require('./autoGenerateScrapers');
const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '../../scraper-progress.json');
const CHECKLIST_PATH = path.join(__dirname, '../../SCRAPER_CHECKLIST.md');
const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '20');
const RESUME = process.argv.includes('--resume');

/**
 * Load progress
 */
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { processed: [], failed: [], startTime: Date.now() };
}

/**
 * Save progress
 */
function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

/**
 * Update checklist markdown
 */
function updateChecklist(results) {
  if (!fs.existsSync(CHECKLIST_PATH)) {
    return; // Checklist doesn't exist yet
  }
  
  let content = fs.readFileSync(CHECKLIST_PATH, 'utf8');
  
  // Update each result in the checklist
  results.forEach(result => {
    if (result.success && !result.skipped) {
      // Mark as complete
      const nameEscaped = result.indexer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      content = content.replace(
        new RegExp(`\\| ⏳ \\| ${nameEscaped} \\|`, 'g'),
        `| ✅ | ${result.indexer} |`
      );
    }
  });
  
  fs.writeFileSync(CHECKLIST_PATH, content);
}

/**
 * Main processing loop
 */
async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    
    console.log('🚀 Processing ALL Indexers');
    console.log(`📊 Batch size: ${BATCH_SIZE}`);
    console.log(`🔄 Resume mode: ${RESUME}\n`);
    
    // Load progress
    const progress = loadProgress();
    const processedIds = new Set(progress.processed.map(p => p.id));
    
    console.log(`📈 Already processed: ${progress.processed.length}`);
    console.log(`❌ Previously failed: ${progress.failed.length}\n`);
    
    // Fetch all indexers
    const allIndexers = await AvailableIndexers.findAll({
      order: [['name', 'ASC']],
    });
    
    console.log(`📦 Total indexers: ${allIndexers.length}\n`);
    
    // Filter out already processed if resuming
    let toProcess = allIndexers;
    if (RESUME) {
      toProcess = allIndexers.filter(idx => !processedIds.has(idx.id));
      console.log(`🔄 Resuming: ${toProcess.length} remaining\n`);
    }
    
    // Process in batches
    let totalProcessed = progress.processed.length;
    let totalSuccessful = progress.processed.filter(p => p.success).length;
    let totalFailed = progress.failed.length;
    
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const batch = toProcess.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch.length} indexers)`);
      console.log(`${'='.repeat(60)}\n`);
      
      const batchResults = [];
      
      for (let j = 0; j < batch.length; j++) {
        const indexer = batch[j];
        const globalIndex = allIndexers.findIndex(idx => idx.id === indexer.id);
        
        try {
          const result = await processIndexer(indexer, globalIndex);
          result.id = indexer.id;
          batchResults.push(result);
          
          if (result.success && !result.skipped) {
            totalSuccessful++;
            progress.processed.push({
              id: indexer.id,
              name: indexer.name,
              success: true,
              scraperId: result.scraperId,
              timestamp: new Date().toISOString(),
            });
          } else if (result.skipped) {
            // Already exists, mark as processed
            progress.processed.push({
              id: indexer.id,
              name: indexer.name,
              success: true,
              skipped: true,
              timestamp: new Date().toISOString(),
            });
          } else {
            totalFailed++;
            progress.failed.push({
              id: indexer.id,
              name: indexer.name,
              error: result.error,
              timestamp: new Date().toISOString(),
            });
          }
          
          totalProcessed++;
          
          // Save progress after each indexer
          saveProgress(progress);
          
        } catch (error) {
          console.error(`   ❌ Fatal error processing ${indexer.name}:`, error.message);
          totalFailed++;
          progress.failed.push({
            id: indexer.id,
            name: indexer.name,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
          saveProgress(progress);
        }
        
        // Small delay to avoid rate limiting
        if (j < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Update checklist after each batch
      updateChecklist(batchResults);
      
      // Progress summary
      const elapsed = ((Date.now() - progress.startTime) / 1000 / 60).toFixed(1);
      const remaining = toProcess.length - (i + batch.length);
      const estimated = remaining > 0 
        ? ((Date.now() - progress.startTime) / (totalProcessed - progress.processed.length + batch.length) * remaining / 1000 / 60).toFixed(1)
        : 0;
      
      console.log(`\n📊 Progress: ${totalProcessed}/${allIndexers.length} (${((totalProcessed / allIndexers.length) * 100).toFixed(1)}%)`);
      console.log(`   ✅ Successful: ${totalSuccessful}`);
      console.log(`   ❌ Failed: ${totalFailed}`);
      console.log(`   ⏱️  Elapsed: ${elapsed} min`);
      if (estimated > 0) {
        console.log(`   ⏳ Estimated remaining: ${estimated} min`);
      }
    }
    
    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 ALL INDEXERS PROCESSED!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Successful: ${totalSuccessful}/${allIndexers.length}`);
    console.log(`❌ Failed: ${totalFailed}/${allIndexers.length}`);
    console.log(`📊 Success rate: ${((totalSuccessful / allIndexers.length) * 100).toFixed(1)}%`);
    console.log(`⏱️  Total time: ${((Date.now() - progress.startTime) / 1000 / 60).toFixed(1)} minutes`);
    console.log(`\n📝 Progress saved to: ${PROGRESS_FILE}`);
    console.log(`📋 Checklist updated: ${CHECKLIST_PATH}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

