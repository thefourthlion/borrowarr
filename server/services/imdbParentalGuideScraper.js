const axios = require('axios');
const cheerio = require('cheerio');
const ParentalGuide = require('../models/ParentalGuide');

class IMDbParentalGuideScraper {
  constructor() {
    this.baseUrl = 'https://www.imdb.com';
    this.requestDelay = 1500; // 1.5-second delay between requests to be respectful
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}: ${error.message}`);
      throw error;
    }
  }

  parseSeverity(text) {
    if (!text) return 'None';
    
    const lowerText = text.toLowerCase();
    
    // Check for severity indicators
    if (lowerText.includes('severe') || lowerText.includes('graphic') || lowerText.includes('explicit')) {
      return 'Severe';
    }
    if (lowerText.includes('moderate')) {
      return 'Moderate';
    }
    if (lowerText.includes('mild') || lowerText.includes('brief')) {
      return 'Mild';
    }
    if (lowerText.includes('none')) {
      return 'None';
    }
    
    // Default based on presence of content
    return 'Mild';
  }

  extractSeverityFromVotes($, categoryId) {
    // IMDb shows severity based on user votes like "162 of 295 found this mild"
    const voteSection = $(`#${categoryId}`).closest('section');
    
    let maxSeverity = 'None';
    let maxVotes = 0;
    
    // Look for severity labels
    const severities = ['severe', 'moderate', 'mild', 'none'];
    
    severities.forEach(severity => {
      const voteText = voteSection.find(`button:contains("${severity}")`).text() ||
                       voteSection.find(`span:contains("found this ${severity}")`).text();
      
      if (voteText) {
        // Extract vote count (e.g., "162 of 295 found this mild")
        const match = voteText.match(/(\d+)\s+of\s+(\d+)\s+found this\s+(\w+)/i);
        if (match) {
          const votes = parseInt(match[1], 10);
          if (votes > maxVotes) {
            maxVotes = votes;
            maxSeverity = severity.charAt(0).toUpperCase() + severity.slice(1);
          }
        }
      }
    });
    
