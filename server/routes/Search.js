const express = require("express");
const router = express.Router();
const { search, getCategories } = require("../controllers/Search");
const { optionalAuth } = require("../middleware/auth");

router.route("/").get(optionalAuth, search);
router.route("/categories").get(getCategories);

module.exports = router;

