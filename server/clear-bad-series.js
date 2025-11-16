#!/usr/bin/env node

/**
 * Clear Bad Series Data
 * 
 * This script removes incorrectly formatted series entries
 * from the database so you can re-import them correctly.
 */

const { sequelize } = require('./config/database');
const MonitoredSeries = require('./models/MonitoredSeries');

async function clearBadSeries() {
  try {
    console.log('🔍 Checking for badly formatted series...\n');
    
    // Find all series
    const allSeries = await MonitoredSeries.findAll();
    
    console.log(`Found ${allSeries.length} series in database\n`);
    
    let badCount = 0;
    const badSeries = [];
    
    // Check each series for bad data
    for (const series of allSeries) {
      let isBad = false;
      
      // Check if selectedSeasons is a proper JSON string
      if (series.selectedSeasons) {
        try {
          const parsed = JSON.parse(series.selectedSeasons);
          if (!Array.isArray(parsed)) {
            isBad = true;
          }
        } catch (e) {
          isBad = true;
        }
      }
      
      // Check if selectedEpisodes is a proper JSON string
      if (series.selectedEpisodes) {
        try {
          const parsed = JSON.parse(series.selectedEpisodes);
          if (!Array.isArray(parsed)) {
            isBad = true;
          }
        } catch (e) {
          isBad = true;
        }
      }
      
      if (isBad) {
        badCount++;
        badSeries.push(series);
        console.log(`❌ Bad data found: "${series.title}" (ID: ${series.id})`);
        console.log(`   Seasons: ${series.selectedSeasons}`);
        console.log(`   Episodes: ${series.selectedEpisodes}\n`);
      } else {
        console.log(`✅ Good data: "${series.title}" (ID: ${series.id})`);
      }
    }
    
    if (badCount === 0) {
      console.log('\n✅ No bad data found! All series are properly formatted.');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${badCount} series with bad data.`);
    console.log('These need to be deleted and re-imported.\n');
    
    // Delete bad series
    for (const series of badSeries) {
      await series.destroy();
      console.log(`🗑️  Deleted: "${series.title}" (ID: ${series.id})`);
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${badCount} badly formatted series.`);
    console.log('\n📺 Next steps:');
    console.log('   1. Go to System Settings');
    console.log('   2. Click "📥 Import" for Series Directory');
    console.log('   3. Your series will be imported correctly!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the cleanup
console.log('🔧 Starting Bad Series Data Cleanup...\n');
clearBadSeries();



/**
 * Clear Bad Series Data
 * 
 * This script removes incorrectly formatted series entries
 * from the database so you can re-import them correctly.
 */

const { sequelize } = require('./config/database');
const MonitoredSeries = require('./models/MonitoredSeries');

async function clearBadSeries() {
  try {
    console.log('🔍 Checking for badly formatted series...\n');
    
    // Find all series
    const allSeries = await MonitoredSeries.findAll();
    
    console.log(`Found ${allSeries.length} series in database\n`);
    
    let badCount = 0;
    const badSeries = [];
    
    // Check each series for bad data
    for (const series of allSeries) {
      let isBad = false;
      
      // Check if selectedSeasons is a proper JSON string
      if (series.selectedSeasons) {
        try {
          const parsed = JSON.parse(series.selectedSeasons);
          if (!Array.isArray(parsed)) {
            isBad = true;
          }
        } catch (e) {
          isBad = true;
        }
      }
      
      // Check if selectedEpisodes is a proper JSON string
      if (series.selectedEpisodes) {
        try {
          const parsed = JSON.parse(series.selectedEpisodes);
          if (!Array.isArray(parsed)) {
            isBad = true;
          }
        } catch (e) {
          isBad = true;
        }
      }
      
      if (isBad) {
        badCount++;
        badSeries.push(series);
        console.log(`❌ Bad data found: "${series.title}" (ID: ${series.id})`);
        console.log(`   Seasons: ${series.selectedSeasons}`);
        console.log(`   Episodes: ${series.selectedEpisodes}\n`);
      } else {
        console.log(`✅ Good data: "${series.title}" (ID: ${series.id})`);
      }
    }
    
    if (badCount === 0) {
      console.log('\n✅ No bad data found! All series are properly formatted.');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${badCount} series with bad data.`);
    console.log('These need to be deleted and re-imported.\n');
    
    // Delete bad series
    for (const series of badSeries) {
      await series.destroy();
      console.log(`🗑️  Deleted: "${series.title}" (ID: ${series.id})`);
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${badCount} badly formatted series.`);
    console.log('\n📺 Next steps:');
    console.log('   1. Go to System Settings');
    console.log('   2. Click "📥 Import" for Series Directory');
    console.log('   3. Your series will be imported correctly!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the cleanup
console.log('🔧 Starting Bad Series Data Cleanup...\n');
clearBadSeries();

#!/usr/bin/env node

/**
 * Clear Bad Series Data
 * 
 * This script removes incorrectly formatted series entries
 * from the database so you can re-import them correctly.
 */

const { sequelize } = require('./config/database');
const MonitoredSeries = require('./models/MonitoredSeries');

async function clearBadSeries() {
  try {
    console.log('🔍 Checking for badly formatted series...\n');
    
    // Find all series
    const allSeries = await MonitoredSeries.findAll();
    
    console.log(`Found ${allSeries.length} series in database\n`);
    
    let badCount = 0;
    const badSeries = [];
    
    // Check each series for bad data
    for (const series of allSeries) {
      let isBad = false;
      
      // Check if selectedSeasons is a proper JSON string
      if (series.selectedSeasons) {
        try {
          const parsed = JSON.parse(series.selectedSeasons);
          if (!Array.isArray(parsed)) {
            isBad = true;
          }
        } catch (e) {
          isBad = true;
        }
      }
      
      // Check if selectedEpisodes is a proper JSON string
      if (series.selectedEpisodes) {
        try {
          const parsed = JSON.parse(series.selectedEpisodes);
          if (!Array.isArray(parsed)) {
            isBad = true;
          }
        } catch (e) {
          isBad = true;
        }
      }
      
      if (isBad) {
        badCount++;
        badSeries.push(series);
        console.log(`❌ Bad data found: "${series.title}" (ID: ${series.id})`);
        console.log(`   Seasons: ${series.selectedSeasons}`);
        console.log(`   Episodes: ${series.selectedEpisodes}\n`);
      } else {
        console.log(`✅ Good data: "${series.title}" (ID: ${series.id})`);
      }
    }
    
    if (badCount === 0) {
      console.log('\n✅ No bad data found! All series are properly formatted.');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${badCount} series with bad data.`);
    console.log('These need to be deleted and re-imported.\n');
    
    // Delete bad series
    for (const series of badSeries) {
      await series.destroy();
      console.log(`🗑️  Deleted: "${series.title}" (ID: ${series.id})`);
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${badCount} badly formatted series.`);
    console.log('\n📺 Next steps:');
    console.log('   1. Go to System Settings');
    console.log('   2. Click "📥 Import" for Series Directory');
    console.log('   3. Your series will be imported correctly!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the cleanup
console.log('🔧 Starting Bad Series Data Cleanup...\n');
clearBadSeries();



/**
 * Clear Bad Series Data
 * 
 * This script removes incorrectly formatted series entries
 * from the database so you can re-import them correctly.
 */

const { sequelize } = require('./config/database');
const MonitoredSeries = require('./models/MonitoredSeries');

async function clearBadSeries() {
  try {
    console.log('🔍 Checking for badly formatted series...\n');
    
    // Find all series
    const allSeries = await MonitoredSeries.findAll();
    
    console.log(`Found ${allSeries.length} series in database\n`);
    
    let badCount = 0;
    const badSeries = [];
    
    // Check each series for bad data
    for (const series of allSeries) {
      let isBad = false;
      
      // Check if selectedSeasons is a proper JSON string
      if (series.selectedSeasons) {
        try {
          const parsed = JSON.parse(series.selectedSeasons);
          if (!Array.isArray(parsed)) {
            isBad = true;
          }
        } catch (e) {
          isBad = true;
        }
      }
      
      // Check if selectedEpisodes is a proper JSON string
      if (series.selectedEpisodes) {
        try {
          const parsed = JSON.parse(series.selectedEpisodes);
          if (!Array.isArray(parsed)) {
            isBad = true;
          }
        } catch (e) {
          isBad = true;
        }
      }
      
      if (isBad) {
        badCount++;
        badSeries.push(series);
        console.log(`❌ Bad data found: "${series.title}" (ID: ${series.id})`);
        console.log(`   Seasons: ${series.selectedSeasons}`);
        console.log(`   Episodes: ${series.selectedEpisodes}\n`);
      } else {
        console.log(`✅ Good data: "${series.title}" (ID: ${series.id})`);
      }
    }
    
    if (badCount === 0) {
      console.log('\n✅ No bad data found! All series are properly formatted.');
      process.exit(0);
    }
    
    console.log(`\n⚠️  Found ${badCount} series with bad data.`);
    console.log('These need to be deleted and re-imported.\n');
    
    // Delete bad series
    for (const series of badSeries) {
      await series.destroy();
      console.log(`🗑️  Deleted: "${series.title}" (ID: ${series.id})`);
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${badCount} badly formatted series.`);
    console.log('\n📺 Next steps:');
    console.log('   1. Go to System Settings');
    console.log('   2. Click "📥 Import" for Series Directory');
    console.log('   3. Your series will be imported correctly!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the cleanup
console.log('🔧 Starting Bad Series Data Cleanup...\n');
clearBadSeries();

