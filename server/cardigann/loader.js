/**
 * Cardigann Definition Loader
 * Loads and validates YAML indexer definitions
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class CardigannLoader {
  constructor(definitionsPath) {
    this.definitionsPath = definitionsPath || path.join(__dirname, '../cardigann-indexer-yamls');
    this.definitions = new Map();
    this.loadAllDefinitions();
  }

  /**
   * Load all YAML definitions from the definitions folder
   */
  loadAllDefinitions() {
    try {
      if (!fs.existsSync(this.definitionsPath)) {
        console.error(`❌ Definitions path not found: ${this.definitionsPath}`);
        return;
      }

      const files = fs.readdirSync(this.definitionsPath);
      
      let loaded = 0;
      let failed = 0;

      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const filePath = path.join(this.definitionsPath, file);
          try {
            this.loadDefinition(filePath);
            loaded++;
          } catch (error) {
            console.error(`   ❌ Failed to load ${file}:`, error.message);
            failed++;
          }
        }
      }
      
      console.log(`✅ Cardigann: Loaded ${loaded} indexer definitions (${failed} failed)`);
    } catch (error) {
      console.error('❌ Error loading definitions:', error);
    }
  }

  /**
   * Load a single YAML definition
   */
  loadDefinition(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const definition = yaml.load(fileContent);
    
    if (!definition.id) {
      throw new Error(`Definition missing 'id' field`);
    }
    
    // Add filename for reference
    definition._filename = path.basename(filePath);
    
    this.validateDefinition(definition);
    this.definitions.set(definition.id, definition);
  }

  /**
   * Validate a definition has required fields
   */
  validateDefinition(definition) {
    const required = ['id', 'name'];
    
    for (const field of required) {
      if (!definition[field]) {
        throw new Error(`Definition missing required field: ${field}`);
      }
    }
    
    // Validate has links array
    if (!definition.links || !Array.isArray(definition.links) || definition.links.length === 0) {
      throw new Error('Definition must have at least one link');
    }
    
    // Must have search configuration
    if (!definition.search) {
      throw new Error('Definition must have "search" section');
    }
    
    // Search must have paths/path, rows, and fields
    if (!definition.search.paths && !definition.search.path) {
      throw new Error('Search section must have "paths" or "path"');
    }
    
    if (!definition.search.rows) {
      throw new Error('Search section must have "rows"');
    }
    
    if (!definition.search.fields) {
      throw new Error('Search section must have "fields"');
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
   * Search definitions by name or description
   */
  searchDefinitions(query) {
    const lowerQuery = query.toLowerCase();
    return this.getAllDefinitions().filter(def => 
      def.name.toLowerCase().includes(lowerQuery) ||
      def.description?.toLowerCase().includes(lowerQuery) ||
      def.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Reload all definitions (for development)
   */
  reload() {
    this.definitions.clear();
    this.loadAllDefinitions();
  }

  /**
   * Get statistics
   */
  getStats() {
    const all = this.getAllDefinitions();
    return {
      total: all.length,
      public: all.filter(d => d.type === 'public').length,
      private: all.filter(d => d.type === 'private').length,
      semiPrivate: all.filter(d => d.type === 'semi-private').length,
    };
  }
}

module.exports = CardigannLoader;

