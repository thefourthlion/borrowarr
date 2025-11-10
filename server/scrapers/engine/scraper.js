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
    this.config = {}; // Will be populated from indexer settings
    
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
   * Set config from indexer settings
   */
  setConfig(settings = {}) {
    // Build config from definition settings defaults and provided settings
    this.config = {};
    
    if (this.definition.settings) {
      for (const setting of this.definition.settings) {
        // Use provided setting value or default
        this.config[setting.name] = settings[setting.name] !== undefined 
          ? settings[setting.name] 
          : (setting.default !== undefined ? setting.default : '');
      }
    }
    
    // Also merge any additional settings directly
    Object.assign(this.config, settings);
  }

  /**
   * Apply keywords filters
   */
  applyKeywordsFilters(query) {
    if (!this.definition.search || !this.definition.search.keywordsfilters) {
      return query;
    }
    
    let result = query;
    
    for (const filter of this.definition.search.keywordsfilters) {
      if (filter.name === 're_replace' && filter.args && filter.args.length >= 2) {
        const regex = new RegExp(filter.args[0], 'g');
        result = result.replace(regex, filter.args[1]);
      } else if (filter.name === 'replace' && filter.args && filter.args.length >= 2) {
        // Simple string replace - escape special regex chars
        const search = filter.args[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(search, 'g'), filter.args[1]);
      } else if (filter.name === 'trim') {
        result = result.trim();
      }
    }
    
    return result;
  }

  /**
   * Build search URL with query
   */
  buildSearchURL(query, categoryId = null) {
    const searchConfig = this.definition.search;
    const pathTemplate = searchConfig.paths[0].path;
    
    // Apply keywords filters first
    let processedQuery = this.applyKeywordsFilters(query);
    
    // Replace template variables
    let url = pathTemplate.replace(/\{\{\s*\.Keywords\s*\}\}/g, encodeURIComponent(processedQuery));
    url = url.replace(/\{\{\s*\.Query\s*\}\}/g, encodeURIComponent(processedQuery));
    
    // Handle .Config variables
    url = url.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, configKey) => {
      return this.config[configKey] || '';
    });
    
    // Handle conditional blocks {{ if .Keywords }}...{{ else }}...{{ end }}
    url = url.replace(/\{\{\s*if\s+\.Keywords\s*\}\}([^{]*?)\{\{\s*else\s*\}\}([^{]*?)\{\{\s*end\s*\}\}/g, (match, ifBlock, elseBlock) => {
      return processedQuery ? ifBlock : elseBlock;
    });
    
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
    // Set config from options.settings
    if (options.settings) {
      this.setConfig(options.settings);
    } else {
      // Use defaults from definition
      this.setConfig({});
    }
    
    // If this is an RSS-based indexer, use RSS scraper
    if (this.isRSS && this.rssScraper) {
      return await this.rssScraper.search(query, options);
    }
    
    // If this is an API-based indexer, use API scraper
    if (this.isAPI && this.apiScraper) {
      return await this.apiScraper.search(query, options);
    }
    
    // Check if this is a JSON response type
    const searchConfig = this.definition.search;
    const isJSONResponse = searchConfig.paths && searchConfig.paths[0] && 
                          searchConfig.paths[0].response && 
                          searchConfig.paths[0].response.type === 'json';
    
    // Otherwise, use HTML scraping
    try {
      // Get all available links (main links + legacy links)
      const allLinks = [
        ...(this.definition.links || []),
        ...(this.definition.legacylinks || [])
      ];
      
      let lastError = null;
      let html = null;
      
      // Try each link until one works
      for (let linkIndex = 0; linkIndex < allLinks.length; linkIndex++) {
        const currentBaseUrl = allLinks[linkIndex];
        this.baseUrl = currentBaseUrl;
        
        try {
          const searchURL = this.buildSearchURL(query, options.categoryId);
          
          if (linkIndex === 0) {
            console.log(`🔍 Searching ${this.definition.name}: ${searchURL}`);
          } else {
            console.log(`   🔄 Trying alternative link ${linkIndex + 1}/${allLinks.length}: ${searchURL}`);
          }
          
          let response;
          
          try {
            // Build headers from definition or use defaults
            const headers = {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
              'Accept': isJSONResponse ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            };
            
            // Add custom headers from definition (like cookies)
            if (this.definition.search && this.definition.search.headers) {
              if (this.definition.search.headers.cookie) {
                // Handle cookie as array or string
                const cookies = Array.isArray(this.definition.search.headers.cookie) 
                  ? this.definition.search.headers.cookie[0] 
                  : this.definition.search.headers.cookie;
                headers['Cookie'] = cookies;
              }
              // Merge other custom headers
              Object.assign(headers, this.definition.search.headers);
            }
            
            // Try normal request first
            response = await axios.get(searchURL, {
              headers: headers,
              timeout: 30000, // Increased timeout for Cloudflare sites
              maxRedirects: 5,
              validateStatus: (status) => status < 500, // Don't throw on 4xx
            });
            
            html = response.data;
            
            // If JSON response, parse it directly
            if (isJSONResponse || (typeof response.data === 'object' && response.data !== null)) {
              return this.parseJSONResponse(response.data, query);
            }
            
            // Check if Cloudflare blocked us
            if (cloudflareHandler.isCloudflareBlocked(html)) {
              console.log(`   ⚠️  Cloudflare protection detected on ${currentBaseUrl}, trying next link...`);
              lastError = new Error(`Cloudflare protection detected on ${currentBaseUrl}`);
              continue; // Try next link
            }
            
            // Check if we got a valid response (not 404, etc)
            if (response.status === 404) {
              console.log(`   ⚠️  404 Not Found on ${currentBaseUrl}, trying next link...`);
              lastError = new Error(`404 Not Found on ${currentBaseUrl}`);
              continue; // Try next link
            }
            
            // Success! Break out of loop
            break;
            
          } catch (error) {
            // If it's a Cloudflare error, try next link
            if (error.response && cloudflareHandler.isCloudflareBlocked(error.response.data)) {
              console.log(`   ⚠️  Cloudflare protection detected in error response on ${currentBaseUrl}, trying next link...`);
              lastError = error;
              continue; // Try next link
            }
            
            // If it's a network error or timeout, try next link
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
              console.log(`   ⚠️  Connection error on ${currentBaseUrl} (${error.code}), trying next link...`);
              lastError = error;
              continue; // Try next link
            }
            
            // For other errors, try FlareSolverr if enabled, otherwise try next link
            if (cloudflareHandler.enabled) {
              try {
                console.log(`   🔓 Attempting FlareSolverr bypass for ${currentBaseUrl}...`);
                const cfResult = await cloudflareHandler.solveWithFlareSolverr(searchURL);
                html = cfResult.html;
                console.log(`   ✅ Cloudflare bypass successful!`);
                break; // Success, exit loop
              } catch (cfError) {
                console.log(`   ⚠️  FlareSolverr failed, trying next link...`);
                lastError = cfError;
                continue; // Try next link
              }
            } else {
              lastError = error;
              continue; // Try next link
            }
          }
        } catch (error) {
          lastError = error;
          continue; // Try next link
        }
      }
      
      // If we exhausted all links, throw the last error
      if (!html && lastError) {
        throw lastError;
      }
      
      // If we still don't have HTML after trying all links, throw error
      if (!html) {
        throw new Error(`All ${allLinks.length} links failed. Last error: ${lastError?.message || 'Unknown error'}`);
      }

      // Load HTML into selector engine
      this.selectorEngine.loadHTML(html);
      
      // Debug: Save HTML snippet for debugging (first 2000 chars)
      if (process.env.DEBUG_SCRAPER === 'true') {
        console.log(`   🔍 HTML snippet (first 2000 chars):`, html.substring(0, 2000));
      }
      
      // Extract rows
      const results = this.extractResults();
      
      if (results.length === 0 && process.env.DEBUG_SCRAPER === 'true') {
        console.warn(`   ⚠️  No results extracted. Selector: ${this.definition.search.rows.selector}`);
        // Try to find if the page has any content
        const bodyText = this.selectorEngine.$('body').text().substring(0, 500);
        console.log(`   🔍 Page content preview:`, bodyText);
      }
      
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
   * Parse JSON response (for indexers like The Pirate Bay that use JSON APIs)
   */
  parseJSONResponse(jsonData, query) {
    try {
      const rowsConfig = this.definition.search.rows;
      const fieldsConfig = this.definition.search.fields;
      
      // Get the array of results - selector "$" means the root array
      let resultsArray = jsonData;
      if (Array.isArray(jsonData)) {
        resultsArray = jsonData;
      } else if (jsonData && typeof jsonData === 'object') {
        // Try to find an array in the response
        resultsArray = Object.values(jsonData).find(val => Array.isArray(val)) || [];
      }
      
      if (!Array.isArray(resultsArray) || resultsArray.length === 0) {
        console.warn(`   ⚠️  No results found in JSON response`);
        return {
          success: true,
          results: [],
          indexer: this.definition.name,
          indexerId: this.definition.id,
        };
      }
      
      console.log(`   📊 Found ${resultsArray.length} results in JSON`);
      
      // Extract data from each result
      const results = [];
      for (let i = 0; i < resultsArray.length; i++) {
        const item = resultsArray[i];
        try {
          const result = this.extractJSONRow(item, fieldsConfig);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          console.error(`   ❌ Error extracting JSON row ${i}:`, error.message);
        }
      }
      
      console.log(`   ✅ Successfully parsed ${results.length} results from ${this.definition.name}`);
      
      return {
        success: true,
        results,
        indexer: this.definition.name,
        indexerId: this.definition.id,
      };
    } catch (error) {
      console.error(`   ❌ Error parsing JSON response:`, error.message);
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
   * Extract data from a single JSON row
   */
  extractJSONRow(item, fieldsConfig) {
    const data = {};
    
    // Extract each field using JSON path notation (simple dot notation)
    for (const [fieldName, fieldConfig] of Object.entries(fieldsConfig)) {
      let value = null;
      
      if (typeof fieldConfig === 'string') {
        // Simple selector like "name" or "id"
        value = this.getJSONValue(item, fieldConfig);
      } else if (fieldConfig.selector) {
        value = this.getJSONValue(item, fieldConfig.selector);
      } else if (fieldConfig.text) {
        // Static text value
        value = fieldConfig.text;
      }
      
      // Apply filters if specified
      if (value !== null && fieldConfig.filters) {
        value = this.filterEngine.applyFilters(value, fieldConfig.filters);
      }
      
      data[fieldName] = value;
    }
    
    // Post-process the data
    return this.formatResult(data);
  }

  /**
   * Get value from JSON object using dot notation path
   */
  getJSONValue(obj, path) {
    if (!path || !obj) return null;
    
    // Handle simple field names
    if (path.indexOf('.') === -1 && path.indexOf('[') === -1) {
      return obj[path] !== undefined ? obj[path] : null;
    }
    
    // Handle dot notation paths like "data.movies" or "..title" (parent)
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (part === '..') {
        // Parent selector - not applicable in flat JSON
        continue;
      } else if (part === '' && i === 0) {
        // Root selector
        continue;
      } else if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return current !== undefined ? current : null;
  }

  /**
   * Extract results from loaded HTML
   */
  extractResults() {
    const rowsConfig = this.definition.search.rows;
    const fieldsConfig = this.definition.search.fields;
    
    // Find all result rows
    let rows = this.selectorEngine.findAll(rowsConfig.selector);
    
    if (rows.length === 0) {
      console.warn(`   ⚠️  No rows found with selector: ${rowsConfig.selector}`);
      
      // Debug info only if DEBUG_SCRAPER is enabled
      if (process.env.DEBUG_SCRAPER === 'true') {
        const tables = this.selectorEngine.$('table.forum_header_border');
        console.log(`   🔍 Found ${tables.length} table.forum_header_border elements`);
        const simpleRows = this.selectorEngine.$('tr[name="hover"]');
        console.log(`   🔍 Found ${simpleRows.length} tr[name="hover"] elements`);
        const allRows = this.selectorEngine.$('tr');
        console.log(`   🔍 Found ${allRows.length} total tr elements`);
      }
      
      return [];
    }
    
    console.log(`   📊 Found ${rows.length} rows`);
    
    // Apply row filters if specified
    if (rowsConfig.filters) {
      for (const filter of rowsConfig.filters) {
        if (filter.name === 'andmatch') {
          // Filter rows that match all parts of a comma-separated selector
          // This is used for selectors like "selector1, selector2" where we want elements matching both
          // In practice, cheerio already handles comma-separated selectors as OR, so this filter
          // is mainly for compatibility. We'll keep all rows since cheerio handles it.
          // The selector engine already finds elements matching any part of comma-separated selectors
        }
      }
    }
    
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
      // Handle .Config variables in field configs
      let processedConfig = this.processConfigVariables(fieldConfig);
      
      let value = null;
      
      // Handle text field (static value)
      if (processedConfig.text) {
        value = processedConfig.text;
      } else {
        // Execute selector
        value = this.selectorEngine.executeSelector(row, processedConfig);
      }
      
      // Apply default if value is null/empty and default is specified
      if ((value === null || value === '') && processedConfig.default) {
        value = processedConfig.default;
      }
      
      // Apply filters if specified
      if (value && processedConfig.filters) {
        value = this.filterEngine.applyFilters(value, processedConfig.filters);
      }
      
      // Skip optional fields that are null/empty (use default if provided)
      if (processedConfig.optional && (value === null || value === '')) {
        value = processedConfig.default || null;
      }
      
      data[fieldName] = value;
    }
    
    // Debug first row (only if DEBUG_SCRAPER is enabled)
    if (!this._debugged && process.env.DEBUG_SCRAPER === 'true') {
      console.log(`   🔍 Debug first row data:`, JSON.stringify(data, null, 2));
      const rowHTML = row.html ? row.html().substring(0, 500) : 'N/A';
      console.log(`   🔍 First row HTML (first 500 chars):`, rowHTML);
      this._debugged = true;
    }
    
    // Post-process the data
    return this.formatResult(data);
  }

  /**
   * Process .Config variables in field configs
   */
  processConfigVariables(config) {
    if (!config) return config;
    
    // Create a copy to avoid mutating the original
    const processed = JSON.parse(JSON.stringify(config));
    
    // Process selector strings
    if (processed.selector && typeof processed.selector === 'string') {
      processed.selector = processed.selector.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, configKey) => {
        return this.config[configKey] || '';
      });
    }
    
    // Process text templates
    if (processed.text && typeof processed.text === 'string') {
      processed.text = processed.text.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, configKey) => {
        return this.config[configKey] || '';
      });
    }
    
    // Process default templates
    if (processed.default && typeof processed.default === 'string') {
      processed.default = processed.default.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, configKey) => {
        return this.config[configKey] || '';
      });
    }
    
    return processed;
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
    
    // Parse date - try timeago filter first, then moment
    let publishDate = null;
    if (data.date) {
      try {
        // Clean up the date string
        let dateStr = String(data.date).trim();
        
        // Try timeago filter (handles "X ago" format)
        if (dateStr.includes('ago') || /^\d+\s*(mo|month|mon|y|year|yr|d|day|w|week|wk|h|hour|hr|m|min|minute|s|sec|second)/i.test(dateStr)) {
          // If it doesn't have "ago", add it for timeago filter
          if (!dateStr.includes('ago')) {
            dateStr = dateStr + ' ago';
          }
          publishDate = this.filterEngine.timeagoFilter(dateStr);
        }
        
        // If timeago didn't work, try moment
        if (!publishDate) {
          const parsed = moment(dateStr);
          if (parsed.isValid()) {
            publishDate = parsed.toISOString();
          }
        }
      } catch (e) {
        // Ignore date parse errors
        console.warn(`   ⚠️  Date parse error for "${data.date}":`, e.message);
      }
    }
    
    // Parse numbers - handle "-" and other non-numeric values
    let seeders = 0;
    if (data.seeders && data.seeders !== '-' && data.seeders !== 'N/A') {
      const parsed = parseInt(data.seeders.toString().replace(/[^0-9]/g, ''));
      seeders = isNaN(parsed) ? 0 : parsed;
    }
    
    let leechers = 0;
    if (data.leechers && data.leechers !== '-' && data.leechers !== 'N/A') {
      const parsed = parseInt(data.leechers.toString().replace(/[^0-9]/g, ''));
      leechers = isNaN(parsed) ? 0 : parsed;
    }
    
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
    
    // Generate a unique ID for this result
    const resultId = `${this.definition.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: resultId,
      protocol: 'torrent',
      indexer: this.definition.name,
      indexerId: 0, // Will be set by search service based on actual indexer ID
      indexerPriority: 25, // Default priority, will be overridden by search service
      
      title: data.title || '',
      size: sizeBytes / (1024 * 1024 * 1024), // Convert bytes to GiB for sorting (matches parseIndexerResponse format)
      sizeFormatted: SizeParser.format(sizeBytes),
      
      publishDate: publishDate ? publishDate : new Date().toISOString(),
      age: age,
      ageFormatted: this.formatAge(age),
      
      seeders: seeders,
      leechers: leechers,
      peers: seeders > 0 || leechers > 0 ? `${seeders}/${leechers}` : null,
      grabs: grabs,
      
      downloadUrl: downloadUrl || '',
      guid: detailsUrl || downloadUrl || resultId,
      description: data.description || data.category || '',
      
      categories: this.mapCategories(data.category),
    };
  }

  /**
   * Map site category to Torznab categories
   */
  mapCategories(siteCategory) {
    if (!siteCategory) return [8000]; // Other
    
    const mappings = this.definition.caps?.categorymappings || [];
    
    // Handle numeric categories (like EZTV uses "1" for TV)
    if (typeof siteCategory === 'number' || (typeof siteCategory === 'string' && /^\d+$/.test(siteCategory))) {
      const categoryNum = typeof siteCategory === 'number' ? siteCategory : parseInt(siteCategory);
      // Find mapping by id
      for (const mapping of mappings) {
        if (mapping.id === categoryNum || mapping.id === String(categoryNum)) {
          // Map to Torznab category based on cat field
          if (mapping.cat === 'TV') return [5000];
          if (mapping.cat === 'Movies') return [2000];
          if (mapping.cat === 'Audio') return [3000];
          if (mapping.cat === 'Console') return [4000];
          if (mapping.cat === 'PC/0day') return [4000];
          if (mapping.cat === 'Books/EBook') return [7000];
          return [8000]; // Other
        }
      }
    }
    
    // Handle string categories
    const categoryStr = String(siteCategory).toLowerCase();
    
    for (const mapping of mappings) {
      const descLower = String(mapping.desc || '').toLowerCase();
      if (descLower.includes(categoryStr) || categoryStr.includes(descLower)) {
        // Map to Torznab category based on cat field
        if (mapping.cat === 'TV') return [5000];
        if (mapping.cat === 'Movies') return [2000];
        if (mapping.cat === 'Audio') return [3000];
        if (mapping.cat === 'Console') return [4000];
        if (mapping.cat === 'PC/0day') return [4000];
        if (mapping.cat === 'Books/EBook') return [7000];
        return [8000]; // Other
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


