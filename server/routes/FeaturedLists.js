const express = require("express");
const router = express.Router();
const featuredListsController = require("../controllers/FeaturedLists");
const { authenticateToken } = require("../middleware/auth");

// Public routes - anyone can view lists
router.get("/", featuredListsController.getFeaturedLists);
router.get("/enriched", featuredListsController.getEnrichedLists);
router.get("/posters", featuredListsController.getListPosters);
router.get("/search", featuredListsController.searchLists);
router.get("/:slug", featuredListsController.getFeaturedListBySlug);

// Protected routes - require authentication (admin only for scraping/management)
router.post("/scrape", authenticateToken, featuredListsController.scrapeFeaturedLists);
router.post("/scrape/:slug", authenticateToken, featuredListsController.scrapeListDetails);
router.post("/update-all", authenticateToken, featuredListsController.updateAllLists);
router.post("/", authenticateToken, featuredListsController.createOrUpdateList);
router.put("/:slug", authenticateToken, featuredListsController.createOrUpdateList);
router.delete("/:slug", authenticateToken, featuredListsController.deleteList);

module.exports = router;

