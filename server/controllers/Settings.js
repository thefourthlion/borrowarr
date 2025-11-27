const Settings = require('../models/Settings');
const fs = require('fs').promises;
const path = require('path');
const { importMoviesFromDirectory } = require('../services/libraryImporter');
const { importSeriesFromDirectory } = require('../services/seriesImporter');
const { previewMovieRenames, executeMovieRenames, previewSeriesRenames, executeSeriesRenames } = require('../services/fileRenamer');

/**
 * Get user settings
 */
exports.getSettings = async (req, res) => {
  try {
    const userId = req.userId;

    let settings = await Settings.findOne({ where: { userId } });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({ userId });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

/**
 * Get public registration status (no auth required)
 */
exports.getPublicRegistrationStatus = async (req, res) => {
  try {
    // Get the first user's settings (admin settings) or default
    const settings = await Settings.findOne({ order: [['createdAt', 'ASC']] });
    
    res.json({ 
      enabled: settings ? settings.publicRegistrationEnabled : true 
    });
  } catch (error) {
    console.error('Error fetching registration status:', error);
    res.status(500).json({ error: 'Failed to fetch registration status' });
  }
};

/**
 * Update user settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const userId = req.userId;
    const updates = req.body;

    // Validate directories if provided (skip if null or empty)
    if (updates.movieDirectory && updates.movieDirectory.trim() !== '') {
      try {
        await fs.access(updates.movieDirectory);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Movie directory does not exist or is not accessible',
          field: 'movieDirectory'
        });
      }
    }

    if (updates.seriesDirectory && updates.seriesDirectory.trim() !== '') {
      try {
        await fs.access(updates.seriesDirectory);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Series directory does not exist or is not accessible',
          field: 'seriesDirectory'
        });
      }
    }

    // Find or create settings
    let settings = await Settings.findOne({ where: { userId } });
    
    if (!settings) {
      settings = await Settings.create({ userId, ...updates });
    } else {
      await settings.update(updates);
    }

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

/**
 * Test directory access
 */
exports.testDirectory = async (req, res) => {
  try {
    const { directory } = req.body;

    if (!directory) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    // Check if directory exists and is accessible
    try {
      const stats = await fs.stat(directory);
      
      if (!stats.isDirectory()) {
        return res.status(400).json({ 
          error: 'Path is not a directory',
          accessible: false
        });
      }

      // Try to read the directory
      await fs.readdir(directory);

      res.json({ 
        accessible: true,
        exists: true,
        writable: true, // We could add a more sophisticated check here
        path: directory
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ 
          error: 'Directory does not exist',
          accessible: false,
          exists: false
        });
      } else if (error.code === 'EACCES') {
        return res.status(403).json({ 
          error: 'Permission denied',
          accessible: false,
          exists: true
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error testing directory:', error);
    res.status(500).json({ error: 'Failed to test directory' });
  }
};

/**
 * Browse directories (for directory picker)
 */
exports.browseDirectories = async (req, res) => {
  try {
    const { currentPath } = req.query;
    let browsePath = currentPath || '/';

    // Security: Prevent path traversal attacks
    browsePath = path.resolve(browsePath);

    try {
      const entries = await fs.readdir(browsePath, { withFileTypes: true });
      
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(browsePath, entry.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Add parent directory option if not at root
      const parentPath = path.dirname(browsePath);
      const isRoot = browsePath === path.parse(browsePath).root;

      res.json({
        currentPath: browsePath,
        parentPath: isRoot ? null : parentPath,
        directories,
      });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'Directory does not exist' });
      } else if (error.code === 'EACCES') {
        return res.status(403).json({ error: 'Permission denied' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error browsing directories:', error);
    res.status(500).json({ error: 'Failed to browse directories' });
  }
};

/**
 * Import movies from directory into monitored list
 */
exports.importMovies = async (req, res) => {
  try {
    const userId = req.userId;
    const { dryRun = false } = req.body;

    console.log(`📥 Starting movie import for user ${userId} (dryRun: ${dryRun})`);

    const results = await importMoviesFromDirectory(userId, {
      dryRun,
      qualityProfile: 'any',
      minAvailability: 'released',
      monitor: 'movieOnly',
    });

    res.json({
      success: true,
      results,
      message: dryRun 
        ? `Dry run complete. Would import ${results.imported} movies.`
        : `Import complete! Imported ${results.imported} movies.`,
    });
  } catch (error) {
    console.error('Error importing movies:', error);
    res.status(500).json({ error: error.message || 'Failed to import movies' });
  }
};

/**
 * Import series from directory into monitored list
 */
exports.importSeries = async (req, res) => {
  try {
    const userId = req.userId;
    const { dryRun = false } = req.body;

    console.log(`📺 Starting series import for user ${userId} (dryRun: ${dryRun})`);

    const results = await importSeriesFromDirectory(userId, {
      dryRun,
      qualityProfile: 'any',
      minAvailability: 'released',
      monitor: 'all',
    });

    res.json({
      success: true,
      results,
      message: dryRun 
        ? `Dry run complete. Would import ${results.imported} series.`
        : `Import complete! Imported ${results.imported} series.`,
    });
  } catch (error) {
    console.error('Error importing series:', error);
    res.status(500).json({ error: error.message || 'Failed to import series' });
  }
};

/**
 * Preview file renames based on naming format
 */
exports.previewRenames = async (req, res) => {
  try {
    const userId = req.userId;
    const { movieFileFormat, seriesFileFormat } = req.body;

    console.log(`🔍 Previewing renames for user ${userId}`);

    const results = {
      movies: [],
      series: [],
      total: 0,
    };

    // Preview movie renames if format provided
    if (movieFileFormat) {
      results.movies = await previewMovieRenames(userId, movieFileFormat);
    }

    // Preview series renames if format provided
    if (seriesFileFormat) {
      results.series = await previewSeriesRenames(userId, seriesFileFormat);
    }

    results.total = results.movies.length + results.series.length;

    res.json({
      success: true,
      renames: results.movies, // For backwards compatibility with existing frontend
      movies: results.movies,
      series: results.series,
      count: results.total,
    });
  } catch (error) {
    console.error('Error previewing renames:', error);
    res.status(500).json({ error: error.message || 'Failed to preview renames' });
  }
};

/**
 * Execute file renames
 */
exports.executeRenames = async (req, res) => {
  try {
    const userId = req.userId;
    const { renames, type } = req.body; // type can be 'movies' or 'series'

    if (!renames || !Array.isArray(renames)) {
      return res.status(400).json({ error: 'Renames array is required' });
    }

    console.log(`✏️  Executing ${renames.length} ${type || 'file'} renames for user ${userId}`);

    let results;

    // Detect type from first item if not specified
    const actualType = type || (renames[0]?.seriesId ? 'series' : 'movies');

    if (actualType === 'series') {
      results = await executeSeriesRenames(userId, renames);
    } else {
      results = await executeMovieRenames(userId, renames);
    }

    res.json({
      success: true,
      results,
      message: `Renamed ${results.success} file(s). Failed: ${results.failed}`,
    });
  } catch (error) {
    console.error('Error executing renames:', error);
    res.status(500).json({ error: error.message || 'Failed to execute renames' });
  }
};
