const express = require("express");
const router = express.Router();
const {
  createIndexer,
  readIndexers,
  readIndexerFromID,
  updateIndexer,
  deleteIndexer,
  syncAppIndexers,
  testAllIndexers,
  testIndexer,
  getAvailableIndexers,
} = require("../controllers/Indexers");
const { authenticateToken } = require("../middleware/auth");

// Available indexers don't need auth (they're just templates)
router.route("/available").get(getAvailableIndexers);

// All other indexer routes require authentication
router.use(authenticateToken);

router.route("/create").post(createIndexer);
router.route("/read").get(readIndexers);
router.route("/read/:id").get(readIndexerFromID);
router.route("/update/:id").put(updateIndexer);
router.route("/delete/:id").delete(deleteIndexer);
router.route("/sync").post(syncAppIndexers);
router.route("/test-all").post(testAllIndexers);
router.route("/test").post(testIndexer); // Test without ID (for new indexers)
router.route("/test/:id").post(testIndexer);

module.exports = router;

