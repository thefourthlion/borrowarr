const Settings = require('../models/Settings');
const fs = require('fs').promises;
const path = require('path');
const { importMoviesFromDirectory } = require('../services/libraryImporter');
const { importSeriesFromDirectory } = require('../services/seriesImporter');
const { previewMovieRenames, executeMovieRenames, previewSeriesRenames, executeSeriesRenames } = require('../services/fileRenamer');

// Lazy load auto-rename service to avoid circular dependency issues
let autoRenameService = null;
const getAutoRenameService = () => {
  if (!autoRenameService) {
    autoRenameService = require('../services/autoRenameService');
  }
  return autoRenameService;
};

// Lazy load download watcher service
let downloadWatcherService = null;
const getDownloadWatcherService = () => {
  if (!downloadWatcherService) {
    downloadWatcherService = require('../services/downloadWatcher');
  }
  return downloadWatcherService;
};

// Lazy load monitoring service
let monitoringService = null;
const getMonitoringService = () => {
  if (!monitoringService) {
    monitoringService = require('../services/monitoringService');
  }
  return monitoringService;
};

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

    // Validate media directories if provided (skip if null, undefined, or empty)
    // These are separate from download watcher directories
    // Only validate if a non-empty value is being set
    if (updates.movieDirectory !== undefined && updates.movieDirectory !== null && String(updates.movieDirectory).trim() !== '') {
      try {
        await fs.access(updates.movieDirectory);
      } catch (error) {
        console.error('Movie directory validation error:', error);
        // Don't fail if it's just for download watcher - only fail if user is actually setting media directory
        // Check if this is a download watcher-only update
        const isDownloadWatcherOnly = updates.movieDownloadDirectory !== undefined || 
                                     updates.seriesDownloadDirectory !== undefined ||
                                     updates.movieWatcherDestination !== undefined ||
                                     updates.seriesWatcherDestination !== undefined;
        
        if (!isDownloadWatcherOnly) {
          return res.status(400).json({ 
            error: 'Movie directory does not exist or is not accessible',
            field: 'movieDirectory',
            message: error.message
          });
        }
        // If it's a download watcher update, just log the warning but don't fail
        console.warn('Movie directory validation failed but continuing (download watcher update)');
      }
    }

    if (updates.seriesDirectory !== undefined && updates.seriesDirectory !== null && String(updates.seriesDirectory).trim() !== '') {
      try {
        await fs.access(updates.seriesDirectory);
      } catch (error) {
        console.error('Series directory validation error:', error);
        // Don't fail if it's just for download watcher - only fail if user is actually setting media directory
        const isDownloadWatcherOnly = updates.movieDownloadDirectory !== undefined || 
                                     updates.seriesDownloadDirectory !== undefined ||
                                     updates.movieWatcherDestination !== undefined ||
                                     updates.seriesWatcherDestination !== undefined;
        
        if (!isDownloadWatcherOnly) {
          return res.status(400).json({ 
            error: 'Series directory does not exist or is not accessible',
            field: 'seriesDirectory',
            message: error.message
          });
        }
        // If it's a download watcher update, just log the warning but don't fail
        console.warn('Series directory validation failed but continuing (download watcher update)');
      }
    }

    // Validate download watcher directories if provided
    // Only validate if the directory is being set (not null/empty)
    // For download watcher, you need BOTH source and destination for each type, but you can configure just movies OR just series
    
    // Movie download watcher: if either is set, both should be set
    const hasMovieDownloadSource = updates.movieDownloadDirectory !== undefined && updates.movieDownloadDirectory !== null && String(updates.movieDownloadDirectory).trim() !== '';
    const hasMovieDownloadDest = updates.movieWatcherDestination !== undefined && updates.movieWatcherDestination !== null && String(updates.movieWatcherDestination).trim() !== '';
    
    if (hasMovieDownloadSource || hasMovieDownloadDest) {
      // If one is set, the other should also be set
      if (!hasMovieDownloadSource || !hasMovieDownloadDest) {
        return res.status(400).json({ 
          error: 'Movie download watcher requires both download directory and destination directory',
          field: hasMovieDownloadSource ? 'movieWatcherDestination' : 'movieDownloadDirectory'
        });
      }
      
      // Validate both exist
      try {
        await fs.access(updates.movieDownloadDirectory);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Movie download directory does not exist or is not accessible',
          field: 'movieDownloadDirectory',
          message: error.message
        });
      }
      
      try {
        await fs.access(updates.movieWatcherDestination);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Movie watcher destination does not exist or is not accessible',
          field: 'movieWatcherDestination',
          message: error.message
        });
      }
    }
    
    // Series download watcher: if either is set, both should be set
    const hasSeriesDownloadSource = updates.seriesDownloadDirectory !== undefined && updates.seriesDownloadDirectory !== null && String(updates.seriesDownloadDirectory).trim() !== '';
    const hasSeriesDownloadDest = updates.seriesWatcherDestination !== undefined && updates.seriesWatcherDestination !== null && String(updates.seriesWatcherDestination).trim() !== '';
    
    if (hasSeriesDownloadSource || hasSeriesDownloadDest) {
      // If one is set, the other should also be set
      if (!hasSeriesDownloadSource || !hasSeriesDownloadDest) {
        return res.status(400).json({ 
          error: 'Series download watcher requires both download directory and destination directory',
          field: hasSeriesDownloadSource ? 'seriesWatcherDestination' : 'seriesDownloadDirectory'
        });
      }
      
      // Validate both exist
      try {
        await fs.access(updates.seriesDownloadDirectory);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Series download directory does not exist or is not accessible',
          field: 'seriesDownloadDirectory',
          message: error.message
        });
      }
      
      try {
        await fs.access(updates.seriesWatcherDestination);
      } catch (error) {
        return res.status(400).json({ 
          error: 'Series watcher destination does not exist or is not accessible',
          field: 'seriesWatcherDestination',
          message: error.message
        });
      }
    }

    // Find or create settings
    let settings = await Settings.findOne({ where: { userId } });
    
    // Track if auto-rename settings changed
    const autoRenameChanged = settings && (
      updates.autoRename !== undefined && settings.autoRename !== updates.autoRename ||
      updates.autoRenameInterval !== undefined && settings.autoRenameInterval !== updates.autoRenameInterval
    );
    
    if (!settings) {
      settings = await Settings.create({ userId, ...updates });
    } else {
      // Only update fields that are provided in the request
      const fieldsToUpdate = {};
      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fieldsToUpdate[key] = updates[key];
        }
      });
      await settings.update(fieldsToUpdate);
      // Reload to get updated values
      await settings.reload();
    }

    // Update auto-rename service if settings changed
    if (autoRenameChanged || (!settings && updates.autoRename)) {
      try {
        const { updateUserAutoRename } = getAutoRenameService();
        await updateUserAutoRename(
          userId, 
          settings.autoRename, 
          settings.autoRenameInterval || 60
        );
        console.log(`🔄 [Settings] Auto-rename service updated for user ${userId}: enabled=${settings.autoRename}, interval=${settings.autoRenameInterval}min`);
      } catch (autoRenameError) {
        console.error('Error updating auto-rename service:', autoRenameError);
        // Don't fail the request, just log the error
      }
    }

    // Update download watcher if settings changed
    const watcherSettingsChanged = (
      updates.downloadWatcherEnabled !== undefined ||
      updates.movieDownloadDirectory !== undefined ||
      updates.seriesDownloadDirectory !== undefined ||
      updates.movieWatcherDestination !== undefined ||
      updates.seriesWatcherDestination !== undefined ||
      updates.watcherInterval !== undefined
    );

    if (watcherSettingsChanged) {
      try {
        const { updateWatcher } = getDownloadWatcherService();
        updateWatcher(userId, settings.toJSON());
        console.log(`👁️ [Settings] Download watcher updated for user ${userId}: enabled=${settings.downloadWatcherEnabled}`);
      } catch (watcherError) {
        console.error('Error updating download watcher:', watcherError);
        // Don't fail the request, just log the error
      }
    }

    // Update monitoring scheduler if checkInterval or autoDownload changed
    const monitoringSettingsChanged = (
      updates.checkInterval !== undefined ||
      updates.autoDownload !== undefined
    );

    if (monitoringSettingsChanged) {
      try {
        const { scheduleUserMonitoring } = getMonitoringService();
        await scheduleUserMonitoring(userId);
        console.log(`🔄 [Settings] Monitoring scheduler updated for user ${userId}: checkInterval=${settings.checkInterval}min, autoDownload=${settings.autoDownload}`);
      } catch (monitoringError) {
        console.error('Error updating monitoring scheduler:', monitoringError);
        // Don't fail the request, just log the error
      }
    }

    res.json(settings);
  } catch (error) {
    console.error('Error updating settings:', error);
    // Provide more detailed error information
    const errorMessage = error.message || 'Failed to update settings';
    const statusCode = error.name === 'SequelizeValidationError' ? 400 : 500;
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.errors || undefined
    });
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
 * Supports network shares on Windows (UNC paths), macOS, and Linux
 */
