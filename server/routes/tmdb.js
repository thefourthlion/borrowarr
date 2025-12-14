/**
 * TMDB Routes
 * API routes for TMDB movie search and details
 */

const express = require('express');
const router = express.Router();
const TMDBController = require('../controllers/TMDB');
const { optionalAuth } = require('../middleware/auth');

// Search movies
router.get('/search', TMDBController.searchMovies);

// Get popular movies
router.get('/popular/movies', TMDBController.getPopularMovies);
// Get popular TV shows
router.get('/popular/tv', TMDBController.getPopularTVShows);

// Get trending movies
router.get('/trending/movies', TMDBController.getTrendingMovies);
// Get trending TV shows
router.get('/trending/tv', TMDBController.getTrendingTVShows);

// Get upcoming movies
router.get('/upcoming/movies', TMDBController.getUpcomingMovies);
// Get upcoming TV shows
router.get('/upcoming/tv', TMDBController.getUpcomingTVShows);

// Get movies by genre
router.get('/genre/movies', TMDBController.getMoviesByGenre);
// Get TV shows by genre
router.get('/genre/tv', TMDBController.getTVShowsByGenre);

// Discover movies with advanced filtering
router.get('/discover/movies', TMDBController.discoverMovies);
// Discover TV shows with advanced filtering
router.get('/discover/tv', TMDBController.discoverTVShows);

// Get genres list
router.get('/genres', TMDBController.getGenres);

// Get watch providers
router.get('/watch/providers', TMDBController.getWatchProviders);

// Get popular TV shows with watch providers
router.get('/popular/tv/providers', TMDBController.getPopularTVShowsWithProviders);

// Get popular movies with watch providers
router.get('/popular/movies/providers', TMDBController.getPopularMoviesWithProviders);

// Get movie details
router.get('/movie/:id', TMDBController.getMovieDetails);

// Get TV show details
router.get('/tv/:id', TMDBController.getTVShowDetails);

// Get TV show season details with episodes
router.get('/tv/:id/season/:seasonNumber', TMDBController.getTVSeasonDetails);

// Get movies by person (actor)
router.get('/person/:id/movies', TMDBController.getMoviesByPerson);

// Get TV shows by person (actor)
router.get('/person/:id/tv', TMDBController.getTVShowsByPerson);

// Search torrents for a specific movie (optional auth to filter by user's indexers)
router.get('/movie/:id/torrents', optionalAuth, TMDBController.searchTorrentsForMovie);

// Search torrents for a specific TV episode (optional auth to filter by user's indexers)
router.get('/tv/:id/torrents', optionalAuth, TMDBController.searchTorrentsForTVEpisode);

module.exports = router;

