const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const AvailableIndexers = sequelize.define(
  "AvailableIndexers",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Please provide indexer name" },
      },
    },
    protocol: {
      type: DataTypes.ENUM("torrent", "nzb"),
      allowNull: false,
      defaultValue: "torrent",
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "en-US",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    privacy: {
      type: DataTypes.ENUM("Private", "Public", "Semi-Private"),
      allowNull: false,
      defaultValue: "Public",
    },
    categories: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue("categories");
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue("categories", JSON.stringify(value));
      },
    },
    availableBaseUrls: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue("availableBaseUrls");
        if (!value || value === "") return [];
        try {
          return JSON.parse(value);
        } catch (e) {
          return [];
        }
      },
      set(value) {
        if (value && Array.isArray(value) && value.length > 0) {
          this.setDataValue("availableBaseUrls", JSON.stringify(value));
        } else {
          this.setDataValue("availableBaseUrls", null);
        }
      },
    },
    indexerType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Cardigann",
    },
    implementation: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Cardigann",
    },
    // Store the raw definition data for future reference
    definitionData: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue("definitionData");
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue("definitionData", value ? JSON.stringify(value) : null);
      },
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "available_indexers",
    timestamps: true,
  }
);

module.exports = AvailableIndexers;

