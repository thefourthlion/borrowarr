const FeaturedList = require("../models/FeaturedLists");
const { scraper } = require("../services/letter-box-scrapper");
const { Op } = require("sequelize");
const axios = require("axios");

const TMDB_API_KEY = process.env.TMDB_API_KEY || '02ad41cf73db27ff46061d6f52a97342';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w185';

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
 * Get TMDB posters for a list based on its title
 */
exports.getListPosters = async (req, res) => {
  try {
    const { title } = req.query;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "Title parameter is required",
      });
    }

    // Extract search query from title
    let searchQuery = title
      .replace(/Top \d+/gi, '')
      .replace(/Official/gi, '')
      .replace(/Films?/gi, '')
      .replace(/Movies?/gi, '')
      .replace(/Feature/gi, '')
      .replace(/Narrative/gi, '')
      .replace(/Directors?/gi, '')
      .replace(/Award/gi, '')
      .replace(/Best/gi, '')
      .replace(/\d+/g, '')
      .trim();

    // Map specific genres
    const titleLower = title.toLowerCase();
    if (titleLower.includes('horror')) searchQuery = 'horror';
    else if (titleLower.includes('sci-fi') || titleLower.includes('science fiction')) searchQuery = 'science fiction';
    else if (titleLower.includes('animated') || titleLower.includes('animation')) searchQuery = 'animation';
    else if (titleLower.includes('documentary')) searchQuery = 'documentary';
    else if (titleLower.includes('western')) searchQuery = 'western';
    else if (titleLower.includes('silent')) searchQuery = 'silent film';
    else if (titleLower.includes('women')) searchQuery = 'women director film';
    else if (titleLower.includes('black')) searchQuery = 'black director film';
    else if (titleLower.includes('fans') || titleLower.includes('million') || titleLower.includes('watched')) searchQuery = 'popular';

    if (!searchQuery || searchQuery.length < 2) searchQuery = 'popular';

    // Fetch from TMDB
    let posters = [];
    try {
      const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          query: searchQuery,
          language: 'en-US',
          page: 1,
        },
        timeout: 10000,
      });

      posters = (searchResponse.data.results || [])
        .slice(0, 5)
        .filter(movie => movie.poster_path)
        .map(movie => `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`);
    } catch (searchError) {
      console.error('TMDB search error:', searchError.message);
    }

    // If not enough posters, get popular movies
    if (posters.length < 5) {
      try {
        const popularResponse = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
          params: {
            api_key: TMDB_API_KEY,
            language: 'en-US',
            page: 1,
          },
          timeout: 10000,
        });

        const popularPosters = (popularResponse.data.results || [])
          .slice(0, 5 - posters.length)
          .filter(movie => movie.poster_path)
          .map(movie => `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`);

        posters.push(...popularPosters);
      } catch (popularError) {
        console.error('TMDB popular error:', popularError.message);
      }
    }

    res.json({
      success: true,
      title,
      searchQuery,
      posters: posters.slice(0, 5),
    });
  } catch (error) {
    console.error("Error getting list posters:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get list posters",
      details: error.message,
    });
  }
};

/**
 * Get enriched lists with TMDB posters (batch)
 */
