const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Indexers = sequelize.define(
  "Indexers",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Please provide indexer name" },
      },
    },
    protocol: {
      type: DataTypes.ENUM("torrent", "nzb"),
      allowNull: false,
      defaultValue: "torrent",
    },
    privacy: {
      type: DataTypes.ENUM("Private", "Public"),
      allowNull: false,
      defaultValue: "Public",
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 25,
      validate: {
        min: 1,
        max: 50,
      },
    },
    syncProfile: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Standard",
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    redirected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    baseUrl: {
      type: DataTypes.STRING,
      allowNull: true,
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
    seedRatio: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    stripCyrillicLetters: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    searchFreeleechOnly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sortRequestedFromSite: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "created",
    },
    orderRequestedFromSite: {
      type: DataTypes.ENUM("asc", "desc"),
      allowNull: false,
      defaultValue: "desc",
    },
    accountInactivity: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true,
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
    language: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "en-US",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    indexerType: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Cardigann",
    },
    status: {
      type: DataTypes.ENUM("enabled", "enabled_redirected", "disabled", "error"),
      allowNull: false,
      defaultValue: "enabled",
    },
  },
  {
    tableName: "indexers",
    timestamps: true,
  }
);

module.exports = Indexers;

