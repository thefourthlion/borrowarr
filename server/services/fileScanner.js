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
 * Check if a filename matches a movie title (handles sequels properly)
 * This is stricter than simple substring matching to avoid false positives
 * like matching "Shrek 1 (2001)" when searching for "Shrek 2"
 */
function titleMatchesFilename(movieTitle, fileName, movieYear) {
  const normalizedTitle = normalizeString(movieTitle);
  const normalizedFileName = normalizeString(fileName);
  
  // Split title into words for matching
  const titleWords = normalizedTitle.split(' ').filter(w => w.length > 0);
  
  // Check if title ends with a number (sequel like "Shrek 2", "Iron Man 3")
  const lastWord = titleWords[titleWords.length - 1];
  const isSequel = /^\d+$/.test(lastWord);
  
  if (isSequel) {
    // For sequels, we need to be strict: match the EXACT title including the number
    // Create a regex that matches the title as whole words
    // e.g., "Shrek 2" should NOT match "Shrek 1 2001" but SHOULD match "Shrek 2 2004"
    const sequelNumber = lastWord;
    const baseTitle = titleWords.slice(0, -1).join(' ');
    
    // Build a pattern that matches: baseTitle + sequel number (not followed by more digits)
    // This ensures "shrek 2" matches "shrek 2 2004" but not "shrek 1 2001"
    const escapedBase = baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedBase}\\s+${sequelNumber}\\b`, 'i');
    
    if (!pattern.test(normalizedFileName)) {
      return false;
    }
  } else {
    // For non-sequels, check if all title words appear in the filename
    // But ensure they appear as whole words, not as part of other words
    for (const word of titleWords) {
      // Skip very short words that might match accidentally
      if (word.length < 2) continue;
      
      const wordPattern = new RegExp(`\\b${word}\\b`, 'i');
      if (!wordPattern.test(normalizedFileName)) {
        return false;
      }
    }
  }
  
  // If we have a year, verify it matches
  if (movieYear) {
    const yearStr = movieYear.toString();
    if (!normalizedFileName.includes(yearStr)) {
      // Year not found, but might still be the right movie in a folder without year
      // Don't return false, but we won't use this as strong confirmation
    }
  }
  
  return true;
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
    
    // Read all items in the movie directory
    const items = await fs.readdir(movieDirectory, { withFileTypes: true });
    
    // Common video file extensions
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    
    // Minimum file size for a real movie (50MB) - skip metadata/sample files
    const MIN_MOVIE_SIZE = 50 * 1024 * 1024;
    
    // Helper to check if file is hidden/metadata (macOS creates ._ files)
    const isHiddenFile = (name) => name.startsWith('.') || name.startsWith('._');
    
    // Search for movie file
    for (const item of items) {
      // Skip hidden files/directories
      if (isHiddenFile(item.name)) continue;
      
      const itemPath = path.join(movieDirectory, item.name);
      
      if (item.isDirectory()) {
        // Check inside subdirectory (common for movies to have their own folder)
        try {
          const subItems = await fs.readdir(itemPath, { withFileTypes: true });
          
          for (const subItem of subItems) {
            // Skip hidden/metadata files
            if (isHiddenFile(subItem.name)) continue;
            
            if (subItem.isFile()) {
              const ext = path.extname(subItem.name).toLowerCase();
              if (videoExtensions.includes(ext)) {
                // Use improved title matching that handles sequels properly
                if (titleMatchesFilename(movieTitle, subItem.name, movieYear)) {
                  const filePath = path.join(itemPath, subItem.name);
                  const stats = await fs.stat(filePath);
                  
                  // Skip files that are too small (likely samples or metadata)
                  if (stats.size < MIN_MOVIE_SIZE) {
                    console.log(`[FileScanner] Skipping small file (${formatBytes(stats.size)}): ${subItem.name}`);
                    continue;
                  }
                  
                  console.log(`[FileScanner] Found match for "${movieTitle}": ${subItem.name}`);
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
        } catch (error) {
          // Skip directories we can't read
          continue;
        }
      } else if (item.isFile()) {
        // Check file directly in the root directory
        const ext = path.extname(item.name).toLowerCase();
        if (videoExtensions.includes(ext)) {
          // Use improved title matching that handles sequels properly
          if (titleMatchesFilename(movieTitle, item.name, movieYear)) {
            const stats = await fs.stat(itemPath);
            
            // Skip files that are too small
            if (stats.size < MIN_MOVIE_SIZE) {
              console.log(`[FileScanner] Skipping small file (${formatBytes(stats.size)}): ${item.name}`);
              continue;
            }
            
            console.log(`[FileScanner] Found match for "${movieTitle}": ${item.name}`);
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

/**
 * Check if a series episode file exists
 * @param {Object} series - Series object with title
 * @param {string} seriesDirectory - Directory to search in
 * @param {number} seasonNumber - Season number
 * @param {number} episodeNumber - Episode number
 * @returns {Promise<Object|null>} - File info if found, null otherwise
 */
async function findSeriesEpisodeFile(series, seriesDirectory, seasonNumber, episodeNumber) {
  if (!seriesDirectory) {
    return null;
  }

  try {
    await fs.access(seriesDirectory);
  } catch (error) {
    console.error(`Series directory not accessible: ${seriesDirectory}`);
    return null;
  }

  try {
    const seriesTitle = series.title || series.name;
    const normalizedTitle = normalizeString(seriesTitle);
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    
    // Minimum file size for a real episode (20MB) - skip metadata/sample files
    const MIN_EPISODE_SIZE = 20 * 1024 * 1024;
    
    // Helper to check if file is hidden/metadata (macOS creates ._ files)
    const isHiddenFile = (name) => name.startsWith('.') || name.startsWith('._');
    
    // Format season/episode strings (S01E01 format)
    const seasonStr = String(seasonNumber).padStart(2, '0');
    const episodeStr = String(episodeNumber).padStart(2, '0');
    const episodePattern = `s${seasonStr}e${episodeStr}`;
    
    // Also check for x format (1x01)
    const episodePatternAlt = `${seasonNumber}x${episodeStr}`;

    // Search function for recursive directory scanning
    const searchDirectory = async (dir, depth = 0) => {
      if (depth > 3) return null; // Limit recursion depth
      
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          // Skip hidden/metadata files
          if (isHiddenFile(item.name)) continue;
          
          const itemPath = path.join(dir, item.name);
          const normalizedName = normalizeString(item.name);
          
          if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (videoExtensions.includes(ext)) {
              // Check if file matches series title and episode pattern
              const hasTitle = normalizedName.includes(normalizedTitle) || 
                              normalizedTitle.split(' ').every(word => normalizedName.includes(word));
              const hasEpisode = normalizedName.includes(episodePattern) || 
                                normalizedName.includes(episodePatternAlt);
              
              if (hasTitle && hasEpisode) {
                const stats = await fs.stat(itemPath);
                
                // Skip files that are too small (likely samples or metadata)
                if (stats.size < MIN_EPISODE_SIZE) {
                  console.log(`[FileScanner] Skipping small episode file (${formatBytes(stats.size)}): ${item.name}`);
                  continue;
                }
                
                return {
                  found: true,
                  filePath: itemPath,
                  fileName: item.name,
                  fileSize: stats.size,
                  fileSizeFormatted: formatBytes(stats.size),
                  lastModified: stats.mtime,
                  seasonNumber,
                  episodeNumber,
                };
              }
            }
          } else if (item.isDirectory()) {
            // Check if directory name matches series
            const dirNameNormalized = normalizeString(item.name);
            const mightBeSeriesDir = dirNameNormalized.includes(normalizedTitle) ||
                                     normalizedTitle.split(' ').some(word => dirNameNormalized.includes(word));
            
            if (mightBeSeriesDir || depth < 2) {
              const result = await searchDirectory(itemPath, depth + 1);
              if (result) return result;
            }
          }
        }
        
        return null;
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error.message);
        return null;
      }
    };

    return await searchDirectory(seriesDirectory);
  } catch (error) {
    console.error(`Error scanning for series "${series.title}" S${seasonNumber}E${episodeNumber}:`, error.message);
    return null;
  }
}

module.exports = {
  findMovieFile,
  findSeriesEpisodeFile,
  getUserMovieDirectory,
  getUserSeriesDirectory,
  normalizeString,
  formatBytes,
};

