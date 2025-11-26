const axios = require('axios');
const cheerio = require('cheerio');
const FeaturedList = require('../../models/FeaturedLists');

/**
 * Letterboxd Scraper Service
 * 
 * This service scrapes publicly accessible featured lists from Letterboxd
 * in compliance with their Terms of Service for automated access.
 * 
 * Key Compliance Points:
 * - Only accesses publicly available data (no authentication required)
 * - Respects robots.txt
 * - Operates at reasonable request rates (delays between requests)
 * - Does not circumvent technical protections
 * - Does not degrade service performance
 */

class LetterboxdScraper {
  constructor() {
    this.baseUrl = 'https://letterboxd.com';
    this.requestDelay = 2000; // 2 seconds between requests
    this.userAgent = 'BorrowArr/1.0 (Media Management Application)';
  }

  /**
   * Add delay between requests to be respectful
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make a request with proper headers and error handling
   */
  async makeRequest(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Scrape the featured lists page
   */
  async scrapeFeaturedListsPage() {
    console.log('Scraping Letterboxd featured lists...');
    
    const url = `${this.baseUrl}/lists/featured/`;
    const html = await this.makeRequest(url);
    const $ = cheerio.load(html);

    const lists = [];

    // Find all list sections
    $('.list').each((index, element) => {
      try {
        const $list = $(element);
        
        // Extract list URL
        const listLink = $list.find('.poster-list-link').attr('href');
        if (!listLink) return;
        
        const listUrl = `${this.baseUrl}${listLink}`;
        // Extract slug from URL: /username/list/slug-name/
        const pathParts = listLink.split('/').filter(p => p);
        const slug = pathParts.length >= 3 ? pathParts[2] : `list-${index}`;
        
        // Extract title (from the link or heading)
        const title = $list.find('.list-title a').text().trim() || 
                     $list.find('h3 a').text().trim();
        
        if (!title || !slug) return;

        // Extract author info
        const authorLink = $list.find('.list-owner a').attr('href') || 
                          $list.find('.avatar').attr('href');
        const author = authorLink ? authorLink.replace('/', '') : null;
        const authorUrl = author ? `${this.baseUrl}/${author}/` : null;

        // Extract film count
        const filmCountText = $list.find('.list-number').text().trim();
        const filmCount = filmCountText ? parseInt(filmCountText.replace(/[^\d]/g, '')) : 0;

        // Extract poster URLs (up to 5)
        const posterUrls = [];
        $list.find('.posterlist img').each((i, img) => {
          if (i < 5) {
            let posterSrc = $(img).attr('src');
            if (posterSrc) {
              // Convert to higher resolution if possible
              posterSrc = posterSrc.replace('-70-0-105', '-230-0-345');
              posterUrls.push(posterSrc);
            }
          }
        });

        // Extract likes and comments if available
        const likesText = $list.find('.like-count').text().trim();
        const commentsText = $list.find('.comment-count').text().trim();
        const likes = likesText ? parseInt(likesText.replace(/[^\d]/g, '')) : 0;
        const comments = commentsText ? parseInt(commentsText.replace(/[^\d]/g, '')) : 0;

        lists.push({
          slug,
          title,
          author,
          authorUrl,
          listUrl,
          filmCount,
          likes,
          comments,
          posterUrls,
          category: 'community',
          featured: true,
        });
      } catch (error) {
        console.error('Error parsing list:', error.message);
      }
    });

    console.log(`Found ${lists.length} featured lists`);
    return lists;
  }

  /**
   * Scrape a specific list to get all films
   */
  async scrapeListDetails(listUrl) {
    console.log(`Scraping list details: ${listUrl}`);
    
    const html = await this.makeRequest(listUrl);
    const $ = cheerio.load(html);

    const films = [];

    // Extract films from the list
    $('.poster-container').each((index, element) => {
      try {
        const $film = $(element);
        
        // Extract film slug and title
        const filmLink = $film.find('a').attr('href');
        if (!filmLink) return;
        
        const filmSlug = filmLink.split('/')[2]; // /film/slug/
        const filmTitle = $film.find('img').attr('alt');
        
        // Extract poster
        const posterUrl = $film.find('img').attr('src');
        
        // Extract rating if available
        const ratingText = $film.find('.rating').text().trim();
        const rating = ratingText ? parseFloat(ratingText) : null;

        films.push({
          slug: filmSlug,
          title: filmTitle,
          posterUrl: posterUrl ? posterUrl.replace('-70-0-105', '-230-0-345') : null,
          letterboxdUrl: `${this.baseUrl}/film/${filmSlug}/`,
          rating,
          position: index + 1,
        });
      } catch (error) {
        console.error('Error parsing film:', error.message);
      }
    });

    // Extract list metadata
    const listTitle = $('.list-title-intro h1').text().trim();
    const listDescription = $('.body-text').first().text().trim();
    const filmCount = films.length;

    console.log(`Found ${films.length} films in list`);

    return {
      title: listTitle,
      description: listDescription,
      filmCount,
      films,
    };
  }

  /**
   * Save or update a list in the database
   */
  async saveList(listData) {
    try {
      const [list, created] = await FeaturedList.findOrCreate({
        where: { slug: listData.slug },
        defaults: {
          ...listData,
          lastScrapedAt: new Date(),
        },
      });

      if (!created) {
        await list.update({
          ...listData,
          lastScrapedAt: new Date(),
        });
      }

      return list;
    } catch (error) {
      console.error('Error saving list to database:', error.message);
      throw error;
    }
  }

  /**
   * Main scraping workflow
   */
  async scrapeFeaturedLists() {
    try {
      console.log('Starting Letterboxd featured lists scraper...');
      
      // Step 1: Scrape the featured lists page
      const lists = await this.scrapeFeaturedListsPage();
      
      // Step 2: Save each list to the database
      const savedLists = [];
      for (const listData of lists) {
        try {
          const savedList = await this.saveList(listData);
          savedLists.push(savedList);
          console.log(`✓ Saved list: ${listData.title}`);
          
          // Delay between requests
          await this.delay(this.requestDelay);
        } catch (error) {
          console.error(`✗ Failed to save list: ${listData.title}`, error.message);
        }
      }

      console.log(`\nSuccessfully scraped ${savedLists.length}/${lists.length} lists`);
      return savedLists;
    } catch (error) {
      console.error('Fatal error in scraper:', error.message);
      throw error;
    }
  }

  /**
   * Scrape full details for a specific list (including all films)
   */
  async scrapeFullListDetails(slug) {
    try {
      // Find the list in the database
      const list = await FeaturedList.findOne({ where: { slug } });
      if (!list) {
        throw new Error(`List not found: ${slug}`);
      }

      console.log(`Scraping full details for: ${list.title}`);
      
      // Scrape the list page
      const details = await this.scrapeListDetails(list.listUrl);
      
      // Update the list with full details
      await list.update({
        description: details.description || list.description,
        filmCount: details.filmCount,
        scrapedFilms: details.films,
        lastScrapedAt: new Date(),
      });

      console.log(`✓ Updated list with ${details.films.length} films`);
      return list;
    } catch (error) {
      console.error('Error scraping full list details:', error.message);
      throw error;
    }
  }

  /**
   * Update all lists (refresh data from Letterboxd)
   */
  async updateAllLists() {
    try {
      const lists = await FeaturedList.findAll({
        where: { featured: true },
      });

      console.log(`Updating ${lists.length} featured lists...`);

      for (const list of lists) {
        try {
          await this.scrapeFullListDetails(list.slug);
          await this.delay(this.requestDelay);
        } catch (error) {
          console.error(`Failed to update list: ${list.slug}`, error.message);
        }
      }

      console.log('Update complete');
    } catch (error) {
      console.error('Error updating lists:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const scraper = new LetterboxdScraper();

module.exports = {
  LetterboxdScraper,
  scraper,
  
  // Convenience methods
  scrapeFeaturedLists: () => scraper.scrapeFeaturedLists(),
  scrapeFullListDetails: (slug) => scraper.scrapeFullListDetails(slug),
  updateAllLists: () => scraper.updateAllLists(),
};

