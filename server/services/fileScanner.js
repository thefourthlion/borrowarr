const fs = require('fs').promises;
const path = require('path');
const Settings = require('../models/Settings');

/**
 * File Scanner Service
 * Checks if movies/series exist in the configured directories
 */

/**
 * Normalize a string for comparison (remove special chars, lowercase, etc.)
 */
function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Check if a movie file exists in the movie directory
 * @param {Object} movie - Movie object with title and releaseDate
 * @param {string} movieDirectory - Directory to search in
 * @returns {Promise<Object|null>} - File info if found, null otherwise
 */
async function findMovieFile(movie, movieDirectory) {
  if (!movieDirectory) {
    return null;
  }

  try {
    // Check if directory exists
    await fs.access(movieDirectory);
  } catch (error) {
    console.error(`Movie directory not accessible: ${movieDirectory}`);
    return null;
  }

  try {
    const movieTitle = movie.title;
    const movieYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
    
    const normalizedTitle = normalizeString(movieTitle);
    
    // Read all items in the movie directory
    const items = await fs.readdir(movieDirectory, { withFileTypes: true });
    
    // Common video file extensions
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    
    // Search for movie file
    for (const item of items) {
      const itemPath = path.join(movieDirectory, item.name);
      
      if (item.isDirectory()) {
        // Check inside subdirectory (common for movies to have their own folder)
        try {
          const subItems = await fs.readdir(itemPath, { withFileTypes: true });
          
          for (const subItem of subItems) {
            if (subItem.isFile()) {
              const ext = path.extname(subItem.name).toLowerCase();
              if (videoExtensions.includes(ext)) {
                const normalizedFileName = normalizeString(subItem.name);
                
                // Check if filename contains the movie title
                if (normalizedFileName.includes(normalizedTitle)) {
                  // If we have a year, check if it matches
                  if (movieYear) {
                    if (normalizedFileName.includes(movieYear.toString())) {
                      const filePath = path.join(itemPath, subItem.name);
                      const stats = await fs.stat(filePath);
                      
                      return {
                        found: true,
                        filePath: filePath,
                        fileName: subItem.name,
                        fileSize: stats.size,
                        fileSizeFormatted: formatBytes(stats.size),
                        lastModified: stats.mtime,
                      };
                    }
                  } else {
                    // No year available, just match on title
                    const filePath = path.join(itemPath, subItem.name);
                    const stats = await fs.stat(filePath);
                    
                    return {
                      found: true,
                      filePath: filePath,
                      fileName: subItem.name,
                      fileSize: stats.size,
                      fileSizeFormatted: formatBytes(stats.size),
                      lastModified: stats.mtime,
                    };
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip directories we can't read
          continue;
        }
      } else if (item.isFile()) {
        // Check file directly in the root directory
        const ext = path.extname(item.name).toLowerCase();
        if (videoExtensions.includes(ext)) {
          const normalizedFileName = normalizeString(item.name);
          
          if (normalizedFileName.includes(normalizedTitle)) {
            if (movieYear) {
              if (normalizedFileName.includes(movieYear.toString())) {
                const stats = await fs.stat(itemPath);
                
                return {
                  found: true,
                  filePath: itemPath,
                  fileName: item.name,
                  fileSize: stats.size,
                  fileSizeFormatted: formatBytes(stats.size),
                  lastModified: stats.mtime,
                };
              }
            } else {
              const stats = await fs.stat(itemPath);
              
              return {
                found: true,
                filePath: itemPath,
                fileName: item.name,
                fileSize: stats.size,
                fileSizeFormatted: formatBytes(stats.size),
                lastModified: stats.mtime,
              };
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error scanning for movie "${movie.title}":`, error.message);
    return null;
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get user's movie directory from settings
 */
async function getUserMovieDirectory(userId) {
  const settings = await Settings.findOne({ where: { userId } });
  return settings?.movieDirectory || null;
}

/**
 * Get user's series directory from settings
 */
async function getUserSeriesDirectory(userId) {
  const settings = await Settings.findOne({ where: { userId } });
  return settings?.seriesDirectory || null;
}

module.exports = {
  findMovieFile,
  getUserMovieDirectory,
  getUserSeriesDirectory,
  normalizeString,
  formatBytes,
};

