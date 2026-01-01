/**
 * Download Watcher Service
 * 
 * Watches separate movie and TV download directories and moves files
 * to the appropriate media library folders.
 * Supports both auto-approve and manual approval modes.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Settings = require('../models/Settings');

// Video file extensions to look for
const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v',
  '.mpg', '.mpeg', '.m2ts', '.ts', '.vob', '.divx', '.xvid'
]);

// User watcher instances
const userWatchers = new Map();

// Stats tracking per user
const userStats = new Map();

// Pending files per user (for manual approval mode)
const userPendingFiles = new Map();

class DownloadWatcher {
  constructor(userId, settings) {
    this.userId = userId;
    this.settings = settings;
    this.isRunning = false;
    this.intervalId = null;
    this.processedFiles = {
      movies: new Set(),
      series: new Set(),
    };
    this.processedFolders = {
      movies: new Set(),
      series: new Set(),
    };
  }

  /**
   * Start the watcher
   */
  start() {
    if (this.isRunning) return;
    
    console.log(`[DownloadWatcher] Starting watcher for user ${this.userId}`);
    this.isRunning = true;
    
    // Initialize stats
    if (!userStats.has(this.userId)) {
      userStats.set(this.userId, {
        lastRun: null,
        filesProcessed: 0,
        moviesProcessed: 0,
        seriesProcessed: 0,
        errors: 0,
      });
    }
    
    // Initialize pending files
    if (!userPendingFiles.has(this.userId)) {
      userPendingFiles.set(this.userId, []);
    }
    
    // Set up interval
    const intervalSeconds = Math.max(10, this.settings.watcherInterval || 30);
    this.intervalId = setInterval(() => this.scan(), intervalSeconds * 1000);
    
    // Run initial scan
    this.scan();
  }

  /**
   * Stop the watcher
   */
  stop() {
    if (!this.isRunning) return;
    
    console.log(`[DownloadWatcher] Stopping watcher for user ${this.userId}`);
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Update watcher settings
   */
  updateSettings(settings) {
    this.settings = settings;
    
    // Restart if running to apply new settings
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Scan both download directories
   */
  async scan() {
    if (!this.isRunning) return;

    const stats = userStats.get(this.userId);
    stats.lastRun = new Date();

    // Scan movie downloads
    if (this.settings.movieDownloadDirectory && this.settings.movieWatcherDestination) {
      await this.scanDirectory(
        this.settings.movieDownloadDirectory,
        this.settings.movieWatcherDestination,
        'movie'
      );
    }

    // Scan series downloads
    if (this.settings.seriesDownloadDirectory && this.settings.seriesWatcherDestination) {
      await this.scanDirectory(
        this.settings.seriesDownloadDirectory,
        this.settings.seriesWatcherDestination,
        'series'
      );
    }
  }

  /**
   * Check if a folder contains video files
   */
  async folderContainsVideos(folderPath) {
    try {
      const files = await this.getVideoFiles(folderPath);
      return files.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get root folders (immediate children) in the download directory
   * Also handles files directly in the download directory
   */
  async getRootFolders(sourceDir) {
    const rootFolders = [];
    const rootFiles = [];
    
    try {
      const entries = await fs.readdir(sourceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderPath = path.join(sourceDir, entry.name);
          rootFolders.push(folderPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (VIDEO_EXTENSIONS.has(ext)) {
            rootFiles.push(path.join(sourceDir, entry.name));
          }
        }
      }
    } catch (error) {
      console.error(`[DownloadWatcher] Error reading root folders:`, error.message);
    }
    
    // Return both folders and individual files
    return { folders: rootFolders, files: rootFiles };
  }

  /**
   * Scan a specific download directory
   * Moves entire root folders instead of individual files
   */
  async scanDirectory(sourceDir, destDir, type) {
    const stats = userStats.get(this.userId);
    const processedFolders = type === 'movie' ? this.processedFolders.movies : this.processedFolders.series;
    const pendingFiles = userPendingFiles.get(this.userId);

    try {
      // Check if source directory exists
      try {
        await fs.access(sourceDir);
      } catch {
        return;
      }

      // Get root folders (immediate children) in the download directory
      const { folders: rootFolders, files: rootFiles } = await this.getRootFolders(sourceDir);
      
      // Handle individual files directly in the download directory
      const processedSet = type === 'movie' ? this.processedFiles.movies : this.processedFiles.series;
      for (const filePath of rootFiles) {
        // Skip if already processed or pending
        if (processedSet.has(filePath)) continue;
        if (pendingFiles.some(pf => pf.sourcePath === filePath)) continue;
        
        // Check if file is still being written
        const isStable = await this.isFileStable(filePath);
        if (!isStable) continue;
        
        try {
          const fileName = path.basename(filePath);
          const fileStats = await fs.stat(filePath);
          
          if (this.settings.watcherAutoApprove) {
            // Auto-move mode - move individual file
            await this.moveFile(filePath, destDir, type);
            processedSet.add(filePath); // Track as processed
            stats.filesProcessed++;
            if (type === 'movie') {
              stats.moviesProcessed++;
            } else {
              stats.seriesProcessed++;
            }
          } else {
            // Manual approval mode - add to pending queue
            const fileId = crypto.randomBytes(8).toString('hex');
            pendingFiles.push({
              id: fileId,
              filename: fileName,
              sourcePath: filePath,
              destinationPath: path.join(destDir, fileName),
              type: type,
              size: fileStats.size,
              detectedAt: new Date().toISOString(),
              // No folderPath - this is a direct file
            });
            console.log(`[DownloadWatcher] Added to pending: ${fileName}`);
          }
        } catch (error) {
          console.error(`[DownloadWatcher] Error processing file ${filePath}:`, error.message);
          stats.errors++;
        }
      }
      
      // Handle folders in the download directory
      for (const folderPath of rootFolders) {
        // Skip if already processed
        if (processedFolders.has(folderPath)) continue;
        
        // Check if folder contains video files
        const hasVideos = await this.folderContainsVideos(folderPath);
        if (!hasVideos) {
          console.log(`[DownloadWatcher] Skipping folder (no videos): ${folderPath}`);
          continue;
        }
        
        // Check if any files in the folder are still being written
        const files = await this.getVideoFiles(folderPath);
        let allStable = true;
        for (const filePath of files) {
          const isStable = await this.isFileStable(filePath);
          if (!isStable) {
            allStable = false;
            break;
          }
        }
        
        if (!allStable) {
          console.log(`[DownloadWatcher] Skipping folder (files still downloading): ${folderPath}`);
          continue;
        }
        
        try {
          const folderName = path.basename(folderPath);
          
          if (this.settings.watcherAutoApprove) {
            // Auto-move mode - move entire folder
            await this.moveFolder(folderPath, destDir, type);
            processedFolders.add(folderPath);
            
            // Count files moved
            const fileCount = files.length;
            stats.filesProcessed += fileCount;
            if (type === 'movie') {
              stats.moviesProcessed += fileCount;
            } else {
              stats.seriesProcessed += fileCount;
            }
          } else {
            // Manual approval mode - add folder to pending queue
            // For manual approval, we still track individual files but group by folder
            for (const filePath of files) {
              if (pendingFiles.some(pf => pf.sourcePath === filePath)) continue;
              
              const fileName = path.basename(filePath);
              const fileStats = await fs.stat(filePath);
              const fileId = crypto.randomBytes(8).toString('hex');
              
              // Calculate relative path from folder root to preserve structure
              const relativePath = path.relative(folderPath, filePath);
              const destinationPath = path.join(destDir, folderName, relativePath);
              
              pendingFiles.push({
                id: fileId,
                filename: fileName,
                sourcePath: filePath,
                destinationPath: destinationPath,
                type: type,
                size: fileStats.size,
                detectedAt: new Date().toISOString(),
                folderPath: folderPath, // Track which folder this belongs to
              });
            }
            console.log(`[DownloadWatcher] Added folder to pending: ${folderName} (${files.length} files)`);
          }
        } catch (error) {
          console.error(`[DownloadWatcher] Error processing folder ${folderPath}:`, error.message);
          stats.errors++;
        }
      }
      
      // Clean up processed folders and files that no longer exist
      this.cleanupProcessedFolders(processedFolders);
      this.cleanupProcessedFiles(processedSet);
      
    } catch (error) {
      console.error(`[DownloadWatcher] Scan error for ${type}:`, error.message);
      stats.errors++;
    }
  }

  /**
   * Get all video files in a directory recursively
   */
  async getVideoFiles(dir, files = []) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip sample and extras folders
          const lowerName = entry.name.toLowerCase();
          if (['sample', 'subs', 'subtitles', 'extras', 'featurettes'].includes(lowerName)) {
            continue;
          }
          await this.getVideoFiles(fullPath, files);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (VIDEO_EXTENSIONS.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return files;
  }

  /**
   * Check if a file has stopped being written to
   */
  async isFileStable(filePath, waitMs = 2000) {
    try {
      const stat1 = await fs.stat(filePath);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      const stat2 = await fs.stat(filePath);
      
      return stat1.size === stat2.size && stat1.mtimeMs === stat2.mtimeMs;
    } catch {
      return false;
    }
  }

  /**
   * Move a file to the destination directory
   * Supports network shares (Windows UNC paths, macOS/Unix mounts)
   */
  async moveFile(filePath, destDir, type) {
    const fileName = path.basename(filePath);
    const stats = userStats.get(this.userId);
    
    console.log(`[DownloadWatcher] Moving ${type}: ${fileName}`);
    
    // Ensure destination directory exists (works with network shares)
    try {
      await fs.mkdir(destDir, { recursive: true });
    } catch (error) {
      // If mkdir fails, check if directory already exists
      try {
        await fs.access(destDir);
      } catch {
        throw new Error(`Cannot create destination directory: ${destDir} - ${error.message}`);
      }
    }
    
    // Build destination path - handle Windows UNC paths
    const isWindowsUNC = destDir.startsWith('\\\\') || destDir.startsWith('//');
    const destPath = isWindowsUNC 
      ? path.win32.join(destDir, fileName)
      : path.join(destDir, fileName);
    
    // Check if file already exists at destination - if so, we'll overwrite it
    const fileExists = await fs.access(destPath).then(() => true).catch(() => false);
    if (fileExists) {
      console.log(`[DownloadWatcher] File already exists at destination, will overwrite: ${fileName}`);
      // Remove existing file before moving
      try {
        await fs.unlink(destPath);
      } catch (error) {
        console.warn(`[DownloadWatcher] Could not remove existing file, will try to overwrite anyway: ${error.message}`);
      }
    }
    
    // Move the file (fs.rename works with network shares)
    try {
      await fs.rename(filePath, destPath);
      console.log(`[DownloadWatcher] Moved: ${fileName} → ${destDir}`);
    } catch (error) {
      // If rename fails (e.g., cross-device on network shares), try copy + delete
      if (error.code === 'EXDEV' || error.message.includes('cross-device')) {
        console.log(`[DownloadWatcher] Cross-device move detected, using copy+delete for: ${fileName}`);
        await fs.copyFile(filePath, destPath);
        await fs.unlink(filePath);
        console.log(`[DownloadWatcher] Copied and removed: ${fileName} → ${destDir}`);
      } else {
        throw error;
      }
    }
    
    // Track in recent files (keep last 20)
    if (!stats.recentFiles) {
      stats.recentFiles = [];
    }
    stats.recentFiles.unshift({
      name: fileName,
      type: type,
      destination: destDir,
      timestamp: new Date().toISOString(),
    });
    if (stats.recentFiles.length > 20) {
      stats.recentFiles = stats.recentFiles.slice(0, 20);
    }
  }

  /**
   * Clean up processed files that no longer exist
   */
  async cleanupProcessedFiles(processedSet) {
    const toRemove = [];
    
    for (const filePath of processedSet) {
      try {
        await fs.access(filePath);
      } catch {
        toRemove.push(filePath);
      }
    }
    
    for (const filePath of toRemove) {
      processedSet.delete(filePath);
    }
  }

  /**
   * Clean up processed folders that no longer exist
   */
  async cleanupProcessedFolders(processedSet) {
    const toRemove = [];
    
    for (const folderPath of processedSet) {
      try {
        await fs.access(folderPath);
      } catch {
        toRemove.push(folderPath);
      }
    }
    
    for (const folderPath of toRemove) {
      processedSet.delete(folderPath);
    }
  }

  /**
   * Move an entire folder to the destination directory
   * Preserves the folder structure
   */
  async moveFolder(folderPath, destDir, type) {
    const folderName = path.basename(folderPath);
    const stats = userStats.get(this.userId);
    
    console.log(`[DownloadWatcher] Moving ${type} folder: ${folderName}`);
    
    // Ensure destination directory exists
    try {
      await fs.mkdir(destDir, { recursive: true });
    } catch (error) {
      try {
        await fs.access(destDir);
      } catch {
        throw new Error(`Cannot create destination directory: ${destDir} - ${error.message}`);
      }
    }
    
    // Build destination path
    const isWindowsUNC = destDir.startsWith('\\\\') || destDir.startsWith('//');
    const destFolderPath = isWindowsUNC 
      ? path.win32.join(destDir, folderName)
      : path.join(destDir, folderName);
    
    // Check if folder already exists at destination - if so, we'll overwrite it
    try {
      const destExists = await fs.access(destFolderPath).then(() => true).catch(() => false);
      if (destExists) {
        console.log(`[DownloadWatcher] Folder already exists at destination, will overwrite: ${folderName}`);
        // Remove existing folder recursively
        try {
          await fs.rm(destFolderPath, { recursive: true, force: true });
        } catch (error) {
          console.warn(`[DownloadWatcher] Could not remove existing folder, will try to overwrite anyway: ${error.message}`);
        }
      }
    } catch (error) {
      // Folder doesn't exist, continue
    }
    
    // Move the entire folder
    try {
      await fs.rename(folderPath, destFolderPath);
      console.log(`[DownloadWatcher] Moved folder: ${folderName} → ${destDir}`);
    } catch (error) {
      // If rename fails (e.g., cross-device on network shares), use copy + delete
      if (error.code === 'EXDEV' || error.message.includes('cross-device')) {
        console.log(`[DownloadWatcher] Cross-device move detected, using copy+delete for folder: ${folderName}`);
        await this.copyFolderRecursive(folderPath, destFolderPath);
        await fs.rm(folderPath, { recursive: true, force: true });
        console.log(`[DownloadWatcher] Copied and removed folder: ${folderName} → ${destDir}`);
      } else {
        throw error;
      }
    }
    
    // Track in recent files (keep last 20)
    if (!stats.recentFiles) {
      stats.recentFiles = [];
    }
    stats.recentFiles.unshift({
      name: folderName,
      type: type,
      destination: destDir,
      timestamp: new Date().toISOString(),
    });
    if (stats.recentFiles.length > 20) {
      stats.recentFiles = stats.recentFiles.slice(0, 20);
    }
  }

  /**
   * Recursively copy a folder and all its contents
   */
  async copyFolderRecursive(sourcePath, destPath) {
    // Ensure destination directory exists
    await fs.mkdir(destPath, { recursive: true });
    
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    
    for (const entry of entries) {
      const sourceEntryPath = path.join(sourcePath, entry.name);
      const destEntryPath = path.join(destPath, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyFolderRecursive(sourceEntryPath, destEntryPath);
      } else if (entry.isFile()) {
        await fs.copyFile(sourceEntryPath, destEntryPath);
      }
    }
  }
}

/**
 * Initialize all user watchers
 */
async function initializeAllWatchers() {
  try {
    const settings = await Settings.findAll({
      where: {
        downloadWatcherEnabled: true,
      },
    });
    
    for (const setting of settings) {
      const s = setting.toJSON();
      // Only start if at least one pair of directories is configured
      if ((s.movieDownloadDirectory && s.movieWatcherDestination) || 
          (s.seriesDownloadDirectory && s.seriesWatcherDestination)) {
        startWatcher(setting.userId, s);
      }
    }
    
    console.log(`[DownloadWatcher] Initialized ${settings.length} watchers`);
  } catch (error) {
    console.error('[DownloadWatcher] Error initializing watchers:', error);
  }
}

/**
 * Start a watcher for a specific user
 */
function startWatcher(userId, settings) {
  // Stop existing watcher if any
  if (userWatchers.has(userId)) {
    userWatchers.get(userId).stop();
  }
  
  // Create and start new watcher
  const watcher = new DownloadWatcher(userId, settings);
  userWatchers.set(userId, watcher);
  watcher.start();
}

/**
 * Stop a watcher for a specific user
 */
function stopWatcher(userId) {
  if (userWatchers.has(userId)) {
    userWatchers.get(userId).stop();
    userWatchers.delete(userId);
  }
}

/**
 * Update a user's watcher settings
 */
function updateWatcher(userId, settings) {
  const hasMoviePair = settings.movieDownloadDirectory && settings.movieWatcherDestination;
  const hasSeriesPair = settings.seriesDownloadDirectory && settings.seriesWatcherDestination;
  
  if (settings.downloadWatcherEnabled && (hasMoviePair || hasSeriesPair)) {
    if (userWatchers.has(userId)) {
      userWatchers.get(userId).updateSettings(settings);
    } else {
      startWatcher(userId, settings);
    }
  } else {
    stopWatcher(userId);
  }
}

/**
 * Get watcher status for a user
 */
function getWatcherStatus(userId) {
  const watcher = userWatchers.get(userId);
  const stats = userStats.get(userId) || {
    lastRun: null,
    filesProcessed: 0,
    moviesProcessed: 0,
    seriesProcessed: 0,
    errors: 0,
    recentFiles: [],
  };
  
  return {
    isRunning: watcher?.isRunning || false,
    stats: {
      ...stats,
      recentFiles: stats.recentFiles || [],
    },
  };
}

/**
 * Get pending files for a user
 */
function getPendingFiles(userId) {
  return userPendingFiles.get(userId) || [];
}

/**
 * Approve a pending file (move it)
 */
async function approveFile(userId, fileId) {
  const pendingFiles = userPendingFiles.get(userId);
  if (!pendingFiles) {
    throw new Error('No pending files');
  }
  
  const fileIndex = pendingFiles.findIndex(f => f.id === fileId);
  if (fileIndex === -1) {
    throw new Error('File not found in pending queue');
  }
  
  const file = pendingFiles[fileIndex];
  const stats = userStats.get(userId);
  
  try {
    // If file has a folderPath, move the entire folder
    if (file.folderPath) {
      // Get destination directory (parent of the file's destination)
      const destDir = path.dirname(path.dirname(file.destinationPath));
      const folderName = path.basename(file.folderPath);
      
      // Find all files from this folder in pending queue
      const folderFiles = pendingFiles.filter(pf => pf.folderPath === file.folderPath);
      
      // Move the entire folder
      await moveFolderDirect(file.folderPath, destDir, file.type, stats);
      
      // Update stats
      stats.filesProcessed += folderFiles.length;
      if (file.type === 'movie') {
        stats.moviesProcessed += folderFiles.length;
      } else {
        stats.seriesProcessed += folderFiles.length;
      }
      
      // Remove all files from this folder from pending
      const folderFileIds = folderFiles.map(f => f.id);
      for (let i = pendingFiles.length - 1; i >= 0; i--) {
        if (folderFileIds.includes(pendingFiles[i].id)) {
          pendingFiles.splice(i, 1);
        }
      }
      
      // Mark folder as processed
      const watcher = userWatchers.get(userId);
      if (watcher) {
        const processedFolders = file.type === 'movie' ? watcher.processedFolders.movies : watcher.processedFolders.series;
        processedFolders.add(file.folderPath);
      }
      
      console.log(`[DownloadWatcher] Approved and moved folder: ${folderName} (${folderFiles.length} files)`);
      return { success: true, message: `Folder moved successfully (${folderFiles.length} files)` };
    } else {
      // Individual file (directly in download directory) - move just the file
      const destDir = path.dirname(file.destinationPath);
      await fs.mkdir(destDir, { recursive: true });
      
      // Move the file
      await fs.rename(file.sourcePath, file.destinationPath);
      console.log(`[DownloadWatcher] Approved and moved: ${file.filename}`);
      
      // Update stats
      stats.filesProcessed++;
      if (file.type === 'movie') {
        stats.moviesProcessed++;
      } else {
        stats.seriesProcessed++;
      }
      
      // Remove from pending
      pendingFiles.splice(fileIndex, 1);
      
      // Mark as processed
      const watcher = userWatchers.get(userId);
      if (watcher) {
        const processedSet = file.type === 'movie' ? watcher.processedFiles.movies : watcher.processedFiles.series;
        processedSet.add(file.sourcePath);
      }
      
      return { success: true, message: 'File moved successfully' };
    }
  } catch (error) {
    console.error(`[DownloadWatcher] Error approving file:`, error);
    stats.errors++;
    throw error;
  }
}

/**
 * Reject a pending file (remove from queue without moving)
 */
function rejectFile(userId, fileId) {
  const pendingFiles = userPendingFiles.get(userId);
  if (!pendingFiles) {
    throw new Error('No pending files');
  }
  
  const fileIndex = pendingFiles.findIndex(f => f.id === fileId);
  if (fileIndex === -1) {
    throw new Error('File not found in pending queue');
  }
  
  const file = pendingFiles[fileIndex];
  
  // Mark as processed (ignored) so it won't be picked up again
  const watcher = userWatchers.get(userId);
  if (watcher) {
    const processedSet = file.type === 'movie' ? watcher.processedFiles.movies : watcher.processedFiles.series;
    processedSet.add(file.sourcePath);
  }
  
  // Remove from pending
  pendingFiles.splice(fileIndex, 1);
  console.log(`[DownloadWatcher] Rejected/ignored: ${file.filename}`);
  
  return { success: true, message: 'File ignored' };
}

/**
 * Manually trigger a scan for a user
 */
async function triggerScan(userId) {
  console.log(`[DownloadWatcher] Manual scan triggered for user ${userId}`);
  
  // First try existing running watcher
  const watcher = userWatchers.get(userId);
  if (watcher && watcher.isRunning) {
    console.log(`[DownloadWatcher] Using existing watcher for user ${userId}`);
    await watcher.scan();
    return { success: true, message: 'Scan completed successfully' };
  }
  
  // If no watcher running, fetch settings and do a one-time scan
  try {
    const settings = await Settings.findOne({ where: { userId } });
    
    if (!settings) {
      console.log(`[DownloadWatcher] No settings found for user ${userId}`);
      return { success: false, message: 'No settings configured' };
    }
    
    const s = settings.toJSON();
    console.log(`[DownloadWatcher] Settings loaded for scan`);
    
    const hasMoviePair = s.movieDownloadDirectory && s.movieWatcherDestination;
    const hasSeriesPair = s.seriesDownloadDirectory && s.seriesWatcherDestination;
    
    if (!hasMoviePair && !hasSeriesPair) {
      return { success: false, message: 'No download/media folder pairs configured' };
    }
    
    // Initialize stats if needed
    if (!userStats.has(userId)) {
      userStats.set(userId, {
        lastRun: null,
        filesProcessed: 0,
        moviesProcessed: 0,
        seriesProcessed: 0,
        errors: 0,
        recentFiles: [],
      });
    }
    
    // Initialize pending files if needed
    if (!userPendingFiles.has(userId)) {
      userPendingFiles.set(userId, []);
    }
    
    const stats = userStats.get(userId);
    const pendingFiles = userPendingFiles.get(userId);
    const initialPendingCount = pendingFiles.length;
    const initialFilesProcessed = stats.filesProcessed;
    
    // Scan directories directly without creating a watcher instance
    // This is simpler and more reliable for one-time scans
    
    // Scan movies
    if (hasMoviePair) {
      console.log(`[DownloadWatcher] Scanning movies: ${s.movieDownloadDirectory} -> ${s.movieWatcherDestination}`);
      await scanDirectoryDirect(userId, s.movieDownloadDirectory, s.movieWatcherDestination, 'movie', s.watcherAutoApprove);
    }
    
    // Scan series
    if (hasSeriesPair) {
      console.log(`[DownloadWatcher] Scanning series: ${s.seriesDownloadDirectory} -> ${s.seriesWatcherDestination}`);
      await scanDirectoryDirect(userId, s.seriesDownloadDirectory, s.seriesWatcherDestination, 'series', s.watcherAutoApprove);
    }
    
    stats.lastRun = new Date();
    
    const newPendingCount = pendingFiles.length - initialPendingCount;
    const newFilesProcessed = stats.filesProcessed - initialFilesProcessed;
    
    let message = 'Scan completed. ';
    if (s.watcherAutoApprove) {
      message += `Moved ${newFilesProcessed} file(s).`;
    } else {
      message += `Found ${newPendingCount} new file(s) pending approval.`;
    }
    
    console.log(`[DownloadWatcher] ${message}`);
    return { success: true, message };
  } catch (error) {
    console.error('[DownloadWatcher] Error during manual scan:', error);
    return { success: false, message: error.message || 'Scan failed' };
  }
}

/**
 * Get root folders (immediate children) in a directory
 * Also handles files directly in the download directory
 */
async function getRootFoldersDirect(sourceDir) {
  const rootFolders = [];
  const rootFiles = [];
  
  try {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(sourceDir, entry.name);
        rootFolders.push(folderPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          rootFiles.push(path.join(sourceDir, entry.name));
        }
      }
    }
  } catch (error) {
    console.error(`[DownloadWatcher] Error reading root folders:`, error.message);
  }
  
  // Return both folders and individual files
  return { folders: rootFolders, files: rootFiles };
}

/**
 * Check if a folder contains video files
 */
async function folderContainsVideosDirect(folderPath) {
  try {
    const files = await getVideoFilesRecursive(folderPath);
    return files.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if all files in a folder are stable (not being written)
 */
async function areAllFilesStable(folderPath) {
  try {
    const files = await getVideoFilesRecursive(folderPath);
    for (const filePath of files) {
      const stat1 = await fs.stat(filePath);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const stat2 = await fs.stat(filePath);
      
      if (stat1.size !== stat2.size || stat1.mtimeMs !== stat2.mtimeMs) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Move an entire folder (standalone function)
 */
async function moveFolderDirect(folderPath, destDir, type, stats) {
  const folderName = path.basename(folderPath);
  
  console.log(`[DownloadWatcher] Moving ${type} folder: ${folderName}`);
  
  // Ensure destination directory exists
  try {
    await fs.mkdir(destDir, { recursive: true });
  } catch (error) {
    try {
      await fs.access(destDir);
    } catch {
      throw new Error(`Cannot create destination directory: ${destDir} - ${error.message}`);
    }
  }
  
  // Build destination path
  const isWindowsUNC = destDir.startsWith('\\\\') || destDir.startsWith('//');
  const destFolderPath = isWindowsUNC 
    ? path.win32.join(destDir, folderName)
    : path.join(destDir, folderName);
  
  // Check if folder already exists at destination - if so, we'll overwrite it
  try {
    const destExists = await fs.access(destFolderPath).then(() => true).catch(() => false);
    if (destExists) {
      console.log(`[DownloadWatcher] Folder already exists at destination, will overwrite: ${folderName}`);
      // Remove existing folder recursively
      try {
        await fs.rm(destFolderPath, { recursive: true, force: true });
      } catch (error) {
        console.warn(`[DownloadWatcher] Could not remove existing folder, will try to overwrite anyway: ${error.message}`);
      }
    }
  } catch (error) {
    // Folder doesn't exist, continue
  }
  
  // Move the entire folder
  try {
    await fs.rename(folderPath, destFolderPath);
    console.log(`[DownloadWatcher] Moved folder: ${folderName} → ${destDir}`);
  } catch (error) {
    // If rename fails (e.g., cross-device on network shares), use copy + delete
    if (error.code === 'EXDEV' || error.message.includes('cross-device')) {
      console.log(`[DownloadWatcher] Cross-device move detected, using copy+delete for folder: ${folderName}`);
      await copyFolderRecursiveDirect(folderPath, destFolderPath);
      await fs.rm(folderPath, { recursive: true, force: true });
      console.log(`[DownloadWatcher] Copied and removed folder: ${folderName} → ${destDir}`);
    } else {
      throw error;
    }
  }
  
  // Track in recent files (keep last 20)
  if (!stats.recentFiles) {
    stats.recentFiles = [];
  }
  stats.recentFiles.unshift({
    name: folderName,
    type: type,
    destination: destDir,
    timestamp: new Date().toISOString(),
  });
  if (stats.recentFiles.length > 20) {
    stats.recentFiles = stats.recentFiles.slice(0, 20);
  }
}

/**
 * Recursively copy a folder and all its contents (standalone function)
 */
async function copyFolderRecursiveDirect(sourcePath, destPath) {
  // Ensure destination directory exists
  await fs.mkdir(destPath, { recursive: true });
  
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });
  
  for (const entry of entries) {
    const sourceEntryPath = path.join(sourcePath, entry.name);
    const destEntryPath = path.join(destPath, entry.name);
    
    if (entry.isDirectory()) {
      await copyFolderRecursiveDirect(sourceEntryPath, destEntryPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourceEntryPath, destEntryPath);
    }
  }
}

/**
 * Scan a directory directly without a watcher instance
 * Moves entire root folders instead of individual files
 */
async function scanDirectoryDirect(userId, sourceDir, destDir, type, autoApprove) {
  const stats = userStats.get(userId);
  const pendingFiles = userPendingFiles.get(userId);

  try {
    // Check if source directory exists
    try {
      await fs.access(sourceDir);
    } catch (err) {
      console.log(`[DownloadWatcher] Source directory not accessible: ${sourceDir}`, err.message);
      return;
    }

    // Get root folders (immediate children) in the download directory
    const { folders: rootFolders, files: rootFiles } = await getRootFoldersDirect(sourceDir);
    console.log(`[DownloadWatcher] Found ${rootFolders.length} root folder(s) and ${rootFiles.length} file(s) in ${sourceDir}`);
    
    // Handle individual files directly in the download directory
    for (const filePath of rootFiles) {
      // Skip if already pending
      if (pendingFiles.some(pf => pf.sourcePath === filePath)) {
        console.log(`[DownloadWatcher] Skipping (already pending): ${filePath}`);
        continue;
      }
      
      try {
        const fileName = path.basename(filePath);
        const fileStats = await fs.stat(filePath);
        
        console.log(`[DownloadWatcher] Processing file: ${fileName} (autoApprove: ${autoApprove})`);
        
        if (autoApprove) {
          // Auto-move mode - move individual file
          await moveFileDirect(filePath, destDir, type, stats);
          stats.filesProcessed++;
          if (type === 'movie') {
            stats.moviesProcessed++;
          } else {
            stats.seriesProcessed++;
          }
        } else {
          // Manual approval mode - add to pending queue
          const fileId = crypto.randomBytes(8).toString('hex');
          pendingFiles.push({
            id: fileId,
            filename: fileName,
            sourcePath: filePath,
            destinationPath: path.join(destDir, fileName),
            type: type,
            size: fileStats.size,
            detectedAt: new Date().toISOString(),
            // No folderPath - this is a direct file
          });
          console.log(`[DownloadWatcher] Added to pending: ${fileName}`);
        }
      } catch (error) {
        console.error(`[DownloadWatcher] Error processing file ${filePath}:`, error.message);
        stats.errors++;
      }
    }
    
    // Handle folders in the download directory
    for (const folderPath of rootFolders) {
      // Check if folder contains video files
      const hasVideos = await folderContainsVideosDirect(folderPath);
      if (!hasVideos) {
        console.log(`[DownloadWatcher] Skipping folder (no videos): ${folderPath}`);
        continue;
      }
      
      // Check if all files in the folder are stable (not being written)
      const allStable = await areAllFilesStable(folderPath);
      if (!allStable) {
        console.log(`[DownloadWatcher] Skipping folder (files still downloading): ${folderPath}`);
        continue;
      }
      
      try {
        const folderName = path.basename(folderPath);
        const files = await getVideoFilesRecursive(folderPath);
        
        console.log(`[DownloadWatcher] Processing folder: ${folderName} (${files.length} files, autoApprove: ${autoApprove})`);
        
        if (autoApprove) {
          // Auto-move mode - move entire folder
          await moveFolderDirect(folderPath, destDir, type, stats);
          
          // Count files moved
          stats.filesProcessed += files.length;
          if (type === 'movie') {
            stats.moviesProcessed += files.length;
          } else {
            stats.seriesProcessed += files.length;
          }
        } else {
          // Manual approval mode - add folder files to pending queue
          for (const filePath of files) {
            if (pendingFiles.some(pf => pf.sourcePath === filePath)) continue;
            
            const fileName = path.basename(filePath);
            const fileStats = await fs.stat(filePath);
            const fileId = crypto.randomBytes(8).toString('hex');
            
            // Calculate relative path from folder root to preserve structure
            const relativePath = path.relative(folderPath, filePath);
            const destinationPath = path.join(destDir, folderName, relativePath);
            
            pendingFiles.push({
              id: fileId,
              filename: fileName,
              sourcePath: filePath,
              destinationPath: destinationPath,
              type: type,
              size: fileStats.size,
              detectedAt: new Date().toISOString(),
              folderPath: folderPath, // Track which folder this belongs to
            });
          }
          console.log(`[DownloadWatcher] Added folder to pending: ${folderName} (${files.length} files)`);
        }
      } catch (error) {
        console.error(`[DownloadWatcher] Error processing folder ${folderPath}:`, error.message);
        stats.errors++;
      }
    }
    
  } catch (error) {
    console.error(`[DownloadWatcher] Scan error for ${type}:`, error.message);
    stats.errors++;
  }
}

/**
 * Get all video files in a directory recursively (standalone function)
 */
async function getVideoFilesRecursive(dir, files = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip sample and extras folders
        const lowerName = entry.name.toLowerCase();
        if (['sample', 'subs', 'subtitles', 'extras', 'featurettes'].includes(lowerName)) {
          continue;
        }
        await getVideoFilesRecursive(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`[DownloadWatcher] Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

/**
 * Move a file to the destination directory (standalone function)
 * Supports network shares (Windows UNC paths, macOS/Unix mounts)
 */
async function moveFileDirect(filePath, destDir, type, stats) {
  const fileName = path.basename(filePath);
  
  console.log(`[DownloadWatcher] Moving ${type}: ${fileName} -> ${destDir}`);
  
  // Ensure destination directory exists (works with network shares)
  try {
    await fs.mkdir(destDir, { recursive: true });
  } catch (error) {
    // If mkdir fails, check if directory already exists
    try {
      await fs.access(destDir);
    } catch {
      throw new Error(`Cannot create destination directory: ${destDir} - ${error.message}`);
    }
  }
  
  // Build destination path - handle Windows UNC paths
  const isWindowsUNC = destDir.startsWith('\\\\') || destDir.startsWith('//');
  const destPath = isWindowsUNC 
    ? path.win32.join(destDir, fileName)
    : path.join(destDir, fileName);
  
  // Check if file already exists at destination - if so, we'll overwrite it
  const fileExists = await fs.access(destPath).then(() => true).catch(() => false);
  if (fileExists) {
    console.log(`[DownloadWatcher] File already exists at destination, will overwrite: ${fileName}`);
    // Remove existing file before moving
    try {
      await fs.unlink(destPath);
    } catch (error) {
      console.warn(`[DownloadWatcher] Could not remove existing file, will try to overwrite anyway: ${error.message}`);
    }
  }
  
  // Move the file (fs.rename works with network shares)
  try {
    await fs.rename(filePath, destPath);
    console.log(`[DownloadWatcher] Moved: ${fileName} → ${destDir}`);
  } catch (error) {
    // If rename fails (e.g., cross-device on network shares), try copy + delete
    if (error.code === 'EXDEV' || error.message.includes('cross-device')) {
      console.log(`[DownloadWatcher] Cross-device move detected, using copy+delete for: ${fileName}`);
      await fs.copyFile(filePath, destPath);
      await fs.unlink(filePath);
      console.log(`[DownloadWatcher] Copied and removed: ${fileName} → ${destDir}`);
    } else {
      throw error;
    }
  }
  
  // Track in recent files (keep last 20)
  if (!stats.recentFiles) {
    stats.recentFiles = [];
  }
  stats.recentFiles.unshift({
    name: fileName,
    type: type,
    destination: destDir,
    timestamp: new Date().toISOString(),
  });
  if (stats.recentFiles.length > 20) {
    stats.recentFiles = stats.recentFiles.slice(0, 20);
  }
}

module.exports = {
  initializeAllWatchers,
  startWatcher,
  stopWatcher,
  updateWatcher,
  getWatcherStatus,
  getPendingFiles,
  approveFile,
  rejectFile,
  triggerScan,
};
