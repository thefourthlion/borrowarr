/**
 * Scraper Engine
 * Main scraping logic that uses definitions to extract data
 */

const axios = require('axios');
const SelectorEngine = require('./selectorEngine');
const FilterEngine = require('../filters');
const SizeParser = require('../filters/sizeParser');
const cloudflareHandler = require('./cloudflareHandler');
const moment = require('moment');

class Scraper {
  constructor(definition) {
    this.definition = definition;
    this.selectorEngine = new SelectorEngine();
    this.filterEngine = new FilterEngine();
    this.baseUrl = definition.links[0]; // Use first link as default
    
    // Check if this is an API-based indexer
    this.isAPI = !!definition.api;
    if (this.isAPI) {
      const APIScraper = require('./apiScraper');
      this.apiScraper = new APIScraper(definition);
    }
    
    // Check if this is an RSS-based indexer
    this.isRSS = !!definition.rss || (definition.api && definition.rss);
    if (this.isRSS) {
      const RSSScraper = require('./rssScraper');
      this.rssScraper = new RSSScraper(definition);
    }
  }

  /**
   * Build search URL with query
   */
  buildSearchURL(query, categoryId = null) {
    const searchConfig = this.definition.search;
    const pathTemplate = searchConfig.paths[0].path;
    
    // Replace template variables
    let url = pathTemplate.replace(/\{\{\s*\.Keywords\s*\}\}/g, encodeURIComponent(query));
    url = url.replace(/\{\{\s*\.Query\s*\}\}/g, encodeURIComponent(query));
    
    // Handle category
    if (categoryId && pathTemplate.includes('{{.Category}}')) {
      url = url.replace(/\{\{\s*\.Category\s*\}\}/g, categoryId);
    }
    
    return this.baseUrl + url;
  }

