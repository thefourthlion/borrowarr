/**
 * Migration script to add verified fields to existing tables
 */

const { sequelize } = require('../config/database');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check if columns exist and add them if they don't (SQLite compatible)
    const [indexersInfo] = await sequelize.query("PRAGMA table_info(indexers)");
    const hasVerified = indexersInfo.some((col) => col.name === 'verified');
    const hasVerifiedAt = indexersInfo.some((col) => col.name === 'verifiedAt');
    
    if (!hasVerified) {
      await sequelize.query("ALTER TABLE indexers ADD COLUMN verified BOOLEAN DEFAULT 0");
      console.log('✅ Added verified column to indexers');
    }
    
    if (!hasVerifiedAt) {
      await sequelize.query("ALTER TABLE indexers ADD COLUMN verifiedAt DATETIME");
      console.log('✅ Added verifiedAt column to indexers');
    }
    
    const [availableInfo] = await sequelize.query("PRAGMA table_info(available_indexers)");
    const hasAvailableVerified = availableInfo.some((col) => col.name === 'verified');
    const hasAvailableVerifiedAt = availableInfo.some((col) => col.name === 'verifiedAt');
    
    if (!hasAvailableVerified) {
      await sequelize.query("ALTER TABLE available_indexers ADD COLUMN verified BOOLEAN DEFAULT 0");
      console.log('✅ Added verified column to available_indexers');
    }
    
    if (!hasAvailableVerifiedAt) {
      await sequelize.query("ALTER TABLE available_indexers ADD COLUMN verifiedAt DATETIME");
      console.log('✅ Added verifiedAt column to available_indexers');
    }
    
    console.log('✅ Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
