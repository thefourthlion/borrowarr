/**
 * Definition Loader
 * Loads and parses YAML indexer definitions
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class DefinitionLoader {
  constructor(definitionsPath = path.join(__dirname, '../definitions')) {
    this.definitionsPath = definitionsPath;
    this.definitions = new Map();
    this.loadAllDefinitions();
  }

  /**
   * Load all YAML definitions from the definitions folder
   */
  loadAllDefinitions() {
    try {
      const files = fs.readdirSync(this.definitionsPath);
      
      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const filePath = path.join(this.definitionsPath, file);
          this.loadDefinition(filePath);
        }
      }
      
      console.log(`✅ Loaded ${this.definitions.size} indexer definitions`);
    } catch (error) {
      console.error('Error loading definitions:', error);
    }
  }

  /**
   * Load a single YAML definition
   */
  loadDefinition(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const definition = yaml.load(fileContent);
      
      if (!definition.id) {
        console.error(`Definition ${filePath} missing 'id' field`);
        return;
      }
      
      this.validateDefinition(definition);
      this.definitions.set(definition.id, definition);
      
      console.log(`   📄 Loaded: ${definition.name} (${definition.id})`);
    } catch (error) {
      console.error(`Error loading ${filePath}:`, error.message);
    }
  }

  /**
   * Validate a definition has required fields
   */
  validateDefinition(definition) {
    const required = ['id', 'name', 'links'];
    
    for (const field of required) {
      if (!definition[field]) {
        throw new Error(`Definition missing required field: ${field}`);
      }
    }
    
    if (!Array.isArray(definition.links) || definition.links.length === 0) {
      throw new Error('Definition must have at least one link');
    }
    
    // API-based, RSS-based, or HTML scrapers
    if (definition.api || definition.rss) {
      // API or RSS-based indexer - validate config
      if (definition.api && !definition.api.baseUrl && !definition.links[0]) {
        throw new Error('API-based indexer must have api.baseUrl or links');
      }
      if (definition.rss && !definition.rss.feedUrl && !definition.api) {
        throw new Error('RSS-based indexer must have rss.feedUrl or api');
      }
    } else {
      // HTML scraper - validate search config
      if (!definition.search) {
        throw new Error('Definition must have "api", "rss", or "search" section');
      }
      if (!definition.search.paths || !definition.search.rows || !definition.search.fields) {
        throw new Error('Search section incomplete');
      }
    }
  }

  /**
   * Get a definition by ID
   */
  getDefinition(id) {
    return this.definitions.get(id);
  }

  /**
   * Get all definitions
   */
  getAllDefinitions() {
    return Array.from(this.definitions.values());
  }

  /**
   * Get definitions by type (public/private)
   */
  getDefinitionsByType(type) {
    return this.getAllDefinitions().filter(def => def.type === type);
  }

  /**
   * Search definitions by name
   */
  searchDefinitions(query) {
    const lowerQuery = query.toLowerCase();
    return this.getAllDefinitions().filter(def => 
      def.name.toLowerCase().includes(lowerQuery) ||
      def.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Reload all definitions (for development)
   */
  reload() {
    this.definitions.clear();
    this.loadAllDefinitions();
  }
}

module.exports = DefinitionLoader;

