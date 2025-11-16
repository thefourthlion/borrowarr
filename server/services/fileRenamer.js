const fs = require('fs').promises;
const path = require('path');
const MonitoredMovies = require('../models/MonitoredMovies');
const MonitoredSeries = require('../models/MonitoredSeries');

/**
 * Extract quality and metadata from filename
 * @param {string} filename - The filename to parse
 * @returns {object} - Extracted metadata
 */
function extractMetadataFromFilename(filename) {
  const metadata = {
    quality: '',
    source: '',
    codec: '',
    audio: '',
    edition: '',
    releaseGroup: '',
  };

  const lowerFilename = filename.toLowerCase();

  // Extract quality
  if (lowerFilename.includes('2160p') || lowerFilename.includes('4k') || lowerFilename.includes('uhd')) {
    metadata.quality = '2160p';
  } else if (lowerFilename.includes('1080p')) {
    metadata.quality = '1080p';
  } else if (lowerFilename.includes('720p')) {
    metadata.quality = '720p';
  } else if (lowerFilename.includes('480p')) {
    metadata.quality = '480p';
  } else if (lowerFilename.includes('360p')) {
    metadata.quality = '360p';
  }

  // Extract source
  if (lowerFilename.includes('bluray') || lowerFilename.includes('bdrip') || lowerFilename.includes('brrip')) {
    metadata.source = 'BluRay';
  } else if (lowerFilename.includes('web-dl') || lowerFilename.includes('webdl')) {
    metadata.source = 'WEB-DL';
  } else if (lowerFilename.includes('webrip')) {
    metadata.source = 'WEBRip';
  } else if (lowerFilename.includes('hdtv')) {
    metadata.source = 'HDTV';
  } else if (lowerFilename.includes('dvdrip')) {
    metadata.source = 'DVDRip';
  } else if (lowerFilename.includes('dvd')) {
    metadata.source = 'DVD';
  }

  // Extract codec
  if (lowerFilename.includes('x265') || lowerFilename.includes('hevc') || lowerFilename.includes('h.265') || lowerFilename.includes('h265')) {
    metadata.codec = 'x265';
  } else if (lowerFilename.includes('x264') || lowerFilename.includes('h.264') || lowerFilename.includes('h264')) {
    metadata.codec = 'x264';
  } else if (lowerFilename.includes('xvid')) {
    metadata.codec = 'XviD';
  } else if (lowerFilename.includes('divx')) {
    metadata.codec = 'DivX';
  }

  // Extract audio
  if (lowerFilename.includes('dts-hd') || lowerFilename.includes('dts.hd')) {
    metadata.audio = 'DTS-HD';
  } else if (lowerFilename.includes('dts')) {
    metadata.audio = 'DTS';
  } else if (lowerFilename.includes('dd5.1') || lowerFilename.includes('dd51') || lowerFilename.includes('ac3')) {
    metadata.audio = 'AC3';
  } else if (lowerFilename.includes('aac')) {
    metadata.audio = 'AAC';
  } else if (lowerFilename.includes('mp3')) {
    metadata.audio = 'MP3';
  } else if (lowerFilename.includes('truehd')) {
    metadata.audio = 'TrueHD';
  } else if (lowerFilename.includes('atmos')) {
    metadata.audio = 'Atmos';
  }

  // Extract edition
  if (lowerFilename.includes('extended')) {
    metadata.edition = 'Extended';
  } else if (lowerFilename.includes('directors.cut') || lowerFilename.includes('director\'s.cut')) {
    metadata.edition = 'Directors Cut';
  } else if (lowerFilename.includes('unrated')) {
    metadata.edition = 'Unrated';
  } else if (lowerFilename.includes('theatrical')) {
    metadata.edition = 'Theatrical';
  } else if (lowerFilename.includes('ultimate')) {
    metadata.edition = 'Ultimate';
  } else if (lowerFilename.includes('remastered')) {
    metadata.edition = 'Remastered';
  }

  // Extract release group (usually at the end, after a hyphen)
  const releaseGroupMatch = filename.match(/[-.]([A-Za-z0-9]+)(?:\.[a-z0-9]+)?$/);
  if (releaseGroupMatch && releaseGroupMatch[1]) {
    const possibleGroup = releaseGroupMatch[1];
    // Common release groups
    const knownGroups = ['YIFY', 'YTS', 'RARBG', 'SPARKS', 'ROVERS', 'EVO', 'PSA', 'FGT', 'MeGusta', 'FLAME', 'GALAXY', 'GECKOS'];
    if (knownGroups.some(g => possibleGroup.toUpperCase().includes(g.toUpperCase()))) {
      metadata.releaseGroup = possibleGroup;
    }
  }

  return metadata;
}

