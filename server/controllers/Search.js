const Indexers = require("../models/Indexers");
const Categories = require("../models/Categories");
const { searchIndexers } = require("../services/indexerSearch");
const path = require("path");
const { CardigannEngine } = require("../cardigann");

// Initialize Cardigann engine
const definitionsPath = path.join(__dirname, '../cardigann-indexer-yamls');
const cardigann = new CardigannEngine(definitionsPath);

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache

function getCacheKey(query, indexerIds, categoryIds) {
  // Ensure categoryIds and indexerIds are arrays before calling sort
  const indexerArray = Array.isArray(indexerIds) ? indexerIds : (indexerIds ? [indexerIds] : []);
  const categoryArray = Array.isArray(categoryIds) ? categoryIds : (categoryIds ? [categoryIds] : []);
  return `search:${query}:${indexerArray.sort().join(',')}:${categoryArray.sort().join(',')}`;
}

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  
  // Clean up old cache entries periodically
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp >= CACHE_TTL) {
        cache.delete(k);
      }
    }
  }
}

// Search indexers using Torznab/Newznab APIs
exports.search = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      query,
      indexerIds,
      categoryIds,
      sortBy = "age",
      sortOrder = "desc",
      limit = 100,
      offset = 0,
      fresh, // If 'true', bypass cache for fresh results
    } = req.query;

    if (!query || query.trim() === "") {
      return res.json({
        results: [],
        total: 0,
        indexers: [],
      });
    }

    // Check cache first (unless fresh=true is passed)
    const cacheKey = getCacheKey(query, indexerIds, categoryIds);
    const skipCache = fresh === 'true';
    
    if (skipCache) {
      // Clear the cache for this query to force fresh results
      cache.delete(cacheKey);
      console.log(`[Search] Fresh search requested for "${query}", cache cleared`);
    }
    
    const cached = getCached(cacheKey);
    if (cached && !skipCache) {
      console.log(`[Search] Cache hit for "${query}" (${Date.now() - startTime}ms)`);
      
      // Still need to sort and paginate cached results
      const { allResults, indexerSummaries } = cached;
      const sortedResults = sortResults(allResults, sortBy, sortOrder);
      const total = sortedResults.length;
      const paginatedResults = sortedResults.slice(
        parseInt(offset),
        parseInt(offset) + parseInt(limit)
      );
      
      return res.json({
        results: paginatedResults,
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        indexers: indexerSummaries,
        cached: true,
        responseTime: Date.now() - startTime,
      });
    }

    // Get enabled indexers - filter by userId if authenticated
    const whereClause = { enabled: true };
    if (req.userId) {
      whereClause.userId = req.userId;
    }

    let indexers = await Indexers.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'baseUrl', 'username', 'password', 'apiKey', 'protocol', 'indexerType', 'enabled', 'categories', 'verified', 'priority'],
      raw: true, // Get plain objects instead of Sequelize instances
    });

    // Filter by indexerIds if provided
    if (indexerIds) {
      const ids = Array.isArray(indexerIds) ? indexerIds.map(id => parseInt(id)) : [parseInt(indexerIds)];
      indexers = indexers.filter((idx) => ids.includes(idx.id));
    }

    if (indexers.length === 0) {
      return res.json({
        results: [],
        total: 0,
        indexers: [],
      });
    }

    // Parse category IDs
    const parsedCategoryIds = categoryIds
      ? (Array.isArray(categoryIds) ? categoryIds : [categoryIds]).map((id) => parseInt(id)).filter((id) => !isNaN(id))
      : [];

    console.log(`[Search] Query: "${query}", Indexers: ${indexers.length}, Categories: ${parsedCategoryIds.length}`);

    // Separate indexers by type
    const cardigannIndexers = indexers.filter(idx => idx.indexerType === 'Cardigann');
    const apiIndexers = indexers.filter(idx => idx.indexerType !== 'Cardigann');

    console.log(`[Search] Cardigann: ${cardigannIndexers.length}, API: ${apiIndexers.length}`);

    // Search all indexers in parallel
    const searchStartTime = Date.now();
    const searchPromises = [];

    // Search Cardigann indexers
    if (cardigannIndexers.length > 0) {
      const cardigannIds = cardigannIndexers.map(idx => idx.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      for (const indexer of cardigannIndexers) {
        // Try to match by name or baseUrl to find Cardigann ID
        let cardigannId = null;
        const allCardigannIndexers = cardigann.getAllIndexers();
        
        // Try exact name match first
        const nameMatch = allCardigannIndexers.find(ci => 
          ci.name.toLowerCase() === indexer.name.toLowerCase()
        );
        
        if (nameMatch) {
          cardigannId = nameMatch.id;
        } else if (indexer.baseUrl) {
          // Try URL match
          try {
            const indexerDomain = new URL(indexer.baseUrl).hostname.toLowerCase();
            const urlMatch = allCardigannIndexers.find(ci => {
              return ci.links.some(link => {
                try {
                  const linkDomain = new URL(link).hostname.toLowerCase();
                  return indexerDomain.includes(linkDomain) || linkDomain.includes(indexerDomain);
                } catch {
                  return false;
                }
              });
            });
            if (urlMatch) {
              cardigannId = urlMatch.id;
            }
          } catch (e) {
            // Invalid URL
          }
        }

        if (cardigannId) {
          console.log(`[Search] Using Cardigann scraper for ${indexer.name} (${cardigannId})`);
          searchPromises.push(
            cardigann.search(cardigannId, query, { categoryId: parsedCategoryIds[0] })
              .then(results => {
                const result = Array.isArray(results) ? results[0] : results;
                if (result && result.success && result.results) {
                  // Add indexer info to results and ensure unique IDs
                  return result.results.map((r, idx) => ({
                    ...r,
                    id: `${indexer.id}-${r.id || idx}`, // Ensure unique ID across indexers
                    indexer: indexer.name, // Add indexer name for display
                    indexerId: indexer.id,
                    indexerPriority: indexer.priority || 25
                  }));
                }
                return [];
              })
              .catch(err => {
                console.error(`[Search] Cardigann error for ${indexer.name}:`, err.message);
                return [];
              })
          );
        }
      }
    }

    // Search API indexers using existing system
    if (apiIndexers.length > 0) {
      searchPromises.push(
        searchIndexers(apiIndexers, query, parsedCategoryIds, parseInt(limit), parseInt(offset))
          .then(({ results }) => results)
          .catch(err => {
            console.error('[Search] API indexers error:', err.message);
            return [];
          })
      );
    }

    // Wait for all searches to complete
    const searchResults = await Promise.all(searchPromises);
    const allResults = searchResults.flat();
    
    console.log(`[Search] Search completed in ${Date.now() - searchStartTime}ms, ${allResults.length} total results`);

    // Create indexer summaries
    const indexerSummaries = indexers.map(idx => ({
      id: idx.id,
      name: idx.name,
      resultCount: allResults.filter(r => r.indexerId === idx.id || r.indexer === idx.name).length
    }));

    // Cache the raw results before filtering/sorting
    setCached(cacheKey, { allResults, indexerSummaries });

    // Filter results by category if provided
    let filteredResults = allResults;
    if (parsedCategoryIds.length > 0) {
      filteredResults = allResults.filter((result) => {
        return result.categories.some((catId) => parsedCategoryIds.includes(catId));
      });
    }

    // Sort results
    const sortedResults = sortResults(filteredResults, sortBy, sortOrder);

    // Apply pagination
    const total = sortedResults.length;
    const paginatedResults = sortedResults.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    console.log(`[Search] Total response time: ${Date.now() - startTime}ms`);

    res.json({
      results: paginatedResults,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      indexers: indexerSummaries,
      responseTime: Date.now() - startTime,
    });
  } catch (err) {
    console.error("Error in search:", err);
    res.status(500).json({ 
      error: err.message || "Internal server error",
      responseTime: Date.now() - startTime,
    });
  }
};

