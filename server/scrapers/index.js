/**
 * Scraper Manager
 * Main entry point for the scraping system
 */

const DefinitionLoader = require('./engine/definitionLoader');
const Scraper = require('./engine/scraper');

class ScraperManager {
  constructor() {
    this.definitionLoader = new DefinitionLoader();
    this.scrapers = new Map();
    this.initializeScrapers();
  }

  /**
   * Initialize scrapers for all definitions
   */
  initializeScrapers() {
    const definitions = this.definitionLoader.getAllDefinitions();
    
    for (const definition of definitions) {
      const scraper = new Scraper(definition);
      this.scrapers.set(definition.id, scraper);
    }
    
    console.log(`✅ Initialized ${this.scrapers.size} scrapers`);
  }

  /**
   * Get scraper by ID
   */
  getScraper(id) {
    return this.scrapers.get(id);
  }

  /**
   * Get all scrapers
   */
  getAllScrapers() {
    return Array.from(this.scrapers.values());
  }

  /**
   * Get scraper by name
   */
  getScraperByName(name) {
    for (const scraper of this.scrapers.values()) {
      if (scraper.definition.name.toLowerCase() === name.toLowerCase()) {
        return scraper;
      }
    }
    return null;
  }

  /**
   * Search a specific scraper
   */
  async search(scraperId, query, options = {}) {
    const scraper = this.getScraper(scraperId);
    
    if (!scraper) {
      return {
        success: false,
        results: [],
        error: `Scraper not found: ${scraperId}`,
      };
    }
    
    return await scraper.search(query, options);
  }

  /**
   * Search all scrapers
   */
  async searchAll(query, options = {}) {
    const scrapers = this.getAllScrapers();
    const promises = scrapers.map(scraper => scraper.search(query, options));
    
    const results = await Promise.allSettled(promises);
    
    // Combine results
    const combined = {
      results: [],
      indexers: [],
      total: 0,
    };
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        combined.results.push(...result.value.results);
        combined.indexers.push({
          id: result.value.indexerId,
          name: result.value.indexer,
          resultCount: result.value.results.length,
        });
      } else if (result.status === 'rejected' || !result.value.success) {
        const error = result.reason || result.value.error;
        combined.indexers.push({
          id: result.value?.indexerId,
          name: result.value?.indexer || 'Unknown',
          resultCount: 0,
          error: error,
        });
      }
    }
    
    combined.total = combined.results.length;
    
    return combined;
  }

  /**
   * Test a scraper
   */
  async testScraper(scraperId) {
    const scraper = this.getScraper(scraperId);
    
    if (!scraper) {
      return {
        success: false,
        message: `Scraper not found: ${scraperId}`,
      };
    }
    
    return await scraper.test();
  }

  /**
   * Get all available indexers
   */
  getAvailableIndexers() {
    const definitions = this.definitionLoader.getAllDefinitions();
    
    return definitions.map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      language: def.language,
      type: def.type,
      protocol: 'torrent', // All current scrapers are torrent
      links: def.links || [],
      categories: def.caps?.categorymappings?.map(m => m.desc) || [],
    }));
  }

  /**
   * Reload all definitions and scrapers
   */
  reload() {
    this.definitionLoader.reload();
    this.scrapers.clear();
    this.initializeScrapers();
  }
}

// Export singleton instance
module.exports = new ScraperManager();

