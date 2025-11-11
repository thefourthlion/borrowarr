/**
 * Cardigann Filter Engine
 * Implements all Cardigann filters compatible with Prowlarr
 */

const moment = require('moment');

class CardigannFilterEngine {
  constructor() {
    this.filters = {
      // String manipulation
      'append': this.appendFilter.bind(this),
      'prepend': this.prependFilter.bind(this),
      'replace': this.replaceFilter.bind(this),
      're_replace': this.re_replaceFilter.bind(this),
      'trim': this.trimFilter.bind(this),
      'split': this.splitFilter.bind(this),
      'join': this.joinFilter.bind(this),
      'tolower': this.toLowerFilter.bind(this),
      'toupper': this.toUpperFilter.bind(this),
      'urlencode': this.urlencodeFilter.bind(this),
      'urldecode': this.urldecodeFilter.bind(this),
      'htmlencode': this.htmlEncodeFilter.bind(this),
      'htmldecode': this.htmlDecodeFilter.bind(this),
      'strdump': this.strDumpFilter.bind(this),
      'diacritics': this.diacriticsFilter.bind(this),
      'validate': this.validateFilter.bind(this),

      // Regex and parsing
      'regexp': this.regexpFilter.bind(this),
      'querystring': this.querystringFilter.bind(this),

      // Date/time
      'dateparse': this.dateparseFilter.bind(this),
      'timeparse': this.timeparseFilter.bind(this),
      'timeago': this.timeagoFilter.bind(this),
      'fuzzytime': this.fuzzytimeFilter.bind(this),

      // Numbers
      'float': this.floatFilter.bind(this),
      'int': this.intFilter.bind(this),

      // Misc
      'andmatch': this.andmatchFilter.bind(this),
    };
  }

  /**
   * Apply a chain of filters to a value
   */
  applyFilters(value, filterConfigs) {
    if (!filterConfigs || !Array.isArray(filterConfigs) || filterConfigs.length === 0) {
      return value;
    }

    let result = value;

    for (const filterConfig of filterConfigs) {
      if (!filterConfig || !filterConfig.name) continue;

      const filterFn = this.filters[filterConfig.name];
      if (!filterFn) {
        console.warn(`Unknown filter: ${filterConfig.name}`);
        continue;
      }

      try {
        const args = filterConfig.args || [];
        result = filterFn(result, args);
      } catch (error) {
        console.error(`Filter error (${filterConfig.name}):`, error.message);
      }
    }

    return result;
  }

  // ==================== STRING MANIPULATION FILTERS ====================

  appendFilter(value, args) {
    const [text] = args;
    return String(value || '') + String(text || '');
  }

  prependFilter(value, args) {
    const [text] = args;
    return String(text || '') + String(value || '');
  }