/**
 * Apply naming format to a movie
 * @param {string} format - The naming format with tokens
 * @param {object} movie - The movie object with metadata
 * @param {string} currentFilename - The current filename to extract metadata from
 * @returns {string} - The formatted filename
 */
function applyMovieFormat(format, movie, currentFilename = '') {
  const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
  
  // Extract metadata from current filename
  const metadata = currentFilename ? extractMetadataFromFilename(currentFilename) : {};

  let result = format
    // Basic tokens
    .replace(/{Movie Title}/g, movie.title)
    .replace(/{Release Year}/g, releaseYear)
    .replace(/{movie title}/g, movie.title.toLowerCase())
    .replace(/{release year}/g, releaseYear)
    .replace(/{MOVIE TITLE}/g, movie.title.toUpperCase())
    .replace(/{RELEASE YEAR}/g, releaseYear)
    
    // Advanced tokens
    .replace(/{Quality}/g, metadata.quality || '')
    .replace(/{Source}/g, metadata.source || '')
    .replace(/{Codec}/g, metadata.codec || '')
    .replace(/{Audio}/g, metadata.audio || '')
    .replace(/{Edition}/g, metadata.edition || '')
    .replace(/{Release Group}/g, metadata.releaseGroup || '');

  // Clean up double spaces and leading/trailing spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  // Clean up any invalid filename characters
  result = result.replace(/[<>:"/\\|?*]/g, '');
  
  // Clean up multiple dots or dashes in a row
  result = result.replace(/\.{2,}/g, '.').replace(/-{2,}/g, '-');
  
  // Clean up spaces before punctuation
  result = result.replace(/\s+([.,\-_()])/g, '$1');
  
  // Remove empty parentheses or brackets
  result = result.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '');
  
  return result;
}

/**
 * Preview file renames for all monitored movies
 * @param {string} userId - The user ID
 * @param {string} movieFileFormat - The movie naming format
 * @returns {Promise<Array<{movieId, currentPath, currentName, newName, directory}>>}
 */
async function previewMovieRenames(userId, movieFileFormat) {
  const renames = [];
  
  // Get all monitored movies for this user that have files
  const movies = await MonitoredMovies.findAll({
    where: {
      userId,
      fileExists: true,
    },
  });

  for (const movie of movies) {
    if (!movie.filePath) continue;

    const currentPath = movie.filePath;
    const currentName = path.basename(currentPath);
    const currentExt = path.extname(currentPath);
    const directory = path.dirname(currentPath);

    // Apply the naming format (pass current filename for metadata extraction)
    const newBaseName = applyMovieFormat(movieFileFormat, movie, currentName);
    const newName = `${newBaseName}${currentExt}`;

    // Only include if the name would actually change
    if (currentName !== newName) {
      renames.push({
        movieId: movie.id,
        currentPath,
        currentName,
        newName,
        directory,
      });
    }
  }

  return renames;
}

/**
 * Execute file renames
 * @param {string} userId - The user ID
 * @param {Array<{movieId, currentPath, newName, directory}>} renames - Array of rename operations
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function executeMovieRenames(userId, renames) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const rename of renames) {
    try {
      const { movieId, currentPath, newName, directory } = rename;
      
      // Construct new path
      const newPath = path.join(directory, newName);

      // Check if source file exists
      try {
        await fs.access(currentPath);
      } catch (error) {
        results.failed++;
        results.errors.push({
          movieId,
          currentName: path.basename(currentPath),
          error: 'Source file not found',
        });
        continue;
      }

      // Check if destination already exists
      try {
        await fs.access(newPath);
        results.failed++;
        results.errors.push({
          movieId,
          currentName: path.basename(currentPath),
          error: 'Destination file already exists',
        });
        continue;
      } catch (error) {
        // Good, destination doesn't exist
      }

      // Perform the rename
      await fs.rename(currentPath, newPath);

      // Update the database
      const movie = await MonitoredMovies.findByPk(movieId);
      if (movie && movie.userId === userId) {
        await movie.update({
          filePath: newPath,
          fileName: newName,
        });
      }

      results.success++;
      console.log(`✅ Renamed: ${path.basename(currentPath)} → ${newName}`);
    } catch (error) {
      results.failed++;
      results.errors.push({
        movieId: rename.movieId,
        currentName: path.basename(rename.currentPath),
        error: error.message,
      });
      console.error(`❌ Failed to rename ${path.basename(rename.currentPath)}:`, error);
    }
  }

  return results;
}

/**
 * Extract season and episode numbers from filename
 * @param {string} filename - The filename to parse
 * @returns {{season: number|null, episode: number|null}} - Extracted season/episode
 */
function extractSeasonEpisode(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  
  // Try S##E## pattern (e.g., S01E01)
  let match = baseName.match(/S(\d{1,2})E(\d{1,2})/i);
  if (match) {
    return {
      season: parseInt(match[1], 10),
      episode: parseInt(match[2], 10),
    };
  }
  
  // Try #x## pattern (e.g., 1x01)
  match = baseName.match(/(\d{1,2})x(\d{1,2})/i);
  if (match) {
    return {
      season: parseInt(match[1], 10),
      episode: parseInt(match[2], 10),
    };
  }
  
  // Try Season # Episode # pattern
  match = baseName.match(/Season[.\s\-_](\d{1,2})[.\s\-_]Episode[.\s\-_](\d{1,2})/i);
  if (match) {
    return {
      season: parseInt(match[1], 10),
      episode: parseInt(match[2], 10),
    };
  }
  
  return { season: null, episode: null };
}

/**
 * Apply naming format to a series episode
 * @param {string} format - The naming format with tokens
 * @param {object} series - The series object with metadata
 * @param {number} season - Season number
 * @param {number} episode - Episode number
 * @param {string} episodeTitle - Episode title (if available)
 * @param {string} currentFilename - The current filename to extract metadata from
 * @returns {string} - The formatted filename
 */
function applySeriesFormat(format, series, season, episode, episodeTitle = '', currentFilename = '') {
  // Extract metadata from current filename
  const metadata = currentFilename ? extractMetadataFromFilename(currentFilename) : {};
  
  // Format season/episode numbers with padding
  const seasonPadded = String(season).padStart(2, '0');
  const episodePadded = String(episode).padStart(2, '0');

  let result = format
    // Basic tokens
    .replace(/{Series Title}/g, series.title)
    .replace(/{series title}/g, series.title.toLowerCase())
    .replace(/{SERIES TITLE}/g, series.title.toUpperCase())
    
    // Season tokens
    .replace(/{season:00}/g, seasonPadded)
    .replace(/{season}/g, season)
    .replace(/{Season:00}/g, seasonPadded)
    .replace(/{Season}/g, season)
    
    // Episode tokens
    .replace(/{episode:00}/g, episodePadded)
    .replace(/{episode}/g, episode)
    .replace(/{Episode:00}/g, episodePadded)
    .replace(/{Episode}/g, episode)
    
    // Episode title
    .replace(/{Episode Title}/g, episodeTitle || '')
    .replace(/{episode title}/g, episodeTitle ? episodeTitle.toLowerCase() : '')
    .replace(/{EPISODE TITLE}/g, episodeTitle ? episodeTitle.toUpperCase() : '')
    
    // Advanced tokens
    .replace(/{Quality}/g, metadata.quality || '')
    .replace(/{Source}/g, metadata.source || '')
    .replace(/{Codec}/g, metadata.codec || '')
    .replace(/{Audio}/g, metadata.audio || '')
    .replace(/{Edition}/g, metadata.edition || '')
    .replace(/{Release Group}/g, metadata.releaseGroup || '');

  // Clean up double spaces and leading/trailing spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  // Clean up any invalid filename characters
  result = result.replace(/[<>:"/\\|?*]/g, '');
  
  // Clean up multiple dots or dashes in a row
  result = result.replace(/\.{2,}/g, '.').replace(/-{2,}/g, '-');
  
  // Clean up spaces before punctuation
  result = result.replace(/\s+([.,\-_()])/g, '$1');
  
  // Remove empty parentheses or brackets
  result = result.replace(/\(\s*\)/g, '').replace(/\[\s*\]/g, '');
  
  return result;
}

/**
 * Helper function to extract series title from filename
 * @param {string} filename - The filename to parse
 * @returns {string} - Extracted series title
 */
function extractSeriesTitleFromFilename(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  
  // Try to extract title before season/episode marker
  // Pattern: Title.S01E01 or Title.1x01 or Title.Season.1.Episode.1
  const patterns = [
    /^(.+?)[.\s\-_][Ss](\d{1,2})[Ee](\d{1,2})/,  // Title.S01E01
    /^(.+?)[.\s\-_](\d{1,2})[xX](\d{1,2})/,       // Title.1x01
    /^(.+?)[.\s\-_][Ss]eason[.\s\-_](\d{1,2})/i,  // Title.Season.1
  ];
  
  for (const pattern of patterns) {
    const match = baseName.match(pattern);
    if (match) {
      let title = match[1]
        .replace(/[._]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
      return title;
    }
  }
  
  // Fallback: take everything before first digit sequence
  const fallbackMatch = baseName.match(/^(.+?)(?:[.\s\-_]\d+)/);
  if (fallbackMatch) {
    return fallbackMatch[1].replace(/[._]/g, ' ').trim();
  }
  
  return baseName.replace(/[._]/g, ' ').trim();
}

/**
 * Fuzzy match series title to monitored series
 * @param {string} fileTitle - Title extracted from filename
 * @param {Array} monitoredSeries - Array of monitored series objects
 * @returns {object|null} - Matched series or null
 */
function matchSeriesToMonitored(fileTitle, monitoredSeries) {
  const normalizeTitle = (title) => title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedFileTitle = normalizeTitle(fileTitle);
  
  // Try exact match first
  for (const series of monitoredSeries) {
    if (normalizeTitle(series.title) === normalizedFileTitle) {
      return series;
    }
  }
  
  // Try partial match (contains or is contained)
  for (const series of monitoredSeries) {
    const normalizedSeriesTitle = normalizeTitle(series.title);
    if (normalizedFileTitle.includes(normalizedSeriesTitle) || 
        normalizedSeriesTitle.includes(normalizedFileTitle)) {
      return series;
    }
  }
  
  return null;
}

/**
 * Preview file renames for all monitored series episodes
 * @param {string} userId - The user ID
 * @param {string} seriesFileFormat - The series naming format
 * @returns {Promise<Array<{seriesId, currentPath, currentName, newName, newPath, directory, season, episode}>>}
 */
async function previewSeriesRenames(userId, seriesFileFormat) {
  const renames = [];
  const Settings = require('../models/Settings');
  
  // Get user's series directory
  const settings = await Settings.findOne({ where: { userId } });
  if (!settings || !settings.seriesDirectory) {
    return renames;
  }
  
  const seriesDirectory = settings.seriesDirectory;
  
  // Get all monitored series for this user
  const allSeries = await MonitoredSeries.findAll({
    where: { userId },
  });

  if (allSeries.length === 0) {
    console.log('No monitored series found for user');
    return renames;
  }

  console.log(`Found ${allSeries.length} monitored series for user ${userId}`);
  
  // Find all video files in the entire series directory (including root)
  const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mpeg', '.mpg', '.m4v'];
  const allVideoFiles = await findVideoFiles(seriesDirectory, videoExtensions);
  
  console.log(`Found ${allVideoFiles.length} video files in ${seriesDirectory}`);

  // Process each video file
  for (const videoFile of allVideoFiles) {
    try {
      const currentPath = videoFile;
      const currentName = path.basename(currentPath);
      const currentExt = path.extname(currentPath);
      
      // Extract season/episode from filename
      const { season, episode } = extractSeasonEpisode(currentName);
      
      if (season === null || episode === null) {
        console.log(`Skipping ${currentName}: Could not extract season/episode`);
        continue;
      }
      
      // Extract series title from filename
      const fileSeriesTitle = extractSeriesTitleFromFilename(currentName);
      console.log(`Extracted title "${fileSeriesTitle}" from ${currentName}`);
      
      // Try to match to a monitored series
      const matchedSeries = matchSeriesToMonitored(fileSeriesTitle, allSeries);
      
      if (!matchedSeries) {
        console.log(`No monitored series match for "${fileSeriesTitle}"`);
        continue;
      }
      
      console.log(`Matched to monitored series: "${matchedSeries.title}"`);
      
      // Apply the naming format
      const newBaseName = applySeriesFormat(
        seriesFileFormat, 
        matchedSeries, 
        season, 
        episode, 
        '', // Episode title (we don't have it from the file)
        currentName
      );
      const newFileName = `${newBaseName}${currentExt}`;
      
      // Determine new path based on format
      // If format includes folder structure (contains /), create that structure
      let newPath;
      if (newFileName.includes('/') || newFileName.includes('\\')) {
        // Format includes folder structure, use series directory as base
        newPath = path.join(seriesDirectory, newFileName);
      } else {
        // No folder structure in format, keep in current directory
        newPath = path.join(path.dirname(currentPath), newFileName);
      }
      
      // Normalize the new path
      newPath = path.normalize(newPath);
      
      // Only include if the path would actually change
      if (currentPath !== newPath) {
        renames.push({
          seriesId: matchedSeries.id,
          currentPath,
          currentName,
          newName: path.basename(newPath),
          newPath,
          directory: path.dirname(newPath),
          season,
          episode,
        });
      }
    } catch (error) {
      console.error(`Error processing file ${videoFile}:`, error);
    }
  }

  console.log(`Generated ${renames.length} rename operations`);
  return renames;
}

/**
 * Recursively find all video files in a directory
 * @param {string} dirPath - The directory to search
 * @param {Array<string>} extensions - Video file extensions
 * @returns {Promise<Array<string>>} - Array of file paths
 */
async function findVideoFiles(dirPath, extensions) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await findVideoFiles(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

/**
 * Execute series file renames
 * @param {string} userId - The user ID
 * @param {Array<{seriesId, currentPath, newName, directory}>} renames - Array of rename operations
 * @returns {Promise<{success: number, failed: number, errors: Array}>}
 */
async function executeSeriesRenames(userId, renames) {
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  const Settings = require('../models/Settings');
  const settings = await Settings.findOne({ where: { userId } });
  const seriesDirectory = settings?.seriesDirectory;

  if (!seriesDirectory) {
    results.failed = renames.length;
    results.errors.push({
      error: 'Series directory not configured',
    });
    return results;
  }

  for (const rename of renames) {
    try {
      const { seriesId, currentPath, newName, directory } = rename;
      
      // If the newName includes path separators (folders), we need to handle it specially
      // For example: "Breaking Bad/Season 01/Breaking Bad - S01E01.mkv"
      let finalPath;
      
      if (newName.includes('/') || newName.includes(path.sep)) {
        // The format includes folder structure
        // Build the path relative to the series directory
        finalPath = path.join(seriesDirectory, newName);
        
        // Create the directory structure if it doesn't exist
        const targetDirectory = path.dirname(finalPath);
        try {
          await fs.mkdir(targetDirectory, { recursive: true });
        } catch (mkdirError) {
          console.log(`Directory already exists or created: ${targetDirectory}`);
        }
      } else {
        // No folder structure, rename in place
        finalPath = path.join(directory, newName);
      }

      // Check if source file exists
      try {
        await fs.access(currentPath);
      } catch (error) {
        results.failed++;
        results.errors.push({
          seriesId,
          currentName: path.basename(currentPath),
          error: 'Source file not found',
        });
        continue;
      }

      // Check if destination already exists
      try {
        await fs.access(finalPath);
        results.failed++;
        results.errors.push({
          seriesId,
          currentName: path.basename(currentPath),
          error: 'Destination file already exists',
        });
        continue;
      } catch (error) {
        // Good, destination doesn't exist
      }

      // Perform the rename/move
      await fs.rename(currentPath, finalPath);

      results.success++;
      console.log(`✅ Organized series file: ${path.basename(currentPath)} → ${finalPath}`);
    } catch (error) {
      results.failed++;
      results.errors.push({
        seriesId: rename.seriesId,
        currentName: path.basename(rename.currentPath),
        error: error.message,
      });
      console.error(`❌ Failed to rename series file ${path.basename(rename.currentPath)}:`, error);
    }
  }

  return results;
}

module.exports = {
  extractMetadataFromFilename,
  extractSeasonEpisode,
  applyMovieFormat,
  applySeriesFormat,
  previewMovieRenames,
  previewSeriesRenames,
  executeMovieRenames,
  executeSeriesRenames,
};


