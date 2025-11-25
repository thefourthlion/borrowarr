const express = require('express');
const router = express.Router();
const hiddenMediaController = require('../controllers/HiddenMedia');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Hide/unhide media
router.post('/hide', hiddenMediaController.hideMedia);
router.post('/unhide', hiddenMediaController.unhideMedia);

// Get hidden media
router.get('/', hiddenMediaController.getHiddenMedia);
router.get('/details', hiddenMediaController.getAllHiddenMediaWithDetails);

// Check if specific items are hidden
router.post('/check', hiddenMediaController.checkHidden);

module.exports = router;

