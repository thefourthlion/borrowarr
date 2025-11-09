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

router.route("/create").post(createIndexer);
router.route("/read").get(readIndexers);
router.route("/read/:id").get(readIndexerFromID);
router.route("/update/:id").put(updateIndexer);
router.route("/delete/:id").delete(deleteIndexer);
router.route("/sync").post(syncAppIndexers);
router.route("/test-all").post(testAllIndexers);
router.route("/test").post(testIndexer); // Test without ID (for new indexers)
router.route("/test/:id").post(testIndexer);
router.route("/available").get(getAvailableIndexers);

module.exports = router;

