const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  verify,
  getProfile,
  updateProfile,
  changePassword,
  authLimiter,
} = require("../controllers/Auth");
const { authenticateToken } = require("../middleware/auth");

// Public routes (with rate limiting)
router.route("/register").post(authLimiter, register);
router.route("/login").post(authLimiter, login);
router.route("/refresh").post(refreshToken);
router.route("/verify").get(verify);

// Protected routes (require authentication)
router.route("/profile").get(authenticateToken, getProfile);
router.route("/profile").put(authenticateToken, updateProfile);
router.route("/change-password").post(authenticateToken, changePassword);

module.exports = router;

