const User = require("../models/User");
const MediaRequest = require("../models/MediaRequest");
const MonitoredMovies = require("../models/MonitoredMovies");
const MonitoredSeries = require("../models/MonitoredSeries");
const Favorites = require("../models/Favorites");
const History = require("../models/History");
const HiddenMedia = require("../models/HiddenMedia");
const Settings = require("../models/Settings");
const PlexConnection = require("../models/PlexConnection");
const DownloadClients = require("../models/DownloadClients");
const Indexers = require("../models/Indexers");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");

const canManageUsers = (actor) =>
  Boolean(actor?.permissions?.admin || actor?.permissions?.manage_users);

const normalizePermissions = (permissions = {}) => ({
  admin: Boolean(permissions.admin),
  manage_users: Boolean(permissions.manage_users),
  request: true, // Always enabled for all users
  auto_approve: Boolean(permissions.auto_approve),
  manage_requests: Boolean(permissions.manage_requests),
  ...(permissions.super_admin ? { super_admin: true } : {}),
});

/**
 * Create a new user (Admin only)
 */
exports.createUsers = async (req, res) => {
  try {
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ error: "Not authorized to manage users" });
    }

    const { username, email, password, permissions } = req.body;
    const normalizedUsername = typeof username === "string" ? username.trim() : "";
    const normalizedEmailInput = typeof email === "string" ? email.toLowerCase().trim() : "";
    const normalizedEmail = normalizedEmailInput || null;

    // Basic Validation
    if (!normalizedUsername || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // Check existing
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
      return res.status(409).json({ error: "User with this email or username already exists" });
    }

    const newUser = await User.create({
      id: uuidv4(),
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash: password, // Hashed by hook
      permissions: normalizePermissions(permissions),
    });

    res.status(201).json({ success: true, user: newUser.toPublicJSON() });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Read all users
 */
exports.readUsers = async (req, res) => {
  try {
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ error: "Not authorized to view users" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["passwordHash"] }, // Exclude password
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error("Read users error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Read user by ID
 */
exports.readUsersFromID = async (req, res) => {
  try {
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ error: "Not authorized to view users" });
    }

    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["passwordHash"] },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error("Read user error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update user
 */
exports.updateUsers = async (req, res) => {
  try {
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ error: "Not authorized to update users" });
    }

    const { username, email, permissions, password } = req.body;
    const normalizedUsername = typeof username === "string" ? username.trim() : undefined;
    const normalizedEmailInput = typeof email === "string" ? email.toLowerCase().trim() : undefined;
    const normalizedEmail = normalizedEmailInput === "" ? null : normalizedEmailInput;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData = {};
    if (normalizedUsername) updateData.username = normalizedUsername;
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
    if (permissions) updateData.permissions = normalizePermissions(permissions);
    if (password) updateData.passwordHash = password; // Will be hashed by hook

    await user.update(updateData);

    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete user
 */
exports.deleteUsers = async (req, res) => {
  try {
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ error: "Not authorized to delete users" });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent deleting the currently authenticated user to avoid accidental lockout
    if (req.user?.id === user.id) {
      return res.status(400).json({ error: "You cannot delete your own account while logged in" });
    }

    // If this user reviewed other requests, clear reviewer reference first.
    // SQLite foreign key constraints can otherwise block user deletion.
    await MediaRequest.update(
      {
        reviewedBy: null,
        reviewedAt: null,
      },
      {
        where: { reviewedBy: user.id },
      }
    );

    // Clean up user-owned data explicitly to ensure deletion always succeeds.
    await Promise.all([
      MediaRequest.destroy({ where: { userId: user.id } }),
      MonitoredMovies.destroy({ where: { userId: user.id } }),
      MonitoredSeries.destroy({ where: { userId: user.id } }),
      Favorites.destroy({ where: { userId: user.id } }),
      History.destroy({ where: { userId: user.id } }),
      HiddenMedia.destroy({ where: { userId: user.id } }),
      Settings.destroy({ where: { userId: user.id } }),
      PlexConnection.destroy({ where: { userId: user.id } }),
      DownloadClients.destroy({ where: { userId: user.id } }),
      Indexers.destroy({ where: { userId: user.id } }),
    ]);

    await user.destroy();
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: err.message });
  }
};
