const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '02ad41cf73db27ff46061d6f52a97342';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * TMDB List Provider
 * 
 * Provides curated lists from TMDB's built-in endpoints
 */
class TMDBListProvider {
  constructor() {
    this.apiKey = TMDB_API_KEY;
  }

  async makeRequest(endpoint, params = {}) {
    try {
      const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
        params: {
          api_key: this.apiKey,
          language: 'en-US',
          ...params,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`TMDB API error for ${endpoint}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all available built-in lists
   */
  getAvailableLists() {
    return [
      // Movie Lists
      { id: 'movie-popular', name: 'Popular Movies', type: 'movie', endpoint: '/movie/popular', icon: '🔥' },
      { id: 'movie-top-rated', name: 'Top Rated Movies', type: 'movie', endpoint: '/movie/top_rated', icon: '⭐' },
      { id: 'movie-now-playing', name: 'Now Playing', type: 'movie', endpoint: '/movie/now_playing', icon: '🎬' },
      { id: 'movie-upcoming', name: 'Upcoming Movies', type: 'movie', endpoint: '/movie/upcoming', icon: '📅' },
      { id: 'movie-trending-week', name: 'Trending Movies (Week)', type: 'movie', endpoint: '/trending/movie/week', icon: '📈' },
      { id: 'movie-trending-day', name: 'Trending Movies (Today)', type: 'movie', endpoint: '/trending/movie/day', icon: '🌟' },
      
      // TV Lists
      { id: 'tv-popular', name: 'Popular TV Shows', type: 'tv', endpoint: '/tv/popular', icon: '📺' },
      { id: 'tv-top-rated', name: 'Top Rated TV Shows', type: 'tv', endpoint: '/tv/top_rated', icon: '🏆' },
      { id: 'tv-on-air', name: 'Currently Airing', type: 'tv', endpoint: '/tv/on_the_air', icon: '🔴' },
      { id: 'tv-airing-today', name: 'Airing Today', type: 'tv', endpoint: '/tv/airing_today', icon: '📡' },
      { id: 'tv-trending-week', name: 'Trending TV (Week)', type: 'tv', endpoint: '/trending/tv/week', icon: '📈' },
      
      // Genre Lists - Movies
      { id: 'movie-horror', name: 'Horror Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: 27, sort_by: 'popularity.desc' }, icon: '👻' },
      { id: 'movie-scifi', name: 'Sci-Fi Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: 878, sort_by: 'popularity.desc' }, icon: '🚀' },
      { id: 'movie-action', name: 'Action Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: 28, sort_by: 'popularity.desc' }, icon: '💥' },
      { id: 'movie-comedy', name: 'Comedy Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: 35, sort_by: 'popularity.desc' }, icon: '😂' },
      { id: 'movie-animation', name: 'Animated Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: 16, sort_by: 'popularity.desc' }, icon: '🎨' },
      { id: 'movie-documentary', name: 'Documentaries', type: 'movie', endpoint: '/discover/movie', params: { with_genres: 99, sort_by: 'popularity.desc' }, icon: '🎥' },
      { id: 'movie-thriller', name: 'Thriller Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: 53, sort_by: 'popularity.desc' }, icon: '😰' },
      { id: 'movie-romance', name: 'Romance Movies', type: 'movie', endpoint: '/discover/movie', params: { with_genres: 10749, sort_by: 'popularity.desc' }, icon: '💕' },
      
      // Genre Lists - TV
      { id: 'tv-drama', name: 'Drama Series', type: 'tv', endpoint: '/discover/tv', params: { with_genres: 18, sort_by: 'popularity.desc' }, icon: '🎭' },
      { id: 'tv-comedy', name: 'Comedy Series', type: 'tv', endpoint: '/discover/tv', params: { with_genres: 35, sort_by: 'popularity.desc' }, icon: '😄' },
      { id: 'tv-animation', name: 'Animated Series', type: 'tv', endpoint: '/discover/tv', params: { with_genres: 16, sort_by: 'popularity.desc' }, icon: '✨' },
      { id: 'tv-scifi', name: 'Sci-Fi & Fantasy Series', type: 'tv', endpoint: '/discover/tv', params: { with_genres: 10765, sort_by: 'popularity.desc' }, icon: '🌌' },
      { id: 'tv-crime', name: 'Crime Series', type: 'tv', endpoint: '/discover/tv', params: { with_genres: 80, sort_by: 'popularity.desc' }, icon: '🔍' },
      { id: 'tv-documentary', name: 'Documentary Series', type: 'tv', endpoint: '/discover/tv', params: { with_genres: 99, sort_by: 'popularity.desc' }, icon: '📹' },
      
      // Special Collections
      { id: 'movie-oscar-winners', name: 'Oscar Winners', type: 'movie', endpoint: '/discover/movie', params: { with_watch_providers: '8|9|337', sort_by: 'vote_average.desc', 'vote_count.gte': 1000 }, icon: '🏆' },
      { id: 'movie-classics', name: 'Classic Movies', type: 'movie', endpoint: '/discover/movie', params: { 'release_date.lte': '1980-12-31', sort_by: 'vote_average.desc', 'vote_count.gte': 500 }, icon: '🎞️' },
      { id: 'movie-2024', name: '2024 Movies', type: 'movie', endpoint: '/discover/movie', params: { primary_release_year: 2024, sort_by: 'popularity.desc' }, icon: '🆕' },
    ];
  }

  /**
   * Fetch a specific list
   */
  async fetchList(listId, page = 1) {
    const lists = this.getAvailableLists();
    const listConfig = lists.find(l => l.id === listId);
    
    if (!listConfig) {
      throw new Error(`List not found: ${listId}`);
    }

    const data = await this.makeRequest(listConfig.endpoint, {
      page,
      ...listConfig.params,
    });

    return {
      id: listId,
      name: listConfig.name,
      type: listConfig.type,
      icon: listConfig.icon,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      results: data.results.map(item => ({
        id: item.id,
        title: item.title || item.name,
        overview: item.overview,
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        releaseDate: item.release_date || item.first_air_date,
        voteAverage: item.vote_average,
        voteCount: item.vote_count,
        popularity: item.popularity,
        mediaType: listConfig.type,
      })),
    };
  }

  /**
   * Fetch multiple lists at once
   */
  async fetchMultipleLists(listIds, page = 1) {
    const results = await Promise.all(
      listIds.map(id => this.fetchList(id, page).catch(err => null))
    );
    return results.filter(Boolean);
  }

  /**
   * Get popular movie collections (franchises)
   */
  async getPopularCollections() {
    const popularCollectionIds = [
      { id: 10, name: 'Star Wars Collection' },
      { id: 131296, name: 'Marvel Cinematic Universe' },
      { id: 9485, name: 'The Fast and the Furious Collection' },
      { id: 119, name: 'The Lord of the Rings Collection' },
      { id: 1241, name: 'Harry Potter Collection' },
      { id: 87359, name: 'Mission: Impossible Collection' },
      { id: 328, name: 'Jurassic Park Collection' },
      { id: 2344, name: 'The Matrix Collection' },
      { id: 86311, name: 'The Avengers Collection' },
      { id: 435259, name: 'Spider-Man (MCU) Collection' },
      { id: 556, name: 'Spider-Man Collection' },
      { id: 748, name: 'X-Men Collection' },
      { id: 230, name: 'The Godfather Collection' },
      { id: 1570, name: 'Die Hard Collection' },
      { id: 2150, name: 'Shrek Collection' },
      { id: 404609, name: 'John Wick Collection' },
      { id: 529892, name: 'Dune Collection' },
      { id: 656, name: 'Saw Collection' },
      { id: 8945, name: 'Mad Max Collection' },
      { id: 31562, name: 'The Conjuring Collection' },
    ];

    const collections = await Promise.all(
      popularCollectionIds.map(async ({ id, name }) => {
        try {
          const data = await this.makeRequest(`/collection/${id}`);
          return {
            id: `collection-${id}`,
            collectionId: id,
            name: data.name || name,
            overview: data.overview,
            posterPath: data.poster_path,
            backdropPath: data.backdrop_path,
            parts: data.parts?.map(movie => ({
              id: movie.id,
              title: movie.title,
              overview: movie.overview,
              posterPath: movie.poster_path,
              releaseDate: movie.release_date,
              voteAverage: movie.vote_average,
              mediaType: 'movie',
            })) || [],
            filmCount: data.parts?.length || 0,
          };
        } catch (error) {
          console.error(`Failed to fetch collection ${id}:`, error.message);
          return null;
        }
      })
    );

    return collections.filter(Boolean);
  }

  /**
   * Get TMDB user lists (official lists)
   */
  async getOfficialLists() {
    // These are popular public TMDB lists
    const officialListIds = [
      { id: 1, name: 'TMDB Official List' },
      { id: 10, name: 'Top 10 Movies' },
    ];

    // Note: TMDB list API requires authentication for most lists
    // This is a placeholder for when you want to add specific list IDs
    return officialListIds;
  }
}

module.exports = new TMDBListProvider();