exports.getEnrichedLists = async (req, res) => {
  try {
    const { category, featured, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (category) where.category = category;
    if (featured !== undefined) where.featured = featured === 'true';

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

    // Enrich each list with TMDB posters
    const enrichedLists = await Promise.all(
      lists.map(async (list) => {
        const listData = list.toJSON();

        // Check if we already have valid posters
        const hasValidPosters = listData.posterUrls && 
          listData.posterUrls.length > 0 && 
          !listData.posterUrls[0].includes('empty-poster');

        if (hasValidPosters) {
          return { ...listData, tmdbPosters: listData.posterUrls };
        }

        // Fetch TMDB posters
        try {
          const titleLower = listData.title.toLowerCase();
          let searchQuery = 'popular'; // Default

          // Map to specific genre/topic-based searches
          if (titleLower.includes('horror')) searchQuery = 'horror classic';
          else if (titleLower.includes('sci-fi') || titleLower.includes('science fiction')) searchQuery = 'science fiction';
          else if (titleLower.includes('animation') || titleLower.includes('animated')) searchQuery = 'animated film';
          else if (titleLower.includes('documentary')) searchQuery = 'documentary';
          else if (titleLower.includes('western')) searchQuery = 'western';
          else if (titleLower.includes('comedy') || titleLower.includes('comedies')) searchQuery = 'comedy';
          else if (titleLower.includes('thriller')) searchQuery = 'thriller';
          else if (titleLower.includes('action')) searchQuery = 'action';
          else if (titleLower.includes('drama')) searchQuery = 'drama';
          else if (titleLower.includes('romance') || titleLower.includes('romantic')) searchQuery = 'romance';
          else if (titleLower.includes('musical')) searchQuery = 'musical';
          else if (titleLower.includes('war')) searchQuery = 'war film';
          else if (titleLower.includes('silent')) searchQuery = 'silent film classic';
          else if (titleLower.includes('noir') || titleLower.includes('crime')) searchQuery = 'crime noir';
          else if (titleLower.includes('women') || titleLower.includes('female')) searchQuery = 'acclaimed film';
          else if (titleLower.includes('black director')) searchQuery = 'acclaimed film';
          else if (titleLower.includes('narrative') || titleLower.includes('feature')) searchQuery = 'best film';
          else if (titleLower.includes('fans') || titleLower.includes('popular') || titleLower.includes('million') || titleLower.includes('watched')) searchQuery = 'popular film';
          else if (titleLower.includes('oscar') || titleLower.includes('academy')) searchQuery = 'academy award';
          else if (titleLower.includes('cult') || titleLower.includes('classic')) searchQuery = 'classic film';
          else if (titleLower.includes('indie') || titleLower.includes('independent')) searchQuery = 'indie film';
          else if (titleLower.includes('foreign') || titleLower.includes('international')) searchQuery = 'international film';
          else if (titleLower.includes('british') || titleLower.includes('uk')) searchQuery = 'british film';
          else if (titleLower.includes('french')) searchQuery = 'french film';
          else if (titleLower.includes('korean')) searchQuery = 'korean film';
          else if (titleLower.includes('japanese') || titleLower.includes('japan')) searchQuery = 'japanese film';

          let posters = [];
          
          // For generic/popular lists, go straight to popular movies endpoint
          if (searchQuery === 'popular' || searchQuery === 'popular film') {
            const popularResponse = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
              params: {
                api_key: TMDB_API_KEY,
                language: 'en-US',
                page: 1,
              },
              timeout: 5000,
            });
            posters = (popularResponse.data.results || [])
              .slice(0, 5)
              .filter(m => m.poster_path)
              .map(m => `${TMDB_IMAGE_BASE_URL}${m.poster_path}`);
          } else {
            // Search for specific genres/topics
            const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
              params: {
                api_key: TMDB_API_KEY,
                query: searchQuery,
                language: 'en-US',
                page: 1,
              },
              timeout: 5000,
            });
            posters = (searchResponse.data.results || [])
              .slice(0, 5)
              .filter(m => m.poster_path)
              .map(m => `${TMDB_IMAGE_BASE_URL}${m.poster_path}`);
          }

          // If still no posters, fallback to top rated
          if (posters.length < 3) {
            const topRatedResponse = await axios.get(`${TMDB_BASE_URL}/movie/top_rated`, {
              params: {
                api_key: TMDB_API_KEY,
                language: 'en-US',
                page: 1,
              },
              timeout: 5000,
            });
            const topRatedPosters = (topRatedResponse.data.results || [])
              .slice(0, 5 - posters.length)
              .filter(m => m.poster_path)
              .map(m => `${TMDB_IMAGE_BASE_URL}${m.poster_path}`);
            posters.push(...topRatedPosters);
          }

          return { ...listData, tmdbPosters: posters.slice(0, 5) };
        } catch (error) {
          console.error(`Error enriching list ${listData.slug}:`, error.message);
          return listData;
        }
      })
    );

    res.json({
      success: true,
      lists: enrichedLists,
      count: enrichedLists.length,
    });
  } catch (error) {
    console.error("Error fetching enriched lists:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch enriched lists",
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

