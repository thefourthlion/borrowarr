/**
 * Filter System
 * Applies transformations to extracted values
 */

const moment = require('moment');

class FilterEngine {
  constructor() {
    this.filters = {
      // String filters
      'replace': this.replaceFilter.bind(this),
      'trim': this.trimFilter.bind(this),
      'append': this.appendFilter.bind(this),
      'prepend': this.prependFilter.bind(this),
      'split': this.splitFilter.bind(this),
      'regexp': this.regexpFilter.bind(this),
      're_replace': this.re_replaceFilter.bind(this),
      
      // Number filters
      'parseNumber': this.parseNumberFilter.bind(this),
      
      // Date filters
      'dateparse': this.dateparseFilter.bind(this),
      'timeago': this.timeagoFilter.bind(this),
      'fuzzytime': this.fuzzytimeFilter.bind(this),
      
      // URL filters
      'querystring': this.querystringFilter.bind(this),
      'urlencode': this.urlencodeFilter.bind(this),
      'urldecode': this.urldecodeFilter.bind(this),
    };
  }

  /**
   * Apply a single filter
   */
  applyFilter(value, filterConfig) {
    if (!value) return value;

    const filterName = filterConfig.name;
    const args = filterConfig.args || [];

    const filterFn = this.filters[filterName];
    if (!filterFn) {
      console.warn(`Unknown filter: ${filterName}`);
      return value;
    }

    return filterFn(value, args);
  }

  /**
   * Apply a chain of filters
   */
  applyFilters(value, filterConfigs) {
    if (!filterConfigs || filterConfigs.length === 0) {
      return value;
    }

    let result = value;
    for (const filterConfig of filterConfigs) {
      result = this.applyFilter(result, filterConfig);
    }
    return result;
  }

  // ==================== STRING FILTERS ====================

  /**
   * Replace filter - replace(search, replace)
   */
  replaceFilter(value, args) {
    const [search, replace] = args;
    if (typeof value !== 'string') return value;
    return value.replace(new RegExp(search, 'g'), replace || '');
  }

  /**
   * Trim filter - remove whitespace
   */
  trimFilter(value) {
    return typeof value === 'string' ? value.trim() : value;
  }

  /**
   * Append filter - append(text)
   */
  appendFilter(value, args) {
    const [text] = args;
    return value + (text || '');
  }

  /**
   * Prepend filter - prepend(text)
   */
  prependFilter(value, args) {
    const [text] = args;
    return (text || '') + value;
  }

  /**
   * Split filter - split(delimiter, index)
   */
  splitFilter(value, args) {
    const [delimiter, index] = args;
    if (typeof value !== 'string') return value;
    const parts = value.split(delimiter || ' ');
    return index !== undefined ? parts[parseInt(index)] : parts;
  }

  /**
   * Regexp filter - regexp(pattern, group?)
   */
  regexpFilter(value, args) {
    const [pattern, group] = args;
    if (typeof value !== 'string') return value;
    
    try {
      const regex = new RegExp(pattern);
      const match = value.match(regex);
      
      if (!match) return null;
      
      // Return specific group or first match
      const groupIndex = group !== undefined ? parseInt(group) : 1;
      return match[groupIndex] || match[0];
    } catch (error) {
      console.error(`Regexp filter error: ${error.message}`);
      return value;
    }
  }

  /**
   * Re_replace filter - regexp replace (re_replace(pattern, replacement))
   */
  re_replaceFilter(value, args) {
    const [pattern, replacement] = args;
    if (typeof value !== 'string') return value;
    
    try {
      const regex = new RegExp(pattern, 'g');
      return value.replace(regex, replacement || '');
    } catch (error) {
      console.error(`Re_replace filter error: ${error.message}`);
      return value;
    }
  }

  // ==================== NUMBER FILTERS ====================

