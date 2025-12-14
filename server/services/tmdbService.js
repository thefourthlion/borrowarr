/**
 * TMDB (The Movie Database) Service
 * Handles all TMDB API interactions
 */

const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API || '02ad41cf73db27ff46061d6f52a97342';
const TMDB_READ_TOKEN = process.env.TMDB_API_READ || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwMmFkNDFjZjczZGIyN2ZmNDYwNjFkNmY1MmE5NzM0MiIsIm5iZiI6MTc1Mjk0NTU4OS42MTQsInN1YiI6IjY4N2JkM2I1YTU3MTA4NmE0MDU1Yzg1MSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ed_xwVKJzof5hQAj4CD565i_Z5FdGB3J_OPVZ2D08U8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

class TMDBService {
  constructor() {
    this.apiKey = TMDB_API_KEY;
    this.readToken = TMDB_READ_TOKEN;
    this.baseUrl = TMDB_BASE_URL;
  }

  /**
   * Get axios instance with auth headers
   */
  getAxiosInstance() {
    return axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.readToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Search for movies
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @returns {Promise<Object>} Search results
   */
  async searchMovies(query, page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/search/movie', {
        params: {
          query: query,
          page: page,
          include_adult: false,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error searching TMDB:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to search TMDB',
        results: [],
        page: 1,
        totalPages: 1,
        totalResults: 0,
      };
    }
  }

