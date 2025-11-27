const History = require('../models/History');
const { Op } = require('sequelize');

/**
 * Add a history entry
 */
exports.addHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      mediaType,
      mediaTitle,
      tmdbId,
      seasonNumber,
      episodeNumber,
      releaseName,
      protocol,
      indexer,
      indexerId,
      downloadUrl,
      size,
      sizeFormatted,
      seeders,
      leechers,
      quality,
      status,
      source,
      downloadClient,
      downloadClientId,
    } = req.body;

    console.log('[History] Adding entry:', { userId, mediaTitle, releaseName, source });

    if (!releaseName || !protocol) {
      return res.status(400).json({ error: 'Missing required fields: releaseName, protocol' });
    }

    const history = await History.create({
      userId,
      mediaType: mediaType || 'unknown',
      mediaTitle,
      tmdbId,
      seasonNumber,
      episodeNumber,
      releaseName,
      protocol,
      indexer,
      indexerId,
      downloadUrl,
      size,
      sizeFormatted,
      seeders,
      leechers,
      quality,
      status: status || 'grabbed',
      source,
      downloadClient,
      downloadClientId,
    });

    res.status(201).json({ success: true, history });
  } catch (error) {
    console.error('[History] Error adding entry:', error);
    res.status(500).json({ error: 'Failed to add history entry', details: error.message });
  }
};

/**
 * Get history for a user
 */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 50,
      mediaType,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = { userId };

    if (mediaType && mediaType !== 'all') {
      where.mediaType = mediaType;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { releaseName: { [Op.like]: `%${search.trim()}%` } },
        { mediaTitle: { [Op.like]: `%${search.trim()}%` } },
        { indexer: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    // Validate sortBy to prevent SQL injection
    const validSortColumns = ['createdAt', 'updatedAt', 'releaseName', 'mediaTitle', 'status'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await History.findAndCountAll({
      where,
      order: [[safeSortBy, safeSortOrder]],
      limit: parseInt(limit),
      offset: offset,
    });

    res.json({
      success: true,
      history: rows || [],
      pagination: {
        total: count || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil((count || 0) / parseInt(limit)) || 1,
      },
    });
  } catch (error) {
    console.error('[History] Error getting history:', error);
    console.error('[History] Error stack:', error.stack);
    
    // If table doesn't exist, return empty results instead of error
    if (error.message && error.message.includes('no such table')) {
      console.log('[History] History table does not exist yet, returning empty results');
      return res.json({
        success: true,
        history: [],
        pagination: {
          total: 0,
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 50,
          pages: 1,
        },
      });
    }
    
    res.status(500).json({ error: 'Failed to get history', details: error.message });
  }
};

/**
 * Get a single history entry
 */
exports.getHistoryById = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const history = await History.findOne({
      where: { id, userId },
    });

    if (!history) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    res.json({ success: true, history });
  } catch (error) {
    console.error('[History] Error getting history entry:', error);
    res.status(500).json({ error: 'Failed to get history entry', details: error.message });
  }
};

/**
 * Update history entry status
 */
exports.updateHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { status, downloadClientId } = req.body;

    const history = await History.findOne({
      where: { id, userId },
    });

    if (!history) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    if (status) {
      history.status = status;
    }

    if (downloadClientId) {
      history.downloadClientId = downloadClientId;
    }

    await history.save();

    res.json({ success: true, history });
  } catch (error) {
    console.error('[History] Error updating history:', error);
    res.status(500).json({ error: 'Failed to update history', details: error.message });
  }
};

/**
 * Delete history entry
 */
exports.deleteHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const history = await History.findOne({
      where: { id, userId },
    });

    if (!history) {
      return res.status(404).json({ error: 'History entry not found' });
    }

    await history.destroy();

    res.json({ success: true, message: 'History entry deleted' });
  } catch (error) {
    console.error('[History] Error deleting history:', error);
    res.status(500).json({ error: 'Failed to delete history', details: error.message });
  }
};

/**
 * Clear all history for a user
 */
exports.clearHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const count = await History.destroy({
      where: { userId },
    });

    res.json({ success: true, message: `Deleted ${count} history entries` });
  } catch (error) {
    console.error('[History] Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history', details: error.message });
  }
};

/**
 * Get history statistics
 */
exports.getHistoryStats = async (req, res) => {
  try {
    const userId = req.userId;

    const total = await History.count({ where: { userId } }).catch(() => 0);
    
    const movies = await History.count({ 
      where: { userId, mediaType: 'movie' } 
    }).catch(() => 0);
    
    const series = await History.count({ 
      where: { userId, mediaType: 'tv' } 
    }).catch(() => 0);

    const grabbed = await History.count({ 
      where: { userId, status: 'grabbed' } 
    }).catch(() => 0);
    
    const completed = await History.count({ 
      where: { userId, status: 'completed' } 
    }).catch(() => 0);
    
    const failed = await History.count({ 
      where: { userId, status: 'failed' } 
    }).catch(() => 0);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await History.count({
      where: {
        userId,
        createdAt: {
          [Op.gte]: sevenDaysAgo,
        },
      },
    }).catch(() => 0);

    res.json({
      success: true,
      stats: {
        total: total || 0,
        movies: movies || 0,
        series: series || 0,
        grabbed: grabbed || 0,
        completed: completed || 0,
        failed: failed || 0,
        recentActivity: recentActivity || 0,
      },
    });
  } catch (error) {
    console.error('[History] Error getting stats:', error);
    console.error('[History] Error stack:', error.stack);
    
    // If table doesn't exist, return zero stats instead of error
    if (error.message && error.message.includes('no such table')) {
      console.log('[History] History table does not exist yet, returning zero stats');
      return res.json({
        success: true,
        stats: {
          total: 0,
          movies: 0,
          series: 0,
          grabbed: 0,
          completed: 0,
          failed: 0,
          recentActivity: 0,
        },
      });
    }
    
    res.status(500).json({ error: 'Failed to get history stats', details: error.message });
  }
};

module.exports = exports;

