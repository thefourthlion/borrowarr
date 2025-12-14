const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Handle existing data with null userId before syncing
    try {
      const MonitoredMovies = require('../models/MonitoredMovies');
      const MonitoredSeries = require('../models/MonitoredSeries');
      
      // Check if there are any rows with null userId
      const moviesWithNullUserId = await sequelize.query(
        "SELECT COUNT(*) as count FROM monitored_movies WHERE userId IS NULL",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (moviesWithNullUserId[0]?.count > 0) {
        console.log(`⚠️  Found ${moviesWithNullUserId[0].count} monitored movies with null userId - deleting them`);
        await sequelize.query("DELETE FROM monitored_movies WHERE userId IS NULL");
      }
      
      const seriesWithNullUserId = await sequelize.query(
        "SELECT COUNT(*) as count FROM monitored_series WHERE userId IS NULL",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (seriesWithNullUserId[0]?.count > 0) {
        console.log(`⚠️  Found ${seriesWithNullUserId[0].count} monitored series with null userId - deleting them`);
        await sequelize.query("DELETE FROM monitored_series WHERE userId IS NULL");
      }
    } catch (cleanupError) {
      // If tables don't exist yet, that's fine
      if (!cleanupError.message.includes('no such table')) {
        console.warn('⚠️  Could not clean up null userId values:', cleanupError.message);
      }
    }
    
    // Use alter: true to update existing tables with new columns
    // If alter fails, try without alter
    try {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized');
    } catch (syncError) {
      console.warn('⚠️  Alter sync failed, trying without alter:', syncError.message);
      await sequelize.sync({ alter: false });
      console.log('✅ Database synchronized (without alter)');
    }
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, connectDB };