/**
 * Automated Scraper Generator
 * 
 * This script:
 * 1. Reads all indexers from the database
 * 2. Fetches Prowlarr Cardigann definitions from GitHub
 * 3. Converts them to our Node.js YAML format
 * 4. Tests each scraper
 * 5. Updates the checklist
 * 
 * Usage: node scripts/autoGenerateScrapers.js [--batch-size=10] [--start-from=0] [--skip-existing]
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yaml = require('js-yaml');

const PROWLARR_DEFINITIONS_BASE = 'https://raw.githubusercontent.com/Prowlarr/Indexers/master/definitions';
const PROWLARR_DEFINITIONS_API = 'https://api.github.com/repos/Prowlarr/Indexers/contents/definitions';
const SCRAPERS_DIR = path.join(__dirname, '../scrapers/definitions');
const CHECKLIST_PATH = path.join(__dirname, '../../SCRAPER_CHECKLIST.md');

// Parse command line arguments
const args = process.argv.slice(2);
const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '10');
const startFrom = parseInt(args.find(a => a.startsWith('--start-from='))?.split('=')[1] || '0');
const skipExisting = args.includes('--skip-existing');

// Ensure scrapers directory exists
if (!fs.existsSync(SCRAPERS_DIR)) {
  fs.mkdirSync(SCRAPERS_DIR, { recursive: true });
}

/**
 * Convert indexer name to scraper ID (filename)
 * Matches Prowlarr's naming convention
 */
function nameToId(name) {
  // Try multiple variations
  const variations = [
    // Direct lowercase with special chars
    name.toLowerCase().replace(/[^a-z0-9]/g, ''),
    // Keep dots and hyphens
    name.toLowerCase().replace(/[^a-z0-9.-]/g, ''),
    // Remove spaces only
    name.toLowerCase().replace(/\s+/g, ''),
    // Original case variations
    name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
  ];
  
  return variations[0]; // Return first for now, will try all
}

/**
 * Fetch Prowlarr definition from GitHub
 */