  /**
   * Parse number filter - extract number from string
   */
  parseNumberFilter(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    // Remove commas and parse
    const cleaned = value.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  // ==================== DATE FILTERS ====================

  /**
   * Date parse filter - dateparse(format)
   * Parse date string using moment.js
   */
  dateparseFilter(value, args) {
    const [format] = args;
    if (!value) return null;

    try {
      let date;
      
      if (format) {
        // Parse with specific format
        date = moment(value, format);
      } else {
        // Try to auto-parse
        date = moment(value);
      }

      if (!date.isValid()) {
        console.warn(`Invalid date: ${value}`);
        return null;
      }

      return date.toISOString();
    } catch (error) {
      console.error(`Date parse error: ${error.message}`);
      return null;
    }
  }

  /**
   * Time ago filter - parse relative time ("2 hours ago", "yesterday")
   */
  timeagoFilter(value) {
    if (!value || typeof value !== 'string') return null;

    const now = moment();
    const lowerValue = value.toLowerCase().trim();

    // Handle "just now", "today", "yesterday"
    if (lowerValue.includes('just now') || lowerValue.includes('now')) {
      return now.toISOString();
    }
    if (lowerValue.includes('today')) {
      return now.toISOString();
    }
    if (lowerValue.includes('yesterday')) {
      return now.subtract(1, 'day').toISOString();
    }

    // Handle "1 Year+", "X Year+", etc
    if (lowerValue.includes('year+')) {
      const match = lowerValue.match(/(\d+)\s*year\+/i);
      if (match) {
        const years = parseInt(match[1]);
        return now.subtract(years, 'years').toISOString();
      }
      // Default to 1 year if no number found
      return now.subtract(1, 'year').toISOString();
    }

    // Handle "X Month+", etc
    if (lowerValue.includes('month+')) {
      const match = lowerValue.match(/(\d+)\s*month\+/i);
      if (match) {
        const months = parseInt(match[1]);
        return now.subtract(months, 'months').toISOString();
      }
      return now.subtract(1, 'month').toISOString();
    }

    // Parse relative time (e.g., "2 hours ago", "3 days ago", "8 months ago", "11 mo ago")
    const patterns = [
      { regex: /(\d+)\s*(?:second|sec|s)(?:s)?\s*ago/i, unit: 'seconds' },
      { regex: /(\d+)\s*(?:minute|min|m)(?:s)?\s*ago/i, unit: 'minutes' },
      { regex: /(\d+)\s*(?:hour|hr|h)(?:s)?\s*ago/i, unit: 'hours' },
      { regex: /(\d+)\s*(?:day|d)(?:s)?\s*ago/i, unit: 'days' },
      { regex: /(\d+)\s*(?:week|wk|w)(?:s)?\s*ago/i, unit: 'weeks' },
      { regex: /(\d+)\s*(?:month|mon|mo)\s*ago/i, unit: 'months' }, // Handle "mo" abbreviation
      { regex: /(\d+)\s*(?:year|yr|y)(?:s)?\s*ago/i, unit: 'years' },
    ];

    for (const { regex, unit } of patterns) {
      const match = lowerValue.match(regex);
      if (match) {
        const amount = parseInt(match[1]);
        return now.subtract(amount, unit).toISOString();
      }
    }

    // Fallback to moment parsing
    const parsed = moment(value);
    return parsed.isValid() ? parsed.toISOString() : null;
  }

  /**
   * Fuzzy time filter - parse various time formats
   */
  fuzzytimeFilter(value) {
    if (!value) return null;

    // Try timeago first
    const timeagoResult = this.timeagoFilter(value);
    if (timeagoResult) return timeagoResult;

    // Try standard date parsing
    return this.dateparseFilter(value, []);
  }

  // ==================== URL FILTERS ====================

  /**
   * Query string filter - extract value from query param
   */
  querystringFilter(value, args) {
    const [paramName] = args;
    if (!value || typeof value !== 'string') return null;

    try {
      const url = new URL(value, 'http://dummy.com');
      return url.searchParams.get(paramName);
    } catch (error) {
      return null;
    }
  }

  /**
   * URL encode filter
   */
  urlencodeFilter(value) {
    return encodeURIComponent(value);
  }

  /**
   * URL decode filter
   */
  urldecodeFilter(value) {
    return decodeURIComponent(value);
  }
}

module.exports = FilterEngine;

