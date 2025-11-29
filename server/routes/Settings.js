const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/Settings');
const { authenticateToken } = require('../middleware/auth');

// Public route - no authentication required
router.get('/public-registration-status', settingsController.getPublicRegistrationStatus);

// All routes below require authentication
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

// Auto-rename service status
router.get('/auto-rename/status', settingsController.getAutoRenameStatus);

// Trigger manual auto-rename
router.post('/auto-rename/trigger', settingsController.triggerAutoRename);

module.exports = router;