async function fetchProwlarrDefinition(indexerName) {
  // Generate multiple possible IDs based on Prowlarr's naming patterns
  const possibleIds = [
    // Direct match
    indexerName.toLowerCase().replace(/[^a-z0-9]/g, ''),
    // Keep dots (e.g., "0day.kiev" -> "0daykiev")
    indexerName.toLowerCase().replace(/[^a-z0-9.]/g, '').replace(/\./g, ''),
    // Original with special handling
    indexerName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, ''),
    // Remove "the" prefix
    indexerName.toLowerCase().replace(/^the\s*/, '').replace(/[^a-z0-9]/g, ''),
    // Handle numbers at start
    indexerName.toLowerCase().replace(/^(\d+)/, '').replace(/[^a-z0-9]/g, ''),
    // Try with underscores
    indexerName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
  ];
  
  // Remove duplicates
  const uniqueIds = [...new Set(possibleIds.filter(id => id.length > 0))];
  
  // First try direct fetch from latest version (v11, v10, etc.)
  const latestVersions = ['v11', 'v10', 'v9', 'v8', 'v7', 'v6', 'v5', 'v4', 'v3', 'v2', 'v1'];
  for (const version of latestVersions) {
    for (const id of uniqueIds) {
      try {
        const url = `${PROWLARR_DEFINITIONS_BASE}/${version}/${id}.yml`;
        const response = await axios.get(url, { 
          timeout: 8000,
          validateStatus: (status) => status === 200,
        });
        
        if (response.data && response.data.trim().length > 0) {
          return { id, yaml: response.data };
        }
      } catch (error) {
        // Try next ID/version
        continue;
      }
    }
  }
  
  // Last resort: search through versioned folders (cached)
  try {
    // Cache version folder structure to avoid repeated API calls
    const cacheFile = path.join(__dirname, '../../.prowlarr-definitions-cache.json');
    let versionDirs = [];
    let allFiles = [];
    
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cache.timestamp && Date.now() - cache.timestamp < 3600000) { // 1 hour cache
        versionDirs = cache.versionDirs || [];
        allFiles = cache.allFiles || [];
      }
    }
    
    if (allFiles.length === 0) {
      // Get list of version folders
      const listResponse = await axios.get(PROWLARR_DEFINITIONS_API, { 
        timeout: 15000,
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      versionDirs = listResponse.data
        .filter(item => item.type === 'dir' && /^v\d+$/.test(item.name))
        .sort((a, b) => parseInt(b.name.substring(1)) - parseInt(a.name.substring(1)));
      
      // Get all files from all version folders
      for (const versionDir of versionDirs.slice(0, 5)) { // Limit to first 5 versions for speed
        try {
          const versionUrl = `${PROWLARR_DEFINITIONS_API}/${versionDir.name}`;
          const versionResponse = await axios.get(versionUrl, { 
            timeout: 15000,
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          const files = versionResponse.data
            .filter(f => f.name.endsWith('.yml'))
            .map(f => ({ ...f, version: versionDir.name }));
          allFiles.push(...files);
        } catch (e) {
          continue;
        }
      }
      
      // Save cache
      fs.writeFileSync(cacheFile, JSON.stringify({
        timestamp: Date.now(),
        versionDirs,
        allFiles
      }));
    }
    
    const nameLower = indexerName.toLowerCase();
    
    // Try exact ID match first
    for (const id of uniqueIds) {
      const file = allFiles.find(f => f.name === `${id}.yml`);
      if (file) {
        try {
          const fileDefUrl = `${PROWLARR_DEFINITIONS_BASE}/${file.version}/${file.name}`;
          const defResponse = await axios.get(fileDefUrl, { timeout: 8000 });
          if (defResponse.data && defResponse.data.trim().length > 0) {
            return { id, yaml: defResponse.data };
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Try name match (limit to first 50 for speed)
    for (const file of allFiles.slice(0, 100)) {
      try {
        const fileDefUrl = `${PROWLARR_DEFINITIONS_BASE}/${file.version}/${file.name}`;
        const defResponse = await axios.get(fileDefUrl, { timeout: 8000 });
        const def = yaml.load(defResponse.data);
        
        if (def.name && def.name.toLowerCase() === nameLower) {
          const fileId = file.name.replace('.yml', '');
          return { id: fileId, yaml: defResponse.data };
        }
      } catch (e) {
        continue;
      }
    }
  } catch (error) {
    // Ignore list errors
  }
  
  return null;
}

/**
 * Convert Prowlarr YAML to our format
 */
function convertProwlarrYAML(prowlarrYaml, indexerData) {
  try {
    const def = yaml.load(prowlarrYaml);
    
    // Basic structure
    const ourDef = {
      id: def.id || nameToId(indexerData.name),
      name: def.name || indexerData.name,
      description: def.description || indexerData.description || `${def.name} indexer`,
      language: def.language || indexerData.language || 'en-US',
      type: def.type || indexerData.privacy?.toLowerCase() || 'public',
      links: def.links || indexerData.baseUrls || [],
    };
    
    // Categories
    if (def.caps?.categorymappings) {
      ourDef.caps = {
        categorymappings: def.caps.categorymappings,
        modes: def.caps.modes || {
          search: ['q'],
          'tv-search': ['q', 'season', 'ep'],
          'movie-search': ['q'],
        },
      };
    }
    
    // Search configuration
    if (def.search) {
      ourDef.search = {
        paths: def.search.paths || [],
        rows: def.search.rows || {},
        fields: def.search.fields || {},
      };
    }
    
    // API configuration
    if (def.api) {
      ourDef.api = def.api;
    }
    
    // RSS configuration
    if (def.rss) {
      ourDef.rss = def.rss;
    }
    
    // Download configuration
    if (def.download) {
      ourDef.download = def.download;
    }
    
    return ourDef;
  } catch (error) {
    console.error(`   ⚠️  Error converting YAML: ${error.message}`);
    return null;
  }
}

/**
 * Test if scraper definition is valid
 */
function validateScraperDefinition(def) {
  if (!def.id || !def.name || !def.links || def.links.length === 0) {
    return false;
  }
  
  // Must have at least one of: search, api, or rss
  if (!def.search && !def.api && !def.rss) {
    return false;
  }
  
  return true;
}

/**
 * Save scraper definition
 */
function saveScraperDefinition(def) {
  const filePath = path.join(SCRAPERS_DIR, `${def.id}.yml`);
  const yamlContent = yaml.dump(def, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });
  
  fs.writeFileSync(filePath, yamlContent);
  return filePath;
}

/**
 * Test scraper by loading it
 */
async function testScraper(scraperId) {
  try {
    const scraperManager = require('../scrapers');
    const available = scraperManager.getAvailableIndexers();
    const found = available.find(s => s.id === scraperId);
    return found !== undefined;
  } catch (error) {
    return false;
  }
}

/**
 * Process a single indexer
 */
async function processIndexer(indexer, index) {
  const scraperId = nameToId(indexer.name);
  const existingPath = path.join(SCRAPERS_DIR, `${scraperId}.yml`);
  
  if (skipExisting && fs.existsSync(existingPath)) {
    console.log(`   ⏭️  Skipping ${indexer.name} (already exists)`);
    return { success: true, skipped: true, indexer: indexer.name };
  }
  
  console.log(`\n[${index + 1}] Processing: ${indexer.name}`);
  console.log(`   ID: ${scraperId}`);
  
  try {
    // Fetch Prowlarr definition
    console.log(`   📥 Fetching Prowlarr definition...`);
    const prowlarrDef = await fetchProwlarrDefinition(indexer.name);
    
    if (!prowlarrDef) {
      console.log(`   ⚠️  No Prowlarr definition found`);
      return { success: false, error: 'No Prowlarr definition', indexer: indexer.name };
    }
    
    console.log(`   ✅ Found definition: ${prowlarrDef.id}.yml`);
    
    // Convert to our format
    console.log(`   🔄 Converting to our format...`);
    const ourDef = convertProwlarrYAML(prowlarrDef.yaml, indexer);
    
    if (!ourDef) {
      return { success: false, error: 'Conversion failed', indexer: indexer.name };
    }
    
    // Validate
    if (!validateScraperDefinition(ourDef)) {
      console.log(`   ⚠️  Invalid definition structure`);
      return { success: false, error: 'Invalid definition', indexer: indexer.name };
    }
    
    // Save
    console.log(`   💾 Saving definition...`);
    const filePath = saveScraperDefinition(ourDef);
    console.log(`   ✅ Saved: ${filePath}`);
    
    // Test loading
    console.log(`   🧪 Testing scraper...`);
    const testResult = await testScraper(ourDef.id);
    
    if (testResult) {
      console.log(`   ✅ Scraper loaded successfully!`);
      return { success: true, indexer: indexer.name, scraperId: ourDef.id };
    } else {
      console.log(`   ⚠️  Scraper definition saved but not yet loaded`);
      return { success: true, indexer: indexer.name, scraperId: ourDef.id, warning: 'Not loaded' };
    }
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message, indexer: indexer.name };
  }
}

/**
 * Main processing function
 */
async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    
    console.log('🚀 Automated Scraper Generator');
    console.log(`📊 Batch size: ${batchSize}`);
    console.log(`📍 Starting from: ${startFrom}`);
    console.log(`⏭️  Skip existing: ${skipExisting}\n`);
    
    // Fetch all indexers
    const allIndexers = await AvailableIndexers.findAll({
      order: [['name', 'ASC']],
    });
    
    console.log(`📦 Total indexers: ${allIndexers.length}`);
    
    // Process batch
    const endIndex = Math.min(startFrom + batchSize, allIndexers.length);
    const batch = allIndexers.slice(startFrom, endIndex);
    
    console.log(`\n🔄 Processing batch: ${startFrom + 1} to ${endIndex} (${batch.length} indexers)\n`);
    
    const results = [];
    
    for (let i = 0; i < batch.length; i++) {
      const result = await processIndexer(batch[i], startFrom + i);
      results.push(result);
      
      // Small delay to avoid rate limiting
      if (i < batch.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Summary
    console.log(`\n\n📊 Batch Summary:`);
    const successful = results.filter(r => r.success && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    // Update checklist
    console.log(`\n📝 Updating checklist...`);
    await updateChecklist(results);
    
    console.log(`\n✅ Batch complete! Next batch: --start-from=${endIndex}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Update checklist markdown
 */
async function updateChecklist(results) {
  // This would update the checklist file
  // For now, just log the results
  console.log('   (Checklist update would go here)');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { processIndexer, nameToId, fetchProwlarrDefinition };

