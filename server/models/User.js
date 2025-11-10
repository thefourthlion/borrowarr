const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcrypt");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Username is required" },
        len: { args: [3, 30], msg: "Username must be between 3 and 30 characters" },
        is: {
          args: /^[a-zA-Z0-9_]+$/,
          msg: "Username can only contain letters, numbers, and underscores",
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Email is required" },
        isEmail: { msg: "Please provide a valid email address" },
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password_hash",
      validate: {
        notEmpty: { msg: "Password is required" },
      },
    },
    avatarUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "avatar_url",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.passwordHash) {
          const saltRounds = 12;
          user.passwordHash = await bcrypt.hash(user.passwordHash, saltRounds);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("passwordHash")) {
          const saltRounds = 12;
          user.passwordHash = await bcrypt.hash(user.passwordHash, saltRounds);
        }
      },
    },
  }
);

// Instance method to compare passwords
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to get public user data (without password)
User.prototype.toPublicJSON = function () {
  const user = this.toJSON();
  delete user.passwordHash;
  return user;
};

module.exports = User;