  /**
   * Perform search
   */
  async search(query, options = {}) {
    // If this is an RSS-based indexer, use RSS scraper
    if (this.isRSS && this.rssScraper) {
      return await this.rssScraper.search(query, options);
    }
    
    // If this is an API-based indexer, use API scraper
    if (this.isAPI && this.apiScraper) {
      return await this.apiScraper.search(query, options);
    }
    
    // Otherwise, use HTML scraping
    try {
      const searchURL = this.buildSearchURL(query, options.categoryId);
      
      console.log(`🔍 Searching ${this.definition.name}: ${searchURL}`);
      
      let html;
      let response;
      
      try {
        // Try normal request first
        response = await axios.get(searchURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 30000, // Increased timeout for Cloudflare sites
          maxRedirects: 5,
        });
        
        html = response.data;
        
        // Check if Cloudflare blocked us
        if (cloudflareHandler.isCloudflareBlocked(html)) {
          console.log(`   ⚠️  Cloudflare protection detected, attempting bypass...`);
          
          // Try FlareSolverr
          try {
            const cfResult = await cloudflareHandler.solveWithFlareSolverr(searchURL, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              },
            });
            
            html = cfResult.html;
            console.log(`   ✅ Cloudflare bypass successful!`);
          } catch (cfError) {
            console.error(`   ❌ Cloudflare bypass failed: ${cfError.message}`);
            throw new Error(`Cloudflare protection detected. Install FlareSolverr: docker run -d --name=flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest`);
          }
        }
      } catch (error) {
        // If it's a Cloudflare error, try bypass
        if (error.response && cloudflareHandler.isCloudflareBlocked(error.response.data)) {
          console.log(`   ⚠️  Cloudflare protection detected in error response, attempting bypass...`);
          
          try {
            const cfResult = await cloudflareHandler.solveWithFlareSolverr(searchURL);
            html = cfResult.html;
            console.log(`   ✅ Cloudflare bypass successful!`);
          } catch (cfError) {
            throw new Error(`Cloudflare protection detected. Install FlareSolverr: docker run -d --name=flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest`);
          }
        } else {
          throw error;
        }
      }

      // Load HTML into selector engine
      this.selectorEngine.loadHTML(html);
      
      // Extract rows
      const results = this.extractResults();
      
      console.log(`   ✅ Found ${results.length} results from ${this.definition.name}`);
      
      return {
        success: true,
        results,
        indexer: this.definition.name,
        indexerId: this.definition.id,
      };
    } catch (error) {
      console.error(`   ❌ Error searching ${this.definition.name}:`, error.message);
      
      return {
        success: false,
        results: [],
        indexer: this.definition.name,
        indexerId: this.definition.id,
        error: error.message,
      };
    }
  }

  /**
   * Extract results from loaded HTML
   */
  extractResults() {
    const rowsConfig = this.definition.search.rows;
    const fieldsConfig = this.definition.search.fields;
    
    // Find all result rows
    const rows = this.selectorEngine.findAll(rowsConfig.selector);
    
    if (rows.length === 0) {
      console.warn(`   ⚠️  No rows found with selector: ${rowsConfig.selector}`);
      return [];
    }
    
    console.log(`   📊 Found ${rows.length} rows`);
    
    // Extract data from each row
    const results = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const result = this.extractRow(row, fieldsConfig);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`   ❌ Error extracting row ${i}:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Extract data from a single row
   */
  extractRow(row, fieldsConfig) {
    const data = {};
    
    // Extract each field
    for (const [fieldName, fieldConfig] of Object.entries(fieldsConfig)) {
      let value = this.selectorEngine.executeSelector(row, fieldConfig);
      
      // Apply filters if specified
      if (value && fieldConfig.filters) {
        value = this.filterEngine.applyFilters(value, fieldConfig.filters);
      }
      
      data[fieldName] = value;
    }
    
    // Debug first row to see what we're getting
    if (!this._debugged) {
      console.log(`   🔍 Debug first row data:`, JSON.stringify(data, null, 2));
      this._debugged = true;
    }
    
    // Post-process the data
    return this.formatResult(data);
  }

  /**
   * Format result into standardized structure
   */
  formatResult(data) {
    // Skip if no title or download URL
    if (!data.title || (!data.download && !data.magnet)) {
      console.warn(`   ⚠️  Skipping result: missing title or download URL`);
      return null;
    }
    
    // Parse size
    let sizeBytes = 0;
    if (data.size) {
      sizeBytes = SizeParser.parse(data.size);
    }
    
    // Parse date
    let publishDate = null;
    if (data.date) {
      try {
        const parsed = moment(data.date);
        if (parsed.isValid()) {
          publishDate = parsed.toISOString();
        }
      } catch (e) {
        // Ignore date parse errors
      }
    }
    
    // Parse numbers
    const seeders = parseInt(data.seeders) || 0;
    const leechers = parseInt(data.leechers) || 0;
    const grabs = parseInt(data.grabs) || 0;
    
    // Build full URLs - prefer magnet over download link
    let downloadUrl = data.magnet || data.download;
    if (downloadUrl && !downloadUrl.startsWith('http') && !downloadUrl.startsWith('magnet:')) {
      downloadUrl = this.baseUrl + downloadUrl;
    }
    
    let detailsUrl = data.details;
    if (detailsUrl && !detailsUrl.startsWith('http')) {
      detailsUrl = this.baseUrl + detailsUrl;
    }
    
    // Calculate age
    const age = publishDate ? Math.floor((Date.now() - new Date(publishDate).getTime()) / 1000 / 60 / 60 / 24) : 0;
    
    return {
      id: `${this.definition.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      protocol: 'torrent',
      indexer: this.definition.name,
      indexerId: this.definition.id,
      
      title: data.title,
      size: sizeBytes,
      sizeFormatted: SizeParser.format(sizeBytes),
      
      publishDate: publishDate,
      age: age,
      ageFormatted: this.formatAge(age),
      
      seeders: seeders,
      leechers: leechers,
      peers: seeders > 0 || leechers > 0 ? `${seeders}/${leechers}` : null,
      grabs: grabs,
      
      downloadUrl: downloadUrl,
      guid: detailsUrl || downloadUrl,
      
      category: data.category || 'Other',
      categories: this.mapCategories(data.category),
    };
  }

  /**
   * Map site category to Torznab categories
   */
  mapCategories(siteCategory) {
    if (!siteCategory) return [8000]; // Other
    
    const mappings = this.definition.caps?.categorymappings || [];
    const categoryLower = siteCategory.toLowerCase();
    
    for (const mapping of mappings) {
      if (mapping.desc.toLowerCase().includes(categoryLower) || 
          categoryLower.includes(mapping.desc.toLowerCase())) {
        return [mapping.id * 1000]; // Convert to Torznab ID
      }
    }
    
    return [8000]; // Default to Other
  }

  /**
   * Format age in human-readable format
   */
  formatAge(days) {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  /**
   * Test if scraper is working
   */
  async test() {
    try {
      const results = await this.search('test');
      return {
        success: results.success,
        resultCount: results.results.length,
        message: results.success ? 'Connection successful' : results.error,
      };
    } catch (error) {
      return {
        success: false,
        resultCount: 0,
        message: error.message,
      };
    }
  }
}

module.exports = Scraper;