    return { severity: maxSeverity, votes: maxVotes };
  }

  async scrapeParentalGuide(imdbId, tmdbId = null, mediaType = 'movie', title = null) {
    console.log(`Scraping parental guide for IMDb ID: ${imdbId}`);
    
    const parentalGuideUrl = `${this.baseUrl}/title/${imdbId}/parentalguide`;
    
    try {
      const html = await this.makeRequest(parentalGuideUrl);
      const $ = cheerio.load(html);

      // Extract Sex & Nudity section - handle both old and new IMDb layouts
      const extractSectionData = (sectionName) => {
        let items = [];
        let severity = 'None';
        let votes = 0;

        // Method 1: Look for the section by text content (most reliable for new IMDb)
        let section = null;
        
        // Find section by heading text
        $('h3, h2, h4').each((i, heading) => {
          const headingText = $(heading).text().trim();
          if (headingText.includes(sectionName)) {
            section = $(heading).closest('section');
            if (section.length === 0) {
              // Try finding parent container
              section = $(heading).parent().parent();
            }
            return false; // break
          }
        });

        // Method 2: Look for severity rating in presentation elements
        if (section && section.length > 0) {
          // Search for "Sex & Nudity: Severe" pattern in presentation role elements
          section.find('[role="presentation"]').each((i, elem) => {
            const text = $(elem).attr('name') || $(elem).text();
            if (text && text.includes(sectionName)) {
              // Extract severity from patterns like "Sex & Nudity: Severe"
              const severityMatch = text.match(new RegExp(`${sectionName}:\\s*(\\w+)`, 'i'));
              if (severityMatch) {
                severity = severityMatch[1].charAt(0).toUpperCase() + severityMatch[1].slice(1).toLowerCase();
              }
            }
          });

          // Extract severity badge from signpost
          const severityBadge = section.find('.ipc-signpost__text').first().text().trim();
          if (severityBadge && severity === 'None') {
            severity = this.parseSeverity(severityBadge);
          }

          // Extract vote count
          const voteText = section.find('[data-testid="severity-summary"]').text().trim();
          const voteMatch = voteText.match(/(\d+)\s+of\s+(\d+)\s+found this\s+(\w+)/i);
          if (voteMatch) {
            votes = parseInt(voteMatch[1], 10);
            const voteSeverity = voteMatch[3].charAt(0).toUpperCase() + voteMatch[3].slice(1);
            // Use vote severity if we haven't found severity yet
            if (severity === 'None') {
              severity = voteSeverity;
            }
          }

          // Extract content items
          section.find('[data-testid^="item-"]').each((index, element) => {
            const text = $(element).find('.ipc-html-content-inner-div').text().trim();
            if (text && text.length > 10) {
              items.push(text);
            }
          });

          // Fallback: extract from list items
          if (items.length === 0) {
            section.find('li.ipl-zebra-list__item').each((index, element) => {
              const text = $(element).text().trim();
              if (text && text.length > 10) {
                items.push(text);
              }
            });
          }
        }

        // Method 3: Try old-style ID-based selectors as final fallback
        if (!section || section.length === 0 || severity === 'None') {
          const sectionId = sectionName.toLowerCase().replace(/[^a-z]/g, '');
          const oldSection = $(`#${sectionId}`).parent();
          
          if (oldSection.length > 0) {
            // Look for severity badge
            const severityBadge = oldSection.find('.ipl-status-pill').first().text().trim();
            if (severityBadge) {
              severity = this.parseSeverity(severityBadge);
            }

            // Extract items if we haven't found any yet
            if (items.length === 0) {
              oldSection.find('li.ipl-zebra-list__item').each((index, element) => {
                const text = $(element).text().trim();
                if (text && text.length > 10) {
                  items.push(text);
                }
              });
            }
          }
        }

        console.log(`[${sectionName}] Extracted severity: ${severity}, items: ${items.length}`);
        return { items, severity, votes };
      };

      // Extract Sex & Nudity
      const nudityData = extractSectionData('Sex & Nudity');
      
      // Determine if there's nudity
      const hasNudity = nudityData.items.length > 0 && 
                        !nudityData.items.every(item => 
                          item.toLowerCase().includes('no nudity') || 
                          item.toLowerCase().includes('none')
                        );

      let nuditySeverity = nudityData.severity;
      const nudityVotes = nudityData.votes;

      // If we found nudity items but severity is still None, default to Mild
      if (hasNudity && nuditySeverity === 'None') {
        nuditySeverity = 'Mild';
      }

      const nudityDetails = nudityData.items.slice(0, 5).join(' | '); // Store first 5 items

      // Extract other categories using the same improved method
      const violenceData = extractSectionData('Violence & Gore');
      const profanityData = extractSectionData('Profanity');
      const alcoholData = extractSectionData('Alcohol');
      const frighteningData = extractSectionData('Frightening');

      const violence = violenceData.severity;
      const profanity = profanityData.severity;
      const alcohol = alcoholData.severity;
      const frightening = frighteningData.severity;

      // Save or update in database
      const [parentalGuide, created] = await ParentalGuide.findOrCreate({
        where: { imdbId },
        defaults: {
          imdbId,
          tmdbId,
          mediaType,
          title,
          hasNudity,
          nuditySeverity,
          nudityVotes,
          nudityDetails,
          violence,
          profanity,
          alcohol,
          frightening,
          lastScrapedAt: new Date(),
          scrapedSuccessfully: true,
        },
      });

      if (!created) {
        await parentalGuide.update({
          tmdbId: tmdbId || parentalGuide.tmdbId,
          mediaType: mediaType || parentalGuide.mediaType,
          title: title || parentalGuide.title,
          hasNudity,
          nuditySeverity,
          nudityVotes,
          nudityDetails,
          violence,
          profanity,
          alcohol,
          frightening,
          lastScrapedAt: new Date(),
          scrapedSuccessfully: true,
          errorMessage: null,
        });
      }

      console.log(`✓ Scraped parental guide for ${imdbId}: Nudity=${nuditySeverity}`);
      
      return parentalGuide;
    } catch (error) {
      console.error(`❌ Error scraping parental guide for ${imdbId}: ${error.message}`);
      
      // Save error state
      const [parentalGuide] = await ParentalGuide.findOrCreate({
        where: { imdbId },
        defaults: {
          imdbId,
          tmdbId,
          mediaType,
          title,
          lastScrapedAt: new Date(),
          scrapedSuccessfully: false,
          errorMessage: error.message,
        },
      });

      if (parentalGuide.scrapedSuccessfully === true) {
        // Don't overwrite good data with errors
        return parentalGuide;
      }

      await parentalGuide.update({
        lastScrapedAt: new Date(),
        scrapedSuccessfully: false,
        errorMessage: error.message,
      });

      return null;
    }
  }

  async scrapeMultipleGuides(imdbIds, delayBetween = true) {
    const results = [];
    
    for (const { imdbId, tmdbId, mediaType, title } of imdbIds) {
      try {
        const result = await this.scrapeParentalGuide(imdbId, tmdbId, mediaType, title);
        results.push(result);
        
        if (delayBetween) {
          await this.delay(this.requestDelay);
        }
      } catch (error) {
        console.error(`Failed to scrape ${imdbId}:`, error);
      }
    }
    
    return results;
  }

  async getOrScrapeParentalGuide(imdbId, tmdbId = null, mediaType = 'movie', title = null, forceRefresh = false) {
    if (!imdbId) {
      throw new Error('IMDb ID is required');
    }

    // Check if we already have data
    if (!forceRefresh) {
      const existing = await ParentalGuide.findOne({ where: { imdbId } });
      
      if (existing && existing.scrapedSuccessfully) {
        // Check if data is recent (within 30 days)
        const daysSinceScraped = (new Date() - new Date(existing.lastScrapedAt)) / (1000 * 60 * 60 * 24);
        
        if (daysSinceScraped < 30) {
          console.log(`Using cached parental guide data for ${imdbId}`);
          return existing;
        }
      }
    }

    // Scrape fresh data
    return await this.scrapeParentalGuide(imdbId, tmdbId, mediaType, title);
  }
}

module.exports = IMDbParentalGuideScraper;

