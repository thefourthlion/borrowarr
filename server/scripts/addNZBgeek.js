const { sequelize } = require("../config/database");
const Indexers = require("../models/Indexers");
const { getBaseUrlsForIndexer } = require("../data/indexerBaseUrls");

const USER_ID = "93ffa6e1-f2ee-4faa-a86a-bd3a2daa79df";
const API_KEY = "ka2uu6NtUjRki0nFNymoz2rdXgo9PsTG";

async function addNZBgeek() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established.");

    // Sync the model to ensure table exists
    await Indexers.sync({ alter: true });
    console.log("✅ Indexers table synchronized.");

    // Get base URLs for NZBgeek
    const baseUrls = getBaseUrlsForIndexer("NZBgeek");
    const baseUrl = baseUrls[0] || "https://api.nzbgeek.info/";

    // Check if NZBgeek already exists for this user
    const existing = await Indexers.findOne({
      where: {
        name: "NZBgeek",
        userId: USER_ID,
      },
    });

    if (existing) {
      console.log("🔄 Updating existing NZBgeek indexer...");
      await existing.update({
        baseUrl: baseUrl,
        apiKey: API_KEY,
        protocol: "nzb",
        privacy: "Private",
        priority: 25,
        syncProfile: "Standard",
        enabled: true,
        redirected: false,
        indexerType: "Newznab",
        status: "enabled",
        availableBaseUrls: baseUrls,
        categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"],
        language: "en-US",
        description: "Newznab is an API search specification for Usenet",
      });
      console.log("✅ NZBgeek updated successfully!");
      console.log(`   ID: ${existing.id}`);
      console.log(`   Base URL: ${baseUrl}`);
      console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);
    } else {
      console.log("➕ Creating new NZBgeek indexer...");
      const indexer = await Indexers.create({
        name: "NZBgeek",
        baseUrl: baseUrl,
        apiKey: API_KEY,
        protocol: "nzb",
        privacy: "Private",
        priority: 25,
        syncProfile: "Standard",
        enabled: true,
        redirected: false,
        indexerType: "Newznab",
        status: "enabled",
        userId: USER_ID,
        availableBaseUrls: baseUrls,
        categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"],
        language: "en-US",
        description: "Newznab is an API search specification for Usenet",
      });
      console.log("✅ NZBgeek created successfully!");
      console.log(`   ID: ${indexer.id}`);
      console.log(`   Base URL: ${baseUrl}`);
      console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);
    }

    console.log("\n✅ NZBgeek indexer ready for testing!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
addNZBgeek();

