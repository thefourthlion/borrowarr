const express = require('express');
const router = express.Router();
const mediaRequestsController = require('../controllers/MediaRequests');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Create a new request
router.post('/', mediaRequestsController.createRequest);

// Get all requests (for admins/managers)
router.get('/all', mediaRequestsController.getAllRequests);

// Get current user's requests
router.get('/my', mediaRequestsController.getMyRequests);

// Get request counts (for badges)
router.get('/counts', mediaRequestsController.getRequestCounts);

// Approve a request
router.post('/:id/approve', mediaRequestsController.approveRequest);

// Deny a request
router.post('/:id/deny', mediaRequestsController.denyRequest);

// Delete a request
router.delete('/:id', mediaRequestsController.deleteRequest);

module.exports = router;