exports.browseDirectories = async (req, res) => {
  try {
    const { currentPath } = req.query;
    let browsePath = currentPath || '/';

    // Handle Windows UNC paths (\\server\share)
    const isWindowsUNC = browsePath.startsWith('\\\\') || browsePath.startsWith('//');
    
    // Security: Prevent path traversal attacks
    // For UNC paths, normalize but preserve the UNC format
    if (isWindowsUNC) {
      // Normalize UNC path (convert // to \\, remove redundant separators)
      browsePath = browsePath.replace(/[/\\]+/g, '\\');
      // Ensure it starts with \\
      if (!browsePath.startsWith('\\\\')) {
        browsePath = '\\' + browsePath;
      }
    } else {
      // For regular paths, use path.resolve but handle network mounts
      // On macOS, network mounts are often in /Volumes
      // On Linux, they might be in /mnt or /media
      const normalized = path.resolve(browsePath);
      
      // Check if the resolved path is still accessible (network paths might resolve differently)
      try {
        await fs.access(normalized);
        browsePath = normalized;
      } catch {
        // If resolved path doesn't exist, try the original (might be a network path)
        try {
          await fs.access(browsePath);
          // Keep original path
        } catch {
          browsePath = normalized;
        }
      }
    }

    try {
      const entries = await fs.readdir(browsePath, { withFileTypes: true });
      
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => {
          const entryPath = isWindowsUNC 
            ? path.win32.join(browsePath, entry.name)
            : path.join(browsePath, entry.name);
          return {
            name: entry.name,
            path: entryPath,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      // Add parent directory option if not at root
      let parentPath = null;
      let isRoot = false;
      
      if (isWindowsUNC) {
        // For UNC paths, check if we're at the share root (\\server\share)
        const parts = browsePath.split('\\').filter(p => p);
        if (parts.length <= 2) {
          isRoot = true;
        } else {
          parentPath = parts.slice(0, -1).join('\\');
          if (!parentPath.startsWith('\\\\')) {
            parentPath = '\\\\' + parentPath;
          }
        }
      } else {
        parentPath = path.dirname(browsePath);
        const parsed = path.parse(browsePath);
        isRoot = browsePath === parsed.root || browsePath === '/';
      }

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

/**
 * Get auto-rename service status for user
 */
exports.getAutoRenameStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { getUserAutoRenameStatus } = getAutoRenameService();
    const status = getUserAutoRenameStatus(userId);
    
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Error getting auto-rename status:', error);
    res.status(500).json({ error: 'Failed to get auto-rename status' });
  }
};

/**
 * Trigger manual auto-rename run for user
 */
exports.triggerAutoRename = async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log(`🔄 [Settings] Manual auto-rename trigger for user ${userId}`);
    
    const { triggerManualRun } = getAutoRenameService();
    const results = await triggerManualRun(userId);
    
    res.json({
      success: results.success,
      results: results.results,
      duration: results.duration,
      error: results.error,
    });
  } catch (error) {
    console.error('Error triggering auto-rename:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger auto-rename' });
  }
};