  replaceFilter(value, args) {
    const [search, replace] = args;
    if (typeof value !== 'string') value = String(value);
    // Escape regex special characters for literal string replacement
    const escaped = String(search || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return value.replace(new RegExp(escaped, 'g'), String(replace || ''));
  }

  re_replaceFilter(value, args) {
    const [pattern, replacement] = args;
    if (typeof value !== 'string') value = String(value);
    
    try {
      // Handle regex flags (e.g., "(?i)" for case-insensitive)
      let flags = 'g';
      let cleanPattern = pattern;
      
      // Check for inline flags
      if (pattern.startsWith('(?i)')) {
        flags = 'gi';
        cleanPattern = pattern.substring(4);
      } else if (pattern.startsWith('(?m)')) {
        flags = 'gm';
        cleanPattern = pattern.substring(4);
      }
      
      // Remove unsupported regex groups like (?:...) to make them simpler
      // JavaScript doesn't need them the same way
      cleanPattern = cleanPattern.replace(/\(\?:/g, '(');
      
      const regex = new RegExp(cleanPattern, flags);
      return value.replace(regex, String(replacement || ''));
    } catch (error) {
      console.error(`Regex error in re_replace (pattern: ${pattern}):`, error.message);
      // Return original value on error
      return value;
    }
  }

  trimFilter(value) {
    return String(value || '').trim();
  }

  splitFilter(value, args) {
    const [delimiter, index] = args;
    if (typeof value !== 'string') value = String(value);
    const parts = value.split(String(delimiter || ' '));
    if (index !== undefined && index !== null) {
      const idx = parseInt(index);
      return parts[idx] !== undefined ? parts[idx] : '';
    }
    return parts;
  }

  joinFilter(value, args) {
    const [delimiter] = args;
    if (Array.isArray(value)) {
      return value.join(String(delimiter || ''));
    }
    return value;
  }

  toLowerFilter(value) {
    return String(value || '').toLowerCase();
  }

  toUpperFilter(value) {
    return String(value || '').toUpperCase();
  }

  urlencodeFilter(value) {
    return encodeURIComponent(String(value || ''));
  }

  urldecodeFilter(value) {
    try {
      return decodeURIComponent(String(value || ''));
    } catch (e) {
      return value;
    }
  }

  htmlEncodeFilter(value) {
    const str = String(value || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  htmlDecodeFilter(value) {
    const str = String(value || '');
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  strDumpFilter(value) {
    // Debug filter - just returns the value as-is but logs it
    console.log('strdump:', value);
    return value;
  }

  diacriticsFilter(value, args) {
    const [mode] = args;
    const str = String(value || '');
    
    // Remove diacritics (accents) from characters
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  validateFilter(value, args) {
    const [validValues] = args;
    const str = String(value || '');
    
    if (!validValues) return str;
    
    const valid = Array.isArray(validValues) ? validValues : [validValues];
    return valid.includes(str) ? str : '';
  }

  // ==================== REGEX AND PARSING FILTERS ====================

  regexpFilter(value, args) {
    const [pattern, group] = args;
    if (typeof value !== 'string') value = String(value);
    
    try {
      const regex = new RegExp(pattern);
      const match = value.match(regex);
      
      if (!match) return '';
      
      // Return specific group or entire match
      if (group !== undefined && group !== null) {
        const idx = parseInt(group);
        return match[idx] !== undefined ? match[idx] : '';
      }
      
      // Return first capturing group, or entire match if no groups
      return match[1] !== undefined ? match[1] : match[0];
    } catch (error) {
      console.error(`Regex error in regexp:`, error.message);
      return value;
    }
  }

  querystringFilter(value, args) {
    const [paramName] = args;
    if (!value || typeof value !== 'string') return '';
    
    try {
      // Handle relative URLs by adding a dummy base
      const url = new URL(value, 'http://dummy.com');
      return url.searchParams.get(paramName) || '';
    } catch (error) {
      // Try to extract manually if URL parsing fails
      const regex = new RegExp(`[?&]${paramName}=([^&#]*)`);
      const match = value.match(regex);
      return match ? decodeURIComponent(match[1]) : '';
    }
  }

  // ==================== DATE/TIME FILTERS ====================

  dateparseFilter(value, args) {
    const [format] = args;
    if (!value) return '';
    
    try {
      const str = String(value).trim();
      let date;
      
      if (format) {
        // Parse with specific format
        // Convert Go time format to moment.js format
        const momentFormat = this.convertGoTimeFormat(format);
        date = moment(str, momentFormat, true);
      } else {
        // Auto-parse
        date = moment(str);
      }
      
      if (!date.isValid()) {
        return '';
      }
      
      return date.toISOString();
    } catch (error) {
      console.error(`Date parse error:`, error.message);
      return '';
    }
  }

  timeparseFilter(value, args) {
    // Alias for dateparse
    return this.dateparseFilter(value, args);
  }

  timeagoFilter(value) {
    if (!value || typeof value !== 'string') return '';
    
    const now = moment();
    const str = String(value).toLowerCase().trim();
    
    // Handle "just now", "today", "yesterday"
    if (str.includes('just now') || str === 'now') {
      return now.toISOString();
    }
    if (str === 'today' || str.includes('today')) {
      return now.startOf('day').toISOString();
    }
    if (str === 'yesterday' || str.includes('yesterday')) {
      return now.subtract(1, 'day').startOf('day').toISOString();
    }
    
    // Handle "X Year+", "X Month+" format (common in some indexers)
    const plusMatch = str.match(/(\d+)\s*(year|month|week|day)s?\+/i);
    if (plusMatch) {
      const amount = parseInt(plusMatch[1]);
      const unit = plusMatch[2].toLowerCase() + 's';
      return now.subtract(amount, unit).toISOString();
    }
    
    // Parse relative time patterns
    const patterns = [
      { regex: /(\d+)\s*(second|sec|s)s?\s*ago/i, unit: 'seconds' },
      { regex: /(\d+)\s*(minute|min|m)s?\s*ago/i, unit: 'minutes' },
      { regex: /(\d+)\s*(hour|hr|h)s?\s*ago/i, unit: 'hours' },
      { regex: /(\d+)\s*(day|d)s?\s*ago/i, unit: 'days' },
      { regex: /(\d+)\s*(week|wk|w)s?\s*ago/i, unit: 'weeks' },
      { regex: /(\d+)\s*(month|mon|mo)s?\s*ago/i, unit: 'months' },
      { regex: /(\d+)\s*(year|yr|y)s?\s*ago/i, unit: 'years' },
    ];
    
    for (const { regex, unit } of patterns) {
      const match = str.match(regex);
      if (match) {
        const amount = parseInt(match[1]);
        return now.subtract(amount, unit).toISOString();
      }
    }
    
    // Try standard parsing as fallback
    const parsed = moment(value);
    return parsed.isValid() ? parsed.toISOString() : '';
  }

  fuzzytimeFilter(value) {
    if (!value) return '';
    
    // Try timeago first
    const timeagoResult = this.timeagoFilter(value);
    if (timeagoResult) return timeagoResult;
    
    // Try standard date parsing
    return this.dateparseFilter(value, []);
  }

  /**
   * Convert Go time format to moment.js format
   */
  convertGoTimeFormat(goFormat) {
    // Go time format reference: "Mon Jan 2 15:04:05 MST 2006"
    // Moment format: "ddd MMM D HH:mm:ss z YYYY"
    
    const conversions = {
      '2006': 'YYYY',
      '06': 'YY',
      'January': 'MMMM',
      'Jan': 'MMM',
      'Monday': 'dddd',
      'Mon': 'ddd',
      '02': 'DD',
      '2': 'D',
      '15': 'HH',
      '03': 'hh',
      '3': 'h',
      '04': 'mm',
      '4': 'm',
      '05': 'ss',
      '5': 's',
      'PM': 'A',
      'pm': 'a',
      'MST': 'z',
      'Z07:00': 'Z',
      'Z0700': 'ZZ',
    };
    
    let result = goFormat;
    for (const [go, moment] of Object.entries(conversions)) {
      result = result.replace(new RegExp(go, 'g'), moment);
    }
    
    return result;
  }

  // ==================== NUMBER FILTERS ====================

  floatFilter(value) {
    if (typeof value === 'number') return value;
    const str = String(value || '').replace(/,/g, '').trim();
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  intFilter(value) {
    if (typeof value === 'number') return Math.floor(value);
    const str = String(value || '').replace(/[^0-9-]/g, '').trim();
    const parsed = parseInt(str);
    return isNaN(parsed) ? 0 : parsed;
  }

  // ==================== MISC FILTERS ====================

  andmatchFilter(value) {
    // This filter is used in rows to filter results
    // It's handled at the row level, not on individual values
    // So we just return the value as-is here
    return value;
  }
}

module.exports = CardigannFilterEngine;

