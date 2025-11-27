const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const MonitoredMovies = require('../models/MonitoredMovies');
const { getUserMovieDirectory } = require('./fileScanner');

const TMDB_API_KEY = process.env.TMDB_API || '02ad41cf73db27ff46061d6f52a97342';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

/**
 * Extract movie title and year from filename
 */
function parseMovieFilename(filename) {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm|m4v)$/i, '');
  
  // Common patterns:
  // "Movie Title (2020)"
  // "Movie Title 2020"
  // "Movie.Title.2020.1080p.BluRay"
  // "Movie_Title_2020_720p"
  
  // Try to extract year (4 digits, 19xx or 20xx)
  const yearMatch = nameWithoutExt.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;
  
  let title = nameWithoutExt;
  
  if (year) {
    // Remove year and everything after it
    title = nameWithoutExt.substring(0, nameWithoutExt.indexOf(year.toString()));
  } else {
    // Remove quality indicators and other metadata
    title = title.replace(/\b(1080p|720p|480p|2160p|4k|BluRay|WEB-DL|WEBRip|HDRip|DVDRip|BRRip|x264|x265|HEVC|AAC|DTS|5\.1)\b.*/gi, '');
  }
  
  // Clean up the title
  title = title
    .replace(/[._]/g, ' ')  // Replace dots and underscores with spaces
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .replace(/\(.*?\)/g, '') // Remove anything in parentheses
    .replace(/\[.*?\]/g, '') // Remove anything in brackets
    .trim();
  
  return {
    title,
    year,
    originalFilename: filename,
  };
}

/**
 * Search TMDB for a movie
 */
async function searchTMDB(title, year = null) {
  try {
    const params = {
      api_key: TMDB_API_KEY,
      query: title,
      include_adult: false,
    };
    
    if (year) {
      params.year = year;
    }
    
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, { params });
    
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0]; // Return best match
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching TMDB for "${title}":`, error.message);
    return null;
  }
}

/**
 * Scan directory for movie files
 */
async function scanMovieDirectory(directoryPath, options = {}) {
  const {
    recursive = true,
    maxDepth = 2,
    currentDepth = 0,
  } = options;
  
  const movies = [];
  const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
  
  try {
    const items = await fs.readdir(directoryPath, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(directoryPath, item.name);
      
      if (item.isDirectory() && recursive && currentDepth < maxDepth) {
        // Scan subdirectory
        const subMovies = await scanMovieDirectory(itemPath, {
          recursive,
          maxDepth,
          currentDepth: currentDepth + 1,
        });
        movies.push(...subMovies);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (videoExtensions.includes(ext)) {
          const stats = await fs.stat(itemPath);
          movies.push({
            filePath: itemPath,
            fileName: item.name,
            fileSize: stats.size,
            lastModified: stats.mtime,
            directory: path.dirname(itemPath),
          });
        }
      }
    }
    
    return movies;
  } catch (error) {
    console.error(`Error scanning directory ${directoryPath}:`, error.message);
    return [];
  }
}

/**
 * Import movies from directory into monitored list
 */
async function importMoviesFromDirectory(userId, options = {}) {
  const {
    dryRun = false,
    qualityProfile = 'any',
    minAvailability = 'released',
    monitor = 'movieOnly',
  } = options;
  
  // Get user's movie directory
  const movieDirectory = await getUserMovieDirectory(userId);
  
  if (!movieDirectory) {
    throw new Error('Movie directory not configured in settings');
  }
  
  console.log(`🔍 Scanning directory: ${movieDirectory}`);
  
  // Scan for movie files
  const movieFiles = await scanMovieDirectory(movieDirectory);
  
  console.log(`📁 Found ${movieFiles.length} video files`);
  
  const results = {
    total: movieFiles.length,
    imported: 0,
    skipped: 0,
    errors: 0,
    alreadyMonitored: 0,
    movies: [],
  };
  
  for (const file of movieFiles) {
    try {
      // Parse filename to extract title and year
      const parsed = parseMovieFilename(file.fileName);
      
      console.log(`\n📽️  Processing: ${file.fileName}`);
      console.log(`   Title: ${parsed.title}, Year: ${parsed.year || 'unknown'}`);
      
      // Search TMDB
      const tmdbMatch = await searchTMDB(parsed.title, parsed.year);
      
      if (!tmdbMatch) {
        console.log(`   ❌ No TMDB match found`);
        results.errors++;
        results.movies.push({
          fileName: file.fileName,
          status: 'error',
          error: 'No TMDB match found',
        });
        continue;
      }
      
      console.log(`   ✅ TMDB match: ${tmdbMatch.title} (${tmdbMatch.release_date?.substring(0, 4)})`);
      
      // Check if already monitored
      const existing = await MonitoredMovies.findOne({
        where: { userId, tmdbId: tmdbMatch.id },
      });
      
      if (existing) {
        console.log(`   ⏭️  Already monitored`);
        results.alreadyMonitored++;
        results.movies.push({
          fileName: file.fileName,
          tmdbId: tmdbMatch.id,
          title: tmdbMatch.title,
          status: 'already_monitored',
        });
        
        // Update file info for existing movie
        if (!dryRun) {
          await existing.update({
            fileExists: true,
            filePath: file.filePath,
            fileName: file.fileName,
            fileSize: file.fileSize,
            status: 'downloaded',
            lastChecked: new Date(),
          });
        }
        
        continue;
      }
      
      if (dryRun) {
        console.log(`   📋 Would import (dry run)`);
        results.imported++;
        results.movies.push({
          fileName: file.fileName,
          tmdbId: tmdbMatch.id,
          title: tmdbMatch.title,
          year: tmdbMatch.release_date?.substring(0, 4),
          status: 'would_import',
        });
        continue;
      }
      
      // Add to monitored list
      const posterUrl = tmdbMatch.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${tmdbMatch.poster_path}`
        : null;
      
      const movie = await MonitoredMovies.create({
        userId,
        tmdbId: tmdbMatch.id,
        title: tmdbMatch.title,
        posterUrl,
        releaseDate: tmdbMatch.release_date || null,
        overview: tmdbMatch.overview || null,
        qualityProfile,
        minAvailability,
        monitor,
        status: 'downloaded',
        fileExists: true,
        filePath: file.filePath,
        fileName: file.fileName,
        fileSize: file.fileSize,
        lastChecked: new Date(),
      });
      
      console.log(`   ✅ Imported to monitored list (ID: ${movie.id})`);
      results.imported++;
      results.movies.push({
        fileName: file.fileName,
        tmdbId: tmdbMatch.id,
        title: tmdbMatch.title,
        year: tmdbMatch.release_date?.substring(0, 4),
        status: 'imported',
        movieId: movie.id,
      });
      
      // Small delay to avoid hammering TMDB API
      await new Promise(resolve => setTimeout(resolve, 250));
      
    } catch (error) {
      console.error(`   ❌ Error processing ${file.fileName}:`, error.message);
      results.errors++;
      results.movies.push({
        fileName: file.fileName,
        status: 'error',
        error: error.message,
      });
    }
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   Total files: ${results.total}`);
  console.log(`   Imported: ${results.imported}`);
  console.log(`   Already monitored: ${results.alreadyMonitored}`);
  console.log(`   Errors: ${results.errors}`);
  
  return results;
}

module.exports = {
  parseMovieFilename,
  searchTMDB,
  scanMovieDirectory,
  importMoviesFromDirectory,
};

