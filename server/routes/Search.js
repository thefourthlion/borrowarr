const express = require("express");
const router = express.Router();
const { search, getCategories } = require("../controllers/Search");
const { authenticateToken } = require("../middleware/auth");

router.route("/").get(authenticateToken, search);
router.route("/categories").get(getCategories);

module.exports = router;