  /**
   * Search for TV shows
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @returns {Promise<Object>} Search results
   */
  async searchTVShows(query, page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/search/tv', {
        params: {
          query: query,
          page: page,
          include_adult: false,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error searching TMDB for TV shows:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to search TMDB',
        results: [],
        page: 1,
        totalPages: 1,
        totalResults: 0,
      };
    }
  }

  /**
   * Search for both movies and TV shows
   * @param {string} query - Search query
   * @param {number} page - Page number
   * @returns {Promise<Object>} Combined search results
   */
  async searchMulti(query, page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/search/multi', {
        params: {
          query: query,
          page: page,
          include_adult: false,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error searching TMDB multi:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to search TMDB',
        results: [],
        page: 1,
        totalPages: 1,
        totalResults: 0,
      };
    }
  }

  /**
   * Get movie details by ID
   * @param {number} movieId - TMDB movie ID
   * @returns {Promise<Object>} Movie details
   */
  async getMovieDetails(movieId) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get(`/movie/${movieId}`, {
        params: {
          language: 'en-US',
          append_to_response: 'credits,videos,release_dates,alternative_titles',
        },
      });

      return {
        success: true,
        movie: response.data,
      };
    } catch (error) {
      console.error('Error getting movie details:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get movie details',
      };
    }
  }

  /**
   * Get TV show details by ID
   * @param {number} tvId - TMDB TV show ID
   * @returns {Promise<Object>} TV show details
   */
  async getTVShowDetails(tvId) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get(`/tv/${tvId}`, {
        params: {
          language: 'en-US',
          append_to_response: 'credits,videos,alternative_titles,content_ratings,external_ids',
        },
      });

      // Merge external_ids into the main response for easier access
      if (response.data.external_ids?.imdb_id) {
        response.data.imdb_id = response.data.external_ids.imdb_id;
      }

      return {
        success: true,
        tv: response.data,
      };
    } catch (error) {
      console.error('Error getting TV show details:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get TV show details',
      };
    }
  }

  /**
   * Get TV show season details with episodes
   * @param {number} tvId - TMDB TV show ID
   * @param {number} seasonNumber - Season number
   * @returns {Promise<Object>} Season details with episodes
   */
  async getTVSeasonDetails(tvId, seasonNumber) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get(`/tv/${tvId}/season/${seasonNumber}`, {
        params: {
          language: 'en-US',
        },
      });

      return {
        success: true,
        season: response.data,
      };
    } catch (error) {
      console.error('Error getting TV season details:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get TV season details',
      };
    }
  }

  /**
   * Get genre list for movies
   * @returns {Promise<Object>} Genre list
   */
  async getMovieGenres() {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/genre/movie/list', {
        params: {
          language: 'en-US',
        },
      });

      return {
        success: true,
        genres: response.data.genres || [],
      };
    } catch (error) {
      console.error('Error getting movie genres:', error.message);
      return {
        success: false,
        genres: [],
      };
    }
  }

  /**
   * Get genre list for TV shows
   * @returns {Promise<Object>} Genre list
   */
  async getTVGenres() {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/genre/tv/list', {
        params: {
          language: 'en-US',
        },
      });

      return {
        success: true,
        genres: response.data.genres || [],
      };
    } catch (error) {
      console.error('Error getting TV genres:', error.message);
      return {
        success: false,
        genres: [],
      };
    }
  }

  /**
   * Get popular movies
   * @param {number} page - Page number
   * @returns {Promise<Object>} Popular movies
   */
  async getPopularMovies(page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/movie/popular', {
        params: {
          page: page,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting popular movies:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get popular movies',
        results: [],
      };
    }
  }

  /**
   * Get popular movies with optional watch provider filter
   * @param {number} page - Page number
   * @param {string} watchRegion - Watch region (e.g., 'US')
   * @param {string} watchProviders - Comma-separated watch provider IDs
   * @returns {Promise<Object>} Popular movies
   */
  async getPopularMoviesWithProviders(page = 1, watchRegion = null, watchProviders = null) {
    try {
      const api = this.getAxiosInstance();
      const params = {
        page: page,
        language: 'en-US',
        sort_by: 'popularity.desc',
      };

      if (watchRegion && watchProviders) {
        params.with_watch_providers = watchProviders;
        params.watch_region = watchRegion;
        console.log('[TMDB Service] Filtering movies by watch providers:', {
          watchProviders,
          watchRegion,
          with_watch_providers: params.with_watch_providers
        });
      } else {
        console.log('[TMDB Service] No watch provider filter - watchRegion:', watchRegion, 'watchProviders:', watchProviders);
      }

      console.log('[TMDB Service] Calling /discover/movie with params:', params);
      const response = await api.get('/discover/movie', { params });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting popular movies:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get popular movies',
        results: [],
      };
    }
  }

  /**
   * Get popular TV shows
   * @param {number} page - Page number
   * @returns {Promise<Object>} Popular TV shows
   */
  async getPopularTVShows(page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/tv/popular', {
        params: {
          page: page,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting popular TV shows:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get popular TV shows',
        results: [],
      };
    }
  }

  /**
   * Get trending movies
   * @param {string} timeWindow - 'day' or 'week'
   * @param {number} page - Page number
   * @returns {Promise<Object>} Trending movies
   */
  async getTrendingMovies(timeWindow = 'day', page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/trending/movie/' + timeWindow, {
        params: {
          page: page,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting trending movies:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get trending movies',
        results: [],
      };
    }
  }

  /**
   * Get trending TV shows
   * @param {string} timeWindow - 'day' or 'week'
   * @param {number} page - Page number
   * @returns {Promise<Object>} Trending TV shows
   */
  async getTrendingTVShows(timeWindow = 'day', page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/trending/tv/' + timeWindow, {
        params: {
          page: page,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting trending TV shows:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get trending TV shows',
        results: [],
      };
    }
  }

  /**
   * Get upcoming movies
   * @param {number} page - Page number
   * @returns {Promise<Object>} Upcoming movies
   */
  async getUpcomingMovies(page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/movie/upcoming', {
        params: {
          page: page,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting upcoming movies:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get upcoming movies',
        results: [],
      };
    }
  }

  /**
   * Get upcoming TV shows (on the air)
   * @param {number} page - Page number
   * @returns {Promise<Object>} Upcoming TV shows
   */
  async getUpcomingTVShows(page = 1) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get('/tv/on_the_air', {
        params: {
          page: page,
          language: 'en-US',
        },
      });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting upcoming TV shows:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get upcoming TV shows',
        results: [],
      };
    }
  }

  /**
   * Get movies by genre
   * @param {number} genreId - Genre ID
   * @param {number} page - Page number
   * @param {string} watchRegion - Watch region (e.g., 'US')
   * @param {string} watchProviders - Comma-separated watch provider IDs
   * @returns {Promise<Object>} Movies by genre
   */
  async getMoviesByGenre(genreId, page = 1, watchRegion = null, watchProviders = null) {
    try {
      const api = this.getAxiosInstance();
      const params = {
          with_genres: genreId,
          page: page,
          language: 'en-US',
          sort_by: 'popularity.desc',
      };

      if (watchRegion && watchProviders) {
        params.with_watch_providers = watchProviders;
        params.watch_region = watchRegion;
        console.log('[TMDB Service] Filtering movies by genre and watch providers:', {
          genreId,
          watchProviders,
          watchRegion,
          with_watch_providers: params.with_watch_providers
        });
      }

      console.log('[TMDB Service] Calling /discover/movie with params:', params);
      const response = await api.get('/discover/movie', { params });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting movies by genre:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get movies by genre',
        results: [],
      };
    }
  }

  /**
   * Get TV shows by genre
   * @param {number} genreId - Genre ID
   * @param {number} page - Page number
   * @param {string} watchRegion - Watch region (e.g., 'US')
   * @param {string} watchProviders - Comma-separated watch provider IDs
   * @returns {Promise<Object>} TV shows by genre
   */
  async getTVShowsByGenre(genreId, page = 1, watchRegion = null, watchProviders = null) {
    try {
      const api = this.getAxiosInstance();
      const params = {
          with_genres: genreId,
          page: page,
          language: 'en-US',
          sort_by: 'popularity.desc',
      };

      if (watchRegion && watchProviders) {
        params.with_watch_providers = watchProviders;
        params.watch_region = watchRegion;
        console.log('[TMDB Service] Filtering TV shows by genre and watch providers:', {
          genreId,
          watchProviders,
          watchRegion,
          with_watch_providers: params.with_watch_providers
        });
      }

      console.log('[TMDB Service] Calling /discover/tv with params:', params);
      const response = await api.get('/discover/tv', { params });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting TV shows by genre:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get TV shows by genre',
        results: [],
      };
    }
  }

  /**
   * Get popular TV shows with optional watch provider filter
   * @param {number} page - Page number
   * @param {string} watchRegion - Watch region (e.g., 'US')
   * @param {string} watchProviders - Comma-separated watch provider IDs
   * @returns {Promise<Object>} Popular TV shows
   */
  async getPopularTVShowsWithProviders(page = 1, watchRegion = null, watchProviders = null) {
    try {
      const api = this.getAxiosInstance();
      const params = {
        page: page,
        language: 'en-US',
        sort_by: 'popularity.desc',
      };

      if (watchRegion && watchProviders) {
        params.with_watch_providers = watchProviders;
        params.watch_region = watchRegion;
        console.log('[TMDB Service] Filtering TV shows by watch providers:', {
          watchProviders,
          watchRegion,
          with_watch_providers: params.with_watch_providers
        });
      } else {
        console.log('[TMDB Service] No watch provider filter - watchRegion:', watchRegion, 'watchProviders:', watchProviders);
      }

      console.log('[TMDB Service] Calling /discover/tv with params:', params);
      const response = await api.get('/discover/tv', { params });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error getting popular TV shows:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get popular TV shows',
        results: [],
      };
    }
  }

  /**
   * Get available watch providers
   * @param {string} region - Region code (e.g., 'US')
   * @param {string} type - Type: 'tv' or 'movie' (default: 'tv')
   * @returns {Promise<Object>} Watch providers list
   */
  async getWatchProviders(region = 'US', type = 'tv') {
    try {
      const api = this.getAxiosInstance();
      const endpoint = type === 'movie' ? '/watch/providers/movie' : '/watch/providers/tv';
      const response = await api.get(endpoint, {
        params: {
          watch_region: region,
        },
      });

      return {
        success: true,
        providers: response.data.results || [],
      };
    } catch (error) {
      console.error('Error getting watch providers:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get watch providers',
        providers: [],
      };
    }
  }

  /**
   * Get movie poster URL
   * @param {string} posterPath - Poster path from TMDB
   * @param {string} size - Image size (w185, w342, w500, w780, original)
   * @returns {string} Full poster URL
   */
  getPosterUrl(posterPath, size = 'w500') {
    if (!posterPath) return null;
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  }

  /**
   * Get movie backdrop URL
   * @param {string} backdropPath - Backdrop path from TMDB
   * @param {string} size - Image size (w300, w780, w1280, original)
   * @returns {string} Full backdrop URL
   */
  getBackdropUrl(backdropPath, size = 'w1280') {
    if (!backdropPath) return null;
    return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
  }

  /**
   * Discover movies with advanced filtering
   * @param {Object} filters - Filter parameters
   * @param {number} filters.page - Page number
   * @param {string} filters.sortBy - Sort order (e.g., 'popularity.desc')
   * @param {string} filters.releaseDateFrom - Primary release date from (YYYY-MM-DD)
   * @param {string} filters.releaseDateTo - Primary release date to (YYYY-MM-DD)
   * @param {Array<number>} filters.genres - Genre IDs
   * @param {string} filters.originalLanguage - Original language code
   * @param {number} filters.runtimeMin - Minimum runtime in minutes
   * @param {number} filters.runtimeMax - Maximum runtime in minutes
   * @param {number} filters.voteAverageMin - Minimum vote average
   * @param {number} filters.voteAverageMax - Maximum vote average
   * @param {number} filters.voteCountMin - Minimum vote count
   * @param {string} filters.keywords - Keywords to search for
   * @param {string} filters.watchRegion - Watch region (e.g., 'US')
   * @param {string} filters.watchProviders - Comma-separated watch provider IDs
   * @returns {Promise<Object>} Discovered movies
   */
  async discoverMovies(filters = {}) {
    try {
      const api = this.getAxiosInstance();
      const params = {
        page: filters.page || 1,
        language: 'en-US',
        sort_by: filters.sortBy || 'popularity.desc',
      };

      // Release date filters
      if (filters.releaseDateFrom) {
        params['primary_release_date.gte'] = filters.releaseDateFrom;
      }
      if (filters.releaseDateTo) {
        params['primary_release_date.lte'] = filters.releaseDateTo;
      }

      // Genre filter
      if (filters.genres && filters.genres.length > 0) {
        params.with_genres = filters.genres.join(',');
      }

      // Original language filter
      if (filters.originalLanguage && filters.originalLanguage !== 'all') {
        params.with_original_language = filters.originalLanguage;
      }

      // Runtime filters
      if (filters.runtimeMin) {
        params['with_runtime.gte'] = parseInt(filters.runtimeMin);
      }
      if (filters.runtimeMax) {
        params['with_runtime.lte'] = parseInt(filters.runtimeMax);
      }

      // Vote filters
      if (filters.voteAverageMin) {
        params['vote_average.gte'] = parseFloat(filters.voteAverageMin);
      }
      if (filters.voteAverageMax) {
        params['vote_average.lte'] = parseFloat(filters.voteAverageMax);
      }
      if (filters.voteCountMin) {
        params['vote_count.gte'] = parseInt(filters.voteCountMin);
      }

      // Keywords filter (using with_keywords parameter)
      if (filters.keywords && filters.keywords.trim()) {
        // Note: TMDB doesn't have a direct keyword search in discover, but we can use with_keywords
        // This requires keyword IDs, not text. For text search, we'd need to search keywords first.
        // For now, we'll skip this or implement keyword ID lookup if needed.
      }

      // Watch provider filters
      if (filters.watchRegion && filters.watchProviders) {
        params.with_watch_providers = filters.watchProviders;
        params.watch_region = filters.watchRegion;
      }

      const response = await api.get('/discover/movie', { params });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error discovering movies:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to discover movies',
        results: [],
      };
    }
  }

  /**
   * Discover TV shows with advanced filtering
   * @param {Object} filters - Filter parameters
   * @param {number} filters.page - Page number
   * @param {string} filters.sortBy - Sort order (e.g., 'popularity.desc')
   * @param {string} filters.firstAirDateFrom - First air date from (YYYY-MM-DD)
   * @param {string} filters.firstAirDateTo - First air date to (YYYY-MM-DD)
   * @param {Array<number>} filters.genres - Genre IDs
   * @param {string} filters.originalLanguage - Original language code
   * @param {number} filters.runtimeMin - Minimum runtime in minutes
   * @param {number} filters.runtimeMax - Maximum runtime in minutes
   * @param {number} filters.voteAverageMin - Minimum vote average
   * @param {number} filters.voteAverageMax - Maximum vote average
   * @param {number} filters.voteCountMin - Minimum vote count
   * @param {string} filters.keywords - Keywords to search for
   * @param {string} filters.watchRegion - Watch region (e.g., 'US')
   * @param {string} filters.watchProviders - Comma-separated watch provider IDs
   * @returns {Promise<Object>} Discovered TV shows
   */
  async discoverTVShows(filters = {}) {
    try {
      const api = this.getAxiosInstance();
      const params = {
        page: filters.page || 1,
        language: 'en-US',
        sort_by: filters.sortBy || 'popularity.desc',
      };

      // First air date filters
      if (filters.firstAirDateFrom) {
        params['first_air_date.gte'] = filters.firstAirDateFrom;
      }
      if (filters.firstAirDateTo) {
        params['first_air_date.lte'] = filters.firstAirDateTo;
      }

      // Genre filter
      if (filters.genres && filters.genres.length > 0) {
        params.with_genres = filters.genres.join(',');
      }

      // Original language filter
      if (filters.originalLanguage && filters.originalLanguage !== 'all') {
        params.with_original_language = filters.originalLanguage;
      }

      // Runtime filters
      if (filters.runtimeMin) {
        params['with_runtime.gte'] = parseInt(filters.runtimeMin);
      }
      if (filters.runtimeMax) {
        params['with_runtime.lte'] = parseInt(filters.runtimeMax);
      }

      // Vote filters
      if (filters.voteAverageMin) {
        params['vote_average.gte'] = parseFloat(filters.voteAverageMin);
      }
      if (filters.voteAverageMax) {
        params['vote_average.lte'] = parseFloat(filters.voteAverageMax);
      }
      if (filters.voteCountMin) {
        params['vote_count.gte'] = parseInt(filters.voteCountMin);
      }

      // Keywords filter (using with_keywords parameter)
      if (filters.keywords && filters.keywords.trim()) {
        // Note: TMDB doesn't have a direct keyword search in discover, but we can use with_keywords
        // This requires keyword IDs, not text. For text search, we'd need to search keywords first.
        // For now, we'll skip this or implement keyword ID lookup if needed.
      }

      // Watch provider filters
      if (filters.watchRegion && filters.watchProviders) {
        params.with_watch_providers = filters.watchProviders;
        params.watch_region = filters.watchRegion;
      }

      const response = await api.get('/discover/tv', { params });

      return {
        success: true,
        results: response.data.results || [],
        page: response.data.page || 1,
        totalPages: response.data.total_pages || 1,
        totalResults: response.data.total_results || 0,
      };
    } catch (error) {
      console.error('Error discovering TV shows:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to discover TV shows',
        results: [],
      };
    }
  }

  /**
   * Get movie credits for a person
   * @param {number} personId - TMDB person ID
   * @returns {Promise<Object>} Person's movie credits
   */
  async getPersonMovieCredits(personId) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get(`/person/${personId}/movie_credits`, {
        params: {
          language: 'en-US',
        },
      });

      return {
        success: true,
        cast: response.data.cast || [],
        crew: response.data.crew || [],
      };
    } catch (error) {
      console.error('Error getting person movie credits:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get person movie credits',
        cast: [],
        crew: [],
      };
    }
  }

  /**
   * Get TV credits for a person
   * @param {number} personId - TMDB person ID
   * @returns {Promise<Object>} Person's TV credits
   */
  async getPersonTVCredits(personId) {
    try {
      const api = this.getAxiosInstance();
      const response = await api.get(`/person/${personId}/tv_credits`, {
        params: {
          language: 'en-US',
        },
      });

      return {
        success: true,
        cast: response.data.cast || [],
        crew: response.data.crew || [],
      };
    } catch (error) {
      console.error('Error getting person TV credits:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to get person TV credits',
        cast: [],
        crew: [],
      };
    }
  }
}

module.exports = new TMDBService();

