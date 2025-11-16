const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const MonitoredSeries = require('../models/MonitoredSeries');

const TMDB_API_KEY = process.env.TMDB_API || '02ad41cf73db27ff46061d6f52a97342';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const VIDEO_EXTENSIONS = new Set([
  '.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mpeg', '.mpg', '.3gp', '.ts', '.vob', '.ogv', '.divx', '.xvid'
]);

/**
 * Extract series title and season/episode info from filename
 * @param {string} filename
 * @returns {{title: string, season: number | null, episode: number | null}}
 */
function parseSeriesFilename(filename) {
  const baseName = path.basename(filename, path.extname(filename));
  
  // Common patterns:
  // - Show Name S01E01
  // - Show.Name.S01E01
  // - Show Name - S01E01
  // - Show Name 1x01
  // - Show Name Season 1 Episode 1
  
  let title = null;
  let season = null;
  let episode = null;
  
  // Try S##E## pattern
  let match = baseName.match(/^(.+?)[.\s\-_]S(\d{1,2})E(\d{1,2})/i);
  if (match) {
    title = match[1];
    season = parseInt(match[2], 10);
    episode = parseInt(match[3], 10);
  } else {
    // Try #x## pattern
    match = baseName.match(/^(.+?)[.\s\-_](\d{1,2})x(\d{1,2})/i);
    if (match) {
      title = match[1];
      season = parseInt(match[2], 10);
      episode = parseInt(match[3], 10);
    } else {
      // Try Season # Episode # pattern
      match = baseName.match(/^(.+?)[.\s\-_]Season[.\s\-_](\d{1,2})[.\s\-_]Episode[.\s\-_](\d{1,2})/i);
      if (match) {
        title = match[1];
        season = parseInt(match[2], 10);
        episode = parseInt(match[3], 10);
      }
    }
  }
  
  if (title) {
    // Clean up title
    title = title
      .replace(/[._]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Remove quality tags, release group, etc.
    title = title.replace(/(\d{3,4}p|720p|1080p|2160p|4K|UHD|HDR|x264|x265|HEVC|WEB-DL|BluRay|BDRip|DVDRip|WEBRip|HDTV|AAC|DTS|AC3|DD5\.1|H\.264|H\.265)\b.*/gi, '');
    title = title.trim();
  }
  
  return { title, season, episode };
}

/**
 * Scan series directory for TV shows
 * @param {string} directoryPath
 * @returns {Promise<Array<{title: string, seasons: Set<number>, episodes: Array<{season: number, episode: number, filePath: string, fileName: string}>}>>}
 */
async function scanSeriesDirectory(directoryPath) {
  const seriesMap = new Map(); // title -> {seasons: Set, episodes: Array}
  
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories (for season folders)
        const subEntries = await fs.readdir(fullPath, { withFileTypes: true });
        
        for (const subEntry of subEntries) {
          if (subEntry.isFile() && VIDEO_EXTENSIONS.has(path.extname(subEntry.name).toLowerCase())) {
            const filePath = path.join(fullPath, subEntry.name);
            const parsed = parseSeriesFilename(subEntry.name);
            
            if (parsed.title && parsed.season !== null && parsed.episode !== null) {
              if (!seriesMap.has(parsed.title)) {
                seriesMap.set(parsed.title, {
                  title: parsed.title,
                  seasons: new Set(),
                  episodes: [],
                });
              }
              
              const series = seriesMap.get(parsed.title);
              series.seasons.add(parsed.season);
              series.episodes.push({
                season: parsed.season,
                episode: parsed.episode,
                filePath,
                fileName: subEntry.name,
              });
            }
          }
        }
      } else if (entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        // Direct video file in root
        const parsed = parseSeriesFilename(entry.name);
        
        if (parsed.title && parsed.season !== null && parsed.episode !== null) {
          if (!seriesMap.has(parsed.title)) {
            seriesMap.set(parsed.title, {
              title: parsed.title,
              seasons: new Set(),
              episodes: [],
            });
          }
          
          const series = seriesMap.get(parsed.title);
          series.seasons.add(parsed.season);
          series.episodes.push({
            season: parsed.season,
            episode: parsed.episode,
            filePath: fullPath,
            fileName: entry.name,
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${directoryPath}:`, error);
    throw error;
  }
  
  return Array.from(seriesMap.values());
}

/**
 * Search TMDB for TV series by title
 * @param {string} title
 * @returns {Promise<Array>}
 */
async function searchSeriesByTitle(title) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/search/tv`, {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
        include_adult: false,
      },
    });
    
    return response.data.results || [];
  } catch (error) {
    console.error(`Error searching TMDB for "${title}":`, error.message);
    return [];
  }
}

/**
 * Import series from directory into monitored list
 * @param {string} userId
 * @param {object} options
 * @returns {Promise<{total: number, imported: number, alreadyMonitored: number, errors: number, details: Array}>}
 */
async function importSeriesFromDirectory(userId, options = {}) {
  const { dryRun = false, qualityProfile = 'any', minAvailability = 'released', monitor = 'all' } = options;
  
  const results = {
    total: 0,
    imported: 0,
    alreadyMonitored: 0,
    errors: 0,
    details: [],
  };
  
  const settings = await require('../models/Settings').findOne({ where: { userId } });
  if (!settings || !settings.seriesDirectory) {
    throw new Error('Series directory not configured for this user.');
  }
  
  const seriesDirectory = settings.seriesDirectory;
  console.log(`📺 Scanning series directory: ${seriesDirectory}`);
  
  try {
    const seriesOnDisk = await scanSeriesDirectory(seriesDirectory);
    results.total = seriesOnDisk.length;
    
    console.log(`Found ${seriesOnDisk.length} series in directory`);
    
    for (const seriesInfo of seriesOnDisk) {
      try {
        console.log(`\n📺 Processing: ${seriesInfo.title}`);
        console.log(`   Seasons: ${Array.from(seriesInfo.seasons).sort().join(', ')}`);
        console.log(`   Episodes: ${seriesInfo.episodes.length}`);
        
        // Search TMDB
        const tmdbSearchResults = await searchSeriesByTitle(seriesInfo.title);
        
        if (tmdbSearchResults.length === 0) {
          results.errors++;
          results.details.push({
            title: seriesInfo.title,
            status: 'error',
            message: 'No matching series found on TMDB.',
          });
          console.log(`   ❌ No TMDB match found`);
          continue;
        }
        
        // Find best match (exact title match or first result)
        const tmdbSeries = tmdbSearchResults.find(s =>
          s.name.toLowerCase() === seriesInfo.title.toLowerCase()
        ) || tmdbSearchResults[0];
        
        console.log(`   ✅ TMDB match: ${tmdbSeries.name} (ID: ${tmdbSeries.id})`);
        
        // Check if already monitored
        let monitoredSeries = await MonitoredSeries.findOne({
          where: { userId, tmdbId: tmdbSeries.id },
        });
        
        if (monitoredSeries) {
          results.alreadyMonitored++;
          results.details.push({
            title: seriesInfo.title,
            status: 'already_monitored',
            message: 'Series already monitored.',
          });
          console.log(`   ⏭️  Already monitored`);
          
          // Update with episodes info if not in dry run
          if (!dryRun) {
            await monitoredSeries.update({
              selectedSeasons: JSON.stringify(Array.from(seriesInfo.seasons)),
              selectedEpisodes: JSON.stringify(seriesInfo.episodes.map(ep => `${ep.season}-${ep.episode}`)),
            });
          }
        } else {
          // Add to monitored list
          results.imported++;
          results.details.push({
            title: seriesInfo.title,
            status: 'imported',
            message: `Imported with ${seriesInfo.episodes.length} episodes across ${seriesInfo.seasons.size} season(s).`,
          });
          console.log(`   ✨ Importing`);
          
          if (!dryRun) {
            monitoredSeries = await MonitoredSeries.create({
              userId,
              tmdbId: tmdbSeries.id,
              title: tmdbSeries.name,
              posterUrl: tmdbSeries.poster_path ? `${TMDB_IMAGE_BASE_URL}${tmdbSeries.poster_path}` : null,
              firstAirDate: tmdbSeries.first_air_date || null,
              overview: tmdbSeries.overview || '',
              qualityProfile,
              minAvailability,
              monitor,
              status: 'downloaded', // Since files exist
              selectedSeasons: JSON.stringify(Array.from(seriesInfo.seasons)),
              selectedEpisodes: JSON.stringify(seriesInfo.episodes.map(ep => `${ep.season}-${ep.episode}`)),
            });
          }
        }
      } catch (seriesError) {
        results.errors++;
        results.details.push({
          title: seriesInfo.title,
          status: 'error',
          message: seriesError.message,
        });
        console.error(`   ❌ Error processing ${seriesInfo.title}:`, seriesError.message);
      }
    }
  } catch (dirError) {
    console.error(`Error scanning series directory ${seriesDirectory}:`, dirError);
    throw new Error(`Failed to scan series directory: ${dirError.message}`);
  }
  
  console.log(`\n📊 Series import complete for user ${userId}`);
  console.log(`   Imported: ${results.imported}, Already Monitored: ${results.alreadyMonitored}, Errors: ${results.errors}`);
  
  return results;
}

module.exports = {
  scanSeriesDirectory,
  parseSeriesFilename,
  importSeriesFromDirectory,
};
