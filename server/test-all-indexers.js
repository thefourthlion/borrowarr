/**
 * Comprehensive Indexer Testing Script
 * Tests all 520+ indexers and generates detailed success/failure reports
 */

const path = require('path');
const fs = require('fs');
const { CardigannEngine } = require('./cardigann');

// Initialize engine
const definitionsPath = path.join(__dirname, 'cardigann-indexer-yamls');
const cardigann = new CardigannEngine(definitionsPath);

// Test configuration
const DELAY_BETWEEN_TESTS = 2000; // 2 seconds between tests
const TIMEOUT_PER_TEST = 30000; // 30 seconds per indexer

// Smart query selection based on indexer type
const TEST_QUERIES = {
  // TV Shows - popular, widely available
  tv: ['house', 'game of thrones', 'breaking bad', 'the office', 'friends'],
  // Movies - popular across all sites
  movies: ['inception', 'the matrix', 'avatar', 'interstellar', 'pulp fiction'],
  // Anime - specific to anime sites
  anime: ['naruto', 'one piece', 'attack on titan', 'dragon ball', 'death note'],
  // Music - for music-focused sites
  music: ['beatles', 'pink floyd', 'led zeppelin', 'queen', 'nirvana'],
  // Games - for gaming sites
  games: ['minecraft', 'gta', 'call of duty', 'fifa', 'assassins creed'],
  // Software/Apps - universal
  software: ['ubuntu', 'windows', 'photoshop', 'office', 'chrome'],
  // Books - for ebook sites
  books: ['harry potter', 'lord of the rings', '1984', 'pride and prejudice'],
  // General - fallback for unknown types
  general: ['ubuntu', 'test', 'sample', 'demo']
};

/**
 * Determine indexer type and get appropriate test queries
 */
function getTestQueries(indexer) {
  const categories = indexer.caps?.categorymappings || [];
  const categoryCats = categories.map(c => String(c.cat || '').toLowerCase());
  
  // Check for specific content types
  const hasAnime = categoryCats.some(c => c.includes('anime'));
  const hasTV = categoryCats.some(c => c.includes('tv') || c.includes('series'));
  const hasMovies = categoryCats.some(c => c.includes('movie') || c.includes('film'));
  const hasMusic = categoryCats.some(c => c.includes('audio') || c.includes('music'));
  const hasGames = categoryCats.some(c => c.includes('game') || c.includes('console'));
  const hasBooks = categoryCats.some(c => c.includes('book') || c.includes('ebook'));
  const hasSoftware = categoryCats.some(c => c.includes('pc') || c.includes('software') || c.includes('app'));
  
  // Priority order: Anime > TV > Movies > Music > Games > Books > Software > General
  if (hasAnime) {
    return TEST_QUERIES.anime;
  }
  if (hasTV && !hasMovies) {
    // TV-only site
    return TEST_QUERIES.tv;
  }
  if (hasMovies && !hasTV) {
    // Movies-only site
    return TEST_QUERIES.movies;
  }
  if (hasTV && hasMovies) {
    // Mixed TV/Movies - try both
    return [...TEST_QUERIES.tv, ...TEST_QUERIES.movies];
  }
  if (hasMusic) {
    return TEST_QUERIES.music;
  }
  if (hasGames) {
    return TEST_QUERIES.games;
  }
  if (hasBooks) {
    return TEST_QUERIES.books;
  }
  if (hasSoftware) {
    return TEST_QUERIES.software;
  }
  
  // Fallback to general queries
  return TEST_QUERIES.general;
}

// Failure categories
const FAILURE_CATEGORIES = {
  CLOUDFLARE: 'cloudflare_protection',
  TIMEOUT: 'timeout',
  CONNECTION_ERROR: 'connection_error',
  PARSE_ERROR: 'parse_error',
  TEMPLATE_ERROR: 'template_error',
  NOT_FOUND: 'not_found',
  NO_RESULTS: 'no_results',
  UNKNOWN: 'unknown_error'
};

