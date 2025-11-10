const express = require("express");
const router = express.Router();
const {
  createDownloadClient,
  readDownloadClients,
  readDownloadClientFromID,
  updateDownloadClient,
  deleteDownloadClient,
  testDownloadClient,
  testAllDownloadClients,
  getAvailableDownloadClients,
  grabRelease,
} = require("../controllers/DownloadClients");
const { authenticateToken } = require("../middleware/auth");

// Get available download clients (public - just templates)
router.get("/available", getAvailableDownloadClients);

// All other routes require authentication
router.use(authenticateToken);

// CRUD routes
router.post("/create", createDownloadClient);
router.get("/read", readDownloadClients);
router.get("/read/:id", readDownloadClientFromID);
router.put("/update/:id", updateDownloadClient);
router.delete("/delete/:id", deleteDownloadClient);

// Test route (with or without ID)
router.post("/test", testDownloadClient);
router.post("/test/:id", testDownloadClient);
router.post("/test-all", testAllDownloadClients);

// Grab release (send to download client)
router.post("/grab", grabRelease);

module.exports = router;
