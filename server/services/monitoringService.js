const MonitoredMovies = require('../models/MonitoredMovies');
const MonitoredSeries = require('../models/MonitoredSeries');
const Settings = require('../models/Settings');
const { findMovieFile, getUserMovieDirectory, getUserSeriesDirectory, findSeriesEpisodeFiles } = require('./fileScanner');
const { applyMovieFormat, executeMovieRenames } = require('./fileRenamer');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3013';

// Track per-user scheduler timers
const userSchedulers = new Map();

/**
 * Monitoring Service
 * Periodically checks monitored movies/series and auto-downloads if needed
 * Uses per-user check intervals from Settings
 */

/**
 * Check a single monitored movie
 */
async function checkMonitoredMovie(movie) {
  try {
    const userId = movie.userId;
    
    // Get user's movie directory
    const movieDirectory = await getUserMovieDirectory(userId);
    
    if (!movieDirectory) {
      console.log(`No movie directory configured for user ${userId}`);
      return {
        movieId: movie.id,
        title: movie.title,
        status: 'no_directory',
        message: 'Movie directory not configured',
      };
    }
    
    // Check if movie file exists
    const fileInfo = await findMovieFile(movie, movieDirectory);
    
    if (fileInfo && fileInfo.found) {
      // Movie file exists!
      console.log(`✅ Found: ${movie.title} at ${fileInfo.filePath}`);
      
      // Check if auto-rename is enabled
      const settings = await Settings.findOne({ where: { userId } });
      const autoRename = settings?.autoRename ?? false;
      
      let finalFilePath = fileInfo.filePath;
      let finalFileName = fileInfo.fileName;
      
      // Apply auto-rename if enabled
      if (autoRename && settings?.movieFileFormat) {
        try {
          const currentName = path.basename(fileInfo.filePath);
          const currentExt = path.extname(fileInfo.filePath);
          const directory = path.dirname(fileInfo.filePath);
          
          // Generate new name based on format
          const newBaseName = applyMovieFormat(settings.movieFileFormat, movie, currentName);
          const newName = `${newBaseName}${currentExt}`;
          
          // Only rename if different
          if (currentName !== newName) {
            const newPath = path.join(directory, newName);
            
            // Check if destination doesn't exist
            try {
              await fs.access(newPath);
              console.log(`⚠️  Cannot rename ${movie.title}: destination already exists`);
            } catch {
              // Good, destination doesn't exist, proceed with rename
              try {
                await fs.rename(fileInfo.filePath, newPath);
                console.log(`✏️  Auto-renamed: ${currentName} → ${newName}`);
                finalFilePath = newPath;
                finalFileName = newName;
              } catch (renameError) {
                console.error(`Failed to rename ${movie.title}:`, renameError.message);
              }
            }
          }
        } catch (error) {
          console.error(`Error during auto-rename for ${movie.title}:`, error.message);
        }
      }
      
      // Update movie status to 'downloaded'
      await movie.update({
        status: 'downloaded',
        fileExists: true,
        filePath: finalFilePath,
        fileName: finalFileName,
        fileSize: fileInfo.fileSize,
        lastChecked: new Date(),
      });
      
      return {
        movieId: movie.id,
        title: movie.title,
        status: 'found',
        fileInfo: {
          ...fileInfo,
          filePath: finalFilePath,
          fileName: finalFileName,
        },
      };
    } else {
      // Movie file doesn't exist
      console.log(`❌ Not found: ${movie.title}`);
      
      // Check if we should auto-download
      const settings = await Settings.findOne({ where: { userId } });
      const autoDownload = settings?.autoDownload ?? true;
      
      if (autoDownload && movie.status !== 'downloading' && movie.status !== 'downloaded') {
        console.log(`🔽 Auto-downloading: ${movie.title}`);
        
        // Trigger download
        try {
          const downloadResult = await autoDownloadMovie(movie, userId);
          
          await movie.update({
            status: 'downloading',
            fileExists: false,
            lastChecked: new Date(),
          });
          
          return {
            movieId: movie.id,
            title: movie.title,
            status: 'downloading',
            message: 'Auto-download initiated',
            downloadResult,
          };
        } catch (error) {
          console.error(`Failed to auto-download ${movie.title}:`, error.message);
          
          await movie.update({
            status: 'missing',
            fileExists: false,
            lastChecked: new Date(),
          });
          
          return {
            movieId: movie.id,
            title: movie.title,
            status: 'error',
            message: error.message,
          };
        }
      } else {
        // Just update status to missing
        await movie.update({
          status: 'missing',
          fileExists: false,
          lastChecked: new Date(),
        });
        
        return {
          movieId: movie.id,
          title: movie.title,
          status: 'missing',
          message: autoDownload ? 'Already downloading or downloaded' : 'Auto-download disabled',
        };
      }
    }
  } catch (error) {
    console.error(`Error checking monitored movie ${movie.title}:`, error);
    return {
      movieId: movie.id,
      title: movie.title,
      status: 'error',
      message: error.message,
    };
  }
}

