/**
 * Generate a comprehensive report of failed indexers
 */

const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '../../scraper-progress.json');
const REPORT_FILE = path.join(__dirname, '../../FAILED_INDEXERS_REPORT.md');

async function generateReport() {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) {
      console.log('❌ Progress file not found');
      process.exit(1);
    }
    
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    
    // Deduplicate failed entries
    const failedMap = new Map();
    progress.failed.forEach(f => {
      if (!failedMap.has(f.id) || !failedMap.get(f.id).error) {
        failedMap.set(f.id, f);
      }
    });
    
    const failed = Array.from(failedMap.values());
    
    // Group by error type
    const byError = {};
    failed.forEach(f => {
      const errorType = f.error || 'Unknown error';
      if (!byError[errorType]) {
        byError[errorType] = [];
      }
      byError[errorType].push(f);
    });
    
    // Generate markdown report
    let markdown = `# Failed Indexers Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Failed:** ${failed.length}\n`;
    markdown += `- **Total Processed:** ${progress.processed.length}\n`;
    markdown += `- **Success Rate:** ${((progress.processed.length / (progress.processed.length + failed.length)) * 100).toFixed(1)}%\n\n`;
    
    markdown += `## Failed by Error Type\n\n`;
    
    Object.entries(byError)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([errorType, indexers]) => {
        markdown += `### ${errorType} (${indexers.length})\n\n`;
        markdown += `| Name | ID | Timestamp |\n`;
        markdown += `|------|----|-----------|\n`;
        indexers.forEach(idx => {
          markdown += `| ${idx.name} | ${idx.id} | ${idx.timestamp || 'N/A'} |\n`;
        });
        markdown += `\n`;
      });
    
    markdown += `## All Failed Indexers (Alphabetical)\n\n`;
    markdown += `| Name | Error |\n`;
    markdown += `|------|-------|\n`;
    
    failed
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(idx => {
        const error = (idx.error || 'Unknown error').substring(0, 100);
        markdown += `| ${idx.name} | ${error} |\n`;
      });
    
    // Save report
    fs.writeFileSync(REPORT_FILE, markdown);
    console.log(`✅ Report generated: ${REPORT_FILE}`);
    console.log(`📊 Total failed: ${failed.length}`);
    console.log(`📋 Error types: ${Object.keys(byError).length}`);
    
    // Also generate JSON for programmatic access
    const jsonReport = {
      generated: new Date().toISOString(),
      summary: {
        totalFailed: failed.length,
        totalProcessed: progress.processed.length,
        successRate: ((progress.processed.length / (progress.processed.length + failed.length)) * 100).toFixed(1) + '%',
      },
      byError: Object.entries(byError).map(([error, indexers]) => ({
        error,
        count: indexers.length,
        indexers: indexers.map(i => ({ name: i.name, id: i.id })),
      })),
      allFailed: failed.map(i => ({
        name: i.name,
        id: i.id,
        error: i.error || 'Unknown error',
        timestamp: i.timestamp,
      })),
    };
    
    const jsonFile = path.join(__dirname, '../../failed-indexers.json');
    fs.writeFileSync(jsonFile, JSON.stringify(jsonReport, null, 2));
    console.log(`✅ JSON report generated: ${jsonFile}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateReport();

