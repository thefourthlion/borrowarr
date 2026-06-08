const User = require("../models/User");
const Settings = require("../models/Settings");
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
    const normalizedUsername = typeof username === "string" ? username.trim() : "";
    const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : null;

    // Validation
    if (!normalizedUsername || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }

    const userCount = await User.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      const settings = await Settings.findOne({ order: [["createdAt", "ASC"]] });
      const publicRegistrationEnabled = settings ? settings.publicRegistrationEnabled : false;
      if (!publicRegistrationEnabled) {
        return res.status(403).json({ error: "Public registration is disabled" });
      }
    }

    // Check if user already exists
    const conflictChecks = [{ username: normalizedUsername }];
    if (normalizedEmail) {
      conflictChecks.push({ email: normalizedEmail });
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: conflictChecks,
      },
    });

    if (existingUser) {
      if (normalizedEmail && existingUser.email === normalizedEmail) {
        return res.status(409).json({ error: "Email already registered" });
      }
      if (existingUser.username === normalizedUsername) {
        return res.status(409).json({ error: "Username already taken" });
      }
    }

    const defaultPermissions = {
      admin: false,
      manage_users: false,
      request: true,
      auto_approve: false,
      manage_requests: false,
    };

    const superAdminPermissions = {
      admin: true,
      manage_users: true,
      request: true,
      auto_approve: true,
      manage_requests: true,
      super_admin: true,
    };

    // Create new user
    const user = await User.create({
      id: uuidv4(),
      username: normalizedUsername,
      email: normalizedEmail || null,
      passwordHash: password, // Will be hashed by hook
      permissions: isFirstUser ? superAdminPermissions : defaultPermissions,
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
    const normalizedLogin = typeof username === "string" ? username.trim() : "";

    // Validation
    if (!normalizedLogin || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Find user by username first, optionally by email when provided
    const loginConditions = [{ username: normalizedLogin }];
    if (normalizedLogin.includes("@")) {
      loginConditions.push({ email: normalizedLogin.toLowerCase() });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: loginConditions,
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
    const normalizedUsername = typeof username === "string" ? username.trim() : undefined;
    const normalizedEmailInput = typeof email === "string" ? email.toLowerCase().trim() : undefined;
    const normalizedEmail = normalizedEmailInput === "" ? null : normalizedEmailInput;
    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if username/email is already taken by another user
    if (normalizedUsername && normalizedUsername !== user.username) {
      const existingUser = await User.findOne({ where: { username: normalizedUsername } });
      if (existingUser) {
        return res.status(409).json({ error: "Username already taken" });
      }
    }

    if (normalizedEmail !== undefined && normalizedEmail !== user.email && normalizedEmail !== null) {
      const existingUser = await User.findOne({ where: { email: normalizedEmail } });
      if (existingUser) {
        return res.status(409).json({ error: "Email already registered" });
      }
    }

    // Update user
    const updateData = {};
    if (normalizedUsername) updateData.username = normalizedUsername;
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
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