// Error pattern detection
function categorizeError(error, indexerName, response) {
  const errorMsg = error?.message || error || '';
  const errorStr = String(errorMsg).toLowerCase();
  
  // Cloudflare detection
  if (errorStr.includes('cloudflare') || 
      errorStr.includes('cf-ray') || 
      errorStr.includes('captcha') ||
      errorStr.includes('security check') ||
      errorStr.includes('ddos protection')) {
    return {
      category: FAILURE_CATEGORIES.CLOUDFLARE,
      reason: 'Cloudflare protection detected',
      details: errorMsg
    };
  }
  
  // Timeout detection
  if (errorStr.includes('timeout') || 
      errorStr.includes('etimedout') ||
      errorStr.includes('timed out')) {
    return {
      category: FAILURE_CATEGORIES.TIMEOUT,
      reason: 'Request timeout',
      details: errorMsg
    };
  }
  
  // Connection errors
  if (errorStr.includes('econnrefused') || 
      errorStr.includes('enotfound') ||
      errorStr.includes('getaddrinfo') ||
      errorStr.includes('connection') ||
      errorStr.includes('network')) {
    return {
      category: FAILURE_CATEGORIES.CONNECTION_ERROR,
      reason: 'Connection failed - site may be down',
      details: errorMsg
    };
  }
  
  // Template errors
  if (errorStr.includes('unmatched selector') || 
      errorStr.includes('template') ||
      errorStr.includes('{{ ') ||
      errorStr.includes('undefined')) {
    return {
      category: FAILURE_CATEGORIES.TEMPLATE_ERROR,
      reason: 'Template processing error',
      details: errorMsg
    };
  }
  
  // Parse errors
  if (errorStr.includes('parse') || 
      errorStr.includes('selector') ||
      errorStr.includes('extract')) {
    return {
      category: FAILURE_CATEGORIES.PARSE_ERROR,
      reason: 'Failed to parse response',
      details: errorMsg
    };
  }
  
  // 404 / Not found
  if (errorStr.includes('404') || 
      errorStr.includes('not found')) {
    return {
      category: FAILURE_CATEGORIES.NOT_FOUND,
      reason: '404 Not Found - URL may have changed',
      details: errorMsg
    };
  }
  
  // Unknown error
  return {
    category: FAILURE_CATEGORIES.UNKNOWN,
    reason: 'Unknown error',
    details: errorMsg
  };
}

