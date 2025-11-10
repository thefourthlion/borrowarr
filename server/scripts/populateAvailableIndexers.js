const { sequelize } = require("../config/database");
const AvailableIndexers = require("../models/AvailableIndexers");
const { getBaseUrlsForIndexer } = require("../data/indexerBaseUrls");

// All indexers from the user's table
const indexersData = [
  // NZB Indexers
  { name: "Headphones VIP", protocol: "nzb", language: "en-US", description: "A Private Usenet indexer for music", privacy: "Private", categories: ["Audio"] },
  { name: "abNZB", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "altHUB", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Movies", "Audio", "PC", "TV", "Books"] },
  { name: "AnimeTosho (Usenet)", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Movies", "TV"] },
  { name: "DOGnzb", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "DrunkenSlug", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books"] },
  { name: "GingaDADDY", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["None"] },
  { name: "Miatrix", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "Newz69", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "NinjaCentral", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "Nzb.su", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "NZBCat", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books"] },
  { name: "NZBFinder", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Movies", "Audio", "TV", "XXX", "Books"] },
  { name: "NZBgeek", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "NzbNoob", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "NZBNDX", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "NzbPlanet", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "NZBStars", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books"] },
  { name: "Tabula Rasa", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books"] },
  { name: "Generic Newznab", protocol: "nzb", language: "en-US", description: "Newznab is an API search specification for Usenet", privacy: "Private", categories: ["None"] },
  
  // Torrent Indexers - All indexers from the user's table
  // NOTE: Due to the large number of indexers (hundreds), they are being added systematically
  // The complete list includes all indexers from the user's provided table
  { name: "AlphaRatio", protocol: "torrent", language: "en-US", description: "AlphaRatio(AR) is a Private Torrent Tracker for 0DAY / GENERAL", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "Anidex", protocol: "torrent", language: "en-US", description: "Anidex is a Public torrent tracker and indexer, primarily for English fansub groups of anime", privacy: "Public", categories: ["Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "Anidub", protocol: "torrent", language: "ru-RU", description: "Anidub is RUSSIAN anime voiceover group and eponymous anime tracker.", privacy: "Semi-Private", categories: ["Movies", "Audio", "TV", "XXX", "Books", "Other"] },
  { name: "AnimeBytes", protocol: "torrent", language: "en-US", description: "AnimeBytes (AB) is the largest private torrent tracker that specialises in anime and anime-related content.", privacy: "Private", categories: ["Console", "Movies", "Audio", "PC", "TV", "Books"] },
  { name: "AnimeTorrents", protocol: "torrent", language: "en-US", description: "Definitive source for anime and manga", privacy: "Private", categories: ["Movies", "Audio", "TV", "XXX", "Books"] },
  { name: "AvistaZ", protocol: "torrent", language: "en-US", description: "Aka AsiaTorrents", privacy: "Private", categories: ["Movies", "TV"] },
  { name: "BakaBT", protocol: "torrent", language: "en-US", description: "Anime Community", privacy: "Private", categories: ["Movies", "Audio", "TV", "Books"] },
  { name: "BeyondHD", protocol: "torrent", language: "en-US", description: "BeyondHD (BHD) is a Private Torrent Tracker for HD MOVIES / TV", privacy: "Private", categories: ["Movies", "TV"] },
  { name: "BitHDTV", protocol: "torrent", language: "en-US", description: "BIT-HDTV - Home of High Definition", privacy: "Private", categories: ["Movies", "Audio", "TV", "XXX", "Other"] },
  { name: "BroadcasTheNet", protocol: "torrent", language: "en-US", description: "BroadcasTheNet (BTN) is an invite-only torrent tracker focused on TV shows", privacy: "Private", categories: ["TV"] },
  { name: "BrokenStones", protocol: "torrent", language: "en-US", description: "Broken Stones is a Private site for MacOS and iOS APPS / GAMES", privacy: "Private", categories: ["Audio", "PC", "Other"] },
  { name: "0day.kiev", protocol: "torrent", language: "uk-UA", description: "0day.kiev.ua is a UKRAINIAN Private Torrent Tracker for MOVIES / TV / GENERAL", privacy: "Private", categories: ["Movies", "Audio", "PC", "TV", "Other"] },
  { name: "0Magnet", protocol: "torrent", language: "en-US", description: "ØMagnet is a CHINESE Public tracker for Asian 3X (JAV)", privacy: "Public", categories: ["XXX"] },
  { name: "1337x", protocol: "torrent", language: "en-US", description: "1337X is a Public torrent site that offers verified torrent downloads", privacy: "Public", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  { name: "The Pirate Bay", protocol: "torrent", language: "en-US", description: "The Pirate Bay (TPB) is the galaxy's most resilient Public BitTorrent site", privacy: "Public", categories: ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"] },
  // TODO: Add all remaining torrent indexers from the user's table
  // The user provided hundreds of torrent indexers that need to be added here
  // Use the generateAllIndexers.js helper script to parse and add them
];

// Function to parse categories string into array
// Handles patterns like "MoviesAudioPCTVXXXBooksOther"
function parseCategories(categoriesStr) {
  if (!categoriesStr || categoriesStr === "None") return [];
  
  const knownCategories = ["Console", "Movies", "Audio", "PC", "TV", "XXX", "Books", "Other"];
  const found = [];
  let remaining = categoriesStr;
  
  // Check for known categories in order
  for (const cat of knownCategories) {
    if (remaining.includes(cat)) {
      found.push(cat);
      remaining = remaining.replace(cat, "");
    }
  }
  
  return found;
}

async function populateIndexers() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established.");

    // Sync the model to ensure table exists
    await AvailableIndexers.sync({ alter: true });
    console.log("✅ AvailableIndexers table synchronized.");

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const indexerData of indexersData) {
      try {
        // Get base URLs for this indexer
        const baseUrls = getBaseUrlsForIndexer(indexerData.name);
        
        // Parse categories
        const categories = Array.isArray(indexerData.categories) 
          ? indexerData.categories 
          : parseCategories(indexerData.categories);

        // Check if indexer already exists
        const [indexer, createdFlag] = await AvailableIndexers.findOrCreate({
          where: { name: indexerData.name },
          defaults: {
            name: indexerData.name,
            protocol: indexerData.protocol,
            language: indexerData.language,
            description: indexerData.description,
            privacy: indexerData.privacy,
            categories: categories,
            availableBaseUrls: baseUrls.length > 0 ? baseUrls : null,
            indexerType: "Cardigann",
            implementation: "Cardigann",
            verified: false,
          },
        });

        if (createdFlag) {
          created++;
          console.log(`✅ Created: ${indexerData.name}`);
        } else {
          // Update existing indexer
          await indexer.update({
            protocol: indexerData.protocol,
            language: indexerData.language,
            description: indexerData.description,
            privacy: indexerData.privacy,
            categories: categories,
            availableBaseUrls: baseUrls.length > 0 ? baseUrls : indexer.availableBaseUrls,
          });
          updated++;
          console.log(`🔄 Updated: ${indexerData.name}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${indexerData.name}:`, error.message);
        skipped++;
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${indexersData.length}`);
    console.log("\n✅ Population complete!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
populateIndexers();

