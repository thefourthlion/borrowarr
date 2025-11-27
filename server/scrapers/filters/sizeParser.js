/**
 * Size Parser
 * Parse size strings like "1.5 GB", "1500 MB" to bytes
 */

class SizeParser {
  constructor() {
    // Size units in bytes (binary, base 1024)
    this.units = {
      'b': 1,
      'byte': 1,
      'bytes': 1,
      
      // Kilobytes
      'kb': 1024,
      'kib': 1024,
      'kilobyte': 1024,
      'kilobytes': 1024,
      
      // Megabytes
      'mb': 1024 * 1024,
      'mib': 1024 * 1024,
      'megabyte': 1024 * 1024,
      'megabytes': 1024 * 1024,
      
      // Gigabytes
      'gb': 1024 * 1024 * 1024,
      'gib': 1024 * 1024 * 1024,
      'gigabyte': 1024 * 1024 * 1024,
      'gigabytes': 1024 * 1024 * 1024,
      
      // Terabytes
      'tb': 1024 * 1024 * 1024 * 1024,
      'tib': 1024 * 1024 * 1024 * 1024,
      'terabyte': 1024 * 1024 * 1024 * 1024,
      'terabytes': 1024 * 1024 * 1024 * 1024,
      
      // Petabytes
      'pb': 1024 * 1024 * 1024 * 1024 * 1024,
      'pib': 1024 * 1024 * 1024 * 1024 * 1024,
    };
  }

  /**
   * Parse size string to bytes
   * @param {string} sizeString - e.g., "1.5 GB", "1500 MB", "1536000000"
   * @returns {number} Size in bytes
   */
  parse(sizeString) {
    if (typeof sizeString === 'number') return sizeString;
    if (!sizeString || typeof sizeString !== 'string') return 0;

    // Clean the string
    let cleaned = sizeString.trim().toLowerCase();
    
    // Remove commas
    cleaned = cleaned.replace(/,/g, '');
    
    // Try to extract number and unit
    const match = cleaned.match(/^([\d.,]+)\s*([a-z]+)?$/i);
    
    if (!match) {
      // Try parsing as plain number
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }

    const [, numStr, unit] = match;
    const number = parseFloat(numStr.replace(',', '.'));
    
    if (isNaN(number)) return 0;

    // If no unit, assume bytes
    if (!unit) return Math.round(number);

    // Find matching unit
    const unitKey = unit.toLowerCase();
    const multiplier = this.units[unitKey];
    
    if (multiplier === undefined) {
      console.warn(`Unknown size unit: ${unit}`);
      return Math.round(number);
    }

    return Math.round(number * multiplier);
  }

  /**
   * Format bytes to human-readable string
   * @param {number} bytes
   * @param {number} decimals
   * @returns {string}
   */
  format(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    if (!bytes) return 'Unknown';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Convert bytes to gigabytes
   */
  toGB(bytes) {
    return bytes / (1024 * 1024 * 1024);
  }

  /**
   * Convert gigabytes to bytes
   */
  fromGB(gb) {
    return gb * 1024 * 1024 * 1024;
  }
}

module.exports = new SizeParser();

