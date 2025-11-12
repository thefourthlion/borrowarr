/**
 * Cardigann Parser
 * Parses HTML/JSON responses using CSS selectors and field definitions
 */

const cheerio = require('cheerio');
const CardigannFilterEngine = require('./filterEngine');

class CardigannParser {
  constructor(definition) {
    this.definition = definition;
    this.filterEngine = new CardigannFilterEngine();
    this.$ = null;
  }

  /**
   * Load HTML content for parsing
   */
  loadHTML(html) {
    this.$ = cheerio.load(html, {
      xml: false,
      decodeEntities: true,
    });
  }

  /**
   * Parse HTML response
   */
  parseHTML(html, baseUrl, config = {}) {
    // Apply preprocessing filters (like Prowlarr lines 240-245)
    const preprocessingFilters = this.definition.search?.preprocessingfilters;
    if (preprocessingFilters && preprocessingFilters.length > 0) {
      html = this.filterEngine.applyFilters(html, preprocessingFilters);
    }

    this.loadHTML(html);
    
    const rowsConfig = this.definition.search.rows;
    const fieldsConfig = this.definition.search.fields;
    
    // Find all result rows
    let selector = rowsConfig.selector || rowsConfig;
    
    // Process template syntax in selector if config is provided
    if (typeof selector === 'string') {
      // Always process template syntax (even if config is empty, to remove conditionals)
      // Handle nested templates by processing multiple times
      let maxIterations = 10;
      let iteration = 0;
      let prevSelector = selector;
      
      while (iteration < maxIterations) {
        // Handle {{ if .Config.X }}...{{ else }}...{{ end }}
        selector = selector.replace(/\{\{\s*if\s+\.Config\.(\w+)\s*\}\}([^{}]*?(?:\{[^{}]*\}[^{}]*?)*?)\{\{\s*else\s*\}\}([^{}]*?(?:\{[^{}]*\}[^{}]*?)*?)\{\{\s*end\s*\}\}/gs, 
          (match, configKey, ifBlock, elseBlock) => {
            const hasValue = config && config[configKey];
            return hasValue ? ifBlock : elseBlock;
          });
        
        // Handle {{ .Config.X }}
        selector = selector.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, configKey) => {
          return (config && config[configKey]) || '';
        });
        
        // If no changes, we're done
        if (selector === prevSelector) {
          break;
        }
        prevSelector = selector;
        iteration++;
      }
    }
    
    const rows = this.$(selector);
    
    if (rows.length === 0) {
      return [];
    }
    
    // Handle row merging for "after" config (like Prowlarr lines 258-279)
    const rowsArray = rows.toArray();
    const after = rowsConfig.after || 0;
    
    if (after > 0) {
      for (let i = 0; i < rowsArray.length; i++) {
        const currentRow = this.$(rowsArray[i]);
        
        // Merge the next 'after' rows into this one
        for (let j = 1; j <= after && (i + j) < rowsArray.length; j++) {
          const mergeRow = this.$(rowsArray[i + j]);
          currentRow.append(mergeRow.children());
        }
        
        // Remove merged rows
        for (let j = 1; j <= after && (i + j) < rowsArray.length; j++) {
          this.$(rowsArray[i + j]).remove();
        }
      }
    }
    
    const results = [];
    const variables = {}; // Track variables like Prowlarr (line 63)
    
    rows.each((index, rowElement) => {
      try {
        const row = this.$(rowElement);
        const result = this.parseRow(row, fieldsConfig, baseUrl, config, variables);
        
        // Apply row filters (like Prowlarr lines 340-346)
        if (this.shouldSkipRow(result, rowsConfig.filters, variables)) {
          return; // Skip this row
        }
        
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error parsing row ${index}:`, error.message);
      }
    });
    
    return results;
  }

  /**
   * Parse a single row (with field modifiers like Prowlarr lines 290-338)
   */
  parseRow(row, fieldsConfig, baseUrl, config = {}, variables = {}) {
    const data = {};
    
    for (let [fullFieldName, fieldConfig] of Object.entries(fieldsConfig)) {
      try {
        // Parse field name and modifiers (like Prowlarr lines 290-296)
        const fieldParts = fullFieldName.split('|');
        const fieldName = fieldParts[0];
        const fieldModifiers = fieldParts.slice(1);
        
        // Check if field is optional
        const isOptional = fieldModifiers.includes('optional') || fieldConfig.optional;
        
        // Track variable key for use in templates
        const variablesKey = `.Result.${fieldName}`;
        
        try {
          let value = this.extractField(row, fieldConfig, baseUrl, config);
          
          // If optional and empty, use default value (like Prowlarr lines 306-316)
          if (isOptional && !value) {
            const defaultValue = fieldConfig.default || '';
            // Process template in default value
            const processedDefault = this.processTemplateInValue(defaultValue, config, variables);
            value = processedDefault || null;
            
            if (!value) {
              variables[variablesKey] = null;
              continue; // Skip this field
            }
          }
          
          // Apply field modifiers
          if (fieldModifiers.includes('append') && data[fieldName]) {
            data[fieldName] += value;
          } else {
            data[fieldName] = value;
          }
          
          // Store in variables for later use
          variables[variablesKey] = value;
          
        } catch (error) {
          // If optional, continue without error (like Prowlarr lines 321-331)
          if (isOptional) {
            variables[variablesKey] = null;
            continue;
          }
          
          // For non-optional fields, log but continue
          variables[variablesKey] = null;
          data[fieldName] = null;
        }
      } catch (error) {
        // Skip fields that fail extraction entirely
        data[fieldName] = null;
      }
    }
    
    return data;
  }
  
  /**
   * Process template syntax in values
   */
  processTemplateInValue(value, config = {}, variables = {}) {
    if (typeof value !== 'string') return value;
    
    // Replace {{ .Config.X }} with config values
    value = value.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, key) => {
      return config[key] || '';
    });
    
    // Replace {{ .Result.X }} with previously extracted values
    value = value.replace(/\{\{\s*\.Result\.(\w+)\s*\}\}/g, (match, key) => {
      return variables[`.Result.${key}`] || '';
    });
    
    return value;
  }
  
  /**
   * Check if row should be skipped based on filters (like Prowlarr lines 699-723)
   */
  shouldSkipRow(data, filters, variables) {
    if (!filters || filters.length === 0) {
      return false;
    }
    
    for (const filter of filters) {
      if (typeof filter === 'object' && filter.name) {
        switch (filter.name) {
          case 'andmatch':
            // Handled by upper layer (search controller)
            break;
          case 'strdump':
            // Debug filter - log the row
            console.log('[Row Debug]', JSON.stringify(data));
            break;
          default:
            console.warn(`Unsupported row filter: ${filter.name}`);
        }
      }
    }
    
    return false;
  }

  /**
   * Extract a single field from a row
   */
  extractField(row, fieldConfig, baseUrl, config = {}) {
    // Handle string selector (shorthand)
    if (typeof fieldConfig === 'string') {
      return row.find(fieldConfig).first().text().trim();
    }
    
    let value = null;
    
    // Handle static text with template processing
    if (fieldConfig.text !== undefined) {
      value = fieldConfig.text;
      // Process {{ .Config.X }} in text values
      if (typeof value === 'string') {
        value = value.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, configKey) => {
          return config[configKey] || '';
        });
      }
    }
    // Handle case selector (Prowlarr lines 164-184) - try multiple selectors
    else if (fieldConfig.case) {
      for (const [caseSelector, caseValue] of Object.entries(fieldConfig.case)) {
        const caseElement = row.find(caseSelector);
        if (caseElement.length > 0) {
          // Found a match, use this value
          value = caseValue;
          // Process template in case value
          if (typeof value === 'string') {
            value = value.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, configKey) => {
              return config[configKey] || '';
            });
          }
          break;
        }
      }
      
      if (value === null && !fieldConfig.optional) {
        throw new Error(`None of the case selectors matched`);
      }
    }
    // Handle selector
    else if (fieldConfig.selector) {
      const element = row.find(fieldConfig.selector).first();
      
      if (element.length === 0) {
        // Element not found
        if (fieldConfig.optional) {
          value = fieldConfig.default || null;
        } else {
          value = fieldConfig.default || null;
        }
      } else {
        // Extract value
        if (fieldConfig.attribute) {
          value = element.attr(fieldConfig.attribute) || '';
          
          // Make relative URLs absolute
          if (value && (fieldConfig.attribute === 'href' || fieldConfig.attribute === 'src')) {
            value = this.makeAbsoluteURL(value, baseUrl);
          }
        } else if (fieldConfig.remove) {
          // Remove elements before getting text
          const clone = element.clone();
          clone.find(fieldConfig.remove).remove();
          value = clone.text().trim();
        } else {
          // Get text content
          value = element.text().trim();
        }
      }
    }
    
    // Apply default if value is empty
    if ((value === null || value === '') && fieldConfig.default !== undefined) {
      value = fieldConfig.default;
    }
    
    // Apply filters
    if (value !== null && fieldConfig.filters && fieldConfig.filters.length > 0) {
      value = this.filterEngine.applyFilters(value, fieldConfig.filters);
    }
    
    // Final template processing for any {{ .Config.X }} that might remain
    if (value && typeof value === 'string') {
      value = value.replace(/\{\{\s*\.Config\.(\w+)\s*\}\}/g, (match, configKey) => {
        return config[configKey] || '';
      });
    }
    
    return value;
  }

  /**
   * Parse JSON response
   */
  parseJSON(jsonData, baseUrl, config = {}) {
    const rowsConfig = this.definition.search.rows;
    const fieldsConfig = this.definition.search.fields;
    
    // Process template in rowsConfig.selector if needed
    let selector = rowsConfig.selector || rowsConfig;
    if (typeof selector === 'string' && selector.includes('{{')) {
      // Template processing for selector (e.g., filtering by uploader)
      const TemplateEngine = require('./templateEngine');
      const templateEngine = new TemplateEngine();
      selector = templateEngine.process(selector, { Config: config });
    }
    
    // Extract rows from JSON
    let rows = this.extractJSONRows(jsonData, { ...rowsConfig, selector });
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    
    const results = [];
    
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const result = this.parseJSONRow(row, fieldsConfig, baseUrl);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error(`Error parsing JSON row ${i}:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Extract rows from JSON data
   */
  extractJSONRows(jsonData, rowsConfig) {
    // If rowsConfig is a string, it's the selector
    const selector = typeof rowsConfig === 'string' ? rowsConfig : rowsConfig.selector;
    
    if (!selector) {
      // If no selector, assume the data is already an array
      return Array.isArray(jsonData) ? jsonData : [jsonData];
    }
    
    // Handle "$" selector (root array)
    if (selector === '$') {
      return Array.isArray(jsonData) ? jsonData : [jsonData];
    }
    
    // Navigate JSON path
    return this.getJSONValue(jsonData, selector) || [];
  }

  /**
   * Parse a single JSON row
   */
  parseJSONRow(row, fieldsConfig, baseUrl) {
    const data = {};
    
    for (const [fieldName, fieldConfig] of Object.entries(fieldsConfig)) {
      try {
        const value = this.extractJSONField(row, fieldConfig, baseUrl);
        data[fieldName] = value;
      } catch (error) {
        console.error(`Error extracting JSON field ${fieldName}:`, error.message);
        data[fieldName] = null;
      }
    }
    
    return data;
  }

  /**
   * Extract a single field from a JSON row
   */
  extractJSONField(row, fieldConfig, baseUrl) {
    // Handle string selector (field name)
    if (typeof fieldConfig === 'string') {
      return this.getJSONValue(row, fieldConfig);
    }
    
    let value = null;
    
    // Handle static text
    if (fieldConfig.text !== undefined) {
      value = fieldConfig.text;
    }
    // Handle selector (JSON path)
    else if (fieldConfig.selector) {
      value = this.getJSONValue(row, fieldConfig.selector);
      
      // Make relative URLs absolute if this is a URL field
      if (value && typeof value === 'string' && fieldConfig.attribute && 
          (fieldConfig.attribute === 'href' || fieldConfig.attribute === 'src')) {
        value = this.makeAbsoluteURL(value, baseUrl);
      }
    }
    
    // Apply default if value is empty
    if ((value === null || value === undefined || value === '') && fieldConfig.default !== undefined) {
      value = fieldConfig.default;
    }
    
    // Apply filters
    if (value !== null && fieldConfig.filters && fieldConfig.filters.length > 0) {
      value = this.filterEngine.applyFilters(value, fieldConfig.filters);
    }
    
    return value;
  }

  /**
   * Get value from JSON object using path notation
   */
  getJSONValue(obj, path) {
    if (!obj || !path) return null;
    
    // Handle simple field names
    if (!path.includes('.') && !path.includes('[')) {
      return obj[path] !== undefined ? obj[path] : null;
    }
    
    // Handle array indexing: items[0].name
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (!part) continue;
      
      // Handle array indexing
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, field, index] = arrayMatch;
        current = current[field];
        if (Array.isArray(current)) {
          current = current[parseInt(index)];
        } else {
          return null;
        }
      } else {
        current = current[part];
      }
      
      if (current === undefined || current === null) {
        return null;
      }
    }
    
    return current;
  }

  /**
   * Make relative URLs absolute
   */
  makeAbsoluteURL(url, baseUrl) {
    if (!url) return url;
    
    // Already absolute
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('magnet:')) {
      return url;
    }
    
    // Protocol-relative URL
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    // Absolute path
    if (url.startsWith('/')) {
      try {
        const base = new URL(baseUrl);
        return `${base.protocol}//${base.host}${url}`;
      } catch (e) {
        return baseUrl + url;
      }
    }
    
    // Relative path
    try {
      const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      return new URL(url, base).href;
    } catch (e) {
      return baseUrl + '/' + url;
    }
  }

  /**
   * Format extracted data into standard result format (following Prowlarr lines 442-697)
   */
  formatResult(data, indexerInfo) {
    // Skip if missing required fields
    if (!data.title) {
      return null;
    }

    // Construct magnet link from infohash if available (Prowlarr lines 418-422)
    // Only for non-private indexers
    if (!data.download && !data.magnet && data.infohash && indexerInfo.type !== 'private') {
      const trackers = [
        'udp://tracker.coppersurfer.tk:6969/announce',
        'udp://tracker.open-internet.nl:6969/announce',
        'udp://tracker.leechers-paradise.org:6969/announce'
      ];
      const trackerParams = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
      data.magnet = `magnet:?xt=urn:btih:${data.infohash}&dn=${encodeURIComponent(data.title)}${trackerParams}`;
    }

    if (!data.download && !data.magnet) {
      return null;
    }

    // Parse size
    let sizeBytes = 0;
    if (data.size) {
      sizeBytes = this.parseSize(data.size);
    }

    // Parse numbers with sanitization (Prowlarr lines 564-591)
    // Cap seeders/leechers at 5M to fix data quality issues
    let seeders = this.parseNumber(data.seeders);
    let leechers = this.parseNumber(data.leechers);
    const grabs = this.parseNumber(data.grabs);
    
    // Sanitize unrealistic values (Prowlarr fix for issue #6558)
    if (seeders > 5000000) seeders = 0;
    if (leechers > 5000000) leechers = 0;

    // Get download URL (prefer magnet over download link)
    const downloadUrl = data.magnet || data.download || '';
    const detailsUrl = data.details || '';

    // Calculate age from date
    let age = 0;
    let publishDate = data.date || new Date().toISOString();

    if (data.date) {
      try {
        const dateObj = new Date(data.date);
        if (!isNaN(dateObj.getTime())) {
          age = Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
          publishDate = dateObj.toISOString();
        }
      } catch (e) {
        // Ignore date errors
      }
    }

    // Check for Internal flag (Prowlarr lines 431-434)
    const isInternal = data.description && data.description.trim().startsWith('Internal');

    return {
      title: data.title,
      size: sizeBytes,
      sizeFormatted: this.formatSize(sizeBytes),
      publishDate: publishDate,
      age: age,
      seeders: seeders,
      leechers: leechers,
      grabs: grabs,
      downloadUrl: downloadUrl,
      guid: detailsUrl || downloadUrl,
      description: data.description || data.category || '',
      category: data.category || '',
      categories: this.mapCategories(data.category, indexerInfo.caps),
      isInternal: isInternal,
      infohash: data.infohash || null,
    };
  }

  /**
   * Parse size string to bytes
   */
  parseSize(sizeStr) {
    if (!sizeStr) return 0;
    if (typeof sizeStr === 'number') return sizeStr;
    
    const str = String(sizeStr).toUpperCase().trim();
    
    // Extract number and unit
    const match = str.match(/([\d.,]+)\s*([KMGT]?B)/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    
    const multipliers = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024,
    };
    
    return value * (multipliers[unit] || 1);
  }

  /**
   * Format bytes to human-readable size
   */
  formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + units[i];
  }

  /**
   * Parse number from string
   */
  parseNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (value === '-' || value === 'N/A' || value === '') return 0;
    
    const cleaned = String(value).replace(/[^0-9]/g, '');
    const parsed = parseInt(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Map site category to Torznab categories
   */
  mapCategories(siteCategory, caps) {
    if (!siteCategory) return [8000]; // Other
    if (!caps || !caps.categorymappings) return [8000];
    
    const mappings = caps.categorymappings;
    
    // Handle numeric categories
    if (typeof siteCategory === 'number' || /^\d+$/.test(siteCategory)) {
      const catId = String(siteCategory);
      const mapping = mappings.find(m => String(m.id) === catId);
      if (mapping) {
        return this.mapCategoryName(mapping.cat);
      }
    }
    
    // Handle string categories
    const catStr = String(siteCategory).toLowerCase();
    const mapping = mappings.find(m => {
      const desc = String(m.desc || '').toLowerCase();
      return desc.includes(catStr) || catStr.includes(desc);
    });
    
    if (mapping) {
      return this.mapCategoryName(mapping.cat);
    }
    
    return [8000]; // Default to Other
  }

  /**
   * Map Cardigann category name to Torznab category ID
   */
  mapCategoryName(catName) {
    const mapping = {
      'TV': [5000],
      'TV/': [5000],
      'TV/Anime': [5070],
      'TV/Documentary': [5080],
      'TV/HD': [5040],
      'TV/SD': [5030],
      'TV/Sport': [5060],
      'Movies': [2000],
      'Movies/': [2000],
      'Movies/DVD': [2030],
      'Movies/HD': [2040],
      'Movies/SD': [2030],
      'Movies/Foreign': [2010],
      'Audio': [3000],
      'Audio/': [3000],
      'Audio/Audiobook': [3030],
      'Audio/Lossless': [3040],
      'Audio/MP3': [3010],
      'Audio/Video': [3020],
      'PC': [4000],
      'PC/Games': [4050],
      'PC/0day': [4010],
      'PC/Mac': [4030],
      'Console': [1000],
      'Console/': [1000],
      'Books': [7000],
      'Books/EBook': [7020],
      'Books/Comics': [7030],
      'XXX': [6000],
      'Other': [8000],
    };
    
    return mapping[catName] || [8000];
  }
}

module.exports = CardigannParser;