/**
 * Get download watcher status for user
 */
exports.getDownloadWatcherStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { getWatcherStatus } = getDownloadWatcherService();
    const status = getWatcherStatus(userId);
    
    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Error getting download watcher status:', error);
    res.status(500).json({ error: 'Failed to get download watcher status' });
  }
};

/**
 * Trigger manual download watcher scan for user
 */
exports.triggerDownloadWatcherScan = async (req, res) => {
  try {
    const userId = req.userId;
    
    console.log(`👁️ [Settings] Manual download watcher scan for user ${userId}`);
    
    const { triggerScan } = getDownloadWatcherService();
    const result = await triggerScan(userId);
    
    res.json(result);
  } catch (error) {
    console.error('Error triggering download watcher scan:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger scan' });
  }
};

/**
 * Get pending files waiting for approval
 */
exports.getPendingFiles = async (req, res) => {
  try {
    const userId = req.userId;
    const { getPendingFiles } = getDownloadWatcherService();
    const files = getPendingFiles(userId);
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error getting pending files:', error);
    res.status(500).json({ error: 'Failed to get pending files' });
  }
};

/**
 * Approve a pending file (move it)
 */
exports.approveFile = async (req, res) => {
  try {
    const userId = req.userId;
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    const { approveFile } = getDownloadWatcherService();
    const result = await approveFile(userId, fileId);
    
    res.json(result);
  } catch (error) {
    console.error('Error approving file:', error);
    res.status(500).json({ error: error.message || 'Failed to approve file' });
  }
};

/**
 * Reject a pending file (ignore it)
 */
exports.rejectFile = async (req, res) => {
  try {
    const userId = req.userId;
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    const { rejectFile } = getDownloadWatcherService();
    const result = rejectFile(userId, fileId);
    
    res.json(result);
  } catch (error) {
    console.error('Error rejecting file:', error);
    res.status(500).json({ error: error.message || 'Failed to reject file' });
  }
};

