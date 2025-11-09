/**
 * Selector Engine
 * Handles CSS selectors, attribute extraction, and text extraction
 */

const cheerio = require('cheerio');

class SelectorEngine {
  constructor() {
    this.$ = null;
  }

  /**
   * Load HTML into cheerio
   */
  loadHTML(html) {
    this.$ = cheerio.load(html);
  }

  /**
   * Execute a selector configuration
   * @param {Object} element - Cheerio element or root
   * @param {Object} selectorConfig - Selector configuration from YAML
   * @returns {string|null}
   */
  executeSelector(element, selectorConfig) {
    if (!selectorConfig) return null;

    // Handle string selector (shorthand)
    if (typeof selectorConfig === 'string') {
      return this.extractText(element, selectorConfig);
    }

    // Handle object selector
    const selector = selectorConfig.selector;
    if (!selector) return null;

    const selected = element.find ? element.find(selector) : this.$(selector);
    
    if (selected.length === 0) {
      return selectorConfig.default || null;
    }

    // Extract attribute if specified
    if (selectorConfig.attribute) {
      return selected.attr(selectorConfig.attribute) || null;
    }

    // Extract text content
    return selected.text().trim() || null;
  }

  /**
   * Extract text from a selector
   */
  extractText(element, selector) {
    const selected = element.find ? element.find(selector) : this.$(selector);
    return selected.length > 0 ? selected.text().trim() : null;
  }

  /**
   * Extract attribute from a selector
   */
  extractAttribute(element, selector, attribute) {
    const selected = element.find ? element.find(selector) : this.$(selector);
    return selected.length > 0 ? selected.attr(attribute) : null;
  }

  /**
   * Find all elements matching a selector
   */
  findAll(selector) {
    if (!this.$) return [];
    return this.$(selector).toArray().map(el => this.$(el));
  }

  /**
   * Find first element matching a selector
   */
  findFirst(selector) {
    if (!this.$) return null;
    const elements = this.$(selector);
    return elements.length > 0 ? this.$(elements[0]) : null;
  }

  /**
   * Extract multiple values from elements
   */
  extractMultiple(elements, selectorConfig) {
    return elements.map(element => this.executeSelector(element, selectorConfig));
  }

  /**
   * Check if selector matches any elements
   */
  exists(selector) {
    if (!this.$) return false;
    return this.$(selector).length > 0;
  }

  /**
   * Get HTML content of element
   */
  getHTML(element) {
    return element.html();
  }

  /**
   * Get outer HTML of element
   */
  getOuterHTML(element) {
    return this.$.html(element);
  }
}

module.exports = SelectorEngine;

