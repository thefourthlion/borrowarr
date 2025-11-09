const express = require("express");
const router = express.Router();
const { search, getCategories } = require("../controllers/Search");

router.route("/").get(search);
router.route("/categories").get(getCategories);

module.exports = router;

