/**
 * Cardigann Scraper Engine for Node.js
 * Complete implementation compatible with Prowlarr's Cardigann YAML definitions
 */

const CardigannLoader = require('./loader');
const CardigannScraper = require('./scraper');
const CardigannTemplateEngine = require('./templateEngine');
const CardigannFilterEngine = require('./filterEngine');
const CardigannParser = require('./parser');

class CardigannEngine {
  constructor(definitionsPath) {
    this.loader = new CardigannLoader(definitionsPath);
    this.scrapers = new Map();
  }

  /**
   * Get or create a scraper for an indexer
   */
  getScraper(indexerId) {
    if (this.scrapers.has(indexerId)) {
      return this.scrapers.get(indexerId);
    }

    const definition = this.loader.getDefinition(indexerId);
    if (!definition) {
      throw new Error(`Indexer definition not found: ${indexerId}`);
    }

    const scraper = new CardigannScraper(definition);
    this.scrapers.set(indexerId, scraper);
    return scraper;
  }

  /**
   * Search across one or multiple indexers
   */
  async search(indexerIds, query, options = {}) {
    const ids = Array.isArray(indexerIds) ? indexerIds : [indexerIds];
    const results = [];

    for (const id of ids) {
      try {
        const scraper = this.getScraper(id);
        const result = await scraper.search(query, options);
        results.push(result);
      } catch (error) {
        console.error(`Error searching indexer ${id}:`, error.message);
        results.push({
          success: false,
          indexerId: id,
          error: error.message,
          results: []
        });
      }
    }

    return results;
  }

  /**
   * Get all available indexers
   */
  getAllIndexers() {
    return this.loader.getAllDefinitions();
  }

  /**
   * Get indexer by ID
   */
  getIndexer(id) {
    return this.loader.getDefinition(id);
  }

  /**
   * Search indexers by name
   */
  searchIndexers(query) {
    return this.loader.searchDefinitions(query);
  }

  /**
   * Reload definitions (for development)
   */
  reload() {
    this.loader.reload();
    this.scrapers.clear();
  }
}

module.exports = {
  CardigannEngine,
  CardigannLoader,
  CardigannScraper,
  CardigannTemplateEngine,
  CardigannFilterEngine,
  CardigannParser
};

