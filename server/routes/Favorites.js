const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/Favorites');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Add a favorite
router.post('/', favoritesController.addFavorite);

// Remove a favorite
router.delete('/', favoritesController.removeFavorite);

// Get all favorites
router.get('/', favoritesController.getFavorites);

// Check if media is favorited
router.get('/check', favoritesController.checkFavorite);

// Get all favorite IDs (for bulk checking)
router.get('/ids', favoritesController.getFavoriteIds);

module.exports = router;

