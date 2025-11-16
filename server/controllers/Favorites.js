const Favorites = require('../models/Favorites');
const { Op } = require('sequelize');

/**
 * Add a favorite
 */
exports.addFavorite = async (req, res) => {
  try {
    const userId = req.userId;
    const { tmdbId, mediaType, title, posterUrl, overview, releaseDate, voteAverage } = req.body;

    console.log('[Favorites] Add request:', { userId, tmdbId, mediaType, title });

    if (!userId) {
      console.error('[Favorites] Missing userId from auth middleware');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!tmdbId || !mediaType || !title) {
      console.error('[Favorites] Missing required fields:', { tmdbId, mediaType, title });
      return res.status(400).json({ error: 'Missing required fields: tmdbId, mediaType, title' });
    }

    // Check if already favorited
    const existing = await Favorites.findOne({
      where: { userId, tmdbId, mediaType },
    });

    if (existing) {
      console.log('[Favorites] Already exists, returning existing favorite');
      return res.json({ success: true, favorite: existing, isNew: false });
    }

    // Create new favorite
    const favorite = await Favorites.create({
      userId,
      tmdbId,
      mediaType,
      title,
      posterUrl,
      overview,
      releaseDate,
      voteAverage,
    });

    console.log('[Favorites] Created successfully:', favorite.id);
    res.json({ success: true, favorite, isNew: true });
  } catch (error) {
    console.error('[Favorites] Error adding favorite:', error);
    console.error('[Favorites] Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to add favorite', details: error.message });
  }
};

/**
 * Remove a favorite
 */
exports.removeFavorite = async (req, res) => {
  try {
    const userId = req.userId;
    const { tmdbId, mediaType } = req.body;

    if (!tmdbId || !mediaType) {
      return res.status(400).json({ error: 'Missing required fields: tmdbId, mediaType' });
    }

    const deleted = await Favorites.destroy({
      where: { userId, tmdbId, mediaType },
    });

    if (deleted === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ success: true, message: 'Favorite removed' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

/**
 * Get all favorites for a user
 */
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.userId;
    const { mediaType, search, page = 1, limit = 20 } = req.query;

    const where = { userId };

    if (mediaType && (mediaType === 'movie' || mediaType === 'tv')) {
      where.mediaType = mediaType;
    }

    if (search) {
      where.title = { [Op.like]: `%${search}%` };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Favorites.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      favorites: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
};

/**
 * Check if media is favorited
 */
exports.checkFavorite = async (req, res) => {
  try {
    const userId = req.userId;
    const { tmdbId, mediaType } = req.query;

    if (!tmdbId || !mediaType) {
      return res.status(400).json({ error: 'Missing required fields: tmdbId, mediaType' });
    }

    const favorite = await Favorites.findOne({
      where: { userId, tmdbId: parseInt(tmdbId), mediaType },
    });

    res.json({ success: true, isFavorited: !!favorite });
  } catch (error) {
    console.error('Error checking favorite:', error);
    res.status(500).json({ error: 'Failed to check favorite' });
  }
};

/**
 * Get all favorite IDs for a user (for bulk checking)
 */
exports.getFavoriteIds = async (req, res) => {
  try {
    const userId = req.userId;
    const { mediaType } = req.query;

    const where = { userId };
    if (mediaType) {
      where.mediaType = mediaType;
    }

    const favorites = await Favorites.findAll({
      where,
      attributes: ['tmdbId', 'mediaType'],
    });

    const favoriteIds = favorites.map(f => `${f.tmdbId}-${f.mediaType}`);

    res.json({ success: true, favoriteIds });
  } catch (error) {
    console.error('Error getting favorite IDs:', error);
    res.status(500).json({ error: 'Failed to get favorite IDs' });
  }
};
