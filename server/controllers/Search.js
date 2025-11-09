const Indexers = require("../models/Indexers");
const Categories = require("../models/Categories");
const { searchIndexers } = require("../services/indexerSearch");

// Search indexers using Torznab/Newznab APIs
exports.search = async (req, res) => {
  try {
    const {
      query,
      indexerIds,
      categoryIds,
      sortBy = "age",
      sortOrder = "desc",
      limit = 100,
      offset = 0,
    } = req.query;

    if (!query || query.trim() === "") {
      return res.json({
        results: [],
        total: 0,
        indexers: [],
      });
    }

    // Get enabled indexers
    let indexers = await Indexers.findAll({
      where: { enabled: true },
    });

    // Filter by indexerIds if provided
    if (indexerIds) {
      const ids = Array.isArray(indexerIds) ? indexerIds : [indexerIds];
      indexers = indexers.filter((idx) => ids.includes(idx.id.toString()));
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
    indexers.forEach(idx => {
      console.log(`  - ${idx.name} (${idx.protocol}): baseUrl=${idx.baseUrl ? "✓" : "✗"}, enabled=${idx.enabled}`);
    });

    // Search all indexers in parallel
    const { results: allResults, indexerSummaries } = await searchIndexers(
      indexers,
      query,
      parsedCategoryIds,
      parseInt(limit),
      parseInt(offset)
    );

    console.log(`[Search] Total results: ${allResults.length}`);
    indexerSummaries.forEach(summary => {
      if (summary.error) {
        console.log(`  - ${summary.name}: ${summary.error}`);
      } else {
        console.log(`  - ${summary.name}: ${summary.resultCount} results`);
      }
    });

    // Filter results by category if provided
    let filteredResults = allResults;
    if (parsedCategoryIds.length > 0) {
      filteredResults = allResults.filter((result) => {
        return result.categories.some((catId) => parsedCategoryIds.includes(catId));
      });
    }

    // Sort results
    const sortField = sortBy || "age";
    const order = sortOrder === "asc" ? 1 : -1;

    filteredResults.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case "protocol":
          aVal = a.protocol;
          bVal = b.protocol;
          break;
        case "age":
          aVal = a.age;
          bVal = b.age;
          break;
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "indexer":
          aVal = a.indexer.toLowerCase();
          bVal = b.indexer.toLowerCase();
          break;
        case "size":
          aVal = a.size;
          bVal = b.size;
          break;
        case "grabs":
          aVal = a.grabs;
          bVal = b.grabs;
          break;
        case "peers":
          aVal = a.seeders || 0;
          bVal = b.seeders || 0;
          break;
        case "category":
          aVal = a.categories[0] || 0;
          bVal = b.categories[0] || 0;
          break;
        default:
          aVal = a.age;
          bVal = b.age;
      }
      
      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });

    // Apply pagination
    const total = filteredResults.length;
    const paginatedResults = filteredResults.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      results: paginatedResults,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      indexers: indexerSummaries,
    });
  } catch (err) {
    console.error("Error in search:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Categories.findAll({
      order: [["id", "ASC"]],
    });
    res.json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

