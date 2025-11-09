/**
 * Sync indexers from a running Prowlarr instance
 * 
 * This script fetches all enabled indexers from Prowlarr and configures them
 * in BorrowArr with the correct Prowlarr proxy URLs.
 * 
 * Usage:
 *   node syncFromProwlarr.js [prowlarr-url] [api-key]
 * 
 * Examples:
 *   node syncFromProwlarr.js http://localhost:9696 YOUR_API_KEY
 *   node syncFromProwlarr.js http://192.168.0.66:9696 YOUR_API_KEY
 */

const axios = require("axios");
const { sequelize } = require("../config/database");
const Indexers = require("../models/Indexers");

// Configuration
const PROWLARR_URL = process.argv[2] || process.env.PROWLARR_URL || "http://192.168.0.66:9696";
const PROWLARR_API_KEY = process.argv[3] || process.env.PROWLARR_API_KEY;

if (!PROWLARR_API_KEY) {
  console.error("\n❌ ERROR: Prowlarr API key is required!");
  console.error("\nUsage:");
  console.error("  node syncFromProwlarr.js [prowlarr-url] [api-key]");
  console.error("\nExample:");
  console.error("  node syncFromProwlarr.js http://localhost:9696 YOUR_API_KEY");
  console.error("\nOr set environment variables:");
  console.error("  PROWLARR_URL=http://localhost:9696");
  console.error("  PROWLARR_API_KEY=your_api_key");
  console.error("\n");
  process.exit(1);
}

async function testProwlarrConnection() {
  try {
    console.log(`\n🔍 Testing connection to Prowlarr at ${PROWLARR_URL}...`);
    const response = await axios.get(`${PROWLARR_URL}/api/v1/system/status`, {
      headers: { "X-Api-Key": PROWLARR_API_KEY },
      timeout: 10000,
    });
    console.log(`✅ Connected to Prowlarr v${response.data.version}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to Prowlarr: ${error.message}`);
    if (error.response?.status === 401) {
      console.error("   Invalid API key");
    } else if (error.code === "ECONNREFUSED") {
      console.error("   Prowlarr is not running or URL is incorrect");
    }
    return false;
  }
}

async function fetchProwlarrIndexers() {
  try {
    console.log(`\n📥 Fetching indexers from Prowlarr...`);
    const response = await axios.get(`${PROWLARR_URL}/api/v1/indexer`, {
      headers: { "X-Api-Key": PROWLARR_API_KEY },
      timeout: 10000,
    });
    
    const enabledIndexers = response.data.filter(idx => idx.enable);
    console.log(`   Found ${response.data.length} indexers (${enabledIndexers.length} enabled)`);
    return enabledIndexers;
  } catch (error) {
    console.error(`❌ Failed to fetch indexers: ${error.message}`);
    throw error;
  }
}

function mapProwlarrIndexer(prowlarrIndexer) {
  // Prowlarr exposes indexers at: http://prowlarr:9696/{id}/api
  const prowlarrProxyUrl = `${PROWLARR_URL}/${prowlarrIndexer.id}/api`;
  
  // Map Prowlarr fields to BorrowArr fields
  return {
    name: prowlarrIndexer.name,
    protocol: prowlarrIndexer.protocol === "torrent" ? "torrent" : "nzb",
    privacy: prowlarrIndexer.privacy === "private" ? "Private" : "Public",
    priority: prowlarrIndexer.priority || 25,
    syncProfile: "Standard",
    enabled: prowlarrIndexer.enable,
    redirected: false,
    baseUrl: prowlarrProxyUrl, // Use Prowlarr proxy URL
    seedRatio: prowlarrIndexer.seedRatio,
    username: "", // Not needed for Prowlarr proxy
    password: PROWLARR_API_KEY, // Use Prowlarr API key as password
    stripCyrillicLetters: false,
    searchFreeleechOnly: false,
    sortRequestedFromSite: "created",
    orderRequestedFromSite: "desc",
    accountInactivity: "",
    tags: prowlarrIndexer.tags?.join(",") || "",
    categories: prowlarrIndexer.capabilities?.categories?.map(c => c.name) || [],
    language: prowlarrIndexer.language || "en-US",
    description: prowlarrIndexer.description || "",
    indexerType: prowlarrIndexer.implementation || "Cardigann",
    status: prowlarrIndexer.enable ? "enabled" : "disabled",
    // Store Prowlarr-specific info
    availableBaseUrls: [prowlarrProxyUrl],
  };
}

async function syncIndexers() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log("✅ Connected to BorrowArr database");
    
    // Test Prowlarr connection
    const connected = await testProwlarrConnection();
    if (!connected) {
      console.error("\n❌ Cannot proceed without Prowlarr connection");
      process.exit(1);
    }
    
    // Fetch Prowlarr indexers
    const prowlarrIndexers = await fetchProwlarrIndexers();
    
    if (prowlarrIndexers.length === 0) {
      console.log("\n⚠️  No enabled indexers found in Prowlarr");
      console.log("   Add indexers in Prowlarr first, then run this script again");
      process.exit(0);
    }
    
    // Sync to BorrowArr database
    console.log(`\n📝 Syncing ${prowlarrIndexers.length} indexers to BorrowArr...`);
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const prowlarrIndexer of prowlarrIndexers) {
      try {
        const indexerData = mapProwlarrIndexer(prowlarrIndexer);
        
        // Check if indexer already exists
        const existing = await Indexers.findOne({
          where: { name: indexerData.name }
        });
        
        if (existing) {
          // Update existing indexer
          await existing.update(indexerData);
          console.log(`   ✏️  Updated: ${indexerData.name}`);
          updated++;
        } else {
          // Create new indexer
          await Indexers.create(indexerData);
          console.log(`   ➕ Created: ${indexerData.name}`);
          created++;
        }
      } catch (error) {
        console.error(`   ❌ Error syncing ${prowlarrIndexer.name}: ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n✅ Sync complete!`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    if (errors > 0) {
      console.log(`   Errors: ${errors}`);
    }
    
    console.log(`\n💡 All indexers are now configured to use Prowlarr proxy at:`);
    console.log(`   ${PROWLARR_URL}/{indexerId}/api`);
    console.log(`\n🔍 You can now search across all indexers in BorrowArr!`);
    
  } catch (error) {
    console.error(`\n❌ Sync failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run sync
syncIndexers();

