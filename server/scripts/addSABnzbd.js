/**
 * Script to add SABnzbd download client to database and test connection
 */

const { sequelize } = require("../config/database");
const DownloadClients = require("../models/DownloadClients");
const SabnzbdProxy = require("../services/downloadClients/sabnzbdProxy");

async function addAndTestSABnzbd() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established.\n");

    const userId = "93ffa6e1-f2ee-4faa-a86a-bd3a2daa79df";
    const settings = {
      host: "192.168.0.66",
      port: 8091,
      useSsl: false,
      apiKey: "0bbb146c958e4d58b75f0b796916320b",
      urlBase: null,
      category: "prowlarr",
      priority: "Default",
      addPaused: false,
    };

    console.log("📋 SABnzbd Configuration:");
    console.log(`   Host: ${settings.host}`);
    console.log(`   Port: ${settings.port}`);
    console.log(`   SSL: ${settings.useSsl}`);
    console.log(`   API Key: ${settings.apiKey.substring(0, 10)}...`);
    console.log(`   Category: ${settings.category}`);
    console.log(`   Priority: ${settings.priority}\n`);

    // Test connection first - try different URL paths
    console.log("🧪 Testing SABnzbd connection...");
    
    // Try common SABnzbd API paths
    // SABnzbd can be at /api, /sabnzbd/api, or custom URL base
    const urlBasesToTry = [
      { urlBase: null, description: 'default (/sabnzbd/api)' },
      { urlBase: '', description: 'root (/api)' },
      { urlBase: '/', description: 'root slash (/api)' },
      { urlBase: '/sabnzbd', description: '/sabnzbd (/sabnzbd/api)' },
    ];
    let testResult = null;
    let workingUrlBase = null;
    
    for (const { urlBase, description } of urlBasesToTry) {
      const testSettings = { ...settings, urlBase };
      const sabnzbdProxy = new SabnzbdProxy(testSettings);
      const testUrl = sabnzbdProxy.baseUrl;
      console.log(`   Trying ${description}: ${testUrl}`);
      
      testResult = await sabnzbdProxy.testConnection();
      if (testResult.success) {
        workingUrlBase = urlBase;
        settings.urlBase = urlBase;
        console.log(`   ✅ Found working URL: ${testUrl}`);
        break;
      } else {
        console.log(`   ❌ Failed: ${testResult.error}`);
      }
    }

    if (!testResult || !testResult.success) {
      console.error("\n❌ Connection test failed for all URL paths.");
      console.error("   Please check:");
      console.error("   1. SABnzbd is running and accessible");
      console.error("   2. Host and port are correct");
      console.error("   3. API key is valid");
      console.error("   4. URL Base setting in SABnzbd (if configured)");
      console.log("\n⚠️  Cannot add client - connection test failed.\n");
      return;
    }

    console.log("✅ Connection test successful!");
    if (testResult.version) {
      console.log(`   Version: ${testResult.version}`);
    }
    if (testResult.message) {
      console.log(`   Message: ${testResult.message}`);
    }
    console.log();

    // Check if SABnzbd already exists for this user
    const existingClient = await DownloadClients.findOne({
      where: {
        name: "SABnzbd",
        userId: userId,
      },
    });

    if (existingClient) {
      console.log("🔄 Updating existing SABnzbd client...");
      await existingClient.update({
        implementation: "Sabnzbd",
        protocol: "usenet",
        enabled: true,
        priority: 1,
        settings: settings,
        categories: [],
        tags: null,
      });
      console.log("✅ SABnzbd updated successfully!");
      console.log(`   ID: ${existingClient.id}`);
    } else {
      console.log("➕ Creating new SABnzbd client...");
      const newClient = await DownloadClients.create({
        name: "SABnzbd",
        implementation: "Sabnzbd",
        protocol: "usenet",
        enabled: true,
        priority: 1,
        settings: settings,
        categories: [],
        tags: null,
        userId: userId,
      });
      console.log("✅ SABnzbd created successfully!");
      console.log(`   ID: ${newClient.id}`);
    }

    console.log("\n✅ SABnzbd client ready for use!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore close errors
    }
  }
}

addAndTestSABnzbd();

