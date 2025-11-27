/**
 * Update AvailableIndexers verified status based on scraper test results
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_FILE = path.join(__dirname, '../../scraper-test-results.json');

async function updateVerifiedStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    if (!fs.existsSync(TEST_RESULTS_FILE)) {
      console.log('⚠️  Test results file not found. Run testAllScrapers.js first.');
      process.exit(0);
    }
    
    const testResults = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
    
    console.log(`\n📊 Test Results Summary:`);
    console.log(`   ✅ Working: ${testResults.working?.length || 0}`);
    console.log(`   ⚠️  No Results: ${testResults.noResults?.length || 0}`);
    console.log(`   ❌ Failed: ${testResults.failed?.length || 0}`);
    console.log(`   📝 Total Tested: ${testResults.tested?.length || 0}\n`);
    
    // Mark working indexers as verified
    if (testResults.working && testResults.working.length > 0) {
      console.log(`🔄 Marking ${testResults.working.length} working indexers as verified...`);
      
      let updated = 0;
      for (const working of testResults.working) {
        try {
          // Try to match by name
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: true, 
              verifiedAt: new Date(working.timestamp || Date.now())
            },
            { 
              where: { 
                name: working.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
            console.log(`   ✅ Marked "${working.name}" as verified`);
          } else {
            // Try case-insensitive match
            const indexer = await AvailableIndexers.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                working.name.toLowerCase()
              )
            });
            
            if (indexer) {
              await indexer.update({
                verified: true,
                verifiedAt: new Date(working.timestamp || Date.now())
              });
              updated++;
              console.log(`   ✅ Marked "${working.name}" as verified (case-insensitive match)`);
            } else {
              console.log(`   ⚠️  Could not find "${working.name}" in AvailableIndexers`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error updating "${working.name}":`, err.message);
        }
      }
      
      console.log(`\n✅ Updated ${updated} indexers as verified\n`);
    } else {
      console.log('⚠️  No working indexers found in test results\n');
    }
    
    // Mark failed indexers as unverified
    if (testResults.failed && testResults.failed.length > 0) {
      console.log(`🔄 Marking ${testResults.failed.length} failed indexers as unverified...`);
      
      let updated = 0;
      for (const failed of testResults.failed) {
        try {
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: false, 
              verifiedAt: null
            },
            { 
              where: { 
                name: failed.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
          }
        } catch (err) {
          // Ignore errors for failed updates
        }
      }
      
      console.log(`✅ Updated ${updated} failed indexers\n`);
    }
    
    // Show summary
    const verifiedCount = await AvailableIndexers.count({ where: { verified: true } });
    console.log(`📊 Total verified indexers in database: ${verifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVerifiedStatus();

 * Update AvailableIndexers verified status based on scraper test results
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_FILE = path.join(__dirname, '../../scraper-test-results.json');

async function updateVerifiedStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    if (!fs.existsSync(TEST_RESULTS_FILE)) {
      console.log('⚠️  Test results file not found. Run testAllScrapers.js first.');
      process.exit(0);
    }
    
    const testResults = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
    
    console.log(`\n📊 Test Results Summary:`);
    console.log(`   ✅ Working: ${testResults.working?.length || 0}`);
    console.log(`   ⚠️  No Results: ${testResults.noResults?.length || 0}`);
    console.log(`   ❌ Failed: ${testResults.failed?.length || 0}`);
    console.log(`   📝 Total Tested: ${testResults.tested?.length || 0}\n`);
    
    // Mark working indexers as verified
    if (testResults.working && testResults.working.length > 0) {
      console.log(`🔄 Marking ${testResults.working.length} working indexers as verified...`);
      
      let updated = 0;
      for (const working of testResults.working) {
        try {
          // Try to match by name
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: true, 
              verifiedAt: new Date(working.timestamp || Date.now())
            },
            { 
              where: { 
                name: working.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
            console.log(`   ✅ Marked "${working.name}" as verified`);
          } else {
            // Try case-insensitive match
            const indexer = await AvailableIndexers.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                working.name.toLowerCase()
              )
            });
            
            if (indexer) {
              await indexer.update({
                verified: true,
                verifiedAt: new Date(working.timestamp || Date.now())
              });
              updated++;
              console.log(`   ✅ Marked "${working.name}" as verified (case-insensitive match)`);
            } else {
              console.log(`   ⚠️  Could not find "${working.name}" in AvailableIndexers`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error updating "${working.name}":`, err.message);
        }
      }
      
      console.log(`\n✅ Updated ${updated} indexers as verified\n`);
    } else {
      console.log('⚠️  No working indexers found in test results\n');
    }
    
    // Mark failed indexers as unverified
    if (testResults.failed && testResults.failed.length > 0) {
      console.log(`🔄 Marking ${testResults.failed.length} failed indexers as unverified...`);
      
      let updated = 0;
      for (const failed of testResults.failed) {
        try {
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: false, 
              verifiedAt: null
            },
            { 
              where: { 
                name: failed.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
          }
        } catch (err) {
          // Ignore errors for failed updates
        }
      }
      
      console.log(`✅ Updated ${updated} failed indexers\n`);
    }
    
    // Show summary
    const verifiedCount = await AvailableIndexers.count({ where: { verified: true } });
    console.log(`📊 Total verified indexers in database: ${verifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVerifiedStatus();

 * Update AvailableIndexers verified status based on scraper test results
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_FILE = path.join(__dirname, '../../scraper-test-results.json');

async function updateVerifiedStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    if (!fs.existsSync(TEST_RESULTS_FILE)) {
      console.log('⚠️  Test results file not found. Run testAllScrapers.js first.');
      process.exit(0);
    }
    
    const testResults = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
    
    console.log(`\n📊 Test Results Summary:`);
    console.log(`   ✅ Working: ${testResults.working?.length || 0}`);
    console.log(`   ⚠️  No Results: ${testResults.noResults?.length || 0}`);
    console.log(`   ❌ Failed: ${testResults.failed?.length || 0}`);
    console.log(`   📝 Total Tested: ${testResults.tested?.length || 0}\n`);
    
    // Mark working indexers as verified
    if (testResults.working && testResults.working.length > 0) {
      console.log(`🔄 Marking ${testResults.working.length} working indexers as verified...`);
      
      let updated = 0;
      for (const working of testResults.working) {
        try {
          // Try to match by name
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: true, 
              verifiedAt: new Date(working.timestamp || Date.now())
            },
            { 
              where: { 
                name: working.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
            console.log(`   ✅ Marked "${working.name}" as verified`);
          } else {
            // Try case-insensitive match
            const indexer = await AvailableIndexers.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                working.name.toLowerCase()
              )
            });
            
            if (indexer) {
              await indexer.update({
                verified: true,
                verifiedAt: new Date(working.timestamp || Date.now())
              });
              updated++;
              console.log(`   ✅ Marked "${working.name}" as verified (case-insensitive match)`);
            } else {
              console.log(`   ⚠️  Could not find "${working.name}" in AvailableIndexers`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error updating "${working.name}":`, err.message);
        }
      }
      
      console.log(`\n✅ Updated ${updated} indexers as verified\n`);
    } else {
      console.log('⚠️  No working indexers found in test results\n');
    }
    
    // Mark failed indexers as unverified
    if (testResults.failed && testResults.failed.length > 0) {
      console.log(`🔄 Marking ${testResults.failed.length} failed indexers as unverified...`);
      
      let updated = 0;
      for (const failed of testResults.failed) {
        try {
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: false, 
              verifiedAt: null
            },
            { 
              where: { 
                name: failed.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
          }
        } catch (err) {
          // Ignore errors for failed updates
        }
      }
      
      console.log(`✅ Updated ${updated} failed indexers\n`);
    }
    
    // Show summary
    const verifiedCount = await AvailableIndexers.count({ where: { verified: true } });
    console.log(`📊 Total verified indexers in database: ${verifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVerifiedStatus();

 * Update AvailableIndexers verified status based on scraper test results
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_FILE = path.join(__dirname, '../../scraper-test-results.json');

async function updateVerifiedStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    if (!fs.existsSync(TEST_RESULTS_FILE)) {
      console.log('⚠️  Test results file not found. Run testAllScrapers.js first.');
      process.exit(0);
    }
    
    const testResults = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
    
    console.log(`\n📊 Test Results Summary:`);
    console.log(`   ✅ Working: ${testResults.working?.length || 0}`);
    console.log(`   ⚠️  No Results: ${testResults.noResults?.length || 0}`);
    console.log(`   ❌ Failed: ${testResults.failed?.length || 0}`);
    console.log(`   📝 Total Tested: ${testResults.tested?.length || 0}\n`);
    
    // Mark working indexers as verified
    if (testResults.working && testResults.working.length > 0) {
      console.log(`🔄 Marking ${testResults.working.length} working indexers as verified...`);
      
      let updated = 0;
      for (const working of testResults.working) {
        try {
          // Try to match by name
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: true, 
              verifiedAt: new Date(working.timestamp || Date.now())
            },
            { 
              where: { 
                name: working.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
            console.log(`   ✅ Marked "${working.name}" as verified`);
          } else {
            // Try case-insensitive match
            const indexer = await AvailableIndexers.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                working.name.toLowerCase()
              )
            });
            
            if (indexer) {
              await indexer.update({
                verified: true,
                verifiedAt: new Date(working.timestamp || Date.now())
              });
              updated++;
              console.log(`   ✅ Marked "${working.name}" as verified (case-insensitive match)`);
            } else {
              console.log(`   ⚠️  Could not find "${working.name}" in AvailableIndexers`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error updating "${working.name}":`, err.message);
        }
      }
      
      console.log(`\n✅ Updated ${updated} indexers as verified\n`);
    } else {
      console.log('⚠️  No working indexers found in test results\n');
    }
    
    // Mark failed indexers as unverified
    if (testResults.failed && testResults.failed.length > 0) {
      console.log(`🔄 Marking ${testResults.failed.length} failed indexers as unverified...`);
      
      let updated = 0;
      for (const failed of testResults.failed) {
        try {
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: false, 
              verifiedAt: null
            },
            { 
              where: { 
                name: failed.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
          }
        } catch (err) {
          // Ignore errors for failed updates
        }
      }
      
      console.log(`✅ Updated ${updated} failed indexers\n`);
    }
    
    // Show summary
    const verifiedCount = await AvailableIndexers.count({ where: { verified: true } });
    console.log(`📊 Total verified indexers in database: ${verifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVerifiedStatus();

 * Update AvailableIndexers verified status based on scraper test results
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_FILE = path.join(__dirname, '../../scraper-test-results.json');

async function updateVerifiedStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    if (!fs.existsSync(TEST_RESULTS_FILE)) {
      console.log('⚠️  Test results file not found. Run testAllScrapers.js first.');
      process.exit(0);
    }
    
    const testResults = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
    
    console.log(`\n📊 Test Results Summary:`);
    console.log(`   ✅ Working: ${testResults.working?.length || 0}`);
    console.log(`   ⚠️  No Results: ${testResults.noResults?.length || 0}`);
    console.log(`   ❌ Failed: ${testResults.failed?.length || 0}`);
    console.log(`   📝 Total Tested: ${testResults.tested?.length || 0}\n`);
    
    // Mark working indexers as verified
    if (testResults.working && testResults.working.length > 0) {
      console.log(`🔄 Marking ${testResults.working.length} working indexers as verified...`);
      
      let updated = 0;
      for (const working of testResults.working) {
        try {
          // Try to match by name
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: true, 
              verifiedAt: new Date(working.timestamp || Date.now())
            },
            { 
              where: { 
                name: working.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
            console.log(`   ✅ Marked "${working.name}" as verified`);
          } else {
            // Try case-insensitive match
            const indexer = await AvailableIndexers.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                working.name.toLowerCase()
              )
            });
            
            if (indexer) {
              await indexer.update({
                verified: true,
                verifiedAt: new Date(working.timestamp || Date.now())
              });
              updated++;
              console.log(`   ✅ Marked "${working.name}" as verified (case-insensitive match)`);
            } else {
              console.log(`   ⚠️  Could not find "${working.name}" in AvailableIndexers`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error updating "${working.name}":`, err.message);
        }
      }
      
      console.log(`\n✅ Updated ${updated} indexers as verified\n`);
    } else {
      console.log('⚠️  No working indexers found in test results\n');
    }
    
    // Mark failed indexers as unverified
    if (testResults.failed && testResults.failed.length > 0) {
      console.log(`🔄 Marking ${testResults.failed.length} failed indexers as unverified...`);
      
      let updated = 0;
      for (const failed of testResults.failed) {
        try {
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: false, 
              verifiedAt: null
            },
            { 
              where: { 
                name: failed.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
          }
        } catch (err) {
          // Ignore errors for failed updates
        }
      }
      
      console.log(`✅ Updated ${updated} failed indexers\n`);
    }
    
    // Show summary
    const verifiedCount = await AvailableIndexers.count({ where: { verified: true } });
    console.log(`📊 Total verified indexers in database: ${verifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVerifiedStatus();

 * Update AvailableIndexers verified status based on scraper test results
 */