// Optimized sorting function
function sortResults(results, sortBy, sortOrder) {
  const order = sortOrder === "asc" ? 1 : -1;
  
  // Use a sort function that avoids repeated property access
  return results.sort((a, b) => {
    let aVal, bVal;
    
    // Always prioritize by indexer priority first (lower number = higher priority)
    const priorityA = a.indexerPriority ?? 25;
    const priorityB = b.indexerPriority ?? 25;
    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Lower number = higher priority
    }
    
    // If priorities are equal, sort by the requested field
    switch (sortBy) {
      case "protocol":
        return order * a.protocol.localeCompare(b.protocol);
      case "age":
        return order * (a.age - b.age);
      case "title":
        return order * a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      case "indexer":
        return order * a.indexer.localeCompare(b.indexer, undefined, { sensitivity: 'base' });
      case "size":
        return order * (a.size - b.size);
      case "grabs":
        return order * (a.grabs - b.grabs);
      case "seeders":
        aVal = a.seeders ?? 0;
        bVal = b.seeders ?? 0;
        return order * (aVal - bVal);
      case "leechers":
        aVal = a.leechers ?? 0;
        bVal = b.leechers ?? 0;
        return order * (aVal - bVal);
      case "peers":
        aVal = a.seeders ?? 0;
        bVal = b.seeders ?? 0;
        return order * (aVal - bVal);
      case "category":
        aVal = a.categories[0] ?? 0;
        bVal = b.categories[0] ?? 0;
        return order * (aVal - bVal);
      default:
        return order * (a.age - b.age);
    }
  });
}

exports.getCategories = async (req, res) => {
  try {
    // Cache categories since they rarely change
    const cacheKey = 'categories:all';
    const cached = getCached(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
    const categories = await Categories.findAll({
      order: [["id", "ASC"]],
      raw: true, // Get plain objects for faster JSON serialization
    });
    
    setCached(cacheKey, categories);
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};