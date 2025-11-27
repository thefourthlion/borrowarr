/**
 * Test all scrapers by performing actual searches
 * This verifies that each scraper can actually return torrents
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const scraperManager = require('../scrapers');
const fs = require('fs');
const path = require('path');

const TEST_QUERIES = ['test', 'ubuntu', 'matrix', 'game'];
const RESULTS_FILE = path.join(__dirname, '../../scraper-test-results.json');

async function testAllScrapers() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    
    console.log('🧪 Testing All Scrapers with Real Searches\n');
    
    const scrapers = scraperManager.getAvailableIndexers();
    console.log(`📦 Found ${scrapers.length} scrapers to test\n`);
    
    const results = {
      tested: [],
      working: [],
      failed: [],
      noResults: [],
      startTime: Date.now(),
    };
    
    for (let i = 0; i < scrapers.length; i++) {
      const scraper = scrapers[i];
      console.log(`[${i + 1}/${scrapers.length}] Testing: ${scraper.name} (${scraper.id})`);
      
      let testPassed = false;
      let resultCount = 0;
      let error = null;
      
      // Try multiple test queries
      for (const query of TEST_QUERIES) {
        try {
          const searchResult = await scraperManager.search(scraper.id, query, { limit: 5 });
          
          if (searchResult.success) {
            resultCount = searchResult.results.length;
            if (resultCount > 0) {
              testPassed = true;
              console.log(`   ✅ Found ${resultCount} results for "${query}"`);
              break;
            } else {
              console.log(`   ⚠️  No results for "${query}", trying next...`);
            }
          } else {
            error = searchResult.error;
            console.log(`   ⚠️  Search failed: ${error}`);
          }
        } catch (err) {
          error = err.message;
          console.log(`   ❌ Error: ${error}`);
        }
        
        // Small delay between queries
        await new Promise(r => setTimeout(r, 500));
      }
      
      const testResult = {
        id: scraper.id,
        name: scraper.name,
        tested: true,
        success: testPassed,
        resultCount,
        error: error || (testPassed ? null : 'No results for any test query'),
        timestamp: new Date().toISOString(),
      };
      
      results.tested.push(testResult);
      
      if (testPassed) {
        results.working.push(testResult);
        console.log(`   ✅ PASSED\n`);
      } else if (resultCount === 0 && !error) {
        results.noResults.push(testResult);
        console.log(`   ⚠️  NO RESULTS (connection works but no torrents found)\n`);
      } else {
        results.failed.push(testResult);
        console.log(`   ❌ FAILED\n`);
      }
      
      // Save progress after each test
      fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
      
      // Delay between scrapers
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Final summary
    const elapsed = ((Date.now() - results.startTime) / 1000 / 60).toFixed(1);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Testing Complete!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Working: ${results.working.length}/${scrapers.length}`);
    console.log(`⚠️  No Results: ${results.noResults.length}/${scrapers.length}`);
    console.log(`❌ Failed: ${results.failed.length}/${scrapers.length}`);
    console.log(`⏱️  Time: ${elapsed} minutes`);
    console.log(`\n📝 Results saved to: ${RESULTS_FILE}`);
    
    // Generate report
    generateReport(results);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

function generateReport(results) {
  let report = `# Scraper Test Results\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Tested:** ${results.tested.length}\n`;
  report += `- **✅ Working:** ${results.working.length} (${((results.working.length / results.tested.length) * 100).toFixed(1)}%)\n`;
  report += `- **⚠️  No Results:** ${results.noResults.length} (connection works but no torrents)\n`;
  report += `- **❌ Failed:** ${results.failed.length}\n\n`;
  
  report += `## ✅ Working Scrapers (${results.working.length})\n\n`;
  report += `| Name | ID | Results |\n`;
  report += `|------|----|---------|\n`;
  results.working.forEach(s => {
    report += `| ${s.name} | ${s.id} | ${s.resultCount} |\n`;
  });
  
  report += `\n## ⚠️  No Results (${results.noResults.length})\n\n`;
  report += `| Name | ID | Error |\n`;
  report += `|------|----|-------|\n`;
  results.noResults.forEach(s => {
    report += `| ${s.name} | ${s.id} | ${s.error || 'No results'} |\n`;
  });
  
  report += `\n## ❌ Failed Scrapers (${results.failed.length})\n\n`;
  report += `| Name | ID | Error |\n`;
  report += `|------|----|-------|\n`;
  results.failed.forEach(s => {
    report += `| ${s.name} | ${s.id} | ${s.error || 'Unknown error'} |\n`;
  });
  
  const reportFile = path.join(__dirname, '../../SCRAPER_TEST_REPORT.md');
  fs.writeFileSync(reportFile, report);
  console.log(`📋 Report generated: ${reportFile}`);
}

testAllScrapers();

