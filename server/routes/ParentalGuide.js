const express = require('express');
const router = express.Router();
const parentalGuideController = require('../controllers/ParentalGuide');
const { authenticateToken } = require('../middleware/auth');

// Public routes (no auth required for checking)
router.post('/check-batch', parentalGuideController.checkNudityBatch);
router.get('/:imdbId', parentalGuideController.getParentalGuide);

// Protected routes (require authentication)
router.use(authenticateToken);
router.post('/scrape', parentalGuideController.scrapeParentalGuide);
router.get('/', parentalGuideController.getAllParentalGuides);
router.delete('/:imdbId', parentalGuideController.deleteParentalGuide);

module.exports = router;


