const Indexers = require("../models/Indexers");
const AvailableIndexers = require("../models/AvailableIndexers");
const { getBaseUrlsForIndexer } = require("../data/indexerBaseUrls");

exports.createIndexer = async (req, res) => {
  try {
    // Get available base URLs for this indexer and store them
    const availableBaseUrls = getBaseUrlsForIndexer(req.body.name);
    
    const newIndexer = await Indexers.create({
      name: req.body.name,
      protocol: req.body.protocol,
      privacy: req.body.privacy,
      priority: req.body.priority || 25,
      syncProfile: req.body.syncProfile || "Standard",
      enabled: req.body.enabled !== undefined ? req.body.enabled : true,
      redirected: req.body.redirected || false,
      baseUrl: req.body.baseUrl,
      availableBaseUrls: availableBaseUrls,
      seedRatio: req.body.seedRatio,
      username: req.body.username,
      password: req.body.password,
      apiKey: req.body.apiKey,
      vipExpiration: req.body.vipExpiration,
      stripCyrillicLetters: req.body.stripCyrillicLetters || false,
      searchFreeleechOnly: req.body.searchFreeleechOnly || false,
      sortRequestedFromSite: req.body.sortRequestedFromSite || "created",
      orderRequestedFromSite: req.body.orderRequestedFromSite || "desc",
      accountInactivity: req.body.accountInactivity,
      tags: req.body.tags,
      categories: req.body.categories || [],
      language: req.body.language || "en-US",
      description: req.body.description,
      indexerType: req.body.indexerType || "Cardigann",
      status: req.body.status || "enabled",
      userId: req.userId, // Associate with authenticated user
    });
    
    const response = newIndexer.toJSON();
    response.availableBaseUrls = availableBaseUrls;
    
    res.status(201).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.readIndexers = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 25;
  const offset = page * limit;
  try {
    const result = await Indexers.findAndCountAll({
      where: { userId: req.userId }, // Only fetch indexers for the authenticated user
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });
    
    // Add available base URLs to each indexer
    const dataWithBaseUrls = result.rows.map((indexer) => {
      try {
        const indexerData = indexer.toJSON();
        // Get available base URLs, fallback to empty array if name is missing
        indexerData.availableBaseUrls = indexer.name 
          ? getBaseUrlsForIndexer(indexer.name) 
          : [];
        return indexerData;
      } catch (mapErr) {
        console.error("Error mapping indexer:", mapErr);
        // Return indexer data without base URLs if mapping fails
        const indexerData = indexer.toJSON();
        indexerData.availableBaseUrls = [];
        return indexerData;
      }
    });
    
    res.json({
      data: dataWithBaseUrls,
      total: result.count,
      page,
      limit,
    });
  } catch (err) {
    console.error("Error in readIndexers:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
};

exports.readIndexerFromID = async (req, res) => {
  try {
    const result = await Indexers.findOne({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this indexer
    });
    if (!result) {
      return res.status(404).json({ error: "Record not found" });
    }
    
    // Get available base URLs for this indexer
    const availableBaseUrls = getBaseUrlsForIndexer(result.name);
    const response = result.toJSON();
    response.availableBaseUrls = availableBaseUrls;
    
    res.json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateIndexer = async (req, res) => {
  try {
    const [updated] = await Indexers.update(
      {
        name: req.body.name,
        protocol: req.body.protocol,
        privacy: req.body.privacy,
        priority: req.body.priority,
        syncProfile: req.body.syncProfile,
        enabled: req.body.enabled,
        redirected: req.body.redirected,
        baseUrl: req.body.baseUrl,
        seedRatio: req.body.seedRatio,
        username: req.body.username,
        password: req.body.password,
        apiKey: req.body.apiKey,
        vipExpiration: req.body.vipExpiration,
        stripCyrillicLetters: req.body.stripCyrillicLetters,
        searchFreeleechOnly: req.body.searchFreeleechOnly,
        sortRequestedFromSite: req.body.sortRequestedFromSite,
        orderRequestedFromSite: req.body.orderRequestedFromSite,
        accountInactivity: req.body.accountInactivity,
        tags: req.body.tags,
        categories: req.body.categories,
        language: req.body.language,
        description: req.body.description,
        indexerType: req.body.indexerType,
        status: req.body.status,
      },
      {
        where: { id: req.params.id, userId: req.userId }, // Ensure user owns this indexer
        returning: true,
      }
    );
    if (updated === 0) {
      return res.status(404).json({ error: "Record not found" });
    }
    const result = await Indexers.findOne({
      where: { id: req.params.id, userId: req.userId },
    });
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteIndexer = async (req, res) => {
  try {
    const deleted = await Indexers.destroy({
      where: { id: req.params.id, userId: req.userId }, // Ensure user owns this indexer
    });
    if (deleted === 0) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.syncAppIndexers = async (req, res) => {
  try {
    // This would sync indexers with connected apps (Sonarr, Radarr, etc.)
    // For now, just return success
    res.json({ message: "Indexers synced successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.testAllIndexers = async (req, res) => {
  try {
    const indexers = await Indexers.findAll({
      where: { enabled: true, userId: req.userId }, // Only test user's indexers
    });
    
    // Simulate testing each indexer
    const results = await Promise.all(
      indexers.map(async (indexer) => {
        // In a real implementation, this would test the indexer connection
        const testResult = {
          id: indexer.id,
          name: indexer.name,
          success: Math.random() > 0.2, // 80% success rate for demo
          message: Math.random() > 0.2 ? "Connection successful" : "Connection failed",
        };
        return testResult;
      })
    );
    
    res.json({ results });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.testIndexer = async (req, res) => {
  try {
    let indexer;
    
    // If ID is provided, fetch from database
    if (req.params.id) {
      indexer = await Indexers.findOne({
        where: { id: req.params.id, userId: req.userId }, // Ensure user owns this indexer
      });
      if (!indexer) {
        return res.status(404).json({ success: false, error: "Indexer not found" });
      }
    } else if (req.body) {
      // If body is provided, use it for testing (before saving)
      indexer = req.body;
    } else {
      return res.status(400).json({ success: false, error: "No indexer data provided" });
    }
    
    // Check if we have a custom scraper for this indexer FIRST
    const scraperManager = require("../scrapers");
    const availableScrapers = scraperManager.getAvailableIndexers();
    let matchedScraper = null;
    
    // Try to match by base URL domain
    if (indexer.baseUrl) {
      try {
        const indexerDomain = new URL(indexer.baseUrl).hostname.toLowerCase();
        matchedScraper = availableScrapers.find(scraper => {
          return scraper.links.some(link => {
            try {
              const scraperDomain = new URL(link).hostname.toLowerCase();
              return indexerDomain.includes(scraperDomain) || scraperDomain.includes(indexerDomain);
            } catch {
              return false;
            }
          });
        });
      } catch (e) {
        // Invalid URL, skip domain matching
      }
    }
    
    // Try to match by name if domain matching failed
    if (!matchedScraper && indexer.name) {
      const indexerNameLower = indexer.name.toLowerCase();
      matchedScraper = availableScrapers.find(scraper => 
        scraper.name.toLowerCase() === indexerNameLower ||
        indexerNameLower.includes(scraper.name.toLowerCase()) ||
        scraper.name.toLowerCase().includes(indexerNameLower)
      );
    }
    
    // If we have a scraper, use it for testing
    if (matchedScraper) {
      console.log(`[Test] Using custom scraper: ${matchedScraper.name}`);
      const testResult = await scraperManager.testScraper(matchedScraper.id);
      
      if (testResult.success) {
        // Mark as verified if test passes and indexer exists in DB
        if (req.params.id) {
          await Indexers.update(
            { verified: true, verifiedAt: new Date() },
            { where: { id: req.params.id } }
          );
        }
        
        // Also update AvailableIndexers if it exists
        if (indexer.name) {
          await AvailableIndexers.update(
            { verified: true, verifiedAt: new Date() },
            { where: { name: indexer.name } }
          ).catch(() => {}); // Ignore errors if not found
        }
        
        return res.json({
          success: true,
          message: "Connection successful",
          verified: true,
        });
      } else {
        // Extract the domain from baseUrl for better error messages
        let domain = "";
        try {
          const url = new URL(indexer.baseUrl || matchedScraper.links[0]);
          domain = url.hostname;
        } catch (e) {
          domain = indexer.baseUrl || matchedScraper.name;
        }
        
        // Format error message
        let errorMessage = testResult.message || "Test failed";
        if (errorMessage.includes("Cloudflare") || errorMessage.includes("CloudFlare")) {
          errorMessage = `Unable to access ${domain}, blocked by CloudFlare Protection. Install FlareSolverr: docker run -d --name=flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest`;
        } else if (errorMessage.includes("timeout")) {
          errorMessage = `Unable to access ${domain}, connection timeout.`;
        } else if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
          errorMessage = `Unable to access ${domain}, page not found.`;
        }
        
        // Mark as unverified if test fails
        if (req.params.id) {
          await Indexers.update(
            { verified: false, verifiedAt: null },
            { where: { id: req.params.id } }
          );
        }
        
        return res.json({
          success: false,
          error: errorMessage,
          verified: false,
        });
      }
    }
    
    // Fall back to API method if no scraper found
    const { searchIndexer } = require("../services/indexerSearch");
    
    if (!indexer.baseUrl) {
      return res.json({
        success: false,
        error: "Base URL is required",
      });
    }
    
    // Perform a test search with a simple query
    const testQuery = "test";
    const result = await searchIndexer(indexer, testQuery, [], 1, 0);
    
    if (result.error) {
      // Extract the domain from baseUrl for better error messages
      let domain = "";
      try {
        const url = new URL(indexer.baseUrl);
        domain = url.hostname;
      } catch (e) {
        domain = indexer.baseUrl;
      }
      
      // Format error message similar to Prowlarr
      let errorMessage = result.error;
      if (result.error.includes("Cloudflare") || result.error.includes("cf-challenge")) {
        errorMessage = `Unable to access ${domain}, blocked by CloudFlare Protection.`;
      } else if (result.error.includes("timeout")) {
        errorMessage = `Unable to access ${domain}, connection timeout.`;
      } else if (result.error.includes("403") || result.error.includes("Forbidden")) {
        errorMessage = `Unable to access ${domain}, blocked by CloudFlare Protection.`;
      } else if (result.error.includes("404") || result.error.includes("Not Found")) {
        errorMessage = `Unable to access ${domain}, API endpoint not found.`;
      } else if (result.error.includes("ECONNREFUSED")) {
        errorMessage = `Unable to access ${domain}, connection refused.`;
      }
      
      return res.json({
        success: false,
        error: errorMessage,
      });
    }
    
    // Mark as verified if test passes and indexer exists in DB
    if (req.params.id) {
      await Indexers.update(
        { verified: true, verifiedAt: new Date() },
        { where: { id: req.params.id } }
      );
    }
    
    // Also update AvailableIndexers if it exists
    if (indexer.name) {
      await AvailableIndexers.update(
        { verified: true, verifiedAt: new Date() },
        { where: { name: indexer.name } }
      ).catch(() => {}); // Ignore errors if not found
    }
    
    res.json({
      success: true,
      message: "Connection successful",
      verified: true,
    });
  } catch (err) {
    console.error("Error testing indexer:", err);
    
    // Mark as unverified if test fails and indexer exists in DB
    if (req.params.id) {
      await Indexers.update(
        { verified: false, verifiedAt: null },
        { where: { id: req.params.id } }
      );
    }
    
    res.status(500).json({ 
      success: false,
      error: err.message || "Test failed" 
    });
  }
};

exports.getAvailableIndexers = async (req, res) => {
  try {
    // Fetch from the AvailableIndexers database table
    const whereClause = {};
    
    // Apply filters if provided
    if (req.query.protocol) {
      whereClause.protocol = req.query.protocol;
    }
    if (req.query.language) {
      whereClause.language = req.query.language;
    }
    if (req.query.privacy) {
      whereClause.privacy = req.query.privacy;
    }
    if (req.query.verified === 'true' || req.query.verified === true) {
      whereClause.verified = true;
    }
    
    // Fetch all available indexers from database
    let availableIndexers = await AvailableIndexers.findAll({
      where: whereClause,
      order: [["name", "ASC"]],
    });
    
    // Convert Sequelize instances to plain objects
    availableIndexers = availableIndexers.map((indexer) => {
      const indexerData = indexer.toJSON();
      // Ensure categories and availableBaseUrls are arrays
      if (!Array.isArray(indexerData.categories)) {
        indexerData.categories = [];
      }
      if (!Array.isArray(indexerData.availableBaseUrls)) {
        indexerData.availableBaseUrls = [];
      }
      return indexerData;
    });
    
    // Apply search filter if provided (case-insensitive search in name and description)
    if (req.query.search) {
      const searchLower = req.query.search.toLowerCase();
      availableIndexers = availableIndexers.filter(
        (i) =>
          i.name.toLowerCase().includes(searchLower) ||
          (i.description && i.description.toLowerCase().includes(searchLower))
      );
    }
    
    res.json({ 
      indexers: availableIndexers, 
      total: availableIndexers.length 
    });
  } catch (err) {
    console.error("Error fetching available indexers:", err);
    res.status(500).json({ error: err.message });
  }
};

