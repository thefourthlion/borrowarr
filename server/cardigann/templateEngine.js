/**
 * Cardigann Template Engine
 * Processes Go-style templates used in Cardigann YAML files
 * Supports: {{ .Keywords }}, {{ .Config.X }}, {{ if }}{{ else }}{{ end }}, {{ or }}, {{ and }}
 */

class CardigannTemplateEngine {
  constructor(config = {}, variables = {}) {
    this.config = config;
    this.variables = variables;
  }

  /**
   * Set configuration values
   */
  setConfig(config) {
    this.config = config || {};
  }

  /**
   * Set template variables
   */
  setVariables(variables) {
    this.variables = variables || {};
  }

  /**
   * Process a template string
   */
  process(template, additionalVars = {}) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    let result = template;
    const allVars = { ...this.variables, ...additionalVars };

    // Process logic blocks first (if/else/end, or, and, eq, ne)
    result = this.processLogicBlocks(result, allVars);

    // Process variable substitutions
    result = this.processVariables(result, allVars);

    return result;
  }

  /**
   * Process logic blocks (if/else/end, or, and, eq, ne)
   */
  processLogicBlocks(template, vars) {
    let result = template;

    // Process if/else/end blocks (nested support)
    result = this.processConditionals(result, vars);

    // Process or expressions: {{ or .A .B .C }}
    result = this.processOrExpressions(result, vars);

    // Process and expressions: {{ and .A .B .C }}
    result = this.processAndExpressions(result, vars);

    // Process eq/ne expressions: {{ eq .A "value" }}
    result = this.processComparisonExpressions(result, vars);

    return result;
  }

  /**
   * Process conditional blocks (if/else/end)
   */
  processConditionals(template, vars) {
    let result = template;
    let maxIterations = 50; // Prevent infinite loops
    let iteration = 0;

    // Match if/else/end blocks (handles nesting by processing innermost first)
    // Pattern: {{ if CONDITION }}...{{ else }}...{{ end }} or {{ if CONDITION }}...{{ end }}
    const ifRegex = /\{\{\s*if\s+([^}]+?)\s*\}\}(.*?)(?:\{\{\s*else\s*\}\}(.*?))?\{\{\s*end\s*\}\}/gs;

    while (ifRegex.test(result) && iteration < maxIterations) {
      result = result.replace(ifRegex, (match, condition, ifBlock, elseBlock) => {
        const conditionResult = this.evaluateCondition(condition.trim(), vars);
        return conditionResult ? (ifBlock || '') : (elseBlock || '');
      });
      iteration++;
    }

    return result;
  }

  /**
   * Evaluate a condition
   */
  evaluateCondition(condition, vars) {
    // Handle "or" conditions: or .A .B
    if (condition.startsWith('or ')) {
      const parts = condition.substring(3).trim().split(/\s+/);
      return parts.some(part => this.resolveVariable(part, vars));
    }

    // Handle "and" conditions: and .A .B
    if (condition.startsWith('and ')) {
      const parts = condition.substring(4).trim().split(/\s+/);
      return parts.every(part => this.resolveVariable(part, vars));
    }

    // Handle "eq" conditions: eq .A "value"
    if (condition.startsWith('eq ')) {
      return this.evaluateComparison(condition, vars, 'eq');
    }

    // Handle "ne" conditions: ne .A "value"
    if (condition.startsWith('ne ')) {
      return this.evaluateComparison(condition, vars, 'ne');
    }

    // Simple variable check
    return this.resolveVariable(condition, vars);
  }

  /**
   * Process or expressions: {{ or .A .B .C }}
   */
  processOrExpressions(template, vars) {
    const orRegex = /\{\{\s*or\s+([^}]+?)\s*\}\}/g;
    return template.replace(orRegex, (match, args) => {
      const parts = args.trim().split(/\s+/);
      for (const part of parts) {
        const value = this.resolveVariable(part, vars);
        if (value) return value;
      }
      return '';
    });
  }

  /**
   * Process and expressions: {{ and .A .B .C }}
   */
  processAndExpressions(template, vars) {
    const andRegex = /\{\{\s*and\s+([^}]+?)\s*\}\}/g;
    return template.replace(andRegex, (match, args) => {
      const parts = args.trim().split(/\s+/);
      let lastValue = '';
      for (const part of parts) {
        const value = this.resolveVariable(part, vars);
        if (!value) return '';
        lastValue = value;
      }
      return lastValue;
    });
  }

  /**
   * Process comparison expressions: {{ eq .A "value" }}
   */
  processComparisonExpressions(template, vars) {
    const compRegex = /\{\{\s*(eq|ne)\s+([^}]+?)\s*\}\}/g;
    return template.replace(compRegex, (match, op, args) => {
      const result = this.evaluateComparison(`${op} ${args}`, vars, op);
      return result ? 'true' : 'false';
    });
  }

  /**
   * Evaluate a comparison (eq/ne)
   */
  evaluateComparison(condition, vars, operator) {
    // Extract parts: eq .Variable "value" or ne .Variable "value"
    const parts = condition.substring(operator.length + 1).trim();
    const match = parts.match(/^(\S+)\s+"([^"]*)"|^(\S+)\s+(\S+)/);
    
    if (!match) return false;

    const leftVar = match[1] || match[3];
    const rightVal = match[2] !== undefined ? match[2] : (match[4] || '');

    const leftValue = String(this.resolveVariable(leftVar, vars) || '');
    const rightValue = String(rightVal);

    if (operator === 'eq') {
      return leftValue === rightValue;
    } else if (operator === 'ne') {
      return leftValue !== rightValue;
    }

    return false;
  }

  /**
   * Process variable substitutions
   */
  processVariables(template, vars) {
    let result = template;

    // Process join function: {{ join .Categories "," }}
    result = this.processJoinFunction(result, vars);

    // {{ .Variable }} or {{ .Config.key }}
    const varRegex = /\{\{\s*\.([A-Za-z_][A-Za-z0-9_.]*)\s*\}\}/g;
    result = result.replace(varRegex, (match, varPath) => {
      return this.resolveVariable(`.${varPath}`, vars) || '';
    });

    return result;
  }

  /**
   * Process join function: {{ join .Array "separator" }}
   */
  processJoinFunction(template, vars) {
    const joinRegex = /\{\{\s*join\s+\.(\w+)\s+"([^"]*)"\s*\}\}/g;
    return template.replace(joinRegex, (match, varName, separator) => {
      const value = vars[varName];
      if (Array.isArray(value)) {
        return value.join(separator);
      }
      return value || '';
    });
  }

  /**
   * Resolve a variable path (e.g., .Keywords, .Config.sort, .Query.Album)
   */
  resolveVariable(varPath, vars) {
    if (!varPath) return '';

    // Remove leading dot
    const path = varPath.startsWith('.') ? varPath.substring(1) : varPath;

    // Handle .Config.key
    if (path.startsWith('Config.')) {
      const configKey = path.substring(7);
      return this.config[configKey] || '';
    }

    // Handle .Query.key
    if (path.startsWith('Query.')) {
      const queryKey = path.substring(6);
      const query = vars.Query || {};
      return query[queryKey] || '';
    }

    // Handle direct variable
    return vars[path] || '';
  }

  /**
   * Build search URL from path template
   */
  buildSearchURL(baseUrl, pathTemplate, searchQuery, categoryId = null, options = {}) {
    // Prepare variables
    const variables = {
      Keywords: searchQuery || '',
      Query: options.query || {},
      Categories: categoryId ? [categoryId] : [],
      Category: categoryId || '',
    };

    // Process template
    let path = this.process(pathTemplate, variables);

    // URL encode the query if it was substituted
    // This is done after template processing to avoid double-encoding
    if (searchQuery) {
      path = path.replace(encodeURIComponent(searchQuery), encodeURIComponent(searchQuery));
    }

    // Combine base URL and path
    const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const finalPath = path.startsWith('/') ? path : '/' + path;

    return url + finalPath;
  }

  /**
   * Build inputs/query parameters from template
   */
  buildInputs(inputsConfig, searchQuery, options = {}) {
    if (!inputsConfig) return {};

    const variables = {
      Keywords: searchQuery || '',
      Query: options.query || {},
      Categories: options.categoryId ? [options.categoryId] : [],
      Category: options.categoryId || '',
    };

    const result = {};

    for (const [key, value] of Object.entries(inputsConfig)) {
      if (typeof value === 'string') {
        result[key] = this.process(value, variables);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}

module.exports = CardigannTemplateEngine;

