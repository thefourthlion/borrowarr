#!/usr/bin/env node

/**
 * Letterboxd Scraper CLI
 * 
 * This script provides a command-line interface to scrape featured lists
 * from Letterboxd in compliance with their Terms of Service.
 * 
 * Usage:
 *   node scripts/scrapeLetterboxd.js [command]
 * 
 * Commands:
 *   featured - Scrape the featured lists page
 *   update   - Update all existing lists with full details
 *   list <slug> - Scrape a specific list by slug
 */

const { scraper } = require('../services/letter-box-scrapper');
require('../models/FeaturedLists'); // Load the model

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  console.log('🎬 Letterboxd Scraper CLI\n');
  
  // Connect to database without syncing (server might already have it synced)
  console.log('📊 Connecting to database...');
  const { sequelize } = require('../config/database');
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }

  try {
    switch (command) {
      case 'featured':
        console.log('📋 Scraping featured lists page (metadata only)...\n');
        await scraper.scrapeFeaturedLists();
        console.log('\n✅ Featured lists scraped successfully!');
        break;

      case 'all':
        console.log('📋 Full scrape: all lists + all films in each list...\n');
        await scraper.scrapeAllListsWithFilms();
        console.log('\n✅ Full scrape complete!');
        break;

      case 'update':
        console.log('🔄 Updating all featured lists with full film data...\n');
        await scraper.updateAllLists();
        console.log('\n✅ All lists updated successfully!');
        break;

      case 'list':
        if (!arg) {
          console.error('❌ Error: Please provide a list slug');
          console.log('Usage: node scripts/scrapeLetterboxd.js list <slug>');
          process.exit(1);
        }
        console.log(`📋 Scraping list (all films): ${arg}\n`);
        await scraper.scrapeFullListDetails(arg);
        console.log('\n✅ List scraped successfully!');
        break;

      default:
        console.log('Usage: node scripts/scrapeLetterboxd.js [command]');
        console.log('\nCommands:');
        console.log('  featured     - Scrape featured lists page (metadata only)');
        console.log('  all          - Full scrape: all lists + ALL films in each list');
        console.log('  update       - Update existing lists with full film data');
        console.log('  list <slug>  - Scrape a specific list (all films, paginated)');
        console.log('\nExamples:');
        console.log('  node scripts/scrapeLetterboxd.js featured');
        console.log('  node scripts/scrapeLetterboxd.js all');
        console.log('  node scripts/scrapeLetterboxd.js list letterboxds-top-500-films');
        process.exit(0);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

