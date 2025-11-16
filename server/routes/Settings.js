const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/Settings');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get user settings
router.get('/', settingsController.getSettings);

// Update user settings
router.put('/', settingsController.updateSettings);

// Test directory access
router.post('/test-directory', settingsController.testDirectory);

// Browse directories (for directory picker)
router.get('/browse', settingsController.browseDirectories);

// Import movies from directory
router.post('/import-movies', settingsController.importMovies);

// Import series from directory
router.post('/import-series', settingsController.importSeries);

// Preview file renames
router.post('/preview-renames', settingsController.previewRenames);

// Execute file renames
router.post('/execute-renames', settingsController.executeRenames);

module.exports = router;
