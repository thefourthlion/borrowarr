/**
 * TMDB Controller
 * Handles TMDB movie search and details
 */

const tmdbService = require('../services/tmdbService');
const { searchIndexers } = require('../services/indexerSearch');
const Indexers = require('../models/Indexers');

// Cache genre lists
let movieGenresCache = null;
let tvGenresCache = null;
let genresCacheTime = 0;
const GENRES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getGenreLists() {
  const now = Date.now();
  if (!movieGenresCache || !tvGenresCache || (now - genresCacheTime > GENRES_CACHE_TTL)) {
    const [movieGenresResult, tvGenresResult] = await Promise.all([
      tmdbService.getMovieGenres(),
      tmdbService.getTVGenres(),
    ]);
    movieGenresCache = movieGenresResult.success ? movieGenresResult.genres : [];
    tvGenresCache = tvGenresResult.success ? tvGenresResult.genres : [];
    genresCacheTime = now;
  }
  return { movieGenres: movieGenresCache, tvGenres: tvGenresCache };
}

function getGenreNames(genreIds, genres) {
  if (!genreIds || !Array.isArray(genreIds) || !genres) return [];
  return genreIds
    .map(id => genres.find(g => g.id === id))
    .filter(Boolean)
    .map(g => g.name)
    .slice(0, 3); // Limit to first 3 genres
}

/**
 * Search for movies, TV shows, or both in TMDB
 */
