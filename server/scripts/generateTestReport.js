/**
 * Generate a comprehensive test report showing which scrapers actually return torrents
 */

const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '../../scraper-progress.json');
const REPORT_FILE = path.join(__dirname, '../../SCRAPER_TEST_REPORT.md');

async function generateTestReport() {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) {
      console.log('❌ Progress file not found');
      process.exit(1);
    }
    
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    
    // Get unique processed entries
    const uniqueProcessed = progress.processed.filter((p, index, self) => 
      index === self.findIndex(t => t.id === p.id)
    );
    
    // Categorize by test results
    const withResults = uniqueProcessed.filter(p => p.resultCount > 0);
    const connectionOnly = uniqueProcessed.filter(p => p.tested && p.resultCount === 0 && !p.testFailed);
    const testFailed = uniqueProcessed.filter(p => p.testFailed);
    const notTested = uniqueProcessed.filter(p => !p.tested);
    
    // Generate markdown report
    let markdown = `# Scraper Test Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Processed:** ${uniqueProcessed.length}\n`;
    markdown += `- **✅ Return Results:** ${withResults.length} (${((withResults.length / uniqueProcessed.length) * 100).toFixed(1)}%)\n`;
    markdown += `- **⚠️  Connection Works (No Results):** ${connectionOnly.length} (${((connectionOnly.length / uniqueProcessed.length) * 100).toFixed(1)}%)\n`;
    markdown += `- **❌ Test Failed:** ${testFailed.length} (${((testFailed.length / uniqueProcessed.length) * 100).toFixed(1)}%)\n`;
    markdown += `- **⏳ Not Tested:** ${notTested.length} (${((notTested.length / uniqueProcessed.length) * 100).toFixed(1)}%)\n\n`;
    
    markdown += `## ✅ Scrapers That Return Results (${withResults.length})\n\n`;
    markdown += `These scrapers were tested and successfully returned torrent results:\n\n`;
    markdown += `| Name | ID | Results Found |\n`;
    markdown += `|------|----|---------------|\n`;
    withResults
      .sort((a, b) => (b.resultCount || 0) - (a.resultCount || 0))
      .forEach(p => {
        markdown += `| ${p.name} | ${p.scraperId} | ${p.resultCount || 0} |\n`;
      });
    
    markdown += `\n## ⚠️  Connection Works But No Results (${connectionOnly.length})\n\n`;
    markdown += `These scrapers connect successfully but returned 0 results for test queries:\n\n`;
    markdown += `| Name | ID |\n`;
    markdown += `|------|----|\n`;
    connectionOnly.forEach(p => {
      markdown += `| ${p.name} | ${p.scraperId} |\n`;
    });
    
    markdown += `\n## ❌ Test Failed (${testFailed.length})\n\n`;
    markdown += `These scrapers failed during testing (may need FlareSolverr or have other issues):\n\n`;
    markdown += `| Name | ID | Issue |\n`;
    markdown += `|------|----|-------|\n`;
    testFailed.forEach(p => {
      const issue = p.warning || 'Test failed';
      markdown += `| ${p.name} | ${p.scraperId} | ${issue.substring(0, 80)} |\n`;
    });
    
    if (notTested.length > 0) {
      markdown += `\n## ⏳ Not Yet Tested (${notTested.length})\n\n`;
      markdown += `| Name | ID |\n`;
      markdown += `|------|----|\n`;
      notTested.forEach(p => {
        markdown += `| ${p.name} | ${p.scraperId} |\n`;
      });
    }
    
    // Save report
    fs.writeFileSync(REPORT_FILE, markdown);
    console.log(`✅ Test report generated: ${REPORT_FILE}`);
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Return Results: ${withResults.length}`);
    console.log(`   ⚠️  Connection Only: ${connectionOnly.length}`);
    console.log(`   ❌ Test Failed: ${testFailed.length}`);
    console.log(`   ⏳ Not Tested: ${notTested.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateTestReport();

