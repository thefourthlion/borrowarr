const MonitoredMovies = require('../models/MonitoredMovies');
const Settings = require('../models/Settings');
const { findMovieFile, getUserMovieDirectory } = require('./fileScanner');
const { applyMovieFormat, executeMovieRenames } = require('./fileRenamer');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3013';

/**
 * Monitoring Service
 * Periodically checks monitored movies and auto-downloads if needed
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
 * Auto-download a movie
 */
async function autoDownloadMovie(movie, userId) {
  // Fetch torrents for this movie
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
  
  const response = await axios.get(
    `${API_BASE_URL}/api/TMDB/movie/${movie.tmdbId}/torrents`,
    {
      params: {
        title: movie.title,
        year: year,
        categoryIds: '2000', // Movies category
      },
      timeout: 30000,
    }
  );
  
  if (!response.data.success || !response.data.results || response.data.results.length === 0) {
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
  
  // Download the torrent
  const downloadResponse = await axios.post(`${API_BASE_URL}/api/DownloadClients/grab`, {
    downloadUrl: bestTorrent.downloadUrl,
    protocol: bestTorrent.protocol,
  });
  
  if (!downloadResponse.data.success) {
    throw new Error(downloadResponse.data.error || 'Download failed');
  }
  
  // Update movie record
  await movie.update({
    downloadedTorrentId: bestTorrent.id,
    downloadedTorrentTitle: bestTorrent.title,
  });
  
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
 * Start the monitoring scheduler
 */
function startMonitoringScheduler() {
  // Get default check interval (in minutes)
  const defaultInterval = 60; // 1 hour
  
  console.log(`🔄 Starting monitoring scheduler (checking every ${defaultInterval} minutes)`);
  
  // Run immediately on start
  setTimeout(async () => {
    try {
      await checkAllMonitoredMovies();
    } catch (error) {
      console.error('Error in monitoring scheduler:', error);
    }
  }, 5000); // Wait 5 seconds after server start
  
  // Then run periodically
  setInterval(async () => {
    try {
      console.log(`🔄 Running scheduled monitoring check...`);
      await checkAllMonitoredMovies();
      console.log(`✅ Scheduled monitoring check complete`);
    } catch (error) {
      console.error('Error in monitoring scheduler:', error);
    }
  }, defaultInterval * 60 * 1000); // Convert minutes to milliseconds
}

module.exports = {
  checkMonitoredMovie,
  checkUserMonitoredMovies,
  checkAllMonitoredMovies,
  autoDownloadMovie,
  startMonitoringScheduler,
};