exports.searchMovies = async (req, res) => {
  try {
    const { query, page, type } = req.query; // type: 'movie', 'tv', 'both' (default: 'both')

    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
    }

    let results;
    const searchType = type || 'both';

    if (searchType === 'movie') {
      results = await tmdbService.searchMovies(query.trim(), parseInt(page) || 1);
    } else if (searchType === 'tv') {
      results = await tmdbService.searchTVShows(query.trim(), parseInt(page) || 1);
    } else {
      // Search both
      results = await tmdbService.searchMulti(query.trim(), parseInt(page) || 1);
    }

    // Add poster URLs and enrich with genre names and other details
    if (results.success && results.results) {
      const { movieGenres, tvGenres } = await getGenreLists();
      
      // Filter and enrich results
      const enrichedResults = results.results
        .map(item => {
        const posterPath = item.poster_path || item.profile_path;
        const backdropPath = item.backdrop_path;
        const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const genres = mediaType === 'tv' ? tvGenres : movieGenres;
        const genreNames = getGenreNames(item.genre_ids, genres);
        
        // Get language from original_language
        const language = item.original_language ? item.original_language.toUpperCase() : null;
        
        // For TV shows, try to get network info from various possible fields
        // Note: search results may not include all details, so we check multiple sources
        let networkName = null;
        if (mediaType === 'tv') {
          // Check for networks array (TV shows)
          if (item.networks && item.networks.length > 0) {
            networkName = item.networks[0].name;
          }
          // Check for production_companies (sometimes available)
          else if (item.production_companies && item.production_companies.length > 0) {
            networkName = item.production_companies[0].name;
          }
          // Check for known_for_department (person results)
          else if (item.known_for_department) {
            // Skip person results
            return null;
          }
        } else if (mediaType === 'movie') {
          // For movies, get production company
          if (item.production_companies && item.production_companies.length > 0) {
            networkName = item.production_companies[0].name;
          }
        }
        
        // Filter out person results
        if (item.media_type === 'person' || (!item.title && !item.name)) {
          return null;
        }
        
        return {
          ...item,
          media_type: mediaType,
          posterUrl: tmdbService.getPosterUrl(posterPath, 'w500'),
          backdropUrl: tmdbService.getBackdropUrl(backdropPath, 'w1280'),
          genres: genreNames,
          language: language,
          network: networkName,
          number_of_seasons: item.number_of_seasons || null,
          number_of_episodes: item.number_of_episodes || null,
        };
        })
        .filter(item => item !== null); // Remove filtered out items
      
      results.results = enrichedResults;
    }

    res.json(results);
  } catch (error) {
    console.error('Error in searchMovies controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get movie details by TMDB ID
 */
exports.getMovieDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Movie ID is required',
      });
    }

    const result = await tmdbService.getMovieDetails(parseInt(id));

    if (result.success && result.movie) {
      result.movie.posterUrl = tmdbService.getPosterUrl(result.movie.poster_path, 'w500');
      result.movie.backdropUrl = tmdbService.getBackdropUrl(result.movie.backdrop_path, 'w1280');
    }

    res.json(result);
  } catch (error) {
    console.error('Error in getMovieDetails controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get TV show details by TMDB ID
 */
exports.getTVShowDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'TV show ID is required',
      });
    }

    const result = await tmdbService.getTVShowDetails(parseInt(id));

    if (result.success && result.tv) {
      result.tv.posterUrl = tmdbService.getPosterUrl(result.tv.poster_path, 'w500');
      result.tv.backdropUrl = tmdbService.getBackdropUrl(result.tv.backdrop_path, 'w1280');
    }

    res.json(result);
  } catch (error) {
    console.error('Error in getTVShowDetails controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get popular movies
 */
exports.getPopularMovies = async (req, res) => {
  try {
    const { page } = req.query;

    const results = await tmdbService.getPopularMovies(parseInt(page) || 1);

    // Add poster URLs to results
    if (results.success && results.results) {
      const { movieGenres } = await getGenreLists();
      results.results = results.results.map(movie => ({
        ...movie,
        posterUrl: tmdbService.getPosterUrl(movie.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(movie.backdrop_path, 'w1280'),
        genres: getGenreNames(movie.genre_ids, movieGenres),
        language: movie.original_language ? movie.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getPopularMovies controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get popular TV shows
 */
exports.getPopularTVShows = async (req, res) => {
  try {
    const { page } = req.query;

    const results = await tmdbService.getPopularTVShows(parseInt(page) || 1);

    // Add poster URLs to results
    if (results.success && results.results) {
      const { tvGenres } = await getGenreLists();
      results.results = results.results.map(tv => ({
        ...tv,
        posterUrl: tmdbService.getPosterUrl(tv.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(tv.backdrop_path, 'w1280'),
        genres: getGenreNames(tv.genre_ids, tvGenres),
        language: tv.original_language ? tv.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getPopularTVShows controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get trending movies
 */
exports.getTrendingMovies = async (req, res) => {
  try {
    const { page, timeWindow } = req.query;

    const results = await tmdbService.getTrendingMovies(timeWindow || 'day', parseInt(page) || 1);

    // Add poster URLs to results
    if (results.success && results.results) {
      const { movieGenres } = await getGenreLists();
      results.results = results.results.map(movie => ({
        ...movie,
        posterUrl: tmdbService.getPosterUrl(movie.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(movie.backdrop_path, 'w1280'),
        genres: getGenreNames(movie.genre_ids, movieGenres),
        language: movie.original_language ? movie.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getTrendingMovies controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get trending TV shows
 */
exports.getTrendingTVShows = async (req, res) => {
  try {
    const { page, timeWindow } = req.query;

    const results = await tmdbService.getTrendingTVShows(timeWindow || 'day', parseInt(page) || 1);

    // Add poster URLs to results
    if (results.success && results.results) {
      const { tvGenres } = await getGenreLists();
      results.results = results.results.map(tv => ({
        ...tv,
        posterUrl: tmdbService.getPosterUrl(tv.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(tv.backdrop_path, 'w1280'),
        genres: getGenreNames(tv.genre_ids, tvGenres),
        language: tv.original_language ? tv.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getTrendingTVShows controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get upcoming movies
 */
exports.getUpcomingMovies = async (req, res) => {
  try {
    const { page } = req.query;

    const results = await tmdbService.getUpcomingMovies(parseInt(page) || 1);

    // Add poster URLs to results
    if (results.success && results.results) {
      const { movieGenres } = await getGenreLists();
      results.results = results.results.map(movie => ({
        ...movie,
        posterUrl: tmdbService.getPosterUrl(movie.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(movie.backdrop_path, 'w1280'),
        genres: getGenreNames(movie.genre_ids, movieGenres),
        language: movie.original_language ? movie.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getUpcomingMovies controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get upcoming TV shows
 */
exports.getUpcomingTVShows = async (req, res) => {
  try {
    const { page } = req.query;

    const results = await tmdbService.getUpcomingTVShows(parseInt(page) || 1);

    // Add poster URLs to results
    if (results.success && results.results) {
      const { tvGenres } = await getGenreLists();
      results.results = results.results.map(tv => ({
        ...tv,
        posterUrl: tmdbService.getPosterUrl(tv.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(tv.backdrop_path, 'w1280'),
        genres: getGenreNames(tv.genre_ids, tvGenres),
        language: tv.original_language ? tv.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getUpcomingTVShows controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get movies by genre
 */
exports.getMoviesByGenre = async (req, res) => {
  try {
    const { genreId, page, watchRegion, watchProviders } = req.query;
    
    console.log('[TMDB Controller] getMoviesByGenre called with:', {
      genreId,
      page,
      watchRegion,
      watchProviders,
      queryParams: req.query
    });

    if (!genreId) {
      return res.status(400).json({
        success: false,
        error: 'Genre ID is required',
      });
    }

    const results = await tmdbService.getMoviesByGenre(
      parseInt(genreId), 
      parseInt(page) || 1,
      watchRegion || null,
      watchProviders || null
    );
    
    console.log('[TMDB Controller] getMoviesByGenre results:', {
      success: results.success,
      resultCount: results.results?.length || 0,
      totalResults: results.totalResults
    });

    // Add poster URLs to results
    if (results.success && results.results) {
      const { movieGenres } = await getGenreLists();
      results.results = results.results.map(movie => ({
        ...movie,
        posterUrl: tmdbService.getPosterUrl(movie.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(movie.backdrop_path, 'w1280'),
        genres: getGenreNames(movie.genre_ids, movieGenres),
        language: movie.original_language ? movie.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getMoviesByGenre controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get TV shows by genre
 */
exports.getTVShowsByGenre = async (req, res) => {
  try {
    const { genreId, page, watchRegion, watchProviders } = req.query;
    
    console.log('[TMDB Controller] getTVShowsByGenre called with:', {
      genreId,
      page,
      watchRegion,
      watchProviders,
      queryParams: req.query
    });

    if (!genreId) {
      return res.status(400).json({
        success: false,
        error: 'Genre ID is required',
      });
    }

    const results = await tmdbService.getTVShowsByGenre(
      parseInt(genreId), 
      parseInt(page) || 1,
      watchRegion || null,
      watchProviders || null
    );
    
    console.log('[TMDB Controller] getTVShowsByGenre results:', {
      success: results.success,
      resultCount: results.results?.length || 0,
      totalResults: results.totalResults
    });

    // Add poster URLs to results
    if (results.success && results.results) {
      const { tvGenres } = await getGenreLists();
      results.results = results.results.map(tv => ({
        ...tv,
        posterUrl: tmdbService.getPosterUrl(tv.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(tv.backdrop_path, 'w1280'),
        genres: getGenreNames(tv.genre_ids, tvGenres),
        language: tv.original_language ? tv.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getTVShowsByGenre controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get popular TV shows with optional watch provider filter
 */
exports.getPopularTVShowsWithProviders = async (req, res) => {
  try {
    const { page, watchRegion, watchProviders } = req.query;
    
    console.log('[TMDB Controller] getPopularTVShowsWithProviders called with:', {
      page,
      watchRegion,
      watchProviders,
      queryParams: req.query
    });

    const results = await tmdbService.getPopularTVShowsWithProviders(
      parseInt(page) || 1,
      watchRegion || null,
      watchProviders || null
    );
    
    console.log('[TMDB Controller] Results:', {
      success: results.success,
      resultCount: results.results?.length || 0,
      totalResults: results.totalResults
    });

    // Add poster URLs to results
    if (results.success && results.results) {
      const { tvGenres } = await getGenreLists();
      results.results = results.results.map(tv => ({
        ...tv,
        posterUrl: tmdbService.getPosterUrl(tv.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(tv.backdrop_path, 'w1280'),
        genres: getGenreNames(tv.genre_ids, tvGenres),
        language: tv.original_language ? tv.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getPopularTVShowsWithProviders controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get popular movies with optional watch provider filter
 */
exports.getPopularMoviesWithProviders = async (req, res) => {
  try {
    const { page, watchRegion, watchProviders } = req.query;
    
    console.log('[TMDB Controller] getPopularMoviesWithProviders called with:', {
      page,
      watchRegion,
      watchProviders,
      queryParams: req.query
    });

    const results = await tmdbService.getPopularMoviesWithProviders(
      parseInt(page) || 1,
      watchRegion || null,
      watchProviders || null
    );
    
    console.log('[TMDB Controller] Results:', {
      success: results.success,
      resultCount: results.results?.length || 0,
      totalResults: results.totalResults
    });

    // Add poster URLs to results
    if (results.success && results.results) {
      const { movieGenres } = await getGenreLists();
      results.results = results.results.map(movie => ({
        ...movie,
        posterUrl: tmdbService.getPosterUrl(movie.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(movie.backdrop_path, 'w1280'),
        genres: getGenreNames(movie.genre_ids, movieGenres),
        language: movie.original_language ? movie.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in getPopularMoviesWithProviders controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get watch providers for TV shows or movies
 */
exports.getWatchProviders = async (req, res) => {
  try {
    const { region, type } = req.query;
    const result = await tmdbService.getWatchProviders(region || 'US', type || 'tv');
    res.json(result);
  } catch (error) {
    console.error('Error in getWatchProviders controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get genres list
 */
exports.getGenres = async (req, res) => {
  try {
    const { type } = req.query; // 'movie' or 'tv'

    if (type === 'tv') {
      const result = await tmdbService.getTVGenres();
      res.json(result);
    } else {
      const result = await tmdbService.getMovieGenres();
      res.json(result);
    }
  } catch (error) {
    console.error('Error in getGenres controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Search for torrents for a specific movie
 */
exports.searchTorrentsForMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, year } = req.query;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Movie title is required',
      });
    }

    // Build search query
    let searchQuery = title;
    if (year) {
      searchQuery += ` ${year}`;
    }

    // Get enabled indexers - filter by userId if authenticated
    const whereClause = { enabled: true };
    if (req.userId) {
      whereClause.userId = req.userId;
    }

    let indexers = await Indexers.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'baseUrl', 'username', 'password', 'apiKey', 'protocol', 'indexerType', 'enabled', 'categories', 'verified', 'priority'],
      raw: true,
    });

    // Filter by indexerIds if provided
    if (req.query.indexerIds) {
      const ids = req.query.indexerIds.split(',').map(id => parseInt(id));
      indexers = indexers.filter((idx) => ids.includes(idx.id));
    }

    if (indexers.length === 0) {
      return res.json({
        success: true,
        results: [],
        total: 0,
        indexers: [],
      });
    }

    // Parse category IDs (usually movies category - 2000)
    const categoryIds = req.query.categoryIds
      ? req.query.categoryIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
      : [2000]; // Default to movies category

    // Search all indexers
    const { results: allResults, indexerSummaries } = await searchIndexers(
      indexers,
      searchQuery,
      categoryIds,
      100, // limit
      0    // offset
    );

    // Sort by seeders (descending)
    const sortedResults = allResults.sort((a, b) => {
      const aSeeders = a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
      const bSeeders = b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
      return bSeeders - aSeeders;
    });

    res.json({
      success: true,
      results: sortedResults,
      total: sortedResults.length,
      indexers: indexerSummaries,
    });
  } catch (error) {
    console.error('Error searching torrents for movie:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      results: [],
      total: 0,
    });
  }
};

/**
 * Discover movies with advanced filtering
 */
exports.discoverMovies = async (req, res) => {
  try {
    const {
      page,
      sortBy,
      releaseDateFrom,
      releaseDateTo,
      genres,
      originalLanguage,
      runtimeMin,
      runtimeMax,
      voteAverageMin,
      voteAverageMax,
      voteCountMin,
      keywords,
      watchRegion,
      watchProviders,
    } = req.query;

    const filters = {
      page: parseInt(page) || 1,
      sortBy: sortBy || 'popularity.desc',
      releaseDateFrom: releaseDateFrom || null,
      releaseDateTo: releaseDateTo || null,
      genres: genres ? genres.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      originalLanguage: originalLanguage || 'all',
      runtimeMin: runtimeMin || null,
      runtimeMax: runtimeMax || null,
      voteAverageMin: voteAverageMin || null,
      voteAverageMax: voteAverageMax || null,
      voteCountMin: voteCountMin || null,
      keywords: keywords || null,
      watchRegion: watchRegion || null,
      watchProviders: watchProviders || null,
    };

    const results = await tmdbService.discoverMovies(filters);

    // Add poster URLs to results
    if (results.success && results.results) {
      const { movieGenres } = await getGenreLists();
      results.results = results.results.map(movie => ({
        ...movie,
        posterUrl: tmdbService.getPosterUrl(movie.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(movie.backdrop_path, 'w1280'),
        genres: getGenreNames(movie.genre_ids, movieGenres),
        language: movie.original_language ? movie.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in discoverMovies controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Discover TV shows with advanced filtering
 */
exports.discoverTVShows = async (req, res) => {
  try {
    const {
      page,
      sortBy,
      firstAirDateFrom,
      firstAirDateTo,
      genres,
      originalLanguage,
      runtimeMin,
      runtimeMax,
      voteAverageMin,
      voteAverageMax,
      voteCountMin,
      keywords,
      watchRegion,
      watchProviders,
    } = req.query;

    const filters = {
      page: parseInt(page) || 1,
      sortBy: sortBy || 'popularity.desc',
      firstAirDateFrom: firstAirDateFrom || null,
      firstAirDateTo: firstAirDateTo || null,
      genres: genres ? genres.split(',').map(id => parseInt(id)).filter(id => !isNaN(id)) : [],
      originalLanguage: originalLanguage || 'all',
      runtimeMin: runtimeMin || null,
      runtimeMax: runtimeMax || null,
      voteAverageMin: voteAverageMin || null,
      voteAverageMax: voteAverageMax || null,
      voteCountMin: voteCountMin || null,
      keywords: keywords || null,
      watchRegion: watchRegion || null,
      watchProviders: watchProviders || null,
    };

    const results = await tmdbService.discoverTVShows(filters);

    // Add poster URLs to results
    if (results.success && results.results) {
      const { tvGenres } = await getGenreLists();
      results.results = results.results.map(tv => ({
        ...tv,
        posterUrl: tmdbService.getPosterUrl(tv.poster_path, 'w500'),
        backdropUrl: tmdbService.getBackdropUrl(tv.backdrop_path, 'w1280'),
        genres: getGenreNames(tv.genre_ids, tvGenres),
        language: tv.original_language ? tv.original_language.toUpperCase() : null,
      }));
    }

    res.json(results);
  } catch (error) {
    console.error('Error in discoverTVShows controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Get TV show season details with episodes
 */
exports.getTVSeasonDetails = async (req, res) => {
  try {
    const { id, seasonNumber } = req.params;

    if (!id || !seasonNumber) {
      return res.status(400).json({
        success: false,
        error: 'TV show ID and season number are required',
      });
    }

    const result = await tmdbService.getTVSeasonDetails(parseInt(id), parseInt(seasonNumber));
    res.json(result);
  } catch (error) {
    console.error('Error in getTVSeasonDetails controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * Search for torrents for a specific TV episode
 */
exports.searchTorrentsForTVEpisode = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, season, episode, year } = req.query;

    if (!title || !season || !episode) {
      return res.status(400).json({
        success: false,
        error: 'TV show title, season, and episode are required',
      });
    }

    // Build search query - format: "Show Name s01e01"
    let searchQuery = `${title} s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`;
    if (year) {
      searchQuery += ` ${year}`;
    }

    // Get enabled indexers - filter by userId if authenticated
    const whereClause = { enabled: true };
    if (req.userId) {
      whereClause.userId = req.userId;
    }

    let indexers = await Indexers.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'baseUrl', 'username', 'password', 'apiKey', 'protocol', 'indexerType', 'enabled', 'categories', 'verified', 'priority'],
      raw: true,
    });

    // Filter by indexerIds if provided
    if (req.query.indexerIds) {
      const ids = req.query.indexerIds.split(',').map(id => parseInt(id));
      indexers = indexers.filter((idx) => ids.includes(idx.id));
    }

    if (indexers.length === 0) {
      return res.json({
        success: true,
        results: [],
        total: 0,
        indexers: [],
      });
    }

    // Parse category IDs (TV shows category - 5000)
    const categoryIds = req.query.categoryIds
      ? req.query.categoryIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
      : [5000]; // Default to TV shows category

    // Search all indexers
    const { results: allResults, indexerSummaries } = await searchIndexers(
      indexers,
      searchQuery,
      categoryIds,
      100, // limit
      0    // offset
    );

    // Sort by seeders (descending)
    const sortedResults = allResults.sort((a, b) => {
      const aSeeders = a.seeders !== null && a.seeders !== undefined ? a.seeders : 0;
      const bSeeders = b.seeders !== null && b.seeders !== undefined ? b.seeders : 0;
      return bSeeders - aSeeders;
    });

    res.json({
      success: true,
      results: sortedResults,
      total: sortedResults.length,
      indexers: indexerSummaries,
    });
  } catch (error) {
    console.error('Error searching torrents for TV episode:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      results: [],
      total: 0,
    });
  }
};

module.exports = exports;

