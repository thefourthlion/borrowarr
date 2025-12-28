const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const rateLimit = require("express-rate-limit");
const { Op } = require("sequelize");

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to validate and sanitize expiry values
const getExpiryValue = (envVar, defaultValue) => {
  // If envVar is falsy, undefined, or null, use default
  if (!envVar || envVar === "null" || envVar === "undefined") {
    return defaultValue;
  }
  
  // Convert to string and trim whitespace
  let value;
  try {
    value = String(envVar).trim();
  } catch (e) {
    console.warn(`Error converting JWT expiry to string, using default: "${defaultValue}"`);
    return defaultValue;
  }
  
  // Check for empty string after trimming
  if (!value || value === "") {
    return defaultValue;
  }
  
  // Check if it's a valid positive number (seconds)
  const numValue = Number(value);
  if (!isNaN(numValue) && isFinite(numValue) && numValue > 0) {
    return numValue;
  }
  
  // Check if it's a valid timespan string format (e.g., "15m", "1h", "7d", "2 days")
  // jsonwebtoken accepts formats like: "2 days", "10h", "7d", "1h", "1m", "1s"
  const timespanRegex = /^\d+\s*(second|sec|s|minute|min|m|hour|hr|h|day|d|week|wk|w|month|mon|mo|year|yr|y)(s)?$/i;
  if (timespanRegex.test(value) || /^\d+[smhdwy]$/i.test(value)) {
    return value;
  }
  
  // If it doesn't match expected format, use default
  console.warn(`Invalid JWT expiry value: "${value}", using default: "${defaultValue}"`);
  return defaultValue;
};

// Generate JWT tokens
const generateTokens = (userId) => {
  let accessExpiry = getExpiryValue(process.env.JWT_ACCESS_EXPIRY, "15m");
  let refreshExpiry = getExpiryValue(process.env.JWT_REFRESH_EXPIRY, "7d");

  // Final safety check - ensure we have valid values
  if (accessExpiry === null || accessExpiry === undefined || (typeof accessExpiry !== "string" && typeof accessExpiry !== "number")) {
    console.error("Invalid accessExpiry, forcing default:", accessExpiry);
    accessExpiry = "15m";
  }
  if (refreshExpiry === null || refreshExpiry === undefined || (typeof refreshExpiry !== "string" && typeof refreshExpiry !== "number")) {
    console.error("Invalid refreshExpiry, forcing default:", refreshExpiry);
    refreshExpiry = "7d";
  }

  const accessToken = jwt.sign(
    { userId, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: accessExpiry }
  );

  const refreshToken = jwt.sign(
    { userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: refreshExpiry }
  );

  return { accessToken, refreshToken };
};

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email: email.toLowerCase().trim() }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (existingUser.username === username) {
        return res.status(409).json({ error: "Username already taken" });
      }
    }

    // Create new user
    const user = await User.create({
      id: uuidv4(),
      username,
      email: email.toLowerCase().trim(),
      passwordHash: password, // Will be hashed by hook
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Return user data (without password) and tokens
    res.status(201).json({
      success: true,
      user: user.toPublicJSON(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Username or email already exists" });
    }
    res.status(500).json({ error: "Registration failed" });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find user by username or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username.toLowerCase().trim() },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Return user data and tokens
    res.json({
      success: true,
      user: user.toPublicJSON(),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

/**
 * Refresh access token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== "refresh") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    // Check if user still exists
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Generate new access token
    const accessExpiry = getExpiryValue(process.env.JWT_ACCESS_EXPIRY, "15m");
    
    const accessToken = jwt.sign(
      { userId: user.id, type: "access" },
      process.env.JWT_SECRET,
      { expiresIn: accessExpiry }
    );

    res.json({
      success: true,
      accessToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Refresh token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    console.error("Refresh token error:", error);
    res.status(500).json({ error: "Token refresh failed" });
  }
};

/**
 * Verify token and get current user
 */
exports.verify = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Token verification failed" });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, avatarUrl } = req.body;
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if username/email is already taken by another user
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(409).json({ error: "Username already taken" });
      }
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
      if (existingUser) {
        return res.status(409).json({ error: "Email already registered" });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email.toLowerCase().trim();
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    await user.update(updateData);

    res.json({
      success: true,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long" });
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Update password (will be hashed by hook)
    await user.update({ passwordHash: newPassword });

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};

// Export rate limiter for use in routes
exports.authLimiter = authLimiter;