/**
 * Auto-download a movie using the Search API
 */
async function autoDownloadMovie(movie, userId) {
  // Build search query with title and year
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
  const searchQuery = year ? `${movie.title} ${year}` : movie.title;
  
  console.log(`[Monitoring] Searching for movie: "${searchQuery}"`);
  
  const response = await axios.get(
    `${API_BASE_URL}/api/Search`,
    {
      params: {
        query: searchQuery,
        categoryIds: '2000', // Movies category
        limit: 100,
      },
      timeout: 30000,
    }
  );
  
  if (!response.data.results || response.data.results.length === 0) {
    throw new Error('No torrents found');
  }
  
  const torrents = response.data.results;
  
  // Get user settings for quality filtering
  const settings = await Settings.findOne({ where: { userId } });
  const qualityProfile = movie.qualityProfile || settings?.minQuality || 'any';
  
  // Filter by quality
  const filteredTorrents = filterTorrentsByQuality(torrents, qualityProfile);
  
  if (filteredTorrents.length === 0) {
    throw new Error(`No torrents matching quality profile: ${qualityProfile}`);
  }
  
  // Sort by indexer priority (lower = higher priority), then by seeders
  const bestTorrent = filteredTorrents.reduce((best, current) => {
    const bestPriority = best.indexerPriority ?? 25;
    const currentPriority = current.indexerPriority ?? 25;
    
    if (currentPriority < bestPriority) return current;
    if (currentPriority > bestPriority) return best;
    
    // If priorities are equal, prefer higher seeders
    return (current.seeders || 0) > (best.seeders || 0) ? current : best;
  });
  
  // Extract quality from torrent title
  const titleLower = bestTorrent.title.toLowerCase();
  let quality = 'SD';
  if (titleLower.includes('2160p') || titleLower.includes('4k') || titleLower.includes('uhd')) {
    quality = '2160p';
  } else if (titleLower.includes('1080p')) {
    quality = '1080p';
  } else if (titleLower.includes('720p')) {
    quality = '720p';
  }
  
  // Download the torrent with history information
  const downloadResponse = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
    downloadUrl: bestTorrent.downloadUrl,
    protocol: bestTorrent.protocol,
    // History information
    releaseName: bestTorrent.title,
    indexer: bestTorrent.indexer,
    indexerId: bestTorrent.indexerId,
    size: bestTorrent.size,
    sizeFormatted: bestTorrent.sizeFormatted,
    seeders: bestTorrent.seeders,
    leechers: bestTorrent.leechers,
    quality: quality,
    source: 'MonitoringService',
    mediaType: 'movies',
    mediaTitle: movie.title,
    tmdbId: movie.tmdbId,
  });
  
  if (!downloadResponse.data.success) {
    throw new Error(downloadResponse.data.error || 'Download failed');
  }
  
  // Update movie record
  await movie.update({
    downloadedTorrentId: bestTorrent.id,
    downloadedTorrentTitle: bestTorrent.title,
  });
  
  console.log(`✅ [Monitoring] Auto-download started for: ${movie.title} - ${bestTorrent.title}`);
  
  return {
    torrentId: bestTorrent.id,
    torrentTitle: bestTorrent.title,
    indexer: bestTorrent.indexer,
  };
}

/**
 * Auto-download a series episode using the Search API
 */
