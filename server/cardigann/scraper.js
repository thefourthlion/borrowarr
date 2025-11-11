/**
 * Cardigann Scraper
 * Main scraper class that coordinates template processing, HTTP requests, and parsing
 */

const axios = require('axios');
const CardigannTemplateEngine = require('./templateEngine');
const CardigannParser = require('./parser');

class CardigannScraper {
  constructor(definition) {
    this.definition = definition;
    this.templateEngine = new CardigannTemplateEngine();
    this.parser = new CardigannParser(definition);
    this.baseUrl = definition.links[0]; // Primary link
    this.settings = {};
  }

  /**
   * Set indexer settings (username, password, sort options, etc.)
   */
  setSettings(settings = {}) {
    this.settings = settings;
    this.templateEngine.setConfig(settings);
  }

  /**
   * Search for torrents
   */
  async search(query, options = {}) {
    try {
      // Set settings if provided
      if (options.settings) {
        this.setSettings(options.settings);
      }

      // Get search path configuration
      const searchConfig = this.definition.search;
      const pathsConfig = searchConfig.paths || [{ path: searchConfig.path }];

      // Build search URL
      const pathConfig = pathsConfig[0]; // Use first path for now
      const pathTemplate = pathConfig.path;

      // Apply keywords filters if defined
      let processedQuery = this.applyKeywordsFilters(query, searchConfig.keywordsfilters);

      // Build URL using template engine
      const searchUrl = this.templateEngine.buildSearchURL(
        this.baseUrl,
        pathTemplate,
        processedQuery,
        options.categoryId,
        options
      );

      console.log(`🔍 [Cardigann] Searching ${this.definition.name}: ${searchUrl}`);

      // Build inputs if defined
      let requestConfig = {
        method: pathConfig.method || 'get',
        url: searchUrl,
        headers: this.buildHeaders(searchConfig.headers),
        timeout: 30000,
        validateStatus: (status) => status < 500,
      };

      // Add inputs as query params or body
      if (searchConfig.inputs) {
        const inputs = this.templateEngine.buildInputs(
          searchConfig.inputs,
          processedQuery,
          options
        );

        if (requestConfig.method.toLowerCase() === 'get') {
          requestConfig.params = inputs;
        } else {
          requestConfig.data = inputs;
        }
      }

      // Make HTTP request
      const response = await axios(requestConfig);

      // Check response type (JSON or HTML)
      const isJSON = pathConfig.response?.type === 'json' || 
                     (typeof response.data === 'object' && response.data !== null);

      let results;

      if (isJSON) {
        // Parse JSON response
        results = this.parser.parseJSON(response.data, this.baseUrl);
      } else {
        // Parse HTML response (pass settings for selector template processing)
        results = this.parser.parseHTML(response.data, this.baseUrl, this.settings);
      }

      // Format results
      const formattedResults = results
        .map(r => this.parser.formatResult(r, this.definition))
        .filter(r => r !== null);

      console.log(`   ✅ [Cardigann] Found ${formattedResults.length} results from ${this.definition.name}`);

      return {
        success: true,
        indexer: this.definition.name,
        indexerId: this.definition.id,
        results: formattedResults,
      };

    } catch (error) {
      console.error(`   ❌ [Cardigann] Error searching ${this.definition.name}:`, error.message);

      return {
        success: false,
        indexer: this.definition.name,
        indexerId: this.definition.id,
        error: error.message,
        results: [],
      };
    }
  }

  /**
   * Apply keywords filters
   */
  applyKeywordsFilters(query, filtersConfig) {
    if (!filtersConfig || filtersConfig.length === 0) {
      return query;
    }

    let result = query;

    for (const filter of filtersConfig) {
      if (filter.name === 're_replace') {
        const [pattern, replacement] = filter.args || [];
        try {
          // Handle (?i) case-insensitive flag
          let flags = 'g';
          let cleanPattern = pattern;
          
          if (pattern.startsWith('(?i)')) {
            flags = 'gi';
            cleanPattern = pattern.substring(4);
          }
          
          const regex = new RegExp(cleanPattern, flags);
          result = result.replace(regex, replacement || '');
        } catch (e) {
          console.error('Keywords filter error:', e.message);
        }
      } else if (filter.name === 'replace') {
        const [search, replacement] = filter.args || [];
        const escaped = (search || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escaped, 'g'), replacement || '');
      } else if (filter.name === 'trim') {
        result = result.trim();
      }
    }

    return result;
  }

  /**
   * Build HTTP headers
   */
  buildHeaders(headersConfig) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
    };

    if (headersConfig) {
      for (const [key, value] of Object.entries(headersConfig)) {
        if (Array.isArray(value)) {
          headers[key] = value[0];
        } else {
          headers[key] = value;
        }
      }
    }

    // Add cookies from settings if available
    if (this.settings.cookie) {
      headers['Cookie'] = this.settings.cookie;
    }

    return headers;
  }

  /**
   * Test connection to indexer
   */
  async test() {
    try {
      const result = await this.search('test');
      return {
        success: result.success,
        resultCount: result.results.length,
        message: result.success ? 'Connection successful' : result.error,
      };
    } catch (error) {
      return {
        success: false,
        resultCount: 0,
        message: error.message,
      };
    }
  }

  /**
   * Get indexer information
   */
  getInfo() {
    return {
      id: this.definition.id,
      name: this.definition.name,
      description: this.definition.description || '',
      language: this.definition.language || 'en-US',
      type: this.definition.type || 'public',
      encoding: this.definition.encoding || 'UTF-8',
      links: this.definition.links || [],
      legacylinks: this.definition.legacylinks || [],
      caps: this.definition.caps || {},
      settings: this.definition.settings || [],
    };
  }
}

module.exports = CardigannScraper;

