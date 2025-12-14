const express = require('express');
const router = express.Router();
const curatedListsController = require('../controllers/CuratedLists');

// Get all available curated lists
router.get('/available', curatedListsController.getAvailableLists);

// Get homepage featured content
router.get('/homepage', curatedListsController.getHomepageLists);

// Get popular movie collections (franchises)
router.get('/collections', curatedListsController.getCollections);

// Get a specific list with content
router.get('/:listId', curatedListsController.getList);

// Get multiple lists at once
router.post('/batch', curatedListsController.getMultipleLists);

module.exports = router;





