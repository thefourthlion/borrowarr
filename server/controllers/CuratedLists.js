const tmdbLists = require('../services/listProviders/tmdbLists');

/**
 * Get all available curated lists
 */
exports.getAvailableLists = async (req, res) => {
  try {
    const tmdbBuiltInLists = tmdbLists.getAvailableLists();
    
    // Group lists by category
    const movieLists = tmdbBuiltInLists.filter(l => l.type === 'movie' && !l.id.includes('genre'));
    const tvLists = tmdbBuiltInLists.filter(l => l.type === 'tv' && !l.id.includes('genre'));
    const movieGenreLists = tmdbBuiltInLists.filter(l => l.type === 'movie' && l.id.includes('-') && !movieLists.includes(l) && !l.id.includes('trending'));
    const tvGenreLists = tmdbBuiltInLists.filter(l => l.type === 'tv' && l.id.includes('-') && !tvLists.includes(l) && !l.id.includes('trending'));
    
    res.json({
      success: true,
      categories: [
        {
          id: 'movies',
          name: 'Movie Lists',
          icon: '🎬',
          lists: movieLists,
        },
        {
          id: 'tv',
          name: 'TV Show Lists',
          icon: '📺',
          lists: tvLists,
        },
        {
          id: 'movie-genres',
          name: 'Movies by Genre',
          icon: '🎭',
          lists: movieGenreLists,
        },
        {
          id: 'tv-genres',
          name: 'TV by Genre',
          icon: '📡',
          lists: tvGenreLists,
        },
      ],
      allLists: tmdbBuiltInLists,
    });
  } catch (error) {
    console.error('Error getting available lists:', error);
    res.status(500).json({ error: 'Failed to get available lists' });
  }
};

/**
 * Get a specific curated list with content
 */
exports.getList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { page = 1 } = req.query;

    const list = await tmdbLists.fetchList(listId, parseInt(page));
    
    res.json({
      success: true,
      list,
    });
  } catch (error) {
    console.error('Error getting list:', error);
    res.status(500).json({ error: error.message || 'Failed to get list' });
  }
};

/**
 * Get multiple lists at once (for homepage/discovery)
 */
exports.getMultipleLists = async (req, res) => {
  try {
    const { listIds } = req.body;
    
    if (!listIds || !Array.isArray(listIds)) {
      return res.status(400).json({ error: 'listIds array is required' });
    }

    const lists = await tmdbLists.fetchMultipleLists(listIds);
    
    res.json({
      success: true,
      lists,
    });
  } catch (error) {
    console.error('Error getting multiple lists:', error);
    res.status(500).json({ error: 'Failed to get lists' });
  }
};

/**
 * Get popular movie collections (franchises)
 */
exports.getCollections = async (req, res) => {
  try {
    const collections = await tmdbLists.getPopularCollections();
    
    res.json({
      success: true,
      collections,
      total: collections.length,
    });
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: 'Failed to get collections' });
  }
};

/**
 * Get home page featured content
 * Returns a curated selection of lists for the homepage
 */
exports.getHomepageLists = async (req, res) => {
  try {
    // Fetch key lists for homepage
    const homepageListIds = [
      'movie-trending-week',
      'tv-trending-week',
      'movie-popular',
      'tv-popular',
      'movie-top-rated',
      'movie-upcoming',
    ];

    const lists = await tmdbLists.fetchMultipleLists(homepageListIds);
    
    // Also get some collections
    const collections = await tmdbLists.getPopularCollections();
    
    res.json({
      success: true,
      lists,
      collections: collections.slice(0, 10), // Top 10 collections
    });
  } catch (error) {
    console.error('Error getting homepage lists:', error);
    res.status(500).json({ error: 'Failed to get homepage content' });
  }
};

