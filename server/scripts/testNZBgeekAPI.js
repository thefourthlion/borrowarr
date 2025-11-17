const axios = require("axios");

const API_BASE_URL = "http://localhost:3013";
const USER_ID = "93ffa6e1-f2ee-4faa-a86a-bd3a2daa79df";

// We'll need to get a JWT token first, but for now let's test the search endpoint
async function testAPI() {
  try {
    console.log("🧪 Testing NZBgeek via API endpoints...\n");

    // Test 1: Search for Shrek
    console.log("Test 1: Search API for 'Shrek'...");
    try {
      const searchResponse = await axios.get(`${API_BASE_URL}/api/Search`, {
        params: {
          query: "Shrek",
          indexerIds: "2", // NZBgeek ID from database
        },
        headers: {
          "Authorization": `Bearer ${process.env.TEST_TOKEN || ""}`, // Will need actual token
        },
      });

      if (searchResponse.data && searchResponse.data.results) {
        console.log(`✅ Search API working! Found ${searchResponse.data.results.length} results`);
        if (searchResponse.data.results.length > 0) {
          console.log("\n📋 Sample Results:");
          searchResponse.data.results.slice(0, 3).forEach((item, idx) => {
            console.log(`   ${idx + 1}. ${item.title || "No title"}`);
            console.log(`      Size: ${item.size || "Unknown"}, Indexer: ${item.indexer || "Unknown"}`);
          });
        }
      }
    } catch (error) {
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data?.error || error.message}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log("\n✅ API testing complete!");
    console.log("\n💡 Note: To test with authentication, you'll need to:");
    console.log("   1. Login via /api/auth/login to get a token");
    console.log("   2. Use that token in the Authorization header");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testAPI();

