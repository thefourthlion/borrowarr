const FeaturedList = require("../models/FeaturedLists");
const { scraper } = require("../services/letter-box-scrapper");
const { Op } = require("sequelize");

/**
 * Get all featured lists
 */
exports.getFeaturedLists = async (req, res) => {
  try {
    const { category, featured, limit = 50, offset = 0 } = req.query;

    const where = {};

    if (category) {
      where.category = category;
    }

    if (featured !== undefined) {
      where.featured = featured === 'true';
    }

    const lists = await FeaturedList.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [
        ['featured', 'DESC'],
        ['likes', 'DESC'],
        ['filmCount', 'DESC'],
      ],
    });

    res.json({
      success: true,
      lists,
      count: lists.length,
    });
  } catch (error) {
    console.error("Error fetching featured lists:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch featured lists",
    });
  }
};

/**
 * Get a single featured list by slug
 */
exports.getFeaturedListBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const list = await FeaturedList.findOne({
      where: { slug },
    });

    if (!list) {
      return res.status(404).json({
        success: false,
        error: "List not found",
      });
    }

    res.json({
      success: true,
      list,
    });
  } catch (error) {
    console.error("Error fetching featured list:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch featured list",
    });
  }
};

/**
 * Scrape featured lists from Letterboxd
 * Admin only
 */
exports.scrapeFeaturedLists = async (req, res) => {
  try {
    console.log("Starting featured lists scrape...");
    
    const lists = await scraper.scrapeFeaturedLists();

    res.json({
      success: true,
      message: `Successfully scraped ${lists.length} featured lists`,
      lists,
    });
  } catch (error) {
    console.error("Error scraping featured lists:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape featured lists",
      details: error.message,
    });
  }
};

/**
 * Scrape full details for a specific list
 * Admin only
 */
exports.scrapeListDetails = async (req, res) => {
  try {
    const { slug } = req.params;

    console.log(`Scraping full details for list: ${slug}`);
    
    const list = await scraper.scrapeFullListDetails(slug);

    res.json({
      success: true,
      message: `Successfully scraped list details`,
      list,
    });
  } catch (error) {
    console.error("Error scraping list details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scrape list details",
      details: error.message,
    });
  }
};

/**
 * Update all featured lists
 * Admin only
 */
exports.updateAllLists = async (req, res) => {
  try {
    console.log("Updating all featured lists...");
    
    // Run in background
    scraper.updateAllLists()
      .then(() => console.log("✓ All lists updated"))
      .catch(err => console.error("✗ Error updating lists:", err));

    res.json({
      success: true,
      message: "Update started in background",
    });
  } catch (error) {
    console.error("Error starting update:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start update",
      details: error.message,
    });
  }
};

/**
 * Create or update a featured list manually
 * Admin only
 */
exports.createOrUpdateList = async (req, res) => {
  try {
    const {
      slug,
      title,
      description,
      author,
      authorUrl,
      listUrl,
      filmCount,
      likes,
      comments,
      category,
      featured,
      posterUrls,
      scrapedFilms,
    } = req.body;

    if (!slug || !title || !listUrl) {
      return res.status(400).json({
        success: false,
        error: "slug, title, and listUrl are required",
      });
    }

    const [list, created] = await FeaturedList.findOrCreate({
      where: { slug },
      defaults: {
        slug,
        title,
        description,
        author,
        authorUrl,
        listUrl,
        filmCount: filmCount || 0,
        likes: likes || 0,
        comments: comments || 0,
        category: category || 'community',
        featured: featured !== undefined ? featured : false,
        posterUrls: posterUrls || [],
        scrapedFilms: scrapedFilms || [],
        lastScrapedAt: new Date(),
      },
    });

    if (!created) {
      await list.update({
        title,
        description,
        author,
        authorUrl,
        listUrl,
        filmCount,
        likes,
        comments,
        category,
        featured,
        posterUrls,
        scrapedFilms,
        lastScrapedAt: new Date(),
      });
    }

    res.json({
      success: true,
      list,
      created,
    });
  } catch (error) {
    console.error("Error creating/updating list:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create/update list",
      details: error.message,
    });
  }
};

/**
 * Delete a featured list
 * Admin only
 */
exports.deleteList = async (req, res) => {
  try {
    const { slug } = req.params;

    const list = await FeaturedList.findOne({ where: { slug } });

    if (!list) {
      return res.status(404).json({
        success: false,
        error: "List not found",
      });
    }

    await list.destroy();

    res.json({
      success: true,
      message: "List deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting list:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete list",
      details: error.message,
    });
  }
};

/**
 * Search featured lists
 */
exports.searchLists = async (req, res) => {
  try {
    const { query, category, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query parameter is required",
      });
    }

    const where = {
      [Op.or]: [
        { title: { [Op.like]: `%${query}%` } },
        { description: { [Op.like]: `%${query}%` } },
        { author: { [Op.like]: `%${query}%` } },
      ],
    };

    if (category) {
      where.category = category;
    }

    const lists = await FeaturedList.findAll({
      where,
      limit: parseInt(limit),
      order: [
        ['featured', 'DESC'],
        ['likes', 'DESC'],
      ],
    });

    res.json({
      success: true,
      lists,
      count: lists.length,
    });
  } catch (error) {
    console.error("Error searching lists:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search lists",
      details: error.message,
    });
  }
};

