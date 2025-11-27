const User = require("../models/User");
const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");

/**
 * Create a new user (Admin only)
 */
exports.createUsers = async (req, res) => {
  try {
    const { username, email, password, permissions } = req.body;

    // Basic Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    // Check existing
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email: email.toLowerCase().trim() }, { username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: "User with this email or username already exists" });
    }

    const newUser = await User.create({
      id: uuidv4(),
      username,
      email: email.toLowerCase().trim(),
      passwordHash: password, // Hashed by hook
      permissions: permissions || {
        admin: false,
        manage_users: false,
        request: true,
        auto_approve: false,
        manage_requests: false,
      },
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
    const { username, email, permissions, password } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email.toLowerCase().trim();
    if (permissions) updateData.permissions = permissions;
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
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent deleting yourself (optional but good practice)
    // if (req.user && req.user.id === user.id) {
    //   return res.status(400).json({ error: "Cannot delete your own account" });
    // }

    await user.destroy();
    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: err.message });
  }
};
