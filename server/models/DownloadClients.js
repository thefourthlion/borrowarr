const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const DownloadClients = sequelize.define(
  "DownloadClients",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Please provide download client name" },
      },
    },
    implementation: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Please provide implementation" },
      },
    },
    protocol: {
      type: DataTypes.ENUM("torrent", "usenet"),
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 50,
      },
    },
    // Settings stored as JSON
    settings: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue("settings");
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue("settings", JSON.stringify(value));
      },
    },
    // Mapped categories stored as JSON
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
    tags: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "download_clients",
    timestamps: true,
  }
);

module.exports = DownloadClients;
