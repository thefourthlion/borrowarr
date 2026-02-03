/**
 * Cardigann Controller
 * Handles API requests for Cardigann-based indexer scraping
 */

const path = require('path');
const { getCardigannEngine } = require('../cardigann');

const definitionsPath = path.join(__dirname, '../cardigann-indexer-yamls');
const cardigann = getCardigannEngine(definitionsPath);

/**
 * Get all available indexers
 */
const getAllIndexers = async (req, res) => {
  try {
    const indexers = cardigann.getAllIndexers();

    // Format response
    const formatted = indexers.map(def => ({
      id: def.id,
      name: def.name,
      description: def.description || '',
      language: def.language || 'en-US',
      type: def.type || 'public',
      links: def.links || [],
      categories: def.caps?.categorymappings?.length || 0,
    }));

    res.json({
      success: true,
      count: formatted.length,
      indexers: formatted,
    });
  } catch (error) {
    console.error('Error getting indexers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get specific indexer information
 */
const getIndexer = async (req, res) => {
  try {
    const { id } = req.params;
    const indexer = cardigann.getIndexer(id);

    if (!indexer) {
      return res.status(404).json({
        success: false,
        error: `Indexer not found: ${id}`,
      });
    }

    res.json({
      success: true,
      indexer: {
        id: indexer.id,
        name: indexer.name,
        description: indexer.description || '',
        language: indexer.language || 'en-US',
        type: indexer.type || 'public',
        encoding: indexer.encoding || 'UTF-8',
        links: indexer.links || [],
        legacylinks: indexer.legacylinks || [],
        caps: indexer.caps || {},
        settings: indexer.settings || [],
      },
    });
  } catch (error) {
    console.error('Error getting indexer:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Search a specific indexer
 */
const searchIndexer = async (req, res) => {
  try {
    const { id } = req.params;
    const { q, query, category } = req.query;

    const searchQuery = q || query || '';

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required (use ?q=...)',
      });
    }

    const options = {
      categoryId: category,
      query: req.query,
    };

    const result = await cardigann.search(id, searchQuery, options);

    res.json(result);
  } catch (error) {
    console.error('Error searching indexer:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      results: [],
    });
  }
};

/**
 * Search multiple indexers
 */
const searchMultiple = async (req, res) => {
  try {
    const { indexers, query, q, category } = req.body;

    const searchQuery = query || q || '';

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }

    if (!indexers || !Array.isArray(indexers) || indexers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Indexers array is required',
      });
    }

    const options = {
      categoryId: category,
    };

    const results = await cardigann.search(indexers, searchQuery, options);

    // Combine all results
    const allResults = [];
    const errors = [];

    for (const result of results) {
      if (result.success) {
        allResults.push(...result.results);
      } else {
        errors.push({
          indexer: result.indexerId,
          error: result.error,
        });
      }
    }

    res.json({
      success: true,
      query: searchQuery,
      totalResults: allResults.length,
      indexersSearched: indexers.length,
      indexersSucceeded: results.filter(r => r.success).length,
      indexersFailed: results.filter(r => !r.success).length,
      results: allResults,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error searching multiple indexers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      results: [],
    });
  }
};

/**
 * Test indexer connection
 */
const testIndexer = async (req, res) => {
  try {
    const { id } = req.params;

    const scraper = cardigann.getScraper(id);
    const result = await scraper.test();

    res.json({
      success: result.success,
      indexer: id,
      message: result.message,
      resultCount: result.resultCount,
    });
  } catch (error) {
    console.error('Error testing indexer:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get statistics
 */
const getStats = async (req, res) => {
  try {
    const stats = cardigann.loader.getStats();

    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Reload definitions (development only)
 */
const reload = async (req, res) => {
  try {
    cardigann.reload();

    res.json({
      success: true,
      message: 'Definitions reloaded successfully',
    });
  } catch (error) {
    console.error('Error reloading definitions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  getAllIndexers,
  getIndexer,
  searchIndexer,
  searchMultiple,
  testIndexer,
  getStats,
  reload,
};

