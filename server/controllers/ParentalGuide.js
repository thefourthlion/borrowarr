const ParentalGuide = require('../models/ParentalGuide');
const IMDbParentalGuideScraper = require('../services/imdbParentalGuideScraper');
const { Op } = require('sequelize');

const scraper = new IMDbParentalGuideScraper();

/**
 * Get parental guide by IMDb ID (scrape if not cached)
 */
exports.getParentalGuide = async (req, res) => {
  try {
    const { imdbId } = req.params;
    const { forceRefresh } = req.query;

    if (!imdbId) {
      return res.status(400).json({ success: false, error: 'IMDb ID is required' });
    }

    const parentalGuide = await scraper.getOrScrapeParentalGuide(
      imdbId,
      null,
      'movie',
      null,
      forceRefresh === 'true'
    );

    if (!parentalGuide) {
      return res.status(404).json({ success: false, error: 'Failed to fetch parental guide' });
    }

    res.json({ success: true, parentalGuide });
  } catch (error) {
    console.error('Error in getParentalGuide controller:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Batch check nudity status for multiple items
 * Accepts an array of { imdbId, tmdbId, mediaType, title }
 */
exports.checkNudityBatch = async (req, res) => {
  try {
    const { items } = req.body; // Array of { imdbId, tmdbId?, mediaType?, title? }

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, nudityMap: {} }); // Return empty map instead of error
    }

    const imdbIds = items.map(item => item.imdbId).filter(Boolean);
    
    if (imdbIds.length === 0) {
      return res.json({ success: true, nudityMap: {} });
    }

    // Fetch all existing parental guides
    const existingGuides = await ParentalGuide.findAll({
      where: {
        imdbId: {
          [Op.in]: imdbIds,
        },
      },
      attributes: ['imdbId', 'hasNudity', 'nuditySeverity', 'tmdbId', 'violence', 'profanity', 'alcohol', 'frightening'],
    }).catch(err => {
      // If table doesn't exist yet, return empty map
      console.warn('ParentalGuide table may not exist yet:', err.message);
      return [];
    });

    const nudityMap = {};
    if (existingGuides && existingGuides.length > 0) {
      existingGuides.forEach(guide => {
        nudityMap[guide.imdbId] = {
          hasNudity: guide.hasNudity || false,
          severity: guide.nuditySeverity || 'None',
          tmdbId: guide.tmdbId,
          violence: guide.violence || 'None',
          profanity: guide.profanity || 'None',
          alcohol: guide.alcohol || 'None',
          frightening: guide.frightening || 'None',
        };
      });
    }

    res.json({ success: true, nudityMap });
  } catch (error) {
    console.error('Error in checkNudityBatch controller:', error);
    // Return empty nudity map instead of error to allow app to continue
    res.json({ success: true, nudityMap: {}, warning: 'Parental guide data not available yet' });
  }
};

/**
 * Scrape parental guide for a specific item
 * POST /api/ParentalGuide/scrape
 */
exports.scrapeParentalGuide = async (req, res) => {
  try {
    const { imdbId, tmdbId, mediaType, title } = req.body;

    if (!imdbId) {
      return res.status(400).json({ success: false, error: 'IMDb ID is required' });
    }

    const parentalGuide = await scraper.scrapeParentalGuide(imdbId, tmdbId, mediaType, title);

    if (!parentalGuide) {
      return res.status(500).json({ success: false, error: 'Failed to scrape parental guide' });
    }

    res.json({ success: true, parentalGuide, message: 'Parental guide scraped successfully' });
  } catch (error) {
    console.error('Error in scrapeParentalGuide controller:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get all parental guides (for admin/debugging)
 */
exports.getAllParentalGuides = async (req, res) => {
  try {
    const { limit = 50, offset = 0, hasNudity, severity } = req.query;

    const where = {};
    
    if (hasNudity !== undefined) {
      where.hasNudity = hasNudity === 'true';
    }
    
    if (severity) {
      where.nuditySeverity = severity;
    }

    const guides = await ParentalGuide.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['lastScrapedAt', 'DESC']],
    });

    res.json({ success: true, guides: guides.rows, count: guides.count });
  } catch (error) {
    console.error('Error in getAllParentalGuides controller:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Delete parental guide entry
 */
exports.deleteParentalGuide = async (req, res) => {
  try {
    const { imdbId } = req.params;

    const deleted = await ParentalGuide.destroy({
      where: { imdbId },
    });

    if (deleted === 0) {
      return res.status(404).json({ success: false, error: 'Parental guide not found' });
    }

    res.json({ success: true, message: 'Parental guide deleted successfully' });
  } catch (error) {
    console.error('Error in deleteParentalGuide controller:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