const { sequelize } = require('../config/database');
const AvailableIndexers = require('../models/AvailableIndexers');
const fs = require('fs');
const path = require('path');

const TEST_RESULTS_FILE = path.join(__dirname, '../../scraper-test-results.json');

async function updateVerifiedStatus() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    if (!fs.existsSync(TEST_RESULTS_FILE)) {
      console.log('⚠️  Test results file not found. Run testAllScrapers.js first.');
      process.exit(0);
    }
    
    const testResults = JSON.parse(fs.readFileSync(TEST_RESULTS_FILE, 'utf8'));
    
    console.log(`\n📊 Test Results Summary:`);
    console.log(`   ✅ Working: ${testResults.working?.length || 0}`);
    console.log(`   ⚠️  No Results: ${testResults.noResults?.length || 0}`);
    console.log(`   ❌ Failed: ${testResults.failed?.length || 0}`);
    console.log(`   📝 Total Tested: ${testResults.tested?.length || 0}\n`);
    
    // Mark working indexers as verified
    if (testResults.working && testResults.working.length > 0) {
      console.log(`🔄 Marking ${testResults.working.length} working indexers as verified...`);
      
      let updated = 0;
      for (const working of testResults.working) {
        try {
          // Try to match by name
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: true, 
              verifiedAt: new Date(working.timestamp || Date.now())
            },
            { 
              where: { 
                name: working.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
            console.log(`   ✅ Marked "${working.name}" as verified`);
          } else {
            // Try case-insensitive match
            const indexer = await AvailableIndexers.findOne({
              where: sequelize.where(
                sequelize.fn('LOWER', sequelize.col('name')),
                working.name.toLowerCase()
              )
            });
            
            if (indexer) {
              await indexer.update({
                verified: true,
                verifiedAt: new Date(working.timestamp || Date.now())
              });
              updated++;
              console.log(`   ✅ Marked "${working.name}" as verified (case-insensitive match)`);
            } else {
              console.log(`   ⚠️  Could not find "${working.name}" in AvailableIndexers`);
            }
          }
        } catch (err) {
          console.error(`   ❌ Error updating "${working.name}":`, err.message);
        }
      }
      
      console.log(`\n✅ Updated ${updated} indexers as verified\n`);
    } else {
      console.log('⚠️  No working indexers found in test results\n');
    }
    
    // Mark failed indexers as unverified
    if (testResults.failed && testResults.failed.length > 0) {
      console.log(`🔄 Marking ${testResults.failed.length} failed indexers as unverified...`);
      
      let updated = 0;
      for (const failed of testResults.failed) {
        try {
          const [affectedRows] = await AvailableIndexers.update(
            { 
              verified: false, 
              verifiedAt: null
            },
            { 
              where: { 
                name: failed.name 
              } 
            }
          );
          
          if (affectedRows > 0) {
            updated++;
          }
        } catch (err) {
          // Ignore errors for failed updates
        }
      }
      
      console.log(`✅ Updated ${updated} failed indexers\n`);
    }
    
    // Show summary
    const verifiedCount = await AvailableIndexers.count({ where: { verified: true } });
    console.log(`📊 Total verified indexers in database: ${verifiedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVerifiedStatus();