async function autoDownloadEpisode(series, seasonNumber, episodeNumber, userId) {
  // Build search query: "Series Name S01E01"
  const seasonStr = String(seasonNumber).padStart(2, '0');
  const episodeStr = String(episodeNumber).padStart(2, '0');
  const searchQuery = `${series.title} S${seasonStr}E${episodeStr}`;
  
  console.log(`[Monitoring] Searching for episode: "${searchQuery}"`);
  
  const response = await axios.get(
    `${API_BASE_URL}/api/Search`,
    {
      params: {
        query: searchQuery,
        categoryIds: '5000', // TV category
        limit: 50,
      },
      timeout: 30000,
    }
  );
  
  if (!response.data.results || response.data.results.length === 0) {
    throw new Error('No torrents found for episode');
  }
  
  const torrents = response.data.results;
  
  // Get user settings for quality filtering
  const settings = await Settings.findOne({ where: { userId } });
  const qualityProfile = series.qualityProfile || settings?.minQuality || 'any';
  
  // Filter by quality
  const filteredTorrents = filterTorrentsByQuality(torrents, qualityProfile);
  
  if (filteredTorrents.length === 0) {
    throw new Error(`No torrents matching quality profile: ${qualityProfile}`);
  }
  
  // Sort by indexer priority, then seeders
  const bestTorrent = filteredTorrents.reduce((best, current) => {
    const bestPriority = best.indexerPriority ?? 25;
    const currentPriority = current.indexerPriority ?? 25;
    
    if (currentPriority < bestPriority) return current;
    if (currentPriority > bestPriority) return best;
    
    return (current.seeders || 0) > (best.seeders || 0) ? current : best;
  });
  
  // Extract quality
  const titleLower = bestTorrent.title.toLowerCase();
  let quality = 'SD';
  if (titleLower.includes('2160p') || titleLower.includes('4k')) quality = '2160p';
  else if (titleLower.includes('1080p')) quality = '1080p';
  else if (titleLower.includes('720p')) quality = '720p';
  
  // Download
  const downloadResponse = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
    downloadUrl: bestTorrent.downloadUrl,
    protocol: bestTorrent.protocol,
    releaseName: bestTorrent.title,
    indexer: bestTorrent.indexer,
    indexerId: bestTorrent.indexerId,
    size: bestTorrent.size,
    sizeFormatted: bestTorrent.sizeFormatted,
    seeders: bestTorrent.seeders,
    leechers: bestTorrent.leechers,
    quality: quality,
    source: 'MonitoringService',
    mediaType: 'tv',
    mediaTitle: series.title,
    tmdbId: series.tmdbId,
    seasonNumber,
    episodeNumber,
  });
  
  if (!downloadResponse.data.success) {
    throw new Error(downloadResponse.data.error || 'Download failed');
  }
  
  console.log(`✅ [Monitoring] Episode download started: ${series.title} S${seasonStr}E${episodeStr} - ${bestTorrent.title}`);
  
  return {
    torrentId: bestTorrent.id,
    torrentTitle: bestTorrent.title,
    indexer: bestTorrent.indexer,
  };
}

/**
 * Filter torrents by quality profile
 */
function filterTorrentsByQuality(torrents, quality) {
  if (quality === 'any') return torrents;
  
  return torrents.filter(torrent => {
    const title = torrent.title.toLowerCase();
    
    switch (quality) {
      case 'hd-720p-1080p':
      case '720p':
        return title.includes('720p') || title.includes('1080p');
      case 'hd-720p':
        return title.includes('720p');
      case 'hd-1080p':
      case '1080p':
        return title.includes('1080p');
      case 'sd':
      case '480p':
        return !title.includes('720p') && !title.includes('1080p') && !title.includes('2160p') && !title.includes('4k');
      case 'ultra-hd':
      case '2160p':
        return title.includes('2160p') || title.includes('4k') || title.includes('uhd');
      default:
        return true;
    }
  });
}

/**
 * Check all monitored movies for a user
 */
