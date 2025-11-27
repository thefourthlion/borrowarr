const express = require('express');
const router = express.Router();
const plexController = require('../controllers/PlexConnection');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get user's Plex connection
router.get('/', plexController.getConnection);

// Test Plex connection (without saving)
router.post('/test', plexController.testConnection);

// Save/Update Plex connection
router.post('/save', plexController.saveConnection);

// Delete Plex connection
router.delete('/', plexController.deleteConnection);

// Get Plex libraries
router.get('/libraries', plexController.getLibraries);

// Re-test existing connection
router.post('/retest', plexController.retestConnection);

// Get all media from all libraries
router.get('/media', plexController.getAllMedia);

// Get items from a specific library
router.get('/library/:libraryKey/items', plexController.getLibraryItems);

module.exports = router;

