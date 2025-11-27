/**
 * Migration script to add user_id column to indexers and download_clients tables
 * Run this once to update your database schema
 */

const { sequelize } = require("../config/database");
const { QueryTypes } = require("sequelize");

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Check if user_id column already exists in indexers table
    const indexersTableInfo = await sequelize.query(
      "PRAGMA table_info(indexers)",
      { type: QueryTypes.SELECT }
    );
    const hasIndexersUserId = indexersTableInfo.some(
      (col) => col.name === "user_id"
    );

    // Check if user_id column already exists in download_clients table
    const downloadClientsTableInfo = await sequelize.query(
      "PRAGMA table_info(download_clients)",
      { type: QueryTypes.SELECT }
    );
    const hasDownloadClientsUserId = downloadClientsTableInfo.some(
      (col) => col.name === "user_id"
    );

    // Add user_id to indexers table if it doesn't exist
    if (!hasIndexersUserId) {
      console.log("📝 Adding user_id column to indexers table...");
      
      // First, check if there are existing indexers
      const existingIndexers = await sequelize.query(
        "SELECT COUNT(*) as count FROM indexers",
        { type: QueryTypes.SELECT }
      );
      const count = existingIndexers[0]?.count || 0;
      
      if (count > 0) {
        console.log(`⚠️  Found ${count} existing indexers. They will be deleted since they have no user association.`);
        // Delete existing indexers since they can't be associated with a user
        await sequelize.query("DELETE FROM indexers", { type: QueryTypes.DELETE });
        console.log("✅ Deleted existing indexers");
      }
      
      // Add the column (SQLite doesn't support adding NOT NULL columns directly, so we add it as nullable first)
      await sequelize.query(
        "ALTER TABLE indexers ADD COLUMN user_id TEXT",
        { type: QueryTypes.RAW }
      );
      
      // Now we need to make it NOT NULL, but SQLite doesn't support that directly
      // So we'll recreate the table with the proper schema
      console.log("📝 Recreating indexers table with user_id as NOT NULL...");
      
      // Get the current table structure
      const currentColumns = await sequelize.query(
        "PRAGMA table_info(indexers)",
        { type: QueryTypes.SELECT }
      );
      
      // Create new table with user_id
      await sequelize.query(`
        CREATE TABLE indexers_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          protocol TEXT NOT NULL CHECK(protocol IN ('torrent', 'nzb')),
          privacy TEXT NOT NULL CHECK(privacy IN ('Private', 'Public')),
          priority INTEGER NOT NULL DEFAULT 25,
          syncProfile TEXT NOT NULL DEFAULT 'Standard',
          enabled INTEGER NOT NULL DEFAULT 1,
          redirected INTEGER NOT NULL DEFAULT 0,
          baseUrl TEXT,
          availableBaseUrls TEXT,
          seedRatio REAL,
          username TEXT,
          password TEXT,
          stripCyrillicLetters INTEGER NOT NULL DEFAULT 0,
          searchFreeleechOnly INTEGER NOT NULL DEFAULT 0,
          sortRequestedFromSite TEXT DEFAULT 'created',
          orderRequestedFromSite TEXT NOT NULL DEFAULT 'desc' CHECK(orderRequestedFromSite IN ('asc', 'desc')),
          accountInactivity TEXT,
          tags TEXT,
          categories TEXT,
          language TEXT DEFAULT 'en-US',
          description TEXT,
          indexerType TEXT DEFAULT 'Cardigann',
          status TEXT NOT NULL DEFAULT 'enabled' CHECK(status IN ('enabled', 'enabled_redirected', 'disabled', 'error')),
          verified INTEGER NOT NULL DEFAULT 0,
          verifiedAt DATETIME,
          user_id TEXT NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        )
      `, { type: QueryTypes.RAW });
      
      // Drop old table and rename new one
      await sequelize.query("DROP TABLE indexers", { type: QueryTypes.RAW });
      await sequelize.query("ALTER TABLE indexers_new RENAME TO indexers", { type: QueryTypes.RAW });
      
      console.log("✅ Successfully added user_id column to indexers table");
    } else {
      console.log("✅ user_id column already exists in indexers table");
    }

    // Add user_id to download_clients table if it doesn't exist
    if (!hasDownloadClientsUserId) {
      console.log("📝 Adding user_id column to download_clients table...");
      
      // First, check if there are existing download clients
      const existingClients = await sequelize.query(
        "SELECT COUNT(*) as count FROM download_clients",
        { type: QueryTypes.SELECT }
      );
      const count = existingClients[0]?.count || 0;
      
      if (count > 0) {
        console.log(`⚠️  Found ${count} existing download clients. They will be deleted since they have no user association.`);
        // Delete existing download clients since they can't be associated with a user
        await sequelize.query("DELETE FROM download_clients", { type: QueryTypes.DELETE });
        console.log("✅ Deleted existing download clients");
      }
      
      // Recreate the table with user_id
      console.log("📝 Recreating download_clients table with user_id as NOT NULL...");
      
      await sequelize.query(`
        CREATE TABLE download_clients_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          implementation TEXT NOT NULL,
          protocol TEXT NOT NULL CHECK(protocol IN ('torrent', 'usenet')),
          enabled INTEGER NOT NULL DEFAULT 1,
          priority INTEGER NOT NULL DEFAULT 1,
          settings TEXT,
          categories TEXT,
          tags TEXT,
          user_id TEXT NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        )
      `, { type: QueryTypes.RAW });
      
      // Drop old table and rename new one
      await sequelize.query("DROP TABLE download_clients", { type: QueryTypes.RAW });
      await sequelize.query("ALTER TABLE download_clients_new RENAME TO download_clients", { type: QueryTypes.RAW });
      
      console.log("✅ Successfully added user_id column to download_clients table");
    } else {
      console.log("✅ user_id column already exists in download_clients table");
    }

    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrate();