async function checkUserMonitoredMovies(userId) {
  const movies = await MonitoredMovies.findAll({ where: { userId } });
  
  console.log(`Checking ${movies.length} monitored movies for user ${userId}`);
  
  const results = [];
  
  for (const movie of movies) {
    const result = await checkMonitoredMovie(movie);
    results.push(result);
    
    // Add a small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

/**
 * Check all monitored movies for all users
 */
async function checkAllMonitoredMovies() {
  // Get all unique user IDs from monitored movies
  const movies = await MonitoredMovies.findAll({
    attributes: ['userId'],
    group: ['userId'],
  });
  
  const userIds = movies.map(m => m.userId);
  
  console.log(`Checking monitored movies for ${userIds.length} users`);
  
  const allResults = [];
  
  for (const userId of userIds) {
    const results = await checkUserMonitoredMovies(userId);
    allResults.push({ userId, results });
  }
  
  return allResults;
}

/**
 * Check a single monitored series (checks for episode files)
 */
async function checkMonitoredSeries(series) {
  try {
    const userId = series.userId;
    
    // Get user's series directory
    let seriesDirectory = null;
    try {
      const settings = await Settings.findOne({ where: { userId } });
      seriesDirectory = settings?.seriesDirectory || null;
    } catch (e) {
      console.error(`[Monitoring] Error getting series directory for user ${userId}:`, e);
    }
    
    if (!seriesDirectory) {
      console.log(`[Monitoring] No series directory configured for user ${userId}`);
      await series.update({ lastChecked: new Date() });
      return {
        seriesId: series.id,
        title: series.title,
        status: 'no_directory',
        message: 'Series directory not configured',
      };
    }
    
    // Parse selected episodes
    let selectedEpisodes = [];
    try {
      selectedEpisodes = series.selectedEpisodes ? JSON.parse(series.selectedEpisodes) : [];
    } catch (e) {
      console.error(`[Monitoring] Error parsing selectedEpisodes for ${series.title}:`, e);
    }
    
    if (selectedEpisodes.length === 0) {
      console.log(`[Monitoring] No episodes selected for ${series.title}`);
      await series.update({ lastChecked: new Date() });
      return {
        seriesId: series.id,
        title: series.title,
        status: 'no_episodes',
        message: 'No episodes selected',
      };
    }
    
    // Check user settings for autoDownload
    const settings = await Settings.findOne({ where: { userId } });
    const autoDownload = settings?.autoDownload ?? true;
    
    // For series, we just track if they're being monitored - actual file checking would need more logic
    // For now, if autoDownload is on and status isn't downloaded, try to download missing episodes
    if (autoDownload && series.status !== 'downloaded') {
      console.log(`🔽 [Monitoring] Checking/downloading episodes for: ${series.title}`);
      
      let downloadedCount = 0;
      let failedCount = 0;
      
      for (const episodeKey of selectedEpisodes) {
        const [seasonNum, episodeNum] = episodeKey.split('-').map(Number);
        
        try {
          await autoDownloadEpisode(series, seasonNum, episodeNum, userId);
          downloadedCount++;
          // Add delay between downloads
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          // Episode might already be downloaded or not available
          if (!error.message.includes('No torrents found')) {
            console.error(`[Monitoring] Error downloading ${series.title} S${seasonNum}E${episodeNum}:`, error.message);
          }
          failedCount++;
        }
      }
      
      if (downloadedCount > 0) {
        await series.update({
          status: 'downloading',
          lastChecked: new Date(),
        });
        
        return {
          seriesId: series.id,
          title: series.title,
          status: 'downloading',
          episodesQueued: downloadedCount,
          episodesFailed: failedCount,
        };
      }
    }
    
    // Update last checked time
    await series.update({ lastChecked: new Date() });
    
    return {
      seriesId: series.id,
      title: series.title,
      status: series.status,
      message: autoDownload ? 'Monitoring' : 'Auto-download disabled',
    };
  } catch (error) {
    console.error(`[Monitoring] Error checking monitored series ${series.title}:`, error);
    return {
      seriesId: series.id,
      title: series.title,
      status: 'error',
      message: error.message,
    };
  }
}

/**
 * Check all monitored content for a user (movies and series)
 */
async function checkUserMonitoredContent(userId) {
  console.log(`[Monitoring] Checking all monitored content for user ${userId}`);
  
  const movieResults = [];
  const seriesResults = [];
  
  // Check movies
  const movies = await MonitoredMovies.findAll({ where: { userId } });
  console.log(`[Monitoring] Found ${movies.length} monitored movies`);
  
  for (const movie of movies) {
    const result = await checkMonitoredMovie(movie);
    movieResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Check series
  const allSeries = await MonitoredSeries.findAll({ where: { userId } });
  console.log(`[Monitoring] Found ${allSeries.length} monitored series`);
  
  for (const series of allSeries) {
    const result = await checkMonitoredSeries(series);
    seriesResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return {
    movies: movieResults,
    series: seriesResults,
  };
}

/**
 * Check all monitored content for all users
 */
async function checkAllMonitoredContent() {
  // Get all unique user IDs from both movies and series
  const movies = await MonitoredMovies.findAll({
    attributes: ['userId'],
    group: ['userId'],
  });
  
  const series = await MonitoredSeries.findAll({
    attributes: ['userId'],
    group: ['userId'],
  });
  
  // Combine unique user IDs
  const userIdSet = new Set([
    ...movies.map(m => m.userId),
    ...series.map(s => s.userId),
  ]);
  
  const userIds = Array.from(userIdSet);
  
  console.log(`[Monitoring] Running check for ${userIds.length} users`);
  
  const allResults = [];
  
  for (const userId of userIds) {
    const results = await checkUserMonitoredContent(userId);
    allResults.push({ userId, results });
  }
  
  return allResults;
}

/**
 * Get check interval for a user (in milliseconds)
 */
async function getUserCheckInterval(userId) {
  try {
    const settings = await Settings.findOne({ where: { userId } });
    const intervalMinutes = settings?.checkInterval ?? 60; // Default 60 minutes
    return intervalMinutes * 60 * 1000; // Convert to milliseconds
  } catch (error) {
    console.error(`[Monitoring] Error getting check interval for user ${userId}:`, error);
    return 60 * 60 * 1000; // Default 1 hour
  }
}

/**
 * Schedule monitoring for a specific user
 */
async function scheduleUserMonitoring(userId) {
  // Clear existing timer if any
  if (userSchedulers.has(userId)) {
    clearTimeout(userSchedulers.get(userId));
  }
  
  const intervalMs = await getUserCheckInterval(userId);
  const intervalMinutes = intervalMs / 60000;
  
  console.log(`[Monitoring] Scheduling check for user ${userId} every ${intervalMinutes} minutes`);
  
  // Schedule the next check
  const timerId = setTimeout(async () => {
    try {
      console.log(`🔄 [Monitoring] Running scheduled check for user ${userId}`);
      await checkUserMonitoredContent(userId);
      console.log(`✅ [Monitoring] Scheduled check complete for user ${userId}`);
    } catch (error) {
      console.error(`[Monitoring] Error in scheduled check for user ${userId}:`, error);
    }
    
    // Schedule next run
    scheduleUserMonitoring(userId);
  }, intervalMs);
  
  userSchedulers.set(userId, timerId);
}

/**
 * Start the monitoring scheduler
 */
function startMonitoringScheduler() {
  console.log(`🔄 [Monitoring] Starting monitoring scheduler...`);
  
  // Run initial check after server starts
  setTimeout(async () => {
    try {
      // Get all users with monitored content
      const movies = await MonitoredMovies.findAll({
        attributes: ['userId'],
        group: ['userId'],
      });
      
      const series = await MonitoredSeries.findAll({
        attributes: ['userId'],
        group: ['userId'],
      });
      
      const userIdSet = new Set([
        ...movies.map(m => m.userId),
        ...series.map(s => s.userId),
      ]);
      
      const userIds = Array.from(userIdSet);
      
      console.log(`[Monitoring] Found ${userIds.length} users with monitored content`);
      
      // Schedule monitoring for each user (run initial check immediately)
      for (const userId of userIds) {
        try {
          console.log(`🔄 [Monitoring] Running initial check for user ${userId}`);
          await checkUserMonitoredContent(userId);
          console.log(`✅ [Monitoring] Initial check complete for user ${userId}`);
          
          // Schedule ongoing monitoring for this user
          await scheduleUserMonitoring(userId);
        } catch (error) {
          console.error(`[Monitoring] Error in initial check for user ${userId}:`, error);
        }
        
        // Small delay between users
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`✅ [Monitoring] Monitoring scheduler started`);
    } catch (error) {
      console.error('[Monitoring] Error starting monitoring scheduler:', error);
    }
  }, 10000); // Wait 10 seconds after server start
}

/**
 * Trigger immediate check for a user (e.g., when they add new content)
 */
async function triggerUserCheck(userId) {
  try {
    console.log(`🔄 [Monitoring] Triggering immediate check for user ${userId}`);
    const results = await checkUserMonitoredContent(userId);
    console.log(`✅ [Monitoring] Immediate check complete for user ${userId}`);
    
    // Reschedule their regular check
    await scheduleUserMonitoring(userId);
    
    return results;
  } catch (error) {
    console.error(`[Monitoring] Error in triggered check for user ${userId}:`, error);
    throw error;
  }
}

module.exports = {
  checkMonitoredMovie,
  checkMonitoredSeries,
  checkUserMonitoredMovies,
  checkUserMonitoredContent,
  checkAllMonitoredMovies,
  checkAllMonitoredContent,
  autoDownloadMovie,
  autoDownloadEpisode,
  startMonitoringScheduler,
  triggerUserCheck,
  scheduleUserMonitoring,
};
