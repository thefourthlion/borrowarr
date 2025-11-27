const axios = require("axios");
const { sequelize } = require("../config/database");
const Indexers = require("../models/Indexers");

const USER_ID = "93ffa6e1-f2ee-4faa-a86a-bd3a2daa79df";

async function testNZBgeek() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established.\n");

    // Fetch NZBgeek from database
    const indexer = await Indexers.findOne({
      where: {
        name: "NZBgeek",
        userId: USER_ID,
      },
      raw: true,
    });

    if (!indexer) {
      console.error("❌ NZBgeek not found in database!");
      return;
    }

    console.log("📋 Indexer Details:");
    console.log(`   Name: ${indexer.name}`);
    console.log(`   Base URL: ${indexer.baseUrl}`);
    console.log(`   API Key: ${indexer.apiKey ? indexer.apiKey.substring(0, 10) + "..." : "NOT SET"}`);
    console.log(`   Protocol: ${indexer.protocol}`);
    console.log(`   Indexer Type: ${indexer.indexerType}\n`);

    // Test 1: Test capabilities (caps) endpoint
    console.log("🧪 Test 1: Testing capabilities endpoint...");
    try {
      const capsUrl = `${indexer.baseUrl.replace(/\/$/, "")}/api?t=caps&apikey=${indexer.apiKey}`;
      console.log(`   URL: ${capsUrl.replace(/apikey=[^&]+/, "apikey=***")}`);
      
      const capsResponse = await axios.get(capsUrl, {
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "application/xml,application/rss+xml,text/xml",
        },
      });

      if (capsResponse.status === 200) {
        console.log("   ✅ Capabilities endpoint working!");
        if (capsResponse.data) {
          const dataStr = typeof capsResponse.data === 'string' ? capsResponse.data : JSON.stringify(capsResponse.data);
          if (dataStr.includes("server") || dataStr.includes("caps")) {
            console.log("   ✅ Valid response received");
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Capabilities test failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${error.response.data?.substring(0, 200)}`);
      }
    }

    console.log("\n🧪 Test 2: Testing search for 'Shrek'...");
    try {
      const searchUrl = `${indexer.baseUrl.replace(/\/$/, "")}/api?t=search&q=Shrek&apikey=${indexer.apiKey}&limit=10&extended=1`;
      console.log(`   URL: ${searchUrl.replace(/apikey=[^&]+/, "apikey=***")}`);
      
      const searchResponse = await axios.get(searchUrl, {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "Accept": "application/xml,application/rss+xml,text/xml",
        },
      });

      if (searchResponse.status === 200) {
        console.log("   ✅ Search endpoint working!");
        
        // Parse XML response
        const xml2js = require("xml2js");
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(searchResponse.data);
        
        const rss = result.rss || result;
        const channel = rss.channel?.[0] || rss.channel;
        const items = channel?.item || [];
        
        console.log(`   ✅ Found ${items.length} results for "Shrek"`);
        
        if (items.length > 0) {
          console.log("\n   📋 Sample Results:");
          items.slice(0, 3).forEach((item, idx) => {
            const title = item.title?.[0] || item.title || "No title";
            const size = item.size?.[0] || item.size || "Unknown size";
            const pubDate = item.pubDate?.[0] || item.pubDate || "Unknown date";
            console.log(`   ${idx + 1}. ${title}`);
            console.log(`      Size: ${size}, Date: ${pubDate}`);
          });
        } else {
          console.log("   ⚠️  No results found (but API is working)");
        }
      }
    } catch (error) {
      console.log(`   ❌ Search test failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${error.response.data?.substring(0, 200)}`);
      }
    }

    console.log("\n🧪 Test 3: Testing via searchIndexer service...");
    try {
      const { searchIndexer } = require("../services/indexerSearch");
      const result = await searchIndexer(indexer, "Shrek", [], 10, 0);
      
      if (result.error) {
        console.log(`   ❌ Service test failed: ${result.error}`);
      } else {
        console.log(`   ✅ Service test successful!`);
        console.log(`   ✅ Found ${result.results?.length || 0} results`);
        
        if (result.results && result.results.length > 0) {
          console.log("\n   📋 Sample Results:");
          result.results.slice(0, 3).forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.title || "No title"}`);
            console.log(`      Size: ${item.size || "Unknown"}, Seeds: ${item.seeds || "N/A"}`);
          });
        }
      }
    } catch (error) {
      console.log(`   ❌ Service test error: ${error.message}`);
    }

    console.log("\n✅ Testing complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testNZBgeek();

