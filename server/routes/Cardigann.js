/**
 * Cardigann API Routes
 */

const express = require('express');
const router = express.Router();
const cardigannController = require('../controllers/Cardigann');

// Get all indexers
router.get('/indexers', cardigannController.getAllIndexers);

// Get specific indexer info
router.get('/indexers/:id', cardigannController.getIndexer);

// Search specific indexer
router.get('/indexers/:id/search', cardigannController.searchIndexer);

// Search multiple indexers
router.post('/search', cardigannController.searchMultiple);

// Test indexer connection
router.get('/indexers/:id/test', cardigannController.testIndexer);

// Get indexer statistics
router.get('/stats', cardigannController.getStats);

// Reload definitions (development)
router.post('/reload', cardigannController.reload);

module.exports = router;

