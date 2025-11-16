const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const historyController = require("../controllers/History");

// All routes require authentication
router.use(authenticateToken);

// GET /api/History/stats - Get history statistics (must be before /:id)
router.get("/stats", historyController.getHistoryStats);

// DELETE /api/History/clear - Clear all history (must be before /:id)
router.delete("/clear", historyController.clearHistory);

// POST /api/History - Add a history entry
router.post("/", historyController.addHistory);

// GET /api/History - Get user's history with pagination and filters
router.get("/", historyController.getHistory);

// GET /api/History/:id - Get a single history entry
router.get("/:id", historyController.getHistoryById);

// PUT /api/History/:id - Update history entry
router.put("/:id", historyController.updateHistory);

// DELETE /api/History/:id - Delete a single history entry
router.delete("/:id", historyController.deleteHistory);

module.exports = router;
