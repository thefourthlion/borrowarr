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

// Get available download clients
router.get("/available", getAvailableDownloadClients);

// Grab release (send to download client)
router.post("/grab", grabRelease);

module.exports = router;

router.post("/grab", grabRelease);

module.exports = router;

router.post("/grab", grabRelease);

module.exports = router;

router.post("/grab", grabRelease);

module.exports = router;

router.post("/grab", grabRelease);

module.exports = router;

router.post("/grab", grabRelease);

module.exports = router;

router.post("/grab", grabRelease);

module.exports = router;

router.post("/grab", grabRelease);

module.exports = router;

router.post("/grab", grabRelease);

module.exports = router;
