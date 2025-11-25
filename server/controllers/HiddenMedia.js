const HiddenMedia = require('../models/HiddenMedia');
const { Op } = require('sequelize');

/**
 * Hide a movie or series for a user
 */
exports.hideMedia = async (req, res) => {
  try {
    const { mediaType, tmdbId, title, posterPath } = req.body;
    const userId = req.user.id;

    if (!mediaType || !tmdbId) {
      return res.status(400).json({ 
        success: false, 
        error: 'mediaType and tmdbId are required' 
      });
    }

    if (!['movie', 'series'].includes(mediaType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'mediaType must be either "movie" or "series"' 
      });
    }

    // Create or update hidden media entry
    const [hiddenMedia, created] = await HiddenMedia.findOrCreate({
      where: {
        userId,
        mediaType,
        tmdbId: parseInt(tmdbId, 10),
      },
      defaults: {
        title,
        posterPath,
      },
    });

    res.json({ 
      success: true, 
      hidden: hiddenMedia,
      message: created ? 'Media hidden successfully' : 'Media was already hidden'
    });
  } catch (error) {
    console.error('Error hiding media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Unhide a movie or series for a user
 */
exports.unhideMedia = async (req, res) => {
  try {
    const { mediaType, tmdbId } = req.body;
    const userId = req.user.id;

    if (!mediaType || !tmdbId) {
      return res.status(400).json({ 
        success: false, 
        error: 'mediaType and tmdbId are required' 
      });
    }

    const deleted = await HiddenMedia.destroy({
      where: {
        userId,
        mediaType,
        tmdbId: parseInt(tmdbId, 10),
      },
    });

    if (deleted === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Hidden media not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Media unhidden successfully' 
    });
  } catch (error) {
    console.error('Error unhiding media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all hidden media for the authenticated user
 */
exports.getHiddenMedia = async (req, res) => {
  try {
    const userId = req.user.id;
    const { mediaType } = req.query;

    const where = { userId };
    if (mediaType) {
      where.mediaType = mediaType;
    }

    const hiddenMedia = await HiddenMedia.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    // Return as an object with tmdbIds for easy lookup
    const hiddenIds = {
      movies: [],
      series: [],
    };

    hiddenMedia.forEach(item => {
      if (item.mediaType === 'movie') {
        hiddenIds.movies.push(item.tmdbId);
      } else if (item.mediaType === 'series') {
        hiddenIds.series.push(item.tmdbId);
      }
    });

    res.json({ 
      success: true, 
      hiddenMedia,
      hiddenIds,
    });
  } catch (error) {
    console.error('Error getting hidden media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Check if specific media items are hidden
 */
exports.checkHidden = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body; // Array of { mediaType, tmdbId }

    if (!Array.isArray(items)) {
      return res.status(400).json({ 
        success: false, 
        error: 'items must be an array of { mediaType, tmdbId }' 
      });
    }

    const hiddenStatuses = {};

    for (const item of items) {
      const exists = await HiddenMedia.findOne({
        where: {
          userId,
          mediaType: item.mediaType,
          tmdbId: parseInt(item.tmdbId, 10),
        },
      });
      hiddenStatuses[`${item.mediaType}-${item.tmdbId}`] = !!exists;
    }

    res.json({ 
      success: true, 
      hiddenStatuses,
    });
  } catch (error) {
    console.error('Error checking hidden status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all hidden media with full details (for manage hidden page)
 */
exports.getAllHiddenMediaWithDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const hiddenMedia = await HiddenMedia.findAndCountAll({
      where: { userId },
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['createdAt', 'DESC']],
    });

    res.json({ 
      success: true, 
      hiddenMedia: hiddenMedia.rows,
      count: hiddenMedia.count,
    });
  } catch (error) {
    console.error('Error getting hidden media details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