// Test a single indexer with smart query selection
async function testIndexer(indexer, testNumber, totalTests) {
  const startTime = Date.now();
  
  try {
    console.log(`\n[${testNumber}/${totalTests}] Testing: ${indexer.name} (${indexer.id})`);
    console.log(`   Type: ${indexer.type} | Language: ${indexer.language || 'N/A'}`);
    
    // Get appropriate test queries for this indexer
    const testQueries = getTestQueries(indexer);
    const queriesToTry = testQueries.slice(0, 3); // Try up to 3 queries
    console.log(`   📝 Test queries: ${queriesToTry.join(', ')}`);
    
    let bestResult = null;
    let lastError = null;
    let queriesTried = 0;
    
    // Try queries until we get results or run out
    for (const query of queriesToTry) {
      queriesTried++;
      try {
        // Create a promise with timeout
        const testPromise = cardigann.search(indexer.id, query, { timeout: TIMEOUT_PER_TEST });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout after 30s')), TIMEOUT_PER_TEST)
        );
        
        const results = await Promise.race([testPromise, timeoutPromise]);
        const result = Array.isArray(results) ? results[0] : results;
        
        if (result && result.success) {
          const resultCount = result.results?.length || 0;
          
          if (resultCount > 0) {
            // Success! We got results
            bestResult = {
              ...result,
              queryUsed: query,
              queriesTried
            };
            break; // Stop trying more queries
          } else if (!bestResult) {
            // No results but no error - save as fallback
            bestResult = {
              ...result,
              queryUsed: query,
              queriesTried,
              resultCount: 0
            };
          }
        } else {
          // Error occurred
          lastError = result?.error || 'Unknown error';
          if (!bestResult) {
            bestResult = {
              success: false,
              error: lastError,
              queryUsed: query,
              queriesTried
            };
          }
        }
      } catch (error) {
        lastError = error.message;
        if (!bestResult) {
          bestResult = {
            success: false,
            error: lastError,
            queryUsed: query,
            queriesTried
          };
        }
        // Continue to next query
      }
      
      // Small delay between query attempts
      if (queriesTried < queriesToTry.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const result = bestResult;
    const duration = Date.now() - startTime;
    
    if (result && result.success) {
      const resultCount = result.results?.length || 0;
      
      if (resultCount === 0) {
        console.log(`   ⚠️  SUCCESS but no results (tried ${queriesTried} queries, ${duration}ms)`);
        return {
          status: 'warning',
          indexerId: indexer.id,
          indexerName: indexer.name,
          type: indexer.type,
          language: indexer.language,
          resultCount: 0,
          duration,
          queriesTried: queriesTried,
          queriesUsed: queriesToTry.slice(0, queriesTried),
          category: FAILURE_CATEGORIES.NO_RESULTS,
          reason: `No results returned after trying ${queriesTried} queries`,
          links: indexer.links
        };
      }
      
      console.log(`   ✅ SUCCESS: ${resultCount} results with "${result.queryUsed}" (${duration}ms)`);
      return {
        status: 'success',
        indexerId: indexer.id,
        indexerName: indexer.name,
        type: indexer.type,
        language: indexer.language,
        resultCount,
        duration,
        queryUsed: result.queryUsed,
        queriesTried: queriesTried,
        links: indexer.links,
        sampleResult: resultCount > 0 ? {
          title: result.results[0].title,
          seeders: result.results[0].seeders,
          size: result.results[0].sizeFormatted
        } : null
      };
    } else {
      const error = result?.error || lastError || 'Unknown error';
      const category = categorizeError(error, indexer.name, result);
      
      console.log(`   ❌ FAILED: ${category.reason} (tried ${queriesTried} queries)`);
      
      return {
        status: 'failed',
        indexerId: indexer.id,
        indexerName: indexer.name,
        type: indexer.type,
        language: indexer.language,
        duration: Date.now() - startTime,
        queriesTried: queriesTried,
        queriesUsed: queriesToTry.slice(0, queriesTried),
        ...category,
        links: indexer.links
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const category = categorizeError(error, indexer.name);
    
    console.log(`   ❌ ERROR: ${category.reason}`);
    
    return {
      status: 'failed',
      indexerId: indexer.id,
      indexerName: indexer.name,
      type: indexer.type,
      language: indexer.language,
      duration,
      queriesTried: queriesTried || 0,
      ...category,
      links: indexer.links
    };
  }
}

// Generate reports
function generateReports(results) {
  const timestamp = new Date().toISOString();
  
  // Calculate statistics
  const stats = {
    total: results.length,
    successful: results.filter(r => r.status === 'success').length,
    warnings: results.filter(r => r.status === 'warning').length,
    failed: results.filter(r => r.status === 'failed').length,
    successRate: 0,
    averageDuration: 0,
    totalDuration: 0
  };
  
  stats.successRate = ((stats.successful / stats.total) * 100).toFixed(2);
  stats.totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  stats.averageDuration = Math.round(stats.totalDuration / results.length);
  
  // Categorize failures
  const failuresByCategory = {};
  results.filter(r => r.status === 'failed' || r.status === 'warning').forEach(r => {
    const category = r.category || FAILURE_CATEGORIES.UNKNOWN;
    if (!failuresByCategory[category]) {
      failuresByCategory[category] = [];
    }
    failuresByCategory[category].push(r);
  });
  
  // Group by type
  const byType = {
    public: results.filter(r => r.type === 'public'),
    private: results.filter(r => r.type === 'private'),
    semiPrivate: results.filter(r => r.type === 'semi-private')
  };
  
  const typeStats = {
    public: {
      total: byType.public.length,
      successful: byType.public.filter(r => r.status === 'success').length,
      successRate: ((byType.public.filter(r => r.status === 'success').length / byType.public.length) * 100).toFixed(2)
    },
    private: {
      total: byType.private.length,
      successful: byType.private.filter(r => r.status === 'success').length,
      successRate: ((byType.private.filter(r => r.status === 'success').length / byType.private.length) * 100).toFixed(2)
    },
    semiPrivate: {
      total: byType.semiPrivate.length,
      successful: byType.semiPrivate.filter(r => r.status === 'success').length,
      successRate: ((byType.semiPrivate.filter(r => r.status === 'success').length / byType.semiPrivate.length) * 100).toFixed(2)
    }
  };
  
  // Generate JSON report
  const jsonReport = {
    timestamp,
    testStrategy: 'Dynamic queries based on indexer type',
    stats,
    typeStats,
    failuresByCategory: Object.entries(failuresByCategory).map(([category, items]) => ({
      category,
      count: items.length,
      percentage: ((items.length / stats.total) * 100).toFixed(2),
      indexers: items.map(i => ({
        id: i.indexerId,
        name: i.indexerName,
        type: i.type,
        reason: i.reason,
        details: i.details
      }))
    })),
    successfulIndexers: results.filter(r => r.status === 'success').map(r => ({
      id: r.indexerId,
      name: r.indexerName,
      type: r.type,
      resultCount: r.resultCount,
      duration: r.duration,
      queryUsed: r.queryUsed,
      queriesTried: r.queriesTried,
      sampleResult: r.sampleResult
    })),
    allResults: results
  };
  
  // Save JSON report (used by populateCardigannIndexers.js)
  const jsonPath = path.join(__dirname, 'indexer-test-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`\n📄 JSON report saved: ${jsonPath}`);
  console.log(`   This file will be used to mark verified indexers in the database`);
  
  // Generate Markdown report
  let markdown = `# Cardigann Indexer Test Report\n\n`;
  markdown += `**Generated:** ${timestamp}\n`;
  markdown += `**Test Strategy:** Dynamic queries based on indexer type (TV, Movies, Anime, etc.)\n\n`;
  
  markdown += `## Summary\n\n`;
  markdown += `| Metric | Value |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| Total Indexers | ${stats.total} |\n`;
  markdown += `| ✅ Successful | ${stats.successful} (${stats.successRate}%) |\n`;
  markdown += `| ⚠️ Warnings | ${stats.warnings} |\n`;
  markdown += `| ❌ Failed | ${stats.failed} |\n`;
  markdown += `| Average Duration | ${stats.averageDuration}ms |\n`;
  markdown += `| Total Test Time | ${Math.round(stats.totalDuration / 1000)}s |\n\n`;
  
  markdown += `## Results by Type\n\n`;
  markdown += `| Type | Total | Successful | Success Rate |\n`;
  markdown += `|------|-------|------------|-------------|\n`;
  markdown += `| Public | ${typeStats.public.total} | ${typeStats.public.successful} | ${typeStats.public.successRate}% |\n`;
  markdown += `| Private | ${typeStats.private.total} | ${typeStats.private.successful} | ${typeStats.private.successRate}% |\n`;
  markdown += `| Semi-Private | ${typeStats.semiPrivate.total} | ${typeStats.semiPrivate.successful} | ${typeStats.semiPrivate.successRate}% |\n\n`;
  
  markdown += `## Failure Analysis\n\n`;
  markdown += `| Category | Count | Percentage |\n`;
  markdown += `|----------|-------|------------|\n`;
  
  Object.entries(failuresByCategory).forEach(([category, items]) => {
    const percentage = ((items.length / stats.total) * 100).toFixed(2);
    markdown += `| ${category.replace(/_/g, ' ').toUpperCase()} | ${items.length} | ${percentage}% |\n`;
  });
  markdown += `\n`;
  
  // Detailed failure sections
  Object.entries(failuresByCategory).forEach(([category, items]) => {
    markdown += `### ${category.replace(/_/g, ' ').toUpperCase()} (${items.length})\n\n`;
    markdown += `| Indexer | Type | Reason |\n`;
    markdown += `|---------|------|--------|\n`;
    items.slice(0, 50).forEach(item => { // Limit to first 50
      markdown += `| ${item.indexerName} | ${item.type} | ${item.reason} |\n`;
    });
    if (items.length > 50) {
      markdown += `\n*...and ${items.length - 50} more*\n`;
    }
    markdown += `\n`;
  });
  
  // Successful indexers
  const successful = results.filter(r => r.status === 'success');
  if (successful.length > 0) {
    markdown += `## ✅ Successful Indexers (${successful.length})\n\n`;
    markdown += `| Indexer | Type | Results | Query Used | Duration |\n`;
    markdown += `|---------|------|---------|------------|----------|\n`;
    successful.slice(0, 100).forEach(item => { // Limit to first 100
      markdown += `| ${item.indexerName} | ${item.type} | ${item.resultCount} | "${item.queryUsed || 'N/A'}" | ${item.duration}ms |\n`;
    });
    if (successful.length > 100) {
      markdown += `\n*...and ${successful.length - 100} more*\n`;
    }
    markdown += `\n`;
  }
  
  // Top performers
  const topPerformers = results
    .filter(r => r.status === 'success' && r.resultCount > 0)
    .sort((a, b) => b.resultCount - a.resultCount)
    .slice(0, 20);
  
  if (topPerformers.length > 0) {
    markdown += `## 🏆 Top Performers\n\n`;
    markdown += `| Rank | Indexer | Type | Results | Query Used | Duration |\n`;
    markdown += `|------|---------|------|---------|------------|----------|\n`;
    topPerformers.forEach((item, index) => {
      markdown += `| ${index + 1} | ${item.indexerName} | ${item.type} | ${item.resultCount} | "${item.queryUsed || 'N/A'}" | ${item.duration}ms |\n`;
    });
    markdown += `\n`;
  }
  
  // Query effectiveness analysis
  const queryStats = {};
  results.filter(r => r.status === 'success' && r.resultCount > 0).forEach(r => {
    const query = r.queryUsed || 'unknown';
    if (!queryStats[query]) {
      queryStats[query] = { count: 0, totalResults: 0, indexers: [] };
    }
    queryStats[query].count++;
    queryStats[query].totalResults += r.resultCount;
    queryStats[query].indexers.push(r.indexerName);
  });
  
  if (Object.keys(queryStats).length > 0) {
    markdown += `## 📊 Query Effectiveness\n\n`;
    markdown += `| Query | Successful Indexers | Total Results |\n`;
    markdown += `|-------|---------------------|---------------|\n`;
    Object.entries(queryStats)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([query, stats]) => {
        markdown += `| "${query}" | ${stats.count} | ${stats.totalResults} |\n`;
      });
    markdown += `\n`;
  }
  
  // Save Markdown report
  const markdownPath = path.join(__dirname, 'INDEXER_TEST_REPORT.md');
  fs.writeFileSync(markdownPath, markdown);
  console.log(`📄 Markdown report saved: ${markdownPath}`);
  
  return { jsonReport, markdown, stats };
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Indexer Testing\n');
  console.log('═'.repeat(80));
  
  const allIndexers = cardigann.getAllIndexers();
  console.log(`\n📊 Total Indexers to Test: ${allIndexers.length}`);
  console.log(`⏱️  Estimated Time: ~${Math.round(allIndexers.length * (DELAY_BETWEEN_TESTS + 5000) / 1000 / 60)} minutes\n`);
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < allIndexers.length; i++) {
    const indexer = allIndexers[i];
    
    try {
      const result = await testIndexer(indexer, i + 1, allIndexers.length);
      results.push(result);
    } catch (error) {
      console.error(`   ⚠️  Unexpected error testing ${indexer.name}:`, error.message);
      results.push({
        status: 'failed',
        indexerId: indexer.id,
        indexerName: indexer.name,
        type: indexer.type,
        category: FAILURE_CATEGORIES.UNKNOWN,
        reason: 'Unexpected error',
        details: error.message
      });
    }
    
    // Progress update every 10 indexers
    if ((i + 1) % 10 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const successCount = results.filter(r => r.status === 'success').length;
      const successRate = ((successCount / results.length) * 100).toFixed(1);
      console.log(`\n📊 Progress: ${i + 1}/${allIndexers.length} | Success Rate: ${successRate}% | Elapsed: ${elapsed}s\n`);
    }
    
    // Delay between tests to avoid rate limiting
    if (i < allIndexers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TESTS));
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  
  console.log('\n' + '═'.repeat(80));
  console.log('✅ Testing Complete!');
  console.log(`⏱️  Total Time: ${totalTime}s (${Math.round(totalTime / 60)} minutes)`);
  console.log('═'.repeat(80));
  
  // Generate reports
  console.log('\n📊 Generating Reports...\n');
  const { stats } = generateReports(results);
  
  // Display summary
  console.log('\n' + '═'.repeat(80));
  console.log('📈 FINAL SUMMARY');
  console.log('═'.repeat(80));
  console.log(`\n✅ Successful: ${stats.successful}/${stats.total} (${stats.successRate}%)`);
  console.log(`⚠️  Warnings: ${stats.warnings}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`⏱️  Average Duration: ${stats.averageDuration}ms`);
  console.log('\n📄 Reports Generated:');
  console.log('   - indexer-test-report.json (detailed data)');
  console.log('   - INDEXER_TEST_REPORT.md (human-readable)');
  console.log('\n✨ Done!\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

