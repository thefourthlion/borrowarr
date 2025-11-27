const IMDbParentalGuideScraper = require('../services/imdbParentalGuideScraper');
const { connectDB } = require('../config/database');
require('../models/ParentalGuide');

async function testScraper() {
  console.log('🧪 Testing IMDb Parental Guide Scraper\n');
  
  // Connect to database
  await connectDB();
  
  const scraper = new IMDbParentalGuideScraper();
  
  // Test cases
  const testCases = [
    {
      imdbId: 'tt0773262',
      title: 'Dexter',
      expected: 'Severe',
      mediaType: 'tv'
    },
    {
      imdbId: 'tt0133093',
      title: 'The Matrix',
      expected: 'Mild',
      mediaType: 'movie'
    },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📺 Testing: ${testCase.title} (${testCase.imdbId})`);
    console.log(`Expected nudity severity: ${testCase.expected}`);
    console.log('Scraping...\n');
    
    try {
      const result = await scraper.scrapeParentalGuide(
        testCase.imdbId,
        null,
        testCase.mediaType,
        testCase.title
      );
      
      if (result) {
        console.log('✅ Scrape successful!');
        console.log(`   Has Nudity: ${result.hasNudity}`);
        console.log(`   Nudity Severity: ${result.nuditySeverity}`);
        console.log(`   Nudity Details: ${result.nudityDetails?.substring(0, 100)}...`);
        console.log(`   Violence: ${result.violence}`);
        console.log(`   Profanity: ${result.profanity}`);
        console.log(`   Alcohol: ${result.alcohol}`);
        console.log(`   Frightening: ${result.frightening}`);
        
        if (result.nuditySeverity === testCase.expected) {
          console.log(`   ✅ Severity matches expected value!`);
        } else {
          console.log(`   ❌ ERROR: Expected ${testCase.expected}, got ${result.nuditySeverity}`);
        }
      } else {
        console.log('❌ Scrape failed - no result returned');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    // Wait between requests to respect rate limiting
    if (testCases.indexOf(testCase) < testCases.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next request...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n✅ Test complete!');
  process.exit(0);
}

testScraper().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


